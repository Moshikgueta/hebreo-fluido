/* O estorno automático da desistência, e os alertas ao dono (28/09/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Até aqui, desistir pelo site gravava o pedido e mandava um e-mail ao dono,
 * e o dinheiro só voltava se ele lembrasse de abrir o painel da Mercado Pago
 * (auditoria, LEGAL-013/PAY-003). Agora o site pede o estorno sozinho, tenta
 * de novo quando falha, e o que não dá para fazer sozinho vira lembrete
 * diário ao dono. Estes testes rodam os handlers reais contra o schema de
 * produção e uma Mercado Pago de mentira que também estorna.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieDe, envDeTeste, pedido, saudeDetalhada, DADOS_FISCAIS } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - idem
import { runReconcile } from '../../worker/src/reconcile.js';
// @ts-expect-error - idem
import { runAlertas } from '../../worker/src/alertas.js';
// @ts-expect-error - idem
import { bater, contar5xx, hasEntitlement, log } from '../../worker/src/lib/db.js';
// @ts-expect-error - idem
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import { hmacHex } from '../../worker/src/lib/crypto.js';

const SITE = 'https://hebraicofluente.com.br';
const SEGREDO = 'segredo-do-webhook-de-teste';
const TOKEN = 'APP_USR-1234567890123456-092019-abcdef0123456789abcdef0123456789-123456789';
const DONO = 'dono@exemplo.com';
const pendentes: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => { pendentes.push(p); } };
const assentar = async () => { await Promise.all(pendentes.splice(0)); };

/* ── a Mercado Pago de mentira, agora com estorno ──────────────────────── */
type Pagamento = { id: number; status: string; external_reference: string; transaction_amount: number; currency_id: string };
let pagamentos: Map<number, Pagamento>;
let proximoId = 800001;
let estornos: { pagamento: number; chave: string | null }[];
/** Quantas das próximas chamadas de estorno a Mercado Pago recusa. */
let recusarEstornos = 0;
let enviados: { to: string; subject: string; text: string }[];
/** Contestações e pedidos do Checkout Pro: id deles → ids de pagamento. */
let contestacoes: Map<number, number[]>;
let pedidosMp: Map<number, number[]>;

beforeEach(() => {
  pagamentos = new Map(); estornos = []; enviados = []; recusarEstornos = 0; proximoId = 800001;
  contestacoes = new Map(); pedidosMp = new Map();
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === 'api.resend.test') {
      const b = JSON.parse(String(init?.body ?? '{}'));
      if (!String(b.subject).startsWith('Confirme seu e-mail')) {
        enviados.push({ to: String(b.to?.[0] ?? ''), subject: b.subject, text: b.text });
      }
      return new Response('{"id":"m1"}', { status: 200 });
    }
    if (u.pathname === '/v1/payments' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      const p: Pagamento = { id: proximoId++, status: 'pending', external_reference: body.external_reference, transaction_amount: body.transaction_amount, currency_id: 'BRL' };
      pagamentos.set(p.id, p);
      return new Response(JSON.stringify({ ...p, point_of_interaction: { transaction_data: { qr_code: '000201-teste' } } }), { status: 201 });
    }
    const est = u.pathname.match(/^\/v1\/payments\/(\d+)\/refunds$/);
    if (est && init?.method === 'POST') {
      const chave = new Headers(init.headers).get('X-Idempotency-Key');
      if (recusarEstornos > 0) { recusarEstornos--; return new Response('{"message":"internal_error"}', { status: 500 }); }
      const p = pagamentos.get(Number(est[1]));
      if (!p) return new Response('{"message":"not found"}', { status: 404 });
      estornos.push({ pagamento: p.id, chave });
      p.status = 'refunded';                 // no PIX e no cartão, a MP devolve na hora
      return new Response(JSON.stringify({ id: 9000 + estornos.length, payment_id: p.id, status: 'approved' }), { status: 201 });
    }
    const cb = u.pathname.match(/^\/v1\/chargebacks\/(\d+)$/);
    if (cb) {
      const pags = contestacoes.get(Number(cb[1]));
      return pags ? new Response(JSON.stringify({ id: Number(cb[1]), payments: pags }), { status: 200 }) : new Response('{"message":"not found"}', { status: 404 });
    }
    const mo = u.pathname.match(/^\/merchant_orders\/(\d+)$/);
    if (mo) {
      const pags = pedidosMp.get(Number(mo[1]));
      return pags ? new Response(JSON.stringify({ id: Number(mo[1]), payments: pags.map(id => ({ id })) }), { status: 200 }) : new Response('{"message":"not found"}', { status: 404 });
    }
    const m = u.pathname.match(/^\/v1\/payments\/(\d+)$/);
    if (m) {
      const p = pagamentos.get(Number(m[1]));
      return p ? new Response(JSON.stringify(p), { status: 200 }) : new Response('{"message":"not found"}', { status: 404 });
    }
    if (u.pathname === '/v1/payments/search') {
      const ref = u.searchParams.get('external_reference');
      return new Response(JSON.stringify({ results: [...pagamentos.values()].filter(p => p.external_reference === ref) }), { status: 200 });
    }
    return new Response('{}', { status: 500 });
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

type Env = Record<string, unknown> & { DB: { bruto: { prepare(s: string): { get(...a: unknown[]): unknown; all(...a: unknown[]): unknown[]; run(...a: unknown[]): unknown } } } };
const envCompleto = (extra: Record<string, unknown> = {}) => envDeTeste({
  MP_ACCESS_TOKEN: TOKEN, MP_WEBHOOK_SECRET: SEGREDO,
  RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebraico Fluente <c@hebraicofluente.com.br>',
  RESEND_BASE: 'https://api.resend.test', SUPPORT_EMAIL: DONO, ...extra
}) as Env;
const linha = (env: Env, sql: string) => env.DB.bruto.prepare(sql).get() as Record<string, unknown> | undefined;
const linhas = (env: Env, sql: string) => env.DB.bruto.prepare(sql).all() as Record<string, unknown>[];

async function aviso(id: number, tipo = 'payment') {
  const ts = Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(SEGREDO, `id:${id};request-id:req-1;ts:${ts};`);
  return new Request(`${SITE}/api/pay/webhook?data.id=${id}&type=${tipo}`, {
    method: 'POST', headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1', 'content-type': 'application/json' }, body: '{}'
  });
}

/** Uma aluna que comprou pela Mercado Pago, com o acesso liberado. */
async function alunaQueComprou(env: Env, email = 'aluna@exemplo.com.br') {
  const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana', email, password: 'senha-boa-123' }), env, ctx });
  const cookie = cookieDe(r);
  const { account } = await r.json() as { account: { id: number } };
  await assentar();
  const c = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'pix' }, { Cookie: cookie }), env, ctx });
  const ordem = await c.json() as { id: string };
  const p = [...pagamentos.values()].at(-1)!;
  p.status = 'approved';
  await pay.webhook({ request: await aviso(p.id), env });
  await assentar();
  expect(await hasEntitlement(env, account.id, 'alfabetizacao')).toBe(true);
  enviados = [];
  return { cookie, id: account.id, email, order: ordem.id, pagamento: p.id };
}

const desistir = (env: Env, cookie: string, order: string) =>
  pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order }, { Cookie: cookie }), env, ctx });

describe('a desistência estorna sozinha', () => {
  it('pede o estorno total à Mercado Pago, fecha o acesso e diz isso nos dois e-mails', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);

    const r = await desistir(env, a.cookie, a.order);
    expect(r.status).toBe(200);
    await assentar();

    expect(estornos, 'o estorno não foi pedido, ou foi pedido duas vezes').toEqual([
      { pagamento: a.pagamento, chave: `estorno-${a.order}` }
    ]);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao'), 'o acesso continuou aberto').toBe(false);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${a.order}'`)!.status).toBe('refunded');
    expect(linha(env, `SELECT estado FROM estornos WHERE order_id = '${a.order}'`)!.estado).toBe('concluido');

    const paraEla = enviados.find(m => m.to === a.email && m.subject.startsWith('Recebemos'))!;
    expect(paraEla.text).toContain('O estorno já foi pedido à Mercado Pago');
    /* E, como o estorno concluiu na hora, o aviso de que concluiu (PAY-B-006). */
    expect(enviados.filter(m => m.to === a.email && m.subject.startsWith('Estorno concluído'))).toHaveLength(1);
    const paraODono = enviados.find(m => m.to === DONO)!;
    expect(paraODono.text).toContain('JÁ FOI PEDIDO AUTOMATICAMENTE');
  });

  it('pedir de novo não estorna de novo', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    await desistir(env, a.cookie, a.order);
    await desistir(env, a.cookie, a.order);
    await runReconcile(env);
    await assentar();
    expect(estornos).toHaveLength(1);
  });

  it('se a Mercado Pago recusar, a varredura tenta de novo mais tarde, e resolve', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    recusarEstornos = 1;
    await desistir(env, a.cookie, a.order);
    await assentar();

    const e1 = linha(env, `SELECT estado, tentativas FROM estornos WHERE order_id = '${a.order}'`)!;
    expect(e1).toEqual({ estado: 'pendente', tentativas: 1 });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
    expect(enviados.find(m => m.to === DONO)!.text).toContain('tenta de novo sozinho');

    /* Antes do intervalo, a varredura não insiste. */
    await runReconcile(env);
    expect(estornos).toHaveLength(0);

    /* Passado o intervalo, tenta, e desta vez passa. */
    vi.useFakeTimers({ now: Date.now() + 10 * 60_000, toFake: ['Date'] });
    await runReconcile(env);
    expect(estornos).toHaveLength(1);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    expect(linha(env, `SELECT estado FROM estornos WHERE order_id = '${a.order}'`)!.estado).toBe('concluido');
  });

  it('depois de oito recusas, vira erro e o dono recebe o alerta', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    recusarEstornos = 99;
    await desistir(env, a.cookie, a.order);
    let agora = Date.now();
    for (let i = 0; i < 10; i++) {
      agora += 7 * 3_600_000;                  // mais que o maior intervalo (6 h)
      vi.useFakeTimers({ now: agora, toFake: ['Date'] });
      await runReconcile(env);
    }
    await assentar();
    const e = linha(env, `SELECT estado, tentativas FROM estornos WHERE order_id = '${a.order}'`)!;
    expect(e).toEqual({ estado: 'erro', tentativas: 8 });
    expect(enviados.some(m => m.to === DONO && m.subject.includes('Estorno automático falhou'))).toBe(true);
  });

  it('sem a Mercado Pago (pedido liberado à mão), é manual: aviso na hora e lembrete diário', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    env.DB.bruto.prepare(`UPDATE orders SET provider = 'manual', provider_ref = '' WHERE id = '${a.order}'`).run();
    await desistir(env, a.cookie, a.order);
    await assentar();

    expect(estornos).toHaveLength(0);
    expect(linha(env, `SELECT estado FROM estornos WHERE order_id = '${a.order}'`)!.estado).toBe('manual');
    expect(enviados.find(m => m.to === DONO)!.text).toContain('ESTE ESTORNO É COM VOCÊ');

    enviados = [];
    await runAlertas(env);
    await runAlertas(env);                      // a mesma varredura de novo, no mesmo dia
    const lembretes = enviados.filter(m => m.subject.includes('sem estorno resolvido'));
    expect(lembretes, 'um lembrete por dia, não um a cada 5 minutos').toHaveLength(1);
    expect(lembretes[0]!.text).toContain(a.order);
    expect(lembretes[0]!.text).toContain(a.email);
  });

  it('a lista de compras diz como o dinheiro volta', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    recusarEstornos = 1;                         // fica pendente: pedido ainda `paid`
    await desistir(env, a.cookie, a.order);
    const r = await pay.orders({ request: new Request(`${SITE}/api/orders`, { headers: { Cookie: a.cookie } }), env });
    const o = (await r.json() as { orders: { id: string; estorno: string | null }[] }).orders.find(x => x.id === a.order)!;
    expect(o.estorno).toBe('automatico');
  });
});

describe('estorno e contestação que não chegam como aviso de pagamento (PAY-002)', () => {
  it('uma contestação avisada pelo tópico chargebacks fecha o acesso', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    pagamentos.get(a.pagamento)!.status = 'charged_back';
    contestacoes.set(55001, [a.pagamento]);
    const r = await pay.webhook({ request: await aviso(55001, 'chargebacks'), env });
    expect(r.status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao'), 'o curso ficou com quem contestou').toBe(false);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${a.order}'`)!.status).toBe('refunded');
  });

  it('um aviso de merchant_order também chega ao pagamento', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    pagamentos.get(a.pagamento)!.status = 'refunded';
    pedidosMp.set(66001, [a.pagamento]);
    await pay.webhook({ request: await aviso(66001, 'merchant_order'), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
  });

  it('contestação de outra loja (404) não quebra nada nem é reenviada para sempre', async () => {
    const env = envCompleto();
    const r = await pay.webhook({ request: await aviso(99999, 'chargebacks'), env });
    expect(r.status).toBe(200);
  });

  it('sem aviso nenhum, a varredura diária dos pedidos pagos pega o estorno feito no painel', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    pagamentos.get(a.pagamento)!.status = 'refunded';     // o dono estornou pelo painel; o aviso se perdeu

    await runReconcile(env);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${a.order}'`)!.status).toBe('refunded');
  });

  it('a varredura dos pagos pergunta cada pedido no máximo uma vez por dia', async () => {
    const env = envCompleto();
    const a = await alunaQueComprou(env);
    await runReconcile(env);
    const primeira = Number(linha(env, `SELECT checked_at FROM orders WHERE id = '${a.order}'`)!.checked_at);
    await runReconcile(env);
    expect(Number(linha(env, `SELECT checked_at FROM orders WHERE id = '${a.order}'`)!.checked_at)).toBe(primeira);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao'), 'um pedido pago e intacto perdeu o acesso').toBe(true);
  });
});

describe('os alertas ao dono', () => {
  it('erros de pagamento viram um e-mail por hora, com as contagens', async () => {
    const env = envCompleto();
    for (let i = 0; i < 3; i++) await log(env, null, 'pay-create-failed', 'teste');
    await runAlertas(env);
    await runAlertas(env);
    const alertas = enviados.filter(m => m.to === DONO && m.subject.includes('problemas de pagamento'));
    expect(alertas).toHaveLength(1);
    expect(alertas[0]!.text).toContain('3 cobranças que não nasceram na Mercado Pago');
  });

  it('abaixo do limite, silêncio', async () => {
    const env = envCompleto();
    await bater(env, 'backup');                 // o backup de hoje terminou
    await log(env, null, 'pay-create-failed', 'uma só');
    await runAlertas(env);
    expect(enviados).toHaveLength(0);
  });

  it('/api/health diz se a varredura está viva, no campo que o monitor externo olha', async () => {
    const env = envCompleto();
    const saude = async () => await (await auth.health({ request: saudeDetalhada(), env })).json() as { ok: boolean; monitor: boolean; varredura: number | null };

    const antes = await saude();
    expect(antes.ok).toBe(true);
    expect(antes.monitor, 'sem varredura nenhuma, o monitor tem de acusar').toBe(false);

    await runAlertas(env);
    const viva = await saude();
    expect(viva.varredura).toBe(0);
    expect(viva.monitor).toBe(true);

    vi.useFakeTimers({ now: Date.now() + 20 * 60_000, toFake: ['Date'] });
    const parada = await saude();
    expect(parada.monitor, 'a varredura parou há 20 min e o monitor não acusou').toBe(false);
    expect(linhas(env, 'SELECT nome FROM batimentos')).toEqual([{ nome: 'varredura' }]);
  });
});

/* SEC-A-005 (auditoria de 01/10/2026): o backup que parou e os 5xx só
   apareciam para quem fosse procurar. */
describe('a saúde do dia, no alerta ao dono', () => {
  const saude = () => enviados.filter(m => m.to === DONO && /backup|erros do servidor/.test(m.subject));

  it('backup com carimbo de hoje e nenhum 5xx: silêncio', async () => {
    const env = envCompleto();
    await bater(env, 'backup');
    await runAlertas(env);
    expect(saude()).toHaveLength(0);
  });

  it('backup sem cópia nova há mais de 36 h vira um e-mail por dia', async () => {
    const env = envCompleto();
    await bater(env, 'backup', Date.now() - 40 * 3_600_000);
    await runAlertas(env);
    await runAlertas(env);
    expect(saude()).toHaveLength(1);
    expect(saude()[0]!.subject).toContain('backup do banco sem cópia nova');
    expect(saude()[0]!.text).toContain('40 horas atrás');
    expect(saude()[0]!.text).toContain('Backup do banco');
  });

  it('nenhum carimbo de backup também avisa: é o caso do backup que nunca terminou', async () => {
    const env = envCompleto();
    await runAlertas(env);
    expect(saude()).toHaveLength(1);
    expect(saude()[0]!.text).toContain('nenhum carimbo de backup');
    // Sem data fixa: "desde 01/10/2026" fazia o aviso de um banco parecer do outro.
    expect(saude()[0]!.text).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('5xx acima do limite em 24 h viram e-mail; os de ontem não contam', async () => {
    const env = envCompleto();
    await bater(env, 'backup');
    for (let i = 0; i < 9; i++) await contar5xx(env);
    for (let i = 0; i < 50; i++) await contar5xx(env, Date.now() - 30 * 3_600_000);
    await runAlertas(env);
    expect(saude()).toHaveLength(0);
    /* O décimo: a varredura seguinte avisa (abaixo do limite nada foi
       reservado, então o aviso do dia ainda está livre). */
    await contar5xx(env);
    await runAlertas(env);
    expect(saude()).toHaveLength(1);
    expect(saude()[0]!.subject).toContain('10 erros do servidor em 24 horas');
    /* Uma linha por hora, não por erro. */
    expect(linhas(env, 'SELECT COUNT(*) AS n FROM respostas_5xx')).toEqual([{ n: 2 }]);
  });

  it('um serviço ainda não ligado (503 sem-email, payments-off) não conta como erro', async () => {
    /* A conferência de produção pede o checkout a cada publicação; sem a
       chave do pagamento isso é 503, e nove publicações num dia viravam o
       aviso "10 erros do servidor" sem pane nenhuma (07/11/2026). */
    const env = envCompleto({ RESEND_API_KEY: '' });
    const r = await worker.fetch(pedido(`${SITE}/api/interessados`, { email: 'a@exemplo.com', consentiu: true, interesse: 'curso' }), env, ctx);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'sem-email' });
    expect(r.headers.has('X-HF-Desligado')).toBe(false);
    await assentar();
    expect(linhas(env, 'SELECT n FROM respostas_5xx')).toEqual([]);
  });

  it('a resposta 500 do Worker é contada', async () => {
    const env = envCompleto();
    const db = env.DB as unknown as { prepare(sql: string): unknown };
    const real = db.prepare.bind(db);
    db.prepare = (sql: string) => {
      if (/FROM accounts/.test(sql)) throw new Error('banco em pane');
      return real(sql);
    };
    const r = await worker.fetch(pedido(`${SITE}/api/auth/login`, { email: 'a@exemplo.com', password: 'x'.repeat(10) }), env, ctx);
    expect(r.status).toBe(500);
    await assentar();
    expect(linhas(env, 'SELECT n FROM respostas_5xx')).toEqual([{ n: 1 }]);
  });
});

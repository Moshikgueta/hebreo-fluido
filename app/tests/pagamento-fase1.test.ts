/* Os achados de pagamento da auditoria de 01/10/2026 (B-pagamentos.md).
 * ─────────────────────────────────────────────────────────────────────────
 * Cada bloco é um achado, contra os handlers reais e o schema de produção,
 * com a mesma Mercado Pago de mentira dos outros testes de pagamento:
 *
 *   PAY-B-002  o PIX pendente é reaberto, nunca gerado de novo;
 *   PAY-B-004  o acesso vencido aparece com a data, e os avisos de fim de
 *              acesso saem aos 30 e 7 dias e no dia, uma vez cada;
 *   PAY-B-005  `liberar` com `pedido` marca o pedido pago, concede com o id
 *              dele e o recibo sai na varredura;
 *   PAY-B-006  o aluno recebe e-mail quando o estorno conclui;
 *   PAY-B-008  o estorno do PRIMEIRO de dois pagamentos não fecha o acesso;
 *   PAY-B-009  o cartão em análise por mais de 24 h continua sendo consultado;
 *   PAY-B-010  o pedido que nem nasceu fica fora de Compras e da varredura;
 *   PAY-B-014  corpo manipulado em create; expirado pago depois.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieDe, envDeTeste, pedido, comoAdmin, DADOS_FISCAIS } from './ajuda/d1';
import { CARTAO_CENTAVOS, PIX_CENTAVOS, PRECO } from './ajuda/preco';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - idem
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import { runReconcile } from '../../worker/src/reconcile.js';
// @ts-expect-error - idem
import { runVencimentos } from '../../worker/src/vencimento.js';
// @ts-expect-error - idem
import { hasEntitlement } from '../../worker/src/lib/db.js';
// @ts-expect-error - idem
import { hmacHex } from '../../worker/src/lib/crypto.js';

const SITE = 'https://hebraicofluente.com.br';
const SEGREDO = 'segredo-do-webhook-de-teste';
const TOKEN = 'APP_USR-1234567890123456-092019-abcdef0123456789abcdef0123456789-123456789';
const DONO = 'dono@exemplo.com';
const DIA = 86_400_000;
const pendentes: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => { pendentes.push(p); } };
const assentar = async () => { await Promise.all(pendentes.splice(0)); };

/* ── a Mercado Pago de mentira ─────────────────────────────────────────── */
type Pagamento = {
  id: number; status: string; external_reference: string; transaction_amount: number;
  currency_id: string; transaction_amount_refunded?: number;
};
let pagamentos: Map<number, Pagamento>;
let proximoId = 900001;
let estornos: { pagamento: number }[];
let enviados: { to: string; subject: string; text: string; html: string }[];
let criados: Record<string, unknown>[];

beforeEach(() => {
  pagamentos = new Map(); estornos = []; enviados = []; criados = []; proximoId = 900001;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === 'api.resend.test') {
      const b = JSON.parse(String(init?.body ?? '{}'));
      if (!String(b.subject).startsWith('Confirme seu e-mail')) {
        enviados.push({ to: String(b.to?.[0] ?? ''), subject: b.subject, text: b.text, html: b.html });
      }
      return new Response('{"id":"m1"}', { status: 200 });
    }
    if (u.pathname === '/v1/payments' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      criados.push(body);
      const p: Pagamento = { id: proximoId++, status: 'pending', external_reference: body.external_reference, transaction_amount: body.transaction_amount, currency_id: 'BRL' };
      pagamentos.set(p.id, p);
      return new Response(JSON.stringify({ ...p, point_of_interaction: { transaction_data: { qr_code: '000201-teste' } } }), { status: 201 });
    }
    if (u.pathname === '/checkout/preferences' && init?.method === 'POST') {
      criados.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ id: 'pref-123', init_point: 'https://mp.test/pagar' }), { status: 201 });
    }
    const est = u.pathname.match(/^\/v1\/payments\/(\d+)\/refunds$/);
    if (est && init?.method === 'POST') {
      const p = pagamentos.get(Number(est[1]));
      if (!p) return new Response('{"message":"not found"}', { status: 404 });
      estornos.push({ pagamento: p.id });
      p.status = 'refunded';
      return new Response(JSON.stringify({ id: 9000 + estornos.length, payment_id: p.id, status: 'approved' }), { status: 201 });
    }
    if (u.pathname === '/v1/payments/search') {
      const ref = u.searchParams.get('external_reference');
      return new Response(JSON.stringify({ results: [...pagamentos.values()].filter(p => p.external_reference === ref) }), { status: 200 });
    }
    const m = u.pathname.match(/^\/v1\/payments\/(\d+)$/);
    if (m && init?.method === 'PUT') {
      const p = pagamentos.get(Number(m[1]));
      if (!p) return new Response('{"message":"not found"}', { status: 404 });
      /* A Mercado Pago não cancela o que já foi aprovado. */
      if (p.status === 'approved') return new Response('{"message":"cannot cancel"}', { status: 400 });
      p.status = 'cancelled';
      return new Response(JSON.stringify(p), { status: 200 });
    }
    if (m) {
      const p = pagamentos.get(Number(m[1]));
      return p ? new Response(JSON.stringify(p), { status: 200 }) : new Response('{"message":"not found"}', { status: 404 });
    }
    return new Response('{}', { status: 500 });
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

type Env = Record<string, unknown> & { DB: { bruto: import('node:sqlite').DatabaseSync } };
const envCompleto = (extra: Record<string, unknown> = {}) => envDeTeste({
  MP_ACCESS_TOKEN: TOKEN, MP_WEBHOOK_SECRET: SEGREDO,
  RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebraico Fluente <c@hebraicofluente.com.br>',
  RESEND_BASE: 'https://api.resend.test', SUPPORT_EMAIL: DONO, ...extra
}) as Env;
const linha = (env: Env, sql: string, ...a: unknown[]) =>
  env.DB.bruto.prepare(sql).get(...(a as never[])) as Record<string, unknown> | undefined;
const exec = (env: Env, sql: string, ...a: unknown[]) => env.DB.bruto.prepare(sql).run(...(a as never[]));

async function aviso(id: number) {
  const ts = Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(SEGREDO, `id:${id};request-id:req-1;ts:${ts};`);
  return new Request(`${SITE}/api/pay/webhook?data.id=${id}&type=payment`, {
    method: 'POST', headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1', 'content-type': 'application/json' }, body: '{}'
  });
}

async function aluna(env: Env, email = 'aluna@exemplo.com.br') {
  const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana', email, password: 'senha-boa-123' }), env, ctx });
  await assentar();
  const { account } = await r.json() as { account: { id: number } };
  return { cookie: cookieDe(r), id: account.id, email };
}

const criar = (env: Env, cookie: string, body: Record<string, unknown>) =>
  pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, ...body }, { Cookie: cookie }), env, ctx });
const get = (env: Env, cookie: string, path: string) =>
  worker.fetch(new Request(`${SITE}${path}`, { headers: { Cookie: cookie } }), env, ctx);

async function compraPaga(env: Env, a: { cookie: string; id: number }) {
  const r = await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' });
  const ordem = await r.json() as { id: string };
  const p = [...pagamentos.values()].at(-1)!;
  p.status = 'approved';
  await pay.webhook({ request: await aviso(p.id), env });
  await assentar();
  return { order: ordem.id, pagamento: p };
}

/* ── PAY-B-002 ─────────────────────────────────────────────────────────── */

describe('PAY-B-002: o PIX pendente é reaberto', () => {
  it('GET /api/pay/pix devolve o MESMO código, só para a dona e só dentro do prazo', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const r = await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' });
    const ordem = await r.json() as { id: string; pix: { code: string } };

    const v = await (await get(env, a.cookie, '/api/pay/pix?curso=alfabetizacao')).json() as { order: { id: string; pix: { code: string } } | null };
    expect(v.order?.id).toBe(ordem.id);
    expect(v.order?.pix.code).toBe(ordem.pix.code);
    const porId = await (await get(env, a.cookie, `/api/pay/pix?order=${ordem.id}`)).json() as { order: { id: string } | null };
    expect(porId.order?.id).toBe(ordem.id);
    /* Nenhum pagamento novo nasceu por causa da leitura. */
    expect(pagamentos.size).toBe(1);

    /* Outra conta não vê o PIX dela, nem pelo id. */
    const b = await aluna(env, 'outra@exemplo.com.br');
    expect(await (await get(env, b.cookie, `/api/pay/pix?order=${ordem.id}`)).json()).toEqual({ order: null });
    expect(await (await get(env, b.cookie, '/api/pay/pix?curso=alfabetizacao')).json()).toEqual({ order: null });
    /* Sem sessão, 401. */
    expect((await worker.fetch(new Request(`${SITE}/api/pay/pix?curso=alfabetizacao`), env, ctx)).status).toBe(401);

    /* Vencido o prazo do código, não reabre mais. */
    exec(env, 'UPDATE orders SET pix_expires_at = ? WHERE id = ?', Date.now() - 1000, ordem.id);
    expect(await (await get(env, a.cookie, '/api/pay/pix?curso=alfabetizacao')).json()).toEqual({ order: null });
  });

  it('"Gerar outro código" cancela na Mercado Pago o PIX anterior', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const primeiro = await (await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' })).json() as { id: string };
    const segundo = await (await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' })).json() as { id: string };
    expect(segundo.id).not.toBe(primeiro.id);
    const [p1, p2] = [...pagamentos.values()];
    expect(p1!.status).toBe('cancelled');
    expect(p2!.status).toBe('pending');
    expect(linha(env, 'SELECT status FROM orders WHERE id = ?', primeiro.id)!.status).toBe('expired');
    /* O que reabre agora é o novo. */
    const v = await (await get(env, a.cookie, '/api/pay/pix?curso=alfabetizacao')).json() as { order: { id: string } | null };
    expect(v.order?.id).toBe(segundo.id);
  });

  it('um PIX anterior já aprovado não é cancelado, e o novo nasce mesmo assim', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const primeiro = await (await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' })).json() as { id: string };
    [...pagamentos.values()][0]!.status = 'approved';
    const r = await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' });
    expect(r.status).toBe(200);
    expect([...pagamentos.values()][0]!.status).toBe('approved');
    expect(linha(env, 'SELECT status FROM orders WHERE id = ?', primeiro.id)!.status).toBe('pending');
  });
});

/* ── PAY-B-010 ─────────────────────────────────────────────────────────── */

describe('PAY-B-010: o pedido que nem nasceu no provedor', () => {
  it('fica fora de Compras e da varredura', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    /* A Mercado Pago recusa a criação: o pedido nasce `failed`, sem provider_ref. */
    vi.stubGlobal('fetch', async () => new Response('{"message":"invalid_token"}', { status: 400 }));
    expect((await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' })).status).toBe(502);
    const falho = linha(env, 'SELECT id, status, provider_ref FROM orders')!;
    expect(falho).toMatchObject({ status: 'failed', provider_ref: null });

    const lista = await (await get(env, a.cookie, '/api/orders')).json() as { orders: unknown[] };
    expect(lista.orders, 'a tentativa apareceu como compra').toEqual([]);

    exec(env, 'UPDATE orders SET created_at = created_at - 120000');
    const consultas: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => { consultas.push(String(url)); return new Response('{}', { status: 500 }); });
    await runReconcile(env);
    expect(consultas.filter(u => u.includes('mercadopago')), 'a varredura perguntou pelo pedido que não existe').toEqual([]);
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'settle-error'")).toBeUndefined();
  });
});

/* ── PAY-B-014: corpo manipulado ───────────────────────────────────────── */

describe('PAY-B-014: create ignora o que o corpo não pode decidir', () => {
  it('valor, desconto e parcelas saem do catálogo', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const r = await criar(env, a.cookie, {
      courseSlug: 'alfabetizacao', method: 'pix', amount: 1, amountCents: 100, price: 1, pixDiscountPct: 100
    });
    expect(r.status).toBe(200);
    expect(linha(env, 'SELECT amount_cents FROM orders')!.amount_cents).toBe(PIX_CENTAVOS);
    expect(criados.at(-1)!.transaction_amount).toBe(PIX_CENTAVOS / 100);

    const c = await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'card', installments: 99, amount: 1 });
    expect(c.status).toBe(200);
    expect(linha(env, "SELECT amount_cents, installments FROM orders WHERE method = 'card'"))
      .toEqual({ amount_cents: CARTAO_CENTAVOS, installments: 12 });
    const pref = criados.at(-1)! as { items: { unit_price: number }[]; payment_methods: { installments: number } };
    expect(pref.items[0]!.unit_price).toBe(PRECO);
    expect(pref.payment_methods.installments).toBe(12);

    /* Um curso que ainda não está à venda não vira pedido. */
    expect((await criar(env, a.cookie, { courseSlug: 'hebraico-a1', method: 'pix' })).status).toBe(404);
  });
});

/* ── PAY-B-009 e PAY-B-014: expirado pago depois ───────────────────────── */

describe('PAY-B-009: o cartão em análise por mais de 24 h', () => {
  it('a varredura continua consultando o expirado e libera quando aprova', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const r = await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' });
    const ordem = await r.json() as { id: string };
    const p = [...pagamentos.values()].at(-1)!;
    p.status = 'in_process';
    /* A tela consultou e viu "em análise". */
    const v = await pay.verify({ request: new Request(`${SITE}/api/pay/verify?order=${ordem.id}`, { headers: { Cookie: a.cookie } }), env });
    expect((await v.json() as { ultimoPagamento: string }).ultimoPagamento).toBe('em-analise');

    /* Um dia e pouco depois, a varredura expira o pedido. */
    exec(env, 'UPDATE orders SET created_at = created_at - ?, checked_at = NULL WHERE id = ?', 25 * 3_600_000, ordem.id);
    await runReconcile(env);
    expect(linha(env, 'SELECT status FROM orders WHERE id = ?', ordem.id)!.status).toBe('expired');

    /* A operadora aprova. O aviso se perde; seis horas depois, a varredura acha. */
    p.status = 'approved';
    vi.useFakeTimers({ now: Date.now() + 7 * 3_600_000, toFake: ['Date'] });
    await runReconcile(env);
    expect(linha(env, 'SELECT status FROM orders WHERE id = ?', ordem.id)!.status).toBe('paid');
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
  });

  it('a tela também acha um expirado pago depois', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const r = await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' });
    const ordem = await r.json() as { id: string };
    exec(env, "UPDATE orders SET status = 'expired' WHERE id = ?", ordem.id);
    [...pagamentos.values()].at(-1)!.status = 'approved';
    const v = await pay.verify({ request: new Request(`${SITE}/api/pay/verify?order=${ordem.id}`, { headers: { Cookie: a.cookie } }), env });
    expect((await v.json() as { status: string }).status).toBe('paid');
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
  });

  it('depois de uma semana, para de perguntar', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const r = await criar(env, a.cookie, { courseSlug: 'alfabetizacao', method: 'pix' });
    const ordem = await r.json() as { id: string };
    await pay.verify({ request: new Request(`${SITE}/api/pay/verify?order=${ordem.id}`, { headers: { Cookie: a.cookie } }), env });
    exec(env, "UPDATE orders SET status = 'expired', created_at = ?, checked_at = NULL WHERE id = ?", Date.now() - 8 * DIA, ordem.id);
    [...pagamentos.values()].at(-1)!.status = 'approved';
    await runReconcile(env);
    expect(linha(env, 'SELECT status FROM orders WHERE id = ?', ordem.id)!.status).toBe('expired');
  });
});

/* ── PAY-B-008 ─────────────────────────────────────────────────────────── */

describe('PAY-B-008: pedido pago duas vezes, estorno do PRIMEIRO pagamento', () => {
  it('não fecha o acesso, e o pedido passa a apontar para o pagamento que restou', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const { order, pagamento: p1 } = await compraPaga(env, a);
    const p2: Pagamento = { ...p1, id: proximoId++, status: 'approved' };
    pagamentos.set(p2.id, p2);
    await pay.webhook({ request: await aviso(p2.id), env });

    /* O dono estorna o primeiro (o gravado em provider_ref). */
    p1.status = 'refunded';
    expect((await pay.webhook({ request: await aviso(p1.id), env })).status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao'), 'o estorno do primeiro fechou o acesso pago pelo segundo').toBe(true);
    expect(linha(env, 'SELECT status, provider_ref FROM orders WHERE id = ?', order))
      .toEqual({ status: 'paid', provider_ref: String(p2.id) });
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'estorno-duplicado'")).toBeTruthy();

    /* E o estorno do segundo, o último que pagava, fecha. */
    p2.status = 'refunded';
    await pay.webhook({ request: await aviso(p2.id), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    expect(linha(env, 'SELECT status FROM orders WHERE id = ?', order)!.status).toBe('refunded');
  });

  it('a desistência de um pedido pago duas vezes devolve os DOIS pagamentos', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const { order, pagamento: p1 } = await compraPaga(env, a);
    const p2: Pagamento = { ...p1, id: proximoId++, status: 'approved' };
    pagamentos.set(p2.id, p2);
    await pay.webhook({ request: await aviso(p2.id), env });

    await pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order }, { Cookie: a.cookie }), env, ctx });
    await assentar();
    expect(estornos.map(e => e.pagamento)).toEqual([p1.id]);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);

    /* A varredura segue para o pagamento que restou. */
    await runReconcile(env);
    expect(estornos.map(e => e.pagamento)).toEqual([p1.id, p2.id]);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    expect(linha(env, 'SELECT estado FROM estornos WHERE order_id = ?', order)!.estado).toBe('concluido');
  });
});

/* ── PAY-B-006 ─────────────────────────────────────────────────────────── */

describe('PAY-B-006: o aluno fica sabendo que o estorno concluiu', () => {
  it('o estorno automático manda um e-mail, uma vez', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const { order, pagamento } = await compraPaga(env, a);
    enviados = [];
    pagamento.status = 'refunded';
    for (let i = 0; i < 3; i++) await pay.webhook({ request: await aviso(pagamento.id), env });
    const dela = enviados.filter(m => m.to === a.email);
    expect(dela).toHaveLength(1);
    expect(dela[0]!.subject).toBe('Estorno concluído - Alfabetização em Hebraico');
    expect(dela[0]!.text).toContain('está concluído');
    expect(dela[0]!.text).toContain('O acesso ao curso está encerrado.');
    expect(dela[0]!.text).toContain(order);
  });

  it('a contestação diz que foi contestação', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const { pagamento } = await compraPaga(env, a);
    enviados = [];
    pagamento.status = 'charged_back';
    await pay.webhook({ request: await aviso(pagamento.id), env });
    expect(enviados.find(m => m.to === a.email)!.subject).toBe('Compra contestada - Alfabetização em Hebraico');
  });

  it('o "já devolvi" do dono em /admin/estornos também avisa', async () => {
    const env = envCompleto({ ADMIN_EMAILS: DONO });
    const a = await aluna(env);
    const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'D', email: DONO, password: 'senha-boa-123' }), env, ctx });
    const dono = await comoAdmin(env, cookieDe(r));
    const agora = Date.now();
    exec(env, `INSERT INTO orders (id, account_id, course_slug, amount_cents, method, status, provider, created_at, paid_at)
               VALUES ('HFmanual1', ?, 'alfabetizacao', 13230, 'pix', 'paid', 'manual', ?, ?)`, a.id, agora, agora);
    exec(env, `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
               VALUES (?, 'alfabetizacao', ?, ?, 'HFmanual1')`, a.id, agora, agora + 365 * DIA);
    exec(env, "INSERT INTO estornos (order_id, estado, criado_em, atualizado_em) VALUES ('HFmanual1', 'manual', ?, ?)", agora, agora);
    enviados = [];
    const f = await worker.fetch(new Request(`${SITE}/api/admin/estornos/feito`, {
      method: 'POST', headers: { cookie: dono, Origin: SITE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'HFmanual1' })
    }), env, ctx);
    expect(f.status).toBe(200);
    const dela = enviados.filter(m => m.to === a.email);
    expect(dela).toHaveLength(1);
    expect(dela[0]!.text).toContain('O valor volta pela mesma forma de pagamento.');
  });
});

/* ── PAY-B-005 ─────────────────────────────────────────────────────────── */

const SCRIPT = fileURLToPath(new URL('../../scripts/sql-liberar-pedido.sh', import.meta.url));
const sqlLiberar = (p: string, mail: string, meses = 12) =>
  execFileSync('bash', [SCRIPT, p, mail.replace(/'/g, "''"), String(meses)], { encoding: 'utf8' });

describe('PAY-B-005: liberar um PEDIDO pela Action', () => {
  async function pixDiretoPendente(env: Env) {
    const a = await aluna(env);
    const agora = Date.now();
    exec(env, `INSERT INTO orders (id, account_id, course_slug, amount_cents, method, status, provider, pix_code, pix_expires_at, created_at)
               VALUES ('HFpixdireto1', ?, 'alfabetizacao', 13230, 'pix', 'pending', 'mercadopago', '000201-x', ?, ?)`,
         a.id, agora + 30 * 60_000, agora - 60_000);
    return a;
  }

  it('marca o pedido pago, concede com o id dele, e o recibo sai na varredura, uma vez', async () => {
    const env = envCompleto();
    const a = await pixDiretoPendente(env);
    env.DB.bruto.exec(sqlLiberar('HFpixdireto1', a.email));

    expect(linha(env, "SELECT status, provider, paid_at IS NOT NULL AS pago FROM orders WHERE id = 'HFpixdireto1'"))
      .toEqual({ status: 'paid', provider: 'manual', pago: 1 });
    const ent = linha(env, 'SELECT order_id, expires_at FROM entitlements WHERE account_id = ?', a.id)!;
    expect(ent.order_id).toBe('HFpixdireto1');
    expect(Number(ent.expires_at)).toBeGreaterThan(Date.now() + 360 * DIA);

    /* Compras mostra "Pago", com o botão de desistir. */
    const lista = await (await get(env, a.cookie, '/api/orders')).json() as { orders: { status: string; desistirAte: string | null }[] };
    expect(lista.orders[0]).toMatchObject({ status: 'paid' });
    expect(lista.orders[0]!.desistirAte).toBeTruthy();

    /* Rodar de novo não soma meses. */
    env.DB.bruto.exec(sqlLiberar('HFpixdireto1', a.email));
    expect(linha(env, 'SELECT expires_at FROM entitlements WHERE account_id = ?', a.id)!.expires_at).toBe(ent.expires_at);

    enviados = [];
    await runReconcile(env);
    await runReconcile(env);
    const recibos = enviados.filter(m => m.to === a.email);
    expect(recibos, 'o recibo não saiu, ou saiu duas vezes').toHaveLength(1);
    expect(recibos[0]!.subject).toBe('Seu acesso está liberado - Alfabetização em Hebraico');
    expect(recibos[0]!.text).toContain('HFpixdireto1');

    /* E a desistência pelo site passa a existir: estorno com o dono. */
    const d = await pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order: 'HFpixdireto1' }, { Cookie: a.cookie }), env, ctx });
    expect(d.status).toBe(200);
    await assentar();
    expect(linha(env, "SELECT estado FROM estornos WHERE order_id = 'HFpixdireto1'")!.estado).toBe('manual');
  });

  it('não age em pedido de outra conta, nem em pedido estornado', async () => {
    const env = envCompleto();
    const a = await pixDiretoPendente(env);
    env.DB.bruto.exec(sqlLiberar('HFpixdireto1', 'outra@exemplo.com.br'));
    expect(linha(env, "SELECT status FROM orders WHERE id = 'HFpixdireto1'")!.status).toBe('pending');
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);

    exec(env, "UPDATE orders SET status = 'refunded' WHERE id = 'HFpixdireto1'");
    env.DB.bruto.exec(sqlLiberar('HFpixdireto1', a.email));
    expect(linha(env, "SELECT status FROM orders WHERE id = 'HFpixdireto1'")!.status).toBe('refunded');
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
  });

  it('com acesso valendo, soma a partir do vencimento', async () => {
    const env = envCompleto();
    const a = await pixDiretoPendente(env);
    const vence = Date.now() + 20 * DIA;
    exec(env, `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
               VALUES (?, 'alfabetizacao', ?, ?, 'ANTERIOR')`, a.id, Date.now() - 300 * DIA, vence);
    env.DB.bruto.exec(sqlLiberar('HFpixdireto1', a.email));
    const novo = Number(linha(env, 'SELECT expires_at FROM entitlements WHERE account_id = ?', a.id)!.expires_at);
    expect(novo).toBeGreaterThan(vence + 360 * DIA);
    expect(novo).toBeLessThan(vence + 370 * DIA);
  });

  it('recusa um id de pedido com caractere fora da lista', () => {
    expect(() => sqlLiberar("HF'; DROP TABLE orders; --", 'a@b.c')).toThrow();
  });
});

/* ── PAY-B-004 ─────────────────────────────────────────────────────────── */

describe('PAY-B-004: o acesso vencido', () => {
  it('/api/orders devolve o vencimento do acesso que acabou', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const ontem = Date.now() - DIA;
    exec(env, `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
               VALUES (?, 'alfabetizacao', ?, ?, 'X')`, a.id, ontem - 365 * DIA, ontem);
    const r = await (await get(env, a.cookie, '/api/orders')).json() as { vencidos: { courseSlug: string; expiredAt: string }[] };
    expect(r.vencidos).toEqual([{ courseSlug: 'alfabetizacao', expiredAt: new Date(ontem).toISOString() }]);
  });

  it('com o acesso valendo, nada vencido', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    await compraPaga(env, a);
    const r = await (await get(env, a.cookie, '/api/orders')).json() as { vencidos: unknown[] };
    expect(r.vencidos).toEqual([]);
  });

  it('os avisos saem aos 30 e 7 dias e no dia do fim, uma vez cada', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const inicio = Date.now();
    const fim = inicio + 30 * DIA - 3_600_000;               // 29 dias e 23 h
    exec(env, `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
               VALUES (?, 'alfabetizacao', ?, ?, 'X')`, a.id, inicio - 300 * DIA, fim);

    const doDia = async (dias: number) => {
      enviados = [];
      await runVencimentos(env, inicio + dias * DIA);
      await runVencimentos(env, inicio + dias * DIA + 3_600_000);   // a mesma data, de novo
      return enviados.filter(m => m.to === a.email);
    };

    const d30 = await doDia(0);
    expect(d30).toHaveLength(1);
    expect(d30[0]!.subject).toBe('Seu acesso termina em 30 dias - Alfabetização em Hebraico');
    expect(d30[0]!.text).toContain('renove por mais 12 meses: https://hebraicofluente.com.br/checkout/alfabetizacao/');
    expect(d30[0]!.text).toContain('Não há renovação automática');

    expect(await doDia(10), 'aviso fora de marco').toHaveLength(0);

    const d7 = await doDia(23);
    expect(d7).toHaveLength(1);
    expect(d7[0]!.subject).toBe('Seu acesso termina em 7 dias - Alfabetização em Hebraico');
    expect(await doDia(25), 'o aviso de 7 dias saiu de novo').toHaveLength(0);

    const noFim = await doDia(30);
    expect(noFim).toHaveLength(1);
    expect(noFim[0]!.subject).toBe('Seu acesso terminou - Alfabetização em Hebraico');
    expect(noFim[0]!.text).toMatch(/está encerrado desde \d{2}\/\d{2}\/\d{4}/);
    expect(await doDia(31)).toHaveLength(0);
    expect(await doDia(40), 'muito depois do fim, nenhum aviso').toHaveLength(0);
  });

  it('renovar muda a data, e os marcos recomeçam para o novo vencimento', async () => {
    const env = envCompleto();
    const a = await aluna(env);
    const inicio = Date.now();
    exec(env, `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
               VALUES (?, 'alfabetizacao', ?, ?, 'X')`, a.id, inicio - 300 * DIA, inicio + 5 * DIA);
    await runVencimentos(env, inicio);
    expect(enviados.filter(m => m.to === a.email)).toHaveLength(1);
    /* Renovou: o vencimento pula um ano. Nada sai agora... */
    exec(env, 'UPDATE entitlements SET expires_at = ? WHERE account_id = ?', inicio + 370 * DIA, a.id);
    enviados = [];
    await runVencimentos(env, inicio + DIA);
    expect(enviados).toHaveLength(0);
    /* ...e o de 30 dias do vencimento novo sai quando chegar a hora. */
    await runVencimentos(env, inicio + 341 * DIA);
    expect(enviados.filter(m => m.to === a.email)).toHaveLength(1);
  });

  it('conta de teste (.invalid) e provedor desligado não recebem nada', async () => {
    const env = envCompleto();
    const a = await aluna(env, 'teste-1@example.invalid');
    exec(env, `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
               VALUES (?, 'alfabetizacao', ?, ?, 'X')`, a.id, Date.now(), Date.now() + 5 * DIA);
    await runVencimentos(env);
    expect(enviados).toHaveLength(0);

    const sem = envDeTeste() as Env;
    expect(await runVencimentos(sem)).toEqual({ enviados: 0 });
  });
});

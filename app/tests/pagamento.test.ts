/* Como o dinheiro vira acesso - e como deixa de ser.
 * ─────────────────────────────────────────────────────────────────────────
 * Nove defeitos que a auditoria de segurança de 20/09/2026 encontrou na
 * liberação de acesso (cinco na primeira passada, quatro na verificação
 * independente da correção), cada um com o cenário que o disparava, contra
 * os handlers reais e o esquema de produção, com uma Mercado Pago de mentira
 * que muda de ideia sobre um pagamento do jeito que a de verdade muda:
 * `pending` hoje, `approved` daqui a pouco, `refunded` na semana que vem -
 * sempre com o MESMO id.
 *
 * Viveu em audit/ como proposta, falhando de propósito, até a correção ser
 * aprovada e aplicada; desde então mora aqui, e um destes testes falhando
 * é uma regressão em quem recebe o curso. A história está em audit/README.md.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieDe, envDeTeste, pedido, DADOS_FISCAIS } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - idem
import { runReconcile } from '../../worker/src/reconcile.js';
// @ts-expect-error - idem
import { grantAccess, hasEntitlement } from '../../worker/src/lib/db.js';
// @ts-expect-error - idem
import { hmacHex } from '../../worker/src/lib/crypto.js';

const SITE = 'https://hebraicofluente.com.br';
const SEGREDO = 'segredo-do-webhook-de-teste';
const TOKEN = 'APP_USR-1234567890123456-092019-abcdef0123456789abcdef0123456789-123456789';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };

/* ── a Mercado Pago de mentira ─────────────────────────────────────────── */
type Pagamento = { id: number; status: string; external_reference: string; transaction_amount: number; currency_id: string };
let pagamentos: Map<number, Pagamento>;
let proximoId = 700001;

function mercadoPagoFalsa() {
  pagamentos = new Map();
  enviados = [];
  recusarEmail = false;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === 'api.resend.test') {
      if (recusarEmail) return new Response('{"message":"nope"}', { status: 422 });
      const b = JSON.parse(String(init?.body ?? '{}'));
      /* O e-mail de confirmação do cadastro (tests/confirmacao.test.ts) não
         é assunto deste arquivo, e contá-lo aqui mudaria toda contagem. */
      if (String(b.subject).startsWith('Confirme seu e-mail')) {
        return new Response('{"id":"m0"}', { status: 200 });
      }
      enviados.push({ to: String(b.to?.[0] ?? ''), subject: b.subject, text: b.text, html: b.html });
      return new Response('{"id":"m1"}', { status: 200 });
    }
    if (u.pathname === '/v1/payments' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      const p: Pagamento = {
        id: proximoId++, status: 'pending', external_reference: body.external_reference,
        transaction_amount: body.transaction_amount, currency_id: 'BRL'
      };
      pagamentos.set(p.id, p);
      return new Response(JSON.stringify({ ...p, point_of_interaction: { transaction_data: { qr_code: '000201-teste' } } }), { status: 201 });
    }
    if (u.pathname === '/v1/payments/search') {
      const ref = u.searchParams.get('external_reference');
      const results = [...pagamentos.values()].filter(p => p.external_reference === ref);
      return new Response(JSON.stringify({ results }), { status: 200 });
    }
    const m = u.pathname.match(/^\/v1\/payments\/(\d+)$/);
    /* Um pagamento de OUTRO vendedor: a Mercado Pago responde 403. */
    if (m && m[1] === '403403') return new Response('{"message":"forbidden"}', { status: 403 });
    if (m) {
      const p = pagamentos.get(Number(m[1]));
      return p ? new Response(JSON.stringify(p), { status: 200 }) : new Response('{"message":"not found"}', { status: 404 });
    }
    return new Response('{}', { status: 500 });
  });
}

/* ── o provedor de e-mail de mentira ───────────────────────────────────
   Mora dentro do mesmo `fetch` falso da Mercado Pago, e não num segundo:
   um `stubGlobal` sobrescreve o outro, e quem chegasse depois apagaria a
   Mercado Pago inteira. */
type Enviado = { to: string; subject: string; text: string; html: string };
let enviados: Enviado[] = [];
let recusarEmail = false;

/** Um aviso assinado como a Mercado Pago assina. */
async function avisoAssinado(id: number, emMs = false) {
  /* A Mercado Pago manda o `ts` em segundos (documentação) ou em
     milissegundos (visto em produção em 28/09/2026). Os dois valem. */
  const ts = emMs ? Date.now() : Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(SEGREDO, `id:${id};request-id:req-1;ts:${ts};`);
  return new Request(`${SITE}/api/pay/webhook?data.id=${id}&type=payment`, {
    method: 'POST',
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1', 'content-type': 'application/json' },
    body: '{}'
  });
}

const envPagamento = () => envDeTeste({ MP_ACCESS_TOKEN: TOKEN, MP_WEBHOOK_SECRET: SEGREDO });

/** O mesmo, com o provedor de e-mail ligado. */
const envComEmail = () => envDeTeste({
  MP_ACCESS_TOKEN: TOKEN, MP_WEBHOOK_SECRET: SEGREDO,
  RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebraico Fluente <c@hebraicofluente.com.br>',
  RESEND_BASE: 'https://api.resend.test'
});

async function compradora(env: Record<string, unknown>, email = 'compradora@exemplo.com.br') {
  const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana', email, password: 'senha-boa-123' }), env, ctx });
  const body = await r.json() as { account: { id: number } };
  return { cookie: cookieDe(r), id: body.account.id };
}

async function pedidoPix(env: Record<string, unknown>, cookie: string) {
  const r = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'pix' }, { Cookie: cookie }), env, ctx });
  expect(r.status).toBe(200);
  return await r.json() as { id: string; status: string };
}

const verify = (env: Record<string, unknown>, cookie: string, id: string) =>
  pay.verify({ request: new Request(`${SITE}/api/pay/verify?order=${id}`, { headers: { Cookie: cookie } }), env });

const linha = (env: Record<string, unknown>, sql: string) =>
  (env.DB as { bruto: { prepare(s: string): { get(): unknown } } }).bruto.prepare(sql).get() as Record<string, unknown> | undefined;

beforeEach(() => { proximoId = 700001; mercadoPagoFalsa(); });
afterEach(() => { vi.unstubAllGlobals(); });

/* ── 1. o pagamento visto pendente tem de poder ser liberado depois ─────── */

describe('1. um PIX visto pendente e aprovado depois libera o curso', () => {
  it('a tela consulta enquanto está pendente, o aviso de aprovação chega, e o acesso abre', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);

    /* A tela do checkout pergunta três segundos depois do QR aparecer. */
    const antes = await verify(env, cookie, ordem.id);
    expect((await antes.json() as { status: string }).status).toBe('pending');

    /* A compradora paga. O MESMO pagamento muda de status. */
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';

    const w = await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(w.status).toBe(200);

    expect(await hasEntitlement(env, id, 'alfabetizacao'), 'o curso não foi liberado').toBe(true);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('paid');
  });

  it('o mesmo aviso de aprovação repetido continua não liberando duas vezes', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';
    for (let i = 0; i < 3; i++) await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);
    const grants = (env.DB as { bruto: { prepare(s: string): { all(): unknown[] } } }).bruto
      .prepare("SELECT 1 FROM access_log WHERE action = 'grant'").all();
    expect(grants.length).toBe(1);
    void ordem;
  });

  it('a varredura também consegue, e não conta um no-op como liberação', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    await verify(env, cookie, ordem.id);                       // pendente, registrado
    /* Envelhece o pedido para a varredura olhar para ele. */
    (env.DB as { bruto: { prepare(s: string): { run(): unknown } } }).bruto
      .prepare(`UPDATE orders SET created_at = created_at - 120000, checked_at = NULL WHERE id = '${ordem.id}'`).run();
    const r1 = await runReconcile(env);
    expect(r1.settled, 'contou como liberado sem liberar').toBe(0);
    [...pagamentos.values()][0]!.status = 'approved';
    const r2 = await runReconcile(env);
    expect(r2.settled).toBe(1);
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);
  });
});

/* ── 2. estorno fecha a porta ───────────────────────────────────────────── */

describe('1c. aviso de pagamento de outro vendedor (PAY-006)', () => {
  it('responde 200, fica na trilha como alheio e não vira erro de liberação', async () => {
    const env = envPagamento();
    const r = await pay.webhook({ request: await avisoAssinado(403403), env });
    expect(r.status).toBe(200);
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'webhook-alheio'")).toBeTruthy();
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'settle-error'")).toBeFalsy();
  });
});

describe('1b. aviso com o ts em milissegundos', () => {
  it('é aceito e libera o curso', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    await pedidoPix(env, cookie);
    const p = [...pagamentos.values()].at(-1)!;
    p.status = 'approved';
    const r = await pay.webhook({ request: await avisoAssinado(p.id, true), env });
    expect(r.status).toBe(200);
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);
  });
});

describe('2. estorno e chargeback fecham o acesso', () => {
  it.each(['refunded', 'charged_back'])('%s depois de pago revoga e marca o pedido', async (fim) => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);

    p.status = fim;
    const w = await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(w.status).toBe(200);

    expect(await hasEntitlement(env, id, 'alfabetizacao'), 'o acesso sobreviveu ao estorno').toBe(false);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('refunded');
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'estorno'")).toBeTruthy();
  });
});

/* ── 2b. cobrança em dobro (27/09/2026) ───────────────────────────────────
   O link do cartão continua aceitando pagamento: dá para pagar o mesmo pedido
   duas vezes. Estornar a cobrança duplicada NÃO pode fechar o acesso que o
   outro pagamento paga - e a cobrança em dobro tem de aparecer na trilha. */

describe('2b. o estorno de uma cobrança em dobro não fecha o acesso', () => {
  it('o segundo pagamento fica na trilha; o estorno dele não recua nada; o do primeiro, sim', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p1 = [...pagamentos.values()][0]!;
    p1.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p1.id), env });
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);

    /* A mesma compra, paga de novo. */
    const p2: Pagamento = { ...p1, id: proximoId++, status: 'approved' };
    pagamentos.set(p2.id, p2);
    await pay.webhook({ request: await avisoAssinado(p2.id), env });
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'pagamento-duplicado'"),
      'a cobrança em dobro passou calada').toBeTruthy();

    /* O dono estorna a duplicada. */
    p2.status = 'refunded';
    await pay.webhook({ request: await avisoAssinado(p2.id), env });
    expect(await hasEntitlement(env, id, 'alfabetizacao'), 'o estorno da duplicada fechou o acesso pago').toBe(true);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('paid');
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'estorno-duplicado'")).toBeTruthy();

    /* E o estorno do pagamento que pagou continua fechando. */
    p1.status = 'refunded';
    await pay.webhook({ request: await avisoAssinado(p1.id), env });
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(false);
  });
});

/* ── 2b'. dois PEDIDOS do mesmo curso pagos (auditoria de 28/09, PAY-004) ──
   "Gerar outro código" cria um PIX novo e o anterior continua pagável. Pagos
   os dois, o aluno fica com os meses dos dois - e o dono precisa saber. */

describe("2b'. dois pedidos do mesmo curso pagos no mesmo dia viram alerta", () => {
  it('o segundo pedido pago grava pedido-duplicado; um pedido só, não', async () => {
    const env = envPagamento();
    const { cookie } = await compradora(env);
    const o1 = await pedidoPix(env, cookie);
    const p1 = [...pagamentos.values()].at(-1)!;
    p1.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p1.id), env });
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'pedido-duplicado'"),
      'um pedido só não é duplicidade').toBeFalsy();

    /* Pagar um segundo pedido exige que a loja deixe criá-lo: com acesso
       valendo, o checkout recusa - então o caso real é o PIX anterior,
       ainda pendente, pago depois do novo. Simulamos o mesmo no banco. */
    const db = (env.DB as { bruto: { prepare(s: string): { run(...a: unknown[]): unknown } } }).bruto;
    const p2: Pagamento = { ...p1, id: proximoId++, status: 'approved' };
    pagamentos.set(p2.id, p2);
    const o2 = `${o1.id}-2`;
    db.prepare(`INSERT INTO orders (id, account_id, course_slug, amount_cents, currency, method, status, provider, provider_ref, created_at)
                SELECT ?, account_id, course_slug, amount_cents, currency, method, 'pending', provider, NULL, created_at
                  FROM orders WHERE id = ?`).run(o2, o1.id);
    p2.external_reference = o2;
    await pay.webhook({ request: await avisoAssinado(p2.id), env });
    expect(linha(env, `SELECT status FROM orders WHERE id = '${o2}'`)!.status).toBe('paid');
    expect(linha(env, "SELECT detail FROM access_log WHERE action = 'pedido-duplicado'"),
      'dois pedidos pagos passaram calados').toBeTruthy();
  });
});

/* ── 2c. recusado e aprovado na segunda tentativa (27/09/2026) ─────────────
   O cartão recusado marca o pedido `failed`. A segunda tentativa, aprovada,
   precisa ser achada pela tela e pela varredura - não só pelo aviso da
   Mercado Pago, que pode se perder. */

describe('2c. um pedido recusado e pago na segunda tentativa não fica de fora', () => {
  async function recusadoDepoisAprovado(env: Record<string, unknown>) {
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p1 = [...pagamentos.values()][0]!;
    p1.status = 'rejected';
    await pay.webhook({ request: await avisoAssinado(p1.id), env });
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('failed');
    /* A segunda tentativa é aprovada - e o aviso dela se perde. */
    const p2: Pagamento = { ...p1, id: proximoId++, status: 'approved' };
    pagamentos.set(p2.id, p2);
    return { cookie, id, ordem };
  }

  it('a tela do comprador acha o pagamento', async () => {
    const env = envPagamento();
    const { cookie, id, ordem } = await recusadoDepoisAprovado(env);
    const r = await verify(env, cookie, ordem.id);
    expect((await r.json() as { status: string }).status).toBe('paid');
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);
  });

  it('a varredura de 5 em 5 minutos também', async () => {
    const env = envPagamento();
    const { id, ordem } = await recusadoDepoisAprovado(env);
    (env.DB as { bruto: { prepare(s: string): { run(): unknown } } }).bruto
      .prepare(`UPDATE orders SET created_at = created_at - 120000, checked_at = NULL WHERE id = '${ordem.id}'`).run();
    const r = await runReconcile(env);
    expect(r.settled).toBe(1);
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);
  });
});

/* ── 3. uma liberação que quebrou no meio se recupera ───────────────────── */

describe('3. uma falha no meio da liberação não vira um pedido pago sem curso', () => {
  it('o webhook responde 500 (para a Mercado Pago reenviar) e o reenvio termina o serviço', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';

    /* O banco cai exatamente na gravação do direito de acesso, uma vez. */
    const db = env.DB as { prepare(sql: string): unknown };
    const prepareReal = db.prepare.bind(db);
    let derrubar = true;
    db.prepare = (sql: string) => {
      if (derrubar && /INSERT INTO entitlements/i.test(sql)) { derrubar = false; throw new Error('D1 fora do ar'); }
      return prepareReal(sql);
    };

    const w1 = await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(w1.status, 'uma falha interna respondeu como sucesso').toBe(500);
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(false);

    const w2 = await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(w2.status).toBe(200);
    expect(await hasEntitlement(env, id, 'alfabetizacao'), 'o reenvio não recuperou').toBe(true);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('paid');
  });

  it('um pagamento que não é nosso continua respondendo 200, sem reenvio', async () => {
    const env = envPagamento();
    pagamentos.set(999, { id: 999, status: 'approved', external_reference: 'HF-de-outra-loja', transaction_amount: 1, currency_id: 'BRL' });
    const w = await pay.webhook({ request: await avisoAssinado(999), env });
    expect(w.status).toBe(200);
  });
});

/* ── 4. renovar antes de vencer ─────────────────────────────────────────── */

describe('4. dá para renovar nos últimos 45 dias, e só neles', () => {
  const dia = 86_400_000;
  async function comAcessoVencendoEm(dias: number) {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    await grantAccess(env, { accountId: id, courseSlug: 'alfabetizacao', orderId: 'T', months: 12 });
    (env.DB as { bruto: { prepare(s: string): { run(): unknown } } }).bruto
      .prepare(`UPDATE entitlements SET expires_at = ${Date.now() + dias * dia} WHERE account_id = ${id}`).run();
    return { env, cookie };
  }
  it('com 10 dias sobrando, o pedido nasce', async () => {
    const { env, cookie } = await comAcessoVencendoEm(10);
    const r = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'pix' }, { Cookie: cookie }), env, ctx });
    expect(r.status).toBe(200);
  });
  it('com 200 dias sobrando, continua recusando - e com código próprio', async () => {
    const { env, cookie } = await comAcessoVencendoEm(200);
    const r = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'pix' }, { Cookie: cookie }), env, ctx });
    expect(r.status).toBe(409);
    expect((await r.json() as { error: string }).error).toBe('already-owned');
  });
});

/* ── 5. sair de verdade ─────────────────────────────────────────────────── */

describe('5. sair invalida o cookie no servidor', () => {
  it('o cookie antigo não entra mais depois de sair', async () => {
    const env = envPagamento();
    const { cookie } = await compradora(env);
    const me = (c: string) => auth.me({ request: new Request(`${SITE}/api/me`, { headers: { Cookie: c } }), env });
    expect((await me(cookie)).status).toBe(200);
    await auth.logout({ request: new Request(`${SITE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } }), env });
    expect((await me(cookie)).status, 'o cookie sobreviveu ao logout').toBe(401);
  });
});

/* ── o que a verificação independente achou na primeira proposta ────────── */

const vencimento = (env: Record<string, unknown>, id: number) =>
  Number(linha(env, `SELECT expires_at FROM entitlements WHERE account_id = ${id}`)?.expires_at ?? 0);
const dia = 86_400_000;

/* 6. Com o direito gravado antes do pedido (bloco 3), a retomada de uma
   liberação que caiu ENTRE os dois chamava `grantAccess` de novo - e
   `grantAccess` estende. Vinte e quatro meses por doze. */
describe('6. a retomada de uma liberação interrompida não concede os meses duas vezes', () => {
  it('cai depois do direito e antes do pedido; o reenvio marca o pedido sem estender', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';

    const db = env.DB as { prepare(sql: string): unknown };
    const prepareReal = db.prepare.bind(db);
    let derrubar = true;
    db.prepare = (sql: string) => {
      if (derrubar && /UPDATE orders SET[^;]*paid_at/i.test(sql)) { derrubar = false; throw new Error('D1 fora do ar'); }
      return prepareReal(sql);
    };

    expect((await pay.webhook({ request: await avisoAssinado(p.id), env })).status).toBe(500);
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);
    const antes = vencimento(env, id);
    expect(antes).toBeGreaterThan(Date.now() + 360 * dia);
    expect(antes).toBeLessThan(Date.now() + 370 * dia);

    expect((await pay.webhook({ request: await avisoAssinado(p.id), env })).status).toBe(200);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('paid');
    expect(vencimento(env, id), 'a retomada estendeu de novo').toBe(antes);
  });
});

/* 7. O estorno de uma RENOVAÇÃO apagava a linha inteira - inclusive os meses
   da compra anterior, que ninguém devolveu. */
describe('7. o estorno de uma renovação recua só os meses dela', () => {
  it('um mês pago + renovação estornada = um mês', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    /* A compra anterior, com um mês sobrando - dentro da janela em que o
       checkout aceita renovar (bloco 4). */
    await grantAccess(env, { accountId: id, courseSlug: 'alfabetizacao', orderId: 'ANTERIOR', months: 12 });
    const restante = Date.now() + 30 * dia;
    (env.DB as { bruto: { prepare(s: string): { run(): unknown } } }).bruto
      .prepare(`UPDATE entitlements SET expires_at = ${restante} WHERE account_id = ${id}`).run();

    /* A renovação, paga. */
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(vencimento(env, id)).toBeGreaterThan(restante + 360 * dia);

    /* E estornada. */
    p.status = 'refunded';
    await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('refunded');
    expect(await hasEntitlement(env, id, 'alfabetizacao'), 'o estorno da renovação levou a compra anterior').toBe(true);
    const depois = vencimento(env, id);
    expect(Math.abs(depois - restante)).toBeLessThan(2 * dia);
  });

  it('quando o pedido estornado é o único, o acesso fecha inteiro', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p.id), env });
    p.status = 'charged_back';
    await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(false);
    expect(linha(env, `SELECT 1 AS x FROM entitlements WHERE account_id = ${id}`)).toBeUndefined();
  });
});

/* 8. Um estorno PARCIAL não muda o status na Mercado Pago: o pagamento fica
   `approved` com `transaction_amount_refunded` > 0. A primeira proposta não
   olhava esse campo, então um estorno de 99% deixava o curso aberto. */
describe('8. um estorno parcial que deixa menos do que o curso custa fecha o acesso', () => {
  it('approved com quase tudo devolvido revoga e marca refunded', async () => {
    const env = envPagamento();
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]! as Pagamento & { transaction_amount_refunded?: number };
    p.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);

    p.transaction_amount_refunded = Math.round(p.transaction_amount * 0.99 * 100) / 100;
    expect((await pay.webhook({ request: await avisoAssinado(p.id), env })).status).toBe(200);
    expect(await hasEntitlement(env, id, 'alfabetizacao'), 'o estorno parcial passou batido').toBe(false);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('refunded');
    /* O que ficou guardado do evento diz quanto foi devolvido. */
    const ev = linha(env, "SELECT raw FROM payment_events WHERE status = 'refunded'") as { raw: string } | undefined;
    expect(ev?.raw).toContain('transaction_amount_refunded');
  });
});

/* 9. Um id que a Mercado Pago não conhece (o simulador do painel, um
   pagamento de outra conta) respondia 500, e 500 pede reenvio - para sempre.
   E cada tentativa gravava uma linha de erro na trilha. */
describe('9. um pagamento que a Mercado Pago não conhece não vira reenvio eterno', () => {
  it('404 do provedor responde 200 e não grava erro', async () => {
    const env = envPagamento();
    const w = await pay.webhook({ request: await avisoAssinado(424242), env });
    expect(w.status, 'um 404 do provedor virou 500').toBe(200);
    expect(linha(env, "SELECT 1 AS x FROM access_log WHERE action = 'settle-error'")).toBeUndefined();
  });

  it('uma falha nossa em série continua respondendo 500, mas a trilha tem teto', async () => {
    const env = envPagamento();
    /* A Mercado Pago de mentira responde 500 para qualquer id fora do
       padrão dela - uma falha de consulta, do nosso lado da conversa. */
    vi.stubGlobal('fetch', async () => new Response('{"message":"internal"}', { status: 500 }));
    /* O teto é por minuto: com o relógio de verdade, as 40 chamadas às vezes
       atravessavam a virada do minuto e o teto valia duas vezes. O relógio
       fica parado no meio de um minuto. */
    const agora = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 22, 12, 0, 30));
    try {
      for (let i = 0; i < 40; i++) {
        const w = await pay.webhook({ request: await avisoAssinado(800000 + i), env });
        expect(w.status).toBe(500);
      }
    } finally { agora.mockRestore(); }
    const n = Number(linha(env, "SELECT COUNT(*) AS n FROM access_log WHERE action = 'settle-error'")!.n);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(20);
  });
});

/* ── o recibo na caixa de entrada ────────────────────────────────────────
   Faltava inteiro: a pessoa pagava, o acesso abria na tela, e o e-mail dela
   ficava vazio. Sem recibo, sem link de volta, sem nada. */

describe('a confirmação de compra', () => {
  it('chega no endereço de quem pagou, com o que ela precisa saber', async () => {
    const env = envComEmail();
    const { cookie, id } = await compradora(env, 'ana@exemplo.com.br');
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p.id), env });

    expect(enviados.length, 'nenhum e-mail saiu').toBe(1);
    const m = enviados[0]!;
    expect(m.to).toBe('ana@exemplo.com.br');
    expect(m.subject).toContain('Alfabetização');

    /* O que a mensagem tem de carregar, item por item. */
    expect(m.text, 'sem link para voltar').toContain('https://hebraicofluente.com.br/meu-hebraico/');
    expect(m.text, 'sem o número do pedido').toContain(ordem.id);
    expect(m.text, 'sem o valor').toMatch(/R\$\s?\d/);
    expect(m.text, 'sem a data de vencimento').toMatch(/Acesso até: \d{2}\/\d{2}\/\d{4}/);
    expect(m.text, 'sem os sete dias do CDC').toContain('7 dias para desistir');
    /* O contrato que vale para a compra, num meio que a pessoa guarda
       (Decreto 7.962/2013, art. 4º, IV), e onde desistir pelo site (art. 5º). */
    expect(m.text, 'sem os Termos').toContain('https://hebraicofluente.com.br/termos/');
    expect(m.text, 'sem a Política de Reembolso').toContain('https://hebraicofluente.com.br/reembolso/');
    expect(m.text, 'sem a versão dos termos').toMatch(/na versão de \d{2}\/\d{2}\/\d{4}/);
    expect(m.text, 'sem onde desistir').toContain('Desistir da compra');
    /* A cópia FIXA da versão do pedido, e não a página de hoje (LEGAL-104). */
    const v = (env.DB as unknown as { bruto: import('node:sqlite').DatabaseSync }).bruto
      .prepare('SELECT termos_versao FROM orders WHERE id = ?').get(ordem.id) as { termos_versao: string };
    expect(v.termos_versao).toMatch(/^[0-9a-f]{10}$/);
    expect(m.html).toContain(`href="https://hebraicofluente.com.br/termos/v/${v.termos_versao}/"`);
    expect(m.text).toContain(`código ${v.termos_versao}`);
    expect(m.text).toMatch(/https:\/\/hebraicofluente\.com\.br\/reembolso\/v\/[0-9a-f]{10}\//);
    expect(m.text, 'sem o suporte').toContain('@');
    /* E diz que abriu, não que renovou. */
    expect(m.text).toContain('está liberado');

    void id;
  });

  it('sai UMA vez só, por mais avisos que cheguem', async () => {
    /* É o ponto em que isto poderia dar errado feio: três caminhos liquidam
       o mesmo pagamento - o retorno do navegador, o aviso da Mercado Pago e
       a varredura de dez em dez minutos. Um disparo no lugar errado manda o
       mesmo recibo três vezes. */
    const env = envComEmail();
    const { cookie } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';

    for (let i = 0; i < 3; i++) await pay.webhook({ request: await avisoAssinado(p.id), env });
    await verify(env, cookie, ordem.id);
    await runReconcile(env);

    expect(enviados.length, 'o recibo saiu mais de uma vez').toBe(1);
  });

  it('um provedor fora do ar não desfaz a compra', async () => {
    /* Falha aberta: quando esta função começa, o acesso já foi concedido e o
       pedido já está pago. Um e-mail que não sai não pode devolver erro a
       quem pagou nem deixar o pedido pendente. */
    const env = envComEmail();
    recusarEmail = true;
    const { cookie, id } = await compradora(env);
    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';

    const w = await pay.webhook({ request: await avisoAssinado(p.id), env });
    expect(w.status).toBe(200);
    expect(await hasEntitlement(env, id, 'alfabetizacao'), 'a compra foi desfeita').toBe(true);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${ordem.id}'`)!.status).toBe('paid');

    /* E a falha fica registrada, para que "não recebi o e-mail" tenha
       resposta em vez de palpite. */
    const rows = (env.DB as { bruto: { prepare(s: string): { all(): unknown[] } } }).bruto
      .prepare("SELECT action FROM access_log WHERE action LIKE 'compra-%'").all() as { action: string }[];
    expect(rows.map(r => r.action)).toContain('compra-email-falhou');
  });

  it('sem provedor configurado, nada quebra e nada é fingido', async () => {
    const env = envPagamento();          // sem RESEND_API_KEY
    const { cookie, id } = await compradora(env);
    await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p.id), env });

    expect(await hasEntitlement(env, id, 'alfabetizacao')).toBe(true);
    expect(enviados.length).toBe(0);
    /* Nem sucesso registrado: não se anota um envio que não houve. */
    const rows = (env.DB as { bruto: { prepare(s: string): { all(): unknown[] } } }).bruto
      .prepare("SELECT action FROM access_log WHERE action = 'compra-enviada'").all();
    expect(rows.length).toBe(0);
  });

  it('a trilha do recibo não guarda o endereço', async () => {
    const env = envComEmail();
    await (async () => {
      const { cookie } = await compradora(env, 'discreta@exemplo.com.br');
      await pedidoPix(env, cookie);
      const p = [...pagamentos.values()][0]!;
      p.status = 'approved';
      await pay.webhook({ request: await avisoAssinado(p.id), env });
    })();
    const rows = (env.DB as { bruto: { prepare(s: string): { all(): unknown[] } } }).bruto
      .prepare("SELECT detail FROM access_log WHERE action LIKE 'compra-%'").all() as { detail: string }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => !String(r.detail).includes('@'))).toBe(true);
  });
});

describe('a renovação não é tratada como primeira compra', () => {
  it('diz que o acesso foi renovado, e não que acabou de abrir', async () => {
    /* Mandar "seu acesso está liberado" a quem já estuda há meses é o tipo de
       detalhe que faz a mensagem inteira parecer automática - e ela é o único
       contato escrito que a plataforma tem com quem pagou. */
    const env = envComEmail();
    const { cookie, id } = await compradora(env, 'veterana@exemplo.com.br');

    /* Acesso vencendo em vinte dias: dentro da janela de renovação, que é o
       que o checkout aceita cobrar de novo. */
    await grantAccess(env, {
      accountId: id, courseSlug: 'alfabetizacao', orderId: 'pedido-antigo', months: 0
    });
    (env.DB as { bruto: { prepare(s: string): { run(...a: unknown[]): unknown } } }).bruto
      .prepare('UPDATE entitlements SET expires_at = ? WHERE account_id = ?')
      .run(Date.now() + 20 * 86_400_000, id);

    const ordem = await pedidoPix(env, cookie);
    const p = [...pagamentos.values()][0]!;
    p.status = 'approved';
    await pay.webhook({ request: await avisoAssinado(p.id), env });

    expect(enviados.length).toBe(1);
    const m = enviados[0]!;
    expect(m.subject, 'o assunto trata como compra nova').toContain('renovado');
    expect(m.text).toContain('foi renovado');
    expect(m.text).not.toContain('está liberado');
    void ordem;
  });
});

/* PAY-005: o link do cartão expira com fuso de Brasília escrito. */
describe('a expiração do link do cartão', () => {
  it('sai no formato da documentação da Mercado Pago', async () => {
    // @ts-expect-error - módulo JS do Worker, sem tipos
    const { comFusoBR } = await import('../../worker/src/lib/mercadopago.js');
    expect(comFusoBR(Date.UTC(2026, 8, 29, 0, 30))).toBe('2026-09-28T21:30:00.000-03:00');
  });
});

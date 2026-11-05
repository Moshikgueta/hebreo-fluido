/* O pagamento do site em inglês pelo Paddle (PLANO-INGLES.md, etapa 5).
 * ─────────────────────────────────────────────────────────────────────────
 * Contra os handlers reais e o esquema de produção, com um Paddle de mentira
 * que guarda transações e ajustes como o de verdade: a transação nasce
 * `ready`, vira `completed` quando o comprador paga, e um estorno é um
 * ajuste que nasce `pending_approval` e é aprovado depois.
 *
 * O que se prova: o preço sai do catálogo (US$ 47), o acesso só abre pela
 * consulta ao Paddle (aviso assinado, tela ou varredura), valor a menor não
 * libera, aviso repetido não concede duas vezes, a desistência pede o
 * estorno ao Paddle e o acesso fecha quando ele aprova, e o recibo sai em
 * inglês.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
/* Desde 05/11/2026 os sites de fora cobram pelo Stripe (`pagamento.exterior`
   em data/empresa.json). O Paddle continua no código, escolhido pelo mesmo
   campo: estes testes o forçam em "paddle". */
vi.mock('../../data/empresa.json', () => {
  const real = JSON.parse(readFileSync(new URL('../../data/empresa.json', import.meta.url), 'utf8'));
  return { default: { ...real, pagamento: { ...real.pagamento, exterior: 'paddle' } } };
});
import { cookieDe, envDeTeste, pedido, saudeDetalhada } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - idem
import { runReconcile } from '../../worker/src/reconcile.js';
// @ts-expect-error - idem
import { hasEntitlement } from '../../worker/src/lib/db.js';
// @ts-expect-error - idem
import { hmacHex } from '../../worker/src/lib/crypto.js';
// @ts-expect-error - idem
import { pagamentoDe, tokenDoCliente } from '../../worker/src/lib/paddle.js';

const SITE = 'https://fluent.example';
const SEGREDO = 'pdl_ntfset_segredo_de_teste';
const CHAVE = 'pdl_sdbx_apikey_0123456789abcdef';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };

/* ── o Paddle de mentira ───────────────────────────────────────────────── */
type Ajuste = { id: string; action: string; status: string; totals: { total: string } };
type Transacao = {
  id: string; status: string; currency_code: string;
  details: { totals: { grand_total: string } };
  custom_data: Record<string, string>; adjustments: Ajuste[];
};
let transacoes: Map<string, Transacao>;
let criadas: Record<string, unknown>[];
let pedidosDeEstorno: Record<string, unknown>[];
let enviados: { to: string; subject: string; text: string }[];
let seq = 0;

function paddleFalso() {
  transacoes = new Map(); criadas = []; pedidosDeEstorno = []; enviados = []; seq = 0;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === 'api.resend.test') {
      const b = JSON.parse(String(init?.body ?? '{}'));
      enviados.push({ to: String(b.to?.[0] ?? ''), subject: b.subject, text: b.text });
      return new Response('{"id":"m1"}', { status: 200 });
    }
    if (u.host !== 'sandbox-api.paddle.com') return new Response('{}', { status: 500 });
    if (u.pathname === '/transactions' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      criadas.push(body);
      const preco = body.items[0].price.unit_price;
      const t: Transacao = {
        id: `txn_01teste${String(++seq).padStart(10, '0')}`, status: 'ready', currency_code: preco.currency_code,
        details: { totals: { grand_total: preco.amount } }, custom_data: body.custom_data, adjustments: []
      };
      transacoes.set(t.id, t);
      return Response.json({ data: { ...t, adjustments: undefined } }, { status: 201 });
    }
    if (u.pathname === '/adjustments' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      pedidosDeEstorno.push(body);
      const t = transacoes.get(body.transaction_id);
      if (!t) return Response.json({ error: { code: 'not_found' } }, { status: 404 });
      const a: Ajuste = { id: `adj_${++seq}`, action: 'refund', status: 'pending_approval', totals: { total: t.details.totals.grand_total } };
      t.adjustments.push(a);
      return Response.json({ data: a }, { status: 201 });
    }
    const m = u.pathname.match(/^\/transactions\/(txn_[a-z0-9]+)$/);
    if (m) {
      const t = transacoes.get(m[1]!);
      return t ? Response.json({ data: t }) : Response.json({ error: { code: 'not_found' } }, { status: 404 });
    }
    return new Response('{}', { status: 500 });
  });
}

const envPaddle = (extra: Record<string, unknown> = {}) => envDeTeste({
  LOCALE: 'en', SITE_ORIGIN: SITE,
  PADDLE_API_KEY: CHAVE, PADDLE_CLIENT_TOKEN: 'test_0123456789abcdef', PADDLE_WEBHOOK_SECRET: SEGREDO,
  RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Fluent <c@fluent.example>', RESEND_BASE: 'https://api.resend.test',
  SUPPORT_EMAIL: 'dono@fluent.example',
  ...extra
});

async function compradora(env: Record<string, unknown>, email = 'buyer@example.com') {
  const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ann', email, password: 'good-password-123' }), env, ctx });
  const body = await r.json() as { account: { id: number } };
  return { cookie: cookieDe(r), id: body.account.id };
}

async function criar(env: Record<string, unknown>, cookie: string, extra: Record<string, unknown> = {}) {
  return pay.create({ request: pedido(`${SITE}/api/pay/create`, { courseSlug: 'alfabetizacao', method: 'paddle', ...extra }, { Cookie: cookie }), env, ctx });
}

/** Um aviso assinado como o Paddle assina: HMAC de `${ts}:${corpo}`. */
async function aviso(evento: string, data: Record<string, unknown>, segredo = SEGREDO) {
  const corpo = JSON.stringify({ event_id: `evt_${++seq}`, event_type: evento, occurred_at: new Date().toISOString(), data });
  const ts = Math.floor(Date.now() / 1000);
  const h1 = await hmacHex(segredo, `${ts}:${corpo}`);
  return new Request(`${SITE}/api/pay/paddle`, {
    method: 'POST', headers: { 'paddle-signature': `ts=${ts};h1=${h1}`, 'content-type': 'application/json' }, body: corpo
  });
}

const pagar = (txn: string) => { transacoes.get(txn)!.status = 'completed'; };
const linha = (env: Record<string, unknown>, sql: string) =>
  (env.DB as { bruto: { prepare(s: string): { get(): unknown } } }).bruto.prepare(sql).get() as Record<string, unknown> | undefined;

beforeEach(() => { paddleFalso(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('o pedido no Paddle', () => {
  it('sem a chave, ou com o token do Paddle.js de outro ambiente, o pagamento está desligado', async () => {
    const semChave = envPaddle({ PADDLE_API_KEY: '' });
    const a = await compradora(semChave);
    expect((await criar(semChave, a.cookie)).status).toBe(503);

    const trocado = envPaddle({ PADDLE_CLIENT_TOKEN: 'live_0123456789' });
    const b = await compradora(trocado, 'b@example.com');
    const r = await criar(trocado, b.cookie);
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ error: 'payments-off' });
  });

  it('o valor sai do catálogo (US$ 47), nunca do corpo, e a transação leva o número do pedido', async () => {
    const env = envPaddle();
    const a = await compradora(env);
    const r = await criar(env, a.cookie, { amountCents: 100, method: 'pix', installments: 12 });
    expect(r.status).toBe(200);
    const o = await r.json() as { id: string; amountCents: number; method: string; paddle: { transactionId: string; clientToken: string; sandbox: boolean } };
    expect(o).toMatchObject({ amountCents: 4700, method: 'paddle' });
    expect(o.paddle).toMatchObject({ clientToken: 'test_0123456789abcdef', sandbox: true });

    const preco = (criadas[0] as { items: { price: { unit_price: unknown; tax_mode: string } }[] }).items[0]!.price;
    expect(preco.unit_price).toEqual({ amount: '4700', currency_code: 'USD' });
    expect(preco.tax_mode).toBe('internal');
    expect((criadas[0] as { custom_data: { order_id: string } }).custom_data.order_id).toBe(o.id);

    const row = linha(env, `SELECT * FROM orders WHERE id = '${o.id}'`)!;
    expect(row).toMatchObject({ currency: 'USD', provider: 'paddle', provider_ref: o.paddle.transactionId, status: 'pending' });
  });
});

describe('a saúde do Worker em inglês responde pelo Paddle', () => {
  /* A conferência da publicação (worker/e2e.sh) lê `payments` e `modo` para
     decidir se cria um pedido de teste: lidos da Mercado Pago, o site em
     inglês pareceria sem pagamento com o Paddle ligado. */
  const saude = async (env: Record<string, unknown>) =>
    (await auth.health({ request: saudeDetalhada(), env })).json() as Promise<Record<string, unknown>>;

  it('chave de sandbox e token de teste: ligado, em teste, sem os campos da Mercado Pago', async () => {
    const s = await saude(envPaddle({ MP_ACCESS_TOKEN: 'APP_USR-1-2-3' }));
    expect(s).toMatchObject({ payments: true, webhook: true, modo: 'teste', cobranca: 'paddle', tokenFormato: null, vendedor: null });
  });

  it('sem a chave, ou com o token de outro ambiente, desligado', async () => {
    expect(await saude(envPaddle({ PADDLE_API_KEY: '' }))).toMatchObject({ payments: false, modo: 'desligado' });
    expect(await saude(envPaddle({ PADDLE_CLIENT_TOKEN: 'live_0123456789' }))).toMatchObject({ payments: false, modo: 'desligado' });
  });

  it('chave de produção com token live: producao', async () => {
    const s = await saude(envPaddle({ PADDLE_API_KEY: 'pdl_live_apikey_0123456789abcdef', PADDLE_CLIENT_TOKEN: 'live_0123456789' }));
    expect(s).toMatchObject({ payments: true, modo: 'producao' });
  });
});

describe('o acesso só abre pela consulta ao Paddle', () => {
  it('aviso com assinatura errada recebe 401 e não libera nada', async () => {
    const env = envPaddle();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as { paddle: { transactionId: string } };
    pagar(o.paddle.transactionId);
    const r = await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: o.paddle.transactionId }, 'outro-segredo'), env });
    expect(r.status).toBe(401);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
  });

  it('o aviso assinado libera uma vez, com o recibo em inglês, e o repetido não faz nada', async () => {
    const env = envPaddle();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as { id: string; paddle: { transactionId: string } };

    /* O aviso de que a transação foi criada chega antes do pagamento: nada muda. */
    expect((await pay.webhookPaddle({ request: await aviso('transaction.ready', { id: o.paddle.transactionId }), env })).status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);

    pagar(o.paddle.transactionId);
    expect((await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: o.paddle.transactionId }), env })).status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${o.id}'`)).toEqual({ status: 'paid' });

    const recibos = enviados.filter(e => e.to === 'buyer@example.com' && /access is open/.test(e.subject));
    expect(recibos).toHaveLength(1);
    expect(recibos[0]!.text).toContain('Amount: $47.00');
    expect(recibos[0]!.text).toContain('14 days');
    expect(recibos[0]!.text).toContain('Paddle');

    await pay.webhookPaddle({ request: await aviso('transaction.paid', { id: o.paddle.transactionId }), env });
    await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: o.paddle.transactionId }), env });
    expect(enviados.filter(e => /access is open/.test(e.subject))).toHaveLength(1);
  });

  it('a tela de volta (verify) libera sem o aviso, e a varredura também', async () => {
    const env = envPaddle();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as { id: string; paddle: { transactionId: string } };
    pagar(o.paddle.transactionId);
    const r = await pay.verify({ request: new Request(`${SITE}/api/pay/verify?order=${o.id}`, { headers: { Cookie: a.cookie } }), env });
    expect(await r.json()).toMatchObject({ status: 'paid' });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);

    const b = await compradora(env, 'b@example.com');
    const ob = await (await criar(env, b.cookie)).json() as { id: string; paddle: { transactionId: string } };
    pagar(ob.paddle.transactionId);
    vi.useFakeTimers({ now: Date.now() + 2 * 60_000, toFake: ['Date'] });
    await runReconcile(env);
    expect(await hasEntitlement(env, b.id, 'alfabetizacao')).toBe(true);
  });

  it('valor a menor ou moeda diferente não libera', async () => {
    const env = envPaddle();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as { id: string; paddle: { transactionId: string } };
    const t = transacoes.get(o.paddle.transactionId)!;
    t.status = 'completed';
    t.details.totals.grand_total = '100';
    await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: t.id }), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);

    t.details.totals.grand_total = '4700';
    t.currency_code = 'EUR';
    await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: t.id }), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
  });

  it('aviso de uma transação que não é nossa responde 200 e não faz nada', async () => {
    const env = envPaddle();
    const r = await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: 'txn_01naoexiste0000000000' }), env });
    expect(r.status).toBe(200);
  });
});

describe('a desistência no Paddle', () => {
  it('no 10º dia ainda vale (14 dias), pede o estorno ao Paddle e o acesso fecha quando ele aprova', async () => {
    const env = envPaddle();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as { id: string; paddle: { transactionId: string } };
    pagar(o.paddle.transactionId);
    await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: o.paddle.transactionId }), env });

    vi.useFakeTimers({ now: Date.now() + 10 * 86_400_000, toFake: ['Date'] });
    /* Dez dias depois a sessão da compra já venceu: entra de novo. */
    const login = await auth.login({ request: pedido(`${SITE}/api/auth/login`, { email: 'buyer@example.com', password: 'good-password-123' }), env, ctx });
    const r = await pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order: o.id }, { Cookie: cookieDe(login) }), env, ctx });
    expect(r.status).toBe(200);
    expect(pedidosDeEstorno).toEqual([expect.objectContaining({ action: 'refund', type: 'full', transaction_id: o.paddle.transactionId })]);
    /* O ajuste ainda espera a aprovação: o acesso continua. */
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
    expect(enviados.some(e => e.to === 'buyer@example.com' && /Cancellation received/.test(e.subject))).toBe(true);

    transacoes.get(o.paddle.transactionId)!.adjustments[0]!.status = 'approved';
    await pay.webhookPaddle({ request: await aviso('adjustment.updated', { id: 'adj_x', action: 'refund', transaction_id: o.paddle.transactionId }), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${o.id}'`)).toEqual({ status: 'refunded' });
  });

  it('o prazo no pedido é de 14 dias', async () => {
    const env = envPaddle();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as { id: string; paddle: { transactionId: string } };
    pagar(o.paddle.transactionId);
    await pay.webhookPaddle({ request: await aviso('transaction.completed', { id: o.paddle.transactionId }), env });
    const lista = await (await pay.orders({ request: new Request(`${SITE}/api/orders`, { headers: { Cookie: a.cookie } }), env })).json() as { orders: { desistirAte: string }[] };
    const dias = (Date.parse(lista.orders[0]!.desistirAte) - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(13.5);
    expect(dias).toBeLessThan(15.1);
  });
});

describe('a tradução de uma transação do Paddle', () => {
  const base = { id: 'txn_01x', currency_code: 'USD', custom_data: { order_id: 'HF1' }, details: { totals: { grand_total: '4700' } } };
  it('status fechado: só completed e paid são pagos', () => {
    expect(pagamentoDe({ ...base, status: 'completed' }).status).toBe('approved');
    expect(pagamentoDe({ ...base, status: 'paid' }).status).toBe('approved');
    expect(pagamentoDe({ ...base, status: 'billed' }).status).toBe('pending');
    expect(pagamentoDe({ ...base, status: 'inventado' }).status).toBe('pending');
    expect(pagamentoDe({ ...base, status: 'canceled' }).status).toBe('cancelled');
  });
  it('estorno parcial aprovado vai para o valor devolvido; total vira refunded; contestação vira charged_back', () => {
    const parcial = pagamentoDe({ ...base, status: 'completed', adjustments: [{ action: 'refund', status: 'approved', totals: { total: '1000' } }] });
    expect(parcial).toMatchObject({ status: 'approved', transaction_amount: 47, transaction_amount_refunded: 10, external_reference: 'HF1' });
    expect(pagamentoDe({ ...base, status: 'completed', adjustments: [{ action: 'refund', status: 'pending_approval', totals: { total: '4700' } }] }).status).toBe('approved');
    expect(pagamentoDe({ ...base, status: 'completed', adjustments: [{ action: 'refund', status: 'approved', totals: { total: '4700' } }] }).status).toBe('refunded');
    expect(pagamentoDe({ ...base, status: 'completed', adjustments: [{ action: 'chargeback', status: 'approved', totals: { total: '4700' } }] }).status).toBe('charged_back');
  });
  it('o token do Paddle.js tem de ser do mesmo ambiente da chave', () => {
    expect(tokenDoCliente({ PADDLE_API_KEY: 'pdl_sdbx_apikey_x', PADDLE_CLIENT_TOKEN: 'test_abc' })).toBe('test_abc');
    expect(tokenDoCliente({ PADDLE_API_KEY: 'pdl_live_apikey_x', PADDLE_CLIENT_TOKEN: 'test_abc' })).toBeNull();
    expect(tokenDoCliente({ PADDLE_API_KEY: 'pdl_live_apikey_x', PADDLE_CLIENT_TOKEN: 'live_abc' })).toBe('live_abc');
  });
});

describe('a CSP libera o Paddle só no checkout', () => {
  const ASSETS = {
    fetch: async (_r: Request) => new Response('<html><body>x</body></html>', {
      status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  };
  it('em /checkout/ o Paddle.js e o iframe de pagamento passam; na capa, não', async () => {
    const { default: worker } = await import('../../worker/src/worker.js' as string) as { default: { fetch: (r: Request, e: unknown, c: unknown) => Promise<Response> } };
    const env = envPaddle({ ASSETS });
    const compra = await worker.fetch(new Request(`${SITE}/checkout/alfabetizacao/`), env, ctx);
    const csp = compra.headers.get('Content-Security-Policy') || '';
    expect(csp).toContain('https://cdn.paddle.com');
    expect(csp).toMatch(/frame-src https:\/\/buy\.paddle\.com https:\/\/sandbox-buy\.paddle\.com/);
    expect(compra.headers.get('Permissions-Policy')).toContain('payment=(self "https://buy.paddle.com"');

    const capa = await worker.fetch(new Request(`${SITE}/`), env, ctx);
    expect(capa.headers.get('Content-Security-Policy') || '').not.toContain('paddle');
    expect(capa.headers.get('Permissions-Policy')).toContain('payment=()');
  });
});

/* O pagamento dos sites de fora pelo Stripe (05/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Contra os handlers reais e o esquema de produção, com um Stripe de mentira
 * que guarda sessões do Checkout como o de verdade: a sessão nasce `open` e
 * `unpaid`, vira `paid` quando o comprador paga, e o estorno muda o
 * `amount_refunded` da cobrança.
 *
 * O que se prova: o preço sai do catálogo (US$ 47), a tela é mandada para
 * checkout.stripe.com, o acesso só abre pela consulta ao Stripe (aviso
 * assinado, tela de volta ou varredura), valor a menor não libera, aviso
 * repetido não concede duas vezes, a desistência pede o estorno ao Stripe e
 * o acesso fecha quando ele devolve, e a saúde responde pelo Stripe.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { formulario, pagamentoDe } from '../../worker/src/lib/stripe.js';
import empresa from '../../data/empresa.json';

const SITE = 'https://fluent.example';
const SEGREDO = 'whsec_segredo_de_teste';
const CHAVE = 'sk_test_0123456789abcdef';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };

/* ── o Stripe de mentira ───────────────────────────────────────────────── */
type Cobranca = { id: string; amount_refunded: number; disputed: boolean; dispute: { status: string } | null };
type Sessao = {
  id: string; url: string; status: string; payment_status: string; amount_total: number; currency: string;
  client_reference_id: string; metadata: Record<string, string>; payment_intent: string | null;
};
let sessoes: Map<string, Sessao>;
let pagamentos: Map<string, { id: string; metadata: Record<string, string>; cobranca: Cobranca }>;
let criadas: { corpo: URLSearchParams; idempotencia: string | null }[];
let estornos: URLSearchParams[];
let enviados: { to: string; subject: string; text: string }[];
let seq = 0;

function stripeFalso() {
  sessoes = new Map(); pagamentos = new Map(); criadas = []; estornos = []; enviados = []; seq = 0;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === 'api.resend.test') {
      const b = JSON.parse(String(init?.body ?? '{}'));
      enviados.push({ to: String(b.to?.[0] ?? ''), subject: b.subject, text: b.text });
      return new Response('{"id":"m1"}', { status: 200 });
    }
    if (u.host !== 'api.stripe.com') return new Response('{}', { status: 500 });
    const cabecalhos = new Headers(init?.headers);
    if (cabecalhos.get('authorization') !== `Bearer ${CHAVE}`) {
      return Response.json({ error: { type: 'invalid_request_error', message: 'Invalid API Key' } }, { status: 401 });
    }
    if (u.pathname === '/v1/checkout/sessions' && init?.method === 'POST') {
      const corpo = new URLSearchParams(String(init.body));
      criadas.push({ corpo, idempotencia: cabecalhos.get('idempotency-key') });
      const id = `cs_test_a1${String(++seq).padStart(12, '0')}`;
      const s: Sessao = {
        id, url: `https://checkout.stripe.com/c/pay/${id}`, status: 'open', payment_status: 'unpaid',
        amount_total: Number(corpo.get('line_items[0][price_data][unit_amount]')),
        currency: String(corpo.get('line_items[0][price_data][currency]')),
        client_reference_id: String(corpo.get('client_reference_id')),
        metadata: { order_id: String(corpo.get('metadata[order_id]')) }, payment_intent: null
      };
      sessoes.set(id, s);
      return Response.json(s);
    }
    const sm = u.pathname.match(/^\/v1\/checkout\/sessions\/(cs_test_[A-Za-z0-9]+)$/);
    if (sm) {
      const s = sessoes.get(sm[1]!);
      if (!s) return Response.json({ error: { code: 'resource_missing' } }, { status: 404 });
      const p = s.payment_intent ? pagamentos.get(s.payment_intent) : null;
      return Response.json({
        ...s,
        payment_intent: p ? { id: p.id, metadata: p.metadata, latest_charge: p.cobranca } : null
      });
    }
    const pm = u.pathname.match(/^\/v1\/payment_intents\/(pi_[A-Za-z0-9]+)$/);
    if (pm) {
      const p = pagamentos.get(pm[1]!);
      return p ? Response.json({ id: p.id, metadata: p.metadata }) : Response.json({ error: { code: 'resource_missing' } }, { status: 404 });
    }
    if (u.pathname === '/v1/refunds' && init?.method === 'POST') {
      const corpo = new URLSearchParams(String(init.body));
      estornos.push(corpo);
      return Response.json({ id: `re_${++seq}`, status: 'pending' });
    }
    return new Response('{}', { status: 500 });
  });
}

/** O comprador paga: a sessão vira `paid` e ganha um pagamento com cobrança. */
function pagar(sessaoId: string) {
  const s = sessoes.get(sessaoId)!;
  const pi = `pi_teste${String(++seq).padStart(12, '0')}`;
  pagamentos.set(pi, { id: pi, metadata: { order_id: s.client_reference_id }, cobranca: { id: `ch_${seq}`, amount_refunded: 0, disputed: false, dispute: null } });
  s.status = 'complete'; s.payment_status = 'paid'; s.payment_intent = pi;
  return pi;
}

const envStripe = (extra: Record<string, unknown> = {}) => envDeTeste({
  LOCALE: 'en', SITE_ORIGIN: SITE,
  STRIPE_SECRET_KEY: CHAVE, STRIPE_WEBHOOK_SECRET: SEGREDO,
  RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebrew Unlocked <c@fluent.example>', RESEND_BASE: 'https://api.resend.test',
  SUPPORT_EMAIL: 'dono@fluent.example',
  ...extra
});

async function compradora(env: Record<string, unknown>, email = 'buyer@example.com') {
  const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ann', email, password: 'good-password-123' }), env, ctx });
  const body = await r.json() as { account: { id: number } };
  return { cookie: cookieDe(r), id: body.account.id };
}

type Criado = { id: string; amountCents: number; method: string; redirectUrl: string };
async function criar(env: Record<string, unknown>, cookie: string, extra: Record<string, unknown> = {}) {
  return pay.create({ request: pedido(`${SITE}/api/pay/create`, { courseSlug: 'alfabetizacao', method: 'stripe', ...extra }, { Cookie: cookie }), env, ctx });
}
const sessaoDe = (o: Criado) => o.redirectUrl.split('/').pop()!;

/** Um aviso assinado como o Stripe assina: HMAC de `${t}.${corpo}`. */
async function aviso(tipo: string, objeto: Record<string, unknown>, segredo = SEGREDO) {
  const corpo = JSON.stringify({ id: `evt_${++seq}`, type: tipo, data: { object: objeto } });
  const t = Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(segredo, `${t}.${corpo}`);
  return new Request(`${SITE}/api/pay/stripe`, {
    method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${v1}`, 'content-type': 'application/json' }, body: corpo
  });
}

const linha = (env: Record<string, unknown>, sql: string) =>
  (env.DB as { bruto: { prepare(s: string): { get(): unknown } } }).bruto.prepare(sql).get() as Record<string, unknown> | undefined;

beforeEach(() => { stripeFalso(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('a escolha do provedor dos sites de fora', () => {
  it('data/empresa.json pede o Stripe', () => {
    expect((empresa.pagamento as { exterior?: string }).exterior).toBe('stripe');
  });
});

describe('o pedido no Stripe', () => {
  it('sem a chave, ou com a chave publicável no lugar da secreta, o pagamento está desligado', async () => {
    for (const chave of ['', 'pk_live_0123456789']) {
      const env = envStripe({ STRIPE_SECRET_KEY: chave });
      const a = await compradora(env, `x${chave.length}@example.com`);
      const r = await criar(env, a.cookie);
      expect(r.status).toBe(503);
      expect(await r.json()).toMatchObject({ error: 'payments-off' });
    }
  });

  it('o valor sai do catálogo (US$ 47), nunca do corpo, e a tela vai para checkout.stripe.com', async () => {
    const env = envStripe();
    const a = await compradora(env);
    const r = await criar(env, a.cookie, { amountCents: 100, method: 'pix', installments: 12 });
    expect(r.status).toBe(200);
    const o = await r.json() as Criado;
    expect(o).toMatchObject({ amountCents: 4700, method: 'stripe' });
    expect(o.redirectUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    const { corpo, idempotencia } = criadas[0]!;
    expect(corpo.get('mode')).toBe('payment');
    expect(corpo.get('line_items[0][price_data][unit_amount]')).toBe('4700');
    expect(corpo.get('line_items[0][price_data][currency]')).toBe('usd');
    expect(corpo.get('client_reference_id')).toBe(o.id);
    expect(corpo.get('payment_intent_data[metadata][order_id]')).toBe(o.id);
    expect(corpo.get('customer_email')).toBe('buyer@example.com');
    expect(corpo.get('success_url')).toBe(`${SITE}/checkout/alfabetizacao/obrigado/?order=${o.id}`);
    expect(corpo.get('locale')).toBe('en');
    /* Sem o Stripe Tax ligado à mão, nada de imposto automático. */
    expect(corpo.get('automatic_tax[enabled]')).toBeNull();
    expect(idempotencia).toBe(`pedido-${o.id}`);

    const row = linha(env, `SELECT * FROM orders WHERE id = '${o.id}'`)!;
    expect(row).toMatchObject({ currency: 'USD', provider: 'stripe', provider_ref: sessaoDe(o), status: 'pending' });
  });

  it('no site em espanhol a página do Stripe abre em espanhol', async () => {
    const env = envStripe({ LOCALE: 'es' });
    const a = await compradora(env);
    expect((await criar(env, a.cookie)).status).toBe(200);
    expect(criadas[0]!.corpo.get('locale')).toBe('es');
  });

  it('STRIPE_IMPOSTO = "1" liga o imposto automático', async () => {
    const env = envStripe({ STRIPE_IMPOSTO: '1' });
    const a = await compradora(env);
    await criar(env, a.cookie);
    expect(criadas[0]!.corpo.get('automatic_tax[enabled]')).toBe('true');
    expect(criadas[0]!.corpo.get('line_items[0][price_data][tax_behavior]')).toBe('inclusive');
  });
});

describe('a saúde do Worker de fora responde pelo Stripe', () => {
  const saude = async (env: Record<string, unknown>) =>
    (await auth.health({ request: saudeDetalhada(), env })).json() as Promise<Record<string, unknown>>;

  it('chave de teste: ligado, em teste, cobrança stripe', async () => {
    expect(await saude(envStripe())).toMatchObject({ payments: true, webhook: true, modo: 'teste', cobranca: 'stripe' });
  });
  it('chave de produção: producao; sem chave: desligado; sem o segredo do aviso: webhook false', async () => {
    expect(await saude(envStripe({ STRIPE_SECRET_KEY: 'sk_live_0123456789' }))).toMatchObject({ payments: true, modo: 'producao' });
    expect(await saude(envStripe({ STRIPE_SECRET_KEY: '' }))).toMatchObject({ payments: false, modo: 'desligado' });
    expect(await saude(envStripe({ STRIPE_WEBHOOK_SECRET: '' }))).toMatchObject({ webhook: false });
  });
});

describe('o acesso só abre pela consulta ao Stripe', () => {
  it('aviso com assinatura errada, ou sem o segredo no Worker, recebe 401 e não libera nada', async () => {
    const env = envStripe();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as Criado;
    pagar(sessaoDe(o));
    const obj = { id: sessaoDe(o), client_reference_id: o.id };
    expect((await pay.webhookStripe({ request: await aviso('checkout.session.completed', obj, 'whsec_outro'), env })).status).toBe(401);
    expect((await pay.webhookStripe({ request: await aviso('checkout.session.completed', obj), env: envStripe({ STRIPE_WEBHOOK_SECRET: '' }) })).status).toBe(401);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
  });

  it('o aviso assinado libera uma vez, com o recibo em inglês, e o repetido não faz nada', async () => {
    const env = envStripe();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as Criado;
    const obj = { id: sessaoDe(o), client_reference_id: o.id };

    /* Um aviso forjado com "paid" no corpo não libera: vale a consulta. */
    expect((await pay.webhookStripe({ request: await aviso('checkout.session.completed', { ...obj, payment_status: 'paid' }), env })).status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);

    pagar(sessaoDe(o));
    expect((await pay.webhookStripe({ request: await aviso('checkout.session.completed', obj), env })).status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${o.id}'`)).toEqual({ status: 'paid' });

    const recibos = enviados.filter(e => e.to === 'buyer@example.com' && /access is open/.test(e.subject));
    expect(recibos).toHaveLength(1);
    expect(recibos[0]!.text).toContain('Amount: $47.00');
    expect(recibos[0]!.text).toContain('7 days');
    expect(recibos[0]!.text).toContain('Stripe');
    expect(recibos[0]!.text).not.toContain('Paddle');

    await pay.webhookStripe({ request: await aviso('checkout.session.completed', obj), env });
    expect(enviados.filter(e => /access is open/.test(e.subject))).toHaveLength(1);
  });

  it('a tela de volta (verify) libera sem o aviso, e a varredura também', async () => {
    const env = envStripe();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as Criado;
    pagar(sessaoDe(o));
    const r = await pay.verify({ request: new Request(`${SITE}/api/pay/verify?order=${o.id}`, { headers: { Cookie: a.cookie } }), env });
    expect(await r.json()).toMatchObject({ status: 'paid' });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);

    const b = await compradora(env, 'b@example.com');
    const ob = await (await criar(env, b.cookie)).json() as Criado;
    pagar(sessaoDe(ob));
    vi.useFakeTimers({ now: Date.now() + 2 * 60_000, toFake: ['Date'] });
    await runReconcile(env);
    expect(await hasEntitlement(env, b.id, 'alfabetizacao')).toBe(true);
  });

  it('valor a menor ou moeda diferente não libera', async () => {
    const env = envStripe();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as Criado;
    const s = sessoes.get(sessaoDe(o))!;
    pagar(s.id);
    s.amount_total = 100;
    const obj = { id: s.id, client_reference_id: o.id };
    await pay.webhookStripe({ request: await aviso('checkout.session.completed', obj), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);

    s.amount_total = 4700;
    s.currency = 'eur';
    await pay.webhookStripe({ request: await aviso('checkout.session.completed', obj), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
  });

  it('aviso de uma sessão que não é nossa responde 200 e não faz nada', async () => {
    const env = envStripe();
    const r = await pay.webhookStripe({ request: await aviso('checkout.session.completed', { id: 'cs_test_naoexiste000000', client_reference_id: 'HFNAOEXISTE' }), env });
    expect(r.status).toBe(200);
  });
});

describe('a desistência no Stripe', () => {
  it('no 5º dia ainda vale (7 dias), pede o estorno ao Stripe e o acesso fecha quando ele devolve', async () => {
    const env = envStripe();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as Criado;
    const pi = pagar(sessaoDe(o));
    await pay.webhookStripe({ request: await aviso('checkout.session.completed', { id: sessaoDe(o), client_reference_id: o.id }), env });
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);

    vi.useFakeTimers({ now: Date.now() + 5 * 86_400_000, toFake: ['Date'] });
    const login = await auth.login({ request: pedido(`${SITE}/api/auth/login`, { email: 'buyer@example.com', password: 'good-password-123' }), env, ctx });
    const r = await pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order: o.id }, { Cookie: cookieDe(login) }), env, ctx });
    expect(r.status).toBe(200);
    expect(estornos).toHaveLength(1);
    expect(estornos[0]!.get('payment_intent')).toBe(pi);
    /* O estorno ainda não saiu: o acesso continua. */
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);

    /* O Stripe devolve e avisa com `charge.refunded`, que só traz o pagamento. */
    pagamentos.get(pi)!.cobranca.amount_refunded = 4700;
    const rr = await pay.webhookStripe({ request: await aviso('charge.refunded', { id: 'ch_x', payment_intent: pi, metadata: {} }), env });
    expect(rr.status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    expect(linha(env, `SELECT status FROM orders WHERE id = '${o.id}'`)).toEqual({ status: 'refunded' });
  });

  it('o prazo no pedido é de 7 dias (decisão do dono), e no 9º dia não vale mais', async () => {
    const env = envStripe();
    const a = await compradora(env);
    const o = await (await criar(env, a.cookie)).json() as Criado;
    pagar(sessaoDe(o));
    await pay.webhookStripe({ request: await aviso('checkout.session.completed', { id: sessaoDe(o), client_reference_id: o.id }), env });
    const lista = await (await pay.orders({ request: new Request(`${SITE}/api/orders`, { headers: { Cookie: a.cookie } }), env })).json() as { orders: { id: string; desistirAte: string }[] };
    const dias = (Date.parse(lista.orders[0]!.desistirAte) - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(6.5);
    expect(dias).toBeLessThan(8.1);

    vi.useFakeTimers({ now: Date.now() + 9 * 86_400_000, toFake: ['Date'] });
    const login = await auth.login({ request: pedido(`${SITE}/api/auth/login`, { email: 'buyer@example.com', password: 'good-password-123' }), env, ctx });
    const r = await pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order: lista.orders[0]!.id }, { Cookie: cookieDe(login) }), env, ctx });
    expect(r.status).not.toBe(200);
    expect(estornos).toHaveLength(0);
  });
});

describe('a tradução de uma sessão do Stripe', () => {
  const base = { id: 'cs_test_x', amount_total: 4700, currency: 'usd', client_reference_id: 'HF1', status: 'complete' };
  const comCobranca = (c: Record<string, unknown>) => ({ ...base, payment_status: 'paid', payment_intent: { id: 'pi_x', latest_charge: c } });
  it('status fechado: só payment_status paid é pago', () => {
    expect(pagamentoDe({ ...base, payment_status: 'paid' })).toMatchObject({ status: 'approved', transaction_amount: 47, currency_id: 'USD', external_reference: 'HF1' });
    expect(pagamentoDe({ ...base, payment_status: 'unpaid', status: 'open' }).status).toBe('pending');
    expect(pagamentoDe({ ...base, payment_status: 'inventado' }).status).toBe('pending');
    expect(pagamentoDe({ ...base, payment_status: 'unpaid', status: 'expired' }).status).toBe('cancelled');
  });
  it('estorno parcial vai para o valor devolvido; total vira refunded; contestação perdida vira charged_back', () => {
    expect(pagamentoDe(comCobranca({ amount_refunded: 1000, disputed: false }))).toMatchObject({ status: 'approved', transaction_amount_refunded: 10 });
    expect(pagamentoDe(comCobranca({ amount_refunded: 4700, disputed: false })).status).toBe('refunded');
    expect(pagamentoDe(comCobranca({ amount_refunded: 0, disputed: true, dispute: { status: 'needs_response' } })).status).toBe('approved');
    expect(pagamentoDe(comCobranca({ amount_refunded: 0, disputed: true, dispute: { status: 'lost' } })).status).toBe('charged_back');
  });
  it('os parâmetros aninhados saem no formato da API', () => {
    const f = formulario({ a: 1, b: { c: 'x', d: [{ e: 2 }] }, z: undefined });
    expect(f.toString()).toBe('a=1&b%5Bc%5D=x&b%5Bd%5D%5B0%5D%5Be%5D=2');
  });
});

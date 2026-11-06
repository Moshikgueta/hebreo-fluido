/* De onde veio a visita (23/10/2026, plano de marketing, semana 1).
 * O que estes testes travam:
 *  - a regra da fonte (link de campanha, UTM, site que mandou a pessoa);
 *  - o primeiro toque com marca, guardado no aparelho por 30 dias;
 *  - a lista de fontes é a mesma no app e no servidor, e é FECHADA: nada
 *    fora dela vira chave de contador nem coluna do pedido;
 *  - a origem chega ao pedido e ao painel do dono, sem dado pessoal.
 * Ver app/src/lib/origem.ts, worker/src/lib/origem.js e marketing/04-painel.md.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { campanhaDe, fonteDe, FONTES, origemAtual, registrarOrigem } from '@/lib/origem';
import { crescimentoPorFonte } from '@/lib/painel-estatisticas';
import { comoAdmin, cookieDe, envDeTeste, pedido, DADOS_FISCAIS } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - idem
import { FONTES as FONTES_DO_SERVIDOR, origemDoCorpo } from '../../worker/src/lib/origem.js';
// @ts-expect-error - idem
import { createOrder, recordEvent } from '../../worker/src/lib/db.js';

const SITE = 'https://hebraicofluente.com.br';
const HOST = 'hebraicofluente.com.br';
const TOKEN = 'APP_USR-1234567890123456-092019-abcdef0123456789abcdef0123456789-123456789';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };
type Env = ReturnType<typeof envDeTeste> & { DB: { bruto: import('node:sqlite').DatabaseSync } };
const q = (s: string) => new URLSearchParams(s);

describe('a fonte da visita', () => {
  it('o link de campanha vence tudo', () => {
    expect(fonteDe(q('parceria=bio&utm_source=google'), '', HOST)).toBe('bio');
    expect(fonteDe(q('parceria=sefarad'), 'https://www.google.com/', HOST)).toBe('sefarad');
    expect(fonteDe(q('parceria=STORIES'), '', HOST)).toBe('stories');
  });

  it('nome que não é link de campanha não vale, nem os do protótipo do objeto', () => {
    expect(fonteDe(q('parceria=constructor'), '', HOST)).toBe('direto');
    expect(fonteDe(q('parceria=toString'), '', HOST)).toBe('direto');
    expect(fonteDe(q('parceria=outra'), '', HOST)).toBe('direto');
  });

  it('a UTM decide a fonte', () => {
    expect(fonteDe(q('utm_source=instagram&utm_medium=cpc'), '', HOST)).toBe('anuncio');
    expect(fonteDe(q('utm_source=meta&utm_medium=paid-social'), '', HOST)).toBe('anuncio');
    expect(fonteDe(q('utm_content=previa-ebook&utm_source=manychat'), '', HOST)).toBe('previa');
    expect(fonteDe(q('utm_source=newsletter'), '', HOST)).toBe('email');
    expect(fonteDe(q('utm_source=resend&utm_medium=email'), '', HOST)).toBe('email');
    expect(fonteDe(q('utm_source=parceiro&utm_campaign=caravana-x'), '', HOST)).toBe('parceiro');
    expect(fonteDe(q('utm_source=igreja&utm_medium=parceria'), '', HOST)).toBe('parceiro');
    expect(fonteDe(q('utm_source=ig'), '', HOST)).toBe('instagram');
    expect(fonteDe(q('utm_source=qualquer-coisa'), '', HOST)).toBe('outro');
  });

  it('sem marca, o site que mandou a pessoa', () => {
    expect(fonteDe(q(''), 'https://www.google.com.br/', HOST)).toBe('busca');
    expect(fonteDe(q(''), 'https://duckduckgo.com/', HOST)).toBe('busca');
    expect(fonteDe(q(''), 'https://www.bing.com/search?q=hebraico', HOST)).toBe('busca');
    expect(fonteDe(q(''), 'https://gemini.google.com/app', HOST)).toBe('ia');
    expect(fonteDe(q(''), 'https://chatgpt.com/', HOST)).toBe('ia');
    expect(fonteDe(q(''), 'https://l.instagram.com/', HOST)).toBe('instagram');
    expect(fonteDe(q(''), 'https://exemplo.com.br/blog', HOST)).toBe('outro');
    expect(fonteDe(q(''), `${SITE}/sobre/`, HOST)).toBe('direto');
    expect(fonteDe(q(''), '', HOST)).toBe('direto');
    expect(fonteDe(q(''), 'nao-e-url', HOST)).toBe('direto');
  });

  it('a campanha é curta e só com letras, números, ponto, hífen e sublinhado', () => {
    expect(campanhaDe('Reels Alef')).toBe('reels-alef');
    expect(campanhaDe('chanuca_2026.v2')).toBe('chanuca_2026.v2');
    expect(campanhaDe('<script>')).toBeNull();
    expect(campanhaDe('a'.repeat(41))).toBeNull();
    expect(campanhaDe(null)).toBeNull();
  });
});

describe('o primeiro toque com marca, guardado no aparelho', () => {
  let guardado: Record<string, string>;
  const visitar = (url: string, referrer = '') => {
    vi.stubGlobal('window', { location: { href: url } });
    vi.stubGlobal('document', { referrer });
  };
  beforeEach(() => {
    guardado = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => guardado[k] ?? null,
      setItem: (k: string, v: string) => { guardado[k] = v; }
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('a primeira marca vale, e uma visita depois não a troca', () => {
    visitar(`${SITE}/curso-de-hebraico/?parceria=stories&utm_campaign=alef-1`);
    registrarOrigem(1000);
    visitar(`${SITE}/`, 'https://www.google.com/');
    registrarOrigem(2000);
    expect(origemAtual(3000)).toEqual({ fonte: 'stories', campanha: 'alef-1' });
  });

  it('"direto" é trocado pela primeira visita com marca', () => {
    visitar(`${SITE}/`);
    registrarOrigem(1000);
    expect(origemAtual(1000)?.fonte).toBe('direto');
    visitar(`${SITE}/`, 'https://www.google.com/');
    registrarOrigem(2000);
    expect(origemAtual(2000)?.fonte).toBe('busca');
  });

  it('depois de 30 dias, a origem vence e a visita nova manda', () => {
    visitar(`${SITE}/?utm_source=newsletter`);
    registrarOrigem(0);
    const dias31 = 31 * 24 * 3_600_000;
    expect(origemAtual(dias31)).toBeNull();
    visitar(`${SITE}/?parceria=bio`);
    registrarOrigem(dias31);
    expect(origemAtual(dias31)?.fonte).toBe('bio');
  });

  it('guarda só a fonte, a campanha e a data', () => {
    visitar(`${SITE}/?utm_source=newsletter&utm_campaign=boas-vindas&email=ana@exemplo.com`);
    registrarOrigem(5);
    expect(JSON.parse(guardado['hf-origem-v1']!)).toEqual({ fonte: 'email', campanha: 'boas-vindas', em: 5 });
  });

  it('fonte forjada no aparelho não é lida', () => {
    guardado['hf-origem-v1'] = JSON.stringify({ fonte: 'qualquer', campanha: 'x', em: 1 });
    expect(origemAtual(2)).toBeNull();
  });
});

describe('a lista de fontes é fechada e a mesma dos dois lados', () => {
  it('app e servidor', () => {
    expect([...FONTES]).toEqual(FONTES_DO_SERVIDOR);
    expect(FONTES_DO_SERVIDOR.every((f: string) => /^[a-z]+$/.test(f))).toBe(true);
  });
  it('o servidor descarta o que não está na lista', () => {
    expect(origemDoCorpo({ fonte: 'bio', campanha: 'alef-1' })).toEqual({ fonte: 'bio', campanha: 'alef-1' });
    expect(origemDoCorpo({ fonte: 'hackers', campanha: 'x' })).toEqual({ fonte: null, campanha: null });
    expect(origemDoCorpo({ fonte: 'busca', campanha: 'DROP TABLE' })).toEqual({ fonte: 'busca', campanha: null });
    expect(origemDoCorpo('bio')).toEqual({ fonte: null, campanha: null });
    expect(origemDoCorpo(null)).toEqual({ fonte: null, campanha: null });
  });
});

describe('o contador por fonte', () => {
  it('soma página de venda e checkout por fonte da lista; o resto vira "direto" ou nada', async () => {
    const env = envDeTeste() as Env;
    const mandar = (corpo: unknown, ua = 'Mozilla/5.0 (iPhone)') => worker.fetch(new Request(`${SITE}/api/portal`, {
      method: 'POST', body: JSON.stringify(corpo),
      headers: { 'content-type': 'application/json', origin: SITE, 'user-agent': ua, 'cf-connecting-ip': '203.0.113.7' }
    }), env, ctx);
    expect((await mandar({ evento: 'venda-visto', fonte: 'stories' })).status).toBe(204);
    await mandar({ evento: 'venda-visto', fonte: 'stories' });
    await mandar({ evento: 'checkout-aberto', fonte: 'stories' });
    await mandar({ evento: 'checkout-conta', fonte: 'stories' });
    await mandar({ evento: 'checkout-pagar', fonte: 'stories' });
    await mandar({ evento: 'venda-visto', fonte: 'inventada' });
    await mandar({ evento: 'venda-visto' });
    await mandar({ evento: 'venda-visto', fonte: 'busca' }, 'Googlebot/2.1');
    await mandar({ evento: 'compra-feita', fonte: 'stories' });
    const linhas = env.DB.bruto.prepare("SELECT chave, n FROM estatisticas WHERE chave LIKE 'f|%' ORDER BY chave").all();
    expect(linhas).toEqual([
      { chave: 'f|checkout-aberto|stories', n: 1 },
      { chave: 'f|checkout-conta|stories', n: 1 },
      { chave: 'f|checkout-pagar|stories', n: 1 },
      { chave: 'f|venda-visto|direto', n: 2 },
      { chave: 'f|venda-visto|stories', n: 2 }
    ]);
  });
});

describe('a origem no pedido', () => {
  beforeEach(() => {
    let id = 800001;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const u = new URL(url);
      if (u.pathname === '/v1/payments' && init?.method === 'POST') {
        const b = JSON.parse(String(init.body));
        return new Response(JSON.stringify({
          id: id++, status: 'pending', external_reference: b.external_reference, transaction_amount: b.transaction_amount,
          currency_id: 'BRL', point_of_interaction: { transaction_data: { qr_code: '000201-teste' } }
        }), { status: 201 });
      }
      return new Response('{}', { status: 200 });
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  const conta = async (env: Env, email: string) => cookieDe(await auth.signup({ request: pedido(`${SITE}/api/auth/signup`,
    { aceitouTermos: true, declarouIdade: true, name: 'Ana', email, password: 'senha-boa-123' }), env, ctx }));

  it('POST /api/pay/create grava a fonte e a campanha válidas, e nada mais', async () => {
    const env = envDeTeste({ MP_ACCESS_TOKEN: TOKEN, SITE_ORIGIN: SITE }) as Env;
    const cookie = await conta(env, 'ana@exemplo.com');
    const criar = (origem: unknown) => pay.create({ request: pedido(`${SITE}/api/pay/create`,
      { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'pix', origem }, { Cookie: cookie }), env, ctx });
    expect((await criar({ fonte: 'stories', campanha: 'alef-1' })).status).toBe(200);
    expect((await criar({ fonte: 'inventada', campanha: 'x' })).status).toBe(200);
    expect((await criar({ fonte: 'busca', campanha: '<b>' })).status).toBe(200);
    const pedidos = env.DB.bruto.prepare('SELECT origem, campanha, amount_cents FROM orders ORDER BY created_at, rowid').all() as
      { origem: string | null; campanha: string | null; amount_cents: number }[];
    expect(pedidos.map(p => [p.origem, p.campanha])).toEqual([['stories', 'alef-1'], [null, null], ['busca', null]]);
    /* A origem nunca mexe no preço. */
    expect(new Set(pedidos.map(p => p.amount_cents)).size).toBe(1);
  });

  it('o painel e a lista de compras mostram a origem', async () => {
    const DONO = 'dono@exemplo.com';
    const env = envDeTeste({ ADMIN_EMAILS: DONO }) as Env;
    await conta(env, 'ana@exemplo.com');
    const dono = await comoAdmin(env, await conta(env, DONO));
    const ana = (env.DB.bruto.prepare('SELECT id FROM accounts WHERE email = ?').get('ana@exemplo.com') as { id: number }).id;
    const pago = await createOrder(env, { accountId: ana, courseSlug: 'alfabetizacao', amountCents: 13230, method: 'pix', origem: 'busca', campanha: 'alfabeto' });
    await createOrder(env, { accountId: ana, courseSlug: 'alfabetizacao', amountCents: 13230, method: 'pix' });
    env.DB.bruto.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").run(Date.now(), pago.id);
    /* A receita líquida (26/10/2026): o que a Mercado Pago informou depois da taxa. */
    await recordEvent(env, { eventId: '55:paid', orderId: pago.id, status: 'paid', source: 'teste', raw: {
      id: 55, status: 'approved', transaction_amount: 132.3,
      transaction_details: { net_received_amount: 130.97, financial_institution: 'banco-do-pagador' },
      fee_details: [{ type: 'mercadopago_fee', amount: 1.33, fee_payer: 'collector' }]
    } });

    const est = await (await worker.fetch(new Request(`${SITE}/api/admin/estatisticas?dias=7`, { headers: { cookie: dono } }), env, ctx)).json() as
      { pedidos: { fonte: string; pedidos: number; compras: number; receitaCentavos: number }[] };
    const porFonte = Object.fromEntries(est.pedidos.map(p => [p.fonte, p]));
    expect(porFonte.busca).toMatchObject({ pedidos: 1, compras: 1, receitaCentavos: 13230 });
    expect(porFonte['sem-marca']).toMatchObject({ pedidos: 1, compras: 0, receitaCentavos: 0 });

    const { vendas } = await (await worker.fetch(new Request(`${SITE}/api/admin/vendas`, { headers: { cookie: dono } }), env, ctx)).json() as
      { vendas: { origem: string | null; campanha: string | null; liquidoCentavos: number | null }[] };
    expect(vendas).toHaveLength(1);
    expect(vendas[0]).toMatchObject({ origem: 'busca', campanha: 'alfabeto', liquidoCentavos: 13097 });
    const [ev] = env.DB.bruto.prepare('SELECT raw FROM payment_events').all() as { raw: string }[];
    expect(JSON.parse(ev!.raw)).toMatchObject({ liquido: 130.97, taxas: 1.33 });
    expect(ev!.raw).not.toContain('banco-do-pagador');
    expect(ev!.raw).not.toContain('transaction_details');
  });
});

describe('a tabela de crescimento', () => {
  it('junta visitas, checkout e compras por fonte, e calcula a conversão da mesma fonte', () => {
    const { linhas, total } = crescimentoPorFonte(
      [
        { evento: 'venda-visto', fonte: 'stories', n: 50 }, { evento: 'checkout-aberto', fonte: 'stories', n: 5 },
        { evento: 'checkout-conta', fonte: 'stories', n: 4 }, { evento: 'checkout-pagar', fonte: 'stories', n: 3 },
        { evento: 'venda-visto', fonte: 'busca', n: 20 },
        { evento: 'teste-visto', fonte: 'busca', n: 12 }, { evento: 'teste-pronto', fonte: 'busca', n: 5 }
      ],
      [{ fonte: 'stories', pedidos: 3, compras: 2, receitaCentavos: 26460, estornos: 0 }]
    );
    expect(linhas[0]).toMatchObject({ fonte: 'stories', venda: 50, checkout: 5, conta: 4, pagar: 3, pedidos: 3, compras: 2, conversao: 0.04 });
    expect(linhas[1]).toMatchObject({ fonte: 'busca', venda: 20, teste: 12, testeFeito: 5, compras: 0, conversao: 0 });
    expect(total).toMatchObject({ venda: 70, teste: 12, testeFeito: 5, compras: 2, receitaCentavos: 26460 });
    expect(total.conversao).toBeCloseTo(2 / 70);
  });
});

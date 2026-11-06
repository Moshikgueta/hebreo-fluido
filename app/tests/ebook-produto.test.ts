/* O e-book "Israel Além do Óbvio" e o pacote com o curso (21/10/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Dois produtos novos no mesmo catálogo dos cursos: o e-book (R$ 67) e o
 * pacote alfabetização + e-book (R$ 127). O que estes testes travam:
 *  - o pacote libera os DOIS produtos num pedido, e o estorno recua os dois;
 *  - quem tem só o e-book lê /israel/ e não abre nada do curso (nem o áudio);
 *  - quem já tem o curso não paga o pacote (`ja-tem-parte`);
 *  - o pacote vira de R$ 127 para R$ 327 junto com o curso; até a virada fica abaixo
 *    do curso sozinho (decisão do dono), depois acima;
 *  - as telas de curso continuam vendo só cursos.
 * Os handlers reais rodam contra o schema de produção e uma Mercado Pago de
 * mentira, como em estorno.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cookieDe, envDeTeste, pedido, DADOS_FISCAIS } from './ajuda/d1';
import { readFileSync } from 'node:fs';
import { allCourses, allProducts } from '@/lib/catalog';
// @ts-expect-error - script JS sem tipos
import { virar } from '../../tools/virar-preco.mjs';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - idem
import { gate, cursoDaRota, isGatedPath, NAO_CURSOS, SEM_PAGINA_DE_VENDA } from '../../worker/src/gate.js';
// @ts-expect-error - idem
import { getCourse, itensDoPedido, priceCents } from '../../worker/src/lib/catalog.js';
// @ts-expect-error - idem
import { grantAccess, hasEntitlement } from '../../worker/src/lib/db.js';
// @ts-expect-error - idem
import { hmacHex } from '../../worker/src/lib/crypto.js';
// @ts-expect-error - idem
import { licenca, mascarar, pdfMarcado, CAMINHO_DO_PDF } from '../../worker/src/api/livro.js';
// @ts-expect-error - script JS sem tipos
import { montarCauda } from '../../scripts/pdf-marca.mjs';

/** Um PDF de duas páginas no formato que o Chromium escreve: xref clássica,
 *  /Resources e /Font dentro da página. */
function pdfMinimo() {
  const objs = [
    '<</Title (Livro)>>',
    '<</Type /Catalog /Pages 3 0 R>>',
    '<</Type /Pages /Kids [5 0 R 6 0 R] /Count 2>>',
    '<</Length 21>>\nstream\nBT /F7 12 Tf (oi) Tj ET\nendstream',
    '<</Type /Page\n/Resources <</Font <</F7 7 0 R>>>>\n/MediaBox [0 0 420 594.95996]\n/Contents 4 0 R\n/Parent 3 0 R>>',
    '<</Type /Page\n/Resources <</ProcSet [/PDF]>>\n/MediaBox [0 0 420 594.95996]\n/Contents [4 0 R]\n/Parent 3 0 R>>',
    '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>'
  ];
  let s = '%PDF-1.4\n';
  const pos: number[] = [];
  objs.forEach((o, i) => { pos.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = s.length;
  s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('');
  s += `trailer\n<</Size ${objs.length + 1}\n/Root 2 0 R\n/Info 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(s, 'latin1');
}

const SITE = 'https://hebraicofluente.com.br';
const SEGREDO = 'segredo-do-webhook-de-teste';
const TOKEN = 'APP_USR-1234567890123456-092019-abcdef0123456789abcdef0123456789-123456789';
const LIVRO = 'israel-alem-do-roteiro';
const PACOTE = 'alfabetizacao-e-israel';
const pendentes: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => { pendentes.push(p); } };
const assentar = async () => { await Promise.all(pendentes.splice(0)); };

type Pagamento = { id: number; status: string; external_reference: string; transaction_amount: number; currency_id: string };
let pagamentos: Map<number, Pagamento>;
let proximoId = 700001;
let enviados: { to: string; subject: string; text: string }[];

beforeEach(() => {
  pagamentos = new Map(); enviados = []; proximoId = 700001;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === 'api.resend.test') {
      const b = JSON.parse(String(init?.body ?? '{}'));
      if (!String(b.subject).startsWith('Confirme seu e-mail')) enviados.push({ to: String(b.to?.[0] ?? ''), subject: b.subject, text: b.text });
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
      const p = pagamentos.get(Number(est[1]));
      if (!p) return new Response('{"message":"not found"}', { status: 404 });
      p.status = 'refunded';
      return new Response(JSON.stringify({ id: 9001, payment_id: p.id, status: 'approved' }), { status: 201 });
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

const envCompleto = () => envDeTeste({
  MP_ACCESS_TOKEN: TOKEN, MP_WEBHOOK_SECRET: SEGREDO,
  RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebraico Fluente <c@hebraicofluente.com.br>',
  RESEND_BASE: 'https://api.resend.test', SUPPORT_EMAIL: 'dono@exemplo.com', SITE_ORIGIN: SITE
});

async function aviso(id: number) {
  const ts = Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(SEGREDO, `id:${id};request-id:req-1;ts:${ts};`);
  return new Request(`${SITE}/api/pay/webhook?data.id=${id}&type=payment`, {
    method: 'POST', headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1', 'content-type': 'application/json' }, body: '{}'
  });
}

async function conta(env: Record<string, unknown>, email = 'ana@exemplo.com.br') {
  const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana', email, password: 'senha-boa-123' }), env, ctx });
  expect(r.status).toBe(200);
  const { account } = await r.json() as { account: { id: number } };
  await assentar();
  return { cookie: cookieDe(r), id: account.id, email };
}

/** Cria o pedido e aprova o pagamento pela Mercado Pago de mentira. */
async function comprar(env: Record<string, unknown>, cookie: string, slug: string) {
  const c = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: slug, method: 'pix' }, { Cookie: cookie }), env, ctx });
  if (c.status !== 200) return { status: c.status, erro: (await c.json() as { error?: string }).error };
  const ordem = await c.json() as { id: string };
  const p = [...pagamentos.values()].at(-1)!;
  p.status = 'approved';
  await pay.webhook({ request: await aviso(p.id), env });
  await assentar();
  return { status: 200, order: ordem.id, pagamento: p.id };
}

/* Liga a venda do e-book e do pacote só no teste (o objeto do catálogo do
   servidor é o mesmo em todo o arquivo; o afterEach devolve como estava). */
const VENDA = new Map<string, unknown>();
function abrirVenda() {
  for (const slug of [LIVRO, PACOTE]) { const c = getCourse(slug); if (!VENDA.has(slug)) VENDA.set(slug, c.aVenda); c.aVenda = true; }
}
afterEach(() => { for (const [slug, v] of VENDA) getCourse(slug).aVenda = v; VENDA.clear(); });

describe('o catálogo', () => {
  it('as telas de curso só veem cursos; checkout e páginas de venda veem o que está à venda', () => {
    expect(allCourses().map(c => c.slug)).not.toContain(LIVRO);
    expect(allCourses().map(c => c.slug)).not.toContain(PACOTE);
    expect(allProducts().map(c => c.slug)).toContain('alfabetizacao');
  });

  /* 22/10/2026 (decisão do dono): o e-book vai ao ar como o Raízes Sefarditas,
     só para quem tem o acesso liberado à mão. `aVenda: false` no catálogo; abrir
     a venda é tirar essa linha (e o contador e o advogado verem antes). */
  it('enquanto `aVenda` é false: sem página de venda, sem checkout, sem link', () => {
    expect(getCourse(LIVRO).aVenda).toBe(false);
    expect(getCourse(PACOTE).aVenda).toBe(false);
    expect(allProducts().map(c => c.slug)).not.toContain(LIVRO);
    expect(allProducts().map(c => c.slug)).not.toContain(PACOTE);
  });

  it('enquanto `aVenda` é false, o servidor recusa a compra do e-book e do pacote', async () => {
    const env = envDeTeste();
    const a = await conta(env);
    for (const slug of [LIVRO, PACOTE]) {
      const r = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: slug, method: 'pix' }, { Cookie: a.cookie }), env, ctx });
      expect(r.status, slug).toBe(404);
    }
  });

  /* A tabela do dono (23/10/2026): R$ 147 o curso, R$ 197 o livro, R$ 297 o
     combo, cobrados no backend a partir do catálogo, com o PIX a 10% menos. */
  it('o preço cobrado sai do catálogo: R$ 147 o curso, R$ 197 o livro, R$ 297 o combo', () => {
    expect(priceCents(getCourse('alfabetizacao'), 'card')).toBe(14700);
    expect(priceCents(getCourse(LIVRO), 'card')).toBe(19700);
    expect(priceCents(getCourse(PACOTE), 'card')).toBe(29700);
    expect(priceCents(getCourse(PACOTE), 'pix')).toBe(26730);
  });

  it('o pacote abre o curso e o e-book, cada um com os seus meses', () => {
    expect(itensDoPedido(getCourse(PACOTE))).toEqual([
      { courseSlug: 'alfabetizacao', months: getCourse('alfabetizacao').accessMonths },
      { courseSlug: LIVRO, months: getCourse(LIVRO).accessMonths }
    ]);
    expect(itensDoPedido(getCourse(LIVRO))).toEqual([{ courseSlug: LIVRO, months: 12 }]);
  });

  it('um combo só: R$ 297 contra R$ 344 dos dois separados, e a virada manual leva a R$ 397', () => {
    const texto = readFileSync(new URL('../../data/courses.json', import.meta.url), 'utf8');
    const cursos = JSON.parse(texto).courses as { slug: string; tipo?: string; titlePt: string }[];
    expect(cursos.filter(c => c.tipo === 'pacote').map(c => c.slug)).toEqual([PACOTE]);
    expect(getCourse(PACOTE).titlePt).toBe('Descubra Israel + Aprenda Hebraico');
    const preco = (t: string, slug: string) => JSON.parse(t).courses.find((c: { slug: string }) => c.slug === slug).price.brl;
    const separados = (t: string) => preco(t, 'alfabetizacao') + preco(t, LIVRO);
    expect(separados(texto)).toBe(344);
    expect(separados(texto) - preco(texto, PACOTE)).toBe(47);
    const depois = virar(texto).texto;
    expect([preco(depois, 'alfabetizacao'), preco(depois, LIVRO), preco(depois, PACOTE)]).toEqual([297, 297, 397]);
    for (const t of [texto, depois]) expect(preco(t, PACOTE)).toBeLessThan(separados(t));
  });
});

describe('o portão do e-book', () => {
  it('a lista do portão dos produtos que não são curso é a do catálogo (menos o pacote, que não vira direito)', () => {
    const todos = JSON.parse(readFileSync(new URL('../../data/courses.json', import.meta.url), 'utf8')).courses as { slug: string; tipo?: string }[];
    const doCatalogo = todos.filter(c => (c.tipo ?? 'curso') === 'livro').map(c => c.slug);
    expect([...NAO_CURSOS].sort()).toEqual(doCatalogo.sort());
  });

  it('/israel é rota paga, do produto e-book', () => {
    expect(isGatedPath('/israel/')).toBe(true);
    expect(isGatedPath('/israel/israel-alem-do-roteiro.pdf')).toBe(true);
    expect(isGatedPath('/israelense')).toBe(false);
    expect(cursoDaRota('/israel/assets/fotos/x.jpg')).toBe(LIVRO);
  });

  it('quem tem só o e-book lê o e-book e não abre o curso, nem o áudio das lições', async () => {
    const env = envDeTeste();
    const a = await conta(env);
    await grantAccess(env, { accountId: a.id, courseSlug: LIVRO, orderId: 'T-livro', months: 12 });
    const porta = (c: string) => gate(new Request(`${SITE}${c}`, { headers: { Cookie: a.cookie } }), env);
    expect(await porta('/israel/')).toBeNull();
    expect(await porta('/israel/israel-alem-do-roteiro.pdf')).toBeNull();
    expect((await porta('/licao/alef/'))?.status).toBe(302);
    expect((await porta('/audio/he-12345678.mp3'))?.status, 'o e-book abriu o áudio do curso').toBe(302);
  });

  it('quem tem só o curso não lê o e-book, e vai para /cursos/ (o e-book não tem página de venda)', async () => {
    const env = envDeTeste();
    const a = await conta(env);
    await grantAccess(env, { accountId: a.id, courseSlug: 'alfabetizacao', orderId: 'T-curso', months: 12 });
    const r = await gate(new Request(`${SITE}/israel/`, { headers: { Cookie: a.cookie } }), env);
    expect(r?.status).toBe(302);
    expect(new URL(r!.headers.get('location')!, SITE).pathname).toBe('/cursos/');
  });

  it('a lista do portão dos produtos sem página de venda é a do catálogo (aVenda: false) mais o Raízes', () => {
    const todos = JSON.parse(readFileSync(new URL('../../data/courses.json', import.meta.url), 'utf8')).courses as { slug: string; aVenda?: boolean; tipo?: string }[];
    const doCatalogo = todos.filter(c => c.aVenda === false && (c.tipo ?? 'curso') !== 'pacote').map(c => c.slug);
    expect([...SEM_PAGINA_DE_VENDA].sort()).toEqual([...doCatalogo, 'raizes-sefarditas'].sort());
  });

  /* 22/10/2026: a publicação parou porque o gate.js passou a importar o
     catálogo, e o seo.mjs carrega o gate.js no Node puro, que recusa JSON sem
     atributo de importação. */
  it('o gate.js carrega no Node puro (o seo.mjs da publicação depende disso)', () => {
    const gateJs = fileURLToPath(new URL('../../worker/src/gate.js', import.meta.url));
    expect(() => execFileSync(process.execPath, ['-e', `import(${JSON.stringify(gateJs)}).then(m => { if (!m.isGatedPath) process.exit(1); })`], { stdio: 'pipe' })).not.toThrow();
  });

  it('a marca d\'água do livro: só quem tem o livro recebe o e-mail escondido e o número da cópia', async () => {
    const env = envDeTeste();
    const a = await conta(env);
    const pedir = () => licenca({ request: new Request(`${SITE}/api/livro/licenca`, { headers: { Cookie: a.cookie } }), env });
    expect((await pedir()).status, 'sem o livro, nada').toBe(403);
    await grantAccess(env, { accountId: a.id, courseSlug: LIVRO, orderId: 'manual-dono', months: 12 });
    const r = await pedir();
    expect(r.status).toBe(200);
    const corpo = await r.json() as { email: string; copia: string };
    expect(corpo.email).toBe(mascarar(a.email));
    expect(corpo.email).not.toBe(a.email);
    expect(corpo.copia).toMatch(/^[0-9A-F]{8}$/);
    expect(((await (await pedir()).json()) as { copia: string }).copia, 'o número da cópia não muda').toBe(corpo.copia);
    expect((await licenca({ request: new Request(`${SITE}/api/livro/licenca`), env })).status).toBe(401);
  });

  /* 22/10/2026: o PDF baixado leva a mesma marca, em toda página, por uma
     atualização incremental montada na publicação (scripts/pdf-marca.mjs). */
  it('o PDF sai com a marca da conta, o original intacto na frente e a xref apontando certo', async () => {
    const pdf = pdfMinimo();
    const { cauda, meta } = montarCauda(pdf);
    expect(meta.paginas).toBe(2);
    const arquivos: Record<string, Uint8Array> = {
      [CAMINHO_DO_PDF]: pdf, [CAMINHO_DO_PDF + '.cauda']: cauda,
      [CAMINHO_DO_PDF + '.cauda.json']: Buffer.from(JSON.stringify(meta))
    };
    const env = envDeTeste({
      ASSETS: { fetch: async (r: Request) => {
        const corpo = arquivos[new URL(r.url).pathname];
        return corpo ? new Response(corpo as BodyInit, { headers: { 'Content-Length': String(corpo.length) } }) : new Response('', { status: 404 });
      } }
    });
    const a = await conta(env);
    await grantAccess(env, { accountId: a.id, courseSlug: LIVRO, orderId: 'manual-dono', months: 12 });
    const r = await pdfMarcado(new Request(`${SITE}${CAMINHO_DO_PDF}`, { headers: { Cookie: a.cookie } }), env, ctx);
    expect(r.headers.get('Content-Type')).toBe('application/pdf');
    const saida = Buffer.from(await r.arrayBuffer());
    await assentar();
    expect(Number(r.headers.get('Content-Length'))).toBe(saida.length);
    expect(saida.subarray(0, pdf.length).equals(Buffer.from(pdf)), 'o original vai inteiro na frente').toBe(true);
    const texto = saida.toString('latin1');
    const copia = (await (await licenca({ request: new Request(`${SITE}/api/livro/licenca`, { headers: { Cookie: a.cookie } }), env })).json() as { copia: string }).copia;
    expect(texto).toContain(`(Licenciado para an\x95\x95\x95@exemplo.com.br \xb7 c\xf3pia ${copia}`);
    expect(texto).not.toContain(a.email);
    /* Toda entrada da xref nova aponta para o começo do objeto certo, e o
       startxref aponta para ela; o trailer encadeia a xref do original. */
    const ultima = Number(texto.match(/startxref\s+(\d+)\s+%%EOF\s*$/)![1]);
    expect(texto.startsWith('xref', ultima)).toBe(true);
    const tabela = texto.slice(ultima, texto.indexOf('trailer', ultima));
    for (const [, num, pos] of tabela.matchAll(/(\d+) 1\n(\d{10}) 00000 n/g)) {
      expect(texto.startsWith(`${num} 0 obj`, Number(pos)), `objeto ${num}`).toBe(true);
    }
    expect(texto.slice(ultima)).toMatch(/\/Prev \d+/);
    /* Cada página nova desenha o original entre q/Q e a marca depois. */
    expect(texto.match(/\/Contents \[\d+ 0 R 4 0 R \d+ 0 R \d+ 0 R\]/g)?.length).toBe(2);
    /* Sem a cauda (PDF de outra publicação), nada de marca: o portão serve o arquivo. */
    delete arquivos[CAMINHO_DO_PDF + '.cauda'];
    expect(await pdfMarcado(new Request(`${SITE}${CAMINHO_DO_PDF}`, { headers: { Cookie: a.cookie } }), env, ctx)).toBeNull();
  });

  it('o acesso liberado à mão (Actions → Acesso → liberar) abre /israel mesmo fora da venda', async () => {
    const env = envDeTeste();
    const a = await conta(env);
    await grantAccess(env, { accountId: a.id, courseSlug: LIVRO, orderId: 'manual-dono', months: 12 });
    expect(await gate(new Request(`${SITE}/israel/`, { headers: { Cookie: a.cookie } }), env)).toBeNull();
  });
});

describe('comprar o e-book e o pacote (o dia em que a venda abrir)', () => {
  beforeEach(abrirVenda);
  it('o e-book libera só o e-book, e o recibo leva ao e-book', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const r = await comprar(env, a.cookie, LIVRO);
    expect(r.status).toBe(200);
    expect(await hasEntitlement(env, a.id, LIVRO)).toBe(true);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    const recibo = enviados.find(m => m.to === a.email)!;
    expect(recibo.subject).toContain('Israel Além do Óbvio');
    expect(recibo.text).toContain(`${SITE}/israel/`);
    expect(recibo.text).toContain('Experiência interativa: Israel Além do Óbvio');
    expect(recibo.text).not.toMatch(/e-book/i);
    expect(recibo.text).not.toContain('Aula 0');
  });

  it('o pacote libera o curso e o e-book num pedido só', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const r = await comprar(env, a.cookie, PACOTE);
    expect(r.status).toBe(200);
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
    expect(await hasEntitlement(env, a.id, LIVRO)).toBe(true);
    const recibo = enviados.find(m => m.to === a.email)!;
    expect(recibo.text).toContain(`${SITE}/israel/`);
    expect(recibo.text).toContain('Aula 0');
  });

  it('desistir do pacote fecha os dois', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const r = await comprar(env, a.cookie, PACOTE);
    const d = await pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order: r.order }, { Cookie: a.cookie }), env, ctx });
    expect(d.status).toBe(200);
    await assentar();
    expect(await hasEntitlement(env, a.id, 'alfabetizacao'), 'o curso ficou aberto').toBe(false);
    expect(await hasEntitlement(env, a.id, LIVRO), 'o e-book ficou aberto').toBe(false);
  });

  it('quem já tem o curso não paga o pacote, e compra o e-book sozinho', async () => {
    const env = envCompleto();
    const a = await conta(env);
    await comprar(env, a.cookie, 'alfabetizacao');
    const r = await comprar(env, a.cookie, PACOTE);
    expect(r).toEqual({ status: 409, erro: 'ja-tem-parte' });
    const s = await comprar(env, a.cookie, LIVRO);
    expect(s.status).toBe(200);
    expect(await hasEntitlement(env, a.id, LIVRO)).toBe(true);
  });

});

/* Os três fluxos de compra com a tabela do dono (23/10/2026): cada opção cobra
   o seu preço, calculado no servidor; só um pagamento APROVADO, consultado na
   Mercado Pago e no valor do pedido, libera alguma coisa. Voltar do checkout
   sem pagar, um pagamento pendente, recusado ou de valor menor não liberam. */
describe('os três fluxos: curso, Israel Além do Óbvio e o combo', () => {
  beforeEach(abrirVenda);
  const criar = async (env: Record<string, unknown>, cookie: string, slug: string, method: 'pix' | 'card' = 'pix') => {
    const c = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: slug, method }, { Cookie: cookie }), env, ctx });
    expect(c.status).toBe(200);
    return { ordem: (await c.json() as { id: string }).id, p: [...pagamentos.values()].at(-1)! };
  };

  it('cada opção cobra o próprio preço no PIX: R$ 132,30, R$ 177,30 e R$ 267,30', async () => {
    const env = envCompleto();
    for (const [slug, valor, email] of [['alfabetizacao', 132.3, 'a@x.com.br'], [LIVRO, 177.3, 'b@x.com.br'], [PACOTE, 267.3, 'c@x.com.br']] as const) {
      const a = await conta(env, email);
      const { p } = await criar(env, a.cookie, slug);
      expect(p.transaction_amount, slug).toBe(valor);
    }
  });

  it('o preço não vem do navegador: um valor no corpo do pedido é ignorado', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const c = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: PACOTE, method: 'pix', amount: 1, amountCents: 100, price: 1 }, { Cookie: a.cookie }), env, ctx });
    expect(c.status).toBe(200);
    expect([...pagamentos.values()].at(-1)!.transaction_amount).toBe(267.3);
  });

  it('o combo pago com valor menor que o dele não libera nada', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const { p } = await criar(env, a.cookie, PACOTE);
    p.transaction_amount = 177.3;
    p.status = 'approved';
    await pay.webhook({ request: await aviso(p.id), env });
    await assentar();
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(false);
    expect(await hasEntitlement(env, a.id, LIVRO)).toBe(false);
  });

  it('pendente e recusado não liberam; o aviso aprovado depois libera os dois do combo', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const { p } = await criar(env, a.cookie, PACOTE);
    await pay.webhook({ request: await aviso(p.id), env });
    await assentar();
    expect(await hasEntitlement(env, a.id, LIVRO)).toBe(false);
    const b = await conta(env, 'beto@exemplo.com.br');
    const r = await criar(env, b.cookie, LIVRO);
    r.p.status = 'rejected';
    await pay.webhook({ request: await aviso(r.p.id), env });
    await assentar();
    expect(await hasEntitlement(env, b.id, LIVRO)).toBe(false);
    p.status = 'approved';
    await pay.webhook({ request: await aviso(p.id), env });
    await assentar();
    expect(await hasEntitlement(env, a.id, 'alfabetizacao')).toBe(true);
    expect(await hasEntitlement(env, a.id, LIVRO)).toBe(true);
  });

  it('um aviso sem assinatura válida não libera nada', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const { p } = await criar(env, a.cookie, LIVRO);
    p.status = 'approved';
    const falso = new Request(`${SITE}/api/pay/webhook?data.id=${p.id}&type=payment`, {
      method: 'POST', headers: { 'x-signature': 'ts=1,v1=00', 'x-request-id': 'req-1', 'content-type': 'application/json' }, body: '{}'
    });
    expect((await pay.webhook({ request: falso, env })).status).toBe(401);
    await assentar();
    expect(await hasEntitlement(env, a.id, LIVRO)).toBe(false);
  });

  it('o mesmo aviso aprovado duas vezes concede uma vez só', async () => {
    const env = envCompleto();
    const a = await conta(env);
    const r = await comprar(env, a.cookie, PACOTE);
    const p = pagamentos.get(r.pagamento!)!;
    await pay.webhook({ request: await aviso(p.id), env });
    await assentar();
    const linhas = (env.DB as { bruto: { prepare(q: string): { all(...a: unknown[]): unknown[] } } }).bruto
      .prepare('SELECT course_slug FROM entitlements WHERE account_id = ?').all(a.id);
    expect(linhas.length).toBe(2);
    expect(enviados.filter(m => m.to === a.email).length).toBe(1);
  });
});

describe('o pacote liberado à mão (PIX direto, Actions → Acesso → liberar)', () => {
  const SCRIPT = fileURLToPath(new URL('../../scripts/sql-liberar-pedido.sh', import.meta.url));

  it('com os componentes do catálogo, libera o curso e o e-book com o id do pedido', async () => {
    const env = envCompleto() as Record<string, unknown> & { DB: { bruto: { exec(s: string): void; prepare(s: string): { run(...a: unknown[]): unknown; all(...a: unknown[]): unknown[] } } } };
    const a = await conta(env);
    env.DB.bruto.prepare(`INSERT INTO orders (id, account_id, course_slug, amount_cents, method, status, provider, created_at)
                          VALUES ('HFpacote1', ?, ?, 15930, 'pix', 'pending', 'mercadopago', ?)`).run(a.id, PACOTE, Date.now());
    /* O que a Action faz: lê `componentes` em data/courses.json. */
    const itens = (getCourse(PACOTE).componentes as string[]).join(' ');
    env.DB.bruto.exec(execFileSync('bash', [SCRIPT, 'HFpacote1', a.email, '12', itens], { encoding: 'utf8' }));
    const linhas = env.DB.bruto.prepare('SELECT course_slug, order_id FROM entitlements WHERE account_id = ? ORDER BY course_slug').all(a.id);
    expect(linhas).toEqual([
      { course_slug: 'alfabetizacao', order_id: 'HFpacote1' },
      { course_slug: LIVRO, order_id: 'HFpacote1' }
    ]);
  });

  it('recusa slug com caractere fora de [a-z0-9-] (o SQL é montado em texto)', () => {
    expect(() => execFileSync('bash', [SCRIPT, 'HF1', 'a@b.c', '12', "x' OR 1=1 --"], { encoding: 'utf8', stdio: 'pipe' })).toThrow();
  });
});

/* Sem PDF para baixar (decisão do dono, 23/10/2026): a publicação não monta
   nem publica o PDF, e nenhum texto de venda, checkout, política ou e-mail o
   promete. Os comentários podem citar o PDF (a história); o código, não. */
describe('o e-book não tem PDF para baixar', () => {
  const semComentarios = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*(\/\/|#).*$/gm, '');
  it('a publicação não monta nem copia o PDF', () => {
    const s = semComentarios('../../scripts/ebook-no-site.sh');
    expect(s).not.toMatch(/revista\.mjs|\.pdf|pdf-marca/);
    expect(s).toMatch(/--producao(?!=)/);
  });
  it('as telas e os textos de venda não falam em PDF', () => {
    for (const rel of ['../src/app/cursos/[slug]/ProdutoClient.tsx', '../src/app/cursos/[slug]/LivroClient.tsx', '../src/app/checkout/[slug]/CheckoutClient.tsx',
                       '../src/app/checkout/[slug]/obrigado/ObrigadoClient.tsx', '../src/app/termos/page.tsx',
                       '../src/app/reembolso/page.tsx', '../src/lib/ecossistema.ts', '../src/app/israel-alem-do-obvio/page.tsx',
                       '../../worker/src/lib/mail.js',
                       '../src/i18n/telas/conta-checkout-client.ts', '../src/i18n/telas/conta-obrigado.ts']) {
      expect(semComentarios(rel), rel).not.toMatch(/PDF/);
    }
    const cat = JSON.parse(readFileSync(new URL('../../data/courses.json', import.meta.url), 'utf8')).courses as { summaryPt: string; taglinePt: string }[];
    for (const c of cat) expect(`${c.summaryPt} ${c.taglinePt}`).not.toMatch(/PDF/);
  });
});

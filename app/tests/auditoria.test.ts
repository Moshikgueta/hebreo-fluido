/* O que a auditoria de segurança de 20/09/2026 fechou, e não pode reabrir.
 * ─────────────────────────────────────────────────────────────────────────
 * Cada bloco aqui é um achado que dez agentes independentes confirmaram
 * contra o código real, e cada teste reproduz o ataque ANTES de conferir a
 * defesa - onde dá, o mesmo pedido que abria a porta é o que está aqui,
 * agora esperando a porta fechada. Contra um SQLite de verdade com o
 * `worker/schema.sql` de produção (tests/ajuda/d1.ts), e contra o Worker
 * inteiro (`worker.fetch`), não contra pedaços dele.
 *
 * O relatório completo está em SECURITY-AUDIT.md.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { comoAdmin, cookieDe, envDeTeste, pedido, DADOS_FISCAIS } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import { canonical, gate, isGatedPath } from '../../worker/src/gate.js';
// @ts-expect-error - idem
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - idem
import * as progress from '../../worker/src/api/progress.js';
// @ts-expect-error - idem
import { readJson } from '../../worker/src/lib/http.js';
// @ts-expect-error - idem
import { makeSessionCookie, readSession } from '../../worker/src/lib/session.js';
// @ts-expect-error - idem
import { enxuto, estourou, grantAccess, hasEntitlement, inviteCreate, recordEvent, throttled } from '../../worker/src/lib/db.js';
// @ts-expect-error - idem
import { getPayment, verifyWebhookSignature } from '../../worker/src/lib/mercadopago.js';
// @ts-expect-error - idem
import { hmacHex } from '../../worker/src/lib/crypto.js';
import { safeNext } from '../src/lib/safe-next';
import { mergeStates } from '../src/lib/state/merge';
import { empresa, formasAtivas, temCartao, temPix } from '../src/lib/empresa';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SITE = 'https://hebraicofluente.com.br';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };

/* Um servidor de ativos de mentira: devolve HTML público com os cabeçalhos
   que o da Cloudflare devolve. */
const ASSETS = {
  fetch: async (_r: Request) => new Response('<html><body>aula</body></html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' }
  })
};

const envSite = (extra: Record<string, unknown> = {}) => envDeTeste({ ASSETS, ...extra });

async function comConta(env: Record<string, unknown>, email = 'aluna@exemplo.com.br') {
  const r = await auth.signup({
    request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana', email, password: 'senha-boa-123' }),
    env, ctx
  });
  expect(r.status).toBe(200);
  const body = await r.json() as { account: { id: number } };
  return { cookie: cookieDe(r), id: body.account.id, email };
}

const comContaSemCurso = (env: Record<string, unknown>) => comConta(env);

const linhas = (env: Record<string, unknown>, sql: string) =>
  ((env.DB as { bruto: { prepare(s: string): { all(): unknown[] } } }).bruto.prepare(sql).all());

/* ── o portão ───────────────────────────────────────────────────────────── */

describe('o portão não acredita em cabeçalho do cliente', () => {
  const alvo = `${SITE}/licao/alef/`;

  it.each([
    ['sem Sec-Fetch-Dest', {}, 302],
    ['Sec-Fetch-Dest: document', { 'Sec-Fetch-Dest': 'document' }, 302],
    ['Sec-Fetch-Dest: empty (o ataque)', { 'Sec-Fetch-Dest': 'empty' }, 403],
    ['Sec-Fetch-Dest: iframe', { 'Sec-Fetch-Dest': 'iframe' }, 403],
    ['Sec-Fetch-Dest: image', { 'Sec-Fetch-Dest': 'image' }, 403],
    ['Sec-Fetch-Dest: xyz', { 'Sec-Fetch-Dest': 'xyz' }, 403]
  ])('sem sessão, %s → recusa', async (_n, headers, status) => {
    const r = await gate(new Request(alvo, { headers }), envSite());
    expect(r, 'o portão deixou passar').toBeTruthy();
    expect(r.status).toBe(status);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('com sessão mas sem o curso, recusa para a página de vendas', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const r = await gate(new Request(alvo, { headers: { Cookie: cookie } }), env);
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toContain('/curso-de-hebraico/');
  });

  it('com sessão e curso, passa - inclusive o index.txt que o Next busca', async () => {
    const env = envSite();
    const { cookie, id } = await comConta(env);
    await grantAccess(env, { accountId: id, courseSlug: 'alfabetizacao', orderId: 'T', months: 12 });
    expect(await gate(new Request(alvo, { headers: { Cookie: cookie } }), env)).toBeNull();
    expect(await gate(new Request(`${alvo}index.txt`, {
      headers: { Cookie: cookie, 'Sec-Fetch-Dest': 'empty' }
    }), env)).toBeNull();
  });

  it('normaliza o caminho antes de decidir', () => {
    for (const p of ['/LICAO/alef/', '//licao/alef/', '/licao//alef', '/%6cicao/alef/', '/Modulo/1', '/audio/alef.mp3']) {
      expect(isGatedPath(p), p).toBe(true);
    }
    expect(isGatedPath('/licaox/alef')).toBe(false);
    expect(isGatedPath('/cursos/alfabetizacao/')).toBe(false);
    /* O que não decodifica é tratado como pago: na dúvida, fecha. */
    expect(isGatedPath('/%zz/licao')).toBe(true);
    expect(canonical('/%zz')).toBeNull();
  });
});

/* ── os cabeçalhos do site ──────────────────────────────────────────────── */

describe('o site sai blindado', () => {
  it('toda página HTML leva CSP, anti-moldura, HSTS e Referrer-Policy', async () => {
    const r = await worker.fetch(new Request(`${SITE}/`), envSite(), ctx);
    expect(r.status).toBe(200);
    const csp = r.headers.get('content-security-policy') || '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("default-src 'self'");
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('strict-transport-security')).toContain('max-age=31536000');
    expect(r.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('uma aula liberada nunca é cacheável por um intermediário', async () => {
    const env = envSite();
    const { cookie, id } = await comConta(env);
    await grantAccess(env, { accountId: id, courseSlug: 'alfabetizacao', orderId: 'T', months: 12 });
    const r = await worker.fetch(new Request(`${SITE}/licao/alef/`, { headers: { Cookie: cookie } }), env, ctx);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });

  /* A verificação independente pegou: a primeira versão só blindava as
     páginas, e o HSTS faltava no 301 do www, no 302 do portão e em toda
     resposta da API - justamente as que carregam senha. */
  it('o redirect do portão, o 301 do www e a API também saem blindados', async () => {
    const env = envSite();
    const portao = await worker.fetch(new Request(`${SITE}/licao/alef/`), env, ctx);
    expect(portao.status).toBe(302);
    expect(portao.headers.get('strict-transport-security')).toContain('max-age=31536000');
    expect(portao.headers.get('x-content-type-options')).toBe('nosniff');
    expect(portao.headers.get('cache-control')).toContain('no-store');

    const www = await worker.fetch(new Request('https://www.hebraicofluente.com.br/entrar/'), env, ctx);
    expect(www.status).toBe(301);
    expect(www.headers.get('location')).toBe(`${SITE}/entrar/`);
    expect(www.headers.get('strict-transport-security')).toContain('max-age=31536000');

    const api = await worker.fetch(new Request(`${SITE}/api/me`), env, ctx);
    expect(api.status).toBe(401);
    expect(api.headers.get('strict-transport-security')).toContain('max-age=31536000');
    expect(api.headers.get('x-content-type-options')).toBe('nosniff');
    expect(api.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    /* JSON não leva CSP - a política é de página. */
    expect(api.headers.get('content-security-policy')).toBeNull();
  });

  /* 25/09/2026: o aluno grava a própria leitura (GravarLeitura). O
     microfone abre só para o próprio site, só nas páginas do curso; no site
     público e na API continua fechado, e nenhum terceiro o recebe. */
  it('o microfone só abre para o próprio site, e só no curso e na página de venda', async () => {
    const env = envSite();
    const publica = await worker.fetch(new Request(`${SITE}/faq/`), env, ctx);
    expect(publica.headers.get('permissions-policy')).toContain('microphone=()');
    /* 28/09/2026: a capa abre o microfone para o próprio site - o "Ouça e
       fale" da landing -, e só para ele. */
    /* 23/10/2026: a página de venda saiu da capa para /curso-de-hebraico, e
       o microfone foi junto; a capa (o portal) volta a fechá-lo. */
    /* 27/10/2026: a capa voltou a ser a página do curso (o site é só o curso
       de alfabetização), e o microfone abre nas duas. */
    for (const r of ['/', '/curso-de-hebraico/']) {
      const venda = await worker.fetch(new Request(`${SITE}${r}`), env, ctx);
      expect(venda.headers.get('permissions-policy'), r).toContain('microphone=(self)');
      expect(venda.headers.get('permissions-policy'), r).not.toMatch(/microphone=\([^)]*(https?:|\*)/);
    }

    const { cookie, id } = await comConta(env);
    await grantAccess(env, { accountId: id, courseSlug: 'alfabetizacao', orderId: 'M', months: 12 });
    const aula = await worker.fetch(new Request(`${SITE}/licao/alef/`, { headers: { Cookie: cookie } }), env, ctx);
    const pp = aula.headers.get('permissions-policy') || '';
    expect(pp).toContain('microphone=(self)');
    expect(pp).toContain('camera=()');
    expect(pp).not.toMatch(/microphone=\([^)]*(https?:|\*)/);

    const api = await worker.fetch(new Request(`${SITE}/api/me`), env, ctx);
    expect(api.headers.get('permissions-policy')).toContain('microphone=()');
  });
});

/* ── escrita só da própria origem ──────────────────────────────────────── */

describe('a API recusa escrita de outra origem', () => {
  const login = (headers: Record<string, string>) =>
    worker.fetch(pedido(`${SITE}/api/auth/login`, { email: 'x@exemplo.com', password: 'nada-nada' }, headers),
      envSite(), ctx);

  it('Origin de outro site → 403, antes de qualquer handler', async () => {
    expect((await login({ Origin: 'https://evil.example' })).status).toBe(403);
  });
  it('Sec-Fetch-Site: cross-site → 403', async () => {
    expect((await login({ 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
  });
  it('a própria origem, ou nenhuma declarada, chega ao handler', async () => {
    expect((await login({ Origin: SITE, 'Sec-Fetch-Site': 'same-origin' })).status).toBe(401);
    expect((await login({})).status).toBe(401);
  });
  it('GET não é afetado; o webhook fica de fora porque a assinatura é a trava dele', async () => {
    const g = await worker.fetch(new Request(`${SITE}/api/me`, { headers: { Origin: 'https://evil.example' } }), envSite(), ctx);
    expect(g.status).toBe(401);
    const w = await worker.fetch(new Request(`${SITE}/api/pay/webhook?data.id=123&type=payment`, {
      method: 'POST', headers: { Origin: 'https://api.mercadopago.com', 'content-type': 'application/json' }, body: '{}'
    }), envSite(), ctx);
    expect(w.status).toBe(401);   // chegou ao handler, e a assinatura recusou
  });
});

/* ── o corpo ────────────────────────────────────────────────────────────── */

describe('o limite do corpo é em bytes', () => {
  it('um corpo em hebraico não passa com o dobro do tamanho', async () => {
    const texto = 'א'.repeat(5000);                       // 5.000 unidades, 10.000 bytes
    const r = new Request(`${SITE}/x`, { method: 'POST', body: JSON.stringify({ t: texto }) });
    expect(await readJson(r, 8 * 1024)).toBeNull();
    const ok = new Request(`${SITE}/x`, { method: 'POST', body: JSON.stringify({ t: 'א'.repeat(1000) }) });
    expect(await readJson(ok, 8 * 1024)).toEqual({ t: 'א'.repeat(1000) });
  });
  it('um Content-Length declarado acima do limite é recusado sem ler', async () => {
    const r = new Request(`${SITE}/x`, { method: 'POST', headers: { 'Content-Length': '99999999' }, body: '{}' });
    expect(await readJson(r, 8 * 1024)).toBeNull();
  });

  /* Sem Content-Length (chunked), a primeira versão lia o corpo INTEIRO
     antes de medir - cem megabytes materializados para responder "grande
     demais". O leitor agora para no pedaço que passa do teto. */
  it('um corpo em pedaços, sem Content-Length, é largado no byte seguinte ao teto', async () => {
    let entregues = 0;
    const pedaco = new TextEncoder().encode('x'.repeat(1024));
    const corpo = new ReadableStream<Uint8Array>({
      pull(c) {
        entregues++;
        if (entregues > 200) c.close(); else c.enqueue(pedaco);
      }
    });
    const r = new Request(`${SITE}/x`, { method: 'POST', body: corpo, duplex: 'half' } as RequestInit);
    expect(r.headers.get('content-length')).toBeNull();
    expect(await readJson(r, 8 * 1024)).toBeNull();
    /* Oito cabem, o nono estoura; com folga de leitura antecipada, nunca 200. */
    expect(entregues).toBeGreaterThanOrEqual(9);
    expect(entregues).toBeLessThan(20);
  });

  it('um corpo em pedaços dentro do teto é lido inteiro', async () => {
    const partes = ['{"a":', '"א', 'ב"', '}'].map(s => new TextEncoder().encode(s));
    const corpo = new ReadableStream<Uint8Array>({
      start(c) { for (const p of partes) c.enqueue(p); c.close(); }
    });
    const r = new Request(`${SITE}/x`, { method: 'POST', body: corpo, duplex: 'half' } as RequestInit);
    expect(await readJson(r, 8 * 1024)).toEqual({ a: 'אב' });
  });
});

/* ── a sessão ───────────────────────────────────────────────────────────── */

describe('a sessão', () => {
  it('vale o primeiro cookie que CONFERE, não o primeiro que aparece', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const enxerto = `__Host-hf_session=lixo.lixo; ${cookie}; outro=1`;
    const r = await auth.me({ request: new Request(`${SITE}/api/me`, { headers: { Cookie: enxerto } }), env });
    expect(r.status).toBe(200);
  });

  /* O teto de quatro candidatos reabria a porta: cinco enxertos e o
     legítimo nunca entrava no laço. Agora o teto é de trabalho - até 32
     candidatos de tamanho plausível - e um enxerto gigante nem é conferido. */
  it('cinco, vinte enxertos ou um enxerto gigante não derrubam o cookie legítimo', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const me = (c: string) => auth.me({ request: new Request(`${SITE}/api/me`, { headers: { Cookie: c } }), env });
    const lixo = (n: number) => Array.from({ length: n }, (_, i) => `__Host-hf_session=lixo${i}.lixo`).join('; ');
    expect((await me(`${lixo(5)}; ${cookie}`)).status).toBe(200);
    expect((await me(`${lixo(20)}; ${cookie}`)).status).toBe(200);
    expect((await me(`__Host-hf_session=${'a'.repeat(3000)}.b; ${cookie}`)).status).toBe(200);
    /* Sem o legítimo, nada disso vira sessão. */
    expect((await me(lixo(20))).status).toBe(401);
  });

  /* Auditoria de 24/09/2026: sem o prefixo, um subdomínio conseguiria
     plantar no navegador da vítima um cookie de sessão válido - o de uma
     conta do atacante -, e ela estudaria e pagaria dentro dela. `__Host-`
     faz o navegador recusar qualquer cookie com esse nome que não venha
     deste host, com Secure, Path=/ e sem Domain. */
  it('o cookie tem o prefixo __Host-, com o que o prefixo exige', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    expect(cookie).toMatch(/^__Host-hf_session=/);
    const inteiro = await makeSessionCookie(env, { id: 1, session_version: 0 });
    expect(inteiro).toMatch(/; Path=\/;/);
    expect(inteiro).toMatch(/; Secure;/);
    expect(inteiro).not.toMatch(/Domain=/i);
  });

  it('o nome antigo (hf_session) não abre nada desde 15/10/2026', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const antigo = cookie.replace(/^__Host-hf_session=/, 'hf_session=');
    const me = (c: string) => auth.me({ request: new Request(`${SITE}/api/me`, { headers: { Cookie: c } }), env });
    expect((await me(antigo)).status).toBe(401);
    expect((await me(cookie)).status).toBe(200);
  });

  it('sair apaga os dois nomes', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const r = await auth.logout({ request: new Request(`${SITE}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } }), env });
    const sets = r.headers.getSetCookie();
    expect(sets.some((c: string) => c.startsWith('__Host-hf_session=;') && c.includes('Max-Age=0'))).toBe(true);
    expect(sets.some((c: string) => c.startsWith('hf_session=;') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('não carrega e-mail nem nome', async () => {
    const env = envSite();
    const c = await makeSessionCookie(env, { id: 7, email: 'a@b.co', name: 'Ana', session_version: 0 });
    const payload = c.split('=')[1]!.split('.')[0]!;
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString());
    expect(Object.keys(dados).sort()).toEqual(['exp', 'sv', 'uid']);
    const lido = await readSession(new Request(SITE, { headers: { Cookie: c.split(';')[0]! } }), env);
    expect(lido.uid).toBe(7);
  });
});

/* ── o freio ────────────────────────────────────────────────────────────── */

describe('o freio', () => {
  it('não gasta escrita no banco com quem já estourou', async () => {
    const env = envSite();
    expect(await throttled(env, 'k', 2)).toBe(false);
    expect(await throttled(env, 'k', 2)).toBe(false);
    expect(await throttled(env, 'k', 2)).toBe(true);
    expect(await throttled(env, 'k', 2)).toBe(true);
    expect(await throttled(env, 'k', 2)).toBe(true);
    const [row] = linhas(env, "SELECT hits FROM throttle WHERE key = 'k'") as { hits: number }[];
    expect(row!.hits).toBe(2);   // e não 5
    expect(await estourou(env, 'k', 2)).toBe(true);
    expect(await estourou(env, 'outra', 2)).toBe(false);
  });

  /* A verificação independente mostrou que ler-e-depois-gravar não é uma
     operação: uma rajada em paralelo lia "zero" N vezes e passava inteira.
     Aqui as cinquenta chamadas são disparadas de uma vez, e só `limit`
     recebem passagem. */
  it('uma rajada em paralelo não passa inteira', async () => {
    const env = envSite();
    const veredictos: boolean[] = await Promise.all(Array.from({ length: 50 }, () => throttled(env, 'rajada', 5)));
    expect(veredictos.filter(v => v === false)).toHaveLength(5);
    expect(veredictos.filter(v => v === true)).toHaveLength(45);
    const [row] = linhas(env, "SELECT hits FROM throttle WHERE key = 'rajada'") as { hits: number }[];
    expect(row!.hits).toBeGreaterThanOrEqual(5);
  });

  /* A limpeza oportunista apagava a linha que a própria chamada tinha
     acabado de criar, para toda janela maior que o horizonte dela: a linha
     de uma janela de 24 horas é carimbada no INÍCIO do dia, e às duas da
     tarde já tinha "mais de duas horas". O contador nunca passava de um, e
     o freio de 24 horas não freava nada. */
  it('uma janela de 24 horas conta de verdade, e a limpeza não a come', async () => {
    const env = envSite();
    const dia = 24 * 3_600_000;
    expect(await throttled(env, 'diario', 1, dia)).toBe(false);
    for (let i = 0; i < 4; i++) expect(await throttled(env, 'diario', 1, dia)).toBe(true);
    /* Uma chave nova de um minuto dispara a limpeza; a linha diária fica. */
    await throttled(env, 'outra', 5);
    expect(await throttled(env, 'diario', 1, dia)).toBe(true);
    expect(linhas(env, "SELECT 1 AS x FROM throttle WHERE key LIKE 'diario%'")).toHaveLength(1);
  });

  it('janelas diferentes não colidem, e a limpeza de uma não apaga a outra', async () => {
    const env = envSite();
    for (let i = 0; i < 5; i++) await throttled(env, 'h', 5, 3_600_000);
    /* Uma chave nova de um minuto dispara a limpeza oportunista. */
    await throttled(env, 'j', 1);
    expect(await throttled(env, 'j', 1, 3_600_000)).toBe(false);
    const rows = linhas(env, "SELECT key, hits FROM throttle ORDER BY key") as { key: string; hits: number }[];
    expect(rows.map(r => r.key)).toEqual(['h@3600000', 'j', 'j@3600000']);
    expect(rows[0]!.hits).toBe(5);
    expect(await estourou(env, 'h', 5, 3_600_000)).toBe(true);
  });
});

/* ── o login ────────────────────────────────────────────────────────────── */

describe('o login', () => {
  /* O freio por e-mail e origem conta numa janela de um minuto que vira no
     minuto cheio do relógio. Sete tentativas com PBKDF2 levam segundos; se
     elas cruzassem a virada, a contagem recomeçava no meio e o teste caía sem
     motivo (deploy do hebreo-fluido, 06/11/2026). O relógio fica parado no
     começo de um minuto: o tempo das tentativas não muda mais a resposta. */
  beforeEach(() => { vi.useFakeTimers({ now: Date.UTC(2026, 10, 6, 13, 56, 0), toFake: ['Date'] }); });
  afterEach(() => { vi.useRealTimers(); });

  const tentar = (env: Record<string, unknown>, email: string, password: string, origem: string) =>
    auth.login({ request: pedido(`${SITE}/api/auth/login`, { email, password }, { 'CF-Connecting-IP': origem }), env, ctx });

  it('um estranho errando não tranca a dona da conta', async () => {
    const env = envSite();
    const { email } = await comConta(env);
    const status: number[] = [];
    for (let i = 0; i < 7; i++) status.push((await tentar(env, email, 'errada-' + i, '203.0.113.9')).status);
    expect(status).toEqual([401, 401, 401, 401, 401, 429, 429]);
    /* A dona, de outro lugar, com a senha certa. */
    expect((await tentar(env, email, 'senha-boa-123', '198.51.100.7')).status).toBe(200);
  });

  /* SEC-A-002 (auditoria de 01/10/2026): o teto de erros decidia por uma
     LEITURA e só gastava depois da falha, e a verificação da senha leva o
     tempo do PBKDF2. Quarenta senhas erradas em paralelo, mesmo IP e mesmo
     e-mail, eram as quarenta avaliadas (40 respostas 401). Agora a vaga é
     reservada antes: no máximo o teto (5 por minuto por e-mail e IP). */
  it('quarenta senhas erradas em paralelo: no máximo o teto é avaliado', async () => {
    const env = envSite();
    const { email } = await comConta(env);
    const status = (await Promise.all(Array.from({ length: 40 }, (_, i) =>
      tentar(env, email, 'errada-' + i, '10.99.99.2')))).map((r: Response) => r.status);
    expect(status.filter((s: number) => s === 401)).toHaveLength(5);
    expect(status.filter((s: number) => s === 429)).toHaveLength(35);
    /* A dona, de outro lugar, com a senha certa, continua entrando. */
    expect((await tentar(env, email, 'senha-boa-123', '198.51.100.7')).status).toBe(200);
  });

  it('a mesma rajada vinda de quarenta endereços: no máximo os 30 por e-mail', async () => {
    const env = envSite();
    const { email } = await comConta(env);
    const status = (await Promise.all(Array.from({ length: 40 }, (_, i) =>
      tentar(env, email, 'errada-' + i, `10.98.0.${i + 1}`)))).map((r: Response) => r.status);
    expect(status.filter((s: number) => s === 401)).toHaveLength(30);
    expect(status.filter((s: number) => s === 429)).toHaveLength(10);
  });

  it('por endereço, a rajada de e-mails inventados para nos 20 erros da hora', async () => {
    const env = envSite();
    const status = (await Promise.all(Array.from({ length: 40 }, (_, i) =>
      tentar(env, `ninguem${i}@exemplo.com`, 'errada-123', '10.99.99.3')))).map((r: Response) => r.status);
    expect(status.filter((s: number) => s === 401)).toHaveLength(20);
    expect(status.filter((s: number) => s === 429)).toHaveLength(20);
  });

  it('acertar devolve a vaga: o teto de erros só conta as falhas', async () => {
    const env = envSite();
    const { email } = await comConta(env);
    for (let i = 0; i < 4; i++) expect((await tentar(env, email, 'errada-' + i, '203.0.113.8')).status).toBe(401);
    for (let i = 0; i < 3; i++) expect((await tentar(env, email, 'senha-boa-123', '203.0.113.8')).status).toBe(200);
    /* Quatro erros e três acertos: ainda cabe o quinto erro. */
    expect((await tentar(env, email, 'errada-x', '203.0.113.8')).status).toBe(401);
    expect((await tentar(env, email, 'errada-y', '203.0.113.8')).status).toBe(429);
  });

  it('a senha certa não gasta o orçamento do e-mail', async () => {
    const env = envSite();
    const { email } = await comConta(env);
    for (let i = 0; i < 10; i++) expect((await tentar(env, email, 'senha-boa-123', '203.0.113.9')).status).toBe(200);
    expect(linhas(env, "SELECT key FROM throttle WHERE key LIKE 'login:aluna%'")).toEqual([]);
  });

  it('recusa corpo que não é string sem virar 500', async () => {
    const r = await auth.login({ request: pedido(`${SITE}/api/auth/login`, { email: { toString: 1 }, password: [] }), env: envSite(), ctx });
    expect(r.status).toBe(401);
  });

  /* Quem já estourou o freio por IP não ganha nem a leitura do corpo - nem
     no login, nem no esqueci-a-senha, nem no reset. */
  it.each([
    /* Por HORA desde 24/09/2026 (a cota de escrita do D1 - ver "a cota de
       escrita e o tamanho do banco", mais abaixo). */
    ['login', 'login-h', 60, (env: Record<string, unknown>, r: Request) => auth.login({ request: r, env, ctx })],
    ['forgot', 'forgot-ip-h', 10, (env: Record<string, unknown>, r: Request) => auth.forgot({ request: r, env, ctx })],
    ['reset', 'reset-h', 20, (env: Record<string, unknown>, r: Request) => auth.reset({ request: r, env, ctx })]
  ])('%s: o freio por IP vem antes do corpo', async (rota, chave, teto, chamar) => {
    const env = envSite();
    for (let i = 0; i < teto; i++) await throttled(env, `${chave}:203.0.113.9`, teto, 3_600_000);
    const r = new Request(`${SITE}/api/auth/${rota}`, {
      method: 'POST', body: '{"email":"a@b.co","password":"x","token":"t"}',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' }
    });
    expect((await chamar(env, r)).status).toBe(429);
    /* O corpo continua intocado: a recusa veio antes da leitura. */
    expect(r.bodyUsed).toBe(false);
  });

  /* A Cloudflare manda IPv6 comprimido; a primeira versão cortava antes de
     expandir, e vizinhos do mesmo /64 ganhavam chaves diferentes - ou seja,
     orçamentos separados. */
  it('a chave de IPv6 é o /64 de verdade, expandido', () => {
    const chave = (v: string) => auth.ip(new Request(SITE, { headers: { 'CF-Connecting-IP': v } }));
    expect(chave('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
    expect(chave('2001:db8:0:0:1:2:3:4')).toBe('2001:0db8:0000:0000::/64');
    expect(chave('2001:DB8:0000:0000:ffff:ffff:ffff:ffff')).toBe('2001:0db8:0000:0000::/64');
    expect(chave('2001:db8:0:1::5')).toBe('2001:0db8:0000:0001::/64');
    expect(chave('::1')).toBe('0000:0000:0000:0000::/64');
    expect(chave('::ffff:203.0.113.5')).toBe('203.0.113.5');
    expect(chave('203.0.113.5')).toBe('203.0.113.5');
    expect(chave('')).toBe('unknown');
  });
});

/* ── o cadastro ─────────────────────────────────────────────────────────── */

describe('o cadastro', () => {
  it('recusa e-mail longo demais e com caractere de controle', async () => {
    const env = envSite();
    for (const email of ['a'.repeat(250) + '@x.com', 'a@b\u0000.co', 'a\u0001@b.co', 'ab']) {
      const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, email, password: 'senha-boa-123' }), env, ctx });
      expect(r.status, email).toBe(400);
    }
  });

  it('a trilha guarda o id, nunca o e-mail', async () => {
    const env = envSite();
    await comConta(env);
    const rows = linhas(env, 'SELECT action, detail FROM access_log') as { action: string; detail: string }[];
    expect(rows.some(r => r.action === 'signup')).toBe(true);
    expect(rows.every(r => !r.detail.includes('@'))).toBe(true);
  });
});

/* ── o esqueci-a-senha ──────────────────────────────────────────────────── */

describe('o pedido de senha', () => {
  it('a resposta não muda quando o teto da hora estoura', async () => {
    const env = envSite({ RESEND_API_KEY: 're_x', EMAIL_FROM: 'HF <c@hebraicofluente.com.br>', RESEND_BASE: 'https://api.resend.test' });
    const { email } = await comConta(env);
    let envios = 0;
    vi.stubGlobal('fetch', async () => { envios++; return new Response('{"id":"m"}', { status: 200 }); });
    const esperar: Promise<unknown>[] = [];
    const c = { waitUntil: (p: Promise<unknown>) => { esperar.push(p); } };
    /* Simula cinco pedidos já feitos nesta hora. */
    for (let i = 0; i < 5; i++) await throttled(env, `forgot-h:${email}`, 5, 3_600_000);
    const r = await auth.forgot({ request: pedido(`${SITE}/api/auth/forgot`, { email }), env, ctx: c });
    await Promise.all(esperar);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, enviado: true });
    expect(envios).toBe(0);
    vi.unstubAllGlobals();
  });

  it('a trilha do envio não guarda o endereço', async () => {
    const env = envSite({ RESEND_API_KEY: 're_x', EMAIL_FROM: 'HF <c@hebraicofluente.com.br>', RESEND_BASE: 'https://api.resend.test' });
    const { email } = await comConta(env);
    vi.stubGlobal('fetch', async () => new Response('{"id":"m"}', { status: 200 }));
    const esperar: Promise<unknown>[] = [];
    await auth.forgot({ request: pedido(`${SITE}/api/auth/forgot`, { email }), env, ctx: { waitUntil: (p: Promise<unknown>) => { esperar.push(p); } } });
    await Promise.all(esperar);
    await auth.forgot({ request: pedido(`${SITE}/api/auth/forgot`, { email: 'ninguem@exemplo.com' }), env, ctx: { waitUntil: (p: Promise<unknown>) => { esperar.push(p); } } });
    await Promise.all(esperar);
    const rows = linhas(env, "SELECT action, detail FROM access_log WHERE action LIKE 'forgot%'") as { action: string; detail: string }[];
    expect(rows.map(r => r.action).sort()).toEqual(['forgot-enviado', 'forgot-sem-conta']);
    expect(rows.every(r => !r.detail.includes('@'))).toBe(true);
    vi.unstubAllGlobals();
  });
});

/* ── o e-mail de outra pessoa ──────────────────────────────────────────── */

/* Auditoria de 24/09/2026: qualquer um criava conta com o endereço de
   outra pessoa. O conserto é o e-mail de confirmação (o ciclo inteiro está em
   tests/confirmacao.test.ts); o que fica AQUI é a propriedade que impede o
   conserto de virar um furo novo: o link, clicado sem a sessão da conta, não
   confirma nada - senão a dona do endereço confirmaria a conta do impostor. */
describe('a conta com o e-mail de outra pessoa', () => {
  it('o link de confirmação sem a sessão da conta não confirma nada', async () => {
    let texto = '';
    vi.stubGlobal('fetch', async (_u: string, init?: RequestInit) => {
      texto = JSON.parse(String(init?.body)).text;
      return new Response('{"id":"m"}', { status: 200 });
    });
    try {
      const env = envSite({
        RESEND_API_KEY: 're_x', EMAIL_FROM: 'HF <c@hebraicofluente.com.br>',
        RESEND_BASE: 'https://api.resend.test'
      });
      const { cookie } = await comConta(env, 'vitima@exemplo.com.br');
      const token = decodeURIComponent(texto.match(/\/confirmar-email\/\?token=([^\s]+)/)![1]!);

      const r = await auth.verify({ request: pedido(`${SITE}/api/auth/verify`, { token }), env });
      expect(r.status).toBe(401);
      const me = await auth.me({ request: new Request(`${SITE}/api/me`, { headers: { Cookie: cookie } }), env });
      expect(((await me.json()) as { account: { emailVerified: boolean } }).account.emailVerified).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/* ── liberação e estorno simultâneos ────────────────────────────────────── */

/* Auditoria de 24/09/2026: webhook, tela e varredura liberando o mesmo
   pagamento ao mesmo tempo davam 24 ou 36 meses por 12, e o estorno
   simultâneo recuava duas vezes. A prova é worker/concessao.mjs, que roda o
   pay.js de verdade com as consultas cedendo a vez como numa ida à rede -
   aqui ela entra na suíte, para não depender de alguém lembrar de rodá-la. */
describe('liberação e estorno simultâneos', () => {
  it('worker/concessao.mjs passa inteiro', () => {
    const script = fileURLToPath(new URL('../../worker/concessao.mjs', import.meta.url));
    const saida = execFileSync(process.execPath, [script], { encoding: 'utf8', stdio: 'pipe' });
    expect(saida).toContain('Tudo certo.');
  });
});

/* ── a cota de escrita e o tamanho do banco ─────────────────────────────── */

/* Auditoria de 24/09/2026. No plano gratuito o D1 tem 500 MB e 100.000 linhas
   escritas por dia, e os dois se esgotavam de fora:
     · qualquer conta, sem comprar nada, gravava 512 KB de "progresso" - umas
       mil contas descartáveis enchiam o banco;
     · os freios por minuto deixavam uma máquina só escrever umas 290 linhas
       por minuto em pedidos anônimos, e a cota do dia acabava em seis horas.
   Banco cheio ou cota vencida é toda escrita falhando: cadastro, login,
   pagamento. O que se trava aqui: recusa não escreve nada, e cada rota
   anônima tem um teto por hora. `total_changes()` conta as linhas que o
   SQLite de fato mudou. */
describe('a cota de escrita e o tamanho do banco', () => {
  const escritas = (env: Record<string, unknown>) =>
    Number(((env.DB as { bruto: { prepare(s: string): { get(): unknown } } }).bruto
      .prepare('SELECT total_changes() AS n').get() as { n: number }).n);
  const deIp = (ip: string, url: string, body: unknown) => new Request(url, {
    method: 'POST', headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body)
  });
  /* No começo de uma hora cheia, para que o teste não atravesse a virada da
     janela no meio. */
  beforeEach(() => { vi.useFakeTimers({ now: Date.UTC(2026, 8, 24, 10, 0, 5), toFake: ['Date'] }); });
  afterEach(() => { vi.useRealTimers(); });
  const avancar = (ms: number) => vi.setSystemTime(Date.now() + ms);

  it('conta sem curso não grava progresso, e a recusa não escreve nada', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const antes = escritas(env);
    const r = await progress.write({
      request: new Request(`${SITE}/api/progress`, {
        method: 'PUT', headers: { 'content-type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ state: { version: 2, lixo: 'a'.repeat(400 * 1024) }, rev: 0 })
      }), env, ctx
    });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toBe('sem-curso');
    expect(escritas(env)).toBe(antes);
    expect(linhas(env, 'SELECT * FROM progress')).toEqual([]);
  });

  it('apagar um progresso que não existe não escreve nada', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const antes = escritas(env);
    const r = await progress.drop({
      request: new Request(`${SITE}/api/progress`, { method: 'DELETE', headers: { Cookie: cookie } }),
      env, ctx
    });
    expect(r.status).toBe(200);
    expect(escritas(env)).toBe(antes);
  });

  it('login: vinte erros por hora por endereço, e o vigésimo primeiro não escreve', async () => {
    const env = envSite();
    const tentar = (i: number) => auth.login({
      request: deIp('203.0.113.50', `${SITE}/api/auth/login`, { email: `inventado${i}@exemplo.com`, password: 'errada-123' }),
      env, ctx
    });
    for (let i = 0; i < 20; i++) expect((await tentar(i)).status).toBe(401);
    /* E-mail inventado não vai para a trilha: não é de ninguém. */
    expect(linhas(env, "SELECT * FROM access_log WHERE action = 'login-failed'")).toEqual([]);

    avancar(5 * 60_000);                  /* outro minuto, mesma hora */
    const antes = escritas(env);
    const r = await tentar(99);
    expect(r.status).toBe(429);
    expect(((await r.json()) as { error: string }).error).toBe('rate-limited-hora');
    expect(escritas(env)).toBe(antes);
  });

  it('login: a falha contra uma conta que existe continua na trilha', async () => {
    const env = envSite();
    await comConta(env);
    await auth.login({
      request: deIp('203.0.113.51', `${SITE}/api/auth/login`, { email: 'aluna@exemplo.com.br', password: 'errada-123' }),
      env, ctx
    });
    expect(linhas(env, "SELECT * FROM access_log WHERE action = 'login-failed'")).toHaveLength(1);
  });

  it('cadastro: dez por hora por endereço', async () => {
    const env = envSite();
    const cadastrar = (i: number) => auth.signup({
      request: deIp('203.0.113.52', `${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, email: `nova${i}@exemplo.com`, password: 'senha-boa-123' }),
      env, ctx
    });
    for (let i = 0; i < 10; i++) expect((await cadastrar(i)).status).toBe(200);
    avancar(61_000);
    const antes = escritas(env);
    const r = await cadastrar(99);
    expect(r.status).toBe(429);
    expect(escritas(env)).toBe(antes);
  });

  it('esqueci a senha: dez por hora por endereço', async () => {
    const env = envSite();
    const pedir = (i: number) => auth.forgot({
      request: deIp('203.0.113.53', `${SITE}/api/auth/forgot`, { email: `x${i}@exemplo.com` }),
      env, ctx
    });
    for (let i = 0; i < 10; i++) expect((await pedir(i)).status).toBe(200);
    avancar(61_000);
    const antes = escritas(env);
    expect((await pedir(99)).status).toBe(429);
    expect(escritas(env)).toBe(antes);
  });

  it('rotas da conta: vinte por hora por endereço, somando as contas', async () => {
    /* Conta é de graça, então o freio por conta sozinho não segura nada:
       três contas, trocando a senha com a senha atual errada, do mesmo
       endereço. */
    const env = envSite();
    const contas = [];
    for (let i = 0; i < 3; i++) contas.push(await comConta(env, `conta${i}@exemplo.com`));
    const trocar = (cookie: string) => auth.password({
      request: new Request(`${SITE}/api/auth/password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Cookie: cookie, 'CF-Connecting-IP': '203.0.113.55' },
        body: JSON.stringify({ current: 'errada-123', password: 'nova-senha-123' })
      }), env
    });
    let recusadas = 0;
    for (let i = 0; i < 20; i++) {
      const r = await trocar(contas[i % 3]!.cookie);
      expect(r.status).toBe(401);
    }
    const antes = escritas(env);
    for (const c of contas) if ((await trocar(c.cookie)).status === 429) recusadas++;
    expect(recusadas).toBe(3);
    expect(escritas(env)).toBe(antes);
  });

  it('login: sessenta tentativas por hora, mesmo acertando', async () => {
    const env = envSite();
    await comConta(env, 'laco@exemplo.com');
    const entrar = () => auth.login({
      request: deIp('203.0.113.56', `${SITE}/api/auth/login`, { email: 'laco@exemplo.com', password: 'senha-boa-123' }),
      env, ctx
    });
    for (let i = 0; i < 60; i++) expect((await entrar()).status).toBe(200);
    const antes = escritas(env);
    expect((await entrar()).status).toBe(429);
    expect(escritas(env)).toBe(antes);
  });

  it('aviso de pagamento com assinatura falsa: uma linha por hora, não por pedido', async () => {
    const env = envSite({ MP_WEBHOOK_SECRET: 'segredo' });
    const falso = () => pay.webhook({
      request: new Request(`${SITE}/api/pay/webhook?data.id=123&type=payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.54',
          'x-signature': `ts=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}`, 'x-request-id': 'r' },
        body: '{}'
      }), env, ctx
    });
    expect((await falso()).status).toBe(401);
    const antes = escritas(env);
    for (let i = 0; i < 10; i++) expect((await falso()).status).toBe(401);
    expect(escritas(env)).toBe(antes);
    expect(linhas(env, "SELECT * FROM access_log WHERE action = 'webhook-bad-signature'")).toHaveLength(1);
  });
});

/* ── a saúde ────────────────────────────────────────────────────────────── */

describe('a saúde', () => {
  it('não publica o custo do hash, e tem freio', async () => {
    const env = envSite();
    const req = new Request(`${SITE}/api/health`, { headers: { 'CF-Connecting-IP': '203.0.113.1' } });
    const r = await auth.health({ request: req, env });
    const body = await r.json() as Record<string, unknown>;
    expect(body).not.toHaveProperty('iterations');
    expect(body.ok).toBe(true);
    /* Trinta por hora por endereço (era dez por minuto): cada consulta é uma
       escrita de freio, e a cota diária de escrita do D1 é o que protege. */
    for (let i = 0; i < 29; i++) await auth.health({ request: req, env });
    expect((await auth.health({ request: req, env })).status).toBe(429);
  });

  /* SEC-A-007 (auditoria de 01/10/2026): a rota pública dizia o modo da
     cobrança, de quem era a credencial, se o último e-mail de senha saiu e
     há quantos minutos a varredura rodou. */
  it('para o público, só ok e monitor', async () => {
    const env = envSite({ MP_ACCESS_TOKEN: 'TEST-1234', RESEND_API_KEY: 're_x', EMAIL_FROM: 'a@b.co' });
    const r = await worker.fetch(new Request(`${SITE}/api/health`, { headers: { 'CF-Connecting-IP': '203.0.113.2' } }), env, ctx);
    expect(Object.keys(await r.json() as object).sort()).toEqual(['monitor', 'ok']);
  });

  it('os detalhes só com o ADMIN_TOKEN, e nunca com um token errado ou curto', async () => {
    const env = envSite();
    const com = (auth_: string) => worker.fetch(new Request(`${SITE}/api/health`, {
      headers: { 'CF-Connecting-IP': '203.0.113.3', Authorization: auth_ }
    }), env, ctx).then((r: Response) => r.json() as Promise<Record<string, unknown>>);
    const certo = await com(`Bearer ${env.ADMIN_TOKEN}`);
    for (const k of ['db', 'schema', 'session', 'modo', 'tokenFormato', 'vendedor', 'emailEntregue', 'varredura', 'ok', 'monitor']) {
      expect(certo).toHaveProperty(k);
    }
    expect(Object.keys(await com('Bearer errado')).sort()).toEqual(['monitor', 'ok']);
    expect(Object.keys(await com(`Bearer ${String(env.ADMIN_TOKEN).slice(0, -1)}x`)).sort()).toEqual(['monitor', 'ok']);
    /* Configurado curto demais, não abre nem com ele mesmo. */
    const curto = envSite({ ADMIN_TOKEN: 'curto' });
    const r = await worker.fetch(new Request(`${SITE}/api/health`, { headers: { Authorization: 'Bearer curto' } }), curto, ctx);
    expect(Object.keys(await r.json() as object).sort()).toEqual(['monitor', 'ok']);
  });

  it('a sessão de administrador com o segundo fator também vê os detalhes; aluno não', async () => {
    const env = envSite({ ADMIN_EMAILS: 'dono@exemplo.com', ADMIN_TOKEN: '' });
    const { cookie: aluno } = await comConta(env, 'aluno@exemplo.com');
    const { cookie: dono } = await comConta(env, 'dono@exemplo.com');
    const ver = async (cookie: string) => Object.keys(await (await worker.fetch(new Request(`${SITE}/api/health`, {
      headers: { 'CF-Connecting-IP': '203.0.113.4', Cookie: cookie }
    }), env, ctx)).json() as object);
    expect((await ver(aluno)).sort()).toEqual(['monitor', 'ok']);
    /* Sem o código do e-mail, a senha do dono não basta. */
    expect((await ver(dono)).sort()).toEqual(['monitor', 'ok']);
    expect(await ver(await comoAdmin(env, dono))).toContain('modo');
  });
});

/* ── o pagamento ────────────────────────────────────────────────────────── */

describe('o pagamento', () => {
  beforeEach(() => {
    /* Uma Mercado Pago de mentira que cria um PIX pendente. */
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return new Response(JSON.stringify({
        id: 900001, status: 'pending', external_reference: body.external_reference,
        point_of_interaction: { transaction_data: { qr_code: '000201-teste' } }
      }), { status: 201 });
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('criar pedido tem freio por conta', async () => {
    const env = envSite({ MP_ACCESS_TOKEN: 'APP_USR-1234567890123456-092019-abcdef0123456789abcdef0123456789-123456789' });
    const { cookie } = await comConta(env);
    const status: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'pix' }, { Cookie: cookie, 'CF-Connecting-IP': '203.0.113.5' }), env, ctx });
      status.push(r.status);
    }
    expect(status.slice(0, 6).every(s => s === 200)).toBe(true);
    expect(status.slice(6)).toEqual([429, 429]);
  });

  it('o webhook ignora um id que não é número e não grava nada', async () => {
    const env = envSite({ MP_WEBHOOK_SECRET: 's' });
    const r = await pay.webhook({ request: new Request(`${SITE}/api/pay/webhook?data.id=../../v1/users/me&type=payment`, { method: 'POST' }), env });
    expect(r.status).toBe(200);
    expect(linhas(env, 'SELECT * FROM access_log')).toEqual([]);
  });

  it('assinatura errada em série não vira uma linha por requisição', async () => {
    const env = envSite({ MP_WEBHOOK_SECRET: 's' });
    for (let i = 0; i < 45; i++) {
      const r = await pay.webhook({ request: new Request(`${SITE}/api/pay/webhook?data.id=${1000 + i}&type=payment`, {
        method: 'POST', headers: { 'x-signature': 'ts=1,v1=00', 'CF-Connecting-IP': '203.0.113.8' }
      }), env });
      expect(r.status).toBe(401);
    }
    const conta = linhas(env, "SELECT COUNT(*) AS n FROM access_log WHERE action='webhook-bad-signature'") as { n: number }[];
    expect(conta[0]!.n).toBeLessThanOrEqual(30);
    expect(conta[0]!.n).toBeGreaterThan(0);
  });

  it('a consulta ao provedor recusa um id fora do formato antes de chamar', async () => {
    await expect(() => getPayment({ MP_ACCESS_TOKEN: 'x' }, '../../v1/account/settings')).toThrow();
  });

  /* Um segredo colado de um painel para outro chega com espaço na ponta, e
     às vezes com quebra de linha. Sem aparar, a assinatura não confere
     NUNCA: toda notificação legítima é recusada, e o sintoma aparece dias
     depois como "paguei e não liberou" - com o segredo certo dos dois lados. */
  it('o segredo do webhook é aparado antes de conferir a assinatura', async () => {
    const segredo = 'segredo-do-webhook';
    const id = 987654321;
    const ts = Math.floor(Date.now() / 1000);
    const v1 = await hmacHex(segredo, `id:${id};request-id:r1;ts:${ts};`);
    const aviso = () => new Request(`${SITE}/api/pay/webhook?data.id=${id}&type=payment`, {
      method: 'POST',
      headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'r1' }
    });
    for (const guardado of [segredo, ` ${segredo}`, `${segredo}\n`, `  ${segredo}  `]) {
      expect(await verifyWebhookSignature({ MP_WEBHOOK_SECRET: guardado }, aviso(), id),
        JSON.stringify(guardado)).toBe(true);
    }
    /* E continua recusando o que é outro segredo, não só espaço a mais. */
    expect(await verifyWebhookSignature({ MP_WEBHOOK_SECRET: 'outro' }, aviso(), id)).toBe(false);
    expect(await verifyWebhookSignature({ MP_WEBHOOK_SECRET: '   ' }, aviso(), id)).toBe(false);
  });

  it('o que fica guardado do pagamento não inclui o pagador', async () => {
    const env = envSite();
    const raw = {
      id: 1, status: 'approved', transaction_amount: 132.3, currency_id: 'BRL', external_reference: 'HF1',
      payer: { email: 'x@y.z', identification: { type: 'CPF', number: '00000000000' } },
      card: { last_four_digits: '1234', cardholder: { name: 'Fulano' } }
    };
    expect(Object.keys(enxuto(raw)).sort()).toEqual(['currency_id', 'external_reference', 'id', 'status', 'transaction_amount']);
    await recordEvent(env, { eventId: '1', orderId: 'HF1', status: 'paid', raw, source: 'teste' });
    const [row] = linhas(env, 'SELECT raw FROM payment_events') as { raw: string }[];
    expect(row!.raw).not.toContain('payer');
    expect(row!.raw).not.toContain('1234');
    expect(row!.raw).not.toContain('Fulano');
  });
});

/* ── o progresso ────────────────────────────────────────────────────────── */

describe('o progresso recusa chave que não é dado', () => {
  const salvar = async (env: Record<string, unknown>, cookie: string, state: unknown) =>
    progress.write({
      request: pedido(`${SITE}/api/progress`, { state, rev: 0 }, { Cookie: cookie }), env, ctx
    });
  /* Só quem tem curso guarda progresso no servidor (ver o bloco seguinte). */
  const comConta = async (env: Record<string, unknown>) => {
    const c = await comContaSemCurso(env);
    await grantAccess(env, { accountId: c.id, courseSlug: 'alfabetizacao', orderId: 'TESTE', months: 12 });
    return c;
  };

  it.each([
    ['na raiz', () => JSON.parse('{"version":2,"__proto__":{"admin":true}}')],
    ['no fundo', () => JSON.parse('{"version":2,"licoes":{"alef":{"__proto__":{"x":1}}}}')],
    ['constructor', () => JSON.parse('{"version":2,"constructor":{"x":1}}')],
    ['prototype', () => JSON.parse('{"version":2,"a":{"prototype":1}}')]
  ])('%s → 400, e nada é gravado', async (_n, montar) => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const r = await salvar(env, cookie, montar());
    expect(r.status).toBe(400);
    expect(linhas(env, 'SELECT * FROM progress')).toEqual([]);
  });

  it('o progresso de verdade continua passando', async () => {
    const env = envSite();
    const { cookie } = await comConta(env);
    const r = await salvar(env, cookie, { version: 2, licoes: { alef: { stagesDone: [1, 2] } } });
    expect(r.status).toBe(200);
    expect((linhas(env, 'SELECT rev FROM progress') as { rev: number }[])[0]!.rev).toBe(1);
  });

  /* A fusão do cliente descarta as mesmas três chaves. */
  it('a fusão do app não copia __proto__ para o objeto novo', () => {
    const dia = (xp: number) => ({ answered: 1, units: 1, xp, goalMet: false });
    const sujo = JSON.parse(JSON.stringify({
      version: 2,
      days: { '__proto__': { poluido: true }, '2026-09-20': dia(30) }
    }));
    const limpo = { version: 2, days: { '2026-09-20': dia(10) } };
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const r = mergeStates(sujo as any, limpo as any);
    expect(Object.prototype.hasOwnProperty.call(r.days, '__proto__')).toBe(false);
    expect(({} as Record<string, unknown>).poluido).toBeUndefined();
    expect(r.days['2026-09-20']!.xp).toBe(30);
  });
});

/* ── o presente ─────────────────────────────────────────────────────────── */

describe('um convite não vira acesso sozinho', () => {
  const convidar = (env: Record<string, unknown>, email: string) =>
    inviteCreate(env, { email, courseSlug: 'alfabetizacao', months: 12, note: 'teste' });

  const cadastrar = (env: Record<string, unknown>, email: string, c = ctx) =>
    auth.signup({
      request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Quem', email, password: 'senha-boa-123' }),
      env, ctx: c
    });

  it('quem chega primeiro no endereço presenteado NÃO leva o curso', async () => {
    const env = envSite();
    await convidar(env, 'presenteada@exemplo.com.br');

    /* O impostor sabe o endereço e corre para o cadastro. */
    const r = await cadastrar(env, 'presenteada@exemplo.com.br');
    expect(r.status).toBe(200);
    const { account } = await r.json() as { account: { id: string } };

    expect(await hasEntitlement(env, Number(account.id), 'alfabetizacao'),
      'o convite virou acesso sozinho').toBe(false);
    /* O convite continua esperando o dono decidir. */
    const [convite] = linhas(env, 'SELECT used_at FROM invites') as { used_at: number | null }[];
    expect(convite!.used_at).toBeNull();
  });

  it('o dono é avisado, e o aviso não leva o endereço para a trilha', async () => {
    const env = envSite({
      RESEND_API_KEY: 're_x', EMAIL_FROM: 'HF <c@hebraicofluente.com.br>',
      RESEND_BASE: 'https://api.resend.test', SUPPORT_EMAIL: 'dono@exemplo.com'
    });
    await convidar(env, 'presenteada@exemplo.com.br');

    const enviados: { to: string[]; subject: string; text: string }[] = [];
    vi.stubGlobal('fetch', async (_u: string, init?: RequestInit) => {
      const b = JSON.parse(String(init?.body));
      /* O e-mail de confirmação do cadastro não é o aviso ao dono. */
      if (!String(b.subject).startsWith('Confirme seu e-mail')) enviados.push(b);
      return new Response('{"id":"m"}', { status: 200 });
    });
    const esperar: Promise<unknown>[] = [];
    await cadastrar(env, 'presenteada@exemplo.com.br',
      { waitUntil: (p: Promise<unknown>) => { esperar.push(p); } });
    await Promise.all(esperar);
    vi.unstubAllGlobals();

    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.to).toEqual(['dono@exemplo.com']);
    expect(enviados[0]!.text).toContain('presenteada@exemplo.com.br');
    expect(enviados[0]!.text).toContain('alfabetizacao');

    const trilha = linhas(env, "SELECT action, detail FROM access_log WHERE action = 'convite-aguardando'") as { detail: string }[];
    expect(trilha).toHaveLength(1);
    expect(trilha[0]!.detail).toBe('alfabetizacao');
    expect(trilha[0]!.detail).not.toContain('@');
  });

  it('entrar dez vezes não manda dez avisos', async () => {
    const env = envSite({
      RESEND_API_KEY: 're_x', EMAIL_FROM: 'HF <c@hebraicofluente.com.br>',
      RESEND_BASE: 'https://api.resend.test', SUPPORT_EMAIL: 'dono@exemplo.com'
    });
    let envios = 0;
    vi.stubGlobal('fetch', async (_u: string, init?: RequestInit) => {
      /* Conta só os avisos ao dono, e não a confirmação do cadastro. */
      if (!String(JSON.parse(String(init?.body)).subject).startsWith('Confirme seu e-mail')) envios++;
      return new Response('{"id":"m"}', { status: 200 });
    });
    await convidar(env, 'presenteada@exemplo.com.br');
    await cadastrar(env, 'presenteada@exemplo.com.br');
    for (let i = 0; i < 5; i++) {
      const r = await auth.login({
        request: pedido(`${SITE}/api/auth/login`,
          { email: 'presenteada@exemplo.com.br', password: 'senha-boa-123' }),
        env, ctx
      });
      expect(r.status).toBe(200);
    }
    vi.unstubAllGlobals();
    expect(envios).toBe(1);
  });

  it('sem provedor de e-mail, falha fechada: avisa na trilha e não libera', async () => {
    const env = envSite();
    await convidar(env, 'presenteada@exemplo.com.br');
    const r = await cadastrar(env, 'presenteada@exemplo.com.br');
    const { account } = await r.json() as { account: { id: string } };
    expect(await hasEntitlement(env, Number(account.id), 'alfabetizacao')).toBe(false);
    expect(linhas(env, "SELECT 1 AS x FROM access_log WHERE action = 'convite-aguardando'")).toHaveLength(1);
  });

  it('quem não tem convite nenhum não gera aviso', async () => {
    const env = envSite();
    await comConta(env, 'ninguem@exemplo.com.br');
    expect(linhas(env, "SELECT 1 AS x FROM access_log WHERE action = 'convite-aguardando'")).toEqual([]);
  });
});

/* ── só se oferece o que dá para cobrar ─────────────────────────────────── */

describe('a tela e o servidor concordam sobre as formas de pagamento', () => {
  /* O defeito que isto fecha: em 20/09/2026 a conta da Mercado Pago tinha
     cartão habilitado e PIX não, e o checkout oferecia PIX assim mesmo. Quem
     escolhesse PIX chegava até a chamada ao provedor e recebia um erro. */
  /* ── por que nada aqui afirma "PIX ligado" ────────────────────────────
     A primeira versão destes testes comparava com `{pix: true, cartao:
     true}`, que é o que está no repositório - e quebrou na publicação, que
     foi onde ficou claro o erro: a sonda roda ANTES dos testes e já
     reescreveu o arquivo para o que a conta aceita naquele dia. Um teste que
     só passa enquanto a Mercado Pago está de um certo jeito não testa o
     nosso código, testa a conta deles.
     O que vale em qualquer estado é o CONTRATO: os leitores concordam entre
     si, sobra pelo menos uma forma, e o servidor recusa exatamente as que a
     tela não oferece. */

  it('os leitores da tela concordam entre si', () => {
    expect(formasAtivas()).toEqual([
      ...(temPix() ? ['pix'] : []),
      ...(temCartao() ? ['card'] : [])
    ]);
    /* Um checkout sem forma nenhuma não é um estado válido: seria uma
       página de pagamento sem como pagar. */
    expect(formasAtivas().length).toBeGreaterThan(0);
    const f = empresa.pagamento.formas;
    if (f) {
      expect(typeof f.pix).toBe('boolean');
      expect(typeof f.cartao).toBe('boolean');
    }
  });

  it('a substituição que a sonda faz encontra o bloco no arquivo', async () => {
    const { readFileSync } = await import('node:fs');
    const original = readFileSync(
      new URL('../../data/empresa.json', import.meta.url), 'utf8');

    /* A mesma expressão de scripts/pagamento-ativo.mjs. Copiada de propósito:
       o script roda antes do build, fora do vitest, e o que este teste
       defende é o FORMATO do arquivo - renomear o campo, achatar o objeto ou
       trocar a ordem das chaves faria a substituição virar um no-op
       silencioso, e o PIX voltaria a ser oferecido sem ninguém notar. */
    const RE = /("formas"\s*:\s*\{[^}]*"pix"\s*:\s*)(true|false)([^}]*"cartao"\s*:\s*)(true|false)/;
    expect(RE.test(original), 'a substituição da sonda não casa mais').toBe(true);

    /* E ela troca SÓ as duas, para qualquer combinação. */
    for (const [pix, cartao] of [[false, true], [true, false], [true, true], [false, false]]) {
      const depois = JSON.parse(original.replace(RE, (_m, a, _p, b) => `${a}${pix}${b}${cartao}`));
      expect(depois.pagamento.formas).toEqual({ pix, cartao });
      const antes = JSON.parse(original);
      delete antes.pagamento.formas; delete depois.pagamento.formas;
      expect(depois, 'a substituição mexeu em outra coisa').toEqual(antes);
    }
  });

  it('o servidor recusa exatamente as formas que a tela não oferece', async () => {
    const env = envSite({ MP_ACCESS_TOKEN: 'APP_USR-1234567890123456-092019-abcdef0123456789abcdef0123456789-123456789' });
    const { cookie } = await comConta(env);
    const tentar = (method: string) => pay.create({
      request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method }, { Cookie: cookie }),
      env, ctx
    });

    for (const [method, oferecida, codigo] of [
      ['pix', temPix(), 'pix-off'],
      ['card', temCartao(), 'card-off']
    ] as [string, boolean, string][]) {
      const r = await tentar(method);
      if (oferecida) {
        /* Não é recusada POR ESTE MOTIVO. Pode morrer adiante, na Mercado
           Pago de mentira, e isso é outro assunto. */
        if (r.status === 409) {
          expect(await r.json()).not.toMatchObject({ error: codigo });
        }
      } else {
        expect(r.status, method).toBe(409);
        expect(await r.json()).toMatchObject({ error: codigo });
      }
    }
  });
});

/* ── o `?next=` do login ────────────────────────────────────────────────── */

describe('para onde voltar depois de entrar', () => {
  it('só caminho interno', () => {
    for (const ruim of ['//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example', '/\r/evil.example',
                        'https://evil.example', 'javascript:alert(1)', '']) {
      expect(safeNext(ruim), JSON.stringify(ruim)).toBe('/meu-hebraico');
    }
    expect(safeNext('/licao/alef/')).toBe('/licao/alef/');
    expect(safeNext('/perfil?aba=x')).toBe('/perfil?aba=x');
  });
});

describe('a limpeza das contas de teste acompanha o esquema', () => {
  /* Uma tabela nova que aponte para `accounts` (ou para `orders`) e fique
     fora da limpeza faz o DELETE das contas falhar com "FOREIGN KEY
     constraint failed": a conta de teste fica no banco de produção a cada
     publicação. Foi o que aconteceu quando `password_resets` nasceu. As duas
     listas (a etapa do deploy e a receita que o e2e.sh imprime) são
     conferidas aqui contra o worker/schema.sql. */
  async function ler(caminho: string) {
    const { readFileSync } = await import('node:fs');
    return readFileSync(new URL(caminho, import.meta.url), 'utf8');
  }

  async function tabelasQueApontam() {
    const esquema = await ler('../../worker/schema.sql');
    const tabelas = new Set<string>();
    for (const bloco of esquema.split(/CREATE TABLE IF NOT EXISTS /).slice(1)) {
      const nome = bloco.match(/^(\w+)/)![1]!;
      const corpo = bloco.slice(0, bloco.indexOf(');'));
      if (/REFERENCES\s+(accounts|orders)\s*\(/.test(corpo)) tabelas.add(nome);
    }
    return tabelas;
  }

  function ordemDosDeletes(texto: string) {
    return [...texto.matchAll(/DELETE FROM (\w+)/g)].map((m) => m[1]!);
  }

  it('o esquema tem as tabelas que a limpeza precisa conhecer', async () => {
    const t = await tabelasQueApontam();
    for (const nome of ['entitlements', 'orders', 'password_resets', 'email_verifications',
      'progress', 'registros_acesso', 'arrependimentos']) expect(t).toContain(nome);
  });

  for (const [rotulo, caminho, corte] of [
    ['a etapa do deploy', '../../.github/workflows/deploy-worker.yml', 'Limpar as contas de teste'],
    ['a receita do e2e.sh', '../../worker/e2e.sh', 'LIMPEZA'],
  ] as const) {
    it(`${rotulo} apaga toda tabela que aponta para accounts ou orders, antes delas`, async () => {
      const texto = await ler(caminho);
      const trecho = texto.slice(texto.indexOf(corte));
      const ordem = ordemDosDeletes(trecho);
      const contas = ordem.indexOf('accounts');
      const pedidos = ordem.indexOf('orders');
      expect(contas).toBeGreaterThan(-1);
      for (const nome of await tabelasQueApontam()) {
        const i = ordem.indexOf(nome);
        expect(i, `${nome} fora da limpeza`).toBeGreaterThan(-1);
        expect(i, `${nome} depois de accounts`).toBeLessThan(contas);
      }
      expect(ordem.indexOf('arrependimentos')).toBeLessThan(pedidos);
      expect(ordem, 'access_log fica para trás').toContain('access_log');
      expect(ordem, 'payment_events fica para trás').toContain('payment_events');
    });
  }
});

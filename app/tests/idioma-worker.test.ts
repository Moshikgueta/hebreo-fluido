/* O idioma do lado do servidor (PLANO-INGLES.md, etapa 1).
 * O que estes testes travam:
 *  - a conta nasce com o idioma do site em que foi criada (migração 0004);
 *  - o que a pessoa pede agora (esqueci a senha, confirmação) sai na língua
 *    do site em que ela está;
 *  - o que sai do agendamento, que roda só no Worker brasileiro, sai na
 *    língua da CONTA e com os links do site dela (SITE_ORIGIN_EN);
 *  - no site brasileiro, nada muda: os mesmos e-mails de antes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envDeTeste, pedido } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import { ATIVACAO_DESDE, runAtivacao } from '../../worker/src/ativacao.js';
// @ts-expect-error - idem
import { FORA_DO_SITE_EN, idiomaDaConta, idiomaDoWorker, origemDoIdioma, tituloDoCurso } from '../../worker/src/lib/idioma.js';
// @ts-expect-error - idem
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import { mensagens } from '../../worker/src/lib/mensagens.js';
// @ts-expect-error - idem
import * as pt from '../../worker/src/lib/mail.js';
// @ts-expect-error - idem
import * as en from '../../worker/src/lib/mail-en.js';

const SITE = 'https://hebraicofluente.com.br';
const SITE_EN = 'https://site-em-ingles.example';
const DIA = 86_400_000;
/* O que sai por `waitUntil` (o e-mail de senha) é guardado e esperado. */
const pendentes: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => { pendentes.push(p); } };
const esperarEnvios = async () => { await Promise.all(pendentes.splice(0)); };
type Env = Record<string, unknown> & { DB: { bruto: import('node:sqlite').DatabaseSync } };
type Mail = { to: string; subject: string; text: string; html: string };
let enviados: Mail[];

beforeEach(() => {
  enviados = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (new URL(url).host === 'api.resend.test') {
      const b = JSON.parse(String(init?.body ?? '{}'));
      enviados.push({ to: String(b.to?.[0] ?? ''), subject: b.subject, text: b.text, html: b.html });
      return new Response('{"id":"m1"}', { status: 200 });
    }
    return new Response('{}', { status: 200 });
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

const envCom = (extra: Record<string, unknown> = {}) => envDeTeste({
  RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebraico Fluente <c@hebraicofluente.com.br>',
  RESEND_BASE: 'https://api.resend.test', SUPPORT_EMAIL: 'contato@hebraicofluente.com.br',
  ...extra
}) as Env;

const cadastro = (env: Env, email: string, site = SITE) => auth.signup({
  request: pedido(`${site}/api/auth/signup`,
    { aceitouTermos: true, declarouIdade: true, name: 'Dana', email, password: 'senha-de-teste-1' }),
  env, ctx
});
const idiomaGravado = (env: Env, email: string) =>
  (env.DB.bruto.prepare('SELECT idioma FROM accounts WHERE email = ?').get(email) as { idioma: string }).idioma;

/* Palavras que denunciam um e-mail em inglês que ficou em português. */
const PORTUGUES = /[ãõç]|(^|\s)(não|você|para|uma|com|está|seu|sua)(\s|$)/i;
const TRAVESSAO = new RegExp(`[${String.fromCodePoint(0x2014, 0x2013)}]`);

describe('o idioma do Worker e da conta', () => {
  it('só LOCALE=en faz o Worker em inglês; conta sem a coluna é do site brasileiro', () => {
    expect(idiomaDoWorker({})).toBe('pt');
    expect(idiomaDoWorker({ LOCALE: 'en' })).toBe('en');
    expect(idiomaDaConta({})).toBe('pt');
    expect(idiomaDaConta({ idioma: 'en' })).toBe('en');
  });

  it('os links saem do site da conta, e sem SITE_ORIGIN_EN ficam no SITE_ORIGIN', () => {
    expect(origemDoIdioma({ SITE_ORIGIN: `${SITE}/` }, 'pt')).toBe(SITE);
    expect(origemDoIdioma({ SITE_ORIGIN: SITE, SITE_ORIGIN_EN: SITE_EN }, 'en')).toBe(SITE_EN);
    expect(origemDoIdioma({ SITE_ORIGIN: SITE }, 'en')).toBe(SITE);
    expect(origemDoIdioma({ LOCALE: 'en', SITE_ORIGIN: SITE_EN }, 'en')).toBe(SITE_EN);
  });

  it('o nome do curso em inglês vem do catálogo', () => {
    const curso = { titlePt: 'Alfabetização em Hebraico', titleEn: 'Learn to Read Hebrew' };
    expect(tituloDoCurso(curso, 'pt')).toBe('Alfabetização em Hebraico');
    expect(tituloDoCurso(curso, 'en')).toBe('Learn to Read Hebrew');
    expect(tituloDoCurso({ titlePt: 'Só português' }, 'en')).toBe('Só português');
  });

  it('a conta nasce com o idioma do site em que foi criada', async () => {
    const env = envCom();
    expect((await cadastro(env, 'br@exemplo.com')).status).toBe(200);
    expect(idiomaGravado(env, 'br@exemplo.com')).toBe('pt');

    const envEn = envCom({ LOCALE: 'en', SITE_ORIGIN: SITE_EN });
    expect((await cadastro(envEn, 'us@example.com', SITE_EN)).status).toBe(200);
    expect(idiomaGravado(envEn, 'us@example.com')).toBe('en');
  });
});

describe('os e-mails pedidos agora saem na língua do site', () => {
  it('confirmação e recuperação de senha em inglês no site em inglês', async () => {
    const env = envCom({ LOCALE: 'en', SITE_ORIGIN: SITE_EN });
    await cadastro(env, 'us@example.com', SITE_EN);
    await esperarEnvios();
    const confirmacao = enviados.at(-1)!;
    expect(confirmacao.subject).toBe('Confirm your email - Hebrew Unlocked');
    expect(confirmacao.text).toContain(`${SITE_EN}/confirmar-email/?token=`);

    await auth.forgot({ request: pedido(`${SITE_EN}/api/auth/forgot`, { email: 'us@example.com' }), env, ctx });
    await esperarEnvios();
    const recuperacao = enviados.at(-1)!;
    expect(recuperacao.subject).toBe('Reset your password - Hebrew Unlocked');
    expect(recuperacao.text).toContain(`${SITE_EN}/nova-senha/?token=`);
  });

  it('no site brasileiro, os de sempre', async () => {
    const env = envCom();
    await cadastro(env, 'br@exemplo.com');
    await esperarEnvios();
    expect(enviados.at(-1)!.subject).toBe('Confirme seu e-mail - Hebraico Fluente');
  });
});

describe('o agendamento escreve na língua da conta', () => {
  const exec = (env: Env, sql: string, ...a: unknown[]) => env.DB.bruto.prepare(sql).run(...(a as never[]));
  function conta(env: Env, email: string, idioma: string) {
    const r = exec(env, `INSERT INTO accounts (email, name, pass_hash, pass_salt, created_at, idioma)
                         VALUES (?, 'Dana', 'x', 'y', 1, ?)`, email, idioma);
    return Number(r.lastInsertRowid);
  }
  function compra(env: Env, accountId: number, id: string, pagoEm: number) {
    exec(env, `INSERT INTO orders (id, account_id, course_slug, amount_cents, method, status, created_at, paid_at)
               VALUES (?, ?, 'alfabetizacao', 13230, 'pix', 'paid', ?, ?)`, id, accountId, pagoEm, pagoEm);
  }

  it('o lembrete do dia seguinte: inglês com os links do site em inglês, português com os de cá', async () => {
    /* O Worker brasileiro, que é quem roda o agendamento. */
    const env = envCom({ SITE_ORIGIN: SITE, SITE_ORIGIN_EN: SITE_EN });
    const T0 = ATIVACAO_DESDE + 2 * DIA;
    compra(env, conta(env, 'br@exemplo.com', 'pt'), 'HFBR1', T0);
    compra(env, conta(env, 'us@example.com', 'en'), 'HFUS1', T0);
    await runAtivacao(env, T0 + DIA + 3_600_000);

    const br = enviados.find(m => m.to === 'br@exemplo.com')!;
    const us = enviados.find(m => m.to === 'us@example.com')!;
    expect(br.subject).toBe('Sua primeira letra leva dez minutos');
    expect(br.text).toContain(`${SITE}/inicio/`);
    expect(us.subject).toBe('Your first letter takes ten minutes');
    expect(us.text).toContain('Learn to Read Hebrew');
    expect(us.text).toContain(`${SITE_EN}/inicio/`);
    expect(us.text).not.toContain(SITE);
  });
});

describe('os textos em inglês', () => {
  const amostras = () => {
    const base = { nome: 'Dana', marca: 'Hebraico Fluente', suporte: 'contato@hebraicofluente.com.br' };
    const curso = 'Learn to Read Hebrew';
    const m = mensagens('en');
    return [
      m.recuperacao({ ...base, link: `${SITE_EN}/x`, minutos: 60 }),
      m.confirmacao({ ...base, link: `${SITE_EN}/x`, dias: 7, esqueci: `${SITE_EN}/esqueci-senha/` }),
      m.estorno({ ...base, curso, valor: 'US$ 47.00', pedido: 'HF1', cartao: true }),
      m.estorno({ ...base, curso, valor: 'US$ 47.00', pedido: 'HF1', contestacao: true, restaAte: 'May 1, 2027' }),
      ...['d30', 'd7', 'fim'].map(marco =>
        m.vencimento({ ...base, curso, quando: 'May 1, 2027', dias: marco === 'd7' ? 1 : 30, marco, meses: 12, renovar: `${SITE_EN}/r` })),
      ...['d1', 'd3', 'd7'].flatMap(marco => [0, 1, 4].map(concluidas =>
        m.ativacao({ ...base, curso, marco, concluidas, inicio: 'a', primeira: 'b', painel: 'c' })))
    ] as Mail[];
  };

  it('nada em português, nenhum travessão, e o nome do aluno escapado', () => {
    for (const msg of amostras()) {
      for (const parte of [msg.subject, msg.text, msg.html]) {
        expect(parte, msg.subject).not.toMatch(PORTUGUES);
        expect(parte, msg.subject).not.toMatch(TRAVESSAO);
      }
    }
    const perigoso = mensagens('en').recuperacao({ nome: '<b>x</b>', link: 'l', minutos: 1 });
    expect(perigoso.html).not.toContain('<b>x</b>');
  });

  it('a data em inglês cai no mesmo dia da data brasileira', () => {
    const ms = Date.parse('2027-05-02T01:30:00Z'); // 22h30 de 1º de maio em Brasília
    expect(pt.dataBR(ms)).toBe('01/05/2027');
    expect(en.dataEN(ms)).toBe('May 1, 2027');
  });

  it('em português, as funções são as mesmas de lib/mail.js', () => {
    const m = mensagens('pt');
    expect(m.recuperacao).toBe(pt.mensagemDeRecuperacao);
    expect(m.vencimento).toBe(pt.mensagemDeVencimento);
    expect(m.ativacao).toBe(pt.mensagemDeAtivacao);
    expect(m.data).toBe(pt.dataBR);
  });
});

describe('o que o site em inglês não tem', () => {
  it('os produtos só em português e os painéis do dono ficam de fora; o curso, não', () => {
    for (const fora of ['/raizes', '/raizes/modulo/1/', '/a1/', '/israel/', '/previa/', '/admin/vendas/',
      '/api/admin/vendas', '/api/a1/exame/iniciar', '/api/content/a1', '/api/content/raizes', '/api/livro/licenca']) {
      expect(FORA_DO_SITE_EN.test(fora.replace(/\/+$/, '') || '/'), fora).toBe(true);
    }
    for (const dentro of ['/', '/licao/alef', '/curso-de-hebraico', '/academia', '/api/content', '/api/me',
      '/api/auth/login', '/inicio', '/israeli', '/administrar']) {
      expect(FORA_DO_SITE_EN.test(dentro), dentro).toBe(false);
    }
  });

  it('o Worker em inglês responde 404; o brasileiro segue como antes', async () => {
    const assets = { fetch: async () => new Response('<h1>404</h1>', { status: 200 }) };
    const en = envCom({ LOCALE: 'en', SITE_ORIGIN: SITE_EN, ASSETS: assets });
    const pagina = await worker.fetch(new Request(`${SITE_EN}/raizes/`), en, ctx);
    expect(pagina.status).toBe(404);
    expect(pagina.headers.get('x-content-type-options')).toBe('nosniff');
    const api = await worker.fetch(new Request(`${SITE_EN}/api/content/raizes`), en, ctx);
    expect(api.status).toBe(404);

    const br = envCom({ ASSETS: assets });
    const naoBloqueia = await worker.fetch(new Request(`${SITE}/api/content/raizes`), br, ctx);
    expect(naoBloqueia.status).not.toBe(404);
  });
});

describe('a marca de cada site (04/11/2026)', () => {
  it('o inglês é Hebrew Unlocked, o brasileiro continua Hebraico Fluente', async () => {
    // @ts-expect-error - módulo JS do Worker, sem tipos
    const { marcaDoIdioma } = await import('../../worker/src/lib/idioma.js');
    expect(marcaDoIdioma('en')).toBe('Hebrew Unlocked');
    expect(marcaDoIdioma('pt')).toBe('Hebraico Fluente');
  });
});

/* Os e-mails que a página de venda do site em inglês dispara, em inglês.
 * ─────────────────────────────────────────────────────────────────────────
 * A segunda letra (o Mem), a confirmação da lista de interessados, a
 * sequência de cinco e-mails que vem depois e a resposta automática de
 * contato@ eram só em português: quem fazia o teste grátis do site em inglês
 * recebia o Mem explicado para brasileiros, com preço em reais e PIX.
 *
 *   · o conteúdo sai da lição em inglês (data/en/letters.json), como o do
 *     português sai da lição em português;
 *   · o Worker em inglês (LOCALE = "en") manda em inglês, com o preço em
 *     dólar e os 14 dias do Paddle; o brasileiro continua igual;
 *   · nada de acento (a transliteração do inglês não tem) nem de travessão.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { envDeTeste } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import { runSequencia } from '../../worker/src/sequencia.js';
// @ts-expect-error - idem
import { DIAS_DA_SEQUENCIA } from '../../worker/src/api/interessados.js';
// @ts-expect-error - idem
import { receberEmail } from '../../worker/src/email.js';
// @ts-expect-error - idem
import * as en from '../../worker/src/lib/mail-en.js';
// @ts-expect-error - idem
import { translitEn } from '../../tools/translit-en.mjs';

const SITE = 'https://fluent.example';
const DIA = 86_400_000;
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };
type Env = Record<string, unknown> & { DB: { bruto: import('node:sqlite').DatabaseSync } };
type Mail = { to: string[]; subject: string; text: string; html: string; headers?: Record<string, string> };
let enviados: Mail[];

beforeEach(() => {
  enviados = [];
  vi.stubGlobal('fetch', async (_u: string, init?: RequestInit) => {
    enviados.push(JSON.parse(String(init?.body ?? '{}')));
    return new Response('{"id":"m"}', { status: 200 });
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

const envEn = () => envDeTeste({
  LOCALE: 'en', RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebraico Fluente <hello@fluent.example>',
  SUPPORT_EMAIL: 'hello@fluent.example', SITE_ORIGIN: SITE, CONTATO_DESTINO: 'dono@example.com'
}) as Env;
const post = (env: Env, rota: string, corpo: unknown, ip = '203.0.113.40') => worker.fetch(new Request(`${SITE}${rota}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: SITE, 'CF-Connecting-IP': ip },
  body: JSON.stringify(corpo)
}), env, ctx);

const semMarcas = (s: string) => s.replace(/\{\{|\}\}/g, '');
const ACENTO = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;
const TRACO = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
/* O único acento que fica: o nome do autor do método. */
const semNomes = (s: string) => s.replace(/Damián/g, '');

const fonte = JSON.parse(readFileSync(new URL('../../data/letters.json', import.meta.url), 'utf8'));
const letras = (Array.isArray(fonte) ? fonte : fonte.letters) as Record<string, any>[];
const ingles = JSON.parse(readFileSync(new URL('../../data/en/letters.json', import.meta.url), 'utf8')) as Record<string, { en: string }>;
const em = (caminho: string) => semMarcas(ingles[caminho]!.en);

describe('o conteúdo sai da lição em inglês', () => {
  it('o Mem da segunda letra', () => {
    const mem = letras.find(l => l.id === 'mem')!;
    const L = en.SEGUNDA_LETRA;
    expect(L.letra).toBe(mem.letter);
    expect(L.final).toBe(mem.finalForm);
    expect(L.som).toBe(em('mem/soundNotePt'));
    expect(L.cuidado).toBe(em('mem/brazilianMistake/right'));
    expect(em('mem/ensino/lembrePt')).toBe(`${mem.letter} ${L.fim}`);
    expect(em('mem/didYouKnow').startsWith(L.sabia)).toBe(true);
    for (const [he, t] of L.silabas) {
      expect(mem.syllables.some((s: { he: string; translit: string }) => s.he === he && translitEn(s.translit) === t), he).toBe(true);
    }
    const palavras = [
      ...mem.wordsToRecognize.map((w: Record<string, string>, i: number) => ({ ...w, en: em(`mem/wordsToRecognize/#${i}/pt`) })),
      ...mem.wordsToRead.map((w: Record<string, string>, i: number) => ({ ...w, en: em(`mem/wordsToRead/#${i}/pt`) }))
    ];
    for (const [he, t, sentido] of L.palavras) {
      expect(palavras.some(w => w.he === he && translitEn(w.translit) === t && w.en === sentido), he).toBe(true);
    }
  });

  it('o Tav da sequência', () => {
    const tav = letras.find(l => l.id === 'tav')!;
    const T = en.TERCEIRA_LETRA;
    expect(T.letra).toBe(tav.letter);
    expect(T.som).toBe(em('tav/soundNotePt'));
    for (const [he, t] of T.silabas) {
      expect(tav.syllables.some((s: { he: string; translit: string }) => s.he === he && translitEn(s.translit) === t), he).toBe(true);
    }
    const [he, t, sentido] = T.palavra;
    const i = tav.wordsToRead.findIndex((w: { he: string }) => w.he === he);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(translitEn(tav.wordsToRead[i].translit)).toBe(t);
    expect(em(`tav/wordsToRead/#${i}/pt`)).toBe(sentido);
  });
});

describe('o Worker em inglês manda em inglês', () => {
  it('a segunda letra, com a confirmação da lista, e a sequência inteira', async () => {
    const env = envEn();
    expect((await post(env, '/api/segunda-letra', { email: 'ann@example.com', lista: true })).status).toBe(200);
    const mem = enviados.at(-1)!;
    expect(mem.subject).toBe('The second letter: Mem (מ) - Hebrew Unlocked');
    expect(mem.text).toContain('Here it is.');
    expect(mem.text).toContain('Confirm');
    expect(mem.text).toContain(`${SITE}/curso-de-hebraico/`);

    const link = mem.text.match(/https:\/\/\S+confirmar-lista\/\?t=\S+/)![0];
    await post(env, '/api/interessados/confirmar', { t: decodeURIComponent(new URL(link).searchParams.get('t')!) });
    const c = Number((env.DB.bruto.prepare('SELECT confirmado_em FROM interessados').get() as { confirmado_em: number }).confirmado_em);

    const recebidos: Mail[] = [];
    for (const d of DIAS_DA_SEQUENCIA) {
      enviados = [];
      await runSequencia(env, c + d * DIA + 3_600_000);
      expect(enviados, `dia ${d}`).toHaveLength(1);
      recebidos.push(enviados[0]!);
    }
    expect(recebidos.map(m => m.subject)).toEqual(en.ASSUNTOS_DA_SEQUENCIA);
    /* O preço do catálogo-fonte: o app/content muda de idioma com a build. */
    const catalogo = JSON.parse(readFileSync(new URL('../../data/courses.json', import.meta.url), 'utf8'));
    const usd = (catalogo.courses as { slug: string; price: { usd: number } }[]).find(x => x.slug === 'alfabetizacao')!.price.usd;
    const ultimo = recebidos[4]!.text;
    expect(ultimo).toContain(`$${usd}`);
    /* 7 dias com o Stripe (decisão do dono, 05/11/2026). */
    expect(ultimo).toContain('7 days');
    for (const m of [mem, ...recebidos]) {
      expect(m.text, m.subject).not.toMatch(/R\$|\bPIX\b|Mercado Pago|brasileir|Brazilian/i);
      expect(semNomes(m.text), m.subject).not.toMatch(ACENTO);
      expect(m.text + m.html, m.subject).not.toMatch(TRACO);
      expect(m.html, m.subject).not.toMatch(/<script/i);
    }
  });

  it('a confirmação da lista pela página de espera', async () => {
    const env = envEn();
    await post(env, '/api/interessados', { email: 'bob@example.com', consentiu: true, interesse: 'curso' });
    const m = enviados.at(-1)!;
    expect(m.subject).toBe('Confirm your subscription - Hebrew Unlocked');
    expect(m.text).toContain('the next letters of the alphabet');
  });

  it('a resposta automática de contato@, no domínio do próprio site', async () => {
    const env = envEn();
    const mensagem = (h: Record<string, string>) => ({ from: 'x@y.z', headers: new Headers(h), forward: async () => {} });
    await receberEmail(mensagem({ from: 'Ann <ann@example.com>', subject: 'Refund please' }), env, Date.parse('2026-10-01T18:30:00Z'));
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.subject).toBe('We received your message');
    expect(enviados[0]!.text).toContain('October 1, 2026 at 3:30 pm');
    expect(enviados[0]!.text).toContain('hello@fluent.example');
    /* O próprio contato@ do site em inglês não recebe resposta (laço). */
    await receberEmail(mensagem({ from: 'hello@fluent.example', subject: 'refund' }), env);
    expect(enviados).toHaveLength(1);
  });
});

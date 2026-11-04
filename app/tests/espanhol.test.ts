/* O site em espanhol (PLANO-ESPANHOL.md, 04/11/2026): a terceira língua, na
   mesma estrutura do inglês. O que estes testes travam:
   - a transliteração em espanhol sai de uma conversão só, igual no
     exportador e no app (ch -> j, tch -> ch, j -> zh, dj -> y, ss -> s);
   - o Worker reconhece 'es' como idioma de site e de conta, com Paddle,
     e-mails em espanhol e a mesma lista do que só existe no Brasil;
   - o terceiro Worker serve app/out-es com a mesma lista de ativos. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { translitEs as doApp } from '@/i18n/translit';
// @ts-expect-error - script de build, sem tipos
import { translitEs as doExportador } from '../../tools/translit-es.mjs';
// @ts-expect-error - módulo JS do Worker, sem tipos
import { exterior, FORA_DO_SITE_EN, idiomaDaConta, idiomaDoWorker, origemDoIdioma, tituloDoCurso } from '../../worker/src/lib/idioma.js';
// @ts-expect-error - idem
import { mensagens } from '../../worker/src/lib/mensagens.js';
// @ts-expect-error - idem
import * as en from '../../worker/src/lib/mail-en.js';
// @ts-expect-error - idem
import * as es from '../../worker/src/lib/mail-es.js';
// @ts-expect-error - idem
import { pedeDesistencia, confirmacaoTexto } from '../../worker/src/email.js';

const raiz = (p: string) => new URL(`../../${p}`, import.meta.url);
const ler = (p: string) => JSON.parse(readFileSync(raiz(p), 'utf8'));
const TRAVESSAO = new RegExp(`[${String.fromCodePoint(0x2014, 0x2013)}]`);

function transliteracoes(): string[] {
  const todas = new Set<string>();
  const ir = (no: unknown, chave: string) => {
    if (typeof no === 'string') { if (/^translit/i.test(chave)) todas.add(no); return; }
    if (Array.isArray(no)) no.forEach(x => ir(x, chave));
    else if (no && typeof no === 'object') for (const [k, v] of Object.entries(no)) ir(v, k);
  };
  for (const f of readdirSync(raiz('data')).filter(f => f.endsWith('.json') && !f.startsWith('a1'))) ir(ler(`data/${f}`), '');
  return [...todas];
}

describe('a transliteração em espanhol', () => {
  it('segue a regra', () => {
    const casos: [string, string][] = [
      ['shalóm', 'shalóm'], ['léchem', 'léjem'], ['mishpachá', 'mishpajá'], ['tapúach', 'tapúaj'],
      ['Chanucá', 'Janucá'], ['tchips', 'chips'], ['jakét', 'zhakét'], ['djins', 'yins'],
      ['pidjáma', 'piyáma'], ['késsef', 'késef'], ['Guímel', 'Guímel'], ['malê', 'malé'], ['Hashém', 'Hashém']
    ];
    for (const [pt, esperado] of casos) expect(doExportador(pt), pt).toBe(esperado);
  });

  it('o exportador e o app dão o mesmo resultado em toda transliteração do curso', () => {
    const lista = transliteracoes();
    expect(lista.length).toBeGreaterThan(500);
    for (const t of lista) expect(doApp(t), t).toBe(doExportador(t));
  });

  it('nenhuma transliteração convertida sobra com ch do português, ss, dj ou circunflexo', () => {
    for (const t of transliteracoes()) {
      if (/^professor-/.test(t)) continue;
      const s = doExportador(t);
      /* Todo ch que sobra veio de um tch (צ׳); o ch de ח e כ virou j. */
      if (/ch/i.test(s)) expect(t, t).toMatch(/tch/i);
      expect(s, t).not.toMatch(/ss|dj|[âêô]/i);
    }
  });
});

describe('o Worker em espanhol', () => {
  it('reconhece es no site e na conta; o resto é português', () => {
    expect(idiomaDoWorker({ LOCALE: 'es' })).toBe('es');
    expect(idiomaDoWorker({ LOCALE: 'en' })).toBe('en');
    expect(idiomaDoWorker({})).toBe('pt');
    expect(idiomaDaConta({ idioma: 'es' })).toBe('es');
    expect(idiomaDaConta({ idioma: 'fr' })).toBe('pt');
    expect(exterior('es') && exterior('en') && !exterior('pt')).toBe(true);
  });

  it('os links de uma conta do site em espanhol vão para o site dela', () => {
    const env = { LOCALE: 'pt', SITE_ORIGIN: 'https://hebraicofluente.com.br', SITE_ORIGIN_ES: 'https://es.example/' };
    expect(origemDoIdioma(env, 'es')).toBe('https://es.example');
    expect(origemDoIdioma({ LOCALE: 'es', SITE_ORIGIN: 'https://es.example' }, 'es')).toBe('https://es.example');
  });

  it('o nome do curso em espanhol sai do catálogo', () => {
    const curso = ler('data/courses.json').courses.find((c: { slug: string }) => c.slug === 'alfabetizacao');
    expect(tituloDoCurso(curso, 'es')).toBe('Aprende a leer hebreo');
  });

  it('o site em espanhol também não tem o que só existe no Brasil', () => {
    expect(FORA_DO_SITE_EN.test('/raizes/')).toBe(true);
    const worker = readFileSync(raiz('worker/src/worker.js'), 'utf8');
    expect(worker).toContain("idiomaDoWorker(env) !== 'pt' && FORA_DO_SITE_EN.test(path)");
  });

  it('mail-es.js tem todo e-mail do inglês, e mensagens("es") os usa', () => {
    const nomesEn = Object.keys(en).filter(k => k !== 'dataEN');
    for (const k of nomesEn) expect(typeof es[k], k).toBe(typeof en[k]);
    expect(typeof es.dataES).toBe('function');
    const m = mensagens('es');
    for (const [k, f] of Object.entries(m)) expect(typeof f, k).toBe('function');
    expect(m.recuperacao).toBe(es.mensagemDeRecuperacao);
  });

  it('o arquivo de e-mails em espanhol não tem travessão', () => {
    expect(readFileSync(raiz('worker/src/lib/mail-es.js'), 'utf8')).not.toMatch(TRAVESSAO);
  });

  it('a confirmação automática do contato@ reconhece o pedido em espanhol e responde em espanhol', () => {
    expect(pedeDesistencia('Solicitud de cancelación y reembolso')).toBe(true);
    expect(pedeDesistencia('Quiero mi arrepentimiento')).toBe(true);
    expect(confirmacaoTexto(Date.UTC(2026, 10, 4, 15, 0), 'es', 'x@y.z')).toMatch(/^Hola:/);
  });
});

/* No repositório brasileiro é o wrangler.es.toml; no do site em espanhol
   (Moshikgueta/hebreo-fluido), o próprio wrangler.toml. */
const TOML_ES = existsSync(raiz('wrangler.es.toml')) ? 'wrangler.es.toml' : 'wrangler.toml';

describe(`o Worker do site em espanhol (${TOML_ES})`, () => {
  const toml = readFileSync(raiz(TOML_ES), 'utf8');
  const lista = (s: string) => (s.match(/run_worker_first = \[([\s\S]*?)\]/) || [])[1]?.replace(/\s+/g, '');

  it('serve app/out-es, com LOCALE = "es"', () => {
    expect(toml).toMatch(/directory = "\.\/app\/out-es"/);
    expect(toml).toMatch(/^LOCALE = "es"$/m);
  });

  it('a lista de ativos que saem sem Worker é a de sempre', () => {
    expect(lista(toml)).toBe('"/*","!/_next/static/*","!/fonts/*","!/media/*","!/tracado-amostra/*"');
  });
});

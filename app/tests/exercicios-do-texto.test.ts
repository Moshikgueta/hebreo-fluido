/* Mais exercícios dentro de cada texto (05/11/2026): os que saem das frases
 * do próprio texto (lib/engine/exercicios-do-texto.ts). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { exerciciosDoTexto, SENTIDOS_POR_TEXTO } from '@/lib/engine/exercicios-do-texto';
import { stripNikud } from '@/lib/hebrew';
import type { Texto } from '@/lib/engine/textos';

const TEXTOS = (JSON.parse(readFileSync(new URL('../../data/textos.json', import.meta.url), 'utf8')) as { textos: Texto[] }).textos;
const heDe = (s: string) => [...s.matchAll(/\{\{(.+?)\}\}/g)].map(m => m[1]!);

describe('exercícios a partir das frases do texto', () => {
  it('cada texto ganha pelo menos três, e as conversas ganham o "quem diz"', () => {
    for (const t of TEXTOS) {
      const ex = exerciciosDoTexto(t, `t-${t.modulo}`);
      expect(ex.length, t.tituloPt).toBeGreaterThanOrEqual(SENTIDOS_POR_TEXTO);
      const falantes = new Set(t.linhas.map(l => l.quem).filter(Boolean));
      if (falantes.size >= 2) expect(ex.length, t.tituloPt).toBe(SENTIDOS_POR_TEXTO + 1);
    }
  });

  it('a resposta certa está entre as alternativas, sem repetidas, e confere com o texto', () => {
    for (const t of TEXTOS) {
      for (const e of exerciciosDoTexto(t, `t-${t.modulo}`)) {
        if (e.t !== 'escolha') throw new Error('só escolha');
        expect(new Set(e.opcoes).size).toBe(e.opcoes.length);
        expect(e.certa).toBeGreaterThanOrEqual(0);
        const [he] = heDe(e.q);
        const linha = t.linhas.find(l => (t.semPontos ? stripNikud(l.he) : l.he).trim().replace(/[\s.,!?]+$/u, '') === he)!;
        expect(linha, he).toBeTruthy();
        expect([linha.pt, linha.quem]).toContain(e.opcoes[e.certa]);
      }
    }
  });

  it('só mostra hebraico que o texto já tem, e sem nikud no texto sem pontos', () => {
    for (const t of TEXTOS) {
      const linhas = t.linhas.map(l => (t.semPontos ? stripNikud(l.he) : l.he).trim());
      const semFim = linhas.map(l => l.replace(/[\s.,!?]+$/u, ''));
      for (const e of exerciciosDoTexto(t, `t-${t.modulo}`)) {
        for (const he of heDe(e.q)) expect(semFim).toContain(he);
        for (const he of heDe(e.porque)) expect(linhas).toContain(he);
      }
    }
  });

  it('a mesma semente dá as mesmas perguntas', () => {
    const t = TEXTOS[0]!;
    expect(exerciciosDoTexto(t, 'x')).toEqual(exerciciosDoTexto(t, 'x'));
  });
});

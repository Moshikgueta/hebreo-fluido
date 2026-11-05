/* A corrida das palavras (05/11/2026): lib/engine/corrida.ts. */
import { describe, expect, it } from 'vitest';
import {
  OPCOES_DA_CORRIDA, PALAVRAS_POR_CORRIDA, corridaAberta, opcoesDaCorrida, palavrasDaCorrida, palavrasDasParadas,
  pistaDaCorrida, pontosDoAcerto
} from '@/lib/engine/corrida';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { stripNikud } from '@/lib/hebrew';
import { conteudoPago } from '@/lib/content-servidor';
import { PAGAS } from '@/lib/seo';

const dia = conteudoPago.umDia;
const cardapios = conteudoPago.cardapios;
const letras = conteudoPago.letters;

describe('a corrida das palavras', () => {
  it('junta as paradas, uma vez cada grafia e cada sentido; o cardápio só com as 22', () => {
    const sem22 = palavrasDasParadas(dia, cardapios, false);
    const com22 = palavrasDasParadas(dia, cardapios, true);
    expect(com22.length).toBeGreaterThan(sem22.length);
    for (const lista of [sem22, com22]) {
      expect(new Set(lista.map(w => stripNikud(w.he))).size).toBe(lista.length);
      expect(new Set(lista.map(w => w.pt.toLocaleLowerCase())).size).toBe(lista.length);
      for (const w of lista) expect(w.he && w.translit && w.pt).toBeTruthy();
    }
    /* Os nomes no copo ficam de fora: nome não tem sentido para escolher. */
    const nomes = new Set((dia.copos ?? []).map(n => stripNikud(n.he)));
    expect(com22.some(w => nomes.has(stripNikud(w.he)))).toBe(false);
    /* A mensagem do próprio aluno também. */
    const minhas = new Set((dia.mensagens ?? []).filter(m => m.minha).map(m => m.pt));
    expect(com22.some(w => minhas.has(w.pt))).toBe(false);
  });

  it('a rota é paga', () => {
    expect(PAGAS.some(p => '/um-dia-em-israel/corrida'.startsWith(p))).toBe(true);
  });

  it('a cada letra, só entram palavras que o aluno lê, e as opções também', () => {
    const todas = palavrasDasParadas(dia, cardapios, false);
    const ordem = [...letras].sort((a, b) => a.order - b.order);
    expect(palavrasDaCorrida(todas, [])).toEqual([]);
    for (let n = 1; n <= ordem.length; n++) {
      const ja = ordem.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const prontas = palavrasDaCorrida(todas, ja);
      for (const w of prontas) expect(consegueLer(w.he, alfabeto), w.he).toBe(true);
      if (!corridaAberta(prontas)) continue;
      const pista = pistaDaCorrida(prontas, rng(`p-${n}`));
      expect(pista.length).toBe(Math.min(PALAVRAS_POR_CORRIDA, prontas.length));
      expect(new Set(pista.map(w => w.he)).size).toBe(pista.length);
      for (const w of pista) {
        const ops = opcoesDaCorrida(w, prontas, rng(`o-${n}-${w.he}`));
        expect(ops.length).toBe(OPCOES_DA_CORRIDA);
        expect(new Set(ops).size).toBe(ops.length);
        expect(ops).toContain(w.pt);
        const lidas = new Set(prontas.map(x => x.pt));
        for (const o of ops) expect(lidas.has(o), o).toBe(true);
      }
    }
  });

  it('os pontos: 10 por acerto, mais 2 por acerto seguido, até +10', () => {
    expect([1, 2, 3, 6, 7, 20].map(pontosDoAcerto)).toEqual([10, 12, 14, 20, 20, 20]);
  });
});

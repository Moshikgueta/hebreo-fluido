/* O Pomar das palavras (05/11/2026): lib/engine/pomar.ts. */
import { describe, expect, it } from 'vitest';
import { LADO, OPCOES, PALAVRAS_POR_RODADA, cair, grupos, jogadasDoAcerto, novoTabuleiro, perguntasDoPomar, temJogada, tentarTroca, type Tabuleiro } from '@/lib/engine/pomar';
import { alfabetoDe, consegueLer, palavrasLegiveis, vocabularioDoCurso } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { conteudoPago } from '@/lib/content-servidor';

const letras = conteudoPago.letters;

describe('pomar: as perguntas', () => {
  it('só palavras que o aluno lê, e as alternativas também, a cada letra', () => {
    const vocab = vocabularioDoCurso(letras);
    for (let n = 1; n <= letras.length; n++) {
      const alfabeto = alfabetoDe(letras.slice(0, n));
      const legiveis = palavrasLegiveis(vocab, alfabeto);
      const ps = perguntasDoPomar(legiveis, rng(`p-${n}`));
      const sentidos = new Set(legiveis.map(w => w.pt));
      if (sentidos.size < OPCOES) { expect(ps).toEqual([]); continue; }
      expect(ps.length).toBe(Math.min(PALAVRAS_POR_RODADA, sentidos.size));
      for (const p of ps) {
        expect(consegueLer(p.he, alfabeto), p.he).toBe(true);
        expect(p.opcoes).toHaveLength(OPCOES);
        expect(new Set(p.opcoes).size).toBe(OPCOES);
        expect(p.opcoes).toContain(p.pt);
        for (const o of p.opcoes) expect(sentidos.has(o), o).toBe(true);
      }
      expect(new Set(ps.map(p => p.he)).size).toBe(ps.length);
    }
  });
  it('três acertos seguidos valem duas jogadas', () => {
    expect([1, 2, 3, 4, 5, 6].map(jogadasDoAcerto)).toEqual([1, 1, 2, 1, 1, 2]);
  });
});

describe('pomar: o tabuleiro', () => {
  it('nasce sem grupo pronto e com jogada', () => {
    for (let s = 0; s < 30; s++) {
      const t = novoTabuleiro(rng(`t-${s}`));
      expect(t).toHaveLength(LADO);
      expect(grupos(t).size).toBe(0);
      expect(temJogada(t)).toBe(true);
    }
  });
  it('troca sem grupo não vale; troca não vizinha também não', () => {
    const t = novoTabuleiro(rng('x'));
    expect(tentarTroca(t, [0, 0], [2, 2])).toBeNull();
    let achou = false;
    for (let r = 0; r < LADO && !achou; r++) for (let c = 0; c < LADO - 1 && !achou; c++) {
      const d = tentarTroca(t, [r, c], [r, c + 1]);
      if (d) { achou = true; expect(grupos(d).size).toBeGreaterThan(0); }
    }
  });
  it('a queda tira o grupo, enche o tabuleiro e conta os pontos', () => {
    const t: Tabuleiro = novoTabuleiro(rng('q')).map(l => [...l]);
    t[LADO - 1] = ['roma', 'roma', 'roma', 'uva', 'figo', 'oliva'];
    const g = grupos(t).size;
    const passo = cair(t, 2, rng('q2'));
    expect(passo.pontos).toBe(g * 10 * 2);
    expect(passo.tabuleiro.flat().every(Boolean)).toBe(true);
  });
});

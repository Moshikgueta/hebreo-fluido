/* O que treinar (05/11/2026): lib/engine/temas.ts, o Pomar por tema e a
 * Corrida por tema. */
import { describe, expect, it } from 'vitest';
import { TEMAS, itensDoTema, perguntasDoTema } from '@/lib/engine/temas';
import { OPCOES, PALAVRAS_POR_RODADA, perguntasDoPomarPorTema } from '@/lib/engine/pomar';
import { OPCOES_DA_CORRIDA, PALAVRAS_POR_CORRIDA, palavrasDaCorrida, palavrasDasParadas, pistaDoTema, chaveDoRecorde, CHAVE_DO_RECORDE } from '@/lib/engine/corrida';
import { alfabetoDe, consegueLer, palavrasLegiveis, vocabularioDoCurso } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { conteudoPago } from '@/lib/content-servidor';
import { DICIONARIO, textoDoTema } from '@/i18n/telas/temas';

const letras = [...conteudoPago.letters].sort((a, b) => a.order - b.order);

describe('os temas', () => {
  it('letras: a letra e o nome; sons: a sílaba e a leitura, sem o sheva; palavras e leitura', () => {
    const tres = letras.slice(0, 3);
    const l = itensDoTema('letras', tres, []);
    expect(l.map(i => i.he)).toEqual(tres.map(x => x.letter));
    expect(l.map(i => i.resposta)).toEqual(tres.map(x => x.namePt));
    const s = itensDoTema('sons', tres, []);
    expect(s.length).toBe(tres.flatMap(x => x.syllables.filter(y => y.vowel !== 'sheva')).length);
    expect(s.every(i => i.comPontos)).toBe(true);
    const w = [{ he: 'שָׁלוֹם', translit: 'shalóm', pt: 'paz' }];
    expect(itensDoTema('palavras', [], w)).toEqual([{ he: 'שָׁלוֹם', resposta: 'paz', detalhe: 'shalóm', comPontos: false }]);
    expect(itensDoTema('leitura', [], w)).toEqual([{ he: 'שָׁלוֹם', resposta: 'shalóm', detalhe: 'paz', comPontos: true }]);
  });

  it('perguntas: respostas únicas, opções diferentes com a certa; vazio sem respostas bastantes', () => {
    const itens = itensDoTema('letras', letras, []);
    const qs = perguntasDoTema(itens, 12, 4, rng('t'));
    expect(qs.length).toBe(12);
    expect(new Set(qs.map(q => q.resposta)).size).toBe(qs.length);
    for (const q of qs) {
      expect(q.opcoes.length).toBe(4);
      expect(new Set(q.opcoes).size).toBe(4);
      expect(q.opcoes).toContain(q.resposta);
    }
    expect(perguntasDoTema(itensDoTema('letras', letras.slice(0, 3), []), 12, 4, rng('t'))).toEqual([]);
  });

  it('o Pomar: a cada letra, cada tema só mostra o que o aluno já começou ou já lê', () => {
    const vocab = vocabularioDoCurso(letras);
    for (let n = 1; n <= letras.length; n++) {
      const ja = letras.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const porTema = perguntasDoPomarPorTema(ja, palavrasLegiveis(vocab, alfabeto), rng(`p-${n}`));
      for (const t of TEMAS) {
        const qs = porTema[t];
        expect(qs.length).toBeLessThanOrEqual(PALAVRAS_POR_RODADA);
        for (const q of qs) {
          expect(q.opcoes.length).toBe(OPCOES);
          expect(q.opcoes).toContain(q.pt);
          expect(consegueLer(q.he, alfabeto) || t === 'letras', `${t} ${q.he}`).toBe(true);
        }
      }
      if (n >= 4) expect(porTema.letras.length, `${n} letras`).toBeGreaterThan(0);
    }
  });

  it('a Corrida: cada tema com até 15 perguntas e 4 opções; o recorde das palavras mantém a chave antiga', () => {
    const prontas = palavrasDaCorrida(palavrasDasParadas(conteudoPago.umDia, conteudoPago.cardapios, true), letras);
    for (const t of TEMAS) {
      const pista = pistaDoTema(t, letras, prontas, rng(`c-${t}`));
      expect(pista.length).toBe(PALAVRAS_POR_CORRIDA);
      for (const q of pista) expect(q.opcoes.length).toBe(OPCOES_DA_CORRIDA);
    }
    expect(chaveDoRecorde('palavras')).toBe(CHAVE_DO_RECORDE);
    expect(new Set(TEMAS.map(chaveDoRecorde)).size).toBe(TEMAS.length);
  });

  it('cada tema tem nome, frase e pergunta nas três línguas', () => {
    for (const lingua of Object.values(DICIONARIO)) {
      const t = lingua as unknown as Record<string, string>;
      for (const tema of TEMAS) {
        const K = tema[0]!.toUpperCase() + tema.slice(1);
        expect(t[tema] && t[`${tema}Desc`] && t[`pergunta${K}`], tema).toBeTruthy();
      }
    }
    expect(textoDoTema('sons').nome).toBeTruthy();
  });
});

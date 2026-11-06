/* Montar a palavra (06/11/2026): lib/engine/montar.ts. */
import { describe, expect, it } from 'vitest';
import { PALAVRAS_POR_RODADA, PECAS_MAX, PECAS_MIN, montouCerto, pecasDe, posicoesErradas, rodadaDeMontar } from '@/lib/engine/montar';
import { alfabetoDe, consegueLer, palavrasLegiveis, vocabularioDoCurso } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { stripNikud } from '@/lib/hebrew';
import { conteudoPago } from '@/lib/content-servidor';
import { JOGOS } from '@/app/academia/AcademiaClient';

const letras = [...conteudoPago.letters].sort((a, b) => a.order - b.order);
const vocab = vocabularioDoCurso(letras);

describe('montar a palavra', () => {
  it('as peças: com os pontos, cada letra leva os seus; só as letras, sem nenhum', () => {
    expect(pecasDe('שָׁלוֹם', 'pontos')).toEqual(['שָׁ', 'ל', 'וֹ', 'ם']);
    expect(pecasDe('שָׁלוֹם', 'letras')).toEqual(['ש', 'ל', 'ו', 'ם']);
    expect(pecasDe('בַּיִת', 'pontos').join('')).toBe('בַּיִת'.normalize('NFC'));
  });

  it('conferir: certo só na ordem exata, e as posições erradas apontadas', () => {
    const w = { he: 'אמא', translit: 'íma', pt: 'mãe', pecas: ['א', 'מ', 'א'], banco: ['מ', 'א', 'א', 'ב'] };
    expect(montouCerto(['א', 'מ', 'א'], w)).toBe(true);
    expect(montouCerto(['מ', 'א', 'א'], w)).toBe(false);
    expect(posicoesErradas(['מ', 'א', 'א'], w)).toEqual([0, 1]);
  });

  it('a cada letra, só palavras e peças que o aluno já lê; o banco tem as peças e uma a mais', () => {
    for (let n = 1; n <= letras.length; n++) {
      const ja = letras.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const legiveis = palavrasLegiveis(vocab, alfabeto);
      for (const jeito of ['pontos', 'letras'] as const) {
        const rodada = rodadaDeMontar(legiveis, jeito, rng(`m-${n}-${jeito}`));
        /* A peça a mais sai das peças de palavras que ele lê (um ו pode ser só
           a vogal de uma palavra lida, e sozinho não passa no consegueLer). */
        const pecasLidas = new Set(legiveis.flatMap(w => pecasDe(w.he, jeito)));
        expect(rodada.length).toBeLessThanOrEqual(PALAVRAS_POR_RODADA);
        expect(new Set(rodada.map(w => w.pt)).size).toBe(rodada.length);
        for (const w of rodada) {
          expect(consegueLer(w.he, alfabeto), w.he).toBe(true);
          expect(w.pecas.length).toBeGreaterThanOrEqual(PECAS_MIN);
          expect(w.pecas.length).toBeLessThanOrEqual(PECAS_MAX);
          expect(w.pecas.join('')).toBe(jeito === 'letras' ? stripNikud(w.he) : w.he.normalize('NFC'));
          const sobra = [...w.banco];
          for (const p of w.pecas) sobra.splice(sobra.indexOf(p), 1);
          expect(sobra.length).toBeLessThanOrEqual(1);
          for (const p of sobra) {
            expect(w.pecas).not.toContain(p);
            expect(pecasLidas.has(p), `peça a mais ${p}`).toBe(true);
          }
        }
      }
    }
  });

  it('com o alfabeto inteiro, uma rodada cheia nos dois jeitos, e o jogo está na lista', () => {
    const legiveis = palavrasLegiveis(vocab, alfabetoDe(letras));
    expect(rodadaDeMontar(legiveis, 'pontos', rng('a')).length).toBe(PALAVRAS_POR_RODADA);
    expect(rodadaDeMontar(legiveis, 'letras', rng('b')).length).toBe(PALAVRAS_POR_RODADA);
    expect(JOGOS.montar.titlePt).toBeTruthy();
  });
});

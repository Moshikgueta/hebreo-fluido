/* Ouça e encontre (06/11/2026): lib/engine/ouvir.ts. */
import { describe, expect, it } from 'vitest';
import { PERGUNTAS_POR_RODADA, escritaNoJeito, parecenca, rodadaDeOuvir } from '@/lib/engine/ouvir';
import { alfabetoDe, consegueLer, palavrasLegiveis, vocabularioDoCurso } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { stripNikud } from '@/lib/hebrew';
import { conteudoPago } from '@/lib/content-servidor';
import { AUDIO_MANIFEST } from '@/lib/audio-manifest';
import { JOGOS } from '@/app/academia/AcademiaClient';

const letras = [...conteudoPago.letters].sort((a, b) => a.order - b.order);
const vocab = vocabularioDoCurso(letras);
const gravadas = new Set(AUDIO_MANIFEST);
const temAudio = (id: string) => gravadas.has(id);
const som = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');

describe('ouça e encontre', () => {
  it('as opções erradas parecidas vêm primeiro: com os pontos, as mesmas letras com outros pontos', () => {
    expect(parecenca('שֵׁם', 'שָׁם', 'pontos')).toBeGreaterThan(parecenca('שֵׁם', 'אִמָּא', 'pontos'));
    expect(parecenca('בַּיִת', 'בַּת', 'letras')).toBeGreaterThan(parecenca('בַּיִת', 'אִמָּא', 'letras'));
    expect(escritaNoJeito('שָׁלוֹם', 'letras')).toBe('שלום');
  });

  it('a cada letra: só palavras que ele lê, a ouvida tem gravação, nenhuma errada soa igual, e as quatro são diferentes', () => {
    for (let n = 1; n <= letras.length; n++) {
      const alfabeto = alfabetoDe(letras.slice(0, n));
      const legiveis = palavrasLegiveis(vocab, alfabeto);
      const porEscrita = (jeito: 'pontos' | 'letras') => new Map(legiveis.map(w => [escritaNoJeito(w.he, jeito), w]));
      for (const jeito of ['pontos', 'letras'] as const) {
        const rodada = rodadaDeOuvir(legiveis, jeito, temAudio, rng(`o-${n}-${jeito}`));
        const mapa = porEscrita(jeito);
        expect(rodada.length).toBeLessThanOrEqual(PERGUNTAS_POR_RODADA);
        for (const q of rodada) {
          expect(temAudio(q.audioId), q.he).toBe(true);
          expect(consegueLer(q.he, alfabeto), q.he).toBe(true);
          expect(q.opcoes).toHaveLength(4);
          expect(new Set(q.opcoes).size).toBe(4);
          expect(q.opcoes[q.certa]).toBe(escritaNoJeito(q.he, jeito));
          q.opcoes.forEach((o, k) => {
            if (jeito === 'letras') expect(o).toBe(stripNikud(o));
            const w = mapa.get(o);
            expect(w, `opção ${o} sai de uma palavra lida`).toBeTruthy();
            expect(consegueLer(w!.he, alfabeto), o).toBe(true);
            if (k !== q.certa) expect(som(w!.translit), `${o} soa como ${q.he}`).not.toBe(som(q.translit));
          });
        }
      }
    }
  });

  it('com o alfabeto inteiro, uma rodada cheia nos dois jeitos; sem gravações, nada; e o jogo está na lista', () => {
    const legiveis = palavrasLegiveis(vocab, alfabetoDe(letras));
    expect(rodadaDeOuvir(legiveis, 'pontos', temAudio, rng('a')).length).toBe(PERGUNTAS_POR_RODADA);
    expect(rodadaDeOuvir(legiveis, 'letras', temAudio, rng('b')).length).toBe(PERGUNTAS_POR_RODADA);
    expect(rodadaDeOuvir(legiveis, 'pontos', () => false, rng('c'))).toEqual([]);
    expect(JOGOS.ouvir.titlePt).toBeTruthy();
  });
});

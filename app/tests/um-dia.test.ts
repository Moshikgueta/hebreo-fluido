/* Um dia em Israel (05/11/2026): lib/engine/um-dia.ts, data/um-dia-em-israel.json
 * e as placas desenhadas (components/learn/PlacaDesenhada.tsx). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MISSOES_POR_RODADA, OPCOES_POR_MISSAO, PARADAS, jogoAberto, missoesDaRodada, opcoesDaMissao, placasLegiveis, type PlacaDesenhada } from '@/lib/engine/um-dia';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { temIcone } from '@/components/learn/PlacaDesenhada';
import { conteudoPago } from '@/lib/content-servidor';
import { DICIONARIO } from '@/i18n/telas/academia-um-dia';

const DADOS = (JSON.parse(readFileSync(new URL('../../data/um-dia-em-israel.json', import.meta.url), 'utf8')) as { placas: (PlacaDesenhada & { revisado: boolean })[] }).placas;
const placas = conteudoPago.umDia.placas;
const letras = conteudoPago.letters;

describe('Um dia em Israel', () => {
  it('saem só as placas revisadas, sem a marca, cada uma com ícone', () => {
    expect(placas.map(p => p.id)).toEqual(DADOS.filter(p => p.revisado).map(p => p.id));
    for (const p of placas) {
      expect('revisado' in p).toBe(false);
      expect(temIcone(p.icone), p.id).toBe(true);
    }
  });

  it('toda parada tem nome e frase nas três línguas', () => {
    for (const lingua of Object.values(DICIONARIO)) {
      const t = lingua as unknown as Record<string, string>;
      for (const x of PARADAS) {
        const K = x.id[0]!.toUpperCase() + x.id.slice(1);
        expect(t[`nome${K}`], `${x.id}`).toBeTruthy();
        expect(t[`desc${K}`], `${x.id}`).toBeTruthy();
      }
    }
  });

  it('com nenhuma letra, nenhuma placa; com as 22, todas', () => {
    expect(placasLegiveis(placas, []).prontas).toEqual([]);
    expect(placasLegiveis(placas, letras).prontas.length).toBe(placas.length);
  });

  it('a cada letra, só aparecem placas com letras já ensinadas, e as opções também', () => {
    const ordem = [...letras].sort((a, b) => a.order - b.order);
    for (let n = 1; n <= ordem.length; n++) {
      const ja = ordem.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const { prontas } = placasLegiveis(placas, ja);
      for (const p of prontas) expect(consegueLer(p.he, alfabeto), p.id).toBe(true);
      if (!jogoAberto(prontas)) continue;
      const missoes = missoesDaRodada(prontas, rng(`m-${n}`));
      expect(missoes.length).toBe(Math.min(MISSOES_POR_RODADA, prontas.length));
      expect(new Set(missoes.map(m => m.id)).size).toBe(missoes.length);
      for (const m of missoes) {
        const ops = opcoesDaMissao(m, prontas, rng(`o-${n}-${m.id}`));
        expect(ops.length).toBe(OPCOES_POR_MISSAO);
        expect(ops.map(o => o.id)).toContain(m.id);
        expect(new Set(ops.map(o => o.id)).size).toBe(ops.length);
        for (const o of ops) expect(consegueLer(o.he, alfabeto), o.id).toBe(true);
      }
    }
  });
});

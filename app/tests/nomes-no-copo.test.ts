/* Nome no copo (05/11/2026): lib/engine/copos.ts e data/nomes-no-copo.json. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  COPOS_NO_BALCAO, MINIMO_DE_NOMES, PEDIDOS_POR_RODADA, coposAbertos, coposDoPedido, nomesLegiveis, pedidosDaRodada, type NomeNoCopo
} from '@/lib/engine/copos';
import { PARADAS } from '@/lib/engine/um-dia';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { conteudoPago } from '@/lib/content-servidor';
import { PAGAS } from '@/lib/seo';

const DADOS = (JSON.parse(readFileSync(new URL('../../data/nomes-no-copo.json', import.meta.url), 'utf8')) as { nomes: (NomeNoCopo & { revisado: boolean })[] }).nomes;
const nomes = conteudoPago.umDia.copos ?? [];
const letras = conteudoPago.letters;

describe('o nome no copo', () => {
  it('saem só os nomes revisados, sem a marca, sem repetir', () => {
    expect(nomes.map(n => n.id)).toEqual(DADOS.filter(n => n.revisado).map(n => n.id));
    expect(nomes.length).toBeGreaterThanOrEqual(COPOS_NO_BALCAO);
    expect(new Set(nomes.map(n => n.he)).size).toBe(nomes.length);
    for (const n of nomes) expect(Object.keys(n).sort()).toEqual(['he', 'id', 'translit']);
  });

  it('sem chataf, e daguesh só em בּ/כּ/פּ', () => {
    for (const n of nomes) {
      expect(/[ֱ-ֳ]/u.test(n.he), n.id).toBe(false);
      const comPonto = [...n.he.normalize('NFC').matchAll(/([א-ת])[ְ-ׇֻׁׂ]*ּ/gu)].map(m => m[1]);
      for (const l of comPonto) expect('בכךפףו', `${n.id}: ${l}`).toContain(l);
    }
  });

  it('a parada está no mapa, com rota paga', () => {
    const rota = PARADAS.find(x => x.id === 'copo')?.rota;
    expect(rota).toBe('/um-dia-em-israel/copos');
    expect(PAGAS.some(p => rota!.startsWith(p))).toBe(true);
  });

  it('com nenhuma letra, nenhum nome; com as 22, todos', () => {
    expect(nomesLegiveis(nomes, []).prontos).toEqual([]);
    expect(nomesLegiveis(nomes, letras).prontos.length).toBe(nomes.length);
  });

  it('a cada letra, só aparecem nomes e copos com letras já ensinadas', () => {
    const ordem = [...letras].sort((a, b) => a.order - b.order);
    let abriuEm = 0;
    for (let n = 1; n <= ordem.length; n++) {
      const ja = ordem.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const { prontos } = nomesLegiveis(nomes, ja);
      for (const x of prontos) expect(consegueLer(x.he, alfabeto), x.id).toBe(true);
      if (!coposAbertos(prontos)) continue;
      abriuEm ||= n;
      expect(prontos.length).toBeGreaterThanOrEqual(MINIMO_DE_NOMES);
      const pedidos = pedidosDaRodada(prontos, rng(`p-${n}`));
      expect(pedidos.length).toBe(Math.min(PEDIDOS_POR_RODADA, prontos.length));
      expect(new Set(pedidos.map(x => x.id)).size).toBe(pedidos.length);
      for (const alvo of pedidos) {
        const copos = coposDoPedido(alvo, prontos, rng(`c-${n}-${alvo.id}`));
        expect(copos.length).toBe(Math.min(COPOS_NO_BALCAO, prontos.length));
        expect(copos.map(c => c.id)).toContain(alvo.id);
        expect(new Set(copos.map(c => c.id)).size).toBe(copos.length);
        for (const c of copos) expect(consegueLer(c.he, alfabeto), c.id).toBe(true);
      }
    }
    expect(abriuEm, 'a parada abre antes das 22 letras').toBeLessThan(ordem.length);
  });
});

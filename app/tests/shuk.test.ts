/* O shuk (05/11/2026): lib/engine/shuk.ts, data/shuk.json e os desenhos
 * (components/ilustra/DesenhoDaBanca.tsx). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BANCAS_NA_TELA, OPCOES_DO_TOTAL, PEDIDOS_DO_SHUK, QUILOS_MAX, bancasDoPedido, opcoesDoTotal, pedidosDoShuk, totalDe, type BancaDoShuk
} from '@/lib/engine/shuk';
import { precoPorExtenso } from '@/lib/engine/cardapio';
import { PARADAS } from '@/lib/engine/um-dia';
import { rng } from '@/lib/engine/rng';
import { DESENHOS_DE_BANCA } from '@/components/ilustra/DesenhoDaBanca';
import { conteudoPago } from '@/lib/content-servidor';
import { PAGAS } from '@/lib/seo';

const DADOS = (JSON.parse(readFileSync(new URL('../../data/shuk.json', import.meta.url), 'utf8')) as { bancas: (BancaDoShuk & { revisado: boolean })[] }).bancas;
const bancas = conteudoPago.umDia.shuk ?? [];

describe('o shuk', () => {
  it('saem só as bancas revisadas, sem a marca, cada uma com desenho', () => {
    expect(bancas.map(b => b.id)).toEqual(DADOS.filter(b => b.revisado).map(b => b.id));
    expect(bancas.length).toBeGreaterThanOrEqual(BANCAS_NA_TELA);
    for (const b of bancas) {
      expect('revisado' in b).toBe(false);
      expect(DESENHOS_DE_BANCA[b.desenho], b.id).toBeTruthy();
    }
  });

  it('sem chataf, e daguesh só em בּ/כּ/פּ', () => {
    for (const b of bancas) {
      expect(/[ֱ-ֳ]/u.test(b.he), b.id).toBe(false);
      const comPonto = [...b.he.normalize('NFC').matchAll(/([א-ת])[ְ-ׇֻׁׂ]*ּ/gu)].map(m => m[1]);
      for (const l of comPonto) expect('בכךפףו', `${b.id}: ${l}`).toContain(l);
    }
  });

  it('todo preço e todo total possível cabem por extenso (1 a 99)', () => {
    for (const b of bancas) {
      for (let q = 1; q <= QUILOS_MAX; q++) expect(() => precoPorExtenso(b.preco * q), `${b.id} × ${q}`).not.toThrow();
    }
  });

  it('a parada está no mapa, com rota paga', () => {
    const rota = PARADAS.find(x => x.id === 'shuk')?.rota;
    expect(rota).toBe('/um-dia-em-israel/shuk');
    expect(PAGAS.some(p => rota!.startsWith(p))).toBe(true);
  });

  it('cada rodada: pedidos distintos, bancas na tela com a certa, três totais diferentes com o certo', () => {
    for (let k = 0; k < 40; k++) {
      const pedidos = pedidosDoShuk(bancas, rng(`p-${k}`));
      expect(pedidos.length).toBe(Math.min(PEDIDOS_DO_SHUK, bancas.length));
      expect(new Set(pedidos.map(p => p.banca.id)).size).toBe(pedidos.length);
      for (const p of pedidos) {
        expect(p.quilos).toBeGreaterThanOrEqual(1);
        expect(p.quilos).toBeLessThanOrEqual(QUILOS_MAX);
        const tela = bancasDoPedido(p.banca, bancas, rng(`b-${k}-${p.banca.id}`));
        expect(tela.length).toBe(BANCAS_NA_TELA);
        expect(tela.map(b => b.id)).toContain(p.banca.id);
        expect(new Set(tela.map(b => b.id)).size).toBe(tela.length);
        const ops = opcoesDoTotal(p, rng(`o-${k}-${p.banca.id}`));
        expect(ops.length).toBe(OPCOES_DO_TOTAL);
        expect(new Set(ops).size).toBe(ops.length);
        expect(ops).toContain(totalDe(p));
        for (const v of ops) expect(() => precoPorExtenso(v)).not.toThrow();
      }
    }
  });
});

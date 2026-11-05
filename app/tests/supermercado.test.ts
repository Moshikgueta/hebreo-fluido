/* O supermercado (05/11/2026): lib/engine/supermercado.ts, data/supermercado.json
 * e as embalagens (components/ilustra/DesenhoDoProduto.tsx). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MINIMO_DE_PRODUTOS, NA_LISTA, NA_PRATELEIRA, listaDeCompras, nomeCurto, produtosLegiveis, superAberto, type ProdutoDoSuper
} from '@/lib/engine/supermercado';
import { PARADAS } from '@/lib/engine/um-dia';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { DESENHOS_DE_PRODUTO, FORMAS_DE_PRODUTO } from '@/components/ilustra/DesenhoDoProduto';
import { conteudoPago } from '@/lib/content-servidor';
import { PAGAS } from '@/lib/seo';

const DADOS = (JSON.parse(readFileSync(new URL('../../data/supermercado.json', import.meta.url), 'utf8')) as { produtos: (ProdutoDoSuper & { revisado: boolean })[] }).produtos;
const produtos = conteudoPago.umDia.super ?? [];
const letras = conteudoPago.letters;

describe('o supermercado', () => {
  it('saem só os produtos revisados, sem a marca, cada um com forma e desenho', () => {
    expect(produtos.map(p => p.id)).toEqual(DADOS.filter(p => p.revisado).map(p => p.id));
    expect(produtos.length).toBeGreaterThanOrEqual(NA_PRATELEIRA);
    for (const p of produtos) {
      expect('revisado' in p).toBe(false);
      expect(FORMAS_DE_PRODUTO[p.forma], p.id).toBeTruthy();
      expect(DESENHOS_DE_PRODUTO[p.id], p.id).toBeTruthy();
    }
  });

  it('sem chataf, e daguesh só em בּ/כּ/פּ', () => {
    for (const p of produtos) {
      expect(/[ֱ-ֳ]/u.test(p.he), p.id).toBe(false);
      const comPonto = [...p.he.normalize('NFC').matchAll(/([א-ת])[ְ-ׇֻׁׂ]*ּ/gu)].map(m => m[1]);
      for (const l of comPonto) expect('בכךפףו', `${p.id}: ${l}`).toContain(l);
    }
  });

  it('o nome curto da lista tira a explicação entre parênteses', () => {
    expect(nomeCurto({ id: 'x', forma: 'saco', cor: '#000000', he: 'x', translit: 'x', pt: 'bamba (salgadinho de amendoim)' })).toBe('bamba');
    expect(nomeCurto({ id: 'x', forma: 'saco', cor: '#000000', he: 'x', translit: 'x', pt: 'leite' })).toBe('leite');
  });

  it('a parada está no mapa, com rota paga', () => {
    const rota = PARADAS.find(x => x.id === 'super')?.rota;
    expect(rota).toBe('/um-dia-em-israel/supermercado');
    expect(PAGAS.some(p => rota!.startsWith(p))).toBe(true);
  });

  it('a cada letra, só aparecem produtos com letras já ensinadas; listas de 3 sem repetir, todos na prateleira', () => {
    const ordem = [...letras].sort((a, b) => a.order - b.order);
    expect(produtosLegiveis(produtos, []).prontos).toEqual([]);
    expect(produtosLegiveis(produtos, letras).prontos.length).toBe(produtos.length);
    for (let n = 1; n <= ordem.length; n++) {
      const ja = ordem.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const { prontos } = produtosLegiveis(produtos, ja);
      for (const p of prontos) expect(consegueLer(p.he, alfabeto), p.id).toBe(true);
      if (!superAberto(prontos)) continue;
      expect(prontos.length).toBeGreaterThanOrEqual(MINIMO_DE_PRODUTOS);
      for (let k = 0; k < 5; k++) {
        const { lista, prateleira } = listaDeCompras(prontos, rng(`l-${n}-${k}`));
        expect(lista.length).toBe(NA_LISTA);
        expect(new Set(lista.map(p => p.id)).size).toBe(NA_LISTA);
        expect(prateleira.length).toBe(Math.min(NA_PRATELEIRA, prontos.length));
        expect(new Set(prateleira.map(p => p.id)).size).toBe(prateleira.length);
        for (const p of lista) expect(prateleira.map(x => x.id)).toContain(p.id);
        for (const p of prateleira) expect(consegueLer(p.he, alfabeto), p.id).toBe(true);
      }
    }
  });
});

/* O supermercado (05/11/2026): a parada das 15h de Um dia em Israel.
 * ─────────────────────────────────────────────────────────────────────────
 * Uma prateleira de supermercado: cada embalagem tem o nome em hebraico no
 * rótulo. Duas coisas na parada:
 *   · ver a prateleira: tocar numa embalagem mostra os pontos, a leitura e o
 *     sentido;
 *   · fazer as compras: uma lista de três produtos em português, as
 *     embalagens perdem a cor e o desenho, e o aluno pega cada um só pelo
 *     rótulo.
 *
 * A régua é a das placas: um produto só aparece quando o aluno já lê todas
 * as letras dele, e a prateleira do jogo também. Nada aqui conta nota ou XP. */

import type { Letter } from '@/lib/content';
import { alfabetoDe, consegueLer } from './palavras';
import { shuffled, type Rand } from './rng';

export type ProdutoDoSuper = { id: string; forma: string; cor: string; he: string; translit: string; pt: string };

/** Listas por rodada. */
export const LISTAS_POR_RODADA = 4;
/** Produtos em cada lista. */
export const NA_LISTA = 3;
/** Embalagens na prateleira do jogo, no máximo. */
export const NA_PRATELEIRA = 8;
/** A parada abre com a lista e ao menos dois produtos para confundir. */
export const MINIMO_DE_PRODUTOS = NA_LISTA + 2;

export function produtosLegiveis(produtos: readonly ProdutoDoSuper[], concluidas: readonly Letter[]) {
  const alfabeto = alfabetoDe(concluidas);
  const prontos = produtos.filter(p => consegueLer(p.he, alfabeto));
  return { prontos, faltam: produtos.length - prontos.length };
}

export const superAberto = (prontos: readonly ProdutoDoSuper[]) => prontos.length >= MINIMO_DE_PRODUTOS;

/** O nome curto para a lista: "bamba (salgadinho de amendoim)" vira "bamba". */
export const nomeCurto = (p: ProdutoDoSuper) => p.pt.replace(/\s*\(.*\)\s*$/u, '');

export type ListaDeCompras = { lista: ProdutoDoSuper[]; prateleira: ProdutoDoSuper[] };

/** Uma lista de compras e a prateleira dela: os três da lista e outros que o
 *  aluno lê, sem repetir, até NA_PRATELEIRA. */
export function listaDeCompras(prontos: readonly ProdutoDoSuper[], rand: Rand = Math.random): ListaDeCompras {
  const lista = shuffled(prontos, rand).slice(0, NA_LISTA);
  const outros = shuffled(prontos.filter(p => !lista.includes(p)), rand).slice(0, NA_PRATELEIRA - NA_LISTA);
  return { lista, prateleira: shuffled([...lista, ...outros], rand) };
}

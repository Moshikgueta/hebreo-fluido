/* O shuk (05/11/2026): a parada das 12h de Um dia em Israel.
 * ─────────────────────────────────────────────────────────────────────────
 * Um corredor do mercado: cada banca tem o nome escrito à mão e o preço do
 * quilo, por extenso, como o dono do curso pediu para todo preço
 * (lib/engine/cardapio.ts, `precoPorExtenso`). Duas coisas na parada:
 *   · passear no shuk: tocar numa banca mostra os pontos, a leitura e o
 *     sentido;
 *   · fazer as compras: a lista vem em português ("2 quilos de tomates"), os
 *     desenhos somem, o aluno acha a banca pelo hebraico e escolhe o total,
 *     também por extenso.
 *
 * Os preços por extenso pedem quase o alfabeto inteiro, e por isso o shuk
 * abre com as 22 letras, como o café. Os preços são exemplos, não preços de
 * um mercado real. Nada aqui conta nota ou XP. */

import { shuffled, type Rand } from './rng';

export type BancaDoShuk = { id: string; desenho: string; he: string; translit: string; pt: string; preco: number };
export type PedidoDoShuk = { banca: BancaDoShuk; quilos: number };

/** Clientes por rodada. */
export const PEDIDOS_DO_SHUK = 6;
/** Bancas na tela em cada pedido, no máximo. */
export const BANCAS_NA_TELA = 6;
/** No máximo 3 quilos: o total (preço vezes quilos) fica entre 1 e 99. */
export const QUILOS_MAX = 3;
export const OPCOES_DO_TOTAL = 3;

export function pedidosDoShuk(bancas: readonly BancaDoShuk[], rand: Rand = Math.random): PedidoDoShuk[] {
  return shuffled(bancas, rand).slice(0, Math.min(PEDIDOS_DO_SHUK, bancas.length))
    .map(banca => ({ banca, quilos: 1 + Math.floor(rand() * QUILOS_MAX) }));
}

/** As bancas na tela num pedido: a certa e outras, sem repetir. */
export function bancasDoPedido(alvo: BancaDoShuk, bancas: readonly BancaDoShuk[], rand: Rand = Math.random): BancaDoShuk[] {
  const outras = shuffled(bancas.filter(b => b.id !== alvo.id), rand).slice(0, BANCAS_NA_TELA - 1);
  return shuffled([alvo, ...outras], rand);
}

export const totalDe = (p: PedidoDoShuk) => p.banca.preco * p.quilos;

/** As opções de total: o certo e dois erros de conta comuns (o preço de um
 *  quilo só, um quilo a mais), todos entre 1 e 99 e sem repetir. */
export function opcoesDoTotal(p: PedidoDoShuk, rand: Rand = Math.random): number[] {
  const certo = totalDe(p);
  const candidatos = [p.banca.preco, p.banca.preco * (p.quilos + 1), certo + p.banca.preco, certo - 1, certo + 2, certo - 2, certo + 3]
    .filter(v => v >= 1 && v <= 99 && v !== certo);
  const erradas = [...new Set(candidatos)];
  const duas = [...shuffled(erradas.slice(0, 3), rand), ...erradas.slice(3)].slice(0, OPCOES_DO_TOTAL - 1);
  return shuffled([certo, ...duas], rand);
}

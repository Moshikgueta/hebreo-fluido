/* Nome no copo (05/11/2026): a parada das 10h30 de Um dia em Israel.
 * ─────────────────────────────────────────────────────────────────────────
 * No café, o barista escreve o nome do cliente no copo, à mão e sem os
 * pontos. Duas coisas na parada:
 *   · ler os copos: os nomes que o aluno já lê; tocar mostra os pontos e a
 *     leitura;
 *   · o jogo: o barista chama um nome (em letras latinas) e o aluno acha o
 *     copo pelo hebraico, entre copos com nomes que ele já lê.
 *
 * A régua é a das placas: um nome só aparece quando o aluno já lê todas as
 * letras dele. Nada aqui conta nota ou XP. */

import type { Letter } from '@/lib/content';
import { alfabetoDe, consegueLer } from './palavras';
import { shuffled, type Rand } from './rng';

export type NomeNoCopo = { id: string; he: string; translit: string };

/** Pedidos por rodada, no máximo. */
export const PEDIDOS_POR_RODADA = 8;
/** Copos no balcão em cada pedido, no máximo: o certo e mais cinco. */
export const COPOS_NO_BALCAO = 6;
/** O jogo abre com nomes legíveis bastantes para um balcão de verdade. */
export const MINIMO_DE_NOMES = 4;

export function nomesLegiveis(nomes: readonly NomeNoCopo[], concluidas: readonly Letter[]) {
  const alfabeto = alfabetoDe(concluidas);
  const prontos = nomes.filter(n => consegueLer(n.he, alfabeto));
  return { prontos, faltam: nomes.length - prontos.length };
}

export const coposAbertos = (prontos: readonly NomeNoCopo[]) => prontos.length >= MINIMO_DE_NOMES;

export function pedidosDaRodada(prontos: readonly NomeNoCopo[], rand: Rand = Math.random): NomeNoCopo[] {
  return shuffled(prontos, rand).slice(0, Math.min(PEDIDOS_POR_RODADA, prontos.length));
}

/** Os copos do balcão num pedido: o certo e outros que o aluno lê, sem repetir. */
export function coposDoPedido(alvo: NomeNoCopo, prontos: readonly NomeNoCopo[], rand: Rand = Math.random): NomeNoCopo[] {
  const outros = shuffled(prontos.filter(n => n.id !== alvo.id), rand).slice(0, COPOS_NO_BALCAO - 1);
  return shuffled([alvo, ...outros], rand);
}

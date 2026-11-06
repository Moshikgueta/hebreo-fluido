/* Montar a palavra (06/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Os outros jogos pedem para RECONHECER entre opções; este pede para
 * CONSTRUIR. Aparece o sentido da palavra ("casa") e, embaixo, as peças dela
 * embaralhadas, com uma peça a mais para confundir. O aluno põe as peças em
 * ordem, da direita para a esquerda, e a palavra se ergue como um muro.
 *
 * Dois jeitos:
 *   · com os pontos (mais fácil): cada peça é uma letra com os seus pontos
 *     (בַּ, יִ, ת); montar é ler sílaba por sílaba;
 *   · só as letras (mais difícil): as peças são as letras sem os pontos, e a
 *     palavra é montada como se escreve em Israel.
 *
 * As palavras são as do curso que o aluno JÁ lê, e a peça a mais também vem
 * de uma palavra que ele lê: nenhuma letra antes de ser ensinada. Aqui só as
 * regras, sem tela. */

import type { PalavraDoCurso } from './palavras';
import { shuffled, type Rand } from './rng';
import { stripNikud } from '@/lib/hebrew';

export type JeitoDeMontar = 'pontos' | 'letras';
export type PalavraParaMontar = { he: string; translit: string; pt: string; pecas: string[]; banco: string[] };

export const PALAVRAS_POR_RODADA = 8;
/** Palavras curtas o bastante para caber numa linha de peças no celular. */
export const PECAS_MIN = 2;
export const PECAS_MAX = 6;

/** As peças de uma palavra: cada letra com os pontos que vêm logo depois
 *  dela (com os pontos) ou a letra sozinha (só as letras). */
export function pecasDe(he: string, jeito: JeitoDeMontar): string[] {
  const texto = jeito === 'letras' ? stripNikud(he) : he.normalize('NFC');
  return [...texto.matchAll(/[א-ת][֑-ׇ]*/gu)].map(m => m[0]);
}

/** Uma palavra só (sem espaço nem maqaf), com sentido e de tamanho que cabe. */
const serve = (w: PalavraDoCurso, jeito: JeitoDeMontar) => {
  if (!w.pt || /[\s־-]/u.test(w.he)) return false;
  const n = pecasDe(w.he, jeito).length;
  return n >= PECAS_MIN && n <= PECAS_MAX;
};

/** Até 8 palavras, cada uma com as peças certas e o banco embaralhado (as
 *  peças mais uma de outra palavra legível, que não esteja já no banco).
 *  Vazio quando não há palavras bastantes para uma rodada. */
export function rodadaDeMontar(legiveis: readonly PalavraDoCurso[], jeito: JeitoDeMontar, rand: Rand): PalavraParaMontar[] {
  const porSentido = new Map<string, PalavraDoCurso>();
  for (const w of legiveis) if (serve(w, jeito) && !porSentido.has(w.pt!)) porSentido.set(w.pt!, w);
  const unicas = [...porSentido.values()];
  if (unicas.length < 4) return [];
  const todasAsPecas = [...new Set(unicas.flatMap(w => pecasDe(w.he, jeito)))];
  return shuffled(unicas, rand).slice(0, PALAVRAS_POR_RODADA).map(w => {
    const pecas = pecasDe(w.he, jeito);
    const fora = shuffled(todasAsPecas.filter(p => !pecas.includes(p)), rand)[0];
    return { he: w.he, translit: w.translit, pt: w.pt!, pecas, banco: shuffled(fora ? [...pecas, fora] : pecas, rand) };
  });
}

/** Montou certo? Compara o que foi montado com a palavra, peça por peça. */
export const montouCerto = (montadas: readonly string[], palavra: PalavraParaMontar) =>
  montadas.length === palavra.pecas.length && montadas.every((p, i) => p === palavra.pecas[i]);

/** As posições erradas, para marcar de vermelho. */
export const posicoesErradas = (montadas: readonly string[], palavra: PalavraParaMontar) =>
  montadas.map((p, i) => (p !== palavra.pecas[i] ? i : -1)).filter(i => i >= 0);

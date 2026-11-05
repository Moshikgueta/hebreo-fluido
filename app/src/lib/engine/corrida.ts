/* A corrida das palavras (05/11/2026): a revisão rápida de Um dia em Israel.
 * ─────────────────────────────────────────────────────────────────────────
 * As palavras das paradas (placas, cartões, trem, shuk, supermercado,
 * mensagens e, com as 22 letras, o cardápio), sem os pontos. Uma palavra por
 * vez, quatro sentidos, seis segundos com o relógio (ou sem relógio, no
 * ritmo do aluno). Acertos seguidos valem mais. Os nomes no copo ficam de
 * fora: nome não tem sentido para escolher.
 *
 * A régua é a das placas: só entra palavra que o aluno já lê inteira, e as
 * opções também. O recorde fica no aparelho, e nada vai para o progresso. */

import type { Letter } from '@/lib/content';
import type { Cardapio } from './cardapio';
import type { DadosDoDia } from './um-dia';
import { nomeCurto } from './supermercado';
import { alfabetoDe, consegueLer } from './palavras';
import { shuffled, type Rand } from './rng';
import { stripNikud } from '@/lib/hebrew';

export type PalavraDaCorrida = { he: string; translit: string; pt: string };

export const PALAVRAS_POR_CORRIDA = 15;
export const OPCOES_DA_CORRIDA = 4;
export const SEGUNDOS_POR_PALAVRA = 6;
/** O recorde fica no aparelho (o relógio é pessoal; o progresso não muda). */
export const CHAVE_DO_RECORDE = 'hf-corrida-recorde';

/** Todas as palavras das paradas, uma vez cada grafia e cada sentido. */
export function palavrasDasParadas(dia: DadosDoDia, cardapios: readonly Cardapio[], com22: boolean): PalavraDaCorrida[] {
  const fontes: PalavraDaCorrida[] = [
    ...dia.placas,
    ...(dia.cartoes ?? []),
    ...(dia.trem ?? []),
    ...(dia.shuk ?? []),
    ...(dia.super ?? []).map(p => ({ ...p, pt: nomeCurto(p) })),
    ...(dia.mensagens ?? []).filter(m => !m.minha),
    ...(com22 ? cardapios.flatMap(c => c.itens) : [])
  ].map(({ he, translit, pt }) => ({ he, translit, pt }));
  const grafias = new Set<string>();
  const sentidos = new Set<string>();
  const out: PalavraDaCorrida[] = [];
  for (const w of fontes) {
    const g = stripNikud(w.he);
    const s = w.pt.toLocaleLowerCase();
    if (grafias.has(g) || sentidos.has(s)) continue;
    grafias.add(g); sentidos.add(s);
    out.push(w);
  }
  return out;
}

export function palavrasDaCorrida(todas: readonly PalavraDaCorrida[], concluidas: readonly Letter[]): PalavraDaCorrida[] {
  const alfabeto = alfabetoDe(concluidas);
  return todas.filter(w => consegueLer(w.he, alfabeto));
}

export const corridaAberta = (prontas: readonly PalavraDaCorrida[]) => prontas.length >= OPCOES_DA_CORRIDA;

export function pistaDaCorrida(prontas: readonly PalavraDaCorrida[], rand: Rand = Math.random): PalavraDaCorrida[] {
  return shuffled(prontas, rand).slice(0, Math.min(PALAVRAS_POR_CORRIDA, prontas.length));
}

export function opcoesDaCorrida(alvo: PalavraDaCorrida, prontas: readonly PalavraDaCorrida[], rand: Rand = Math.random): string[] {
  const outros = prontas.filter(w => w.pt !== alvo.pt).map(w => w.pt);
  return shuffled([alvo.pt, ...shuffled(outros, rand).slice(0, OPCOES_DA_CORRIDA - 1)], rand);
}

/** Os pontos de um acerto: 10, e mais 2 por acerto seguido, até +10. */
export const pontosDoAcerto = (seguidas: number) => 10 + Math.min(Math.max(seguidas - 1, 0), 5) * 2;

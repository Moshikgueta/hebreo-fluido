/* Mensagens do Dani (05/11/2026): a parada das 18h de Um dia em Israel.
 * ─────────────────────────────────────────────────────────────────────────
 * O Dani é um amigo israelense inventado, e escreve como se escreve no
 * celular: sem os pontos. Duas coisas na parada:
 *   · ler a conversa: tocar numa mensagem mostra os pontos, a leitura e o
 *     sentido;
 *   · responder ao Dani: a mensagem chega depois do "digitando...", e o
 *     aluno escolhe o que ela quer dizer, entre três sentidos.
 *
 * A régua é a das placas: uma mensagem só aparece quando o aluno já lê todas
 * as letras dela, e as opções vêm só de mensagens que ele lê. Nada aqui conta
 * nota ou XP. */

import type { Letter } from '@/lib/content';
import { alfabetoDe, consegueLer } from './palavras';
import { shuffled, type Rand } from './rng';

export type MensagemDoDani = { id: string; he: string; translit: string; pt: string; hora: string; minha?: boolean };

export const MENSAGENS_POR_RODADA = 8;
export const OPCOES_DA_MENSAGEM = 3;
/** A parada abre com mensagens legíveis bastantes para as opções e uma conversa. */
export const MINIMO_DE_MENSAGENS = 4;
/** Quanto tempo o Dani fica "digitando" antes da mensagem chegar. */
export const DIGITANDO_MS = 600;

export function mensagensLegiveis(mensagens: readonly MensagemDoDani[], concluidas: readonly Letter[]) {
  const alfabeto = alfabetoDe(concluidas);
  const prontas = mensagens.filter(m => consegueLer(m.he, alfabeto));
  return { prontas, faltam: mensagens.length - prontas.length };
}

export const mensagensAbertas = (prontas: readonly MensagemDoDani[]) => prontas.filter(m => !m.minha).length >= MINIMO_DE_MENSAGENS;

/** As mensagens de uma rodada: só as do Dani (a do aluno não se pergunta "o
 *  que o Dani quis dizer"), sorteadas e postas na ordem do relógio, para a
 *  conversa nunca andar para trás. */
export function conversaDaRodada(prontas: readonly MensagemDoDani[], rand: Rand = Math.random): MensagemDoDani[] {
  const doDani = prontas.filter(m => !m.minha);
  return shuffled(doDani, rand).slice(0, Math.min(MENSAGENS_POR_RODADA, doDani.length))
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

/** Os sentidos de uma pergunta: o certo e dois de outras mensagens que o aluno
 *  lê, sem repetir. */
export function opcoesDaMensagem(alvo: MensagemDoDani, prontas: readonly MensagemDoDani[], rand: Rand = Math.random): string[] {
  const outros = [...new Set(prontas.filter(m => m.id !== alvo.id).map(m => m.pt))].filter(pt => pt !== alvo.pt);
  return shuffled([alvo.pt, ...shuffled(outros, rand).slice(0, OPCOES_DA_MENSAGEM - 1)], rand);
}

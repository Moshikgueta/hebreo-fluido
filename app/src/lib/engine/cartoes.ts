/* Cartões de festa (05/11/2026): a última parada de Um dia em Israel.
 * ─────────────────────────────────────────────────────────────────────────
 * Os cartões que todo israelense escreve: nas festas, no aniversário, na
 * doença e na chegada. Três coisas na parada:
 *   · ler os cartões, com o desenho;
 *   · o jogo "Qual cartão?": a situação vem em português, os desenhos somem
 *     e o aluno escolhe o cartão pelo hebraico;
 *   · mandar um cartão a um amigo: o aluno escolhe o cartão e escreve os
 *     nomes, o servidor assina (worker/src/api/cartao.js) e o aluno manda o
 *     link ele mesmo, pelo WhatsApp ou por onde quiser. O site não manda nada.
 *
 * A régua é a das placas: um cartão só aparece quando o aluno já lê todas as
 * letras dele. Nada aqui conta nota ou XP. */

import type { Letter } from '@/lib/content';
import { alfabetoDe, consegueLer } from './palavras';
import { shuffled, type Rand } from './rng';

export type CartaoDeFesta = {
  id: string; he: string; translit: string; pt: string;
  /** A situação do jogo: "Sua amiga faz aniversário hoje. Que cartão você manda?" */
  situacaoPt: string;
  /** O desenho em components/ilustra/DesenhoDoCartao.tsx. */
  desenho: string;
  cor: string;
};

/** O que o link de um cartão carrega, depois de conferido pelo servidor. */
export type CartaoRecebido = { cartao: Omit<CartaoDeFesta, 'situacaoPt'>; para: string; de: string };

export const OPCOES_DE_CARTAO = 4;
export const RODADAS_DE_CARTAO = 8;
/** O maior nome que cabe no cartão. O servidor confere o mesmo. */
export const NOME_MAX = 24;

export function cartoesLegiveis(cartoes: readonly CartaoDeFesta[], concluidas: readonly Letter[]) {
  const alfabeto = alfabetoDe(concluidas);
  const prontos = cartoes.filter(c => consegueLer(c.he, alfabeto));
  return { prontos, faltam: cartoes.length - prontos.length };
}

/** A parada abre com cartões legíveis bastantes para uma rodada do jogo. */
export const cartoesAbertos = (prontos: readonly CartaoDeFesta[]) => prontos.length >= OPCOES_DE_CARTAO;

export function rodadasDoJogo(prontos: readonly CartaoDeFesta[], rand: Rand = Math.random): CartaoDeFesta[] {
  return shuffled(prontos, rand).slice(0, Math.min(RODADAS_DE_CARTAO, prontos.length));
}

export function opcoesDoCartao(alvo: CartaoDeFesta, prontos: readonly CartaoDeFesta[], rand: Rand = Math.random): CartaoDeFesta[] {
  const outros = shuffled(prontos.filter(c => c.id !== alvo.id), rand).slice(0, OPCOES_DE_CARTAO - 1);
  return shuffled([alvo, ...outros], rand);
}

/* Os caracteres invisíveis que viram a direção do texto ou se escondem num
   nome (o mesmo conjunto do servidor). */
const INVISIVEIS = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/gu;
/** Letras, espaço, apóstrofo e hífen. Sem números, sem ponto, sem barra, sem
 *  dois-pontos: um nome nunca vira um endereço na página do amigo. */
const NOME = /^\p{L}[\p{L}\p{M} '\-]*$/u;

/** O nome como vai no cartão: sem invisíveis, sem espaços sobrando. */
export const limparNome = (s: string) => s.replace(INVISIVEIS, '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** Um nome aceito: vazio (o "para" pode ficar em branco) ou só letras, até NOME_MAX. */
export function nomeValido(s: string): boolean {
  const n = limparNome(s);
  return n === '' || ([...n].length <= NOME_MAX && NOME.test(n));
}

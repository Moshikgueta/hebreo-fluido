/* O que treinar (05/11/2026, pedido do dono): os temas do Pomar das palavras
 * e da Corrida das palavras.
 * ─────────────────────────────────────────────────────────────────────────
 * Os dois jogos perguntavam só o sentido das palavras. Agora o aluno escolhe:
 *   · letras: a letra sozinha, e o nome dela (ת → Tav);
 *   · sons: a sílaba com os pontos, e como soa (תַ → ta);
 *   · palavras: a palavra SEM os pontos, e o sentido (o de sempre);
 *   · leitura: a palavra COM os pontos, e como se lê (שָׁלוֹם → shalóm).
 *
 * As letras e as sílabas vêm das letras que o aluno já começou; as palavras,
 * de quem chama (o curso no Pomar, as paradas na Corrida), já filtradas pela
 * régua das letras. Aqui só as regras, sem tela. */

import type { Letter } from '@/lib/content';
import { shuffled, type Rand } from './rng';

export const TEMAS = ['letras', 'sons', 'palavras', 'leitura'] as const;
export type Tema = (typeof TEMAS)[number];

/** Uma pergunta de qualquer tema: o hebraico, a resposta certa, um detalhe
 *  para o retorno (a leitura, o sentido ou a dica do som) e se o hebraico vai
 *  com os pontos sempre (letras, sons, leitura) ou só quando o aluno pede. */
export type ItemDoTema = { he: string; resposta: string; detalhe: string; comPontos: boolean };
export type PalavraParaTema = { he: string; translit: string; pt?: string };

export function itensDoTema(tema: Tema, letras: readonly Letter[], palavras: readonly PalavraParaTema[]): ItemDoTema[] {
  if (tema === 'letras') return letras.map(l => ({ he: l.letter, resposta: l.namePt, detalhe: l.translit, comPontos: true }));
  /* O sheva sozinho é só a consoante: como som de sílaba ele confunde. */
  if (tema === 'sons') return letras.flatMap(l => l.syllables.filter(s => s.vowel !== 'sheva'))
    .map(s => ({ he: s.he, resposta: s.translit, detalhe: s.ptApprox, comPontos: true }));
  if (tema === 'palavras') return palavras.filter(w => w.pt).map(w => ({ he: w.he, resposta: w.pt!, detalhe: w.translit, comPontos: false }));
  return palavras.filter(w => w.translit).map(w => ({ he: w.he, resposta: w.translit, detalhe: w.pt ?? '', comPontos: true }));
}

export type PerguntaDoTema = ItemDoTema & { opcoes: string[] };

/** Até `n` perguntas, uma por resposta, cada uma com `opcoes` respostas
 *  diferentes (a certa e outras do mesmo tema). Vazio quando o tema não tem
 *  respostas diferentes bastantes para uma pergunta. */
export function perguntasDoTema(itens: readonly ItemDoTema[], n: number, opcoes: number, rand: Rand): PerguntaDoTema[] {
  const porResposta = new Map<string, ItemDoTema>();
  for (const it of itens) if (it.resposta && !porResposta.has(it.resposta)) porResposta.set(it.resposta, it);
  const unicos = [...porResposta.values()];
  if (unicos.length < opcoes) return [];
  return shuffled(unicos, rand).slice(0, n).map(it => ({
    ...it,
    opcoes: shuffled([it.resposta, ...shuffled(unicos.filter(x => x !== it), rand).slice(0, opcoes - 1).map(x => x.resposta)], rand)
  }));
}

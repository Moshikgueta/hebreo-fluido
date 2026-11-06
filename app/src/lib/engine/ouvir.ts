/* Ouça e encontre (06/11/2026, aprovado pelo dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Os outros jogos vão do texto para o sentido; este vai do SOM para o texto:
 * o aluno ouve uma palavra na gravação do curso e acha, entre quatro, a que
 * está escrita. É o que ele precisa quando alguém fala com ele em Israel.
 *
 * As opções erradas são parecidas de propósito: o mesmo tamanho, as mesmas
 * letras, uma letra só de diferença ou, com os pontos, as mesmas letras com
 * outros pontos (שֵׁם e שָׁם). Duas regras de honestidade:
 *   · só entra como palavra ouvida a que tem gravação de verdade (nunca voz
 *     sintética; ver components/learn/AudioButton.tsx);
 *   · nenhuma opção errada SOA igual à certa (a mesma transliteração, como
 *     ט e ת): aí ouvir não decide, e a pergunta seria injusta.
 * No jeito "só as letras" as opções aparecem sem os pontos, e duas que ficam
 * iguais sem eles não entram juntas.
 *
 * As palavras são as do curso que o aluno JÁ lê: nenhuma letra antes de ser
 * ensinada. Aqui só as regras, sem tela. */

import type { PalavraDoCurso } from './palavras';
import { shuffled, type Rand } from './rng';
import { stripNikud } from '@/lib/hebrew';

export type JeitoDeOuvir = 'pontos' | 'letras';
export type PerguntaDeOuvir = {
  he: string; translit: string; pt: string; audioId: string;
  /** As quatro opções, já no jeito pedido (com ou sem os pontos). */
  opcoes: string[];
  /** O índice da certa em `opcoes`. */
  certa: number;
};

export const PERGUNTAS_POR_RODADA = 8;
const OPCOES = 4;

/** Como a palavra aparece no jeito pedido. */
export const escritaNoJeito = (he: string, jeito: JeitoDeOuvir) =>
  jeito === 'letras' ? stripNikud(he) : he.normalize('NFC');

const soLetras = (he: string) => [...stripNikud(he)];
/** Quantas letras é preciso trocar, pôr ou tirar para ir de uma a outra. */
function distancia(a: string[], b: string[]): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length]![b.length]!;
}

/** O quanto `b` parece com `a` à primeira vista (maior = mais parecida). */
export function parecenca(a: string, b: string, jeito: JeitoDeOuvir): number {
  const la = soLetras(a), lb = soLetras(b);
  if (jeito === 'pontos' && la.join('') === lb.join('')) return 10; // as mesmas letras, outros pontos
  let s = 0;
  if (la.length === lb.length) s += 2;
  const d = distancia(la, lb);
  if (d === 1) s += 4; else if (d === 2) s += 2;
  if (la[0] === lb[0]) s += 1;
  s += la.filter(c => lb.includes(c)).length * 0.5;
  return s;
}

const mesmoSom = (a: string, b: string) =>
  a.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '')
  === b.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');

/** Uma palavra só (sem espaço nem maqaf), com sentido. */
const serve = (w: PalavraDoCurso) => !!w.pt && !/[\s־-]/u.test(w.he);

/**
 * Até 8 perguntas: cada palavra ouvida (com gravação) e três opções erradas
 * entre as mais parecidas das que o aluno lê. Vazio quando não há palavras
 * gravadas ou opções bastantes.
 */
export function rodadaDeOuvir(
  legiveis: readonly PalavraDoCurso[], jeito: JeitoDeOuvir, temAudio: (id: string) => boolean, rand: Rand
): PerguntaDeOuvir[] {
  /* Uma palavra por escrita, na forma do jeito. */
  const porEscrita = new Map<string, PalavraDoCurso>();
  for (const w of legiveis) {
    const e = escritaNoJeito(w.he, jeito);
    if (serve(w) && !porEscrita.has(e)) porEscrita.set(e, w);
  }
  const todas = [...porEscrita.values()];
  if (todas.length < OPCOES) return [];
  const ouvidas = shuffled(todas.filter(w => !!w.audioId && temAudio(w.audioId)), rand);
  const out: PerguntaDeOuvir[] = [];
  for (const alvo of ouvidas) {
    if (out.length >= PERGUNTAS_POR_RODADA) break;
    const escrita = escritaNoJeito(alvo.he, jeito);
    /* As candidatas: outra escrita, outro som, as mais parecidas primeiro
       (com um pouco de sorte entre as que empatam). */
    const candidatas = shuffled(todas.filter(w => w !== alvo
      && escritaNoJeito(w.he, jeito) !== escrita && !mesmoSom(w.translit, alvo.translit)), rand)
      .map(w => ({ w, s: parecenca(alvo.he, w.he, jeito) + rand() * 0.5 }))
      .sort((a, b) => b.s - a.s);
    const erradas: string[] = [];
    for (const { w } of candidatas) {
      const e = escritaNoJeito(w.he, jeito);
      if (!erradas.includes(e)) erradas.push(e);
      if (erradas.length === OPCOES - 1) break;
    }
    if (erradas.length < OPCOES - 1) continue;
    const opcoes = shuffled([escrita, ...erradas], rand);
    out.push({ he: alvo.he, translit: alvo.translit, pt: alvo.pt!, audioId: alvo.audioId!, opcoes, certa: opcoes.indexOf(escrita) });
  }
  return out.length >= 3 ? out : [];
}

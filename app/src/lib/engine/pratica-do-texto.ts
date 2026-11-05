/* A prática interativa dentro de cada texto (05/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Antes das perguntas de compreensão, o mesmo player das lições
 * (ExercisePlayer) com exercícios feitos das frases e das palavras do
 * próprio texto:
 *
 *   · MONTAR A FRASE (build-word): as palavras de uma linha, embaralhadas,
 *     postas na ordem de leitura; o sentido da linha é o enunciado;
 *   · LIGAR (match): as palavras novas do texto a seus sentidos;
 *   · OUVIR (listen-meaning): uma linha gravada, e o sentido dela entre três.
 *     Só com a gravação no ar.
 *
 * Tudo vem do texto, e por isso só aparece hebraico que o aluno já pode ler,
 * nos três idiomas: o sentido das linhas e das palavras já vem traduzido em
 * data/en e data/es. A semente é o id do texto: reabrir não troca a prática. */

import type { Exercise } from '@/lib/engine/types';
import type { Texto } from '@/lib/engine/textos';
import { palavrasDoTexto } from '@/lib/engine/textos';
import { rng, shuffled } from '@/lib/engine/rng';
import { stripNikud } from '@/lib/hebrew';
import { tx } from '@/i18n/telas/texto-pratica';
import { tx as txMotor } from '@/i18n/telas/motor-generators';

export const FRASES_PARA_MONTAR = 2;
const PALAVRAS_NA_FRASE = { min: 3, max: 6 };
const PARES = 4;

export function praticaDoTexto(
  texto: Texto, semente: string, letterId: string,
  temAudio: (id?: string | null) => boolean = () => false
): Exercise[] {
  const rand = rng(`pratica-${semente}`);
  const mostra = (he: string) => (texto.semPontos ? stripNikud(he) : he).trim();
  const out: Exercise[] = [];

  /* Montar a frase: linhas de 3 a 6 palavras, com sentido único. */
  const vezes = new Map<string, number>();
  for (const l of texto.linhas) vezes.set(l.pt, (vezes.get(l.pt) ?? 0) + 1);
  const unicas = texto.linhas.filter(l => l.he && l.pt && vezes.get(l.pt) === 1);
  const montaveis = unicas.filter(l => {
    const n = mostra(l.he).split(/\s+/).length;
    return n >= PALAVRAS_NA_FRASE.min && n <= PALAVRAS_NA_FRASE.max;
  });
  shuffled(montaveis, rand).slice(0, FRASES_PARA_MONTAR).forEach((l, i) => {
    const palavras = mostra(l.he).split(/\s+/);
    let pecas = shuffled(palavras, rand);
    if (pecas.join(' ') === palavras.join(' ')) pecas = [...pecas].reverse();
    out.push({
      id: `${semente}-pratica-frase-${i}`, kind: 'build-word', letterId, skill: 'ler',
      promptPt: tx.monteAFrase(l.pt),
      target: palavras.join(''), tiles: pecas, hintPt: '',
      hintsPt: [tx.monteAFraseDica],
      audioId: l.audioId && temAudio(l.audioId) ? l.audioId : null,
      explainPt: `${mostra(l.he)} - ${l.translit} - ${l.pt}`
    });
  });

  /* Ligar as palavras novas do texto aos sentidos, sem dois sentidos iguais. */
  const vistos = new Set<string>();
  const palavras = shuffled(palavrasDoTexto(texto), rand).filter(w => {
    if (!w.he || !w.pt || vistos.has(w.pt) || vistos.has(w.he)) return false;
    vistos.add(w.pt); vistos.add(w.he);
    return true;
  }).slice(0, PARES);
  if (palavras.length >= 3) {
    out.push({
      id: `${semente}-pratica-ligar`, kind: 'match', letterId, skill: 'ler',
      promptPt: txMotor.liguePalavraSentido,
      pairs: palavras.map(w => ({ left: mostra(w.he), right: w.pt })),
      leftKind: 'reading', rightKind: 'text',
      labelLeft: txMotor.rotuloHebraico, labelRight: txMotor.rotuloPortugues,
      explainPt: txMotor.liguePalavraExplica
    });
  }

  /* Ouvir uma linha gravada e escolher o sentido. */
  const gravada = shuffled(unicas.filter(l => l.audioId && temAudio(l.audioId)), rand)[0];
  if (gravada && unicas.length >= 3) {
    const erradas = shuffled(unicas.filter(l => l !== gravada), rand).slice(0, 2).map(l => l.pt);
    const options = shuffled([gravada.pt, ...erradas], rand);
    out.push({
      id: `${semente}-pratica-ouvir`, kind: 'listen-meaning', letterId, skill: 'ouvir',
      promptPt: txMotor.ouvirSentido, audioId: gravada.audioId!, options, answer: options.indexOf(gravada.pt),
      explainPt: `${mostra(gravada.he)} - ${gravada.translit} - ${gravada.pt}`
    });
  }
  return out;
}

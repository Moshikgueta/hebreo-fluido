import type { Traducao } from '..';

/* A prática interativa dentro de cada texto (05/11/2026):
   lib/engine/pratica-do-texto.ts e modulo/[n]/texto/TextoClient.tsx. */
const pt = {
  titulo: 'Pratique com o texto',
  intro: 'Monte frases do texto e ligue as palavras ao sentido. Depois vêm as perguntas.',
  feita: 'Prática feita.',
  deNovo: 'Praticar de novo',
  perguntasDepois: 'As perguntas sobre o texto aparecem depois da prática.',
  monteAFrase: (sentido: string) => `Monte a frase que quer dizer: "${sentido}"`,
  monteAFraseDica: 'Comece pela direita: a primeira palavra da frase fica desse lado.'
} as const;

const en: Traducao<typeof pt> = {
  titulo: 'Practice with the text',
  intro: 'Build sentences from the text and match the words to their meaning. The questions come next.',
  feita: 'Practice done.',
  deNovo: 'Practice again',
  perguntasDepois: 'The questions about the text appear after the practice.',
  monteAFrase: (sentido: string) => `Build the sentence that means: "${sentido}"`,
  monteAFraseDica: 'Start from the right: the first word of the sentence goes on that side.'
};

const es: Traducao<typeof pt> = {
  titulo: 'Practica con el texto',
  intro: 'Arma frases del texto y une las palabras con su significado. Después vienen las preguntas.',
  feita: 'Práctica hecha.',
  deNovo: 'Practicar de nuevo',
  perguntasDepois: 'Las preguntas sobre el texto aparecen después de la práctica.',
  monteAFrase: (sentido: string) => `Arma la frase que quiere decir: "${sentido}"`,
  monteAFraseDica: 'Empieza por la derecha: la primera palabra de la frase va de ese lado.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

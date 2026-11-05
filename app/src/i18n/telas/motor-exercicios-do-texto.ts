import type { Traducao } from '..';

/* Os exercícios gerados a partir das frases de cada texto (05/11/2026):
   lib/engine/exercicios-do-texto.ts. */
const pt = {
  queQuerDizer: (he: string) => `O que quer dizer {{${he}}}?`,
  quemDiz: (he: string) => `Quem diz {{${he}}}?`,
  porqueSentido: (he: string, sentido: string) => `{{${he}}}: ${sentido}`,
  porqueQuem: (quem: string, he: string) => `${quem} diz {{${he}}}.`
} as const;

const en: Traducao<typeof pt> = {
  queQuerDizer: (he: string) => `What does {{${he}}} mean?`,
  quemDiz: (he: string) => `Who says {{${he}}}?`,
  porqueSentido: (he: string, sentido: string) => `{{${he}}}: ${sentido}`,
  porqueQuem: (quem: string, he: string) => `${quem} says {{${he}}}.`
};

const es: Traducao<typeof pt> = {
  queQuerDizer: (he: string) => `¿Qué quiere decir {{${he}}}?`,
  quemDiz: (he: string) => `¿Quién dice {{${he}}}?`,
  porqueSentido: (he: string, sentido: string) => `{{${he}}}: ${sentido}`,
  porqueQuem: (quem: string, he: string) => `${quem} dice {{${he}}}.`
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

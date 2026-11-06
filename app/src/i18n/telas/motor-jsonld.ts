import type { Traducao } from '..';

/* lib/jsonld.ts - os textos dos dados estruturados (o que a busca lê). */
const pt = {
  professorDescricao: 'Israelense, professor de idiomas e educador, criador do Hebraico Fluente.',
  inicio: 'Início',
  /* O Course (31/10/2026): só o que a página do curso já promete (Promessa.tsx). */
  nivel: 'Iniciante',
  preRequisito: 'Nenhum: o curso começa do zero.',
  ensinaLetras: (n: number) => `Ler as ${n} letras do alfabeto hebraico`,
  ensinaNikud: 'Ler os sinais de vogal (nikud)',
  ensinaCursiva: 'Escrever em letra cursiva',
  ensinaPalavras: 'Ler palavras reais em hebraico'
} as const;

const en: Traducao<typeof pt> = {
  professorDescricao: 'Israeli language teacher and educator, creator of Hebrew Unlocked.',
  inicio: 'Home',
  nivel: 'Beginner',
  preRequisito: 'None: the course starts from zero.',
  ensinaLetras: (n: number) => `Read the ${n} letters of the Hebrew alphabet`,
  ensinaNikud: 'Read the vowel signs (nikud)',
  ensinaCursiva: 'Write in cursive script',
  ensinaPalavras: 'Read real Hebrew words'
};

const es: Traducao<typeof pt> = {
  professorDescricao: 'Israelí, profesor de idiomas y educador, creador de Hebreo Fluido.',
  inicio: 'Inicio',
  nivel: 'Principiante',
  preRequisito: 'Ninguno: el curso empieza desde cero.',
  ensinaLetras: (n: number) => `Leer las ${n} letras del alfabeto hebreo`,
  ensinaNikud: 'Leer los signos de vocal (nikud)',
  ensinaCursiva: 'Escribir en letra cursiva',
  ensinaPalavras: 'Leer palabras reales en hebreo'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

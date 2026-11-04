import type { Traducao } from '..';

/* O que vale para o site inteiro: a marca e o cartão do site. */
const pt = {
  marca: 'Hebraico Fluente',
  titulo: 'Hebraico Fluente - a plataforma de hebraico para brasileiros',
  descricao:
    'Hebraico para brasileiros, começando pelo alfabeto: aulas interativas, correção na ' +
    'hora e progresso que continua de onde você parou.'
} as const;

const en: Traducao<typeof pt> = {
  /* O nome da marca em inglês: Hebrew Unlocked (04/11/2026, decisão do dono). */
  marca: 'Hebrew Unlocked',
  titulo: 'Hebrew Unlocked - learn to read Hebrew from zero',
  descricao:
    'Learn to read and write Hebrew, starting with the alphabet: interactive lessons, ' +
    'instant feedback and progress that picks up where you left off.'
};

const es: Traducao<typeof pt> = {
  /* El nombre de la marca no se traduce. */
  marca: 'Hebraico Fluente',
  titulo: 'Hebraico Fluente - aprende a leer hebreo desde cero',
  descricao:
    'Aprende a leer y escribir hebreo, empezando por el alfabeto: lecciones interactivas, ' +
    'corrección al instante y un progreso que sigue donde lo dejaste.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

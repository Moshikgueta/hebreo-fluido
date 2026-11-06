import type { Traducao } from '..';

/* components/platform/TrilhaDoModulo.tsx - o caminho no painel. */
const pt = {
  titulo: (n: number) => `Seu caminho no módulo ${n}`,
  tituloCurso: 'Seu caminho no curso',
  verOMapa: 'Ver o mapa →'
} as const;

const en: Traducao<typeof pt> = {
  titulo: (n: number) => `Your path in module ${n}`,
  tituloCurso: 'Your path through the course',
  verOMapa: 'See the map →'
};

const es: Traducao<typeof pt> = {
  titulo: (n: number) => `Tu camino en el módulo ${n}`,
  tituloCurso: 'Tu camino en el curso',
  verOMapa: 'Ver el mapa →'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

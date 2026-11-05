import type { Traducao } from '..';

/* O que ficou para trás nos módulos 1 a 5, antes dos módulos 6 e 7 e do
   exame final (05/11/2026): lib/state/rules.ts `pendenciasDasLetras`,
   components/learn/PendenciasAntesDoFim.tsx. */
const pt = {
  tituloExame: 'Antes do exame final, feche os módulos 1 a 5',
  tituloModulo: (n: number) => `Antes do módulo ${n}, feche os módulos 1 a 5`,
  texto: 'Você já concluiu as letras. Falta o que fecha cada módulo: a revisão e as leituras. É lendo textos inteiros que as letras viram leitura de verdade.',
  modulo: (n: number) => `Módulo ${n}`,
  verMapa: 'Ver o mapa do curso'
} as const;

const en: Traducao<typeof pt> = {
  tituloExame: 'Before the final exam, finish modules 1 to 5',
  tituloModulo: (n: number) => `Before module ${n}, finish modules 1 to 5`,
  texto: 'You have finished the letters. What is left is what closes each module: the review and the readings. Reading whole texts is what turns letters into real reading.',
  modulo: (n: number) => `Module ${n}`,
  verMapa: 'See the course map'
};

const es: Traducao<typeof pt> = {
  tituloExame: 'Antes del examen final, cierra los módulos 1 a 5',
  tituloModulo: (n: number) => `Antes del módulo ${n}, cierra los módulos 1 a 5`,
  texto: 'Ya terminaste las letras. Falta lo que cierra cada módulo: el repaso y las lecturas. Leer textos enteros es lo que convierte las letras en lectura de verdad.',
  modulo: (n: number) => `Módulo ${n}`,
  verMapa: 'Ver el mapa del curso'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

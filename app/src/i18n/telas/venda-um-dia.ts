import type { Traducao } from '..';

/* components/landing/UmDiaNaCapa.tsx - "Um dia em Israel" na página de venda
   (06/11/2026, pedido do dono: uma página que convence quem chega). Os nomes
   e as descrições das paradas vêm de academia-um-dia.ts, os mesmos do curso. */
const pt = {
  rubrica: 'Um dia em Israel',
  titulo: 'Do trem de manhã à festa da noite: você lê o que aparece na frente.',
  lead: 'Oito situações de um dia comum em Israel, cada uma um jogo de leitura dentro do curso. Elas abrem conforme você aprende as letras.',
  paradas: 'Paradas do dia',
  telaDe: (nome: string) => `Tela da parada ${nome}, dentro do curso`,
  semPontos: 'Como na rua, quase tudo vem sem os pontos das vogais. O curso ensina a ler assim.',
  depois: 'Tocar numa hora mostra a tela daquela parada.'
} as const;

// rever: texto do site em inglês
const en: Traducao<typeof pt> = {
  rubrica: 'A day in Israel',
  titulo: 'From the morning train to the evening party: you read what is in front of you.',
  lead: 'Eight moments of an ordinary day in Israel, each one a reading game inside the course. They open as you learn the letters.',
  paradas: 'Stops of the day',
  telaDe: (nome: string) => `Screen of the ${nome} stop, inside the course`,
  semPontos: 'Like on the street, almost everything comes without the vowel dots. The course teaches you to read that way.',
  depois: 'Tap a time to see the screen of that stop.'
};

const es: Traducao<typeof pt> = {
  rubrica: 'Un día en Israel',
  titulo: 'Del tren de la mañana a la fiesta de la noche: lees lo que tienes delante.',
  lead: 'Ocho momentos de un día común en Israel, cada uno un juego de lectura dentro del curso. Se abren a medida que aprendes las letras.',
  paradas: 'Paradas del día',
  telaDe: (nome: string) => `Pantalla de la parada ${nome}, dentro del curso`,
  semPontos: 'Como en la calle, casi todo viene sin los puntos de las vocales. El curso te enseña a leer así.',
  depois: 'Toca una hora para ver la pantalla de esa parada.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

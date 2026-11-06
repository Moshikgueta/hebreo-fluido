import type { Traducao } from '..';

/* components/landing/JogosNaCapa.tsx - os jogos de prática na página de
   venda (06/11/2026). Os nomes e as descrições dos jogos vêm de
   academia-academia-client.tsx, os mesmos da Academia. */
const pt = {
  rubrica: 'Praticar',
  titulo: 'O que você aprende vira jogo.',
  lead: 'Na Academia de Leitura, cada jogo usa só as letras que você já aprendeu. E todo dia um deles é o jogo de hoje, escolhido para você.',
  jogos: 'Jogos de prática'
} as const;

// rever: texto do site em inglês
const en: Traducao<typeof pt> = {
  rubrica: 'Practice',
  titulo: 'What you learn becomes a game.',
  lead: 'In the Reading Academy, each game uses only the letters you already know. And every day one of them is today’s game, picked for you.',
  jogos: 'Practice games'
};

const es: Traducao<typeof pt> = {
  rubrica: 'Practicar',
  titulo: 'Lo que aprendes se vuelve juego.',
  lead: 'En la Academia de Lectura, cada juego usa solo las letras que ya aprendiste. Y cada día uno de ellos es el juego de hoy, elegido para ti.',
  jogos: 'Juegos de práctica'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

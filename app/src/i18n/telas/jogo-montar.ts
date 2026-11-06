import type { Traducao } from '..';

/* Montar a palavra (06/11/2026): components/game/MontarPalavra.tsx. */
const pt = {
  comoMontar: 'Como você quer montar?',
  comPontos: 'Com os pontos',
  comPontosDesc: 'Cada peça é uma letra com os pontos dela. Mais fácil.',
  soLetras: 'Só as letras',
  soLetrasDesc: 'As peças são as letras, sem os pontos, como se escreve em Israel. Mais difícil.',
  trocar: 'Trocar o jeito',
  palavraN: (i: number, total: number) => `Palavra ${i} de ${total}`,
  monte: 'Monte a palavra que quer dizer',
  dica: 'Toque nas peças na ordem, da direita para a esquerda. Toque numa peça montada para tirá-la.',
  vaga: (n: number) => `Lugar ${n}`,
  vazia: 'vazio',
  peca: (texto: string) => `Peça ${texto}`,
  isso: 'Isso!',
  quase: 'Quase. As peças em vermelho estão no lugar errado: toque nelas para trocar.',
  mostrar: 'Mostrar a resposta',
  era: 'A palavra era',
  proxima: 'Próxima palavra',
  verResultado: 'Ver o resultado'
} as const;

const en: Traducao<typeof pt> = {
  comoMontar: 'How do you want to build it?',
  comPontos: 'With the points',
  comPontosDesc: 'Each piece is a letter with its points. Easier.',
  soLetras: 'Letters only',
  soLetrasDesc: 'The pieces are the letters, without the points, the way it is written in Israel. Harder.',
  trocar: 'Change the way',
  palavraN: (i, total) => `Word ${i} of ${total}`,
  monte: 'Build the word that means',
  dica: 'Tap the pieces in order, from right to left. Tap a placed piece to take it back.',
  vaga: n => `Place ${n}`,
  vazia: 'empty',
  peca: texto => `Piece ${texto}`,
  isso: 'Yes!',
  quase: 'Almost. The pieces in red are in the wrong place: tap them to swap.',
  mostrar: 'Show the answer',
  era: 'The word was',
  proxima: 'Next word',
  verResultado: 'See the result'
};

const es: Traducao<typeof pt> = {
  comoMontar: '¿Cómo quieres armarla?',
  comPontos: 'Con los puntos',
  comPontosDesc: 'Cada pieza es una letra con sus puntos. Más fácil.',
  soLetras: 'Solo las letras',
  soLetrasDesc: 'Las piezas son las letras, sin los puntos, como se escribe en Israel. Más difícil.',
  trocar: 'Cambiar la forma',
  palavraN: (i, total) => `Palabra ${i} de ${total}`,
  monte: 'Arma la palabra que significa',
  dica: 'Toca las piezas en orden, de derecha a izquierda. Toca una pieza colocada para quitarla.',
  vaga: n => `Lugar ${n}`,
  vazia: 'vacío',
  peca: texto => `Pieza ${texto}`,
  isso: '¡Eso!',
  quase: 'Casi. Las piezas en rojo están en el lugar equivocado: tócalas para cambiarlas.',
  mostrar: 'Mostrar la respuesta',
  era: 'La palabra era',
  proxima: 'Siguiente palabra',
  verResultado: 'Ver el resultado'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

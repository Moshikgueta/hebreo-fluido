import type { Traducao } from '..';

/* Ouça e encontre (06/11/2026): components/game/OuvirEEncontrar.tsx. */
const pt = {
  comoOuvir: 'Como você quer ver as palavras?',
  comPontos: 'Com os pontos',
  comPontosDesc: 'As opções aparecem com os pontos. Mais fácil.',
  soLetras: 'Só as letras',
  soLetrasDesc: 'As opções aparecem sem os pontos, como se escreve em Israel. Mais difícil.',
  trocar: 'Trocar o jeito',
  palavraN: (i: number, total: number) => `Palavra ${i} de ${total}`,
  ouca: 'Ouça e encontre a palavra',
  ouvirDeNovo: 'Ouvir de novo',
  devagar: 'Mais devagar',
  dica: 'Toque na palavra que você ouviu.',
  opcao: (texto: string) => `Opção ${texto}`,
  isso: 'Isso!',
  quase: 'Não é essa. Ouça de novo e tente outra.',
  era: 'A palavra era',
  proxima: 'Próxima palavra',
  verResultado: 'Ver o resultado'
} as const;

const en: Traducao<typeof pt> = {
  comoOuvir: 'How do you want to see the words?',
  comPontos: 'With the points',
  comPontosDesc: 'The options appear with their points. Easier.',
  soLetras: 'Letters only',
  soLetrasDesc: 'The options appear without the points, the way it is written in Israel. Harder.',
  trocar: 'Change the way',
  palavraN: (i, total) => `Word ${i} of ${total}`,
  ouca: 'Listen and find the word',
  ouvirDeNovo: 'Listen again',
  devagar: 'Slower',
  dica: 'Tap the word you heard.',
  opcao: texto => `Option ${texto}`,
  isso: 'Yes!',
  quase: 'Not that one. Listen again and try another.',
  era: 'The word was',
  proxima: 'Next word',
  verResultado: 'See the result'
};

const es: Traducao<typeof pt> = {
  comoOuvir: '¿Cómo quieres ver las palabras?',
  comPontos: 'Con los puntos',
  comPontosDesc: 'Las opciones aparecen con sus puntos. Más fácil.',
  soLetras: 'Solo las letras',
  soLetrasDesc: 'Las opciones aparecen sin los puntos, como se escribe en Israel. Más difícil.',
  trocar: 'Cambiar la forma',
  palavraN: (i, total) => `Palabra ${i} de ${total}`,
  ouca: 'Escucha y encuentra la palabra',
  ouvirDeNovo: 'Escuchar de nuevo',
  devagar: 'Más despacio',
  dica: 'Toca la palabra que escuchaste.',
  opcao: texto => `Opción ${texto}`,
  isso: '¡Eso!',
  quase: 'No es esa. Escucha de nuevo y prueba otra.',
  era: 'La palabra era',
  proxima: 'Siguiente palabra',
  verResultado: 'Ver el resultado'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

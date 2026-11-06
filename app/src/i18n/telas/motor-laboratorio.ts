import type { Traducao } from '..';

/* lib/laboratorio.ts - o Laboratório de Leitura: níveis, notas de cada letra
   na palavra, instruções e a mensagem da Primeira Leitura. */
const pt = {
  guiadaTitulo: 'Leitura guiada',
  guiadaCurto: 'Guiada',
  guiadaResumo: 'Com nikud, explicação letra por letra e áudio disponível quando você precisar.',
  menosAjudaTitulo: 'Leitura com menos ajuda',
  menosAjudaCurto: 'Menos ajuda',
  menosAjudaResumo: 'Tente ler por conta própria. Você pode acessar dicas quando precisar.',
  independenteTitulo: 'Leitura independente',
  independenteCurto: 'Independente',
  independenteResumo: 'Leia a palavra sem nikud, por conta própria, e depois confira a pronúncia.',
  vavO: 'Aqui, o Vav com o ponto acima representa o som O.',
  vavU: 'Aqui, o Vav com o ponto dentro representa o som U.',
  nomeFinal: '{nome} final',
  alefComVogal: 'Nesta palavra, o Álef não tem som próprio: quem soa é a vogal {vogal}.',
  alefSemVogal: 'Nesta palavra, o Álef não tem som próprio.',
  ayin: 'Na pronúncia israelense mais comum, o Áyin não soa como consoante nesta palavra. Em algumas tradições, ele é pronunciado no fundo da garganta.',
  heFinal: 'No fim de muitas palavras, o He não tem som próprio e ajuda a representar a vogal final.',
  patachFurtivo: 'Aqui temos um pátach especial: o som A é pronunciado antes da consoante final.',
  yudI: 'Aqui, o Yud ajuda a representar a vogal I, sem produzir um som separado.',
  yudEi: 'Nesta palavra, o E e o Yud formam o som "ei".',
  yudE: 'Aqui, o Yud faz parte da representação da vogal E. Ouça como esta palavra é pronunciada.',
  yudMudo: 'Aqui o Yud não tem som próprio.',
  nPalavras: (n: number): string => (n === 1 ? '1 palavra' : `${n} palavras`),
  guiadaAudio: 'Leia da direita para a esquerda, em voz alta. Se precisar, explore as letras uma a uma ou ouça a pronúncia.',
  guiadaSemAudio: 'Leia da direita para a esquerda, em voz alta. Se precisar, explore as letras uma a uma.',
  menosAjuda: 'Tente ler em voz alta sem ajuda. Se precisar, você pode acessar as dicas abaixo.',
  independente: 'Leia a palavra em voz alta por conta própria. Depois, confira a pronúncia.',
  vogalCom: 'vogal {vogal}',
  vogal: 'vogal',
  semConsoante: 'sem som de consoante aqui',
  apoioDaVogal: 'apoio da vogal',
  nenhumaCerta: 'Nenhuma foi marcada como lida corretamente ainda: vale ler de novo, com calma.',
  marcou: (certas: number): string =>
    `Marcou ${certas === 1 ? '1 delas' : `${certas} delas`} como ${certas === 1 ? 'lida corretamente' : 'lidas corretamente'}.`,
  praticouOuvindo: (palavras: string, marcou: string): string =>
    `Você praticou a leitura de ${palavras} em hebraico. ${marcou} Da próxima vez, tente ler cada palavra antes de ouvir.`,
  praticouSemOuvir: (palavras: string, marcou: string): string =>
    `Você praticou a leitura de ${palavras} em hebraico sem ouvir a pronúncia antes. ${marcou}`,
  grandePasso: ' Isso é um grande passo: você está começando a ler hebraico!'
} as const;

const en: Traducao<typeof pt> = {
  guiadaTitulo: 'Guided reading',
  guiadaCurto: 'Guided',
  guiadaResumo: 'With nikud, a letter-by-letter explanation and audio available whenever you need it.',
  menosAjudaTitulo: 'Reading with less help',
  menosAjudaCurto: 'Less help',
  menosAjudaResumo: 'Try reading on your own. You can open hints when you need them.',
  independenteTitulo: 'Independent reading',
  independenteCurto: 'Independent',
  independenteResumo: 'Read the word without nikud, on your own, then check the pronunciation.',
  vavO: 'Here, Vav with the dot above stands for the sound O.',
  vavU: 'Here, Vav with the dot inside stands for the sound U.',
  nomeFinal: 'final {nome}',
  alefComVogal: 'In this word, Alef has no sound of its own: what you hear is the vowel {vogal}.',
  alefSemVogal: 'In this word, Alef has no sound of its own.',
  ayin: 'In the most common Israeli pronunciation, Ayin does not sound like a consonant in this word. In some traditions, it is pronounced deep in the throat.',
  heFinal: 'At the end of many words, He has no sound of its own and helps show the final vowel.',
  patachFurtivo: 'Here we have a special patach: the A sound is pronounced before the final consonant.',
  yudI: 'Here, Yud helps show the vowel I, without making a separate sound.',
  yudEi: 'In this word, the E and the Yud make the sound "ei".',
  yudE: 'Here, Yud is part of how the vowel E is written. Listen to how this word is pronounced.',
  yudMudo: 'Here Yud has no sound of its own.',
  nPalavras: (n: number): string => (n === 1 ? '1 word' : `${n} words`),
  guiadaAudio: 'Read from right to left, out loud. If you need to, explore the letters one by one or listen to the pronunciation.',
  guiadaSemAudio: 'Read from right to left, out loud. If you need to, explore the letters one by one.',
  menosAjuda: 'Try reading out loud without help. If you need to, you can open the hints below.',
  independente: 'Read the word out loud on your own. Then check the pronunciation.',
  vogalCom: 'vowel {vogal}',
  vogal: 'vowel',
  semConsoante: 'no consonant sound here',
  apoioDaVogal: 'vowel support',
  nenhumaCerta: 'None was marked as read correctly yet: it is worth reading again, calmly.',
  marcou: (certas: number): string =>
    `You marked ${certas === 1 ? '1 of them' : `${certas} of them`} as read correctly.`,
  praticouOuvindo: (palavras: string, marcou: string): string =>
    `You practiced reading ${palavras} in Hebrew. ${marcou} Next time, try reading each word before you listen.`,
  praticouSemOuvir: (palavras: string, marcou: string): string =>
    `You practiced reading ${palavras} in Hebrew without hearing the pronunciation first. ${marcou}`,
  grandePasso: ' That is a big step: you are starting to read Hebrew!'
};

const es: Traducao<typeof pt> = {
  guiadaTitulo: 'Lectura guiada',
  guiadaCurto: 'Guiada',
  guiadaResumo: 'Con nikud, explicación letra por letra y audio disponible cuando lo necesites.',
  menosAjudaTitulo: 'Lectura con menos ayuda',
  menosAjudaCurto: 'Menos ayuda',
  menosAjudaResumo: 'Intenta leer por tu cuenta. Puedes abrir pistas cuando las necesites.',
  independenteTitulo: 'Lectura independiente',
  independenteCurto: 'Independiente',
  independenteResumo: 'Lee la palabra sin nikud, por tu cuenta, y después revisa la pronunciación.',
  vavO: 'Aquí, la Vav con el punto arriba representa el sonido O.',
  vavU: 'Aquí, la Vav con el punto adentro representa el sonido U.',
  nomeFinal: '{nome} final',
  alefComVogal: 'En esta palabra, la Álef no tiene sonido propio: lo que suena es la vocal {vogal}.',
  alefSemVogal: 'En esta palabra, la Álef no tiene sonido propio.',
  ayin: 'En la pronunciación israelí más común, la Áyin no suena como consonante en esta palabra. En algunas tradiciones, se pronuncia en el fondo de la garganta.',
  heFinal: 'Al final de muchas palabras, la He no tiene sonido propio y ayuda a representar la vocal final.',
  patachFurtivo: 'Aquí tenemos un pátaj especial: el sonido A se pronuncia antes de la consonante final.',
  yudI: 'Aquí, la Yud ayuda a representar la vocal I, sin producir un sonido aparte.',
  yudEi: 'En esta palabra, la E y la Yud forman el sonido "ei".',
  yudE: 'Aquí, la Yud forma parte de la representación de la vocal E. Escucha cómo se pronuncia esta palabra.',
  yudMudo: 'Aquí la Yud no tiene sonido propio.',
  nPalavras: (n: number): string => (n === 1 ? '1 palabra' : `${n} palabras`),
  guiadaAudio: 'Lee de derecha a izquierda, en voz alta. Si lo necesitas, explora las letras una por una o escucha la pronunciación.',
  guiadaSemAudio: 'Lee de derecha a izquierda, en voz alta. Si lo necesitas, explora las letras una por una.',
  menosAjuda: 'Intenta leer en voz alta sin ayuda. Si lo necesitas, puedes abrir las pistas de abajo.',
  independente: 'Lee la palabra en voz alta por tu cuenta. Después, revisa la pronunciación.',
  vogalCom: 'vocal {vogal}',
  vogal: 'vocal',
  semConsoante: 'aquí sin sonido de consonante',
  apoioDaVogal: 'apoyo de la vocal',
  nenhumaCerta: 'Todavía ninguna quedó marcada como leída correctamente: vale la pena leer de nuevo, con calma.',
  marcou: (certas: number): string =>
    `Marcaste ${certas === 1 ? '1 de ellas' : `${certas} de ellas`} como ${certas === 1 ? 'leída correctamente' : 'leídas correctamente'}.`,
  praticouOuvindo: (palavras: string, marcou: string): string =>
    `Practicaste la lectura de ${palavras} en hebreo. ${marcou} La próxima vez, intenta leer cada palabra antes de escuchar.`,
  praticouSemOuvir: (palavras: string, marcou: string): string =>
    `Practicaste la lectura de ${palavras} en hebreo sin escuchar antes la pronunciación. ${marcou}`,
  grandePasso: ' Es un gran paso: ¡estás empezando a leer hebreo!'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* app/alfabeto-hebraico/page.tsx e [letra]/page.tsx: as páginas públicas do
   alfabeto. O hebraico entra pelos argumentos, sempre num <He>. */
const pt = {
  metaTitulo: 'Alfabeto hebraico: as 22 letras, o som e como ler - Hebraico Fluente',
  metaDescricao:
    'As 22 letras do alfabeto hebraico com o nome e o som em português, as cinco formas finais e ' +
    'como funcionam as vogais. Teste grátis da primeira letra.',
  alfabeto: 'Alfabeto hebraico',
  titulo: 'Alfabeto hebraico: as 22 letras, uma por uma.',
  lead: 'O alfabeto hebraico tem 22 letras, e todas são consoantes. As vogais são sinais pequenos embaixo, em cima ou ao lado das letras: o nikud. E tudo se lê da direita para a esquerda.',
  tabelaEyebrow: 'A tabela',
  tabelaTitulo: 'O nome e o som de cada letra.',
  tabelaLead: (autor: string) =>
    `Na ordem em que o curso as ensina, que vem do método do ${autor}. As cinco letras que mudam de forma no fim da palavra aparecem com a forma final ao lado.`,
  colLetra: 'Letra',
  colNome: 'Nome',
  colSom: 'Som',
  colFinal: 'Forma final',
  comoEyebrow: 'Como se lê',
  comoTitulo: 'Três coisas para saber antes da primeira letra.',
  direitaTitulo: 'Da direita para a esquerda',
  direitaTexto: 'A linha começa do lado direito da página, e o livro também abre pelo lado que, para nós, é o fim.',
  consoantesTitulo: 'As letras são consoantes',
  consoantesTexto: (alef: ReactNode): ReactNode => (
    <>Cada uma das 22 letras é uma consoante. Uma delas, o {alef}, não tem som próprio: ela só segura a vogal.</>
  ),
  vogaisTitulo: 'As vogais são sinais',
  vogaisTexto: 'Os pontos e traços embaixo ou em cima das letras são as vogais, o nikud. Com eles, dá para ler em voz alta qualquer palavra, mesmo sem saber o que ela quer dizer.',
  ctaTitulo: 'Aprenda as 22 letras, uma por vez.',
  ctaLinha: 'Comece pelo teste grátis do Álef, na página do curso: 6 exercícios curtos, sem cadastro.',

  letraMetaTitulo: (nome: string, letra: string) =>
    `${nome} (${letra}): a letra do alfabeto hebraico e como se lê - Hebraico Fluente`,
  letraMetaDescricao: (nome: string, ordem: number, som: string) =>
    `${nome}, a letra ${ordem} na ordem do curso: o som (${som}), uma palavra com a gravação ` +
    'do professor e o erro mais comum de quem fala português.',
  letraEyebrow: (ordem: number) => `Alfabeto hebraico · letra ${ordem} na ordem do curso`,
  letraLead: (som: string, final: ReactNode): ReactNode => (
    <>O som: {som}.{final && <> No fim da palavra, a letra muda de forma: {final}.</>}</>
  ),
  ouvirNome: (nome: string) => `Ouvir o nome: ${nome}`,
  palavraEyebrow: 'Uma palavra',
  palavraTitulo: (nome: string) => `Uma palavra com ${nome}.`,
  ouvirProfessor: 'Ouvir o professor',
  erroEyebrow: 'Cuidado, brasileiro',
  erroTitulo: 'O erro mais comum com esta letra.',
  costumaSair: 'O que costuma sair',
  jeitoCerto: 'O jeito certo',
  noCurso: 'No curso, a lição desta letra explica por que isso acontece e treina o som com a gravação do professor.',
  parecidasEyebrow: 'Atenção ao desenho',
  parecidasTitulo: 'Letras que se parecem com esta.',
  parecidasLead: 'No começo, é fácil confundir. O curso treina a diferença lado a lado.',
  outrasEyebrow: 'Outras letras',
  outrasTitulo: 'Continue pelo alfabeto.',
  as22: 'As 22 letras'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'The Hebrew alphabet: the 22 letters, their sounds and how to read - Hebrew Unlocked',
  metaDescricao:
    'The 22 letters of the Hebrew alphabet with their names and sounds, the five final forms and ' +
    'how the vowels work. A free test of the first letter.',
  alfabeto: 'Hebrew alphabet',
  titulo: 'The Hebrew alphabet: the 22 letters, one by one.',
  lead: 'The Hebrew alphabet has 22 letters, and they are all consonants. The vowels are small signs under, above or next to the letters: the nikud. And everything is read from right to left.',
  tabelaEyebrow: 'The chart',
  tabelaTitulo: 'The name and sound of each letter.',
  tabelaLead: (autor: string) =>
    `In the order the course teaches them, which comes from the method of ${autor}. The five letters that change shape at the end of a word appear with their final form alongside.`,
  colLetra: 'Letter',
  colNome: 'Name',
  colSom: 'Sound',
  colFinal: 'Final form',
  comoEyebrow: 'How it reads',
  comoTitulo: 'Three things to know before the first letter.',
  direitaTitulo: 'From right to left',
  direitaTexto: 'The line starts on the right side of the page, and a book also opens from the side that, for us, is the end.',
  consoantesTitulo: 'The letters are consonants',
  consoantesTexto: (alef: ReactNode): ReactNode => (
    <>Each of the 22 letters is a consonant. One of them, {alef}, has no sound of its own: it only holds the vowel.</>
  ),
  vogaisTitulo: 'The vowels are signs',
  vogaisTexto: 'The dots and lines under or above the letters are the vowels, the nikud. With them, you can read any word aloud, even without knowing what it means.',
  ctaTitulo: 'Learn the 22 letters, one at a time.',
  ctaLinha: 'Start with the free Alef test on the course page: 6 short exercises, no sign-up.',

  letraMetaTitulo: (nome: string, letra: string) =>
    `${nome} (${letra}): the Hebrew alphabet letter and how to read it - Hebrew Unlocked`,
  // etapa 3: pronúncia, rever (o erro descrito hoje é o de quem fala português)
  letraMetaDescricao: (nome: string, ordem: number, som: string) =>
    `${nome}, letter ${ordem} in the course order: the sound (${som}), a word recorded ` +
    'by the teacher and the most common beginner mistake.',
  letraEyebrow: (ordem: number) => `Hebrew alphabet · letter ${ordem} in the course order`,
  letraLead: (som: string, final: ReactNode): ReactNode => (
    <>The sound: {som}.{final && <> At the end of a word, the letter changes shape: {final}.</>}</>
  ),
  ouvirNome: (nome: string) => `Hear the name: ${nome}`,
  palavraEyebrow: 'A word',
  palavraTitulo: (nome: string) => `A word with ${nome}.`,
  ouvirProfessor: 'Hear the teacher',
  // etapa 3: pronúncia, rever
  erroEyebrow: 'Watch out',
  erroTitulo: 'The most common mistake with this letter.',
  costumaSair: 'What usually comes out',
  jeitoCerto: 'The right way',
  noCurso: 'In the course, this letter\'s lesson explains why that happens and trains the sound with the teacher\'s recording.',
  parecidasEyebrow: 'Watch the shape',
  parecidasTitulo: 'Letters that look like this one.',
  parecidasLead: 'At first, it is easy to mix them up. The course trains the difference side by side.',
  outrasEyebrow: 'Other letters',
  outrasTitulo: 'Keep going through the alphabet.',
  as22: 'All 22 letters'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Alfabeto hebreo: las 22 letras, su sonido y cómo leer - Hebreo Fluido',
  metaDescricao:
    'Las 22 letras del alfabeto hebreo con su nombre y su sonido, las cinco formas finales y ' +
    'cómo funcionan las vocales. Prueba gratis de la primera letra.',
  alfabeto: 'Alfabeto hebreo',
  titulo: 'Alfabeto hebreo: las 22 letras, una por una.',
  lead: 'El alfabeto hebreo tiene 22 letras, y todas son consonantes. Las vocales son signos pequeños debajo, encima o al lado de las letras: el nikud. Y todo se lee de derecha a izquierda.',
  tabelaEyebrow: 'La tabla',
  tabelaTitulo: 'El nombre y el sonido de cada letra.',
  tabelaLead: (autor: string) =>
    `En el orden en que el curso las enseña, que viene del método de ${autor}. Las cinco letras que cambian de forma al final de la palabra aparecen con la forma final al lado.`,
  colLetra: 'Letra',
  colNome: 'Nombre',
  colSom: 'Sonido',
  colFinal: 'Forma final',
  comoEyebrow: 'Cómo se lee',
  comoTitulo: 'Tres cosas que saber antes de la primera letra.',
  direitaTitulo: 'De derecha a izquierda',
  direitaTexto: 'La línea empieza del lado derecho de la página, y el libro también se abre por el lado que, para nosotros, es el final.',
  consoantesTitulo: 'Las letras son consonantes',
  consoantesTexto: (alef: ReactNode): ReactNode => (
    <>Cada una de las 22 letras es una consonante. Una de ellas, el {alef}, no tiene sonido propio: solo sostiene la vocal.</>
  ),
  vogaisTitulo: 'Las vocales son signos',
  vogaisTexto: 'Los puntos y rayas debajo o encima de las letras son las vocales, el nikud. Con ellos, puedes leer en voz alta cualquier palabra, aunque no sepas qué significa.',
  ctaTitulo: 'Aprende las 22 letras, una a la vez.',
  ctaLinha: 'Empieza con la prueba gratis del Álef, en la página del curso: 6 ejercicios cortos, sin registro.',

  letraMetaTitulo: (nome: string, letra: string) =>
    `${nome} (${letra}): la letra del alfabeto hebreo y cómo se lee - Hebreo Fluido`,
  // etapa 3: pronúncia, rever (o erro descrito hoje é o de quem fala português)
  letraMetaDescricao: (nome: string, ordem: number, som: string) =>
    `${nome}, la letra ${ordem} en el orden del curso: el sonido (${som}), una palabra con la ` +
    'voz del profesor y el error más común al empezar.',
  letraEyebrow: (ordem: number) => `Alfabeto hebreo · letra ${ordem} en el orden del curso`,
  letraLead: (som: string, final: ReactNode): ReactNode => (
    <>El sonido: {som}.{final && <> Al final de la palabra, la letra cambia de forma: {final}.</>}</>
  ),
  ouvirNome: (nome: string) => `Escuchar el nombre: ${nome}`,
  palavraEyebrow: 'Una palabra',
  palavraTitulo: (nome: string) => `Una palabra con ${nome}.`,
  ouvirProfessor: 'Escuchar al profesor',
  // etapa 3: pronúncia, rever
  erroEyebrow: 'Cuidado',
  erroTitulo: 'El error más común con esta letra.',
  costumaSair: 'Lo que suele salir',
  jeitoCerto: 'La forma correcta',
  noCurso: 'En el curso, la lección de esta letra explica por qué pasa eso y entrena el sonido con la grabación del profesor.',
  parecidasEyebrow: 'Atención al dibujo',
  parecidasTitulo: 'Letras que se parecen a esta.',
  parecidasLead: 'Al principio, es fácil confundirlas. El curso entrena la diferencia lado a lado.',
  outrasEyebrow: 'Otras letras',
  outrasTitulo: 'Sigue por el alfabeto.',
  as22: 'Las 22 letras'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

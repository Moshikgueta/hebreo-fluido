import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* app/sobre/page.tsx. A história do professor mora em venda-trajetoria.ts. */
const pt = {
  metaTitulo: 'Sobre o Moshik - Hebraico Fluente',
  metaDescricao:
    'Moshik Gueta, israelense, professor de hebraico e de idiomas: a trajetória no Brasil, em ' +
    'Israel e em Buenos Aires por trás do Hebraico Fluente.',
  trilha: 'Sobre',

  porqueEyebrow: 'Como o curso foi pensado',
  porqueTitulo: 'Três decisões que tornam o aprendizado mais leve.',
  porqueLead: 'Cada parte do curso foi organizada para evitar sobrecarga e deixar você avançar com confiança.',
  umaT: 'Uma letra de cada vez',
  umaB: 'Você conhece a letra, pratica com ela e só então avança. O que começa como um alfabeto completamente estranho vai ficando familiar aos poucos - e o que parecia impossível vira uma sequência de passos curtos.',
  apoioT: 'O apoio aparece e depois sai',
  apoioB: 'A transliteração ajuda no começo, e o objetivo nunca foi você depender dela. Ela diminui junto com o seu progresso, com exercícios feitos para cada etapa dessa retirada, até você ler direto do hebraico.',
  retornoT: 'Retorno na hora, em cada passo',
  retornoB: 'Você não precisa esperar por um professor para saber se acertou. Cada exercício corrige na hora, cada erro explica onde olhar, e o exame final diz antes de começar a nota que aprova e, no fim, quais partes pedem revisão.',

  origemEyebrow: 'O método',
  origemTitulo: 'Um método adaptado para brasileiros.',
  origemLead: 'Princípios consolidados de aprendizagem de idiomas, mais o que eu aprendi ensinando hebraico a quem fala português.',
  adaptacaoTitulo: 'O que é adaptação minha',
  adaptacaoTexto: 'Os exercícios, as explicações e a escrita cursiva foram pensados para as dificuldades de quem parte do português: as comparações com os nossos sons, os erros que só um brasileiro comete e tudo o que acontece na tela.',
  deOndeTitulo: 'De onde vem o método',
  deOndeTexto: (autor: string, obra: ReactNode, translit: string, adaptacoes: string): ReactNode => (
    <>O caminho que este curso segue parte do método do{' '}{autor}, autor de{' '}{obra}{' '}({translit}). O conteúdo do livro dele é a base do que a plataforma ensina. {adaptacoes}</>
  ),
  licoesImpressas: (n: number) =>
    `As ${n} lições, as palavras de cada letra e os exercícios vieram de material impresso e passaram para a plataforma pela mesma fonte: se uma palavra muda, muda nos dois.`,

  ctaTitulo: 'Tem uma dúvida antes de começar?',
  ctaLinha: (email: string) => `As mais comuns já estão respondidas. O que não estiver, escreva para ${email}.`,
  verDuvidas: 'Ver as dúvidas frequentes'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'About Moshik - Hebrew Unlocked',
  metaDescricao:
    'Moshik Gueta, Israeli Hebrew and language teacher: the path through ' +
    'Israel and Buenos Aires behind Hebrew Unlocked.',
  trilha: 'About',

  porqueEyebrow: 'How the course was designed',
  porqueTitulo: 'Three choices that make learning lighter.',
  porqueLead: 'Every part of the course was organized to avoid overload and let you move forward with confidence.',
  umaT: 'One letter at a time',
  umaB: 'You get to know the letter, practice with it and only then move on. What starts as a completely foreign alphabet becomes familiar little by little - and what seemed impossible turns into a series of short steps.',
  apoioT: 'The support shows up and then leaves',
  apoioB: 'Transliteration helps at the start, and the goal was never for you to depend on it. It fades as you progress, with exercises made for each stage of that fading, until you read straight from the Hebrew.',
  retornoT: 'Feedback right away, at every step',
  retornoB: 'You do not have to wait for a teacher to know if you got it right. Every exercise corrects you right away, every mistake explains where to look, and the final exam tells you the passing score before you start and, at the end, which parts need review.',

  origemEyebrow: 'The method',
  origemTitulo: 'An adapted method.',
  origemLead: 'Established principles of language learning, plus what I learned teaching Hebrew to beginners.',
  adaptacaoTitulo: 'What I adapted',
  // etapa 3: pronúncia, rever (a adaptação para quem fala inglês ainda está por fazer)
  adaptacaoTexto: 'The exercises, the explanations and the cursive writing were designed around the difficulties of people starting from another language: comparisons with sounds you already know, the mistakes beginners typically make and everything that happens on screen.',
  deOndeTitulo: 'Where the method comes from',
  deOndeTexto: (autor: string, obra: ReactNode, translit: string, adaptacoes: string): ReactNode => (
    <>The path this course follows builds on the method of{' '}{autor}, author of{' '}{obra}{' '}({translit}). The content of his book is the foundation of what the platform teaches. {adaptacoes}</>
  ),
  licoesImpressas: (n: number) =>
    `The ${n} lessons, the words for each letter and the exercises came from printed material and moved to the platform from the same source: if a word changes, it changes in both.`,

  ctaTitulo: 'Have a question before you start?',
  ctaLinha: (email: string) => `The most common ones are already answered. For anything else, write to ${email}.`,
  verDuvidas: 'See the frequently asked questions'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Sobre Moshik - Hebraico Fluente',
  metaDescricao:
    'Moshik Gueta, israelí, profesor de hebreo y de idiomas: el recorrido por ' +
    'Israel y Buenos Aires detrás de Hebraico Fluente.',
  trilha: 'Sobre',

  porqueEyebrow: 'Cómo se pensó el curso',
  porqueTitulo: 'Tres decisiones que hacen el aprendizaje más liviano.',
  porqueLead: 'Cada parte del curso se organizó para evitar la sobrecarga y dejarte avanzar con confianza.',
  umaT: 'Una letra a la vez',
  umaB: 'Conoces la letra, practicas con ella y solo entonces avanzas. Lo que empieza como un alfabeto completamente extraño se vuelve familiar poco a poco - y lo que parecía imposible se convierte en una serie de pasos cortos.',
  apoioT: 'El apoyo aparece y después se va',
  apoioB: 'La transliteración ayuda al principio, y el objetivo nunca fue que dependieras de ella. Disminuye junto con tu progreso, con ejercicios hechos para cada etapa de esa retirada, hasta que lees directo del hebreo.',
  retornoT: 'Respuesta al instante, en cada paso',
  retornoB: 'No necesitas esperar a un profesor para saber si acertaste. Cada ejercicio corrige en el momento, cada error explica dónde mirar, y el examen final te dice antes de empezar la nota para aprobar y, al final, qué partes piden repaso.',

  origemEyebrow: 'El método',
  origemTitulo: 'Un método adaptado.',
  origemLead: 'Principios consolidados de aprendizaje de idiomas, más lo que aprendí enseñando hebreo a principiantes.',
  adaptacaoTitulo: 'Lo que adapté yo',
  // etapa 3: pronúncia, rever (a adaptação para quem fala espanhol ainda está por fazer)
  adaptacaoTexto: 'Los ejercicios, las explicaciones y la escritura cursiva se pensaron para las dificultades de quien parte de otro idioma: comparaciones con sonidos que ya conoces, los errores típicos de quien empieza y todo lo que pasa en la pantalla.',
  deOndeTitulo: 'De dónde viene el método',
  deOndeTexto: (autor: string, obra: ReactNode, translit: string, adaptacoes: string): ReactNode => (
    <>El camino que sigue este curso parte del método del{' '}{autor}, autor de{' '}{obra}{' '}({translit}). El contenido de su libro es la base de lo que enseña la plataforma. {adaptacoes}</>
  ),
  licoesImpressas: (n: number) =>
    `Las ${n} lecciones, las palabras de cada letra y los ejercicios vinieron de material impreso y pasaron a la plataforma desde la misma fuente: si una palabra cambia, cambia en los dos.`,

  ctaTitulo: '¿Tienes una pregunta antes de empezar?',
  ctaLinha: (email: string) => `Las más comunes ya están respondidas. Para lo demás, escribe a ${email}.`,
  verDuvidas: 'Ver las preguntas frecuentes'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

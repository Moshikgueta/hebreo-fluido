import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* components/landing/OuvirEFalar.tsx */
const pt = {
  /* Nomes das letras e transliteração: ficam iguais até a etapa 3. */
  nomeShin: 'Shin',
  nomeMem: 'Mem',
  nomeLamed: 'Lámed',
  porqueSamech: 'Este é o Sámech: faz “s”, sem o chiado.',
  porqueTsadi: 'Este é o Tsádi: faz “ts”.',
  porqueTav: 'Este é o Tav: faz “t”.',
  porqueNun: 'Este é o Nun: faz “n”.',
  porqueBet: 'Este é o Bet: faz “b”.',
  porqueKaf: 'Este é o Kaf: faz “k”.',
  porqueResh: 'Este é o Resh: faz “r”.',
  porqueDalet: 'Este é o Dálet: faz “d”.',
  porqueGuimel: 'Este é o Guímel: faz “g”.',

  rubrica: 'Ouvir e falar',
  titulo: 'Ouça a letra. Depois, fale e seja corrigido.',
  lead: 'As gravações do curso são do professor, um israelense. Ouça, descubra a letra e depois diga você mesmo: o curso confere a sua pronúncia na hora.',

  passo1: 'Ouça e descubra a letra',
  ouvirNome: 'Ouvir o nome da letra',
  deN: (i: number, n: number) => `${i} de ${n}`,
  qualLetra: 'Qual é esta letra?',
  escolhaLetra: 'Escolha a letra',
  letra: (he: string) => `Letra ${he}`,
  acerto: (nome: string, silaba: ReactNode, som: string): ReactNode => (
    <><strong>Isso!</strong> É o {nome}. Com o risquinho embaixo, {silaba} se lê “{som}”.</>
  ),
  ouvirSom: (som: string) => `Ouvir “${som}”`,
  tenteOutra: (porque: string) => `${porque} Ouça de novo e tente outra.`,
  proxima: 'Próxima letra →',
  fim: 'Três letras reconhecidas pelo nome. No curso são as 22, uma de cada vez, com o nome e o som.',

  passo2: 'Agora é a sua vez',
  shalomTr: 'shalóm',
  shalomPt: 'olá, paz',
  ouvirProfessor: 'Ouvir o professor',
  graveTitulo: 'Grave e compare',
  graveInstrucao: 'Diga “shalóm”, grave e se ouça. Depois ouça o professor e compare.',
  toqueMicrofone: (palavra: ReactNode): ReactNode => (
    <>Toque no microfone e diga {palavra}. O curso ouve e diz se bateu.</>
  ),
  notaFala: 'Para corrigir, a sua voz vai para o serviço de fala do navegador (Google ou Apple). O Hebraico Fluente não guarda nada.'
} as const;

const en: Traducao<typeof pt> = {
  nomeShin: 'Shin',
  nomeMem: 'Mem',
  nomeLamed: 'Lamed',
  porqueSamech: 'This is Samech: it makes “s”, without the hiss.',
  porqueTsadi: 'This is Tsadi: it makes “ts”.',
  porqueTav: 'This is Tav: it makes “t”.',
  porqueNun: 'This is Nun: it makes “n”.',
  porqueBet: 'This is Bet: it makes “b”.',
  porqueKaf: 'This is Kaf: it makes “k”.',
  porqueResh: 'This is Resh: it makes “r”.',
  porqueDalet: 'This is Dalet: it makes “d”.',
  porqueGuimel: 'This is Gimel: it makes “g”.',

  rubrica: 'Listen and speak',
  titulo: 'Hear the letter. Then speak and get corrected.',
  lead: 'The course recordings are by the teacher, an Israeli. Listen, figure out the letter and then say it yourself: the course checks your pronunciation right away.',

  passo1: 'Listen and find the letter',
  ouvirNome: 'Hear the letter\'s name',
  deN: (i: number, n: number) => `${i} of ${n}`,
  qualLetra: 'Which letter is this?',
  escolhaLetra: 'Choose the letter',
  letra: (he: string) => `Letter ${he}`,
  acerto: (nome: string, silaba: ReactNode, som: string): ReactNode => (
    <><strong>That's it!</strong> It is {nome}. With the little line underneath, {silaba} reads “{som}”.</>
  ),
  ouvirSom: (som: string) => `Hear “${som}”`,
  tenteOutra: (porque: string) => `${porque} Listen again and try another one.`,
  proxima: 'Next letter →',
  fim: 'Three letters recognized by name. In the course there are 22, one at a time, with the name and the sound.',

  passo2: 'Now it is your turn',
  shalomTr: 'shalom',
  shalomPt: 'hello, peace',
  ouvirProfessor: 'Hear the teacher',
  graveTitulo: 'Record and compare',
  graveInstrucao: 'Say “shalom”, record yourself and listen. Then hear the teacher and compare.',
  toqueMicrofone: (palavra: ReactNode): ReactNode => (
    <>Tap the microphone and say {palavra}. The course listens and tells you if it matched.</>
  ),
  notaFala: 'To correct you, your voice goes to your browser\'s speech service (Google or Apple). Hebrew Unlocked does not keep anything.'
};

const es: Traducao<typeof pt> = {
  nomeShin: 'Shin',
  nomeMem: 'Mem',
  nomeLamed: 'Lámed',
  porqueSamech: 'Esta es la Sámej: suena “s”, no “sh”.',
  porqueTsadi: 'Esta es la Tsádi: suena “ts”.',
  porqueTav: 'Esta es la Tav: suena “t”.',
  porqueNun: 'Esta es la Nun: suena “n”.',
  porqueBet: 'Esta es la Bet: suena “b”.',
  porqueKaf: 'Esta es la Kaf: suena “k”.',
  porqueResh: 'Esta es la Resh: suena “r”.',
  porqueDalet: 'Esta es la Dálet: suena “d”.',
  porqueGuimel: 'Esta es la Guímel: suena “g”.',

  rubrica: 'Escuchar y hablar',
  titulo: 'Escucha la letra. Después, habla y recibe la corrección.',
  lead: 'Las grabaciones del curso son del profesor, un israelí. Escucha, descubre la letra y después dila tú: el curso revisa tu pronunciación en el momento.',

  passo1: 'Escucha y descubre la letra',
  ouvirNome: 'Escuchar el nombre de la letra',
  deN: (i: number, n: number) => `${i} de ${n}`,
  qualLetra: '¿Qué letra es esta?',
  escolhaLetra: 'Elige la letra',
  letra: (he: string) => `Letra ${he}`,
  acerto: (nome: string, silaba: ReactNode, som: string): ReactNode => (
    <><strong>¡Eso!</strong> Es la {nome}. Con la rayita debajo, {silaba} se lee “{som}”.</>
  ),
  ouvirSom: (som: string) => `Escuchar “${som}”`,
  tenteOutra: (porque: string) => `${porque} Escucha otra vez y prueba con otra.`,
  proxima: 'Siguiente letra →',
  fim: 'Tres letras reconocidas por el nombre. En el curso son las 22, una a la vez, con el nombre y el sonido.',

  passo2: 'Ahora te toca a ti',
  shalomTr: 'shalóm',
  shalomPt: 'hola, paz',
  ouvirProfessor: 'Escuchar al profesor',
  graveTitulo: 'Graba y compara',
  graveInstrucao: 'Di “shalóm”, grábate y escúchate. Después escucha al profesor y compara.',
  toqueMicrofone: (palavra: ReactNode): ReactNode => (
    <>Toca el micrófono y di {palavra}. El curso escucha y te dice si coincidió.</>
  ),
  notaFala: 'Para corregirte, tu voz va al servicio de voz del navegador (Google o Apple). Hebreo Fluido no guarda nada.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

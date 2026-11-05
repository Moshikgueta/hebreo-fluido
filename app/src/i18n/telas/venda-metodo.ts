import type { Traducao } from '..';

/* app/metodo/page.tsx */
const pt = {
  metaTitulo: 'O método - Hebraico Fluente',
  metaDescricao:
    'Uma letra por vez, na ordem que rende mais; nada de palavra com letra que você ' +
    'ainda não viu; revisão no dia certo; e a transliteração sai de propósito.',
  trilha: 'O método',
  eyebrow: 'O método',
  titulo: (quantas: string) => `${quantas} etapas em toda lição, e uma regra que sustenta todas.`,
  lead: 'Não é método novo nem segredo de ninguém. É um conjunto pequeno de decisões, tomadas de propósito, e mantidas mesmo quando dão trabalho.',

  regraRubrica: 'A regra número um',
  regraTitulo: 'Você nunca vê uma palavra com uma letra que ainda não aprendeu.',
  regraP1: 'Parece óbvio. Quase nenhum curso faz. É comum a lição 2 trazer שָׁלוֹם como exemplo - quatro letras e um sinal que você ainda não tem. O efeito é sempre o mesmo: em vez de ler, você decora a forma inteira como se fosse um desenho, e a leitura nunca começa.',
  regraP2: 'Aqui isso não é um cuidado editorial, é uma trava no programa. Cada letra carrega a lista exata de sinais que já foram ensinados, e o gerador de exercícios só pode usar aquela lista - inclusive nas alternativas erradas. Um exercício fora da regra não chega ao ar porque a verificação automática não deixa a versão subir.',
  licao3: 'Lição 3',
  /* Transliteração: fica igual até a etapa 3. */
  mayim: 'máyim · água',
  legenda: 'Três letras, dois sinais - e todos já ensinados. Por isso ela pode aparecer tão cedo: ela é legível, não decorável.',

  outrasEyebrow: 'As outras decisões',
  outrasTitulo: 'Por que a lição é assim.',
  ordemT: 'A ordem é por utilidade, não pelo alfabeto',
  ordemB: (modulos: number, licoes: number) =>
    `As letras não vêm de א a ת. Vêm na ordem que abre mais palavras mais cedo - por isso a primeira lição já lê uma palavra inteira, logo na segunda letra. São ${modulos} módulos de letras, em ${licoes} lições.`,
  parecidasT: 'As letras parecidas são tratadas de frente',
  parecidasB: 'ב e כ, ד e ר, ה e ח. Em vez de esperar a confusão aparecer, o curso apresenta o par lado a lado, mostra o que diferencia e depois te obriga a escolher entre os dois. Quando você erra um par, ele volta mais vezes.',
  revisaoT: 'A revisão é por habilidade, não por lição',
  revisaoB: 'Reconhecer a forma, saber o som, ler a sílaba, ouvir e escrever são cinco coisas diferentes. O curso guarda as cinco separadas por letra, e a revisão traz de volta exatamente a que está fraca - não a lição inteira de novo.',
  translitT: 'A transliteração sai',
  translitB: 'Enquanto houver "shalóm" embaixo da palavra, você lê o português. O curso usa transliteração no começo e a retira de propósito, em etapas anunciadas, até você estar lendo sem apoio nenhum - que é a única definição de ler.',

  aulaEyebrow: 'Uma lição por dentro',
  aulaTitulo: (quantas: string) => `Dez minutos, ${quantas} etapas.`,
  aulaLead: 'Toda lição de letra tem a mesma forma, com estas abas, nesta ordem. A previsibilidade é de propósito: você nunca precisa descobrir como a tela funciona antes de aprender a letra.',

  ctaTitulo: 'O método só existe na prática.',
  ctaLinha: 'A primeira letra leva dez minutos e responde melhor do que esta página.'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'The method - Hebrew Unlocked',
  metaDescricao:
    'One letter at a time, in the order that pays off most; no word with a letter you ' +
    'have not seen yet; review on the right day; transliteration that fades.',
  trilha: 'The method',
  eyebrow: 'The method',
  titulo: (quantas: string) => `${quantas} steps in every lesson, and one rule that holds them all up.`,
  lead: 'It is not a new method or anyone\'s secret. It is a small set of decisions, made on purpose, and kept even when they take extra work.',

  regraRubrica: 'Rule number one',
  regraTitulo: 'You never see a word with a letter you have not learned yet.',
  regraP1: 'It sounds obvious. Almost no course does it. It is common for lesson 2 to use שָׁלוֹם as an example - four letters and a sign you do not have yet. The effect is always the same: instead of reading, you memorize the whole shape as if it were a drawing, and reading never starts.',
  regraP2: 'Here this is not editorial care, it is a lock in the software. Each letter carries the exact list of signs already taught, and the exercise generator can only use that list - including in the wrong answers. An exercise that breaks the rule never goes live, because the automatic check does not let the release through.',
  licao3: 'Lesson 3',
  mayim: 'mayim · water',
  legenda: 'Three letters, two signs - and all of them already taught. That is why it can show up so early: it is readable, not something to memorize.',

  outrasEyebrow: 'The other decisions',
  outrasTitulo: 'Why the lesson works this way.',
  ordemT: 'The order is by usefulness, not by the alphabet',
  ordemB: (modulos: number, licoes: number) =>
    `The letters do not go from א to ת. They come in the order that opens up the most words the soonest - that is why the first lesson already reads a whole word, right at the second letter. There are ${modulos} letter modules, in ${licoes} lessons.`,
  parecidasT: 'Similar letters are tackled head-on',
  parecidasB: 'ב and כ, ד and ר, ה and ח. Instead of waiting for the confusion to show up, the course presents the pair side by side, shows what tells them apart and then makes you choose between the two. When you miss a pair, it comes back more often.',
  revisaoT: 'Review is by skill, not by lesson',
  revisaoB: 'Recognizing the shape, knowing the sound, reading the syllable, listening and writing are five different things. The course tracks all five separately for each letter, and review brings back exactly the one that is weak - not the whole lesson again.',
  translitT: 'Transliteration goes away',
  translitB: 'As long as there is "shalom" under the word, you are reading English. The course uses transliteration at the start and removes it on purpose, in announced stages, until you are reading with no support at all - which is the only definition of reading.',

  aulaEyebrow: 'Inside a lesson',
  aulaTitulo: (quantas: string) => `Ten minutes, ${quantas} steps.`,
  aulaLead: 'Every letter lesson has the same shape, with these tabs, in this order. The predictability is on purpose: you never have to figure out how the screen works before learning the letter.',

  ctaTitulo: 'The method only exists in practice.',
  ctaLinha: 'The first letter takes ten minutes and answers better than this page does.'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'El método - Hebraico Fluente',
  metaDescricao:
    'Una letra a la vez, en el orden que más rinde; ninguna palabra con letras aún ' +
    'no vistas; repaso en el día justo; y la transliteración se va a propósito.',
  trilha: 'El método',
  eyebrow: 'El método',
  titulo: (quantas: string) => `${quantas} etapas en cada lección, y una regla que las sostiene a todas.`,
  lead: 'No es un método nuevo ni el secreto de nadie. Es un conjunto pequeño de decisiones, tomadas a propósito, y mantenidas incluso cuando dan trabajo.',

  regraRubrica: 'La regla número uno',
  regraTitulo: 'Nunca ves una palabra con una letra que todavía no aprendiste.',
  regraP1: 'Parece obvio. Casi ningún curso lo hace. Es común que la lección 2 traiga שָׁלוֹם como ejemplo - cuatro letras y un signo que todavía no tienes. El efecto es siempre el mismo: en lugar de leer, memorizas la forma entera como si fuera un dibujo, y la lectura nunca empieza.',
  regraP2: 'Aquí esto no es un cuidado editorial, es un candado en el programa. Cada letra lleva la lista exacta de signos que ya se enseñaron, y el generador de ejercicios solo puede usar esa lista - incluso en las opciones incorrectas. Un ejercicio fuera de la regla no sale al aire, porque la verificación automática no deja que la versión se publique.',
  licao3: 'Lección 3',
  mayim: 'máyim · agua',
  legenda: 'Tres letras, dos signos - y todos ya enseñados. Por eso puede aparecer tan pronto: se puede leer, no hay que memorizarla.',

  outrasEyebrow: 'Las otras decisiones',
  outrasTitulo: 'Por qué la lección es así.',
  ordemT: 'El orden es por utilidad, no por el alfabeto',
  ordemB: (modulos: number, licoes: number) =>
    `Las letras no van de א a ת. Vienen en el orden que abre más palabras más pronto - por eso la primera lección ya lee una palabra entera, apenas en la segunda letra. Son ${modulos} módulos de letras, en ${licoes} lecciones.`,
  parecidasT: 'Las letras parecidas se enfrentan de lleno',
  parecidasB: 'ב y כ, ד y ר, ה y ח. En lugar de esperar a que aparezca la confusión, el curso presenta el par lado a lado, muestra lo que las diferencia y después te obliga a elegir entre las dos. Cuando fallas en un par, vuelve más veces.',
  revisaoT: 'El repaso es por habilidad, no por lección',
  revisaoB: 'Reconocer la forma, saber el sonido, leer la sílaba, escuchar y escribir son cinco cosas distintas. El curso guarda las cinco por separado para cada letra, y el repaso trae de vuelta exactamente la que está débil - no la lección entera otra vez.',
  translitT: 'La transliteración se va',
  translitB: 'Mientras haya "shalóm" debajo de la palabra, estás leyendo español. El curso usa transliteración al principio y la retira a propósito, en etapas anunciadas, hasta que lees sin ningún apoyo - que es la única definición de leer.',

  aulaEyebrow: 'Una lección por dentro',
  aulaTitulo: (quantas: string) => `Diez minutos, ${quantas} etapas.`,
  aulaLead: 'Toda lección de letra tiene la misma forma, con estas pestañas, en este orden. La previsibilidad es a propósito: nunca tienes que descubrir cómo funciona la pantalla antes de aprender la letra.',

  ctaTitulo: 'El método solo existe en la práctica.',
  ctaLinha: 'La primera letra toma diez minutos y responde mejor que esta página.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

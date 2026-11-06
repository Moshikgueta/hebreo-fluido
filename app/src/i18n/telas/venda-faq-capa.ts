import type { Traducao } from '..';

/* components/landing/faq-capa.ts: as perguntas da FAQ da capa, que também
   saem no JSON-LD FAQPage. */
const pt = {
  p1: 'Preciso saber hebraico?',
  r1: 'Não. O curso começa do zero absoluto, na primeira letra, e assume que você nunca viu o alfabeto.',
  p2: 'É hebraico moderno ou bíblico?',
  r2: 'A leitura é a mesma: as letras e os sinais de vogal do texto bíblico são os que este curso ensina. O curso usa a pronúncia do hebraico moderno e vocabulário do dia a dia, o que abre os dois caminhos. Ler em voz alta e entender, porém, são coisas diferentes - a página /biblia responde isso por inteiro.',
  p3: 'Quanto tempo leva?',
  r3: (tempo: string) => `${tempo} O ritmo é seu.`,
  p4: 'O curso funciona no celular?',
  r4: 'Sim. A plataforma foi desenhada primeiro para o celular: uma atividade por tela e o botão de continuar sempre à mão.',
  p5: 'Tem áudio?',
  r5Audio: 'Cada letra, sílaba e palavra tem áudio gravado pelo professor, um israelense, para ouvir quantas vezes quiser.',
  r5SemAudio: 'As gravações estão em produção. Enquanto não entram, o curso não usa voz sintética: cada som é explicado por comparação com um som do português, e os exercícios de escuta ficam desativados em vez de virar adivinhação.',
  p6: 'Por quanto tempo tenho acesso?',
  r6: (meses: number) => `${meses} meses a partir da confirmação do pagamento, incluindo as atualizações feitas no curso nesse período.`,
  p7: 'E se eu não gostar?',
  r7: (dias: number) => `Você tem ${dias} dias, contados da liberação do acesso, para desistir pelo site e receber 100% de volta, sem precisar justificar. O estorno sai pelo mesmo meio de pagamento.`,
  p8: 'O que acontece depois que termino?',
  p9: 'E se eu travar em alguma coisa?',
  r9: (prazo: string) => `Dentro do curso existe o Fale comigo: você escreve a dúvida e eu respondo no e-mail da sua conta ${prazo}.`,
  r9Zap: 'Antes de comprar, o WhatsApp também está aberto.',
  r8: 'O próximo nível é o Hebraico A1, um curso à parte, ainda em produção e sem data. Se quiser, marque em Sua conta o pedido de receber um e-mail quando ele abrir.'
} as const;

const en: Traducao<typeof pt> = {
  p1: 'Do I need to know Hebrew?',
  r1: 'No. The course starts from absolute zero, at the first letter, and assumes you have never seen the alphabet.',
  p2: 'Is it modern or biblical Hebrew?',
  r2: 'The reading is the same: the letters and vowel signs of the biblical text are the ones this course teaches. The course uses modern Hebrew pronunciation and everyday vocabulary, which opens both paths. Reading aloud and understanding, though, are different things - the /biblia page answers that in full.',
  p3: 'How long does it take?',
  r3: (tempo: string) => `${tempo} You set the pace.`,
  p4: 'Does the course work on my phone?',
  r4: 'Yes. The platform was designed for the phone first: one activity per screen and the continue button always within reach.',
  p5: 'Is there audio?',
  r5Audio: 'Every letter, syllable and word has audio recorded by the teacher, an Israeli, to listen to as many times as you like.',
  // etapa 3: pronúncia, rever
  r5SemAudio: 'The recordings are in production. Until they are in, the course does not use a synthetic voice: each sound is explained by comparison with a sound in English, and the listening exercises stay turned off instead of becoming guesswork.',
  p6: 'How long do I have access?',
  r6: (meses: number) => `${meses} months from payment confirmation, including any updates made to the course during that time.`,
  p7: 'What if I do not like it?',
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  r7: (dias: number) => `You have ${dias} days, counted from when your access is granted, to cancel on the site and get 100% back, no reason needed. The refund goes back through the same payment method.`,
  p8: 'What happens after I finish?',
  p9: 'What if I get stuck?',
  r9: (prazo: string) => `Inside the course there is Talk to me: you write your question and I reply to your account e-mail ${prazo}.`,
  r9Zap: 'Before buying, WhatsApp is open too.',
  r8: 'You keep your access for the full 12 months: to review, play the Reading Academy games and take the final exam whenever you are ready. For now, this is the only course on this site.'
};

const es: Traducao<typeof pt> = {
  p1: '¿Necesito saber hebreo?',
  r1: 'No. El curso empieza desde cero absoluto, en la primera letra, y asume que nunca viste el alfabeto.',
  p2: '¿Es hebreo moderno o bíblico?',
  r2: 'La lectura es la misma: las letras y los signos de vocal del texto bíblico son los que enseña este curso. El curso usa la pronunciación del hebreo moderno y vocabulario del día a día, lo que abre los dos caminos. Leer en voz alta y entender, sin embargo, son cosas distintas: la página /biblia responde eso por completo.',
  p3: '¿Cuánto tiempo lleva?',
  r3: (tempo: string) => `${tempo} El ritmo es tuyo.`,
  p4: '¿El curso funciona en el celular?',
  r4: 'Sí. La plataforma se diseñó primero para el celular: una actividad por pantalla y el botón de continuar siempre a mano.',
  p5: '¿Tiene audio?',
  r5Audio: 'Cada letra, sílaba y palabra tiene audio grabado por el profesor, un israelí, para escucharlo cuantas veces quieras.',
  // etapa 3: pronúncia, rever
  r5SemAudio: 'Las grabaciones están en producción. Mientras no estén, el curso no usa voz sintética: cada sonido se explica comparándolo con un sonido del español, y los ejercicios de escucha quedan desactivados en lugar de volverse adivinanza.',
  p6: '¿Por cuánto tiempo tengo acceso?',
  r6: (meses: number) => `${meses} meses a partir de la confirmación del pago, incluidas las actualizaciones que se hagan al curso en ese período.`,
  p7: '¿Y si no me gusta?',
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  r7: (dias: number) => `Tienes ${dias} días, contados desde que se libera tu acceso, para cancelar en el sitio y recibir el 100% de vuelta, sin tener que justificarlo. El reembolso vuelve por el mismo medio de pago.`,
  p8: '¿Qué pasa cuando termino?',
  p9: '¿Y si me trabo en algo?',
  r9: (prazo: string) => `Dentro del curso está Habla conmigo: escribes tu duda y te respondo en el correo de tu cuenta ${prazo}.`,
  r9Zap: 'Antes de comprar, el WhatsApp también está abierto.',
  r8: 'Conservas tu acceso los 12 meses completos: para repasar, jugar los juegos de la Academia de lectura y hacer el examen final cuando estés listo. Por ahora, este es el único curso de este sitio.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

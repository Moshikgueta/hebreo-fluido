import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* components/landing/Fecho.tsx: professor, recursos, aula de amostra,
   depoimentos, preço, FAQ e o fecho. */
const pt = {
  resumo1: 'Israelense, fala cinco idiomas',
  resumo2: 'Professor de hebraico no Brasil',
  resumo3: 'Gerente Pedagógico em Tel Aviv',
  resumo4: 'Formação CELTA e estudos em Letras',
  rubricaProfessor: 'Quem está por trás do Hebraico Fluente',
  tituloProfessor: 'De Israel ao Brasil: um professor que ensina, aprende e pensa idiomas.',
  apresentacao: 'Sou Moshik Gueta. Foi ensinando hebraico a brasileiros, em Curitiba, que entendi onde quem começa do zero trava. O Hebraico Fluente transforma o que funcionava nas minhas aulas em uma metodologia que você segue no seu ritmo.',
  historia: 'Conheça a minha história',
  linkedin: 'Ver meu perfil no LinkedIn',
  abreAba: ' (abre em outra aba)',
  instagram: 'Instagram',
  instagramSr: ' do Hebraico Fluente (abre em outra aba)',
  metodo: (autor: ReactNode, obra: ReactNode, translit: string, adaptacoes: string): ReactNode => (
    <>O método parte do trabalho de {autor}, autor de{' '}{obra}{' '}({translit}). O conteúdo do livro dele é a base do que esta plataforma ensina. {adaptacoes}</>
  ),

  recursoAudioT: 'Áudio e pronúncia',
  recursoSemAudioT: 'Pronúncia explicada',
  recursoAudioD: 'Cada letra, sílaba e palavra gravada por falante nativo.',
  recursoSemAudioD: 'Cada som comparado com um som que você já faz em português.',
  correcaoT: 'Correção imediata',
  correcaoD: 'Você sabe na hora se acertou - e por que errou.',
  sequenciaT: 'Sequência de estudos',
  sequenciaD: 'Os dias seguidos contam. Faltar um dia não apaga seu XP nem seu recorde, e uma folga guardada protege a sequência.',
  progressoT: 'Progresso visual',
  progressoD: 'Percentual por módulo e mapa de domínio das letras.',
  revisaoT: 'Revisão inteligente',
  revisaoD: 'O que escapa volta sozinho, no intervalo certo.',
  celularT: 'Estude no celular',
  celularD: 'Uma atividade por tela, botão de continuar sempre à mão.',
  explicacoesT: 'Explicações em português',
  explicacoesD: 'Comparações com o som que você já conhece, sempre.',
  zeroT: 'Hebraico desde o zero',
  zeroD: 'Nenhum conhecimento prévio. Começa na primeira letra.',
  recursosTitulo: 'O que vem junto com o curso.',

  amostraTitulo: 'Experimente antes de começar.',
  amostraTexto: 'Uma questão real da Lição 3, do jeito que ela aparece dentro da plataforma. Escolha uma opção.',
  amostraVer: 'Ver o curso por dentro',
  amostraRotulo: 'Lição 3 · Reconhecimento',
  amostraPergunta: 'Qual letra faz o som N?',
  amostraEscolha: 'Escolha uma das quatro letras acima.',
  muitoBem: 'Muito bem!',
  xp: 'XP',
  amostraCerto: 'Nun faz o som N. Mem faz M, Tav faz T e He faz o H aspirado: as quatro vêm das duas primeiras lições.',
  quase: 'Quase.',
  amostraErrado: (nome: string) =>
    `${nome} tem outro som. Procure a letra estreita, de base curta - pode tentar de novo.`,

  depoimentoUm: 'O que diz uma aluna.',
  depoimentosVarios: 'O que dizem os alunos.',
  depoimento: 'Depoimento',
  depoimentos: 'Depoimentos',

  precoRubrica: 'Pagamento único, sem mensalidade',
  precoTexto: 'Acesso completo à plataforma, com progresso salvo e revisões liberadas conforme você avança.',
  naSuaConta: 'Na sua conta',
  jaESeu: 'Este curso já é seu.',
  precoPreLancamento: 'Preço de pré-lançamento',
  acessoCompleto: 'Acesso completo',
  noPix: 'no PIX, à vista',
  noCartao: (parcelas: string) => `ou ${parcelas} no cartão`,
  continua: 'Seu progresso continua exatamente onde você parou.',
  liberadoNaHora: (meses: number) => `Acesso liberado na hora da confirmação, por ${meses} meses.`,
  pixNaHora: (preco: string, pct: number, meses: number) =>
    `No PIX sai por ${preco} (${pct}% de desconto). Acesso liberado na hora da confirmação, por ${meses} meses.`,
  pixAMao: (preco: string, pct: number, meses: number) =>
    `No PIX sai por ${preco} (${pct}% de desconto). Acesso liberado à mão depois de conferido o pagamento, por ${meses} meses.`,
  desistir: (dias: number) => `${dias} dias para desistir e receber 100% de volta, sem justificar.`,
  /* Ao lado do preço cobrado, nunca no lugar dele (29/10/2026). */
  porDia: (valor: string, meses: number) => `Cerca de ${valor} por dia nos ${meses} meses de acesso.`,
  seloRotulo: 'Direito de arrependimento',
  seloDias: 'dias',
  aMenos: (valor: string) => `${valor} a menos`,
  aPartirDe: (data: string, cheio: string) => `A partir de ${data}: ${cheio}`,
  ate: (data: string) => `até ${data}`,
  noPixDesconto: (pct: number) => `no PIX, à vista (${pct}% de desconto)`,
  preLancamentoAte: (data: string, cheio: string) =>
    `Preço de pré-lançamento até ${data}. Depois, o curso passa a custar ${cheio}.`,
  depoisDoPreLancamento: (cheio: string) => `Depois do pré-lançamento, o curso passa a custar ${cheio}.`,

  faqRubrica: 'Antes de começar',
  faqTitulo: 'Dúvidas frequentes',
  faqTexto: 'O que o curso cobre, como funciona o acesso e o que esperar por dentro da plataforma.',

  /* Transliteração: fica igual até a etapa 3. */
  shalomTr: 'shalóm',
  shalomPt: 'olá, paz',
  todaTr: 'todá',
  todaPt: 'obrigado',
  mayimTr: 'máyim',
  mayimPt: 'água',
  fechoTitulo: 'A próxima palavra em hebraico pode ser a primeira que você realmente consegue ler.'
} as const;

const en: Traducao<typeof pt> = {
  resumo1: 'Israeli, speaks five languages',
  resumo2: 'Hebrew teacher for beginners',
  resumo3: 'Academic Manager in Tel Aviv',
  resumo4: 'CELTA certificate and studies in Languages and Literature',
  rubricaProfessor: 'Who is behind Hebrew Unlocked',
  tituloProfessor: 'An Israeli teacher who knows where beginners get stuck.',
  apresentacao: 'I am Moshik Gueta. It was while teaching Hebrew to beginners that I understood where people who start from zero get stuck. Hebrew Unlocked turns what worked in my classes into a method you follow at your own pace.',
  historia: 'Read my story',
  linkedin: 'See my LinkedIn profile',
  abreAba: ' (opens in a new tab)',
  instagram: 'Instagram',
  instagramSr: ' of Hebrew Unlocked (opens in a new tab)',
  metodo: (autor: ReactNode, obra: ReactNode, translit: string, adaptacoes: string): ReactNode => (
    <>The method builds on the work of {autor}, author of{' '}{obra}{' '}({translit}). The content of his book is the foundation of what this platform teaches. {adaptacoes}</>
  ),

  recursoAudioT: 'Audio and pronunciation',
  recursoSemAudioT: 'Pronunciation explained',
  recursoAudioD: 'Every letter, syllable and word recorded by a native speaker.',
  // etapa 3: pronúncia, rever
  recursoSemAudioD: 'Every sound compared with a sound you already make in English.',
  correcaoT: 'Instant feedback',
  correcaoD: 'You know right away if you got it right - and why you got it wrong.',
  sequenciaT: 'Study streak',
  sequenciaD: 'Days in a row count. Missing a day does not erase your XP or your record, and a saved day off protects your streak.',
  progressoT: 'Visual progress',
  progressoD: 'Percentage per module and a mastery map of the letters.',
  revisaoT: 'Smart review',
  revisaoD: 'What slips away comes back on its own, at the right interval.',
  celularT: 'Study on your phone',
  celularD: 'One activity per screen, the continue button always within reach.',
  explicacoesT: 'Explanations in English',
  // etapa 3: pronúncia, rever
  explicacoesD: 'Comparisons with sounds you already know, always.',
  zeroT: 'Hebrew from zero',
  zeroD: 'No prior knowledge. It starts at the first letter.',
  recursosTitulo: 'What comes with the course.',

  amostraTitulo: 'Try it before you start.',
  amostraTexto: 'A real question from Lesson 3, just as it appears inside the platform. Pick an option.',
  amostraVer: 'See the course from the inside',
  amostraRotulo: 'Lesson 3 · Recognition',
  amostraPergunta: 'Which letter makes the N sound?',
  amostraEscolha: 'Pick one of the four letters above.',
  muitoBem: 'Well done!',
  xp: 'XP',
  amostraCerto: 'Nun makes the N sound. Mem makes M, Tav makes T and He makes a breathy H: all four come from the first two lessons.',
  quase: 'Almost.',
  amostraErrado: (nome: string) =>
    `${nome} has a different sound. Look for the narrow letter with a short base - you can try again.`,

  depoimentoUm: 'What one student says.',
  depoimentosVarios: 'What students say.',
  depoimento: 'Testimonial',
  depoimentos: 'Testimonials',

  precoRubrica: 'One-time payment, no monthly fee',
  precoTexto: 'Full access to the platform, with your progress saved and reviews unlocked as you move forward.',
  naSuaConta: 'In your account',
  jaESeu: 'This course is already yours.',
  precoPreLancamento: 'Pre-launch price',
  acessoCompleto: 'Full access',
  // etapa 5/6: Brasil, rever (PIX)
  noPix: 'by PIX, paid in full',
  // os sites de fora cobram pelo Stripe desde 05/11/2026 (data/empresa.json, pagamento.exterior)
  noCartao: () => 'one-time payment',
  continua: 'Your progress picks up exactly where you left off.',
  liberadoNaHora: (meses: number) => `Access granted as soon as payment is confirmed, for ${meses} months.`,
  // etapa 5/6: Brasil, rever (PIX)
  pixNaHora: (preco: string, pct: number, meses: number) =>
    `By PIX it comes to ${preco} (${pct}% off). Access granted as soon as payment is confirmed, for ${meses} months.`,
  // etapa 5/6: Brasil, rever (PIX)
  pixAMao: (preco: string, pct: number, meses: number) =>
    `By PIX it comes to ${preco} (${pct}% off). Access granted by hand once the payment is checked, for ${meses} months.`,
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  desistir: (dias: number) => `${dias} days to cancel and get 100% back, no reason needed.`,
  porDia: (valor: string, meses: number) => `About ${valor} a day over ${meses} months of access.`,
  seloRotulo: 'Right to cancel',
  seloDias: 'days',
  aMenos: (valor: string) => `${valor} off`,
  aPartirDe: (data: string, cheio: string) => `From ${data}: ${cheio}`,
  ate: (data: string) => `until ${data}`,
  noPixDesconto: (pct: number) => `by PIX, paid in full (${pct}% off)`,
  preLancamentoAte: (data: string, cheio: string) =>
    `Pre-launch price until ${data}. After that, the course will cost ${cheio}.`,
  depoisDoPreLancamento: (cheio: string) => `After the pre-launch, the course will cost ${cheio}.`,

  faqRubrica: 'Before you start',
  faqTitulo: 'Frequently asked questions',
  faqTexto: 'What the course covers, how access works and what to expect inside the platform.',

  shalomTr: 'shalom',
  shalomPt: 'hello, peace',
  todaTr: 'toda',
  todaPt: 'thank you',
  mayimTr: 'mayim',
  mayimPt: 'water',
  fechoTitulo: 'Your next word in Hebrew could be the first one you can truly read.'
};

const es: Traducao<typeof pt> = {
  resumo1: 'Israelí, habla cinco idiomas',
  resumo2: 'Profesor de hebreo para principiantes',
  resumo3: 'Gerente Pedagógico en Tel Aviv',
  resumo4: 'Formación CELTA y estudios en Letras',
  rubricaProfessor: 'Quién está detrás de Hebraico Fluente',
  tituloProfessor: 'Un profesor israelí que sabe dónde se traba quien empieza.',
  apresentacao: 'Soy Moshik Gueta. Enseñando hebreo a principiantes entendí dónde se traba quien empieza de cero. Hebraico Fluente convierte lo que funcionaba en mis clases en una metodología que sigues a tu ritmo.',
  historia: 'Conoce mi historia',
  linkedin: 'Ver mi perfil de LinkedIn',
  abreAba: ' (se abre en otra pestaña)',
  instagram: 'Instagram',
  instagramSr: ' de Hebraico Fluente (se abre en otra pestaña)',
  metodo: (autor: ReactNode, obra: ReactNode, translit: string, adaptacoes: string): ReactNode => (
    <>El método parte del trabajo de {autor}, autor de{' '}{obra}{' '}({translit}). El contenido de su libro es la base de lo que enseña esta plataforma. {adaptacoes}</>
  ),

  recursoAudioT: 'Audio y pronunciación',
  recursoSemAudioT: 'Pronunciación explicada',
  recursoAudioD: 'Cada letra, sílaba y palabra grabada por un hablante nativo.',
  // etapa 3: pronúncia, rever
  recursoSemAudioD: 'Cada sonido comparado con un sonido que ya haces en español.',
  correcaoT: 'Corrección inmediata',
  correcaoD: 'Sabes en el momento si acertaste - y por qué te equivocaste.',
  sequenciaT: 'Racha de estudio',
  sequenciaD: 'Los días seguidos cuentan. Faltar un día no borra tu XP ni tu récord, y un día libre guardado protege tu racha.',
  progressoT: 'Progreso visual',
  progressoD: 'Porcentaje por módulo y mapa de dominio de las letras.',
  revisaoT: 'Repaso inteligente',
  revisaoD: 'Lo que se te escapa vuelve solo, en el intervalo justo.',
  celularT: 'Estudia en el celular',
  celularD: 'Una actividad por pantalla, el botón de continuar siempre a mano.',
  explicacoesT: 'Explicaciones en español',
  // etapa 3: pronúncia, rever
  explicacoesD: 'Comparaciones con sonidos que ya conoces, siempre.',
  zeroT: 'Hebreo desde cero',
  zeroD: 'Ningún conocimiento previo. Empieza en la primera letra.',
  recursosTitulo: 'Lo que viene con el curso.',

  amostraTitulo: 'Pruébalo antes de empezar.',
  amostraTexto: 'Una pregunta real de la Lección 3, tal como aparece dentro de la plataforma. Elige una opción.',
  amostraVer: 'Ver el curso por dentro',
  amostraRotulo: 'Lección 3 · Reconocimiento',
  amostraPergunta: '¿Qué letra hace el sonido N?',
  amostraEscolha: 'Elige una de las cuatro letras de arriba.',
  muitoBem: '¡Muy bien!',
  xp: 'XP',
  amostraCerto: 'Nun hace el sonido N. Mem hace M, Tav hace T y He hace una H aspirada: las cuatro vienen de las dos primeras lecciones.',
  quase: 'Casi.',
  amostraErrado: (nome: string) =>
    `${nome} tiene otro sonido. Busca la letra angosta, de base corta - puedes intentarlo otra vez.`,

  depoimentoUm: 'Lo que dice una alumna.',
  depoimentosVarios: 'Lo que dicen los alumnos.',
  depoimento: 'Testimonio',
  depoimentos: 'Testimonios',

  precoRubrica: 'Pago único, sin mensualidad',
  precoTexto: 'Acceso completo a la plataforma, con el progreso guardado y repasos que se habilitan a medida que avanzas.',
  naSuaConta: 'En tu cuenta',
  jaESeu: 'Este curso ya es tuyo.',
  precoPreLancamento: 'Precio de preventa',
  acessoCompleto: 'Acceso completo',
  // etapa 5/6: Brasil, rever (PIX)
  noPix: 'por PIX, en un solo pago',
  // los sitios de fuera cobran por Stripe desde el 05/11/2026 (data/empresa.json, pagamento.exterior)
  noCartao: () => 'pago único',
  continua: 'Tu progreso sigue exactamente donde lo dejaste.',
  liberadoNaHora: (meses: number) => `Acceso habilitado en cuanto se confirma el pago, por ${meses} meses.`,
  // etapa 5/6: Brasil, rever (PIX)
  pixNaHora: (preco: string, pct: number, meses: number) =>
    `Por PIX cuesta ${preco} (${pct}% de descuento). Acceso habilitado en cuanto se confirma el pago, por ${meses} meses.`,
  // etapa 5/6: Brasil, rever (PIX)
  pixAMao: (preco: string, pct: number, meses: number) =>
    `Por PIX cuesta ${preco} (${pct}% de descuento). Acceso habilitado a mano después de revisar el pago, por ${meses} meses.`,
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  desistir: (dias: number) => `${dias} días para cancelar y recibir el 100% de vuelta, sin dar explicaciones.`,
  porDia: (valor: string, meses: number) => `Cerca de ${valor} por día durante los ${meses} meses de acceso.`,
  seloRotulo: 'Derecho a cancelar',
  seloDias: 'días',
  aMenos: (valor: string) => `${valor} menos`,
  aPartirDe: (data: string, cheio: string) => `A partir del ${data}: ${cheio}`,
  ate: (data: string) => `hasta el ${data}`,
  noPixDesconto: (pct: number) => `por PIX, en un solo pago (${pct}% de descuento)`,
  preLancamentoAte: (data: string, cheio: string) =>
    `Precio de preventa hasta el ${data}. Después, el curso pasará a costar ${cheio}.`,
  depoisDoPreLancamento: (cheio: string) => `Después de la preventa, el curso pasará a costar ${cheio}.`,

  faqRubrica: 'Antes de empezar',
  faqTitulo: 'Preguntas frecuentes',
  faqTexto: 'Lo que cubre el curso, cómo funciona el acceso y qué esperar dentro de la plataforma.',

  shalomTr: 'shalóm',
  shalomPt: 'hola, paz',
  todaTr: 'todá',
  todaPt: 'gracias',
  mayimTr: 'máyim',
  mayimPt: 'agua',
  fechoTitulo: 'Tu próxima palabra en hebreo puede ser la primera que de verdad logras leer.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

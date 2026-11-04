import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* app/cursos/[slug]/page.tsx e CourseClient.tsx: a página de um curso. */
const pt = {
  naoEncontrado: 'Curso não encontrado - Hebraico Fluente',

  voceEstaEm: 'Você está em',
  cursos: 'Cursos',
  curso: (code: string) => `Curso ${code}`,
  seuCurso: 'Seu curso',
  disponivel: 'Disponível',
  emBreve: 'Em breve',
  modulos: 'Módulos',
  licoes: 'Lições',
  acesso: 'Acesso',
  nMeses: (n: number) => `${n} meses`,
  ritmo: 'Ritmo',
  seu: 'Seu',

  resultadoEyebrow: 'No fim deste curso',
  resultadoTitulo: 'O que você vai conseguir fazer.',
  caminhoEyebrow: 'O caminho',
  modulosNestaOrdem: (n: number) => `${n} módulos, nesta ordem.`,
  ordemAberto: 'A ordem não é alfabética nem histórica: é a ordem em que cada peça abre mais palavras para você ler.',
  ordemFechado: 'O plano do curso. Pode mudar de nome até a publicação; a sequência, não.',
  nLetras: (n: number) => `${n} ${n === 1 ? 'letra' : 'letras'}`,

  paraQuemEyebrow: 'Para quem é',
  paraQuemTitulo: 'Este curso é para você se…',
  seNaoFor: 'E se não for para mim?',
  seNaoForTexto: (dias: number, meses: number, tempo: string) =>
    `Você tem ${dias} dias, contados da liberação do acesso, para desistir e receber 100% de volta, sem justificar; é só um botão em Sua conta. Depois disso, você tem ${meses} meses de acesso e nenhum prazo interno. ${tempo} O curso guarda onde você parou e volta exatamente ali.`,
  verDuvidas: 'Ver as dúvidas mais comuns →',

  comeceHoje: 'Comece hoje, na primeira lição.',
  aindaNao: 'Ainda não, mas está vindo.',
  liberadoSozinho: 'O acesso é liberado assim que o pagamento é confirmado - sem espera, sem liberação manual, sem e-mail para procurar na caixa de spam.',
  liberadoAMao: (prazo: string) =>
    `Você paga no PIX pelo aplicativo do seu banco e entra com o mesmo e-mail e senha. Conferimos o pagamento e liberamos o acesso à mão, ${prazo}.`,
  emProducao: 'Este curso está em produção. Quando sair, entra na mesma conta e continua de onde o anterior parou.',

  naSuaConta: 'Na sua conta',
  jaTem: 'Você já tem este curso.',
  continuar: 'Continuar',
  naoAVenda: 'Ainda não está à venda.',
  enquantoIsso: 'Enquanto isso, o caminho para chegar até aqui começa na alfabetização.',
  verCurso01: 'Ver o curso 01',
  progressoGuardado: 'Seu progresso continua guardado na sua conta e volta inteiro quando você renovar.',
  renovar: (meses: number) => `Renovar por mais ${meses} meses`,
  semCurso: 'Esta conta ainda não tem o curso',
  conectadoComo: (email: ReactNode): ReactNode => (
    <>Você está conectado como{' '}{email}. Se a compra foi feita com outro e-mail, entre com ele: o acesso fica na conta do e-mail que pagou.</>
  ),
  outroEmail: 'Entrar com outro e-mail',
  jaPagou: (contato: ReactNode): ReactNode => (
    <>Já pagou e continua vendo esta tela? <strong>Não pague de novo.</strong>{' '}Escreva para{' '}{contato}{' '}com o e-mail da compra que a gente libera.</>
  ),

  precoPreLancamento: 'Preço de pré-lançamento',
  depois: (fim: string | null, cheio: string) => `${fim ? `Até ${fim}. ` : ''}Depois, ${cheio}.`,
  noPix: 'no PIX',
  descontoSobre: (pct: number, preco: string) => ` · ${pct}% de desconto sobre ${preco}`,
  noCartao: (parcelas: string) => `ou ${parcelas} no cartão`,
  descontoNoPix: (pct: number, preco: string) => `${pct}% de desconto no PIX: ${preco}`,
  desbloquear: 'Desbloquear curso',
  pagamentoPix: 'Pagamento por PIX, pelo aplicativo do seu banco.',
  pixCartao: (parcelas: string) => `PIX, cartão ou parcelado ${parcelas}.`,
  cartao: (parcelas: string) => `Cartão de crédito, ou parcelado ${parcelas}.`,
  automatico: 'Acesso liberado automaticamente.',
  aMao: (prazo: string) => `Acesso liberado à mão, ${prazo} depois do pagamento.`,
  mesesAparelhos: (meses: number) => `${meses} meses, do celular ao computador.`,
  desistir: (dias: number) => `${dias} dias para desistir e receber 100% de volta, sem justificar.`,
  jaComprou: 'Já comprou?',
  entre: 'Entre na sua conta'
} as const;

const en: Traducao<typeof pt> = {
  naoEncontrado: 'Course not found - Hebrew Unlocked',

  voceEstaEm: 'You are here',
  cursos: 'Courses',
  curso: (code: string) => `Course ${code}`,
  seuCurso: 'Your course',
  disponivel: 'Available',
  emBreve: 'Coming soon',
  modulos: 'Modules',
  licoes: 'Lessons',
  acesso: 'Access',
  nMeses: (n: number) => `${n} months`,
  ritmo: 'Pace',
  seu: 'Yours',

  resultadoEyebrow: 'By the end of this course',
  resultadoTitulo: 'What you will be able to do.',
  caminhoEyebrow: 'The path',
  modulosNestaOrdem: (n: number) => `${n} modules, in this order.`,
  ordemAberto: 'The order is neither alphabetical nor historical: it is the order in which each piece opens up more words for you to read.',
  ordemFechado: 'The course plan. Names may change before release; the sequence will not.',
  nLetras: (n: number) => `${n} ${n === 1 ? 'letter' : 'letters'}`,

  paraQuemEyebrow: 'Who it is for',
  paraQuemTitulo: 'This course is for you if…',
  seNaoFor: 'What if it is not for me?',
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  seNaoForTexto: (dias: number, meses: number, tempo: string) =>
    `You have ${dias} days, counted from when your access is granted, to cancel and get 100% back, no reason needed; it is just a button in Your account. After that, you have ${meses} months of access and no internal deadlines. ${tempo} The course remembers where you stopped and takes you right back there.`,
  verDuvidas: 'See the most common questions →',

  comeceHoje: 'Start today, with the first lesson.',
  aindaNao: 'Not yet, but it is on its way.',
  liberadoSozinho: 'Access is granted as soon as payment is confirmed - no waiting, no manual approval, no email to dig out of your spam folder.',
  // etapa 5/6: Brasil, rever (PIX)
  liberadoAMao: (prazo: string) =>
    `You pay by PIX in your bank's app and sign in with the same email and password. We check the payment and grant access by hand, ${prazo}.`,
  emProducao: 'This course is in production. When it comes out, it goes on the same account and picks up where the previous one left off.',

  naSuaConta: 'In your account',
  jaTem: 'You already have this course.',
  continuar: 'Continue',
  naoAVenda: 'Not on sale yet.',
  enquantoIsso: 'In the meantime, the road to get here starts with learning to read.',
  verCurso01: 'See course 01',
  progressoGuardado: 'Your progress stays saved in your account and comes back in full when you renew.',
  renovar: (meses: number) => `Renew for ${meses} more months`,
  semCurso: 'This account does not have the course yet',
  conectadoComo: (email: ReactNode): ReactNode => (
    <>You are signed in as{' '}{email}. If you bought it with a different email, sign in with that one: access stays on the account of the email that paid.</>
  ),
  outroEmail: 'Sign in with another email',
  jaPagou: (contato: ReactNode): ReactNode => (
    <>Already paid and still seeing this screen? <strong>Do not pay again.</strong>{' '}Write to{' '}{contato}{' '}with the email you used to buy and we will grant access.</>
  ),

  precoPreLancamento: 'Pre-launch price',
  depois: (fim: string | null, cheio: string) => `${fim ? `Until ${fim}. ` : ''}After that, ${cheio}.`,
  // etapa 5/6: Brasil, rever (PIX)
  noPix: 'by PIX',
  descontoSobre: (pct: number, preco: string) => ` · ${pct}% off ${preco}`,
  // etapa 5: o site em inglês cobra pelo Paddle
  noCartao: () => 'one-time payment, taxes included',
  // etapa 5/6: Brasil, rever (PIX)
  descontoNoPix: (pct: number, preco: string) => `${pct}% off by PIX: ${preco}`,
  desbloquear: 'Unlock the course',
  // etapa 5/6: Brasil, rever (PIX)
  pagamentoPix: 'Payment by PIX, in your bank\'s app.',
  // etapa 5/6: Brasil, rever (PIX e parcelamento)
  pixCartao: (parcelas: string) => `PIX, card or installments ${parcelas}.`,
  // etapa 5: o site em inglês cobra pelo Paddle
  cartao: () => 'Card, PayPal, Apple Pay or Google Pay, through Paddle.',
  automatico: 'Access granted automatically.',
  aMao: (prazo: string) => `Access granted by hand, ${prazo} after payment.`,
  mesesAparelhos: (meses: number) => `${meses} months, from phone to computer.`,
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  desistir: (dias: number) => `${dias} days to cancel and get 100% back, no reason needed.`,
  jaComprou: 'Already bought it?',
  entre: 'Sign in to your account'
};

const es: Traducao<typeof pt> = {
  naoEncontrado: 'Curso no encontrado - Hebraico Fluente',

  voceEstaEm: 'Estás en',
  cursos: 'Cursos',
  curso: (code: string) => `Curso ${code}`,
  seuCurso: 'Tu curso',
  disponivel: 'Disponible',
  emBreve: 'Próximamente',
  modulos: 'Módulos',
  licoes: 'Lecciones',
  acesso: 'Acceso',
  nMeses: (n: number) => `${n} meses`,
  ritmo: 'Ritmo',
  seu: 'El tuyo',

  resultadoEyebrow: 'Al final de este curso',
  resultadoTitulo: 'Lo que vas a poder hacer.',
  caminhoEyebrow: 'El camino',
  modulosNestaOrdem: (n: number) => `${n} módulos, en este orden.`,
  ordemAberto: 'El orden no es alfabético ni histórico: es el orden en que cada pieza te abre más palabras para leer.',
  ordemFechado: 'El plan del curso. Los nombres pueden cambiar hasta la publicación; la secuencia, no.',
  nLetras: (n: number) => `${n} ${n === 1 ? 'letra' : 'letras'}`,

  paraQuemEyebrow: 'Para quién es',
  paraQuemTitulo: 'Este curso es para ti si…',
  seNaoFor: '¿Y si no es para mí?',
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  seNaoForTexto: (dias: number, meses: number, tempo: string) =>
    `Tienes ${dias} días, contados desde que se libera tu acceso, para cancelar y recibir el 100% de vuelta, sin dar explicaciones; es solo un botón en Tu cuenta. Después de eso, tienes ${meses} meses de acceso y ningún plazo interno. ${tempo} El curso guarda dónde te quedaste y vuelve exactamente ahí.`,
  verDuvidas: 'Ver las dudas más comunes →',

  comeceHoje: 'Empieza hoy, con la primera lección.',
  aindaNao: 'Todavía no, pero ya viene.',
  liberadoSozinho: 'El acceso se libera apenas se confirma el pago - sin espera, sin liberación manual, sin un correo que buscar en la carpeta de spam.',
  // etapa 5/6: Brasil, rever (PIX)
  liberadoAMao: (prazo: string) =>
    `Pagas por PIX en la aplicación de tu banco y entras con el mismo correo y contraseña. Revisamos el pago y liberamos el acceso a mano, ${prazo}.`,
  emProducao: 'Este curso está en producción. Cuando salga, entra en la misma cuenta y sigue donde el anterior terminó.',

  naSuaConta: 'En tu cuenta',
  jaTem: 'Ya tienes este curso.',
  continuar: 'Continuar',
  naoAVenda: 'Todavía no está a la venta.',
  enquantoIsso: 'Mientras tanto, el camino para llegar hasta aquí empieza aprendiendo a leer.',
  verCurso01: 'Ver el curso 01',
  progressoGuardado: 'Tu progreso sigue guardado en tu cuenta y vuelve completo cuando renuevas.',
  renovar: (meses: number) => `Renovar por ${meses} meses más`,
  semCurso: 'Esta cuenta todavía no tiene el curso',
  conectadoComo: (email: ReactNode): ReactNode => (
    <>Entraste como{' '}{email}. Si la compra se hizo con otro correo, entra con ese: el acceso queda en la cuenta del correo que pagó.</>
  ),
  outroEmail: 'Entrar con otro correo',
  jaPagou: (contato: ReactNode): ReactNode => (
    <>¿Ya pagaste y sigues viendo esta pantalla? <strong>No pagues de nuevo.</strong>{' '}Escribe a{' '}{contato}{' '}con el correo de la compra y liberamos tu acceso.</>
  ),

  precoPreLancamento: 'Precio de prelanzamiento',
  depois: (fim: string | null, cheio: string) => `${fim ? `Hasta el ${fim}. ` : ''}Después, ${cheio}.`,
  // etapa 5/6: Brasil, rever (PIX)
  noPix: 'por PIX',
  descontoSobre: (pct: number, preco: string) => ` · ${pct}% de descuento sobre ${preco}`,
  // etapa 5: el sitio de fuera cobra por Paddle
  noCartao: () => 'pago único, impuestos incluidos',
  // etapa 5/6: Brasil, rever (PIX)
  descontoNoPix: (pct: number, preco: string) => `${pct}% de descuento por PIX: ${preco}`,
  desbloquear: 'Desbloquear el curso',
  // etapa 5/6: Brasil, rever (PIX)
  pagamentoPix: 'Pago por PIX, en la aplicación de tu banco.',
  // etapa 5/6: Brasil, rever (PIX e parcelamento)
  pixCartao: (parcelas: string) => `PIX, tarjeta o en cuotas ${parcelas}.`,
  // etapa 5: el sitio de fuera cobra por Paddle
  cartao: () => 'Tarjeta, PayPal, Apple Pay o Google Pay, a través de Paddle.',
  automatico: 'Acceso liberado automáticamente.',
  aMao: (prazo: string) => `Acceso liberado a mano, ${prazo} después del pago.`,
  mesesAparelhos: (meses: number) => `${meses} meses, del celular a la computadora.`,
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  desistir: (dias: number) => `${dias} días para cancelar y recibir el 100% de vuelta, sin dar explicaciones.`,
  jaComprou: '¿Ya compraste?',
  entre: 'Entra en tu cuenta'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

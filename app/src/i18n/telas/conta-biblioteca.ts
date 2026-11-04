import type { Traducao } from '..';

/* app/minha-biblioteca: BibliotecaClient.tsx e page.tsx */
const pt = {
  metaTitulo: 'Minha Biblioteca - Hebraico Fluente',
  metaDescricao: 'Os cursos e as experiências da sua conta, num lugar só.',

  resumoCurso: 'Ler e escrever hebraico do zero, letra por letra.',
  resumoLivro: 'Uma experiência digital interativa pela história, a cultura e os lugares de Israel.',
  resumoA1: 'O hebraico do dia a dia, depois do alfabeto.',
  nomeRaizes: 'Raízes Sefarditas',
  resumoRaizes: 'A história, os caminhos e a memória sefardita.',

  abrindo: 'Abrindo a sua biblioteca...',
  entreNaConta: 'Entre na sua conta para ver os cursos e as experiências que você tem.',
  entrar: 'Entrar',
  abrir: 'Abrir',
  acessoAte: (data: string) => `Acesso até ${data}`,
  acessoSemFim: 'Acesso sem data de fim',
  comprasEmSuaContaAntes: 'Compras, recibos e desistência ficam em ',
  suaConta: 'Sua conta',

  conectadoComo: 'Você está conectado como ',
  semNenhumCurso: ', e esta conta ainda não tem nenhum curso.',
  pagamentoEsperando: 'Há um pagamento esperando confirmação',
  pendente: (nome: string, pix: boolean) =>
    `${nome}, ${pix ? 'por PIX' : 'no cartão'}. Assim que o pagamento for confirmado, o curso ` +
    'aparece aqui. Se você ainda não pagou, o código PIX está em Sua conta.',
  conferirPagamento: 'Conferir o pagamento',
  verCodigoPix: 'Ver o código PIX em Sua conta',
  acessoTerminou: (data: string) => `Seu acesso terminou em ${data}`,
  vencido: (nome: string) =>
    `${nome}. Seu progresso continua guardado e volta inteiro quando você renovar.`,
  renovar: 'Renovar o acesso',
  constaComoPago: 'Seu pagamento consta como pago',
  naoPagueDeNovo: 'Não pague de novo.',
  pagoSemAcesso: ' O acesso ainda não apareceu nesta conta: fale com a gente e a gente libera.',
  comecarCurso: 'Começar o curso de hebraico',
  verTudo: 'Ver tudo o que o Hebraico Fluente oferece',
  outroEmail: 'Comprou com outro e-mail? O curso fica na conta do e-mail que pagou.',
  entrarComOutro: 'Entrar com outro e-mail',
  jaPagou: 'Já pagou e o curso não aparece? ',
  faleComAGente: ' Fale com a gente',
  pelo: ' pelo ',
  whatsapp: 'WhatsApp',
  ou: ' ou',
  por: 'por ',
  comEmailDaCompra: ', com o e-mail da compra.',
  minhaBiblioteca: 'Minha Biblioteca'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'My Library - Hebrew Unlocked',
  metaDescricao: 'The courses and experiences in your account, all in one place.',

  resumoCurso: 'Read and write Hebrew from zero, letter by letter.',
  resumoLivro: 'An interactive digital experience through the history, culture and places of Israel.',
  resumoA1: 'Everyday Hebrew, after the alphabet.',
  nomeRaizes: 'Raizes Sefarditas',
  resumoRaizes: 'Sephardic history, journeys and memory.',

  abrindo: 'Opening your library...',
  entreNaConta: 'Sign in to your account to see the courses and experiences you have.',
  entrar: 'Sign in',
  abrir: 'Open',
  acessoAte: (data: string) => `Access until ${data}`,
  acessoSemFim: 'Access with no end date',
  comprasEmSuaContaAntes: 'Purchases, receipts and cancellations are in ',
  suaConta: 'Your account',

  conectadoComo: 'You are signed in as ',
  semNenhumCurso: ', and this account does not have any course yet.',
  pagamentoEsperando: 'A payment is waiting for confirmation',
  // etapa 5/6: Brasil, rever
  pendente: (nome: string, pix: boolean) =>
    `${nome}${pix ? ', by PIX' : ''}. As soon as the payment is confirmed, the course shows up here.`,
  conferirPagamento: 'Check the payment',
  verCodigoPix: 'See the PIX code in Your account',
  acessoTerminou: (data: string) => `Your access ended on ${data}`,
  vencido: (nome: string) =>
    `${nome}. Your progress is still saved and comes back in full when you renew.`,
  renovar: 'Renew access',
  constaComoPago: 'Your payment shows as paid',
  naoPagueDeNovo: 'Do not pay again.',
  pagoSemAcesso: ' Access has not shown up on this account yet: contact us and we will unlock it.',
  comecarCurso: 'Start the Hebrew course',
  verTudo: 'See everything Hebrew Unlocked offers',
  outroEmail: 'Bought with a different email? The course stays in the account of the email that paid.',
  entrarComOutro: 'Sign in with another email',
  jaPagou: 'Already paid and the course does not show up? ',
  faleComAGente: ' Contact us',
  pelo: ' on ',
  whatsapp: 'WhatsApp',
  ou: ' or',
  por: 'at ',
  comEmailDaCompra: ', with the email you used to buy.',
  minhaBiblioteca: 'My Library'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Mi Biblioteca - Hebraico Fluente',
  metaDescricao: 'Los cursos y las experiencias de tu cuenta, en un solo lugar.',

  resumoCurso: 'Leer y escribir hebreo desde cero, letra por letra.',
  resumoLivro: 'Una experiencia digital interactiva por la historia, la cultura y los lugares de Israel.',
  resumoA1: 'El hebreo del día a día, después del alfabeto.',
  nomeRaizes: 'Raizes Sefarditas',
  resumoRaizes: 'La historia, los caminos y la memoria sefardí.',

  abrindo: 'Abriendo tu biblioteca...',
  entreNaConta: 'Entra en tu cuenta para ver los cursos y las experiencias que tienes.',
  entrar: 'Entrar',
  abrir: 'Abrir',
  acessoAte: (data: string) => `Acceso hasta el ${data}`,
  acessoSemFim: 'Acceso sin fecha de fin',
  comprasEmSuaContaAntes: 'Las compras, los recibos y las cancelaciones están en ',
  suaConta: 'Tu cuenta',

  conectadoComo: 'Entraste como ',
  semNenhumCurso: ', y esta cuenta todavía no tiene ningún curso.',
  pagamentoEsperando: 'Hay un pago esperando confirmación',
  // etapa 5/6: Brasil, rever
  pendente: (nome: string, pix: boolean) =>
    `${nome}${pix ? ', por PIX' : ''}. En cuanto se confirme el pago, el curso aparece aquí.`,
  conferirPagamento: 'Revisar el pago',
  verCodigoPix: 'Ver el código PIX en Tu cuenta',
  acessoTerminou: (data: string) => `Tu acceso terminó el ${data}`,
  vencido: (nome: string) =>
    `${nome}. Tu progreso sigue guardado y vuelve completo cuando renueves.`,
  renovar: 'Renovar el acceso',
  constaComoPago: 'Tu pago figura como pagado',
  naoPagueDeNovo: 'No pagues de nuevo.',
  pagoSemAcesso: ' El acceso todavía no apareció en esta cuenta: escríbenos y lo liberamos.',
  comecarCurso: 'Empezar el curso de hebreo',
  verTudo: 'Ver todo lo que ofrece Hebraico Fluente',
  outroEmail: '¿Compraste con otro correo? El curso queda en la cuenta del correo que pagó.',
  entrarComOutro: 'Entrar con otro correo',
  jaPagou: '¿Ya pagaste y el curso no aparece? ',
  faleComAGente: ' Escríbenos',
  pelo: ' por ',
  whatsapp: 'WhatsApp',
  ou: ' o',
  por: 'a ',
  comEmailDaCompra: ', con el correo de la compra.',
  minhaBiblioteca: 'Mi Biblioteca'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

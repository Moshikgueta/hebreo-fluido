import type { Traducao } from '..';

/* app/conta-apagada/page.tsx */
const pt = {
  metaTitulo: 'Conta apagada - Hebraico Fluente',
  metaDescricao: 'A confirmação de que a conta e os dados pessoais foram apagados.',
  titulo: 'Conta apagada',
  feito: 'Está feito, e não é preciso fazer mais nada.',
  oQueFoiApagado: 'O que foi apagado',
  apagadoTexto:
    'Seu e-mail, seu nome, sua senha, todo o seu progresso e o seu acesso ao curso. Você já foi ' +
    'desconectado de todos os aparelhos onde estivesse logado.',
  oQueFicou: 'O que ficou, e por quê',
  ficouTexto:
    'O registro das suas compras, sem o seu nome e sem o seu e-mail. Guardar nota de venda é ' +
    'obrigação legal de quem vende, e a própria LGPD prevê essa guarda. O que sobrou é valor, ' +
    'data e situação do pagamento - nada que aponte para você.',
  voltar: 'Se um dia quiser voltar',
  voltarTexto:
    'É só criar uma conta nova com o mesmo e-mail. Ela começa do zero, porque não sobrou nada ' +
    'para recuperar - nem as letras que você já tinha aprendido.',
  paginaInicial: 'Ir para a página inicial',
  falarComAGente: 'Falar com a gente',
  duvida: 'Ficou alguma dúvida sobre os seus dados? Escreva para'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Account deleted - Hebrew Unlocked',
  metaDescricao: 'Confirmation that the account and personal data were deleted.',
  titulo: 'Account deleted',
  feito: 'It is done, and there is nothing else you need to do.',
  oQueFoiApagado: 'What was deleted',
  apagadoTexto:
    'Your email, your name, your password, all your progress and your access to the course. You ' +
    'have already been signed out of every device where you were signed in.',
  oQueFicou: 'What was kept, and why',
  // etapa 6: escrito para o site de fora
  ficouTexto:
    'The record of your purchases, without your name and without your email. Keeping sales ' +
    'records is a legal obligation for sellers, and data protection law allows for keeping ' +
    'them. What remains is the amount, date and status of the payment - ' +
    'nothing that points to you.',
  voltar: 'If you ever want to come back',
  voltarTexto:
    'Just create a new account with the same email. It starts from zero, because nothing was ' +
    'left to recover - not even the letters you had already learned.',
  paginaInicial: 'Go to the home page',
  falarComAGente: 'Contact us',
  duvida: 'Any questions about your data? Write to'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Cuenta eliminada - Hebraico Fluente',
  metaDescricao: 'La confirmación de que la cuenta y los datos personales se eliminaron.',
  titulo: 'Cuenta eliminada',
  feito: 'Está hecho, y no hace falta hacer nada más.',
  oQueFoiApagado: 'Qué se eliminó',
  apagadoTexto:
    'Tu correo, tu nombre, tu contraseña, todo tu progreso y tu acceso al curso. Ya se cerró tu ' +
    'sesión en todos los dispositivos donde la tenías abierta.',
  oQueFicou: 'Qué quedó, y por qué',
  // etapa 6: escrito para o site de fora
  ficouTexto:
    'El registro de tus compras, sin tu nombre y sin tu correo. Guardar los registros de venta ' +
    'es una obligación legal de quien vende, y la ley de protección de datos permite ' +
    'guardarlos. Lo que queda es el monto, la fecha y el estado del pago - ' +
    'nada que apunte a ti.',
  voltar: 'Si algún día quieres volver',
  voltarTexto:
    'Solo crea una cuenta nueva con el mismo correo. Empieza desde cero, porque no quedó nada ' +
    'para recuperar - ni las letras que ya habías aprendido.',
  paginaInicial: 'Ir a la página de inicio',
  falarComAGente: 'Escríbenos',
  duvida: '¿Te quedó alguna duda sobre tus datos? Escribe a'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

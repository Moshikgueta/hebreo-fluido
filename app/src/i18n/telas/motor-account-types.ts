import type { Traducao } from '..';

/* lib/account/types.ts - a frase de cada código de erro da conta e do
   pagamento, pronta para a tela. */
const pt = {
  badCredentials: 'E-mail ou senha não conferem.',
  emailTaken: 'Já existe uma conta com esse e-mail. Tente entrar.',
  weakPassword: 'A senha precisa de pelo menos 8 caracteres.',
  invalidEmail: 'Esse e-mail não parece válido.',
  termos: 'Para criar a conta, marque que você leu e aceita os Termos de Uso.',
  idade: 'Para criar a conta, confirme que tem 18 anos ou mais, ou que é o responsável por quem vai estudar.',
  notSignedIn: 'Você precisa entrar para continuar.',
  offline: 'Sem conexão. Tente de novo em um instante.',
  server: 'Alguma coisa quebrou do nosso lado. Tente de novo.',
  rateLimited: 'Tentativas demais. Espere um minuto.',
  rateLimitedHora: 'Tentativas demais por agora. Tente de novo daqui a uma hora.',
  paymentsOff: 'O pagamento ainda não está ativado. Escreva para {email} e liberamos seu acesso.',
  badToken: 'Esse link não vale mais. Peça outro - eles duram uma hora e funcionam uma vez só.',
  paymentFailed: 'Não conseguimos gerar o pagamento agora, e o problema é nosso, não seu. Nada foi cobrado. Escreva para {email}: respondemos {prazo}.',
  cardOff: 'No momento só aceitamos PIX. Volte e escolha PIX - o código sai na hora.',
  pixOff: 'No momento só aceitamos cartão de crédito. Volte e escolha cartão - dá para parcelar.',
  alreadyOwned: 'Este curso já está na sua conta. A renovação abre nos últimos 45 dias de acesso.',
  foraDoPrazo: 'O prazo de {dias} dias para desistir desta compra terminou. Se houver problema técnico ou cobrança indevida, escreva para {email}.',
  naoPago: 'Esta compra não está paga, então não há o que devolver.',
  dadosFiscais: 'Confira o nome completo e o CPF: eles vão na nota fiscal da compra.'
} as const;

const en: Traducao<typeof pt> = {
  badCredentials: 'E-mail or password does not match.',
  emailTaken: 'There is already an account with that e-mail. Try signing in.',
  weakPassword: 'The password needs at least 8 characters.',
  invalidEmail: 'That e-mail does not look valid.',
  termos: 'To create the account, check that you have read and accept the Terms of Use.',
  idade: 'To create the account, confirm that you are 18 or older, or the legal guardian of the person who will study.',
  notSignedIn: 'You need to sign in to continue.',
  offline: 'No connection. Try again in a moment.',
  server: 'Something broke on our end. Please try again.',
  rateLimited: 'Too many attempts. Wait a minute.',
  rateLimitedHora: 'Too many attempts for now. Try again in an hour.',
  paymentsOff: 'Payment is not turned on yet. Write to {email} and we will unlock your access.',
  badToken: 'This link is no longer valid. Ask for a new one - they last one hour and work only once.',
  paymentFailed: 'We could not create the payment right now, and the problem is on our side, not yours. Nothing was charged. Write to {email}: we reply {prazo}.',
  // etapa 5/6: Brasil, rever
  cardOff: 'Right now we only accept PIX. Go back and choose PIX - the code is generated right away.',
  // etapa 5/6: Brasil, rever
  pixOff: 'Right now we only accept credit cards. Go back and choose card - you can pay in installments.',
  alreadyOwned: 'This course is already in your account. Renewal opens in the last 45 days of access.',
  foraDoPrazo: 'The {dias}-day period to withdraw from this purchase has ended. If there is a technical problem or an incorrect charge, write to {email}.',
  naoPago: 'This purchase is not paid, so there is nothing to refund.',
  dadosFiscais: 'Check your full name and CPF: they go on the purchase invoice.'
};

const es: Traducao<typeof pt> = {
  badCredentials: 'El correo o la contraseña no coinciden.',
  emailTaken: 'Ya existe una cuenta con ese correo. Intenta entrar.',
  weakPassword: 'La contraseña necesita al menos 8 caracteres.',
  invalidEmail: 'Ese correo no parece válido.',
  termos: 'Para crear la cuenta, marca que leíste y aceptas los Términos de Uso.',
  idade: 'Para crear la cuenta, confirma que tienes 18 años o más, o que eres el responsable legal de quien va a estudiar.',
  notSignedIn: 'Necesitas entrar para continuar.',
  offline: 'Sin conexión. Inténtalo de nuevo en un momento.',
  server: 'Algo se rompió de nuestro lado. Inténtalo de nuevo.',
  rateLimited: 'Demasiados intentos. Espera un minuto.',
  rateLimitedHora: 'Demasiados intentos por ahora. Inténtalo de nuevo dentro de una hora.',
  paymentsOff: 'El pago todavía no está activado. Escribe a {email} y liberamos tu acceso.',
  badToken: 'Este enlace ya no es válido. Pide otro - duran una hora y funcionan una sola vez.',
  paymentFailed: 'No pudimos generar el pago ahora, y el problema es nuestro, no tuyo. No se cobró nada. Escribe a {email}: respondemos {prazo}.',
  // etapa 5/6: Brasil, rever
  cardOff: 'Por ahora solo aceptamos PIX. Vuelve y elige PIX - el código sale al instante.',
  // etapa 5/6: Brasil, rever
  pixOff: 'Por ahora solo aceptamos tarjeta de crédito. Vuelve y elige tarjeta - puedes pagar en cuotas.',
  alreadyOwned: 'Este curso ya está en tu cuenta. La renovación se abre en los últimos 45 días de acceso.',
  foraDoPrazo: 'El plazo de {dias} días para desistir de esta compra terminó. Si hay un problema técnico o un cobro indebido, escribe a {email}.',
  naoPago: 'Esta compra no está pagada, así que no hay nada que devolver.',
  dadosFiscais: 'Revisa el nombre completo y el CPF: van en la factura de la compra.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

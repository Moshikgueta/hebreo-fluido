import type { Traducao } from '..';

/* components/platform/EsqueciSenha.tsx e app/esqueci-senha/page.tsx.
   A confirmação diz "se existir uma conta", nos dois idiomas: a tela nunca
   pode dizer se o e-mail é de alguém (ver "Conta e senha" no CLAUDE.md). */
const pt = {
  metaTitulo: 'Recuperar a senha - Hebraico Fluente',
  metaDescricao: 'Mandamos um link para você escolher uma senha nova.',
  titulo: 'Recuperar a senha',
  olheCaixa:
    'Olhe sua caixa de entrada - e a pasta de spam, que é onde esse tipo de mensagem costuma cair.',
  digaEmail: 'Diga seu e-mail e mandamos um link para você escolher uma senha nova.',
  seExistirAntes: 'Se existir uma conta com ',
  seExistirDepois: ', o link já está a caminho. Ele vale por uma hora e funciona uma vez só.',
  demoSemEmail: 'Esta versão não manda e-mail de verdade. O link seria este:',
  mandarDeNovo: 'Mandar de novo',
  naoChegou: 'Não chegou em alguns minutos? Escreva para',
  resolveNaMao: 'que a gente resolve na mão.',
  email: 'E-mail',
  exemploEmail: 'ex.: voce@exemplo.com.br',
  enviando: 'Enviando…',
  mandarOLink: 'Mandar o link',
  lembrou: 'Lembrou?',
  entrar: 'Entrar'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Reset your password - Hebrew Unlocked',
  metaDescricao: 'We send you a link to choose a new password.',
  titulo: 'Reset your password',
  olheCaixa: 'Check your inbox - and your spam folder, which is where this kind of message tends to land.',
  digaEmail: 'Enter your email and we will send you a link to choose a new password.',
  seExistirAntes: 'If an account exists for ',
  seExistirDepois: ', the link is on its way. It is valid for one hour and works only once.',
  demoSemEmail: 'This version does not send real email. The link would be this one:',
  mandarDeNovo: 'Send again',
  naoChegou: 'Nothing after a few minutes? Write to',
  resolveNaMao: 'and we will sort it out by hand.',
  email: 'Email',
  exemploEmail: 'e.g. you@example.com',
  enviando: 'Sending…',
  mandarOLink: 'Send the link',
  lembrou: 'Remembered it?',
  entrar: 'Sign in'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Recuperar la contraseña - Hebraico Fluente',
  metaDescricao: 'Te enviamos un enlace para que elijas una contraseña nueva.',
  titulo: 'Recuperar la contraseña',
  olheCaixa:
    'Revisa tu bandeja de entrada - y la carpeta de spam, que es donde suele caer este tipo de mensaje.',
  digaEmail: 'Escribe tu correo y te enviamos un enlace para que elijas una contraseña nueva.',
  seExistirAntes: 'Si existe una cuenta con ',
  seExistirDepois: ', el enlace ya va en camino. Vale por una hora y funciona una sola vez.',
  demoSemEmail: 'Esta versión no envía correos de verdad. El enlace sería este:',
  mandarDeNovo: 'Enviar de nuevo',
  naoChegou: '¿No llegó en unos minutos? Escribe a',
  resolveNaMao: 'y lo resolvemos a mano.',
  email: 'Correo electrónico',
  exemploEmail: 'ej.: tu@ejemplo.com',
  enviando: 'Enviando…',
  mandarOLink: 'Enviar el enlace',
  lembrou: '¿La recordaste?',
  entrar: 'Entrar'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

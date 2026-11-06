import type { Traducao } from '..';

/* components/platform/ConfirmarEmail.tsx e app/confirmar-email/page.tsx */
const pt = {
  metaTitulo: 'Confirmar e-mail - Hebraico Fluente',
  metaDescricao: 'Confirme o e-mail da sua conta.',
  titulo: 'Confirmar seu e-mail',
  semTokenAntes:
    'Este endereço só funciona com o link que mandamos por e-mail. Se ele se perdeu, peça outro na página',
  suaConta: 'Sua conta',
  confirmando: 'Confirmando…',
  entreParaConfirmar:
    'Para confirmar, entre na conta que foi criada com este e-mail. Depois de entrar, você volta ' +
    'para cá e a confirmação é feita na hora.',
  entrarEConfirmar: 'Entrar e confirmar',
  naoFoiVoceAntes:
    'Não foi você que criou esta conta? Então alguém usou o seu endereço. Você pode tomá-la de ' +
    'volta pedindo uma',
  senhaNova: 'senha nova',
  naoFoiVoceDepois: '- o link chega só a você, e trocar a senha desconecta quem criou a conta.',
  confirmado: (email: string) => `Pronto: o e-mail ${email} está confirmado.`,
  irParaOCurso: 'Ir para o curso',
  recusado: 'Este link não vale para a conta aberta agora, ou já venceu - ele dura sete dias.',
  recusadoTexto:
    'Se você entrou com outra conta, saia e entre com a conta deste e-mail. Se o link venceu, ' +
    'peça outro na página Sua conta.',
  irParaSuaConta: 'Ir para Sua conta'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Confirm email - Hebrew Unlocked',
  metaDescricao: 'Confirm the email for your account.',
  titulo: 'Confirm your email',
  semTokenAntes:
    'This address only works with the link we sent you by email. If it got lost, ask for another one on the page',
  suaConta: 'Your account',
  confirmando: 'Confirming…',
  entreParaConfirmar:
    'To confirm, sign in to the account that was created with this email. After you sign in, ' +
    'you come back here and the confirmation happens right away.',
  entrarEConfirmar: 'Sign in and confirm',
  naoFoiVoceAntes:
    'You did not create this account? Then someone used your address. You can take it back by ' +
    'requesting a',
  senhaNova: 'new password',
  naoFoiVoceDepois: '- the link goes only to you, and changing the password signs out whoever created the account.',
  confirmado: (email: string) => `Done: the email ${email} is confirmed.`,
  irParaOCurso: 'Go to the course',
  recusado: 'This link is not valid for the account open right now, or it has expired - it lasts seven days.',
  recusadoTexto:
    'If you signed in with another account, sign out and sign in with the account for this ' +
    'email. If the link expired, ask for another one on the Your account page.',
  irParaSuaConta: 'Go to Your account'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Confirmar correo - Hebreo Fluido',
  metaDescricao: 'Confirma el correo de tu cuenta.',
  titulo: 'Confirmar tu correo',
  semTokenAntes:
    'Esta dirección solo funciona con el enlace que te enviamos por correo. Si se perdió, pide otro en la página',
  suaConta: 'Tu cuenta',
  confirmando: 'Confirmando…',
  entreParaConfirmar:
    'Para confirmar, entra en la cuenta que se creó con este correo. Después de entrar, vuelves ' +
    'aquí y la confirmación se hace en el momento.',
  entrarEConfirmar: 'Entrar y confirmar',
  naoFoiVoceAntes:
    '¿No fuiste tú quien creó esta cuenta? Entonces alguien usó tu dirección. Puedes recuperarla ' +
    'pidiendo una',
  senhaNova: 'contraseña nueva',
  naoFoiVoceDepois: '- el enlace te llega solo a ti, y cambiar la contraseña desconecta a quien creó la cuenta.',
  confirmado: (email: string) => `Listo: el correo ${email} está confirmado.`,
  irParaOCurso: 'Ir al curso',
  recusado: 'Este enlace no vale para la cuenta abierta ahora, o ya venció - dura siete días.',
  recusadoTexto:
    'Si entraste con otra cuenta, sal y entra con la cuenta de este correo. Si el enlace venció, ' +
    'pide otro en la página Tu cuenta.',
  irParaSuaConta: 'Ir a Tu cuenta'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

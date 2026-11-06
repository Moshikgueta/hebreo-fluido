import type { Traducao } from '..';

/* components/platform/NovaSenha.tsx e app/nova-senha/page.tsx */
const pt = {
  metaTitulo: 'Nova senha - Hebraico Fluente',
  metaDescricao: 'Escolha uma senha nova e volte para o curso.',
  senhasDiferentes: 'As duas senhas não são iguais.',
  titulo: 'Escolher uma senha nova',
  entraDireto: 'Depois disso você já entra direto - não precisa fazer login de novo.',
  soComLink: 'Este endereço só funciona com o link que mandamos por e-mail.',
  senhaNova: 'Senha nova',
  peloMenos: (n: number) => `Pelo menos ${n} caracteres.`,
  repitaSenha: 'Repita a senha',
  salvando: 'Salvando…',
  salvarEEntrar: 'Salvar e entrar',
  faltouLink:
    'Faltou o link. Peça um novo - eles duram uma hora e funcionam uma vez só, então é normal ' +
    'precisar de outro.',
  pedirLinkNovo: 'Pedir um link novo',
  lembrouSenha: 'Lembrou a senha?',
  entrar: 'Entrar'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'New password - Hebrew Unlocked',
  metaDescricao: 'Choose a new password and get back to the course.',
  senhasDiferentes: 'The two passwords do not match.',
  titulo: 'Choose a new password',
  entraDireto: 'After this you are signed in right away - no need to sign in again.',
  soComLink: 'This address only works with the link we sent you by email.',
  senhaNova: 'New password',
  peloMenos: (n: number) => `At least ${n} characters.`,
  repitaSenha: 'Repeat the password',
  salvando: 'Saving…',
  salvarEEntrar: 'Save and sign in',
  faltouLink:
    'The link is missing. Ask for a new one - they last one hour and work only once, so it is ' +
    'normal to need another.',
  pedirLinkNovo: 'Ask for a new link',
  lembrouSenha: 'Remembered your password?',
  entrar: 'Sign in'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Contraseña nueva - Hebreo Fluido',
  metaDescricao: 'Elige una contraseña nueva y vuelve al curso.',
  senhasDiferentes: 'Las dos contraseñas no son iguales.',
  titulo: 'Elegir una contraseña nueva',
  entraDireto: 'Después de esto entras directo - no hace falta iniciar sesión de nuevo.',
  soComLink: 'Esta dirección solo funciona con el enlace que te enviamos por correo.',
  senhaNova: 'Contraseña nueva',
  peloMenos: (n: number) => `Al menos ${n} caracteres.`,
  repitaSenha: 'Repite la contraseña',
  salvando: 'Guardando…',
  salvarEEntrar: 'Guardar y entrar',
  faltouLink:
    'Falta el enlace. Pide uno nuevo - duran una hora y funcionan una sola vez, así que es normal ' +
    'necesitar otro.',
  pedirLinkNovo: 'Pedir un enlace nuevo',
  lembrouSenha: '¿Recordaste la contraseña?',
  entrar: 'Entrar'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

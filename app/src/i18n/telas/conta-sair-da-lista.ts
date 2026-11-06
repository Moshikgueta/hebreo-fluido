import type { Traducao } from '..';

/* app/sair-da-lista: SairDaLista.tsx e page.tsx */
const pt = {
  metaTitulo: 'Sair da lista - Hebraico Fluente',
  metaDescricao: 'Pare de receber o aviso do próximo curso.',
  titulo: 'Sair da lista',
  saiuInteressado: 'Pronto: você saiu da lista e não vai receber mais nenhum e-mail dela.',
  saiuAviso:
    'Pronto: você não vai mais receber o aviso do próximo curso. Sua conta e seu acesso continuam iguais.',
  saiuLembrete:
    'Pronto: o lembrete para estudar está desligado. Sua conta, seu progresso e seu acesso continuam iguais.',
  confirmarLembrete:
    'Você não vai mais receber o lembrete para estudar. Isso não muda nada na sua conta, no seu progresso ' +
    'nem no seu acesso.',
  invalidoAntes: 'Este link não está completo. Abra de novo pelo e-mail, ou desmarque o aviso em ',
  suaConta: 'Sua conta',
  confirmarInteressado:
    'Você não vai mais receber nenhum e-mail desta lista: nem as próximas letras, nem os avisos que pediu.',
  confirmarAviso:
    'Você não vai mais receber o e-mail que avisa quando o próximo curso abrir. Isso não muda nada ' +
    'na sua conta nem no seu acesso.',
  erro: 'Não consegui agora. Tente de novo em instantes.',
  saindo: 'Saindo…',
  sair: 'Sair da lista'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Leave the list - Hebrew Unlocked',
  metaDescricao: 'Stop receiving the next course notice.',
  titulo: 'Leave the list',
  saiuInteressado: 'Done: you left the list and will not receive any more emails from it.',
  saiuAviso:
    'Done: you will no longer receive the next course notice. Your account and your access stay the same.',
  saiuLembrete:
    'Done: the study reminder is off. Your account, your progress and your access stay the same.',
  confirmarLembrete:
    'You will no longer receive the study reminder. This does not change anything in your account, ' +
    'your progress or your access.',
  invalidoAntes: 'This link is incomplete. Open it again from the email, or uncheck the notice in ',
  suaConta: 'Your account',
  confirmarInteressado:
    'You will no longer receive any email from this list: neither the next letters nor the notices you asked for.',
  confirmarAviso:
    'You will no longer receive the email that tells you when the next course opens. This does ' +
    'not change anything in your account or your access.',
  erro: 'I could not do it right now. Try again in a moment.',
  saindo: 'Leaving…',
  sair: 'Leave the list'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Salir de la lista - Hebreo Fluido',
  metaDescricao: 'Deja de recibir el aviso del próximo curso.',
  titulo: 'Salir de la lista',
  saiuInteressado: 'Listo: saliste de la lista y no vas a recibir ningún otro correo de ella.',
  saiuAviso:
    'Listo: ya no vas a recibir el aviso del próximo curso. Tu cuenta y tu acceso siguen iguales.',
  saiuLembrete:
    'Listo: el recordatorio para estudiar está apagado. Tu cuenta, tu progreso y tu acceso siguen iguales.',
  confirmarLembrete:
    'Ya no vas a recibir el recordatorio para estudiar. Esto no cambia nada en tu cuenta, en tu progreso ' +
    'ni en tu acceso.',
  invalidoAntes: 'Este enlace no está completo. Ábrelo de nuevo desde el correo, o desmarca el aviso en ',
  suaConta: 'Tu cuenta',
  confirmarInteressado:
    'Ya no vas a recibir ningún correo de esta lista: ni las próximas letras, ni los avisos que pediste.',
  confirmarAviso:
    'Ya no vas a recibir el correo que avisa cuando abra el próximo curso. Esto no cambia nada ' +
    'en tu cuenta ni en tu acceso.',
  erro: 'No pude hacerlo ahora. Intenta de nuevo en un momento.',
  saindo: 'Saliendo…',
  sair: 'Salir de la lista'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

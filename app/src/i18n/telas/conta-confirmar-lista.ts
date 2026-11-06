import type { Traducao } from '..';

/* app/confirmar-lista: ConfirmarLista.tsx e page.tsx */
const pt = {
  metaTitulo: 'Confirmar inscrição - Hebraico Fluente',
  metaDescricao: 'Confirme que quer receber os e-mails que pediu.',
  oQueCurso: 'as próximas letras do alfabeto e as novidades do curso',
  oQueIsrael: 'o aviso de quando Israel Além do Óbvio abrir',
  oQueRaizes: 'o aviso de quando Raízes Sefarditas abrir',
  oQueA1: 'o aviso de quando o curso Hebraico A1 abrir',
  titulo: 'Confirmar inscrição',
  confirmada: (oQue: string) =>
    `Pronto, inscrição confirmada. Você vai receber ${oQue}. Todo e-mail traz o link para sair da lista.`,
  oQuePediu: 'o que pediu',
  invalidoAntes: 'Este link não está completo ou já não vale. Abra de novo pelo e-mail, ou peça outra vez no',
  site: 'site',
  toqueNoBotao:
    'Toque no botão para confirmar que quer receber os e-mails que pediu no site do Hebraico ' +
    'Fluente. Você pode sair da lista quando quiser, pelo link de qualquer um deles.',
  erro: 'Não consegui agora. Tente de novo em instantes.',
  confirmando: 'Confirmando…',
  confirmar: 'Confirmar'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Confirm subscription - Hebrew Unlocked',
  metaDescricao: 'Confirm that you want to receive the emails you asked for.',
  oQueCurso: 'the next letters of the alphabet and the course news',
  oQueIsrael: 'the notice for when Israel Alem do Obvio opens',
  oQueRaizes: 'the notice for when Raizes Sefarditas opens',
  oQueA1: 'the notice for when the Hebrew A1 course opens',
  titulo: 'Confirm subscription',
  confirmada: (oQue: string) =>
    `Done, subscription confirmed. You will receive ${oQue}. Every email has the link to leave the list.`,
  oQuePediu: 'what you asked for',
  invalidoAntes: 'This link is incomplete or no longer valid. Open it again from the email, or ask again on the',
  site: 'site',
  toqueNoBotao:
    'Tap the button to confirm that you want to receive the emails you asked for on the ' +
    'Hebrew Unlocked site. You can leave the list whenever you want, through the link in any of them.',
  erro: 'I could not do it right now. Try again in a moment.',
  confirmando: 'Confirming…',
  confirmar: 'Confirm'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Confirmar suscripción - Hebreo Fluido',
  metaDescricao: 'Confirma que quieres recibir los correos que pediste.',
  oQueCurso: 'las próximas letras del alfabeto y las novedades del curso',
  oQueIsrael: 'el aviso de cuando abra Israel Alem do Obvio',
  oQueRaizes: 'el aviso de cuando abra Raizes Sefarditas',
  oQueA1: 'el aviso de cuando abra el curso Hebreo A1',
  titulo: 'Confirmar suscripción',
  confirmada: (oQue: string) =>
    `Listo, suscripción confirmada. Vas a recibir ${oQue}. Cada correo trae el enlace para salir de la lista.`,
  oQuePediu: 'lo que pediste',
  invalidoAntes: 'Este enlace no está completo o ya no vale. Ábrelo de nuevo desde el correo, o pídelo otra vez en el',
  site: 'sitio',
  toqueNoBotao:
    'Toca el botón para confirmar que quieres recibir los correos que pediste en el sitio de ' +
    'Hebreo Fluido. Puedes salir de la lista cuando quieras, con el enlace de cualquiera de ellos.',
  erro: 'No pude hacerlo ahora. Vuelve a intentarlo en un momento.',
  confirmando: 'Confirmando…',
  confirmar: 'Confirmar'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

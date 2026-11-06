import type { Traducao } from '..';

const pt = {
  tituloDaAba: 'Página não encontrada - Hebraico Fluente',
  titulo: 'Esta página não existe',
  texto: 'Talvez o link esteja antigo.',
  voltar: 'Voltar ao início'
} as const;

const en: Traducao<typeof pt> = {
  tituloDaAba: 'Page not found - Hebrew Unlocked',
  titulo: 'This page does not exist',
  texto: 'The link may be out of date.',
  voltar: 'Back to the start'
};

const es: Traducao<typeof pt> = {
  tituloDaAba: 'Página no encontrada - Hebreo Fluido',
  titulo: 'Esta página no existe',
  texto: 'Tal vez el enlace sea antiguo.',
  voltar: 'Volver al inicio'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

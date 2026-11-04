import type { Traducao } from '..';

/* lib/seo.ts - o texto alternativo dos cartões de compartilhamento. */
const pt = {
  ogCurso: 'Hebraico Fluente: aprenda a ler hebraico do zero',
  ogLivro: 'Israel Além do Óbvio, de Moshik Gueta: em breve'
} as const;

const en: Traducao<typeof pt> = {
  // a imagem do cartão ainda é a do site em português (tools/og.mjs)
  ogCurso: 'Hebrew Unlocked: learn to read Hebrew from zero',
  ogLivro: 'Israel Alem do Obvio, by Moshik Gueta: coming soon'
};

const es: Traducao<typeof pt> = {
  // a imagem do cartão ainda é a do site em português (tools/og.mjs)
  ogCurso: 'Hebraico Fluente: aprende a leer hebreo desde cero',
  ogLivro: 'Israel Alem do Obvio, de Moshik Gueta: próximamente'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

import type { Traducao } from '..';

/* components/landing/Hero.tsx */
const pt = {
  /* O hero com a foto do professor (29/10/2026, texto do dono). */
  titulo: 'Aprenda hebraico com quem nasceu em Israel',
  subtitulo: 'Leia e escreva em hebraico antes da sua viagem. Uma plataforma interativa criada por Moshik Gueta, israelense e professor de hebraico para brasileiros há mais de 6 anos.',
  bullet1: 'Do zero, no seu ritmo',
  bullet2: 'Palavras bíblicas no original',
  bullet3: 'Feito para quem fala português',
  whatsapp: 'Falar no WhatsApp',
  abreWhatsapp: '(abre o WhatsApp)',
  nome: 'Moshik Gueta',
  credenciais: 'Israelense · Professor de hebraico · Centenas de alunos brasileiros',
  fotoAlt: 'Moshik Gueta, professor israelense de hebraico',
  mockupAlt: 'Tela da plataforma interativa Hebraico Fluente no celular',
} as const;

const en: Traducao<typeof pt> = {
  // rever: texto do hero adaptado para o site em inglês
  titulo: 'Learn Hebrew with someone born in Israel',
  subtitulo: 'Read and write Hebrew before your trip. An interactive platform created by Moshik Gueta, an Israeli Hebrew teacher for more than 6 years.',
  bullet1: 'From zero, at your own pace',
  bullet2: 'Biblical words in the original',
  bullet3: 'Made for English speakers',
  whatsapp: 'Chat on WhatsApp',
  abreWhatsapp: '(opens WhatsApp)',
  nome: 'Moshik Gueta',
  credenciais: 'Israeli · Hebrew teacher · Hundreds of students',
  fotoAlt: 'Moshik Gueta, Israeli Hebrew teacher',
  mockupAlt: 'Screen of the Hebrew Unlocked interactive platform on a phone',
};

const es: Traducao<typeof pt> = {
  titulo: 'Aprende hebreo con alguien que nació en Israel',
  subtitulo: 'Lee y escribe en hebreo antes de tu viaje. Una plataforma interactiva creada por Moshik Gueta, israelí y profesor de hebreo desde hace más de 6 años.',
  bullet1: 'Desde cero, a tu ritmo',
  bullet2: 'Palabras bíblicas en el original',
  bullet3: 'Con explicaciones en español',
  whatsapp: 'Escribir por WhatsApp',
  abreWhatsapp: '(abre WhatsApp)',
  nome: 'Moshik Gueta',
  credenciais: 'Israelí · Profesor de hebreo · Cientos de alumnos',
  fotoAlt: 'Moshik Gueta, profesor israelí de hebreo',
  mockupAlt: 'Pantalla de la plataforma interactiva Hebreo Fluido en el celular',
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

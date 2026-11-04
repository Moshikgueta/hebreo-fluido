import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* app/page.tsx (a capa), app/curso-de-hebraico/page.tsx e
   CursoDeHebraicoClient.tsx: a mesma página de venda nos dois endereços. */
const pt = {
  metaTitulo: 'Aprenda a ler hebraico do zero - Hebraico Fluente',
  /* Até 155 caracteres (checa-seo.mjs). */
  metaDescricao:
    /* 31/10/2026 (auditoria de SEO): o professor israelense e o teste grátis,
       os dois motivos para clicar que a página cumpre (o hero e a aula aberta
       do Álef, sem conta), entraram; "22 letras" e "do zero" ficaram. */
    'Aprenda a ler hebraico do zero com um professor israelense: as 22 letras, as vogais e ' +
    'palavras reais, com correção na hora. Teste grátis da primeira letra.',
  parceria: (preco: ReactNode, ate: string | null): ReactNode => (
    <>Seu link garante um preço especial: o curso sai por {preco} no checkout{ate ? `, até ${ate}` : ''}.</>
  ),
  quero: 'Quero começar'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Learn to read Hebrew from zero - Hebrew Unlocked',
  metaDescricao:
    'Learn to read Hebrew from zero with an Israeli teacher: the 22 letters, the vowels and ' +
    'real words, with instant feedback. Free trial of the first letter.',
  parceria: (preco: ReactNode, ate: string | null): ReactNode => (
    <>Your link gets you a special price: the course comes to {preco} at checkout{ate ? `, until ${ate}` : ''}.</>
  ),
  quero: 'I want to start'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Aprende a leer hebreo desde cero - Hebraico Fluente',
  metaDescricao:
    'Aprende a leer hebreo desde cero con un profesor israelí: las 22 letras, las vocales y ' +
    'palabras reales, con corrección al instante. Primera letra gratis.',
  parceria: (preco: ReactNode, ate: string | null): ReactNode => (
    <>Tu enlace te da un precio especial: el curso sale a {preco} en el pago{ate ? `, hasta el ${ate}` : ''}.</>
  ),
  quero: 'Quiero empezar'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

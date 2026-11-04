import type { Traducao } from '..';

/* app/cursos/page.tsx e CursosClient.tsx: a trilha dos cursos. */
const pt = {
  metaTitulo: 'Cursos de Hebraico - Hebraico Fluente',
  metaDescricao:
    'Alfabetização em hebraico para brasileiros, do zero: disponível hoje. ' +
    'A1, A2 e B1 em produção, vendidos à parte na mesma conta.',
  trilha: 'Os cursos',
  eyebrow: 'Cursos de hebraico',
  titulo: 'Comece pelo alfabeto.',
  lead: 'A Alfabetização está disponível hoje. O A1, o A2 e o B1 estão em produção e serão vendidos à parte, na mesma conta, cada um começando onde o anterior parou.',
  ordemEyebrow: 'A ordem',
  ordemTitulo: 'O que cada nível entrega.',
  seuCurso: 'Seu curso',
  disponivel: 'Disponível',
  emBreve: 'Em breve',
  nModulos: (n: number) => `${n} módulos`,
  nLicoes: (n: number) => `${n} lições`,
  continuar: 'Continuar',
  verCurso: 'Ver o curso',
  oQueVem: 'O que vem nele',
  pularTitulo: 'Não dá para pular a alfabetização.',
  pularTexto: 'E não é regra de venda: do A1 em diante nada é escrito em transliteração. Quem chega sem ler o alfabeto passa o curso inteiro decorando sons em vez de aprender a língua. Se você já lê hebraico com nikud, comece direto no A1 quando ele sair.'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Hebrew Courses - Hebrew Unlocked',
  metaDescricao:
    'Learn to read Hebrew from zero, for English speakers: the 22 letters, the vowel signs and ' +
    'real words, at your own pace. Available today.',
  trilha: 'The courses',
  eyebrow: 'Hebrew courses',
  titulo: 'Start with the alphabet.',
  lead: 'The reading course is available today, and for now it is the only course on this site.',
  ordemEyebrow: 'The order',
  ordemTitulo: 'What each level delivers.',
  seuCurso: 'Your course',
  disponivel: 'Available',
  emBreve: 'Coming soon',
  nModulos: (n: number) => `${n} modules`,
  nLicoes: (n: number) => `${n} lessons`,
  continuar: 'Continue',
  verCurso: 'See the course',
  oQueVem: 'What is in it',
  pularTitulo: 'You cannot skip learning to read.',
  pularTexto: 'And it is not a sales rule: from A1 on, nothing is written in transliteration. Anyone who arrives without reading the alphabet spends the whole course memorizing sounds instead of learning the language. If you already read Hebrew with nikud, start straight at A1 when it comes out.'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Cursos de hebreo - Hebraico Fluente',
  metaDescricao:
    'Aprende a leer hebreo desde cero: las 22 letras, los signos de vocal y ' +
    'palabras reales, a tu ritmo. Disponible hoy.',
  trilha: 'Los cursos',
  eyebrow: 'Cursos de hebreo',
  titulo: 'Empieza por el alfabeto.',
  lead: 'El curso de lectura está disponible hoy, y por ahora es el único curso de este sitio.',
  ordemEyebrow: 'El orden',
  ordemTitulo: 'Lo que entrega cada nivel.',
  seuCurso: 'Tu curso',
  disponivel: 'Disponible',
  emBreve: 'Próximamente',
  nModulos: (n: number) => `${n} módulos`,
  nLicoes: (n: number) => `${n} lecciones`,
  continuar: 'Continuar',
  verCurso: 'Ver el curso',
  oQueVem: 'Lo que trae',
  pularTitulo: 'No se puede saltar el aprendizaje de la lectura.',
  pularTexto: 'Y no es una regla de venta: del A1 en adelante nada se escribe en transliteración. Quien llega sin leer el alfabeto pasa el curso entero memorizando sonidos en lugar de aprender el idioma. Si ya lees hebreo con nikud, empieza directo en el A1 cuando salga.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

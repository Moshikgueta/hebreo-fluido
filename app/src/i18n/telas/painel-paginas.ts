import type { Traducao } from '..';

/* O título e a descrição (metadata) das páginas do painel do aluno:
   app/historia, app/meu-hebraico, app/meu-hebraico/dominio, app/depoimento,
   app/certificado e app/verificar-certificado (cada page.tsx). */
const pt = {
  historiaTitulo: 'Viagem pela história do hebraico - Hebraico Fluente',
  historiaDescricao: 'De onde vem o alfabeto, de onde vieram os pontinhos, e como uma língua voltou a ser falada.',
  meuHebraicoTitulo: 'Meu Hebraico - Hebraico Fluente',
  meuHebraicoDescricao: 'Seus cursos, seu progresso e a aula de hoje.',
  dominioTitulo: 'Meu domínio das letras - Hebraico Fluente',
  dominioDescricao: 'As letras que você já domina, as que estão quase e o que vale praticar agora.',
  depoimentoTitulo: 'Seu depoimento - Hebraico Fluente',
  depoimentoDescricao: 'Conte como está sendo aprender a ler hebraico com o curso.',
  certificadoTitulo: 'Certificado - Hebraico Fluente',
  certificadoDescricao: 'O certificado de conclusão do curso de alfabetização em hebraico.',
  verificarTitulo: 'Conferir um certificado - Hebraico Fluente',
  verificarDescricao: 'Confira se um certificado do curso Hebraico A1 foi emitido pelo Hebraico Fluente.'
} as const;

const en: Traducao<typeof pt> = {
  historiaTitulo: 'A journey through the history of Hebrew - Hebrew Unlocked',
  historiaDescricao: 'Where the alphabet comes from, where the little dots came from, and how a language came to be spoken again.',
  meuHebraicoTitulo: 'My Hebrew - Hebrew Unlocked',
  meuHebraicoDescricao: 'Your courses, your progress and today\'s lesson.',
  dominioTitulo: 'My letter mastery - Hebrew Unlocked',
  dominioDescricao: 'The letters you have mastered, the ones you almost have and what is worth practicing now.',
  depoimentoTitulo: 'Your testimonial - Hebrew Unlocked',
  depoimentoDescricao: 'Tell us what it is like learning to read Hebrew with the course.',
  certificadoTitulo: 'Certificate - Hebrew Unlocked',
  certificadoDescricao: 'The certificate of completion for the Hebrew reading course.',
  verificarTitulo: 'Verify a certificate - Hebrew Unlocked',
  verificarDescricao: 'Check whether a Hebraico A1 course certificate was issued by Hebrew Unlocked.'
};

const es: Traducao<typeof pt> = {
  historiaTitulo: 'Viaje por la historia del hebreo - Hebreo Fluido',
  historiaDescricao: 'De dónde viene el alfabeto, de dónde salieron los puntitos y cómo una lengua volvió a hablarse.',
  meuHebraicoTitulo: 'Mi hebreo - Hebreo Fluido',
  meuHebraicoDescricao: 'Tus cursos, tu progreso y la lección de hoy.',
  dominioTitulo: 'Mi dominio de las letras - Hebreo Fluido',
  dominioDescricao: 'Las letras que ya dominas, las que casi dominas y lo que vale la pena practicar ahora.',
  depoimentoTitulo: 'Tu testimonio - Hebreo Fluido',
  depoimentoDescricao: 'Cuéntanos cómo es aprender a leer hebreo con el curso.',
  certificadoTitulo: 'Certificado - Hebreo Fluido',
  certificadoDescricao: 'El certificado de finalización del curso de lectura en hebreo.',
  verificarTitulo: 'Verificar un certificado - Hebreo Fluido',
  verificarDescricao: 'Comprueba si un certificado del curso Hebraico A1 fue emitido por Hebreo Fluido.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

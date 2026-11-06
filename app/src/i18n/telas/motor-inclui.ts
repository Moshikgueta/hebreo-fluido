import type { Traducao } from '..';

/* lib/inclui.ts - o que o preço do curso compra, item por item. */
const pt = {
  aula0: 'Aula 0: como o hebraico funciona, antes da primeira letra',
  licoes: (n: number): string => `${n} lições, uma letra por vez`,
  cursiva: 'Escrita cursiva traçada na tela, com avaliação do traço',
  audio: 'Áudio gravado pelo professor, um israelense',
  semAudio: 'Explicação de som para cada letra',
  jogos: 'Jogos de prática na Academia de Leitura',
  exame: 'Exame final e certificado de conclusão (não oficial)',
  progresso: 'Progresso salvo, no celular e no computador',
  umDia: 'Um dia em Israel: oito situações de leitura, do trem à festa',
  duvidas: 'Dúvidas direto com o professor, dentro do curso'
} as const;

const en: Traducao<typeof pt> = {
  aula0: 'Lesson 0: how Hebrew works, before the first letter',
  licoes: (n: number): string => `${n} lessons, one letter at a time`,
  cursiva: 'Cursive writing traced on the screen, with feedback on your strokes',
  audio: 'Audio recorded by the teacher, a native Israeli',
  semAudio: 'An explanation of the sound of each letter',
  jogos: 'Practice games in the Reading Academy',
  exame: 'Final exam and certificate of completion (not official)',
  progresso: 'Progress saved, on your phone and on your computer',
  umDia: 'A day in Israel: eight reading moments, from the train to the party',
  duvidas: 'Questions straight to the teacher, inside the course'
};

const es: Traducao<typeof pt> = {
  aula0: 'Clase 0: cómo funciona el hebreo, antes de la primera letra',
  licoes: (n: number): string => `${n} lecciones, una letra a la vez`,
  cursiva: 'Escritura cursiva trazada en la pantalla, con evaluación del trazo',
  audio: 'Audio grabado por el profesor, un israelí',
  semAudio: 'Explicación del sonido de cada letra',
  jogos: 'Juegos de práctica en la Academia de Lectura',
  exame: 'Examen final y certificado de finalización (no oficial)',
  progresso: 'Progreso guardado, en el celular y en la computadora',
  umDia: 'Un día en Israel: ocho momentos de lectura, del tren a la fiesta',
  duvidas: 'Dudas directo con el profesor, dentro del curso'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

import type { Traducao } from '..';

/* O Pomar das palavras (05/11/2026): components/game/Pomar.tsx. */
const pt = {
  pontos: 'pontos',
  jogadas: 'jogadas',
  palavraN: (i: number, total: number) => `Palavra ${i} de ${total}`,
  seguidas: (n: number) => `${n} seguidas`,
  oQueQuerDizer: 'O que quer dizer?',
  naoSei: 'Não sei',
  mostrarPontos: 'Mostrar os pontos',
  ganhou: (n: number) => (n > 1 ? `+${n} jogadas (três seguidas)` : '+1 jogada'),
  acerteParaJogar: 'Acerte a palavra para ganhar uma jogada',
  pomar: 'Pomar',
  fruta: (nome: string, linha: number, coluna: number) => `${nome}, linha ${linha}, coluna ${coluna}`,
  sobraram: 'Fim das palavras. Use as jogadas que sobraram no pomar.',
  terminar: 'Terminar',
  frutaRoma: 'romã',
  frutaOliva: 'azeitona',
  frutaTamara: 'tâmara',
  frutaLaranja: 'laranja',
  frutaUva: 'uva',
  frutaFigo: 'figo',
} as const;

const en: Traducao<typeof pt> = {
  pontos: 'points',
  jogadas: 'moves',
  palavraN: (i: number, total: number) => `Word ${i} of ${total}`,
  seguidas: (n: number) => `${n} in a row`,
  oQueQuerDizer: 'What does it mean?',
  naoSei: "I don't know",
  mostrarPontos: 'Show the points',
  ganhou: (n: number) => (n > 1 ? `+${n} moves (three in a row)` : '+1 move'),
  acerteParaJogar: 'Get the word right to earn a move',
  pomar: 'Orchard',
  fruta: (nome: string, linha: number, coluna: number) => `${nome}, row ${linha}, column ${coluna}`,
  sobraram: 'No more words. Use the moves you have left in the orchard.',
  terminar: 'Finish',
  frutaRoma: 'pomegranate',
  frutaOliva: 'olive',
  frutaTamara: 'date',
  frutaLaranja: 'orange',
  frutaUva: 'grape',
  frutaFigo: 'fig',
};

const es: Traducao<typeof pt> = {
  pontos: 'puntos',
  jogadas: 'jugadas',
  palavraN: (i: number, total: number) => `Palabra ${i} de ${total}`,
  seguidas: (n: number) => `${n} seguidas`,
  oQueQuerDizer: '¿Qué significa?',
  naoSei: 'No sé',
  mostrarPontos: 'Mostrar los puntos',
  ganhou: (n: number) => (n > 1 ? `+${n} jugadas (tres seguidas)` : '+1 jugada'),
  acerteParaJogar: 'Acierta la palabra para ganar una jugada',
  pomar: 'Huerto',
  fruta: (nome: string, linha: number, coluna: number) => `${nome}, fila ${linha}, columna ${coluna}`,
  sobraram: 'Se acabaron las palabras. Usa las jugadas que te quedan en el huerto.',
  terminar: 'Terminar',
  frutaRoma: 'granada',
  frutaOliva: 'aceituna',
  frutaTamara: 'dátil',
  frutaLaranja: 'naranja',
  frutaUva: 'uva',
  frutaFigo: 'higo',
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

const NOMES: Record<string, keyof typeof pt> = { roma: 'frutaRoma', oliva: 'frutaOliva', tamara: 'frutaTamara', laranja: 'frutaLaranja', uva: 'frutaUva', figo: 'frutaFigo' };
/** O nome de uma fruta do tabuleiro, para o leitor de tela. */
export const nomeDaFruta = (f: string) => (tx as unknown as Record<string, string>)[NOMES[f] ?? ''] ?? f;

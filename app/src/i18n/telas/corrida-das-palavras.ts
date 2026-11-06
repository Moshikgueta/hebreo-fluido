import type { Traducao } from '..';

/* A corrida das palavras (05/11/2026): app/um-dia-em-israel/corrida. */
const pt = {
  titulo: 'Corrida das palavras',
  intro: 'Escolha o que treinar: as letras, os sons ou as palavras das placas, dos cartões, da estação, do shuk, do supermercado e das mensagens. Leia rápido e escolha a resposta.',
  voltar: 'Hebraico na vida real',
  modo: 'Modo',
  comRelogio: 'Com relógio',
  semRelogio: 'Sem relógio',
  inicio: (n: number, segundos: number, relogio: boolean) =>
    `${n} perguntas${relogio ? `, ${segundos} segundos cada` : ', no seu ritmo'}. Acertos seguidos valem mais.`,
  recorde: (n: number) => `Seu recorde: ${n} pontos`,
  comecar: 'Começar',
  poucasAinda: 'Ainda são poucas palavras com as letras que você já aprendeu. Siga o curso: elas aparecem aqui.',
  progresso: (i: number, total: number) => `${i}/${total}`,
  seguidas: (n: number) => `${n} seguidas`,
  pontos: (n: number) => `${n} pts`,
  segundos: (n: number) => `${n} s`,
  acabouTempo: 'O tempo acabou.',
  fim: (acertos: number, total: number, relogio: boolean) => `${acertos} de ${total} certas${relogio ? '' : ' (sem relógio)'}.`,
  recordeNovo: 'Recorde novo!',
  rapida: 'Leitura rápida de verdade.',
  semRelogioPrimeiro: 'Jogue sem relógio primeiro e volte para a corrida.',
  jogarDeNovo: 'Jogar de novo'
} as const;

const en: Traducao<typeof pt> = {
  titulo: 'Word race',
  intro: 'Choose what to practice: the letters, the sounds, or the words from the signs, the cards, the station, the market, the supermarket and the messages. Read fast and pick the answer.',
  voltar: 'Hebrew in real life',
  modo: 'Mode',
  comRelogio: 'With the clock',
  semRelogio: 'Without the clock',
  inicio: (n, segundos, relogio) => `${n} questions${relogio ? `, ${segundos} seconds each` : ', at your own pace'}. Answers in a row are worth more.`,
  recorde: n => `Your record: ${n} points`,
  comecar: 'Start',
  poucasAinda: 'There are still few words with the letters you have learned. Keep going with the course: they will appear here.',
  progresso: (i, total) => `${i}/${total}`,
  seguidas: n => `${n} in a row`,
  pontos: n => `${n} pts`,
  segundos: n => `${n} s`,
  acabouTempo: 'Time is up.',
  fim: (acertos, total, relogio) => `${acertos} of ${total} right${relogio ? '' : ' (without the clock)'}.`,
  recordeNovo: 'New record!',
  rapida: 'Truly fast reading.',
  semRelogioPrimeiro: 'Play without the clock first, then come back to the race.',
  jogarDeNovo: 'Play again'
};

const es: Traducao<typeof pt> = {
  titulo: 'Carrera de palabras',
  intro: 'Elige qué practicar: las letras, los sonidos o las palabras de los carteles, las tarjetas, la estación, el shuk, el supermercado y los mensajes. Lee rápido y elige la respuesta.',
  voltar: 'Hebreo en la vida real',
  modo: 'Modo',
  comRelogio: 'Con reloj',
  semRelogio: 'Sin reloj',
  inicio: (n, segundos, relogio) => `${n} preguntas${relogio ? `, ${segundos} segundos cada una` : ', a tu ritmo'}. Los aciertos seguidos valen más.`,
  recorde: n => `Tu récord: ${n} puntos`,
  comecar: 'Empezar',
  poucasAinda: 'Todavía hay pocas palabras con las letras que ya aprendiste. Sigue el curso: aparecerán aquí.',
  progresso: (i, total) => `${i}/${total}`,
  seguidas: n => `${n} seguidas`,
  pontos: n => `${n} pts`,
  segundos: n => `${n} s`,
  acabouTempo: 'Se acabó el tiempo.',
  fim: (acertos, total, relogio) => `${acertos} de ${total} correctas${relogio ? '' : ' (sin reloj)'}.`,
  recordeNovo: '¡Récord nuevo!',
  rapida: 'Lectura rápida de verdad.',
  semRelogioPrimeiro: 'Juega sin reloj primero y vuelve a la carrera.',
  jogarDeNovo: 'Jugar de nuevo'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

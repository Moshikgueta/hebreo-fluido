import type { Traducao } from '..';

/* app/hebraico-na-rua (28/10/2026). */
const pt = {
  metaTitulo: 'Hebraico na rua - Hebraico Fluente',
  metaDescricao: 'Placas de verdade de Israel com palavras que você já lê.',
  titulo: 'Hebraico na rua',
  intro: 'Placas de verdade, fotografadas em Israel. Em cada uma há uma palavra que você já lê. Na rua as palavras vêm sem os pontos: compare as letras.',
  pergunta: 'Esta placa tem uma palavra que você já lê. Qual?',
  certo: 'Isso!',
  quase: 'Quase.',
  naPlaca: 'Na placa ela vem sem os pontos:',
  significa: (translit: string, pt: string) => `«${translit}», ${pt}.`,
  proxima: 'Próxima placa',
  deNovo: 'Ver as placas de novo',
  placaN: (n: number, total: number) => `Placa ${n} de ${total}`,
  todas: (n: number) => `Você leu as ${n} placas.`,
  faltam: (n: number) => `Mais ${n} ${n === 1 ? 'placa chega' : 'placas chegam'} com as próximas letras.`,
  nenhumaAinda: 'A primeira placa aparece quando você ler a primeira palavra dela. Continue as lições.',
  emBreve: 'As placas estão a caminho.',
  voltar: 'Leituras'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Hebrew on the street - Hebrew Unlocked',
  metaDescricao: 'Real signs from Israel with words you can already read.',
  titulo: 'Hebrew on the street',
  intro: 'Real signs, photographed in Israel. Each one has a word you can already read. On the street words come without the vowel points: compare the letters.',
  pergunta: 'This sign has a word you can already read. Which one?',
  certo: 'Yes!',
  quase: 'Almost.',
  naPlaca: 'On the sign it appears without the points:',
  significa: (translit, pt) => `«${translit}», ${pt}.`,
  proxima: 'Next sign',
  deNovo: 'See the signs again',
  placaN: (n, total) => `Sign ${n} of ${total}`,
  todas: n => `You read all ${n} signs.`,
  faltam: n => `${n} more ${n === 1 ? 'sign arrives' : 'signs arrive'} with the next letters.`,
  nenhumaAinda: 'The first sign appears when you can read its first word. Keep going with the lessons.',
  emBreve: 'The signs are on their way.',
  voltar: 'Readings'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Hebreo en la calle - Hebraico Fluente',
  metaDescricao: 'Carteles reales de Israel con palabras que ya lees.',
  titulo: 'Hebreo en la calle',
  intro: 'Carteles reales, fotografiados en Israel. En cada uno hay una palabra que ya lees. En la calle las palabras vienen sin los puntos: compara las letras.',
  pergunta: 'Este cartel tiene una palabra que ya lees. ¿Cuál?',
  certo: '¡Eso!',
  quase: 'Casi.',
  naPlaca: 'En el cartel viene sin los puntos:',
  significa: (translit, pt) => `«${translit}», ${pt}.`,
  proxima: 'Siguiente cartel',
  deNovo: 'Ver los carteles de nuevo',
  placaN: (n, total) => `Cartel ${n} de ${total}`,
  todas: n => `Leíste los ${n} carteles.`,
  faltam: n => `${n} ${n === 1 ? 'cartel más llega' : 'carteles más llegan'} con las próximas letras.`,
  nenhumaAinda: 'El primer cartel aparece cuando puedas leer su primera palabra. Sigue con las lecciones.',
  emBreve: 'Los carteles están en camino.',
  voltar: 'Lecturas'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

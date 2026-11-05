import type { Traducao } from '..';

/* O shuk (05/11/2026): a parada das 12h de Um dia em Israel
 * (app/um-dia-em-israel/shuk). */
const pt = {
  titulo: 'O shuk',
  intro: 'Um corredor do mercado em Israel. Cada banca tem o nome escrito à mão e o preço do quilo. Leia, ache a banca e faça a conta.',
  modo: 'Modo',
  modoLer: 'Passear no shuk',
  modoJogo: 'Fazer as compras',
  mercado: 'Mercado',
  oQuilo: 'o quilo',
  dicaLer: 'Toque numa banca para ver como se lê.',
  dicaAchar: 'Os desenhos somem: leia só o hebraico.',
  dicaPagar: 'O preço está no cartão da banca.',
  quilos: (n: number) => (n === 1 ? '1 quilo' : `${n} quilos`),
  clienteN: (i: number, total: number) => `Cliente ${i} de ${total}`,
  bancaN: (n: number) => `Banca ${n}`,
  lista: (quilos: string, produto: string) => `Sua lista: ${quilos} de ${produto}. Ache a banca.`,
  isso: 'Isso,',
  a: 'a',
  quantoPaga: (quilos: string) => `o quilo. Quanto você paga por ${quilos}?`,
  naPrimeira: 'Certinho, na primeira!',
  certoAgora: 'Certo agora.',
  proximo: 'Próximo item',
  verResultado: 'Ver o resultado',
  fimTodos: 'Sacola cheia e troco certo. Você já compra no shuk.',
  fimMetade: 'Quase tudo certo. Mostre os pontos nas que travaram e volte ao shuk.',
  fimPoucos: 'Passeie no shuk, leia cada banca em voz alta e tente de novo.',
  jogarDeNovo: 'Jogar de novo',
  exemplo: 'Os preços são exemplos, não preços de um mercado de verdade.'
} as const;

const en: Traducao<typeof pt> = {
  titulo: 'The market',
  intro: 'An aisle of a market in Israel. Each stall has its name handwritten and the price per kilo. Read, find the stall and do the math.',
  modo: 'Mode',
  modoLer: 'Walk through the market',
  modoJogo: 'Do the shopping',
  mercado: 'Market',
  oQuilo: 'per kilo',
  dicaLer: 'Tap a stall to see how it is read.',
  dicaAchar: 'The drawings disappear: read only the Hebrew.',
  dicaPagar: 'The price is on the stall card.',
  quilos: n => (n === 1 ? '1 kilo' : `${n} kilos`),
  clienteN: (i, total) => `Customer ${i} of ${total}`,
  bancaN: n => `Stall ${n}`,
  lista: (quilos, produto) => `Your list: ${quilos} of ${produto}. Find the stall.`,
  isso: 'Yes,',
  a: 'at',
  quantoPaga: quilos => `per kilo. How much do you pay for ${quilos}?`,
  naPrimeira: 'Spot on, first try!',
  certoAgora: 'Right this time.',
  proximo: 'Next item',
  verResultado: 'See the result',
  fimTodos: 'Full bag and the right change. You already shop at the market.',
  fimMetade: 'Almost all right. Show the points on the ones that stuck and go back to the market.',
  fimPoucos: 'Walk through the market, read each stall aloud and try again.',
  jogarDeNovo: 'Play again',
  exemplo: 'The prices are examples, not the prices of a real market.'
};

const es: Traducao<typeof pt> = {
  titulo: 'El shuk',
  intro: 'Un pasillo del mercado en Israel. Cada puesto tiene el nombre escrito a mano y el precio del kilo. Lee, encuentra el puesto y haz la cuenta.',
  modo: 'Modo',
  modoLer: 'Pasear por el shuk',
  modoJogo: 'Hacer las compras',
  mercado: 'Mercado',
  oQuilo: 'el kilo',
  dicaLer: 'Toca un puesto para ver cómo se lee.',
  dicaAchar: 'Los dibujos desaparecen: lee solo el hebreo.',
  dicaPagar: 'El precio está en el cartel del puesto.',
  quilos: n => (n === 1 ? '1 kilo' : `${n} kilos`),
  clienteN: (i, total) => `Cliente ${i} de ${total}`,
  bancaN: n => `Puesto ${n}`,
  lista: (quilos, produto) => `Tu lista: ${quilos} de ${produto}. Encuentra el puesto.`,
  isso: 'Eso,',
  a: 'a',
  quantoPaga: quilos => `el kilo. ¿Cuánto pagas por ${quilos}?`,
  naPrimeira: '¡Justo, a la primera!',
  certoAgora: 'Ahora sí.',
  proximo: 'Siguiente producto',
  verResultado: 'Ver el resultado',
  fimTodos: 'Bolsa llena y el cambio justo. Ya compras en el shuk.',
  fimMetade: 'Casi todo bien. Muestra los puntos en los que te trabaron y vuelve al shuk.',
  fimPoucos: 'Pasea por el shuk, lee cada puesto en voz alta e inténtalo de nuevo.',
  jogarDeNovo: 'Jugar de nuevo',
  exemplo: 'Los precios son ejemplos, no precios de un mercado real.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

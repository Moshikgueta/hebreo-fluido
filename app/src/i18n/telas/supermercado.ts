import type { Traducao } from '..';

/* O supermercado (05/11/2026): a parada das 15h de Um dia em Israel
 * (app/um-dia-em-israel/supermercado). */
const pt = {
  titulo: 'O supermercado',
  intro: 'Uma prateleira de supermercado em Israel. Cada embalagem tem o nome em hebraico. Leia, e depois faça as compras da lista só pelo rótulo.',
  modo: 'Modo',
  modoLer: 'Ver a prateleira',
  modoJogo: 'Fazer as compras',
  loja: 'Supermercado',
  dicaLer: 'Toque numa embalagem para ver como se lê.',
  dicaJogo: 'As embalagens perdem o desenho: leia só o rótulo.',
  quantosLe: (n: number, total: number) => `Você já lê ${n} de ${total} produtos. Os outros aparecem com as próximas letras.`,
  poucosAinda: 'Ainda são poucos produtos com as letras que você já aprendeu. Siga o curso: eles aparecem aqui.',
  listaN: (i: number, total: number) => `Lista ${i} de ${total}`,
  listaDeCompras: 'Lista de compras',
  embalagemN: (n: number) => `Embalagem ${n}`,
  pegou: 'no carrinho',
  semErrar: 'Lista completa, sem errar!',
  completa: 'Lista completa.',
  proxima: 'Próxima lista',
  verResultado: 'Ver o resultado',
  fimTodas: 'Carrinho certo, sem errar nenhum rótulo. Você já faz compras em Israel.',
  fimMetade: 'Quase tudo certo. Mostre os pontos nos rótulos que travaram e volte à prateleira.',
  fimPoucas: 'Veja a prateleira, leia cada rótulo em voz alta e tente de novo.',
  jogarDeNovo: 'Jogar de novo',
  semMarcas: 'Embalagens desenhadas, sem marcas reais.'
} as const;

const en: Traducao<typeof pt> = {
  titulo: 'The supermarket',
  intro: 'A supermarket shelf in Israel. Each package has its name in Hebrew. Read them, then do the shopping on the list by the label alone.',
  modo: 'Mode',
  modoLer: 'Look at the shelf',
  modoJogo: 'Do the shopping',
  loja: 'Supermarket',
  dicaLer: 'Tap a package to see how it is read.',
  dicaJogo: 'The packages lose their drawings: read only the label.',
  quantosLe: (n, total) => `You can already read ${n} of ${total} products. The others appear with the next letters.`,
  poucosAinda: 'There are still few products with the letters you have learned. Keep going with the course: they will appear here.',
  listaN: (i, total) => `List ${i} of ${total}`,
  listaDeCompras: 'Shopping list',
  embalagemN: n => `Package ${n}`,
  pegou: 'in the cart',
  semErrar: 'List complete, no mistakes!',
  completa: 'List complete.',
  proxima: 'Next list',
  verResultado: 'See the result',
  fimTodas: 'The right cart, not a single label wrong. You already shop in Israel.',
  fimMetade: 'Almost all right. Show the points on the labels that stuck and go back to the shelf.',
  fimPoucas: 'Look at the shelf, read each label aloud and try again.',
  jogarDeNovo: 'Play again',
  semMarcas: 'Drawn packages, no real brands.'
};

const es: Traducao<typeof pt> = {
  titulo: 'El supermercado',
  intro: 'Un estante de supermercado en Israel. Cada envase tiene el nombre en hebreo. Léelos y después haz las compras de la lista solo por la etiqueta.',
  modo: 'Modo',
  modoLer: 'Ver el estante',
  modoJogo: 'Hacer las compras',
  loja: 'Supermercado',
  dicaLer: 'Toca un envase para ver cómo se lee.',
  dicaJogo: 'Los envases pierden el dibujo: lee solo la etiqueta.',
  quantosLe: (n, total) => `Ya lees ${n} de ${total} productos. Los otros aparecen con las próximas letras.`,
  poucosAinda: 'Todavía hay pocos productos con las letras que ya aprendiste. Sigue el curso: aparecerán aquí.',
  listaN: (i, total) => `Lista ${i} de ${total}`,
  listaDeCompras: 'Lista de compras',
  embalagemN: n => `Envase ${n}`,
  pegou: 'en el carrito',
  semErrar: '¡Lista completa, sin errores!',
  completa: 'Lista completa.',
  proxima: 'Siguiente lista',
  verResultado: 'Ver el resultado',
  fimTodas: 'El carrito justo, sin fallar ninguna etiqueta. Ya haces compras en Israel.',
  fimMetade: 'Casi todo bien. Muestra los puntos en las etiquetas que te trabaron y vuelve al estante.',
  fimPoucas: 'Mira el estante, lee cada etiqueta en voz alta e inténtalo de nuevo.',
  jogarDeNovo: 'Jugar de nuevo',
  semMarcas: 'Envases dibujados, sin marcas reales.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

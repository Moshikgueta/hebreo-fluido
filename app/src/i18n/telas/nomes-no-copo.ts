import type { Traducao } from '..';

/* Nome no copo (05/11/2026): a parada das 10h30 de Um dia em Israel
 * (app/um-dia-em-israel/copos). */
const pt = {
  titulo: 'Nome no copo',
  intro: 'No café, o barista escreve o seu nome no copo, à mão e sem os pontos. Leia os nomes e entregue cada café para a pessoa certa.',
  modo: 'Modo',
  modoLer: 'Ler os copos',
  modoJogo: 'Entregar os cafés',
  dicaLer: 'Toque num copo para ver como se lê o nome.',
  dicaJogo: 'Leia o nome no copo, sem os pontos.',
  quantosLe: (n: number, total: number) => `Você já lê ${n} de ${total} nomes. Os outros aparecem com as próximas letras.`,
  poucosAinda: 'Ainda são poucos nomes com as letras que você já aprendeu. Siga o curso: eles aparecem aqui.',
  pedidoN: (i: number, total: number) => `Pedido ${i} de ${total}`,
  copoN: (n: number) => `Copo ${n}`,
  chamada: (nome: string) => `Pedido pronto para: ${nome}. Qual copo é?`,
  naPrimeira: 'Na primeira!',
  achou: 'Achou.',
  pegou: (translit: string) => `(${translit}) pegou o café.`,
  proximo: 'Próximo pedido',
  verResultado: 'Ver o resultado',
  fimTodos: 'Nenhum café trocado. Você lê nomes escritos à mão como um israelense.',
  fimMetade: 'Quase todos. Mostre os pontos nos nomes que travaram e volte ao balcão.',
  fimPoucos: 'Leia os copos em voz alta, nome por nome, e tente de novo.',
  jogarDeNovo: 'Jogar de novo'
} as const;

const en: Traducao<typeof pt> = {
  titulo: 'Name on the cup',
  intro: 'At the coffee shop, the barista writes your name on the cup, by hand and without the points. Read the names and hand each coffee to the right person.',
  modo: 'Mode',
  modoLer: 'Read the cups',
  modoJogo: 'Hand out the coffees',
  dicaLer: 'Tap a cup to see how the name is read.',
  dicaJogo: 'Read the name on the cup, without the points.',
  quantosLe: (n, total) => `You can already read ${n} of ${total} names. The others appear with the next letters.`,
  poucosAinda: 'There are still few names with the letters you have learned. Keep going with the course: they will appear here.',
  pedidoN: (i, total) => `Order ${i} of ${total}`,
  copoN: n => `Cup ${n}`,
  chamada: nome => `Order ready for: ${nome}. Which cup is it?`,
  naPrimeira: 'First try!',
  achou: 'Found it.',
  pegou: translit => `(${translit}) got the coffee.`,
  proximo: 'Next order',
  verResultado: 'See the result',
  fimTodos: 'Not a single coffee mixed up. You read handwritten names like an Israeli.',
  fimMetade: 'Almost all of them. Show the points on the names that stuck and go back to the counter.',
  fimPoucos: 'Read the cups aloud, name by name, and try again.',
  jogarDeNovo: 'Play again'
};

const es: Traducao<typeof pt> = {
  titulo: 'El nombre en el vaso',
  intro: 'En el café, el barista escribe tu nombre en el vaso, a mano y sin los puntos. Lee los nombres y entrega cada café a la persona correcta.',
  modo: 'Modo',
  modoLer: 'Leer los vasos',
  modoJogo: 'Entregar los cafés',
  dicaLer: 'Toca un vaso para ver cómo se lee el nombre.',
  dicaJogo: 'Lee el nombre en el vaso, sin los puntos.',
  quantosLe: (n, total) => `Ya lees ${n} de ${total} nombres. Los otros aparecen con las próximas letras.`,
  poucosAinda: 'Todavía hay pocos nombres con las letras que ya aprendiste. Sigue el curso: aparecerán aquí.',
  pedidoN: (i, total) => `Pedido ${i} de ${total}`,
  copoN: n => `Vaso ${n}`,
  chamada: nome => `Pedido listo para: ${nome}. ¿Qué vaso es?`,
  naPrimeira: '¡A la primera!',
  achou: 'Lo encontraste.',
  pegou: translit => `(${translit}) recogió el café.`,
  proximo: 'Siguiente pedido',
  verResultado: 'Ver el resultado',
  fimTodos: 'Ningún café cambiado. Lees nombres escritos a mano como un israelí.',
  fimMetade: 'Casi todos. Muestra los puntos en los nombres que te trabaron y vuelve al mostrador.',
  fimPoucos: 'Lee los vasos en voz alta, nombre por nombre, e inténtalo de nuevo.',
  jogarDeNovo: 'Jugar de nuevo'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

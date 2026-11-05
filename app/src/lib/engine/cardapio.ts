/* Ler cardápios (05/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * O quadro de um café em Tel Aviv, como chega em Israel: sem nikud, com o
 * preço escrito por extenso em hebraico. Três abas (pratos de Israel, bebidas, nomes
 * internacionais), cada item com um desenho. Abre com o alfabeto dominado:
 * todo cardápio usa letras do alfabeto inteiro. data/cardapios.json.
 *
 * Dois modos na tela (components/learn/QuadroDoCafe.tsx):
 *   · ler o quadro: tocar num prato mostra os pontos, a leitura e o sentido;
 *   · fazer o pedido: os desenhos somem, o cliente pede um prato pelo
 *     sentido, o aluno acha o nome no quadro e depois escolhe o preço.
 * As regras do pedido moram aqui, sem tela, para os testes. */

import { shuffled } from './rng';

export type ItemDoCardapio = { desenho: string; he: string; translit: string; pt: string; preco: number };
export type Cardapio = {
  id: string; he: string; nomePt: string; tipoPt: string;
  /** Aba de comidas com nome internacional: o item ganha a etiqueta. */
  internacional?: boolean;
  itens: ItemDoCardapio[];
};

/** Clientes por rodada do pedido. */
export const CLIENTES_POR_RODADA = 4;
/** Preços na escolha: o certo e mais dois do mesmo quadro. */
export const OPCOES_DE_PRECO = 3;

/* O preço por extenso, em hebraico (05/11/2026, pedido do dono): o aluno lê
 * "חַמִישָׁה שְׁקָלִים", não "₪5". Masculino, porque שֶׁקֶל é masculino; de 1
 * a 99. Com nikud, nas regras do curso: sem chataf (חַמִישָׁה, עַשָׂרָה) e
 * daguesh só em בּ/כּ/פּ. A tela tira os pontos como em todo o resto. */
const UNIDADE = ['', 'אֶחָד', 'שְׁנַיִם', 'שְׁלוֹשָׁה', 'אַרְבָּעָה', 'חַמִישָׁה', 'שִׁשָׁה', 'שִׁבְעָה', 'שְׁמוֹנָה', 'תִשְׁעָה'];
const DEZENA = ['', 'עַשָׂרָה', 'עֶשְׂרִים', 'שְׁלוֹשִׁים', 'אַרְבָּעִים', 'חַמִישִׁים', 'שִׁשִׁים', 'שִׁבְעִים', 'שְׁמוֹנִים', 'תִשְׁעִים'];
const DE_ONZE = ['אַחַד עָשָׂר', 'שְׁנֵים עָשָׂר', 'שְׁלוֹשָׁה עָשָׂר', 'אַרְבָּעָה עָשָׂר', 'חַמִישָׁה עָשָׂר', 'שִׁשָׁה עָשָׂר', 'שִׁבְעָה עָשָׂר', 'שְׁמוֹנָה עָשָׂר', 'תִשְׁעָה עָשָׂר'];
/** "e" antes da unidade: וּ antes de sheva (וּשְׁלוֹשָׁה), וְ antes do resto. */
const e = (u: string) => (u.normalize('NFD').charAt(1) === '\u05B0' ? `וּ${u}` : `וְ${u}`);

export function numeroPorExtenso(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error(`numeroPorExtenso: fora de 1 a 99: ${n}`);
  if (n < 10) return UNIDADE[n]!;
  if (n === 10) return DEZENA[1]!;
  if (n < 20) return DE_ONZE[n - 11]!;
  const [d, u] = [Math.floor(n / 10), n % 10];
  return u ? `${DEZENA[d]} ${e(UNIDADE[u]!)}` : DEZENA[d]!;
}

export function precoPorExtenso(n: number): string {
  if (n === 1) return 'שֶׁקֶל אֶחָד';
  if (n === 2) return 'שְׁנֵי שְׁקָלִים';
  return `${numeroPorExtenso(n)} שְׁקָלִים`;
}

/** Os pratos pedidos numa rodada: índices distintos do cardápio. */
export function clientesDaRodada(c: Cardapio, rand: () => number = Math.random): number[] {
  return shuffled(c.itens.map((_, i) => i), rand).slice(0, Math.min(CLIENTES_POR_RODADA, c.itens.length));
}

/** As opções de preço para o item `i`: o certo e outros preços do quadro,
 *  todos diferentes entre si. */
export function opcoesDePreco(c: Cardapio, i: number, rand: () => number = Math.random): number[] {
  const certo = c.itens[i]!.preco;
  const outros = [...new Set(c.itens.map(x => x.preco).filter(p => p !== certo))];
  return shuffled([certo, ...shuffled(outros, rand).slice(0, OPCOES_DE_PRECO - 1)], rand);
}

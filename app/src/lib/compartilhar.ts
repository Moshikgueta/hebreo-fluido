/* Compartilhar uma conquista (05/10/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Quando o aluno chega a um marco - a primeira palavra lida, um módulo, o
 * curso inteiro -, ele pode gerar uma imagem de story (1080 x 1920) no visual
 * da marca e mandar para o Instagram pela folha de compartilhar do celular.
 * No computador, onde não há essa folha, a imagem é baixada.
 *
 * Tudo acontece no aparelho: a imagem é desenhada num <canvas> com as fontes
 * que a página já carregou, e NADA vai ao servidor. A frase é sempre a de um
 * marco que o curso de fato registrou - nunca uma promessa.
 */

import { tx as geral } from '@/i18n/telas/geral';
import { tx } from '@/i18n/telas/motor-compartilhar';

const ENDERECO = (process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://hebraicofluente.com.br')
  .replace(/^https?:\/\//, '').replace(/\/+$/, '');

/** A frase da imagem, em primeira pessoa, por conquista. Só as que estão aqui
 *  ganham o botão. `modulo-N` vem do checkpoint aprovado. */
export const FRASES: Record<string, string> = {
  'primeira-letra': tx.primeiraLetra,
  'primeira-palavra': tx.primeiraPalavra,
  'sem-apoio': tx.semApoio,
  'tres-dias': tx.tresDias,
  'dez-letras': tx.dezLetras,
  'metade': tx.metade,
  'vinte-e-duas': tx.vinteEDuas,
  'checkpoint-perfeito': tx.checkpointPerfeito,
  'le-10': tx.lePalavras(10),
  'le-25': tx.lePalavras(25),
  'le-50': tx.lePalavras(50),
  'le-100': tx.lePalavras(100),
  'meu-nome': tx.meuNome,
  'leitor': tx.leitor,
  'modulo-1': tx.modulo(1),
  'sem-o-ponto': tx.modulo(6),
  'sons-modernos': tx.modulo(7)
};
for (const n of [2, 3, 4, 5]) FRASES[`modulo-${n}`] = tx.modulo(n);

/** A conquista que compartilha o checkpoint do módulo `n` aprovado. */
export const conquistaDoModulo = (n: number): string =>
  n === 6 ? 'sem-o-ponto' : n === 7 ? 'sons-modernos' : `modulo-${n}`;

export const podeCompartilhar = (id: string): boolean => id in FRASES;

/** O texto que acompanha a imagem, quando o app de destino aceita texto. */
export const LEGENDA = tx.legenda;

const W = 1080, H = 1920;
const COR = { fundo: '#0E3B43', creme: '#F7F3EA', menta: '#8FD6C8', suave: 'rgba(255,255,255,.72)' };

function familia(variavel: string, reserva: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
    return v || reserva;
  } catch { return reserva; }
}

/** Quebra `texto` em linhas que cabem em `largura`. */
function linhas(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const out: string[] = [];
  let atual = '';
  for (const p of texto.split(/\s+/)) {
    const tenta = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tenta).width > largura && atual) { out.push(atual); atual = p; }
    else atual = tenta;
  }
  if (atual) out.push(atual);
  return out;
}

/** Desenha a imagem e devolve o JPEG. `quando` é a data já escrita (dd/mm/aaaa). */
export async function desenharConquista(frase: string, quando: string): Promise<Blob> {
  try { await document.fonts.ready; } catch { /* sem a API: segue com o que houver */ }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('sem canvas'); // i18n-ok: erro interno

  const display = familia('--font-display-loaded', 'Georgia, serif');
  const ui = familia('--font-ui-loaded', 'system-ui, sans-serif');
  const he = familia('--font-he-loaded', 'serif');

  ctx.fillStyle = COR.fundo; ctx.fillRect(0, 0, W, H);
  const brilho = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 820);
  brilho.addColorStop(0, 'rgba(143,214,200,.20)'); brilho.addColorStop(1, 'rgba(143,214,200,0)');
  ctx.fillStyle = brilho; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  ctx.fillStyle = COR.menta;
  ctx.font = `600 34px ${ui}`;
  ctx.fillText(tx.selo, W / 2, 330);

  /* "hebraico", em hebraico: עִבְרִית */
  ctx.save();
  ctx.direction = 'rtl';
  ctx.fillStyle = COR.creme;
  ctx.font = `500 230px ${he}`;
  ctx.fillText('עִבְרִית', W / 2, 700);
  ctx.restore();

  ctx.fillStyle = COR.creme;
  ctx.font = `600 92px ${display}`;
  const ls = linhas(ctx, frase, W - 180);
  let y = 960;
  for (const l of ls) { ctx.fillText(l, W / 2, y); y += 108; }

  ctx.fillStyle = COR.suave;
  ctx.font = `400 40px ${ui}`;
  ctx.fillText(quando, W / 2, y + 40);

  ctx.fillStyle = COR.creme;
  ctx.font = `600 44px ${display}`;
  ctx.fillText(geral.marca, W / 2, 1560);
  ctx.fillStyle = COR.menta;
  ctx.font = `500 36px ${ui}`;
  /* O endereço do site desta build: o site em inglês tem o seu (e não fala do
     Brasil, decisão do dono de 29/10/2026). */
  ctx.fillText(ENDERECO, W / 2, 1616);

  /* JPEG: um quinto do PNG, e é o que o Instagram guarda de qualquer jeito. */
  return new Promise((ok, erro) => canvas.toBlob(b => (b ? ok(b) : erro(new Error('sem imagem' /* i18n-ok: erro interno */))), 'image/jpeg', 0.92));
}

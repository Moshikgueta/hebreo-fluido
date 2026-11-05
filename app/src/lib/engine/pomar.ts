/* Pomar das palavras (05/11/2026, aprovado pelo dono no protótipo).
 * ─────────────────────────────────────────────────────────────────────────
 * Um jogo nosso: ler a palavra sem os pontos e escolher o sentido; cada
 * acerto vale uma jogada num tabuleiro de frutas de Israel (três acertos
 * seguidos valem duas). Troca-se duas frutas vizinhas e três ou mais iguais
 * em linha caem; as de cima descem e entram novas.
 *
 * As palavras são as do curso que o aluno JÁ lê (a régua de sempre, com as
 * letras concluídas), e as alternativas também: nenhuma letra antes de ser
 * ensinada. Aqui só as regras, sem tela, para os testes. */

import type { PalavraDoCurso } from './palavras';
import { shuffled, type Rand } from './rng';

export const FRUTAS = ['roma', 'oliva', 'tamara', 'laranja', 'uva', 'figo'] as const;
export type Fruta = (typeof FRUTAS)[number];
export const LADO = 6;
export const PALAVRAS_POR_RODADA = 12;
export const OPCOES = 4;
/** Acertos seguidos que valem a jogada extra. */
export const SEQUENCIA_BONUS = 3;

export type Tabuleiro = (Fruta | null)[][];
export type PerguntaDoPomar = { he: string; translit: string; pt: string; opcoes: string[] };

/* ── as perguntas ──────────────────────────────────────────────────────── */

/** Até 12 palavras legíveis, cada uma com 4 sentidos diferentes. Vazio quando
 *  não há 4 sentidos distintos para montar uma pergunta. */
export function perguntasDoPomar(legiveis: readonly PalavraDoCurso[], rand: Rand): PerguntaDoPomar[] {
  const porSentido = new Map<string, PalavraDoCurso>();
  for (const w of legiveis) if (w.pt && !porSentido.has(w.pt)) porSentido.set(w.pt, w);
  const unicas = [...porSentido.values()];
  if (unicas.length < OPCOES) return [];
  return shuffled(unicas, rand).slice(0, PALAVRAS_POR_RODADA).map(w => ({
    he: w.he, translit: w.translit, pt: w.pt,
    opcoes: shuffled([w.pt, ...shuffled(unicas.filter(x => x !== w), rand).slice(0, OPCOES - 1).map(x => x.pt)], rand)
  }));
}

/** Jogadas que um acerto vale, dado o tamanho da sequência DEPOIS dele. */
export const jogadasDoAcerto = (sequencia: number) => (sequencia > 0 && sequencia % SEQUENCIA_BONUS === 0 ? 2 : 1);

/* ── o tabuleiro ───────────────────────────────────────────────────────── */

const sorteia = (rand: Rand): Fruta => FRUTAS[Math.floor(rand() * FRUTAS.length)]!;

/** As casas de todos os grupos de três ou mais iguais, como "linha,coluna". */
export function grupos(t: Tabuleiro): Set<string> {
  const marca = new Set<string>();
  for (let r = 0; r < LADO; r++) for (let c = 0; c < LADO - 2; c++) {
    const f = t[r]![c]; if (!f || t[r]![c + 1] !== f || t[r]![c + 2] !== f) continue;
    for (let k = c; k < LADO && t[r]![k] === f; k++) marca.add(`${r},${k}`);
  }
  for (let c = 0; c < LADO; c++) for (let r = 0; r < LADO - 2; r++) {
    const f = t[r]![c]; if (!f || t[r + 1]![c] !== f || t[r + 2]![c] !== f) continue;
    for (let k = r; k < LADO && t[k]![c] === f; k++) marca.add(`${k},${c}`);
  }
  return marca;
}

const troca = (t: Tabuleiro, a: [number, number], b: [number, number]) => {
  const x = t[a[0]]![a[1]]!; t[a[0]]![a[1]] = t[b[0]]![b[1]]!; t[b[0]]![b[1]] = x;
};
export const vizinhas = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

/** Há pelo menos uma troca que forma um grupo? */
export function temJogada(t: Tabuleiro): boolean {
  for (let r = 0; r < LADO; r++) for (let c = 0; c < LADO; c++) for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
    const r2 = r + dr, c2 = c + dc; if (r2 >= LADO || c2 >= LADO) continue;
    troca(t, [r, c], [r2, c2]); const ok = grupos(t).size > 0; troca(t, [r, c], [r2, c2]);
    if (ok) return true;
  }
  return false;
}

/** Um tabuleiro sem grupo pronto e com ao menos uma jogada. */
export function novoTabuleiro(rand: Rand): Tabuleiro {
  for (;;) {
    const t: Tabuleiro = [];
    for (let r = 0; r < LADO; r++) {
      t[r] = [];
      for (let c = 0; c < LADO; c++) {
        let f: Fruta;
        do f = sorteia(rand);
        while ((c > 1 && t[r]![c - 1] === f && t[r]![c - 2] === f) || (r > 1 && t[r - 1]![c] === f && t[r - 2]![c] === f));
        t[r]![c] = f;
      }
    }
    if (temJogada(t)) return t;
  }
}

/** Tenta a troca: devolve o tabuleiro novo, ou null quando ela não forma grupo
 *  (a jogada não se gasta). Não mexe no tabuleiro recebido. */
export function tentarTroca(t: Tabuleiro, a: [number, number], b: [number, number]): Tabuleiro | null {
  if (!vizinhas(a, b)) return null;
  const novo = t.map(l => [...l]);
  troca(novo, a, b);
  return grupos(novo).size ? novo : null;
}

/** Um passo da queda: tira os grupos, desce o que ficou e enche o topo.
 *  Devolve o tabuleiro novo, os pontos do passo e as casas que caíram. */
export function cair(t: Tabuleiro, cascata: number, rand: Rand) {
  const g = grupos(t);
  const novo = t.map(l => [...l]);
  g.forEach(k => { const [r, c] = k.split(',').map(Number); novo[r!]![c!] = null; });
  const caiu = new Set<string>();
  for (let c = 0; c < LADO; c++) {
    let w = LADO - 1;
    for (let r = LADO - 1; r >= 0; r--) if (novo[r]![c]) {
      if (w !== r) { novo[w]![c] = novo[r]![c]!; novo[r]![c] = null; caiu.add(`${w},${c}`); }
      w--;
    }
    for (let r = w; r >= 0; r--) { novo[r]![c] = sorteia(rand); caiu.add(`${r},${c}`); }
  }
  return { tabuleiro: novo, removidas: g, caiu, pontos: g.size * 10 * cascata };
}

/* O jogo de hoje (06/11/2026, pedido do dono: "a melhor experiência").
 * ─────────────────────────────────────────────────────────────────────────
 * Com nove jogos na lista, quem chega em Praticar não sabe por onde começar.
 * Esta regra escolhe UM, pelo que o aluno fez, e diz por quê:
 *   1. aprendeu uma letra hoje: "Caça à letra", com a letra nova;
 *   2. trocou duas letras nos últimos 7 dias (duas vezes ou mais): a
 *      "Batalha das parecidas", que já começa pelos pares que ele troca;
 *   3. senão, o jogo aberto que ele nunca jogou, ou o que jogou há mais tempo
 *      (empate decidido pelo dia, para variar de um dia para o outro).
 * Só entre os jogos abertos para ele. Aqui só a regra, sem tela. */

export type MotivoDoJogo =
  | { tipo: 'letra-nova'; letra: string }
  | { tipo: 'confusao'; a: string; b: string }
  | { tipo: 'nunca-jogou' }
  | { tipo: 'faz-tempo' };

const DIA_MS = 86_400_000;
const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA_MS);

export function jogoDoDia<J extends string>(args: {
  abertos: readonly J[];
  hoje: string;
  /** O nome da última letra concluída hoje, se houver. */
  letraDeHoje: string | null;
  /** As trocas do aluno: certa, escolhida, quantas vezes e o último dia. */
  trocas: readonly { correct: string; chosen: string; n: number; lastOn: string }[];
  /** O último dia de cada jogo (o `gym`). */
  ultimaVez: Partial<Record<string, string>>;
  caca: J; batalha: J;
}): { jogo: J; motivo: MotivoDoJogo } | null {
  const { abertos, hoje, letraDeHoje, trocas, ultimaVez, caca, batalha } = args;
  if (!abertos.length) return null;
  if (letraDeHoje && abertos.includes(caca)) return { jogo: caca, motivo: { tipo: 'letra-nova', letra: letraDeHoje } };
  const troca = [...trocas]
    .filter(t => t.n >= 2 && t.lastOn && diasEntre(t.lastOn.slice(0, 10), hoje) <= 7)
    .sort((x, y) => y.n - x.n)[0];
  if (troca && abertos.includes(batalha)) return { jogo: batalha, motivo: { tipo: 'confusao', a: troca.correct, b: troca.chosen } };
  const giro = Math.abs(diasEntre('2026-01-01', hoje));
  const ordenados = abertos
    .map((j, i) => ({ j, ultima: ultimaVez[j] ?? '', giro: (i + giro) % abertos.length }))
    .sort((x, y) => (x.ultima === y.ultima ? x.giro - y.giro : x.ultima < y.ultima ? -1 : 1));
  const escolhido = ordenados[0]!;
  return { jogo: escolhido.j, motivo: escolhido.ultima ? { tipo: 'faz-tempo' } : { tipo: 'nunca-jogou' } };
}

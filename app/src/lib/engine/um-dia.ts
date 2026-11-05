/* Um dia em Israel (05/11/2026, aprovado pelo dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Um mapa com as paradas de um dia em Israel, na ordem do dia: as placas da
 * rua, o trem, o café, o nome no copo, o shuk, o supermercado, as mensagens
 * de um amigo e os cartões de festa. Cada parada é um jogo de leitura, e
 * elas entram no site uma por vez: as que ainda não existem aparecem no mapa
 * como "em breve". Nada aqui conta nota ou XP: é leitura, por gosto.
 *
 * A primeira parada, as placas, segue a régua do Hebraico na rua: uma placa
 * só aparece quando o aluno já lê todas as letras dela, e as placas erradas
 * de cada missão também são só placas que ele lê. Assim o mapa abre no meio
 * do curso, e nenhuma letra aparece antes de ser ensinada. */

import type { Letter } from '@/lib/content';
import { alfabetoDe, consegueLer } from './palavras';
import { shuffled, type Rand } from './rng';

export type TipoDePlaca = 'verde' | 'azul' | 'branca' | 'amarela' | 'vermelha' | 'loja' | 'neon' | 'neon-r';
export type PlacaDesenhada = {
  id: string; he: string; translit: string; pt: string;
  tipo: TipoDePlaca; icone: string;
  /** O que a pessoa precisa fazer: "Você precisa <missaoPt>". */
  missaoPt: string;
};
/** Os cartões de festa (lib/engine/cartoes.ts). Opcional: um pacote antigo não os tem. */
export type DadosDoDia = {
  placas: PlacaDesenhada[];
  cartoes?: import('./cartoes').CartaoDeFesta[];
  /** Os nomes no copo (lib/engine/copos.ts). Opcional, como os cartões. */
  copos?: import('./copos').NomeNoCopo[];
  /** As cidades do painel do trem (lib/engine/trem.ts). Opcional, como os cartões. */
  trem?: import('./trem').CidadeDoTrem[];
};

/** As paradas, na ordem do dia. `rota` só nas que já existem. */
export const PARADAS = [
  { id: 'placas', hora: '8h', rota: '/um-dia-em-israel/placas' },
  { id: 'trem', hora: '9h', rota: '/um-dia-em-israel/trem' },
  { id: 'cafe', hora: '10h', rota: '/cardapios' },
  { id: 'copo', hora: '10h30', rota: '/um-dia-em-israel/copos' },
  { id: 'shuk', hora: '12h', rota: null },
  { id: 'super', hora: '15h', rota: null },
  { id: 'mensagens', hora: '18h', rota: null },
  { id: 'cartoes', hora: '20h', rota: '/um-dia-em-israel/cartoes' }
] as const;
export type IdDaParada = (typeof PARADAS)[number]['id'];

/** Opções por missão: a placa certa e mais três. */
export const OPCOES_POR_MISSAO = 4;
/** Missões por rodada, no máximo. */
export const MISSOES_POR_RODADA = 8;

/** As placas que o aluno já lê, e quantas ainda esperam letras. */
export function placasLegiveis(placas: readonly PlacaDesenhada[], concluidas: readonly Letter[]) {
  const alfabeto = alfabetoDe(concluidas);
  const prontas = placas.filter(p => consegueLer(p.he, alfabeto));
  return { prontas, faltam: placas.length - prontas.length };
}

/** O jogo das placas abre com placas legíveis bastantes para uma missão. */
export const jogoAberto = (prontas: readonly PlacaDesenhada[]) => prontas.length >= OPCOES_POR_MISSAO;

/** As placas pedidas numa rodada: distintas, entre as que o aluno lê. */
export function missoesDaRodada(prontas: readonly PlacaDesenhada[], rand: Rand = Math.random): PlacaDesenhada[] {
  return shuffled(prontas, rand).slice(0, Math.min(MISSOES_POR_RODADA, prontas.length));
}

/** As placas de uma missão: a certa e outras que o aluno lê, sem repetir. */
export function opcoesDaMissao(alvo: PlacaDesenhada, prontas: readonly PlacaDesenhada[], rand: Rand = Math.random): PlacaDesenhada[] {
  const outras = shuffled(prontas.filter(p => p.id !== alvo.id), rand).slice(0, OPCOES_POR_MISSAO - 1);
  return shuffled([alvo, ...outras], rand);
}

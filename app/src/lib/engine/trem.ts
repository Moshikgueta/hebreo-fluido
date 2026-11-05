/* A estação de trem (05/11/2026): a parada das 9h de Um dia em Israel.
 * ─────────────────────────────────────────────────────────────────────────
 * O painel de partidas de uma estação em Israel: a hora, o destino (sem os
 * pontos) e a plataforma. Duas coisas na parada:
 *   · ler o painel: as cidades que o aluno já lê; tocar mostra os pontos, a
 *     leitura e o nome em português;
 *   · pegar o trem: a viagem vem em português ("Você vai para Haifa"), o
 *     aluno acha a linha pelo hebraico e depois responde a hora ou a
 *     plataforma lendo a linha.
 *
 * A régua é a das placas: uma cidade só aparece quando o aluno já lê todas
 * as letras dela. Os rótulos do painel (יציאות, שעה, יעד, רציף) também: o
 * que o aluno ainda não lê aparece na língua do site. Nada aqui conta nota
 * ou XP. */

import type { Letter } from '@/lib/content';
import { alfabetoDe, consegueLer } from './palavras';
import { shuffled, type Rand } from './rng';

export type CidadeDoTrem = { id: string; he: string; translit: string; pt: string };
export type LinhaDoPainel = CidadeDoTrem & { hora: string; plataforma: number };
export type Pergunta = 'hora' | 'plataforma';

/** Viagens por rodada. */
export const VIAGENS_POR_RODADA = 6;
/** Linhas no painel de cada viagem, no máximo. */
export const LINHAS_NO_PAINEL = 7;
/** A parada abre com cidades legíveis bastantes para um painel. */
export const MINIMO_DE_CIDADES = 4;
export const PLATAFORMAS = 4;
/** As opções de cada pergunta: a certa e mais duas. */
export const OPCOES_DA_PERGUNTA = 3;

export function cidadesLegiveis(cidades: readonly CidadeDoTrem[], concluidas: readonly Letter[]) {
  const alfabeto = alfabetoDe(concluidas);
  const prontas = cidades.filter(c => consegueLer(c.he, alfabeto));
  return { prontas, faltam: cidades.length - prontas.length };
}

export const tremAberto = (prontas: readonly CidadeDoTrem[]) => prontas.length >= MINIMO_DE_CIDADES;

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Um painel: as cidades na ordem dada, a partir das 8h05, cada partida de 4
 *  a 12 minutos depois da anterior (horas sempre diferentes), plataformas de
 *  1 a 4. */
export function painel(cidades: readonly CidadeDoTrem[], rand: Rand = Math.random): LinhaDoPainel[] {
  let t = 8 * 60 + 5;
  return cidades.map(c => {
    t += 4 + Math.floor(rand() * 9);
    return { ...c, hora: hhmm(t), plataforma: 1 + Math.floor(rand() * PLATAFORMAS) };
  });
}

/** O painel de uma viagem: até LINHAS_NO_PAINEL cidades legíveis, com a do
 *  destino entre elas. */
export function painelDaViagem(destino: CidadeDoTrem, prontas: readonly CidadeDoTrem[], rand: Rand = Math.random): LinhaDoPainel[] {
  const outras = shuffled(prontas.filter(c => c.id !== destino.id), rand).slice(0, LINHAS_NO_PAINEL - 1);
  return painel(shuffled([destino, ...outras], rand), rand);
}

/** Os destinos de uma rodada e o que se pergunta em cada um, metade hora,
 *  metade plataforma. */
export function viagensDaRodada(prontas: readonly CidadeDoTrem[], rand: Rand = Math.random): { destino: CidadeDoTrem; pergunta: Pergunta }[] {
  const destinos = shuffled(prontas, rand).slice(0, Math.min(VIAGENS_POR_RODADA, prontas.length));
  const perguntas = shuffled(destinos.map((_, i): Pergunta => (i % 2 ? 'hora' : 'plataforma')), rand);
  return destinos.map((destino, i) => ({ destino, pergunta: perguntas[i]! }));
}

/** As opções da pergunta: a resposta da linha certa e duas outras, sem
 *  repetir. A hora errada vem de outra linha do mesmo painel. */
export function opcoesDaPergunta(linhas: readonly LinhaDoPainel[], alvo: LinhaDoPainel, pergunta: Pergunta, rand: Rand = Math.random): string[] {
  const certa = pergunta === 'hora' ? alvo.hora : String(alvo.plataforma);
  const outras = pergunta === 'hora'
    ? linhas.filter(l => l.id !== alvo.id).map(l => l.hora)
    : Array.from({ length: PLATAFORMAS }, (_, i) => String(i + 1));
  const erradas = shuffled([...new Set(outras)].filter(x => x !== certa), rand).slice(0, OPCOES_DA_PERGUNTA - 1);
  return shuffled([certa, ...erradas], rand);
}

export const respostaDe = (alvo: LinhaDoPainel, pergunta: Pergunta) => (pergunta === 'hora' ? alvo.hora : String(alvo.plataforma));

/** Os rótulos do painel em hebraico. */
export const ROTULOS = { partidas: 'יְצִיאוֹת', hora: 'שָׁעָה', destino: 'יַעַד', plataforma: 'רָצִיף' } as const;

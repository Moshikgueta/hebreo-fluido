/* Mais exercícios dentro de cada texto (05/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Cada texto vinha com 3 ou 4 perguntas escritas à mão. Estas saem das
 * próprias frases do texto, e por isso valem nos três idiomas sem tradução
 * nova: o sentido de cada linha (`pt`) e quem fala (`quem`) já vêm
 * traduzidos em data/en e data/es.
 *
 *   · "O que quer dizer <frase>?" para três linhas, com o sentido de outras
 *     linhas do MESMO texto como alternativas erradas;
 *   · "Quem diz <frase>?" numa conversa com pelo menos duas pessoas.
 *
 * Só aparece hebraico que o texto já mostra: nenhuma letra que o aluno não
 * aprendeu. No texto sem pontos (módulo 6), a frase vem sem nikud, como no
 * texto. A escolha das linhas é fixa por texto (a semente é o id): reabrir
 * a página não troca as perguntas. */

import type { ItemCompreensao } from '@/lib/content-publico';
import type { Texto } from '@/lib/engine/textos';
import { rng, shuffled } from '@/lib/engine/rng';
import { stripNikud } from '@/lib/hebrew';
import { tx } from '@/i18n/telas/motor-exercicios-do-texto';

export const SENTIDOS_POR_TEXTO = 3;

export function exerciciosDoTexto(texto: Texto, semente: string): ItemCompreensao[] {
  const rand = rng(`exercicios-${semente}`);
  const mostra = (he: string) => (texto.semPontos ? stripNikud(he) : he).trim();
  /* Linhas com sentido único: duas linhas iguais em português dariam duas
     alternativas certas. */
  const contagem = new Map<string, number>();
  for (const l of texto.linhas) contagem.set(l.pt, (contagem.get(l.pt) ?? 0) + 1);
  const linhas = texto.linhas.filter(l => l.he && l.pt && contagem.get(l.pt) === 1);
  if (linhas.length < 3) return [];
  /* No enunciado, a frase sem o ponto final: "O que quer dizer X?" com o "?"
     da frase e o da pergunta lado a lado lê mal. A explicação traz a inteira. */
  const noEnunciado = (he: string) => mostra(he).replace(/[\s.,!?]+$/u, '');
  /* As frases que as perguntas escritas à mão já citam ficam para o fim da
     fila, para não perguntar duas vezes a mesma coisa. */
  const citadas = new Set(texto.perguntas.flatMap(p => [...`${p.q} ${p.porque}`.matchAll(/\{\{(.+?)\}\}/g)].map(m => m[1]!.trim())));
  const citada = (he: string) => [...citadas].some(c => he.includes(c) || c.includes(he.replace(/[\s.,!?]+$/u, '')));
  const naFila = (ls: typeof linhas) => [...shuffled(ls.filter(l => !citada(l.he)), rand), ...shuffled(ls.filter(l => citada(l.he)), rand)];

  const itens: ItemCompreensao[] = [];
  const escolhidas = naFila(linhas).slice(0, SENTIDOS_POR_TEXTO);
  for (const l of escolhidas) {
    const erradas = shuffled(linhas.filter(x => x !== l), rand).slice(0, 2).map(x => x.pt);
    const opcoes = shuffled([l.pt, ...erradas], rand);
    itens.push({
      t: 'escolha', q: tx.queQuerDizer(noEnunciado(l.he)), opcoes,
      certa: opcoes.indexOf(l.pt), porque: tx.porqueSentido(mostra(l.he), l.pt)
    });
  }

  /* Quem fala: só numa conversa, e com uma frase que só uma pessoa diz. */
  const falantes = [...new Set(texto.linhas.map(l => l.quem).filter((q): q is string => !!q))];
  if (falantes.length >= 2) {
    const daUma = naFila(linhas.filter(l => l.quem && !escolhidas.includes(l)))[0]
      ?? naFila(linhas.filter(l => l.quem))[0];
    if (daUma) {
      const outras = shuffled(falantes.filter(f => f !== daUma.quem), rand).slice(0, 2);
      const opcoes = shuffled([daUma.quem!, ...outras], rand);
      itens.push({
        t: 'escolha', q: tx.quemDiz(noEnunciado(daUma.he)), opcoes,
        certa: opcoes.indexOf(daUma.quem!), porque: tx.porqueQuem(daUma.quem!, mostra(daUma.he))
      });
    }
  }
  return itens;
}

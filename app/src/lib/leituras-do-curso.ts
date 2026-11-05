/* As leituras de cada módulo (28/10/2026), para a página Leituras e para a
 * área Praticar (05/11/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * "Feita" é o `firsts` que cada leitura já grava. Desde 05/11/2026, decisão
 * do dono, uma leitura só ABRE na área de prática depois de feita no lugar
 * dela no curso (a página do módulo, o painel, a revisão): antes disso
 * aparece trancada, dizendo em que módulo ela está. */

import { revisaoDoModulo, segundoTextoDoModulo, textoDoModulo, type CourseModule } from '@/lib/content';
import { primeiraLeituraId } from '@/lib/laboratorio';
import { textoLidoId } from '@/lib/engine/textos';
import type { LearnerState } from '@/lib/state/types';
import { tx } from '@/i18n/telas/academia-leituras-client';

export type Leitura = { id: string; titulo: string; desc: string; href: string; feita: boolean; aberta: boolean; porque?: string };

export function leiturasDoModulo(m: CourseModule, state: LearnerState): Leitura[] {
  const out: Omit<Leitura, 'aberta'>[] = [];
  const f = state.firsts ?? {};
  if (m.letterIds.length) {
    out.push({
      id: `pl-${m.n}`, titulo: tx.primeira, desc: tx.primeiraDesc, href: `/leitura?primeira=${m.n}`,
      feita: !!f[primeiraLeituraId(m.n)], porque: tx.abreDepoisDeLer(m.n)
    });
  }
  const texto = textoDoModulo(m.n);
  if (texto) {
    out.push({
      id: `tx-${m.n}`, titulo: texto.tituloPt, desc: tx.texto(texto.tipoPt), href: `/modulo/${m.n}/texto`,
      feita: !!f[textoLidoId(m.n)], porque: tx.abreDepoisDeLer(m.n)
    });
  }
  const segundo = segundoTextoDoModulo(m.n);
  if (segundo) {
    out.push({
      id: `tx2-${m.n}`, titulo: segundo.tituloPt, desc: tx.texto(segundo.tipoPt), href: `/modulo/${m.n}/texto-2`,
      feita: !!f[textoLidoId(m.n, false, 2)], porque: tx.abreDepoisDeLer(m.n)
    });
  }
  const revisao = revisaoDoModulo(m.n);
  if (revisao) {
    out.push({
      id: `rv-${m.n}`, titulo: tx.revisao, desc: tx.revisaoDesc, href: `/modulo/${m.n}/revisao`,
      feita: !!f[textoLidoId(m.n, true)], porque: tx.abreDepoisDeLer(m.n)
    });
  }
  /* Cada leitura abre aqui depois de feita no lugar dela no curso
     (05/11/2026, decisão do dono): a área de prática é para voltar ao que
     já foi lido, e não um atalho para pular a ordem do módulo. */
  return out.map(l => ({ ...l, aberta: l.feita }));
}

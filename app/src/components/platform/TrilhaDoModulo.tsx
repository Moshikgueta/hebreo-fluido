'use client';

/* O caminho no painel (28/10/2026, pedido do dono: o painel como "o lugar
 * que direciona o aluno", atraente, interativo e curto).
 * ─────────────────────────────────────────────────────────────────────────
 * Desde 06/11/2026 o painel mostra um pedaço da MESMA estrada de "Meu curso"
 * (components/aventura/estrada-do-modulo.ts): a estação de agora, uma antes
 * e uma depois, com a Yael (o painel mais curto, 06/11/2026). O caminho inteiro fica no mapa. Vale
 * em qualquer ponto do curso, inclusive nos módulos 6 e 7 e depois do fim.
 * Só lê o progresso: nada novo no estado.
 */

import Link from 'next/link';
import { useProgress } from '@/lib/state/store';
import { tx } from '@/i18n/telas/painel-trilha-do-modulo';
import { EstradaDoModulo, type ParadaDaEstrada } from '@/components/aventura/EstradaDoModulo';
import { useEstradaDoCurso } from '@/components/aventura/estrada-do-modulo';

export function TrilhaDoModulo() {
  const p = useProgress();
  const itens = useEstradaDoCurso();
  const paradas = itens.filter((i): i is ParadaDaEstrada => i.tipo !== 'faixa');
  const agora = paradas.find(x => x.estado === 'agora');
  const n = agora?.n ?? 8;
  return (
    <section aria-labelledby="trilha" className="grid gap-2.5 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="trilha" className="m-0 font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
          {n >= 1 && n <= 7 ? tx.titulo(n) : tx.tituloCurso}
        </h2>
        <Link href="/mapa" className="inline-flex items-center min-h-[44px] font-ui text-[13px] text-[var(--teal-ink)] hover:underline">
          {tx.verOMapa}
        </Link>
      </div>
      <EstradaDoModulo itens={itens} pronto={p.ready} janela={1} onAbrirJarro={id => p.abrirJarro(id)} />
    </section>
  );
}

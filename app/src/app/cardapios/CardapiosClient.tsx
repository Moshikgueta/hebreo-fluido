'use client';

/* Ler cardápios (05/11/2026, pedido do dono). O quadro de um café em Israel,
 * com os pratos desenhados (components/learn/QuadroDoCafe.tsx; as regras em
 * lib/engine/cardapio.ts). Abre com o alfabeto dominado. Sem nota e nada
 * novo no progresso: é leitura. */

import Link from 'next/link';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuadroDoCafe } from '@/components/learn/QuadroDoCafe';
import { allLetters, cardapiosDoCurso } from '@/lib/content';
import { alphabetComplete } from '@/lib/state/rules';
import { useProgress } from '@/lib/state/store';
import { tx } from '@/i18n/telas/academia-cardapios';

export function CardapiosClient() {
  const p = useProgress();
  const cardapios = cardapiosDoCurso();
  const aberto = p.ready && alphabetComplete(p.state, allLetters().map(l => l.id));

  return (
    <div className="grid gap-6 reading">
      <header className="grid gap-2">
        <Link href="/leituras" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {tx.voltar}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
      </header>

      {p.ready && !aberto && (
        <Card tone="sand" className="p-6 grid gap-3">
          <h2 className="m-0 text-[20px] font-bold">{tx.trancadoTitulo}</h2>
          <p className="m-0 font-ui text-[15px] text-ink-body">{tx.trancadoTexto}</p>
          <LinkButton href="/meu-hebraico" className="justify-self-start">{tx.continuar}</LinkButton>
        </Card>
      )}

      {aberto && cardapios.length > 0 && <QuadroDoCafe cardapios={cardapios} />}
    </div>
  );
}

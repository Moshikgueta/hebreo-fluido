'use client';

/* O que ficou para trás nos módulos 1 a 5 (05/11/2026, decisão do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Antes dos módulos 6 e 7 e do exame final: um cartão com cada módulo que
 * ainda não fechou e um link para cada coisa que falta, com os mesmos passos
 * da porta entre módulos (PortaDoModulo.tsx). */

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { tx } from '@/i18n/telas/pendencias-antes-do-fim';
import { tx as txPorta } from '@/i18n/telas/revisao-entre-modulos';
import { passosDaPorta } from '@/components/learn/PortaDoModulo';
import type { PendenciaDeModulo } from '@/lib/state/rules';

export function PendenciasAntesDoFim({ titulo, pendencias }: { titulo: string; pendencias: readonly PendenciaDeModulo[] }) {
  return (
    <div className="grid gap-5 focus-col py-4">
      <Card className="p-6 sm:p-8 grid gap-4">
        <h1 className="font-display text-[23px] sm:text-[27px] font-bold leading-tight text-ink text-center">{titulo}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body text-center max-w-[48ch] mx-auto">{tx.texto}</p>
        <div className="grid gap-4 w-full max-w-[420px] mx-auto">
          {pendencias.map(pd => (
            <section key={pd.modulo} className="grid gap-2" aria-label={tx.modulo(pd.modulo)}>
              <h2 className="font-ui text-[13px] font-semibold uppercase tracking-wide text-ink-muted m-0">{tx.modulo(pd.modulo)}</h2>
              <ul className="grid gap-2 list-none p-0 m-0">
                {passosDaPorta({ modulo: pd.modulo, faltaCheckpoint: pd.faltaCheckpoint, faltaLer: pd.faltaLer } as never).map(p => (
                  <li key={p.href} className="flex items-center gap-3 min-h-[44px] rounded-[var(--r-md)] border border-line px-3">
                    <span aria-hidden className={p.feito ? 'text-[var(--green)]' : 'text-ink-muted'}>{p.feito ? '✓' : '○'}</span>
                    <span className="sr-only">{p.feito ? txPorta.feito : txPorta.faltaFazer}: </span>
                    {p.feito
                      ? <span className="font-ui text-[14.5px] text-ink-muted">{p.nome}</span>
                      : <Link href={p.href} className="font-ui text-[14.5px] font-semibold text-[var(--accent)] hover:underline">{p.nome}</Link>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="justify-self-center pt-1">
          <LinkButton href="/mapa" variant="ghost">{tx.verMapa}</LinkButton>
        </div>
      </Card>
    </div>
  );
}

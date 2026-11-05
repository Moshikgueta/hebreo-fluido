'use client';

/* As leituras (28/10/2026, pedido do dono: "uma área onde aparecem os
 * exercícios de leitura").
 * ─────────────────────────────────────────────────────────────────────────
 * Antes, cada leitura morava num lugar: a Primeira Leitura no painel, o
 * mini-texto e a leitura de revisão na página do módulo, o laboratório na
 * Academia. Aqui elas ficam juntas, módulo por módulo, com o que já foi feito.
 * Nada novo no estado: "feito" é o `firsts` que cada leitura já grava.
 *
 * Desde 05/11/2026 (decisão do dono), cada leitura abre aqui só depois de
 * feita no lugar dela no curso: ver lib/leituras-do-curso.ts.
 */

import Link from 'next/link';
import { useProgress } from '@/lib/state/store';
import { course, placasDaRua } from '@/lib/content';
import { leiturasDoModulo } from '@/lib/leituras-do-curso';
import { Cenario, type IdDoCenario } from '@/components/aventura/Cenarios';
import { He } from '@/components/hebrew/He';
import { tx } from '@/i18n/telas/academia-leituras-client';

export function LeiturasClient() {
  const p = useProgress();
  const porModulo = course.modules.map(m => ({ m, leituras: leiturasDoModulo(m, p.state) }));
  const todas = porModulo.flatMap(x => x.leituras);
  const feitas = todas.filter(l => l.feita).length;

  return (
    <div className="grid gap-6 reading">
      <header className="grid gap-2">
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch]">{tx.intro}</p>
        {todas.length > 0 && (
          <p className="m-0 font-ui text-[13.5px] font-semibold text-[var(--teal-ink)] tabular-nums">{tx.feitas(feitas, todas.length)}</p>
        )}
      </header>

      <Link href="/leitura"
            className="flex items-center gap-4 rounded-[18px] bg-[var(--accent-bg)] text-white p-5
                       transition-transform duration-200 hover:-translate-y-[2px] active:scale-[.98]">
        <span aria-hidden className="grid place-items-center w-12 h-12 rounded-full bg-white/15"><He size="inline" tone="paper">אב</He></span>
        <span className="grid gap-0.5 min-w-0 flex-1">
          <span className="font-display text-[18px] font-semibold text-white">{tx.laboratorio}</span>
          <span className="font-ui text-[14px] text-white/85">{tx.laboratorioDesc}</span>
        </span>
        <span aria-hidden className="font-ui text-[20px]">→</span>
      </Link>

      {/* O Hebraico na rua (28/10/2026): só com alguma placa aprovada. */}
      {placasDaRua().length > 0 && (
        <Link href="/hebraico-na-rua"
              className="flex items-center gap-4 rounded-[18px] border border-line bg-[var(--card)] p-5 shadow-[var(--sh)]
                         transition-transform duration-200 hover:-translate-y-[2px] active:scale-[.98]">
          <span aria-hidden className="grid place-items-center w-12 h-12 rounded-full bg-[var(--teal-soft)] text-[var(--teal-ink)]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="16" height="9" rx="2" /><path d="M11 13v6M8 19h6M7 8.5h8" />
            </svg>
          </span>
          <span className="grid gap-0.5 min-w-0 flex-1">
            <span className="font-display text-[18px] font-semibold text-ink">{tx.rua}</span>
            <span className="font-ui text-[14px] text-ink-muted">{tx.ruaDesc}</span>
          </span>
          <span aria-hidden className="font-ui text-[20px] text-ink-muted">→</span>
        </Link>
      )}

      {porModulo.map(({ m, leituras }) => (
        <section key={m.id} aria-labelledby={`lt-${m.n}`} className="grid gap-2.5 min-w-0">
          <div className="flex items-center gap-3">
            {m.n >= 1 && m.n <= 7 && (
              <span aria-hidden className="shrink-0 w-[64px] h-[36px] overflow-hidden rounded-[10px] border border-line">
                <Cenario n={m.n as IdDoCenario} trancado={!leituras.some(l => l.aberta)} />
              </span>
            )}
            <h2 id={`lt-${m.n}`} className="m-0 font-display text-[17px] font-semibold text-ink">
              {tx.modulo(m.n, m.titlePt)}
            </h2>
          </div>
          {leituras.length === 0 ? (
            <p className="m-0 font-ui text-[13.5px] text-ink-muted">{tx.nenhumaAinda}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-3 list-none p-0 m-0">
              {leituras.map(l => {
                const corpo = (
                  <>
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-display text-[15.5px] font-semibold leading-snug text-ink">{l.titulo}</span>
                      {l.feita && (
                        <span className="shrink-0 rounded-full bg-[var(--teal)] px-2 py-0.5 font-ui text-[11.5px] font-bold text-white">
                          ✓ {tx.feito}
                        </span>
                      )}
                    </span>
                    <span className="font-ui text-[13px] leading-snug text-ink-muted">{l.aberta ? l.desc : l.porque}</span>
                  </>
                );
                return (
                  <li key={l.id} className="min-w-0">
                    {l.aberta ? (
                      <Link href={l.href}
                            className="h-full grid content-start gap-1 rounded-[16px] border border-line bg-[var(--card)] p-4
                                       transition-[box-shadow,border-color] duration-200 hover:shadow-[var(--sh)] hover:border-[var(--teal)]">
                        {corpo}
                      </Link>
                    ) : (
                      <div className="h-full grid content-start gap-1 rounded-[16px] border border-dashed border-line bg-[var(--paper)] p-4">
                        {corpo}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      <Link href="/loja"
            className="grid gap-0.5 rounded-[16px] border border-line bg-[var(--card)] p-4
                       transition-[box-shadow,border-color] duration-200 hover:shadow-[var(--sh)] hover:border-[var(--teal)]">
        <span className="font-display text-[15.5px] font-semibold text-ink">{tx.bonus}</span>
        <span className="font-ui text-[13px] text-ink-muted">{tx.bonusDesc}</span>
      </Link>
    </div>
  );
}

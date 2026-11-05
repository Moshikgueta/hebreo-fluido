'use client';

/* O mapa de Um dia em Israel (05/11/2026). As paradas e a ordem moram em
 * lib/engine/um-dia.ts. Cada parada mostra a hora do dia, o nome e o estado:
 * aberta (um link), esperando letras, ou em breve (ainda não está no site).
 * O pino pula na primeira parada aberta que o aluno ainda pode jogar. */

import Link from 'next/link';
import { useMemo } from 'react';
import { allLetters, cardapiosDoCurso, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import { PARADAS, jogoAberto, placasLegiveis, type IdDaParada } from '@/lib/engine/um-dia';
import { cartoesAbertos, cartoesLegiveis } from '@/lib/engine/cartoes';
import { coposAbertos, nomesLegiveis } from '@/lib/engine/copos';
import { cidadesLegiveis, tremAberto } from '@/lib/engine/trem';
import { alphabetComplete } from '@/lib/state/rules';
import { useProgress } from '@/lib/state/store';
import { textoDaParada, tx } from '@/i18n/telas/academia-um-dia';

type Estado = 'aberta' | 'letras' | 'vinte-e-duas' | 'em-breve';

export function MapaDoDiaClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const { prontas } = placasLegiveis(umDiaEmIsrael().placas, concluidas);
  const { prontos: cartoesProntos } = cartoesLegiveis(umDiaEmIsrael().cartoes ?? [], concluidas);
  const { prontos: nomesProntos } = nomesLegiveis(umDiaEmIsrael().copos ?? [], concluidas);
  const { prontas: cidadesProntas } = cidadesLegiveis(umDiaEmIsrael().trem ?? [], concluidas);
  const tem22 = p.ready && alphabetComplete(p.state, todas.map(l => l.id));

  const estado = (id: IdDaParada, rota: string | null): Estado => {
    if (!rota) return 'em-breve';
    if (id === 'placas') return jogoAberto(prontas) ? 'aberta' : 'letras';
    if (id === 'trem') return (umDiaEmIsrael().trem ?? []).length === 0 ? 'em-breve' : tremAberto(cidadesProntas) ? 'aberta' : 'letras';
    if (id === 'copo') return (umDiaEmIsrael().copos ?? []).length === 0 ? 'em-breve' : coposAbertos(nomesProntos) ? 'aberta' : 'letras';
    if (id === 'cartoes') return (umDiaEmIsrael().cartoes ?? []).length === 0 ? 'em-breve' : cartoesAbertos(cartoesProntos) ? 'aberta' : 'letras';
    if (id === 'cafe') return cardapiosDoCurso().length === 0 ? 'em-breve' : tem22 ? 'aberta' : 'vinte-e-duas';
    return 'aberta';
  };
  const estados = PARADAS.map(x => estado(x.id, x.rota));
  const primeira = estados.indexOf('aberta');

  return (
    <div className="grid gap-6 reading">
      <header className="grid gap-2">
        <Link href="/leituras" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {tx.voltar}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
      </header>

      <ol className="relative list-none m-0 p-0 grid gap-3">
        <span aria-hidden className="hf-dia-trilha" />
        {PARADAS.map((x, i) => {
          const e = estados[i]!;
          const { nome, desc } = textoDaParada(x.id);
          const conteudo = (
            <>
              <span aria-hidden className={`relative z-[1] grid place-items-center w-[58px] h-[58px] shrink-0 rounded-full border-[3px] font-display text-[14px] font-bold tabular-nums
                ${e === 'aberta' ? 'bg-[var(--teal)] border-[var(--teal)] text-white' : 'bg-[var(--card)] border-line text-ink-muted'}
                ${i === primeira && p.ready ? 'hf-dia-pino' : ''}`}>
                {x.hora}
              </span>
              <span className="grid gap-0.5 min-w-0 flex-1">
                <span className={`font-display text-[18px] font-semibold ${e === 'aberta' ? 'text-ink' : 'text-ink-muted'}`}>{nome}</span>
                <span className="font-ui text-[14px] text-ink-muted">{desc}</span>
              </span>
              <span className={`shrink-0 font-ui text-[13px] font-semibold rounded-full px-3 py-1
                ${e === 'aberta' ? 'bg-[var(--teal-soft)] text-[var(--teal-ink)]' : 'bg-[var(--sand)] text-ink-muted'}`}>
                {e === 'aberta' ? tx.aberta : e === 'letras' ? tx.faltamLetras : e === 'vinte-e-duas' ? tx.comAs22 : tx.emBreve}
              </span>
            </>
          );
          const cls = 'flex items-center gap-4 rounded-[18px] p-3 pe-4';
          return (
            <li key={x.id}>
              {e === 'aberta' && x.rota
                ? <Link href={x.rota} className={`${cls} border border-line bg-[var(--card)] shadow-[var(--sh)] transition-transform duration-200 hover:-translate-y-[2px] active:scale-[.98]`}>{conteudo}</Link>
                : <div className={`${cls} opacity-80`}>{conteudo}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

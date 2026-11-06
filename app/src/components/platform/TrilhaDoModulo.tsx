'use client';

/* O caminho do módulo no painel (28/10/2026, pedido do dono: o painel como
 * "o lugar que direciona o aluno", atraente, interativo e curto).
 * ─────────────────────────────────────────────────────────────────────────
 * Uma pedra por lição do módulo em que o aluno está, na ordem do plano, e o
 * checkpoint no fim. Feita: cheia, com o ✓; a da vez: com o anel que pulsa;
 * as que vêm: apagadas. Tocar numa pedra feita ou na da vez abre a lição; as
 * que vêm ainda não são links (a trava da lição diria o mesmo, uma tela
 * depois). Só lê o progresso: nada novo no estado.
 *
 * Desde 06/11/2026 (pedido do dono: o mapa interativo na página principal),
 * o painel mostra aqui a MESMA estrada do mapa: os arcos, a viajante, o jarro
 * e o portão do checkpoint (components/aventura/estrada-do-modulo.ts). A
 * fila de pedras abaixo fica só para o módulo sem letras (o dos sons), que
 * no mapa também não tem estrada.
 */

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { He } from '@/components/hebrew/He';
import { useProgress } from '@/lib/state/store';
import { getLetter, type CourseModule } from '@/lib/content';
import { isLessonComplete } from '@/lib/state/rules';
import { idDoSom } from '@/lib/sons';
import { tx } from '@/i18n/telas/painel-trilha-do-modulo';
import { EstradaDoModulo } from '@/components/aventura/EstradaDoModulo';
import { useEstradaDoModulo } from '@/components/aventura/estrada-do-modulo';

type Pedra = { id: string; he: string; nome: string; href: string; feita: boolean };

export function pedrasDoModulo(m: CourseModule, feita: (id: string) => boolean): Pedra[] {
  return m.lessons.flatMap(ls => {
    if (ls.som) {
      const id = idDoSom(ls.som);
      return [{ id, he: ls.he ?? '', nome: ls.nomePt ?? ls.som, href: `/som/${ls.som}`, feita: feita(id) }];
    }
    return (ls.letters ?? []).flatMap(id => {
      const L = getLetter(id);
      return L ? [{ id, he: L.letraComPonto ?? L.letter, nome: L.namePt, href: `/licao/${id}`, feita: feita(id) }] : [];
    });
  });
}

export function TrilhaDoModulo({ modulo }: { modulo: CourseModule }) {
  const p = useProgress();
  const fila = useRef<HTMLOListElement>(null);
  const { estrada, jarro } = useEstradaDoModulo(modulo, true);
  const pedras = pedrasDoModulo(modulo, id => isLessonComplete(p.state, id));
  const daVez = pedras.findIndex(x => !x.feita);
  /* Num módulo de sete lições a fila passa da tela: ela abre rolada até a
     pedra da vez (ou o checkpoint), sem mexer na rolagem da página. */
  useEffect(() => {
    const el = fila.current;
    const alvo = el?.querySelector<HTMLElement>('[data-da-vez]');
    if (el && alvo) el.scrollLeft = alvo.offsetLeft - el.clientWidth / 2 + alvo.clientWidth / 2;
  }, [daVez]);
  if (!pedras.length) return null;
  const cabecalho = (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id="trilha" className="m-0 font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
        {tx.titulo(modulo.n)}
      </h2>
      <Link href="/mapa" className="inline-flex items-center min-h-[44px] font-ui text-[13px] text-[var(--teal-ink)] hover:underline">
        {tx.verOMapa}
      </Link>
    </div>
  );
  /* A estrada do mapa, quando o módulo tem letras. */
  if (estrada.length) {
    return (
      <section aria-labelledby="trilha" className="grid gap-2.5 min-w-0">
        {cabecalho}
        <EstradaDoModulo paradas={estrada} jarro={jarro} onAbrirJarro={() => p.abrirJarro(modulo.id)} />
      </section>
    );
  }
  const cp = modulo.checkpoint ? p.state.checkpoints[modulo.checkpoint.id] : undefined;
  const feitas = pedras.filter(x => x.feita).length;

  return (
    <section aria-labelledby="trilha" className="grid gap-2.5 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="trilha" className="m-0 font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
          {tx.titulo(modulo.n)}
        </h2>
        <Link href="/mapa" className="inline-flex items-center min-h-[44px] font-ui text-[13px] text-[var(--teal-ink)] hover:underline">
          {tx.verOMapa}
        </Link>
      </div>
      <ol ref={fila} className="min-w-0 flex items-start gap-0 overflow-x-auto list-none p-0 m-0 pb-1 -mx-1 px-1 [scrollbar-width:thin]">
        {pedras.map((x, k) => {
          const estado = x.feita ? 'feita' : k === daVez ? 'vez' : 'vem';
          const pedra = (
            <span className={`relative grid place-items-center w-[52px] h-[52px] rounded-full border-2 transition-transform duration-150
                              ${estado === 'feita' ? 'bg-[var(--teal)] border-[var(--teal)]'
                                : estado === 'vez' ? 'bg-[var(--card)] border-[var(--teal)] hf-chama'
                                : 'bg-[var(--sand)] border-line'}`}>
              <He size="inline" tone={estado === 'feita' ? 'paper' : estado === 'vem' ? 'muted' : 'ink'}>{x.he}</He>
              {estado === 'feita' && (
                <span aria-hidden className="absolute -right-1 -top-1 grid place-items-center w-5 h-5 rounded-full bg-[var(--gold-solid)]
                                             text-white text-[11px] font-bold">✓</span>
              )}
            </span>
          );
          const rotulo = `${x.nome}: ${estado === 'feita' ? tx.feita : estado === 'vez' ? tx.daVez : tx.vem}`;
          return (
            <li key={x.id} className="flex items-center shrink-0" data-da-vez={estado === 'vez' ? '' : undefined}>
              {k > 0 && (
                <span aria-hidden className={`w-4 sm:w-6 h-[3px] rounded-full -mt-5
                                             ${pedras[k - 1]!.feita ? 'bg-[var(--teal)]' : 'bg-[var(--line)]'}`} />
              )}
              <span className="grid justify-items-center gap-1 w-[64px]">
                {estado === 'vem'
                  ? <span role="img" aria-label={rotulo}>{pedra}</span>
                  : <Link href={x.href} aria-label={tx.abrir(rotulo)} className="active:scale-[.94] rounded-full">{pedra}</Link>}
                <span className={`font-ui text-[12px] leading-tight text-center line-clamp-1
                                  ${estado === 'vez' ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{x.nome}</span>
              </span>
            </li>
          );
        })}
        {modulo.checkpoint && (
          <li className="flex items-center shrink-0" data-da-vez={daVez < 0 ? '' : undefined}>
            <span aria-hidden className={`w-4 sm:w-6 h-[3px] rounded-full -mt-5 ${feitas === pedras.length ? 'bg-[var(--teal)]' : 'bg-[var(--line)]'}`} />
            <span className="grid justify-items-center gap-1 w-[64px]">
              <Link href={`/checkpoint/${modulo.n}`}
                    aria-label={tx.checkpointDoModulo(modulo.n, !!cp?.passedAt)}
                    className={`relative grid place-items-center w-[52px] h-[52px] rounded-[16px] border-2 font-ui text-[20px] active:scale-[.94]
                                ${cp?.passedAt ? 'bg-[var(--gold-solid)] border-[var(--gold-solid)] text-white'
                                  : feitas === pedras.length ? 'bg-[var(--card)] border-[var(--gold)] text-[var(--gold)] hf-chama'
                                  : 'bg-[var(--sand)] border-line text-ink-muted'}`}>
                <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 17V3.5M5 4h9l-2 3 2 3H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <span className="font-ui text-[12px] leading-tight text-ink-muted">{tx.checkpoint}</span>
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}

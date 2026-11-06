'use client';

/* Hebraico na vida real (05/11/2026, pedido do dono): a segunda aba de
 * Praticar. Os jogos com palavras de verdade de Israel, que abrem mais
 * palavras, placas e pratos conforme o aluno aprende as letras: Um dia em
 * Israel, o Hebraico na rua, Ler cardápios e a Corrida das palavras. Cada
 * cartão diz quanto o aluno já lê, pela mesma régua das próprias páginas. O
 * Pomar das palavras saiu daqui (05/11/2026, pedido do dono): fica só na
 * lista principal de jogos. */

import Link from 'next/link';
import { useMemo } from 'react';
import { CenaDaVidaReal, type CenaReal } from '@/components/ilustra/CenaDaVidaReal';
import { IconeCadeado } from '@/components/shell/NavIcons';
import { allLetters, cardapiosDoCurso, placasDaRua, umDiaEmIsrael } from '@/lib/content';
import { corridaAberta, palavrasDaCorrida, palavrasDasParadas, pistaDoTema } from '@/lib/engine/corrida';
import { TEMAS } from '@/lib/engine/temas';
import { placasParaLer } from '@/lib/engine/rua';
import { placasLegiveis } from '@/lib/engine/um-dia';
import { letrasConcluidas } from '@/lib/vocabulario';
import { alphabetComplete } from '@/lib/state/rules';
import type { LearnerState } from '@/lib/state/types';
import { tx } from '@/i18n/telas/academia-academia-client';

type Cartao = { id: string; titulo: string; desc: string; conta: string; aberto: boolean; porque?: string; cena: CenaReal; href: string };

export function HebraicoNaVidaReal({ state }: { state: LearnerState }) {
  const cartoes = useMemo<Cartao[]>(() => {
    const todas = allLetters();
    const concluidas = letrasConcluidas(state, todas);
    const dia = umDiaEmIsrael().placas;
    const diaLe = placasLegiveis(dia, concluidas).prontas.length;
    const rua = placasDaRua();
    const ruaLe = placasParaLer(rua, concluidas).prontas.length;
    const tem22 = alphabetComplete(state, todas.map(l => l.id));
    const out: Cartao[] = [];
    if (dia.length) out.push({ id: 'dia', titulo: tx.vrDiaTitulo, desc: tx.vrDiaDesc, conta: tx.vrPlacas(diaLe, dia.length), aberto: true, cena: 'dia', href: '/um-dia-em-israel' });
    if (rua.length) out.push({ id: 'rua', titulo: tx.vrRuaTitulo, desc: tx.vrRuaDesc, conta: tx.vrFotos(ruaLe, rua.length), aberto: true, cena: 'rua', href: '/hebraico-na-rua' });
    if (cardapiosDoCurso().length) out.push({ id: 'cardapio', titulo: tx.vrCardapioTitulo, desc: tx.vrCardapioDesc, conta: tem22 ? tx.vrCardapioAberto : tx.vrCom22, aberto: tem22, cena: 'cardapio', href: '/cardapios' });
    /* A corrida das palavras (05/11/2026): as palavras das paradas que o aluno já lê. */
    /* Com os temas (05/11/2026), a corrida abre com as letras antes de haver palavras. */
    const corrida = palavrasDaCorrida(palavrasDasParadas(umDiaEmIsrael(), cardapiosDoCurso(), tem22), concluidas);
    const corridaAbre = TEMAS.some(t => pistaDoTema(t, concluidas, corrida).length > 0);
    out.push({ id: 'corrida', titulo: tx.vrCorridaTitulo, desc: tx.vrCorridaDesc, conta: corridaAberta(corrida) ? tx.vrCorridaConta(corrida.length) : corridaAbre ? tx.vrCorridaLetras : tx.abreMais, aberto: corridaAbre, cena: 'corrida', href: '/um-dia-em-israel/corrida' });
    return out;
  }, [state]);

  return (
    <section aria-labelledby="vida-real" className="grid gap-3">
      <div className="grid gap-1">
        <h2 id="vida-real" className="font-display text-[23px] sm:text-[26px] font-bold tracking-[-0.02em] text-ink">{tx.abaVidaReal}</h2>
        <p className="m-0 font-ui text-[14.5px] leading-relaxed text-ink-muted max-w-[60ch]">{tx.vrIntro}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 list-none p-0 m-0">
        {cartoes.map(c => {
          const corpo = (
            <>
              <CenaDaVidaReal tipo={c.cena} />
              <span className="grid gap-1.5 content-start p-4 pt-3.5">
                <span className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">{c.titulo}</span>
                <span className="font-ui text-[13.5px] leading-[1.5] text-ink-muted">{c.desc}</span>
                <span className={`font-ui text-[12.5px] font-semibold ${c.aberto ? 'text-[var(--teal-ink)]' : 'text-ink-body'}`}>
                  {!c.aberto && <IconeCadeado size={14} className="inline -mt-0.5 mr-1" />}{c.aberto ? c.conta : c.porque ?? c.conta}
                </span>
              </span>
            </>
          );
          return (
            <li key={c.id}>
              <Link href={c.href} className={`hf-cartao h-full ${c.aberto ? '' : 'hf-cartao-fechado'}`}>{corpo}</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

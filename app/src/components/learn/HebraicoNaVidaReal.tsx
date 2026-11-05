'use client';

/* Hebraico na vida real (05/11/2026, pedido do dono): a segunda aba de
 * Praticar. Os jogos com palavras de verdade de Israel, que abrem mais
 * palavras, placas e pratos conforme o aluno aprende as letras: o Pomar das
 * palavras, Um dia em Israel, o Hebraico na rua e Ler cardápios. Cada cartão
 * diz quanto o aluno já lê, pela mesma régua das próprias páginas. */

import Link from 'next/link';
import { useMemo } from 'react';
import { CenaDoJogo } from '@/components/ilustra/CenaDoJogo';
import { CenaDaVidaReal, type CenaReal } from '@/components/ilustra/CenaDaVidaReal';
import { IconeCadeado } from '@/components/shell/NavIcons';
import { allLetters, cardapiosDoCurso, placasDaRua, umDiaEmIsrael, type Letter } from '@/lib/content';
import { corridaAberta, palavrasDaCorrida, palavrasDasParadas } from '@/lib/engine/corrida';
import { alfabetoDe, palavrasLegiveis, vocabularioDoCurso } from '@/lib/engine/palavras';
import { placasParaLer } from '@/lib/engine/rua';
import { placasLegiveis } from '@/lib/engine/um-dia';
import { letrasConcluidas } from '@/lib/vocabulario';
import { alphabetComplete } from '@/lib/state/rules';
import type { LearnerState } from '@/lib/state/types';
import { tx } from '@/i18n/telas/academia-academia-client';

type Cartao = { id: string; titulo: string; desc: string; conta: string; aberto: boolean; porque?: string; cena: CenaReal | 'pomar'; href?: string };

export function HebraicoNaVidaReal({ state, unlocked, letrasDaCena, pomarFechado, onPomar }: {
  state: LearnerState; unlocked: Letter[]; letrasDaCena: readonly string[];
  pomarFechado?: string; onPomar: () => void;
}) {
  const cartoes = useMemo<Cartao[]>(() => {
    const todas = allLetters();
    const concluidas = letrasConcluidas(state, todas);
    const palavras = palavrasLegiveis(vocabularioDoCurso(todas), alfabetoDe(unlocked)).length;
    const dia = umDiaEmIsrael().placas;
    const diaLe = placasLegiveis(dia, concluidas).prontas.length;
    const rua = placasDaRua();
    const ruaLe = placasParaLer(rua, concluidas).prontas.length;
    const tem22 = alphabetComplete(state, todas.map(l => l.id));
    const out: Cartao[] = [
      { id: 'pomar', titulo: tx.jogoPomarTitulo, desc: tx.jogoPomarDesc, conta: tx.vrPalavras(palavras), aberto: !pomarFechado, porque: pomarFechado, cena: 'pomar' }
    ];
    if (dia.length) out.push({ id: 'dia', titulo: tx.vrDiaTitulo, desc: tx.vrDiaDesc, conta: tx.vrPlacas(diaLe, dia.length), aberto: true, cena: 'dia', href: '/um-dia-em-israel' });
    if (rua.length) out.push({ id: 'rua', titulo: tx.vrRuaTitulo, desc: tx.vrRuaDesc, conta: tx.vrFotos(ruaLe, rua.length), aberto: true, cena: 'rua', href: '/hebraico-na-rua' });
    if (cardapiosDoCurso().length) out.push({ id: 'cardapio', titulo: tx.vrCardapioTitulo, desc: tx.vrCardapioDesc, conta: tem22 ? tx.vrCardapioAberto : tx.vrCom22, aberto: tem22, cena: 'cardapio', href: '/cardapios' });
    /* A corrida das palavras (05/11/2026): as palavras das paradas que o aluno já lê. */
    const corrida = palavrasDaCorrida(palavrasDasParadas(umDiaEmIsrael(), cardapiosDoCurso(), tem22), concluidas);
    out.push({ id: 'corrida', titulo: tx.vrCorridaTitulo, desc: tx.vrCorridaDesc, conta: corridaAberta(corrida) ? tx.vrCorridaConta(corrida.length) : tx.abreMais, aberto: corridaAberta(corrida), cena: 'corrida', href: '/um-dia-em-israel/corrida' });
    return out;
  }, [state, unlocked, pomarFechado]);

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
              {c.cena === 'pomar' ? <CenaDoJogo jogo="pomar" letras={letrasDaCena} /> : <CenaDaVidaReal tipo={c.cena} />}
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
              {c.href ? (
                <Link href={c.href} className={`hf-cartao h-full ${c.aberto ? '' : 'hf-cartao-fechado'}`}>{corpo}</Link>
              ) : (
                <button type="button" disabled={!c.aberto} onClick={onPomar} className={`hf-cartao w-full h-full text-left ${c.aberto ? '' : 'hf-cartao-fechado'}`}>{corpo}</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

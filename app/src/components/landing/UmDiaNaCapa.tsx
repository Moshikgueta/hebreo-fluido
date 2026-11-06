'use client';

/* "Um dia em Israel" na página de venda (06/11/2026, pedido do dono: a
 * página que convence quem chega pela primeira vez).
 * ─────────────────────────────────────────────────────────────────────────
 * O que quem vai a Israel quer saber: "vou conseguir ler o que aparecer na
 * minha frente?". A resposta são as oito paradas do curso, na ordem do dia
 * (lib/engine/um-dia.ts), com o nome e a descrição que o aluno vê lá dentro
 * (academia-um-dia.ts). Tocar numa hora troca a tela do celular ao lado: as
 * telas são capturas de verdade das paradas (public/media/um-dia/<id>.webp),
 * nada desenhado para a venda. Sem rolagem automática nem troca sozinha: a
 * pessoa escolhe (mesma regra da capa, ver base.tsx/Reveal).
 *
 * Cada idioma tem as suas capturas, tiradas do site naquele idioma
 * (public/media/um-dia/<idioma>/). Um idioma sem capturas não mostra a
 * seção (CAPTURAS abaixo). */

import { useState } from 'react';
import { PARADAS } from '@/lib/engine/um-dia';
import { textoDaParada } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/venda-um-dia';
import { Container, Lead, Rubrica } from './base';

const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'pt';
/** Os idiomas que têm as capturas das paradas em public/media/um-dia/<idioma>/. */
const CAPTURAS: readonly string[] = ['pt', 'en', 'es'];

export function UmDiaNaCapa() {
  const [ativa, setAtiva] = useState(0);
  if (!CAPTURAS.includes(LOCALE)) return null;
  const paradas = PARADAS.filter(x => x.rota);
  const atual = paradas[ativa] ?? paradas[0]!;
  const texto = textoDaParada(atual.id);

  return (
    <section id="um-dia" aria-labelledby="um-dia-titulo" className="mt-20 sm:mt-28 bg-[var(--navy)] text-white hf-um-dia-capa">
      <Container className="py-16 sm:py-24 grid gap-10 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-center">
        <div className="min-w-0">
          <Rubrica tom="lite" className="mb-5">{tx.rubrica}</Rubrica>
          <h2 id="um-dia-titulo"
              className="m-0 mb-4 font-display font-semibold text-[clamp(30px,3.7vw,44px)] leading-[1.08] tracking-[-0.03em] text-balance text-white max-w-[20ch]">
            {tx.titulo}
          </h2>
          <Lead className="m-0 mb-8 !text-white/75">{tx.lead}</Lead>

          <ol aria-label={tx.paradas}
              className="list-none m-0 p-0 -mx-4 px-4 sm:mx-0 sm:px-0 flex lg:grid gap-2 overflow-x-auto lg:overflow-visible snap-x [scrollbar-width:none] pb-1">
            {paradas.map((x, i) => {
              const { nome, desc } = textoDaParada(x.id);
              const on = i === ativa;
              return (
                <li key={x.id} className="snap-start shrink-0">
                  <button type="button" onClick={() => setAtiva(i)} aria-pressed={on}
                          className={`group w-full flex items-center gap-3.5 rounded-[14px] min-h-[52px] px-2.5 py-2 text-left
                                      transition-colors duration-150
                                      ${on ? 'bg-white/[.12] shadow-[0_0_0_1px_rgba(255,255,255,.18)]' : 'hover:bg-white/[.06]'}`}>
                    <span className={`grid place-items-center shrink-0 w-[54px] h-[34px] rounded-full font-display text-[13.5px] font-bold tabular-nums
                                      ${on ? 'bg-[var(--teal-lite)] text-[var(--navy)]' : 'bg-white/[.08] text-white/80'}`}>
                      {x.hora}
                    </span>
                    <span className="grid min-w-0 pr-2">
                      <span className={`font-ui text-[15.5px] font-semibold whitespace-nowrap ${on ? 'text-white' : 'text-white/85'}`}>{nome}</span>
                      <span className="hidden lg:block font-ui text-[13.5px] text-white/60">{desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="m-0 mt-6 flex gap-2.5 items-start font-ui text-[14.5px] leading-[1.55] text-white/70 max-w-[52ch]">
            <span aria-hidden className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--gold)]" />
            {tx.semPontos}
          </p>
        </div>

        <figure className="m-0 justify-self-center w-[min(300px,78vw)] lg:w-full">
          <div className="relative rounded-[30px] p-[7px] bg-[#082A30]
                          shadow-[0_0_0_1px_rgba(255,255,255,.10)_inset,0_40px_80px_-30px_rgba(0,0,0,.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={atual.id} src={`/media/um-dia/${LOCALE}/${atual.id}.webp`} alt={tx.telaDe(texto.nome)}
                 width={540} height={1169} loading="lazy" decoding="async"
                 className="block w-full h-auto rounded-[24px] hf-um-dia-tela" />
          </div>
          <figcaption className="mt-4 text-center font-ui text-[14px] text-white/70">
            <span className="font-semibold text-white">{atual.hora} · {texto.nome}</span> · {texto.desc}
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}

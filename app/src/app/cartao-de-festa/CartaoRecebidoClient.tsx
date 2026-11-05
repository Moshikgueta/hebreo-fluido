'use client';

/* A página do cartão de festa (05/11/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Lê o token do link (`?t=`) e pede ao servidor o cartão e os nomes, que ele
 * confere pela assinatura. Primeiro um envelope fechado; o toque abre a aba
 * e o cartão sobe de dentro, com o desenho, o hebraico com os pontos, a
 * leitura e o sentido. No fim, o convite para o curso. Nada é gravado nem
 * contado. Sem áudio: as gravações estão atrás do portão. Página leve
 * (lib/rotas.ts): nada aqui chega ao progresso do aluno. */

import { useEffect, useState } from 'react';
import { DesenhoDoCartao } from '@/components/ilustra/DesenhoDoCartao';
import { LinkButton } from '@/components/ui/Button';
import { asset } from '@/lib/asset';
import type { CartaoRecebido } from '@/lib/engine/cartoes';
import { tx } from '@/i18n/telas/cartoes-de-festa';

type Estado = { fase: 'carregando' } | { fase: 'erro' } | { fase: 'pronto'; dados: CartaoRecebido };

export function CartaoRecebidoClient() {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });
  const [aberto, setAberto] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  /* A aba abre primeiro; o cartão sobe depois. Com "menos movimento", na hora. */
  const abrir = () => {
    if (abrindo) return;
    setAbrindo(true);
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.a11yMovimento === 'reduzido';
    window.setTimeout(() => setAberto(true), parado ? 0 : 650);
  };

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') ?? '';
    if (!t) { setEstado({ fase: 'erro' }); return; }
    fetch(asset(`/api/cartao?t=${encodeURIComponent(t)}`))
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Partial<CartaoRecebido>) => {
        if (d.cartao && typeof d.cartao.he === 'string' && typeof d.de === 'string') {
          setEstado({ fase: 'pronto', dados: { cartao: d.cartao, para: d.para ?? '', de: d.de } });
        } else setEstado({ fase: 'erro' });
      })
      .catch(() => setEstado({ fase: 'erro' }));
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-6 px-4 py-8 sm:py-12">
      <header className="relative z-[1] grid gap-2 text-center">
        <p className="m-0 font-ui text-[13px] font-bold uppercase tracking-[.1em] text-[var(--teal-ink)]">{tx.kicker}</p>
        {estado.fase === 'pronto' && estado.dados.para && (
          <h1 className="m-0 text-[28px] sm:text-[34px] font-bold leading-tight text-balance">{tx.para} {estado.dados.para}</h1>
        )}
        {(estado.fase !== 'pronto' || !estado.dados.para) && <h1 className="m-0 text-[28px] sm:text-[34px] font-bold leading-tight text-balance">{tx.metaTitulo}</h1>}
      </header>

      {estado.fase === 'carregando' && <p role="status" className="m-0 text-center font-ui text-[15px] text-ink-muted">{tx.abrindo}</p>}
      {estado.fase === 'erro' && (
        <div className="grid gap-4 justify-items-center text-center">
          <p role="alert" className="m-0 font-ui text-[15px] text-ink-body">{tx.erro}</p>
          <LinkButton href="/curso-de-hebraico/" variant="secondary">{tx.conhecer}</LinkButton>
        </div>
      )}

      {estado.fase === 'pronto' && !aberto && (
        <button type="button" onClick={abrir}
                className="relative z-0 grid gap-4 justify-items-center rounded-[var(--r-lg)] p-2 pt-16 font-ui text-[16px] font-semibold text-[var(--teal-ink)]">
          <span aria-hidden className={`hf-envelope ${abrindo ? 'hf-envelope-aberto' : ''}`}>
            <span className="hf-envelope-corpo" />
            <span className="hf-envelope-aba" />
            <span className="hf-envelope-selo" />
          </span>
          <span className="inline-flex items-center min-h-[48px] rounded-[var(--r-md)] bg-[var(--accent-bg)] px-5 text-white">{tx.abrirEnvelope}</span>
        </button>
      )}

      {estado.fase === 'pronto' && aberto && (() => {
        const { cartao, para, de } = estado.dados;
        return (
          <>
            <section aria-live="polite" className="hf-festa-sobe grid justify-items-center">
              <div style={{ ['--cor' as string]: cartao.cor }}
                   className="hf-festa-cartao max-w-[360px] gap-3 px-6 py-7 rounded-[16px] border-t-[10px]">
                <span className="hf-festa-arte max-w-[170px]"><DesenhoDoCartao desenho={cartao.desenho} /></span>
                <span lang="he" className="hf-festa-he text-[clamp(32px,9vw,42px)]">{cartao.he}</span>
                <span className="hf-festa-info gap-1 pt-3">
                  <span className="font-ui text-[15.5px] text-[#1B211F]">{tx.seLe(cartao.translit, cartao.pt)}</span>
                </span>
                <span className="grid gap-0.5 font-ui text-[15px] text-[#5F6A66]">
                  {para && <span>{tx.para}: <b className="text-[#1B211F]">{para}</b></span>}
                  <span>{tx.de}: <b className="text-[#1B211F]">{de}</b></span>
                </span>
              </div>
            </section>
            <section className="grid gap-4 justify-items-center text-center">
              <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[42ch]">{tx.convite}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <LinkButton href="/#experimente">{tx.experimentar}</LinkButton>
                <LinkButton href="/curso-de-hebraico/" variant="secondary">{tx.conhecer}</LinkButton>
              </div>
            </section>
          </>
        );
      })()}
    </div>
  );
}

'use client';

/* Ouça e encontre (06/11/2026, aprovado pelo dono). As regras moram em
 * lib/engine/ouvir.ts. Primeiro o jeito (as opções com os pontos ou só as
 * letras); depois, para cada palavra, a gravação toca sozinha e o aluno toca
 * na escrita certa entre quatro parecidas. Errou: a opção fica vermelha, a
 * palavra toca de novo e ele tenta outra. Conta como acerto só a palavra
 * achada na primeira vez. O alto-falante e o "mais devagar" tocam de novo
 * quando ele quiser. O fim vai para a mesma tela de resultado dos outros
 * jogos. Com "menos movimento", nada se mexe (regra geral). */

import { useEffect, useRef, useState } from 'react';
import type { ResultadoJogo } from './Match';
import type { JeitoDeOuvir, PerguntaDeOuvir } from '@/lib/engine/ouvir';
import { tocarClipe } from '@/components/learn/AudioButton';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx } from '@/i18n/telas/jogo-ouvir';

function AltoFalante({ size = 34 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path className="hf-ouvir-onda" d="M15.5 9a4 4 0 010 6" /><path className="hf-ouvir-onda hf-ouvir-onda2" d="M18 6.5a7.5 7.5 0 010 11" />
    </svg>
  );
}

export function OuvirEEncontrar({ rodadas, onFim }: {
  rodadas: Record<JeitoDeOuvir, PerguntaDeOuvir[]>; onFim: (r: ResultadoJogo) => void;
}) {
  const inicio = useRef(Date.now());
  const [jeito, setJeito] = useState<JeitoDeOuvir | null>(null);
  const [i, setI] = useState(0);
  const [erradas, setErradas] = useState<number[]>([]);
  const [achou, setAchou] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [tocando, setTocando] = useState(0);

  const lista = jeito ? rodadas[jeito] : [];
  const w = lista[i];
  const ouvir = (rate = 1) => { if (!w) return; tocarClipe(w.audioId, rate); setTocando(t => t + 1); };

  /* A palavra toca sozinha a cada pergunta (o toque na escolha do jeito já
     liberou o som no navegador). */
  useEffect(() => {
    if (!w) return;
    const t = setTimeout(() => ouvir(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jeito, i]);

  if (!jeito || !w) {
    return (
      <div className="hf-ouvir grid gap-3">
        <p className="m-0 font-display text-[19px] font-bold text-ink">{tx.comoOuvir}</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(['pontos', 'letras'] as const).map(j => {
            const exemplo = rodadas[j][0];
            return (
              <button key={j} type="button" disabled={!exemplo} className="hf-tema"
                      onClick={() => { setJeito(j); setI(0); setAcertos(0); setErradas([]); setAchou(false); inicio.current = Date.now(); }}>
                <span lang="he" dir="rtl" aria-hidden className="hf-tema-simbolo">{exemplo?.opcoes[exemplo.certa] ?? ''}</span>
                <span className="grid gap-0.5 text-start">
                  <span className="font-display text-[17px] font-semibold">{j === 'pontos' ? tx.comPontos : tx.soLetras}</span>
                  <span className="font-ui text-[13.5px] leading-snug opacity-80">{j === 'pontos' ? tx.comPontosDesc : tx.soLetrasDesc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const escolher = (k: number) => {
    if (achou || erradas.includes(k)) return;
    const certo = k === w.certa;
    tocarResposta(certo);
    if (certo) { setAchou(true); if (!erradas.length) setAcertos(a => a + 1); }
    else { setErradas(e => [...e, k]); setTimeout(() => ouvir(), 600); }
  };
  const proxima = () => {
    if (i + 1 >= lista.length) {
      onFim({ acertos, erros: lista.length - acertos, total: lista.length, segundos: Math.round((Date.now() - inicio.current) / 1000), letrasErradas: [] });
      return;
    }
    setI(i + 1); setErradas([]); setAchou(false);
  };

  return (
    <div className="hf-ouvir grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-ui text-[13px] text-ink-muted tabular-nums">{tx.palavraN(i + 1, lista.length)}</span>
        <button type="button" onClick={() => setJeito(null)} className="min-h-[44px] font-ui text-[13.5px] font-semibold text-[var(--teal-ink)] underline">{tx.trocar}</button>
      </div>

      <div className="grid justify-items-center gap-2 rounded-[18px] bg-[var(--sand)] px-4 py-4 text-center">
        <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.ouca}</p>
        <button key={`${i}-${tocando}`} type="button" onClick={() => ouvir()} aria-label={tx.ouvirDeNovo}
                className="hf-ouvir-botao hf-ouvir-tocando">
          <AltoFalante />
        </button>
        <button type="button" onClick={() => ouvir(0.7)} className="min-h-[44px] font-ui text-[13.5px] font-semibold text-[var(--teal-ink)] underline">
          {tx.devagar}
        </button>
      </div>

      <div dir="rtl" className="grid grid-cols-2 gap-2.5">
        {w.opcoes.map((o, k) => {
          const errada = erradas.includes(k), certa = achou && k === w.certa;
          return (
            <button key={`${i}-${k}`} type="button" onClick={() => escolher(k)} disabled={achou || errada}
                    aria-label={tx.opcao(o)}
                    className={`hf-ouvir-opcao ${errada ? 'hf-ouvir-errada' : ''} ${certa ? 'hf-ouvir-certa' : ''} ${achou && !certa ? 'hf-ouvir-apagada' : ''}`}>
              <span lang="he" className="hf-ouvir-texto">{o}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-2.5 justify-items-center text-center min-h-[48px]" aria-live="polite">
        {!achou && !erradas.length && <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.dica}</p>}
        {!achou && erradas.length > 0 && <p className="m-0 font-ui text-[14.5px] font-semibold text-[var(--gold-ink)] max-w-[44ch]">{tx.quase}</p>}
        {achou && (
          <>
            <p className="m-0 font-ui text-[15.5px] text-ink">
              <b className={erradas.length ? 'text-[var(--gold-ink)]' : 'text-[var(--teal-ink)]'}>{erradas.length ? tx.era : tx.isso}</b>{' '}
              <span lang="he" dir="rtl" className="he text-[1.2em] text-[var(--teal-ink)]">{w.he}</span> ({w.translit}) = {w.pt}
            </p>
            <button type="button" onClick={proxima} className="min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">
              {i + 1 < lista.length ? tx.proxima : tx.verResultado}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

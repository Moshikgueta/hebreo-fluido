'use client';

/* A corrida das palavras (05/11/2026, do protótipo aprovado pelo dono). As
 * regras moram em lib/engine/corrida.ts. Uma palavra por vez, sem os pontos,
 * quatro sentidos; com relógio, seis segundos por palavra, e o tempo que
 * acaba conta como erro. Acertos seguidos valem mais. O recorde fica no
 * aparelho (localStorage, só com relógio); nada vai para o progresso. */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { allLetters, cardapiosDoCurso, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import {
  CHAVE_DO_RECORDE, SEGUNDOS_POR_PALAVRA, corridaAberta, opcoesDaCorrida, palavrasDaCorrida, palavrasDasParadas,
  pistaDaCorrida, pontosDoAcerto, type PalavraDaCorrida
} from '@/lib/engine/corrida';
import { stripNikud } from '@/lib/hebrew';
import { alphabetComplete } from '@/lib/state/rules';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/corrida-das-palavras';

type Jogo = {
  pista: PalavraDaCorrida[]; i: number; opcoes: string[]; pts: number; seguidas: number; acertos: number;
  escolha: string | null | undefined; fim: boolean; recordeNovo: boolean;
};

const lerRecorde = () => { try { return Number(localStorage.getItem(CHAVE_DO_RECORDE)) || 0; } catch { return 0; } };
const gravarRecorde = (n: number) => { try { localStorage.setItem(CHAVE_DO_RECORDE, String(n)); } catch { /* sem armazenamento */ } };

export function CorridaClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const com22 = p.ready && alphabetComplete(p.state, todas.map(l => l.id));
  const prontas = useMemo(
    () => palavrasDaCorrida(palavrasDasParadas(umDiaEmIsrael(), cardapiosDoCurso(), com22), concluidas),
    [concluidas, com22]
  );
  const [relogio, setRelogio] = useState(true);
  const [pontos, setPontos] = useState(false);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [recorde, setRecorde] = useState(0);
  const [resta, setResta] = useState(SEGUNDOS_POR_PALAVRA);
  const proxima = useRef<number | undefined>(undefined);

  useEffect(() => { setRecorde(lerRecorde()); }, []);
  useEffect(() => () => window.clearTimeout(proxima.current), []);

  const comecar = () => {
    window.clearTimeout(proxima.current);
    const pista = pistaDaCorrida(prontas);
    setJogo({ pista, i: 0, opcoes: opcoesDaCorrida(pista[0]!, prontas), pts: 0, seguidas: 0, acertos: 0, escolha: undefined, fim: false, recordeNovo: false });
    setResta(SEGUNDOS_POR_PALAVRA);
  };
  const trocarModo = (r: boolean) => { window.clearTimeout(proxima.current); setRelogio(r); setJogo(null); };

  /* A próxima palavra, ou o fim (com o recorde, só no modo com relógio). */
  const avancar = useCallback((j: Jogo) => {
    const i = j.i + 1;
    if (i >= j.pista.length) {
      const rec = relogio && j.pts > lerRecorde();
      if (rec) { gravarRecorde(j.pts); setRecorde(j.pts); }
      setJogo({ ...j, fim: true, recordeNovo: rec });
      return;
    }
    setResta(SEGUNDOS_POR_PALAVRA);
    setJogo({ ...j, i, opcoes: opcoesDaCorrida(j.pista[i]!, prontas), escolha: undefined });
  }, [prontas, relogio]);

  /* `null` é o tempo que acabou. */
  const responder = useCallback((escolha: string | null) => {
    const j = jogo;
    if (!j || j.fim || j.escolha !== undefined) return;
    const alvo = j.pista[j.i]!;
    const certa = escolha === alvo.pt;
    tocarResposta(certa);
    const seguidas = certa ? j.seguidas + 1 : 0;
    const novo = { ...j, escolha, seguidas, acertos: j.acertos + (certa ? 1 : 0), pts: j.pts + (certa ? pontosDoAcerto(seguidas) : 0) };
    setJogo(novo);
    window.clearTimeout(proxima.current);
    proxima.current = window.setTimeout(() => avancar(novo), certa ? 700 : 1600);
  }, [jogo, avancar]);

  /* O relógio: um tique por segundo enquanto a palavra espera resposta. */
  const esperando = !!jogo && !jogo.fim && jogo.escolha === undefined;
  useEffect(() => {
    if (!relogio || !esperando) return;
    if (resta <= 0) { responder(null); return; }
    const t = window.setTimeout(() => setResta(s => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [relogio, esperando, resta, responder]);

  const alvo = jogo && !jogo.fim ? jogo.pista[jogo.i]! : null;

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/academia?aba=vida-real" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {tx.voltar}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
        {p.ready && corridaAberta(prontas) && <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.quantas(prontas.length)}</p>}
      </header>

      {p.ready && !corridaAberta(prontas) && <p className="m-0 font-ui text-[15px] text-ink-body">{tx.poucasAinda}</p>}

      {p.ready && corridaAberta(prontas) && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label={tx.modo} className="inline-flex rounded-full border-2 border-line bg-[var(--card)] overflow-hidden">
              {[true, false].map(r => (
                <button key={String(r)} type="button" aria-pressed={relogio === r} onClick={() => trocarModo(r)}
                        className={`min-h-[44px] px-4 font-ui text-[14.5px] font-semibold ${relogio === r ? 'bg-[var(--navy)] text-white' : 'text-ink'}`}>
                  {r ? tx.comRelogio : tx.semRelogio}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={pontos} onClick={() => setPontos(v => !v)}
                    className={`min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold ${pontos ? 'border-[var(--teal)] text-[var(--teal-ink)] bg-[var(--teal-soft)]' : 'border-line bg-[var(--card)] text-ink'}`}>
              {txDia.mostrarPontos}
            </button>
          </div>

          <section className="hf-pista" aria-live="polite">
            {!jogo && (
              <div className="grid gap-3 justify-items-center text-center py-4">
                <span className="font-display text-[64px] font-bold leading-none text-[#E7B65A] tabular-nums">{Math.min(15, prontas.length)}</span>
                <p className="m-0 font-ui text-[16px] max-w-[40ch]">{tx.inicio(Math.min(15, prontas.length), SEGUNDOS_POR_PALAVRA, relogio)}</p>
                {recorde > 0 && <span className="font-ui text-[14px] font-semibold text-[#8FD6C8]">{tx.recorde(recorde)}</span>}
                <button type="button" onClick={comecar} className="hf-pista-go">{tx.comecar}</button>
              </div>
            )}

            {jogo && jogo.fim && (
              <div className="grid gap-3 justify-items-center text-center py-4">
                <span className="font-display text-[64px] font-bold leading-none text-[#E7B65A] tabular-nums">{jogo.pts}</span>
                <p className="m-0 font-ui text-[16px] max-w-[40ch]">
                  {tx.fim(jogo.acertos, jogo.pista.length, relogio)}{' '}
                  {jogo.recordeNovo ? tx.recordeNovo : jogo.acertos >= jogo.pista.length * 0.8 ? tx.rapida : tx.semRelogioPrimeiro}
                </p>
                <button type="button" onClick={comecar} className="hf-pista-go">{tx.jogarDeNovo}</button>
              </div>
            )}

            {jogo && alvo && (
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-2 font-display text-[15px] font-bold tabular-nums">
                  <span>{tx.progresso(jogo.i + 1, jogo.pista.length)}</span>
                  <span className={jogo.seguidas > 1 ? 'text-[#E7B65A]' : 'opacity-0'}>{tx.seguidas(jogo.seguidas)}</span>
                  <span>{tx.pontos(jogo.pts)}</span>
                </div>
                <div className="hf-pista-palco">
                  {relogio && (
                    <svg className="hf-pista-anel" viewBox="0 0 100 100" aria-hidden>
                      <circle className="hf-pista-anel-fundo" cx="50" cy="50" r="44" />
                      <circle key={jogo.i} className={`hf-pista-anel-tempo ${jogo.escolha === undefined ? 'hf-pista-corre' : 'hf-pista-parado'}`}
                              cx="50" cy="50" r="44" pathLength={1} style={{ ['--dur' as string]: `${SEGUNDOS_POR_PALAVRA}s` }} />
                    </svg>
                  )}
                  <span lang="he" className="hf-pista-palavra">{pontos ? alvo.he : stripNikud(alvo.he)}</span>
                  {relogio && jogo.escolha === undefined && <span className="hf-pista-segundos">{tx.segundos(resta)}</span>}
                </div>
                <p className="sr-only">{tx.oQue}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {jogo.opcoes.map(o => {
                    const marca = jogo.escolha === undefined ? '' : o === alvo.pt ? 'hf-pista-op-certa' : o === jogo.escolha ? 'hf-pista-op-errada' : '';
                    return (
                      <button key={o} type="button" onClick={() => responder(o)} disabled={jogo.escolha !== undefined}
                              className={`hf-pista-op ${marca}`}>{o}</button>
                    );
                  })}
                </div>
                <p className="m-0 min-h-[1.6em] font-ui text-[15px] text-center">
                  {jogo.escolha !== undefined && (
                    <>
                      {jogo.escolha === null && <>{tx.acabouTempo} </>}
                      <span lang="he" dir="rtl" className="he text-[1.2em] text-[#8FD6C8]">{alvo.he}</span> ({alvo.translit}) = {alvo.pt}
                    </>
                  )}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

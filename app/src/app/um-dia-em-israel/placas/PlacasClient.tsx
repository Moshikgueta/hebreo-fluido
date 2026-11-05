'use client';

/* Um dia em Israel, primeira parada: as placas da rua (05/11/2026, aprovada
 * pelo dono no protótipo). As regras moram em lib/engine/um-dia.ts.
 *   · Ler as placas: as placas que o aluno já lê, com o desenho pequeno;
 *     tocar mostra os pontos, a leitura e o sentido.
 *   · Para onde eu vou?: a missão vem em português, os desenhos somem e o
 *     aluno escolhe a placa pelo hebraico, entre placas que ele já lê.
 * Sem nota e nada no progresso: é leitura. */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PlacaDesenhada } from '@/components/learn/PlacaDesenhada';
import { allLetters, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import { jogoAberto, missoesDaRodada, opcoesDaMissao, placasLegiveis, type PlacaDesenhada as Placa } from '@/lib/engine/um-dia';
import { stripNikud } from '@/lib/hebrew';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx } from '@/i18n/telas/academia-um-dia';

type Jogo = { missoes: Placa[]; r: number; opcoes: Placa[]; erradas: string[]; feita: boolean; limpas: boolean[] };

const pilula = 'min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold';

export function PlacasClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const placas = umDiaEmIsrael().placas;
  const { prontas } = placasLegiveis(placas, concluidas);
  const [modo, setModo] = useState<'ler' | 'jogo'>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [onda, setOnda] = useState(0);
  const mostra = (he: string) => (pontos ? he : stripNikud(he));

  const novoJogo = (): Jogo => {
    const missoes = missoesDaRodada(prontas);
    return { missoes, r: 0, opcoes: opcoesDaMissao(missoes[0]!, prontas), erradas: [], feita: false, limpas: [] };
  };
  const irPara = (m: 'ler' | 'jogo') => { setModo(m); setAberta(null); setJogo(m === 'jogo' ? novoJogo() : null); setOnda(o => o + 1); };

  const escolher = (pl: Placa) => {
    if (!jogo || jogo.feita || jogo.erradas.includes(pl.id)) return;
    const certa = pl.id === jogo.missoes[jogo.r]!.id;
    tocarResposta(certa);
    if (!certa) { setJogo({ ...jogo, erradas: [...jogo.erradas, pl.id] }); return; }
    const limpas = [...jogo.limpas]; limpas[jogo.r] = jogo.erradas.length === 0;
    setJogo({ ...jogo, feita: true, limpas });
  };
  const proxima = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= jogo.missoes.length ? { ...jogo, r } : { ...jogo, r, opcoes: opcoesDaMissao(jogo.missoes[r]!, prontas), erradas: [], feita: false });
    setOnda(o => o + 1);
  };

  const fim = jogo && jogo.r >= jogo.missoes.length;
  const alvo = jogo && !fim ? jogo.missoes[jogo.r]! : null;
  const acertos = jogo ? jogo.limpas.filter(Boolean).length : 0;
  const lista = modo === 'ler' ? prontas : jogo && !fim ? jogo.opcoes : [];

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/um-dia-em-israel" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {tx.voltarMapa}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.placasTitulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.placasIntro}</p>
        {p.ready && prontas.length < placas.length && jogoAberto(prontas) && (
          <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.quantasLe(prontas.length, placas.length)}</p>
        )}
      </header>

      {p.ready && !jogoAberto(prontas) && <p className="m-0 font-ui text-[15px] text-ink-body">{tx.poucasAinda}</p>}

      {p.ready && jogoAberto(prontas) && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label={tx.modo} className="inline-flex rounded-full border-2 border-line bg-[var(--card)] overflow-hidden">
              {(['ler', 'jogo'] as const).map(m => (
                <button key={m} type="button" aria-pressed={modo === m} onClick={() => irPara(m)}
                        className={`min-h-[44px] px-4 font-ui text-[14.5px] font-semibold ${modo === m ? 'bg-[var(--navy)] text-white' : 'text-ink'}`}>
                  {m === 'ler' ? tx.modoLer : tx.modoJogo}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={pontos} onClick={() => setPontos(v => !v)}
                    className={`${pilula} ${pontos ? 'border-[var(--teal)] text-[var(--teal-ink)] bg-[var(--teal-soft)]' : 'border-line bg-[var(--card)] text-ink'}`}>
              {tx.mostrarPontos}
            </button>
          </div>

          <section className="hf-rua" aria-live="polite">
            {jogo && (
              <div className="grid gap-3 mb-4">
                {fim ? (
                  <div className="grid gap-3 justify-items-center text-center py-2">
                    <span className="font-display text-[56px] font-bold leading-none text-ink tabular-nums">{acertos}/{jogo.missoes.length}</span>
                    <p className="m-0 font-ui text-[16px] text-ink max-w-[44ch]">
                      {acertos === jogo.missoes.length ? tx.fimTodas : acertos >= jogo.missoes.length / 2 ? tx.fimMetade : tx.fimPoucas}
                    </p>
                    <button type="button" onClick={() => irPara('jogo')} className="min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">{tx.jogarDeNovo}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-[15px] font-bold text-ink tabular-nums">{tx.missaoN(jogo.r + 1, jogo.missoes.length)}</span>
                      <span className="flex gap-1.5" aria-hidden>
                        {jogo.missoes.map((_, i) => (
                          <span key={i} className={`w-[22px] h-2 rounded-full ${i < jogo.r || (i === jogo.r && jogo.feita) ? (jogo.limpas[i] ? 'bg-[var(--teal)]' : 'bg-[var(--gold)]') : i === jogo.r ? 'bg-[var(--navy)]' : 'bg-black/15'}`} />
                        ))}
                      </span>
                    </div>
                    <div className="rounded-[18px] bg-[var(--card)] border border-line px-4 py-3 max-w-[600px] font-ui text-[16.5px] leading-snug text-ink">
                      {jogo.feita ? (
                        <span className="grid gap-3">
                          <span>
                            {jogo.limpas[jogo.r] ? tx.naPrimeira : tx.achou}{' '}
                            <span lang="he" dir="rtl" className="he text-[1.25em] text-[var(--teal-ink)]">{alvo!.he}</span> ({alvo!.translit}) {tx.querDizer} <b>{alvo!.pt}</b>.
                          </span>
                          <button type="button" onClick={proxima} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">
                            {jogo.r + 1 < jogo.missoes.length ? tx.proxima : tx.verResultado}
                          </button>
                        </span>
                      ) : (
                        <span>{tx.vocePrecisa} <b>{alvo!.missaoPt}</b>. {tx.qualPlaca}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {lista.length > 0 && (
              <ul key={onda} className="hf-balanca list-none m-0 p-0 grid gap-x-3.5 gap-y-[18px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                {lista.map((pl, i) => {
                  const certaAqui = jogo?.feita && pl.id === alvo?.id;
                  const errada = jogo?.erradas.includes(pl.id);
                  return (
                    <li key={pl.id} className="hf-poste">
                      <button type="button"
                              onClick={() => (modo === 'ler' ? setAberta(a => (a === pl.id ? null : pl.id)) : escolher(pl))}
                              aria-expanded={modo === 'ler' ? aberta === pl.id : undefined}
                              aria-label={modo === 'jogo' ? `${tx.placaN(i + 1)}: ${mostra(pl.he)}` : undefined}
                              style={{ animationDelay: `${(i % 6) * 70}ms` }}
                              className={`hf-placa-btn ${certaAqui ? 'hf-placa-certa' : ''} ${errada ? 'hf-placa-errada' : ''}`}>
                        <PlacaDesenhada placa={pl} texto={mostra(pl.he)} comIcone={modo === 'ler'} />
                        {modo === 'ler' && aberta === pl.id && (
                          <span className="grid gap-px text-center w-full rounded-[12px] border border-line bg-[var(--card)] px-2.5 py-2">
                            <span lang="he" dir="rtl" className="he text-[20px] text-[var(--teal-ink)]">{pl.he}</span>
                            <span className="font-ui text-[14px] italic text-ink-muted">{pl.translit}</span>
                            <span className="font-ui text-[15px] text-ink">{pl.pt}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="m-0 mt-3.5 font-ui text-[13.5px] text-ink-muted">{modo === 'ler' ? tx.dicaLer : jogo && !fim && !jogo.feita ? tx.dicaJogo : ''}</p>
            <div aria-hidden className="hf-rua-calcada" />
          </section>
        </>
      )}
    </div>
  );
}

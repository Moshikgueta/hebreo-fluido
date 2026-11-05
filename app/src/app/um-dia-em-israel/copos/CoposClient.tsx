'use client';

/* Um dia em Israel, a parada das 10h30: o nome no copo (05/11/2026, do
 * protótipo aprovado pelo dono). As regras moram em lib/engine/copos.ts.
 *   · Ler os copos: os nomes que o aluno já lê; tocar mostra os pontos e a
 *     leitura.
 *   · Entregar os cafés: o barista chama um nome em letras latinas e o aluno
 *     acha o copo pelo hebraico, entre copos com nomes que ele já lê.
 * Sem nota e nada no progresso: é leitura. */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { allLetters, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import { coposAbertos, coposDoPedido, nomesLegiveis, pedidosDaRodada, type NomeNoCopo } from '@/lib/engine/copos';
import { stripNikud } from '@/lib/hebrew';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/nomes-no-copo';

type Jogo = { pedidos: NomeNoCopo[]; r: number; copos: NomeNoCopo[]; errados: string[]; feito: boolean; limpos: boolean[] };

const pilula = 'min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold';
const TAMPAS = ['#1F8A7D', '#0E3B43', '#B8862F', '#C9577E', '#3F9A9C', '#8C5426'];

/** Um copo de papel, com tampa da cor da vez, café e vapor. */
function Copo({ i }: { i: number }) {
  const t = TAMPAS[i % TAMPAS.length];
  return (
    <svg viewBox="0 0 96 124" aria-hidden focusable="false">
      <g className="hf-copo-vapor"><path d="M40 16c-4-5 4-8 0-13" /><path d="M56 16c-4-5 4-8 0-13" /></g>
      <path d="M18 30h60l-8 88c-1 4-43 4-44 0z" fill="#FFFDF5" stroke="#1B211F" strokeWidth={2} strokeLinejoin="round" />
      <path d="M14 22h68l-2 10H16z" fill={t} stroke="#1B211F" strokeWidth={2} strokeLinejoin="round" />
      <path d="M30 16h36l4 6H26z" fill={t} stroke="#1B211F" strokeWidth={2} strokeLinejoin="round" />
      <path d="M21 50h54l-3 34H24z" fill="#F2C58F" stroke="#1B211F" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export function CoposClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const nomes = umDiaEmIsrael().copos ?? [];
  const { prontos } = nomesLegiveis(nomes, concluidas);
  const [modo, setModo] = useState<'ler' | 'jogo'>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [onda, setOnda] = useState(0);
  const mostra = (he: string) => (pontos ? he : stripNikud(he));

  const novoJogo = (): Jogo => {
    const pedidos = pedidosDaRodada(prontos);
    return { pedidos, r: 0, copos: coposDoPedido(pedidos[0]!, prontos), errados: [], feito: false, limpos: [] };
  };
  const irPara = (m: 'ler' | 'jogo') => { setModo(m); setAberto(null); setJogo(m === 'jogo' ? novoJogo() : null); setOnda(o => o + 1); };

  const escolher = (n: NomeNoCopo) => {
    if (!jogo || jogo.feito || jogo.errados.includes(n.id)) return;
    const certo = n.id === jogo.pedidos[jogo.r]!.id;
    tocarResposta(certo);
    if (!certo) { setJogo({ ...jogo, errados: [...jogo.errados, n.id] }); return; }
    const limpos = [...jogo.limpos]; limpos[jogo.r] = jogo.errados.length === 0;
    setJogo({ ...jogo, feito: true, limpos });
  };
  const proximo = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= jogo.pedidos.length ? { ...jogo, r } : { ...jogo, r, copos: coposDoPedido(jogo.pedidos[r]!, prontos), errados: [], feito: false });
    setOnda(o => o + 1);
  };

  const fim = jogo && jogo.r >= jogo.pedidos.length;
  const alvo = jogo && !fim ? jogo.pedidos[jogo.r]! : null;
  const acertos = jogo ? jogo.limpos.filter(Boolean).length : 0;
  const lista = modo === 'ler' ? prontos : jogo && !fim ? jogo.copos : [];

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/um-dia-em-israel" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {txDia.voltarMapa}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
        {p.ready && prontos.length < nomes.length && coposAbertos(prontos) && (
          <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.quantosLe(prontos.length, nomes.length)}</p>
        )}
      </header>

      {p.ready && !coposAbertos(prontos) && <p className="m-0 font-ui text-[15px] text-ink-body">{tx.poucosAinda}</p>}

      {p.ready && coposAbertos(prontos) && (
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
              {txDia.mostrarPontos}
            </button>
          </div>

          {jogo && (
            <div className="grid gap-3" aria-live="polite">
              {fim ? (
                <div className="grid gap-3 justify-items-center text-center py-2">
                  <span className="font-display text-[56px] font-bold leading-none text-ink tabular-nums">{acertos}/{jogo.pedidos.length}</span>
                  <p className="m-0 font-ui text-[16px] text-ink max-w-[44ch]">
                    {acertos === jogo.pedidos.length ? tx.fimTodos : acertos >= jogo.pedidos.length / 2 ? tx.fimMetade : tx.fimPoucos}
                  </p>
                  <button type="button" onClick={() => irPara('jogo')} className="min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">{tx.jogarDeNovo}</button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-[15px] font-bold text-ink tabular-nums">{tx.pedidoN(jogo.r + 1, jogo.pedidos.length)}</span>
                    <span className="flex gap-1.5" aria-hidden>
                      {jogo.pedidos.map((_, i) => (
                        <span key={i} className={`w-[22px] h-2 rounded-full ${i < jogo.r || (i === jogo.r && jogo.feito) ? (jogo.limpos[i] ? 'bg-[var(--teal)]' : 'bg-[var(--gold)]') : i === jogo.r ? 'bg-[var(--navy)]' : 'bg-black/15'}`} />
                      ))}
                    </span>
                  </div>
                  <div className="rounded-[18px] bg-[var(--card)] border border-line px-4 py-3 max-w-[600px] font-ui text-[16.5px] leading-snug text-ink">
                    {jogo.feito ? (
                      <span className="grid gap-3">
                        <span>
                          {jogo.limpos[jogo.r] ? tx.naPrimeira : tx.achou}{' '}
                          <span lang="he" dir="rtl" className="he text-[1.25em] text-[var(--teal-ink)]">{alvo!.he}</span> {tx.pegou(alvo!.translit)}
                        </span>
                        <button type="button" onClick={proximo} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">
                          {jogo.r + 1 < jogo.pedidos.length ? tx.proximo : tx.verResultado}
                        </button>
                      </span>
                    ) : (
                      <span>{tx.chamada(alvo!.translit)}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {lista.length > 0 && (
            <section className="hf-balcao">
              <ul key={onda} className="hf-copo-desliza list-none m-0 p-0 grid gap-x-3 gap-y-5 grid-cols-[repeat(auto-fill,minmax(110px,1fr))]">
                {lista.map((n, i) => {
                  const certoAqui = jogo?.feito && n.id === alvo?.id;
                  const errado = jogo?.errados.includes(n.id);
                  return (
                    <li key={n.id}>
                      <button type="button"
                              onClick={() => (modo === 'ler' ? setAberto(a => (a === n.id ? null : n.id)) : escolher(n))}
                              aria-expanded={modo === 'ler' ? aberto === n.id : undefined}
                              aria-label={modo === 'jogo' ? `${tx.copoN(i + 1)}: ${mostra(n.he)}` : undefined}
                              style={{ animationDelay: `${(i % 7) * 70}ms` }}
                              className={`hf-copo-btn ${certoAqui ? 'hf-copo-certo' : ''} ${errado ? 'hf-copo-errado' : ''}`}>
                        <span className="hf-copo">
                          <Copo i={i} />
                          <span lang="he" className="hf-copo-nome">{mostra(n.he)}</span>
                        </span>
                        {modo === 'ler' && aberto === n.id && (
                          <span className="grid gap-px text-center w-full rounded-[12px] border border-line bg-[var(--card)] px-2 py-1.5">
                            <span lang="he" dir="rtl" className="he text-[20px] text-[var(--teal-ink)]">{n.he}</span>
                            <span className="font-ui text-[15px] text-ink">{n.translit}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="m-0 mt-3.5 font-ui text-[13.5px] text-[#F3E6CF]">{modo === 'ler' ? tx.dicaLer : jogo && !fim && !jogo.feito ? tx.dicaJogo : ''}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

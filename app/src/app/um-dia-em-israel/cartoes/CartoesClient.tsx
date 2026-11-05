'use client';

/* Um dia em Israel, a última parada: os cartões de festa (05/11/2026). As
 * regras moram em lib/engine/cartoes.ts.
 *   · Ler os cartões: os cartões que o aluno já lê, com o desenho; tocar
 *     mostra os pontos, a leitura, o sentido e o "Mandar a um amigo".
 *   · Qual cartão?: a situação vem em português, os desenhos somem e o aluno
 *     escolhe o cartão pelo hebraico, entre cartões que ele já lê.
 * Sem nota e nada no progresso: é leitura. */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DesenhoDoCartao } from '@/components/ilustra/DesenhoDoCartao';
import { MandarCartao } from '@/components/learn/MandarCartao';
import { allLetters, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import { cartoesAbertos, cartoesLegiveis, opcoesDoCartao, rodadasDoJogo, type CartaoDeFesta } from '@/lib/engine/cartoes';
import { stripNikud } from '@/lib/hebrew';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/cartoes-de-festa';

type Jogo = { rodadas: CartaoDeFesta[]; r: number; opcoes: CartaoDeFesta[]; errados: string[]; feito: boolean; limpos: boolean[] };

const pilula = 'min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold';

export function CartoesClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const cartoes = umDiaEmIsrael().cartoes ?? [];
  const { prontos } = cartoesLegiveis(cartoes, concluidas);
  const [modo, setModo] = useState<'ler' | 'jogo'>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [mandando, setMandando] = useState<CartaoDeFesta | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [onda, setOnda] = useState(0);
  const painel = useRef<HTMLDivElement>(null);
  const mostra = (he: string) => (pontos ? he : stripNikud(he));

  useEffect(() => {
    if (mandando) painel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [mandando]);

  const novoJogo = (): Jogo => {
    const rodadas = rodadasDoJogo(prontos);
    return { rodadas, r: 0, opcoes: opcoesDoCartao(rodadas[0]!, prontos), errados: [], feito: false, limpos: [] };
  };
  const irPara = (m: 'ler' | 'jogo') => {
    setModo(m); setAberto(null); setMandando(null);
    setJogo(m === 'jogo' ? novoJogo() : null); setOnda(o => o + 1);
  };

  const escolher = (c: CartaoDeFesta) => {
    if (!jogo || jogo.feito || jogo.errados.includes(c.id)) return;
    const certo = c.id === jogo.rodadas[jogo.r]!.id;
    tocarResposta(certo);
    if (!certo) { setJogo({ ...jogo, errados: [...jogo.errados, c.id] }); return; }
    const limpos = [...jogo.limpos]; limpos[jogo.r] = jogo.errados.length === 0;
    setJogo({ ...jogo, feito: true, limpos });
  };
  const proximo = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= jogo.rodadas.length ? { ...jogo, r } : { ...jogo, r, opcoes: opcoesDoCartao(jogo.rodadas[r]!, prontos), errados: [], feito: false });
    setOnda(o => o + 1);
  };

  const fim = jogo && jogo.r >= jogo.rodadas.length;
  const alvo = jogo && !fim ? jogo.rodadas[jogo.r]! : null;
  const acertos = jogo ? jogo.limpos.filter(Boolean).length : 0;
  const lista = modo === 'ler' ? prontos : jogo && !fim ? jogo.opcoes : [];
  const semDesenho = modo === 'jogo' && jogo && !jogo.feito;

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/um-dia-em-israel" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {txDia.voltarMapa}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
        {p.ready && prontos.length < cartoes.length && cartoesAbertos(prontos) && (
          <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.quantosLe(prontos.length, cartoes.length)}</p>
        )}
      </header>

      {p.ready && !cartoesAbertos(prontos) && <p className="m-0 font-ui text-[15px] text-ink-body">{tx.poucosAinda}</p>}

      {p.ready && cartoesAbertos(prontos) && (
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

          {mandando && (
            <div ref={painel} className="scroll-mt-24">
              <MandarCartao key={mandando.id} cartao={mandando} onFechar={() => setMandando(null)} />
            </div>
          )}

          <section className="hf-festa-mesa" aria-live="polite">
            {jogo && (
              <div className="grid gap-3 mb-4">
                {fim ? (
                  <div className="grid gap-3 justify-items-center text-center py-2">
                    <span className="font-display text-[56px] font-bold leading-none text-ink tabular-nums">{acertos}/{jogo.rodadas.length}</span>
                    <p className="m-0 font-ui text-[16px] text-ink max-w-[44ch]">
                      {acertos === jogo.rodadas.length ? tx.fimTodas : acertos >= jogo.rodadas.length / 2 ? tx.fimMetade : tx.fimPoucas}
                    </p>
                    <button type="button" onClick={() => irPara('jogo')} className="min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">{tx.jogarDeNovo}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-[15px] font-bold text-ink tabular-nums">{tx.cartaoN(jogo.r + 1, jogo.rodadas.length)}</span>
                      <span className="flex gap-1.5" aria-hidden>
                        {jogo.rodadas.map((_, i) => (
                          <span key={i} className={`w-[22px] h-2 rounded-full ${i < jogo.r || (i === jogo.r && jogo.feito) ? (jogo.limpos[i] ? 'bg-[var(--teal)]' : 'bg-[var(--gold)]') : i === jogo.r ? 'bg-[var(--navy)]' : 'bg-black/15'}`} />
                        ))}
                      </span>
                    </div>
                    <div className="rounded-[18px] bg-[var(--card)] border border-line px-4 py-3 max-w-[600px] font-ui text-[16.5px] leading-snug text-ink">
                      {jogo.feito ? (
                        <span className="grid gap-3">
                          <span>
                            {jogo.limpos[jogo.r] ? tx.naPrimeira : tx.achou}{' '}
                            <span lang="he" dir="rtl" className="he text-[1.25em] text-[var(--teal-ink)]">{alvo!.he}</span> ({alvo!.translit}): <b>{alvo!.pt}</b>.
                          </span>
                          <button type="button" onClick={proximo} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">
                            {jogo.r + 1 < jogo.rodadas.length ? tx.proximo : tx.verResultado}
                          </button>
                        </span>
                      ) : (
                        <span>{alvo!.situacaoPt}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {lista.length > 0 && (
              <ul key={onda} className="hf-festa-abre list-none m-0 p-0 grid gap-x-3.5 gap-y-4 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                {lista.map((c, i) => {
                  const certoAqui = jogo?.feito && c.id === alvo?.id;
                  const errado = jogo?.errados.includes(c.id);
                  return (
                    <li key={c.id} className="grid gap-2 content-start">
                      <button type="button"
                              onClick={() => (modo === 'ler' ? setAberto(a => (a === c.id ? null : c.id)) : escolher(c))}
                              aria-expanded={modo === 'ler' ? aberto === c.id : undefined}
                              aria-label={modo === 'jogo' ? `${tx.opcaoN(i + 1)}: ${mostra(c.he)}` : undefined}
                              style={{ ['--cor' as string]: c.cor, animationDelay: `${(i % 6) * 70}ms` }}
                              className={`hf-festa-cartao ${certoAqui ? 'hf-festa-certo' : ''} ${errado ? 'hf-festa-errado' : ''} ${semDesenho ? 'min-h-[96px] content-center' : ''}`}>
                        {!semDesenho && <span className="hf-festa-arte"><DesenhoDoCartao desenho={c.desenho} /></span>}
                        <span lang="he" className="hf-festa-he">{mostra(c.he)}</span>
                        {modo === 'ler' && aberto === c.id && (
                          <span className="hf-festa-info">
                            <span lang="he" dir="rtl" className="he text-[19px] text-[#12665C]">{c.he}</span>
                            <span className="font-ui text-[14px] italic text-[#5F6A66]">{c.translit}</span>
                            <span className="font-ui text-[15px]">{c.pt}</span>
                          </span>
                        )}
                      </button>
                      {modo === 'ler' && aberto === c.id && (
                        <button type="button" onClick={() => setMandando(c)}
                                className="min-h-[44px] rounded-full bg-[var(--accent-bg)] px-3 font-ui text-[14px] font-semibold text-white">
                          {tx.mandar}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="m-0 mt-3.5 font-ui text-[13.5px] text-ink-muted">{modo === 'ler' ? tx.dicaLer : jogo && !fim && !jogo.feito ? tx.dicaJogo : ''}</p>
          </section>
        </>
      )}
    </div>
  );
}

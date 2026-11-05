'use client';

/* Um dia em Israel, a parada das 15h: o supermercado (05/11/2026, do
 * protótipo aprovado pelo dono). As regras moram em lib/engine/supermercado.ts.
 *   · Ver a prateleira: as embalagens que o aluno já lê; tocar mostra os
 *     pontos, a leitura e o sentido.
 *   · Fazer as compras: uma lista de três produtos em português; as
 *     embalagens ficam cinza e sem desenho, e o aluno pega cada um só pelo
 *     rótulo.
 * Sem nota e nada no progresso: é leitura. */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DesenhoDoProduto } from '@/components/ilustra/DesenhoDoProduto';
import { allLetters, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import {
  LISTAS_POR_RODADA, listaDeCompras, nomeCurto, produtosLegiveis, superAberto, type ListaDeCompras, type ProdutoDoSuper
} from '@/lib/engine/supermercado';
import { stripNikud } from '@/lib/hebrew';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/supermercado';

type Jogo = { r: number; atual: ListaDeCompras; pegos: string[]; errados: string[]; limpas: boolean[]; feita: boolean };

const pilula = 'min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold';

export function SupermercadoClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const produtos = umDiaEmIsrael().super ?? [];
  const { prontos } = produtosLegiveis(produtos, concluidas);
  const [modo, setModo] = useState<'ler' | 'jogo'>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [onda, setOnda] = useState(0);
  const mostra = (he: string) => (pontos ? he : stripNikud(he));

  const nova = (r: number, limpas: boolean[]): Jogo => ({ r, limpas, atual: listaDeCompras(prontos), pegos: [], errados: [], feita: false });
  const irPara = (m: 'ler' | 'jogo') => { setModo(m); setAberto(null); setJogo(m === 'jogo' ? nova(0, []) : null); setOnda(o => o + 1); };

  const fim = jogo && jogo.r >= LISTAS_POR_RODADA;
  const pegar = (pr: ProdutoDoSuper) => {
    if (!jogo || fim || jogo.feita || jogo.pegos.includes(pr.id) || jogo.errados.includes(pr.id)) return;
    const certo = jogo.atual.lista.some(x => x.id === pr.id);
    tocarResposta(certo);
    if (!certo) { setJogo({ ...jogo, errados: [...jogo.errados, pr.id] }); return; }
    const pegos = [...jogo.pegos, pr.id];
    const feita = pegos.length === jogo.atual.lista.length;
    const limpas = [...jogo.limpas];
    if (feita) limpas[jogo.r] = jogo.errados.length === 0;
    setJogo({ ...jogo, pegos, feita, limpas });
  };
  const proxima = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= LISTAS_POR_RODADA ? { ...jogo, r } : nova(r, jogo.limpas));
    setOnda(o => o + 1);
  };

  const acertos = jogo ? jogo.limpas.filter(Boolean).length : 0;
  const lista = modo === 'ler' ? prontos : jogo && !fim ? jogo.atual.prateleira : [];
  const liso = modo === 'jogo' && !!jogo && !jogo.feita;

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/um-dia-em-israel" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {txDia.voltarMapa}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
        {p.ready && prontos.length < produtos.length && superAberto(prontos) && (
          <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.quantosLe(prontos.length, produtos.length)}</p>
        )}
      </header>

      {p.ready && !superAberto(prontos) && <p className="m-0 font-ui text-[15px] text-ink-body">{tx.poucosAinda}</p>}

      {p.ready && superAberto(prontos) && (
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

          <section className="hf-loja" aria-label={tx.loja}>
            {jogo && (
              <div className="grid gap-3 mb-4" aria-live="polite">
                {fim ? (
                  <div className="grid gap-3 justify-items-center text-center py-2">
                    <span className="font-display text-[56px] font-bold leading-none text-ink tabular-nums">{acertos}/{LISTAS_POR_RODADA}</span>
                    <p className="m-0 font-ui text-[16px] text-ink max-w-[44ch]">
                      {acertos === LISTAS_POR_RODADA ? tx.fimTodas : acertos >= LISTAS_POR_RODADA / 2 ? tx.fimMetade : tx.fimPoucas}
                    </p>
                    <button type="button" onClick={() => irPara('jogo')} className="min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">{tx.jogarDeNovo}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-[15px] font-bold text-ink tabular-nums">{tx.listaN(jogo.r + 1, LISTAS_POR_RODADA)}</span>
                      <span className="flex gap-1.5" aria-hidden>
                        {Array.from({ length: LISTAS_POR_RODADA }, (_, i) => (
                          <span key={i} className={`w-[22px] h-2 rounded-full ${i < jogo.r || (i === jogo.r && jogo.feita) ? (jogo.limpas[i] ? 'bg-[var(--teal)]' : 'bg-[var(--gold)]') : i === jogo.r ? 'bg-[var(--navy)]' : 'bg-black/15'}`} />
                        ))}
                      </span>
                    </div>
                    <div className="hf-lista-compras">
                      <h2 className="m-0 mb-1 font-display text-[16px] font-bold text-[#1B211F]">{tx.listaDeCompras}</h2>
                      <ul className="m-0 p-0 list-none grid gap-0.5">
                        {jogo.atual.lista.map(x => {
                          const ok = jogo.pegos.includes(x.id);
                          return (
                            <li key={x.id} className={`flex gap-2 items-center text-[17px] leading-[26px] ${ok ? 'text-[#5F6A66]' : ''}`}>
                              <span className="w-[18px] font-bold text-[#1F8A7D]" aria-hidden>{ok ? '✓' : ''}</span>
                              {nomeCurto(x)}{ok && <span className="sr-only"> {tx.pegou}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    {jogo.feita && (
                      <div className="grid gap-3">
                        <p className="m-0 font-ui text-[16px] leading-[1.45] text-ink">
                          {jogo.limpas[jogo.r] ? tx.semErrar : tx.completa}{' '}
                          {jogo.atual.lista.map((x, i) => (
                            <span key={x.id}>{i > 0 && ' · '}<span lang="he" dir="rtl" className="he text-[1.2em] text-[var(--teal-ink)]">{x.he}</span> {nomeCurto(x)}</span>
                          ))}
                        </p>
                        <button type="button" onClick={proxima} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">
                          {jogo.r + 1 < LISTAS_POR_RODADA ? tx.proxima : tx.verResultado}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {lista.length > 0 && (
              <ul key={onda} className="hf-prateleira list-none m-0 p-0 grid gap-x-3 gap-y-[22px] grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
                {lista.map((pr, i) => {
                  const pego = jogo?.pegos.includes(pr.id);
                  const errado = jogo?.errados.includes(pr.id);
                  return (
                    <li key={pr.id}>
                      <button type="button"
                              onClick={() => (modo === 'ler' ? setAberto(a => (a === pr.id ? null : pr.id)) : pegar(pr))}
                              aria-expanded={modo === 'ler' ? aberto === pr.id : undefined}
                              aria-label={modo === 'jogo' ? `${tx.embalagemN(i + 1)}: ${mostra(pr.he)}` : undefined}
                              style={{ animationDelay: `${(i % 8) * 60}ms` }}
                              className={`hf-pacote ${pego ? 'hf-pacote-pego' : ''} ${errado ? 'hf-pacote-errado' : ''}`}>
                        <span className="hf-pacote-caixa">
                          <DesenhoDoProduto id={pr.id} forma={pr.forma} cor={pr.cor} liso={liso} />
                          <span className="hf-pacote-rotulo"><span lang="he" className="hf-pacote-nome">{mostra(pr.he)}</span></span>
                        </span>
                        {modo === 'ler' && aberto === pr.id && (
                          <span className="grid gap-px text-center w-full rounded-[12px] border border-line bg-[var(--card)] px-2 py-1.5">
                            <span lang="he" dir="rtl" className="he text-[19px] text-[var(--teal-ink)]">{pr.he}</span>
                            <span className="font-ui text-[14px] italic text-ink-muted">{pr.translit}</span>
                            <span className="font-ui text-[15px] text-ink">{pr.pt}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="m-0 mt-3.5 font-ui text-[13.5px] text-ink-muted">{modo === 'ler' ? tx.dicaLer : liso ? tx.dicaJogo : ''}</p>
          </section>
          <p className="m-0 font-ui text-[13px] text-ink-muted">{tx.semMarcas}</p>
        </>
      )}
    </div>
  );
}

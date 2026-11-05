'use client';

/* Um dia em Israel, a parada das 12h: o shuk (05/11/2026, do protótipo
 * aprovado pelo dono). As regras moram em lib/engine/shuk.ts.
 *   · Passear no shuk: as bancas, com o desenho e o preço do quilo por
 *     extenso; tocar mostra os pontos, a leitura e o sentido.
 *   · Fazer as compras: a lista vem em português, os desenhos somem, o aluno
 *     acha a banca pelo hebraico e escolhe o total, também por extenso.
 * Abre com as 22 letras (os preços por extenso pedem o alfabeto inteiro).
 * Sem nota e nada no progresso: é leitura. */

import Link from 'next/link';
import { useState } from 'react';
import { DesenhoDaBanca } from '@/components/ilustra/DesenhoDaBanca';
import { allLetters, umDiaEmIsrael } from '@/lib/content';
import { precoPorExtenso } from '@/lib/engine/cardapio';
import { bancasDoPedido, opcoesDoTotal, pedidosDoShuk, totalDe, type BancaDoShuk, type PedidoDoShuk } from '@/lib/engine/shuk';
import { stripNikud } from '@/lib/hebrew';
import { alphabetComplete } from '@/lib/state/rules';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/shuk';

type Jogo = {
  pedidos: PedidoDoShuk[]; r: number; bancas: BancaDoShuk[];
  fase: 'achar' | 'pagar' | 'feito'; erradas: string[]; opcoes: number[]; opcoesErradas: number[]; limpos: boolean[];
};

const pilula = 'min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold';

export function ShukClient() {
  const p = useProgress();
  const todas = allLetters();
  const bancas = umDiaEmIsrael().shuk ?? [];
  const aberto = p.ready && alphabetComplete(p.state, todas.map(l => l.id)) && bancas.length > 0;
  const [modo, setModo] = useState<'ler' | 'jogo'>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [onda, setOnda] = useState(0);
  const mostra = (he: string) => (pontos ? he : stripNikud(he));
  const preco = (n: number) => mostra(precoPorExtenso(n));

  const montar = (pedidos: PedidoDoShuk[], r: number, limpos: boolean[]): Jogo => ({
    pedidos, r, limpos, bancas: bancasDoPedido(pedidos[r]!.banca, bancas),
    fase: 'achar', erradas: [], opcoes: [], opcoesErradas: []
  });
  const irPara = (m: 'ler' | 'jogo') => {
    setModo(m); setAberta(null);
    setJogo(m === 'jogo' ? montar(pedidosDoShuk(bancas), 0, []) : null);
    setOnda(o => o + 1);
  };

  const fim = jogo && jogo.r >= jogo.pedidos.length;
  const pedido = jogo && !fim ? jogo.pedidos[jogo.r]! : null;

  const escolherBanca = (b: BancaDoShuk) => {
    if (!jogo || !pedido || jogo.fase !== 'achar' || jogo.erradas.includes(b.id)) return;
    const certa = b.id === pedido.banca.id;
    tocarResposta(certa);
    if (!certa) { setJogo({ ...jogo, erradas: [...jogo.erradas, b.id] }); return; }
    setJogo({ ...jogo, fase: 'pagar', opcoes: opcoesDoTotal(pedido) });
  };
  const pagar = (v: number) => {
    if (!jogo || !pedido || jogo.fase !== 'pagar' || jogo.opcoesErradas.includes(v)) return;
    const certo = v === totalDe(pedido);
    tocarResposta(certo);
    if (!certo) { setJogo({ ...jogo, opcoesErradas: [...jogo.opcoesErradas, v] }); return; }
    const limpos = [...jogo.limpos]; limpos[jogo.r] = jogo.erradas.length === 0 && jogo.opcoesErradas.length === 0;
    setJogo({ ...jogo, fase: 'feito', limpos });
  };
  const proximo = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= jogo.pedidos.length ? { ...jogo, r } : montar(jogo.pedidos, r, jogo.limpos));
    setOnda(o => o + 1);
  };

  const acertos = jogo ? jogo.limpos.filter(Boolean).length : 0;
  const lista = modo === 'ler' ? bancas : jogo && !fim ? jogo.bancas : [];
  const semDesenho = modo === 'jogo' && jogo?.fase === 'achar';

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/um-dia-em-israel" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {txDia.voltarMapa}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
      </header>

      {p.ready && !aberto && <p className="m-0 font-ui text-[15px] text-ink-body">{txDia.comAs22}.</p>}

      {aberto && (
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

          <section className="hf-shuk" aria-label={tx.mercado}>
            {jogo && (
              <div className="grid gap-3 mb-4" aria-live="polite">
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
                      <span className="font-display text-[15px] font-bold text-ink tabular-nums">{tx.clienteN(jogo.r + 1, jogo.pedidos.length)}</span>
                      <span className="flex gap-1.5" aria-hidden>
                        {jogo.pedidos.map((_, i) => (
                          <span key={i} className={`w-[22px] h-2 rounded-full ${i < jogo.r || (i === jogo.r && jogo.fase === 'feito') ? (jogo.limpos[i] ? 'bg-[var(--teal)]' : 'bg-[var(--gold)]') : i === jogo.r ? 'bg-[var(--navy)]' : 'bg-black/15'}`} />
                        ))}
                      </span>
                    </div>
                    <div className="rounded-[18px] bg-[var(--card)] border border-line px-4 py-3 max-w-[640px] font-ui text-[16.5px] leading-snug text-ink">
                      {jogo.fase === 'achar' && tx.lista(tx.quilos(pedido!.quilos), pedido!.banca.pt)}
                      {jogo.fase === 'pagar' && (
                        <>
                          {tx.isso} <span lang="he" dir="rtl" className="he text-[1.2em] text-[var(--teal-ink)]">{mostra(pedido!.banca.he)}</span>{' '}
                          {tx.a} <span lang="he" dir="rtl" className="he text-[1.2em] text-[var(--teal-ink)]">{preco(pedido!.banca.preco)}</span>{' '}
                          {tx.quantoPaga(tx.quilos(pedido!.quilos))}
                        </>
                      )}
                      {jogo.fase === 'feito' && (
                        <span className="grid gap-3">
                          <span>
                            {jogo.limpos[jogo.r] ? tx.naPrimeira : tx.certoAgora}{' '}
                            <span lang="he" dir="rtl" className="he text-[1.2em] text-[var(--teal-ink)]">{pedido!.banca.he}</span> ({pedido!.banca.translit}): {pedido!.banca.pt}.
                          </span>
                          <span className="font-ui text-[15.5px]">
                            {tx.quilos(pedido!.quilos)} × <span lang="he" dir="rtl" className="he">{precoPorExtenso(pedido!.banca.preco)}</span> ={' '}
                            <b><span lang="he" dir="rtl" className="he">{precoPorExtenso(totalDe(pedido!))}</span></b>
                          </span>
                          <button type="button" onClick={proximo} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">
                            {jogo.r + 1 < jogo.pedidos.length ? tx.proximo : tx.verResultado}
                          </button>
                        </span>
                      )}
                    </div>
                    {jogo.fase === 'pagar' && (
                      <div className="flex flex-wrap gap-2.5">
                        {jogo.opcoes.map(v => (
                          <button key={v} type="button" onClick={() => pagar(v)}
                                  className={`hf-shuk-op ${jogo.opcoesErradas.includes(v) ? 'hf-shuk-op-errada' : ''}`}>
                            <span lang="he" dir="rtl">{preco(v)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {lista.length > 0 && (
              <ul key={onda} className="hf-shuk-chega list-none m-0 p-0 grid gap-x-3 gap-y-4 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                {lista.map((b, i) => {
                  const certa = jogo && jogo.fase !== 'achar' && b.id === pedido?.banca.id;
                  const errada = jogo?.erradas.includes(b.id);
                  return (
                    <li key={b.id}>
                      <button type="button"
                              onClick={() => (modo === 'ler' ? setAberta(a => (a === b.id ? null : b.id)) : escolherBanca(b))}
                              aria-expanded={modo === 'ler' ? aberta === b.id : undefined}
                              aria-label={modo === 'jogo' ? `${tx.bancaN(i + 1)}: ${mostra(b.he)}` : undefined}
                              style={{ animationDelay: `${(i % 6) * 70}ms` }}
                              className={`hf-banca ${i % 2 ? 'hf-banca-t2' : ''} ${certa ? 'hf-banca-certa' : ''} ${errada ? 'hf-banca-errada' : ''}`}>
                        <span className="hf-banca-toldo" aria-hidden />
                        {!semDesenho && (
                          <span className="hf-banca-caixa"><DesenhoDaBanca desenho={b.desenho} className="hf-banca-bob" style={{ animationDelay: `${i * 0.3}s` }} /></span>
                        )}
                        <span className="hf-banca-preco">
                          <span lang="he" className="hf-banca-nome">{mostra(b.he)}</span>
                          <span lang="he" dir="rtl" className="hf-banca-valor">{preco(b.preco)}</span>
                          <span className="font-ui text-[12px] text-[#5F6A66]">{tx.oQuilo}</span>
                        </span>
                        {modo === 'ler' && aberta === b.id && (
                          <span className="grid gap-px text-center mx-2.5 mb-2.5 rounded-[10px] border border-line bg-[var(--card)] px-2 py-1.5">
                            <span lang="he" dir="rtl" className="he text-[19px] text-[var(--teal-ink)]">{b.he}</span>
                            <span className="font-ui text-[14px] italic text-ink-muted">{b.translit}</span>
                            <span className="font-ui text-[15px] text-ink">{b.pt}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="m-0 mt-3.5 font-ui text-[13.5px] text-ink-muted">
              {modo === 'ler' ? tx.dicaLer : jogo?.fase === 'achar' ? tx.dicaAchar : jogo?.fase === 'pagar' ? tx.dicaPagar : ''}
            </p>
          </section>
          <p className="m-0 font-ui text-[13px] text-ink-muted">{tx.exemplo}</p>
        </>
      )}
    </div>
  );
}

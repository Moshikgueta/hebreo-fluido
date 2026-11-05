'use client';

/* O quadro do café (05/11/2026, aprovado pelo dono no protótipo). As regras
 * do pedido moram em lib/engine/cardapio.ts; os desenhos em DesenhosDoCafe.
 *
 *   · Ler o quadro: o nome vem sem os pontos, como na rua. Tocar num prato
 *     mostra os pontos, a leitura e o sentido.
 *   · Fazer o pedido: os desenhos somem. O cliente pede um prato pelo
 *     sentido, o aluno acha o nome no quadro e depois escolhe o preço. Quem
 *     acerta os dois de primeira ganha a estrela daquele cliente.
 * Os preços vêm por extenso em hebraico (precoPorExtenso), sem os pontos
 * como o resto do quadro.
 * Sem nota e nada no progresso: é leitura. */

import { useState } from 'react';
import { DesenhoDoCafe } from './DesenhosDoCafe';
import { clientesDaRodada, opcoesDePreco, precoPorExtenso, type Cardapio } from '@/lib/engine/cardapio';
import { stripNikud } from '@/lib/hebrew';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx } from '@/i18n/telas/academia-cardapios';

type Modo = 'ler' | 'pedido';
type Jogo = {
  clientes: number[]; r: number; fase: 'achar' | 'preco' | 'feito' | 'fim';
  erradosNome: number[];
  /** As opções de preço do cliente da vez, sorteadas ao achar o nome. */
  precos: number[]; erradosPreco: number[]; estrelas: boolean[];
};

const novoJogo = (c: Cardapio): Jogo => ({ clientes: clientesDaRodada(c), r: 0, fase: 'achar', erradosNome: [], precos: [], erradosPreco: [], estrelas: [] });

/** O hebraico sobre o quadro: giz claro nos dois temas. */
function Giz({ children, className = '' }: { children: string; className?: string }) {
  return <span lang="he" dir="rtl" className={`he text-[#FBF9F5] ${className}`}>{children}</span>;
}

function Estrelas({ jogo }: { jogo: Jogo }) {
  const n = jogo.estrelas.filter(Boolean).length;
  return (
    <span className="flex gap-1.5" role="img" aria-label={tx.estrelas(n, jogo.clientes.length)}>
      {jogo.clientes.map((_, i) => (
        <svg key={i} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z" stroke="#E7B65A" strokeWidth="2" fill={jogo.estrelas[i] ? '#E7B65A' : 'none'} />
        </svg>
      ))}
    </span>
  );
}

const pilula = 'min-h-[42px] px-3.5 rounded-full border-2 font-ui text-[14.5px] font-semibold transition-colors';

export function QuadroDoCafe({ cardapios }: { cardapios: Cardapio[] }) {
  const [aba, setAba] = useState(0);
  const [modo, setModo] = useState<Modo>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  /* Muda a cada troca de aba ou de modo: a key nova remonta a lista e o giz
     se desenha de novo. Tocar num prato não muda nada aqui. */
  const [desenho, setDesenho] = useState(0);
  const c = cardapios[aba]!;
  const mostra = (he: string) => (pontos ? he : stripNikud(he));

  const trocar = (novaAba: number, novoModo: Modo) => {
    const cc = cardapios[novaAba]!;
    setAba(novaAba); setModo(novoModo); setAberto(null);
    setJogo(novoModo === 'pedido' ? novoJogo(cc) : null);
    setDesenho(d => d + 1);
  };

  const alvo = jogo && jogo.fase !== 'fim' ? c.itens[jogo.clientes[jogo.r]!]! : null;

  const tocarPrato = (i: number) => {
    if (modo === 'ler') { setAberto(a => (a === i ? null : i)); return; }
    if (!jogo || jogo.fase !== 'achar') return;
    const certo = i === jogo.clientes[jogo.r];
    tocarResposta(certo);
    setJogo(certo ? { ...jogo, fase: 'preco', precos: opcoesDePreco(c, i) } : { ...jogo, erradosNome: [...jogo.erradosNome, i] });
  };

  const escolherPreco = (p: number) => {
    if (!jogo || !alvo) return;
    const certo = p === alvo.preco;
    tocarResposta(certo);
    if (!certo) { setJogo({ ...jogo, erradosPreco: [...jogo.erradosPreco, p] }); return; }
    const limpo = jogo.erradosNome.length === 0 && jogo.erradosPreco.length === 0;
    const estrelas = [...jogo.estrelas]; estrelas[jogo.r] = limpo;
    setJogo({ ...jogo, fase: 'feito', estrelas });
  };

  const proximo = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= jogo.clientes.length ? { ...jogo, fase: 'fim' } : { ...jogo, r, fase: 'achar', erradosNome: [], erradosPreco: [] });
  };

  const escondeDesenhos = modo === 'pedido' && jogo?.fase === 'achar';
  const limpoAgora = jogo ? jogo.estrelas[jogo.r] : false;
  const acertos = jogo ? jogo.estrelas.filter(Boolean).length : 0;

  return (
    <div className="hf-quadro">
      <div className="hf-quadro-lousa grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid">
            <Giz className="text-[30px] sm:text-[38px] leading-tight">{stripNikud(c.he)}</Giz>
            <span className="font-ui text-[13px] text-[#BFD3CF]">{c.tipoPt}</span>
          </div>
          <div role="group" aria-label={tx.modo} className="inline-flex rounded-full border-2 border-white/35 overflow-hidden">
            {(['ler', 'pedido'] as const).map(m => (
              <button key={m} type="button" aria-pressed={modo === m} onClick={() => trocar(aba, m)}
                      className={`min-h-[40px] px-3.5 font-ui text-[14px] ${modo === m ? 'bg-[#FBF9F5] text-[#0E3B43] font-semibold' : 'text-[#FBF9F5]'}`}>
                {m === 'ler' ? tx.modoLer : tx.modoPedido}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label={tx.abas} className="flex flex-wrap gap-2">
          {cardapios.map((x, k) => (
            <button key={x.id} type="button" aria-pressed={k === aba} onClick={() => trocar(k, modo)}
                    className={`${pilula} ${k === aba ? 'border-[#E7B65A] text-[#E7B65A]' : 'border-dashed border-white/35 text-[#FBF9F5]'}`}>
              {x.nomePt}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" aria-pressed={pontos} onClick={() => setPontos(v => !v)}
                  className={`${pilula} font-normal ${pontos ? 'border-[#8FD6C8] text-[#8FD6C8]' : 'border-white/35 text-[#FBF9F5]'}`}>
            {tx.mostrarPontos}
          </button>
          {jogo && jogo.fase !== 'fim' && (
            <span className="font-display text-[17px] font-bold text-[#E7B65A] tabular-nums">{tx.clienteN(jogo.r + 1, jogo.clientes.length)}</span>
          )}
        </div>

        {jogo && (
          <div className="grid gap-3" aria-live="polite">
            {jogo.fase === 'fim' ? (
              <p className="m-0 rounded-[18px] bg-[#FBF9F5] text-[#0E3B43] px-4 py-3 font-ui text-[16px] leading-snug max-w-[560px]">
                {tx.completo(acertos, jogo.clientes.length)} {acertos === jogo.clientes.length ? tx.completoTodos : tx.completoParcial}
              </p>
            ) : jogo.fase === 'achar' ? (
              <p className="m-0 rounded-[18px] bg-[#FBF9F5] text-[#0E3B43] px-4 py-3 font-ui text-[16px] leading-snug max-w-[560px]">
                {tx.clientePede} <b>{alvo!.pt}</b>. {tx.acheONome}
              </p>
            ) : jogo.fase === 'preco' ? (
              <p className="m-0 rounded-[18px] bg-[#FBF9F5] text-[#0E3B43] px-4 py-3 font-ui text-[16px] leading-snug max-w-[560px]">
                {tx.isso} <span lang="he" dir="rtl" className="he text-[1.2em]">{stripNikud(alvo!.he)}</span> {tx.eh} {alvo!.pt}. {tx.quantoCusta}
              </p>
            ) : (
              <p className="m-0 font-ui text-[16px] leading-snug text-[#FBF9F5]">
                <span lang="he" dir="rtl" className="he text-[1.2em]">{stripNikud(alvo!.he)}</span> ({alvo!.translit}) {tx.custa} <span lang="he" dir="rtl" className="he text-[1.15em] font-bold">{precoPorExtenso(alvo!.preco)}</span>. {limpoAgora ? tx.naPrimeira : tx.certoAgora}
              </p>
            )}
            <Estrelas jogo={jogo} />
            {jogo.fase === 'preco' && (
              <div className="flex flex-wrap gap-2.5">
                {jogo.precos.map(p => {
                  const errado = jogo.erradosPreco.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => escolherPreco(p)} disabled={errado}
                            className={`min-h-[52px] min-w-[88px] px-4 rounded-[14px] border-2 text-[21px]
                              ${errado ? 'hf-quadro-erro border-[#F2A08A] text-[#F2A08A]' : 'border-white/35 text-[#E7B65A]'}`}>
                      <span lang="he" dir="rtl" className="he">{mostra(precoPorExtenso(p))}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {jogo.fase === 'feito' && (
              <button type="button" onClick={proximo} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[#FBF9F5] text-[#0E3B43] font-ui text-[16px] font-semibold">
                {jogo.r + 1 < jogo.clientes.length ? tx.proximoCliente : tx.verResultado}
              </button>
            )}
            {jogo.fase === 'fim' && (
              <button type="button" onClick={() => trocar(aba, 'pedido')} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[#FBF9F5] text-[#0E3B43] font-ui text-[16px] font-semibold">
                {tx.jogarDeNovo}
              </button>
            )}
          </div>
        )}

        <ul key={`${aba}-${modo}-${desenho}`} className={`list-none m-0 p-0 mt-1 grid gap-3 grid-cols-[repeat(auto-fill,minmax(128px,1fr))] hf-quadro-anima`}>
          {c.itens.map((it, i) => {
            const alvoAqui = jogo && jogo.fase !== 'achar' && jogo.fase !== 'fim' && i === jogo.clientes[jogo.r];
            const errado = jogo?.fase === 'achar' && jogo.erradosNome.includes(i);
            const abertoAqui = modo === 'ler' && aberto === i;
            return (
              <li key={it.he}>
                <button type="button" onClick={() => tocarPrato(i)} aria-expanded={modo === 'ler' ? abertoAqui : undefined}
                        aria-label={modo === 'ler' ? undefined : tx.opcao(i + 1)}
                        className={`w-full grid gap-1 justify-items-center text-center rounded-[14px] px-1.5 pt-2 pb-2.5 hover:bg-white/5
                          ${alvoAqui ? 'bg-[#8FD6C8]/15 outline-2 outline outline-[#8FD6C8]' : ''}
                          ${errado ? 'hf-quadro-erro bg-[#F2A08A]/12 outline-2 outline outline-[#F2A08A]' : ''}`}>
                  {!escondeDesenhos && <DesenhoDoCafe chave={it.desenho} />}
                  <Giz className="text-[26px] sm:text-[30px] leading-tight">{mostra(it.he)}</Giz>
                  {!escondeDesenhos && <Giz className="text-[18px] sm:text-[19px] leading-snug !text-[#E7B65A]">{mostra(precoPorExtenso(it.preco))}</Giz>}
                  {abertoAqui && (
                    <span className="grid gap-0.5 font-ui text-[15px] leading-snug text-[#8FD6C8]">
                      <Giz className="text-[24px] !text-[#8FD6C8]">{it.he}</Giz>
                      <span className="italic text-[#BFD3CF]">{it.translit}</span>
                      <span>{it.pt}</span>
                      {c.internacional && <span className="font-ui text-[11px] font-semibold uppercase tracking-[.08em] text-[#8FB3B0]">{tx.nomeInternacional}</span>}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="m-0 font-ui text-[13.5px] text-[#BFD3CF]">
          {modo === 'ler' ? tx.dicaLer : jogo?.fase === 'achar' ? tx.dicaAchar : jogo?.fase === 'preco' ? tx.dicaPreco : ''}
        </p>
      </div>
    </div>
  );
}

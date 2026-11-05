'use client';

/* O Pomar das palavras (05/11/2026, aprovado pelo dono no protótipo). As
 * regras moram em lib/engine/pomar.ts. Em cima, a palavra sem os pontos e
 * quatro sentidos; embaixo, o pomar, que só se mexe com uma jogada ganha.
 * Uma troca que não forma grupo volta e não gasta a jogada. O fim vai para a
 * mesma tela de resultado dos outros jogos (acertos de palavras). */

import { useEffect, useRef, useState } from 'react';
import type { ResultadoJogo } from './Match';
import { cair, grupos, jogadasDoAcerto, novoTabuleiro, temJogada, tentarTroca, type Fruta, type PerguntaDoPomar, type Tabuleiro } from '@/lib/engine/pomar';
import { stripNikud } from '@/lib/hebrew';
import { tocarResposta } from '@/lib/som-do-acerto';
import { nomeDaFruta, tx } from '@/i18n/telas/jogo-pomar';

const DESENHO: Record<Fruta, string> = {
  roma: '<circle cx="20" cy="22" r="13" fill="#C9443A"/><path d="M16 9l4-4 4 4z" fill="#9E2B1E"/><circle cx="15" cy="18" r="3" fill="#fff" opacity=".35"/>',
  oliva: '<ellipse cx="20" cy="21" rx="10" ry="13" fill="#6D8A4E"/><path d="M20 8c4-4 9-4 12-2-3 3-8 4-12 2z" fill="#3E5B3C"/><ellipse cx="16" cy="16" rx="2.5" ry="4" fill="#fff" opacity=".3"/>',
  tamara: '<ellipse cx="20" cy="21" rx="8" ry="14" fill="#8C5426"/><path d="M17 9c2-3 4-3 6 0" stroke="#5B4632" stroke-width="2" fill="none"/><ellipse cx="17" cy="16" rx="2" ry="5" fill="#fff" opacity=".25"/>',
  laranja: '<circle cx="20" cy="21" r="13" fill="#E07B39"/><path d="M20 8c2-3 6-3 8-1-2 2-5 3-8 1z" fill="#3E6F5E"/><circle cx="15" cy="17" r="3" fill="#fff" opacity=".35"/>',
  uva: '<g fill="#7A5A8C"><circle cx="15" cy="15" r="5"/><circle cx="25" cy="15" r="5"/><circle cx="20" cy="22" r="5"/><circle cx="12" cy="24" r="4.5"/><circle cx="28" cy="24" r="4.5"/><circle cx="20" cy="30" r="4.5"/></g><path d="M20 10V5" stroke="#3E6F5E" stroke-width="2"/>',
  figo: '<path d="M20 6c-2 6-12 10-12 19a12 12 0 0024 0c0-9-10-13-12-19z" fill="#C9577E"/><circle cx="16" cy="22" r="3" fill="#fff" opacity=".3"/>'
};

const reduzido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const espera = (ms: number) => new Promise(r => setTimeout(r, reduzido() ? 0 : ms));

export function Pomar({ perguntas, onFim }: { perguntas: PerguntaDoPomar[]; onFim: (r: ResultadoJogo) => void }) {
  const inicio = useRef(Date.now());
  const [tab, setTab] = useState<Tabuleiro>(() => novoTabuleiro(Math.random));
  const [marcas, setMarcas] = useState<Record<string, 'some' | 'cai'>>({});
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [jogadas, setJogadas] = useState(0);
  const [pts, setPts] = useState(0);
  const [i, setI] = useState(0);
  const [seq, setSeq] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [resposta, setResposta] = useState<string | null | undefined>(undefined); // undefined = ainda não respondeu
  const [ganho, setGanho] = useState(0);
  const [pontos, setPontos] = useState(false);
  const fimDasPalavras = i >= perguntas.length;
  const q = perguntas[Math.min(i, perguntas.length - 1)]!;

  const terminar = () => onFim({
    acertos, erros: perguntas.length - acertos, total: perguntas.length,
    segundos: Math.round((Date.now() - inicio.current) / 1000), letrasErradas: []
  });

  /* Acabaram as palavras e as jogadas: fim. */
  useEffect(() => {
    if (fimDasPalavras && jogadas === 0 && !ocupado) terminar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fimDasPalavras, jogadas, ocupado]);

  const responder = (v: string | null) => {
    if (resposta !== undefined) return;
    const certo = v === q.pt;
    tocarResposta(certo);
    setResposta(v);
    if (certo) {
      const s = seq + 1, g = jogadasDoAcerto(s);
      setSeq(s); setAcertos(a => a + 1); setJogadas(j => j + g); setGanho(g);
    } else { setSeq(0); setGanho(0); }
    setTimeout(() => { setResposta(undefined); setGanho(0); setI(n => n + 1); }, certo ? 900 : 1700);
  };

  const tocar = async (r: number, c: number) => {
    if (ocupado || jogadas === 0) return;
    if (!sel) { setSel([r, c]); return; }
    const a = sel; setSel(null);
    const depois = tentarTroca(tab, a, [r, c]);
    if (!depois) { if (Math.abs(a[0] - r) + Math.abs(a[1] - c) !== 1) setSel([r, c]); return; }
    setOcupado(true); setJogadas(j => j - 1);
    let t = depois, cascata = 0, soma = 0;
    setTab(t); await espera(180);
    while (grupos(t).size) {
      cascata++;
      const passo = cair(t, cascata, Math.random);
      const some: Record<string, 'some'> = {}; passo.removidas.forEach(k => { some[k] = 'some'; });
      setMarcas(some); await espera(320);
      const cai: Record<string, 'cai'> = {}; passo.caiu.forEach(k => { cai[k] = 'cai'; });
      t = passo.tabuleiro; soma += passo.pontos; setTab(t); setMarcas(cai); setPts(p => p + passo.pontos); await espera(360);
    }
    while (!temJogada(t)) { t = novoTabuleiro(Math.random); setTab(t); }
    void soma;
    setMarcas({}); setOcupado(false);
  };

  return (
    <div className="hf-pomar grid gap-3.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <span className="font-display text-[24px] font-bold tabular-nums">{pts}<small className="block font-ui text-[11px] font-semibold uppercase tracking-[.08em] text-[#BFD3CF]">{tx.pontos}</small></span>
        <span key={jogadas} className={`hf-pomar-jogadas ${ganho ? 'hf-pomar-pula' : ''}`} aria-live="polite">
          {jogadas}<small>{tx.jogadas}</small>
        </span>
        <span className="font-display text-[15px] font-bold text-[var(--il-sol)]">{seq > 1 ? tx.seguidas(seq) : ''}</span>
      </div>

      <section className="rounded-[22px] border border-white/15 bg-white/[.06] p-4 grid gap-3" aria-live="polite">
        {fimDasPalavras ? (
          <div className="grid gap-3 justify-items-center text-center">
            <p className="m-0 font-ui text-[16px] text-[#BFD3CF]">{tx.sobraram}</p>
            <button type="button" onClick={terminar} className="min-h-[48px] px-5 rounded-[13px] bg-[var(--il-sol)] text-[#0E3B43] font-ui text-[16px] font-bold">{tx.terminar}</button>
          </div>
        ) : (
          <>
            <span className="font-ui text-[13px] text-[#BFD3CF]">{tx.palavraN(i + 1, perguntas.length)}</span>
            <span key={i} lang="he" dir="rtl" className="he hf-pomar-palavra">{pontos ? q.he : stripNikud(q.he)}</span>
            <p className="m-0 -mt-1 text-center font-ui text-[14.5px] text-[#BFD3CF]">{tx.oQueQuerDizer}</p>
            <div className="grid grid-cols-2 gap-2">
              {q.opcoes.map(o => {
                const est = resposta === undefined ? '' : o === q.pt ? 'hf-pomar-ok' : o === resposta ? 'hf-pomar-no' : '';
                return <button key={o} type="button" onClick={() => responder(o)} className={`hf-pomar-op ${est}`}>{o}</button>;
              })}
            </div>
            <p className="m-0 min-h-[22px] text-center font-ui text-[14.5px] text-[#BFD3CF]">
              {resposta !== undefined && <><span lang="he" dir="rtl" className="he text-[1.2em] text-[var(--teal-lite)]">{q.he}</span> ({q.translit}){ganho ? ` · ${tx.ganhou(ganho)}` : ` = ${q.pt}`}</>}
            </p>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => responder(null)} className="min-h-[44px] font-ui text-[14px] font-semibold text-[#BFD3CF] underline">{tx.naoSei}</button>
              <button type="button" aria-pressed={pontos} onClick={() => setPontos(v => !v)}
                      className={`min-h-[40px] px-3 rounded-full border-2 font-ui text-[13.5px] font-semibold ${pontos ? 'border-[var(--teal-lite)] text-[var(--teal-lite)]' : 'border-white/25 text-white'}`}>
                {tx.mostrarPontos}
              </button>
            </div>
          </>
        )}
      </section>

      <section aria-label={tx.pomar} className={`hf-pomar-tab ${jogadas === 0 ? 'hf-pomar-travado' : ''}`}>
        <div className="grid grid-cols-6 gap-1.5">
          {tab.map((linha, r) => linha.map((f, c) => (
            <button key={`${r}-${c}`} type="button" onClick={() => void tocar(r, c)}
                    aria-label={tx.fruta(nomeDaFruta(f ?? ''), r + 1, c + 1)}
                    aria-pressed={!!sel && sel[0] === r && sel[1] === c}
                    className={`hf-pomar-casa ${sel && sel[0] === r && sel[1] === c ? 'hf-pomar-sel' : ''} ${marcas[`${r},${c}`] ? `hf-pomar-${marcas[`${r},${c}`]}` : ''}`}>
              {f && <svg viewBox="0 0 40 40" aria-hidden dangerouslySetInnerHTML={{ __html: DESENHO[f] }} />}
            </button>
          )))}
        </div>
        {jogadas === 0 && !fimDasPalavras && <p className="hf-pomar-aviso"><span>{tx.acerteParaJogar}</span></p>}
      </section>
    </div>
  );
}

'use client';

/* Montar a palavra (06/11/2026, pedido do dono). As regras moram em
 * lib/engine/montar.ts. Primeiro o jeito (com os pontos ou só as letras);
 * depois, para cada palavra, o sentido em cima, os lugares vazios no meio
 * (da direita para a esquerda, como se escreve) e as peças embaralhadas
 * embaixo, com uma a mais. Tocar numa peça a põe no primeiro lugar vazio;
 * tocar numa peça montada a devolve. Com todos os lugares cheios, confere:
 * certo, o muro se ergue; errado, as peças fora do lugar ficam vermelhas e
 * o aluno troca, ou pede a resposta. Conta como acerto só a palavra montada
 * certa na primeira vez. O fim vai para a mesma tela de resultado dos outros
 * jogos. Com "menos movimento", nada se mexe (regra geral). */

import { useRef, useState } from 'react';
import type { ResultadoJogo } from './Match';
import { montouCerto, posicoesErradas, type JeitoDeMontar, type PalavraParaMontar } from '@/lib/engine/montar';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx } from '@/i18n/telas/jogo-montar';

type Lugar = number | null; // o índice da peça do banco, ou vazio

export function MontarPalavra({ rodadas, onFim }: {
  rodadas: Record<JeitoDeMontar, PalavraParaMontar[]>; onFim: (r: ResultadoJogo) => void;
}) {
  const inicio = useRef(Date.now());
  const [jeito, setJeito] = useState<JeitoDeMontar | null>(null);
  const [i, setI] = useState(0);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [conferido, setConferido] = useState<'nao' | 'certo' | 'errado' | 'mostrado'>('nao');
  const [errou, setErrou] = useState(false);
  const [acertos, setAcertos] = useState(0);

  const escolher = (j: JeitoDeMontar) => {
    setJeito(j); setI(0); setAcertos(0); setErrou(false); setConferido('nao');
    setLugares(Array(rodadas[j][0]?.pecas.length ?? 0).fill(null));
    inicio.current = Date.now();
  };

  if (!jeito) {
    return (
      <div className="hf-montar grid gap-3">
        <p className="m-0 font-display text-[19px] font-bold text-ink">{tx.comoMontar}</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(['pontos', 'letras'] as const).map(j => {
            const exemplo = rodadas[j][0];
            return (
              <button key={j} type="button" disabled={!exemplo} onClick={() => escolher(j)} className="hf-tema">
                <span lang="he" dir="rtl" aria-hidden className="hf-tema-simbolo">{exemplo?.pecas.join('') ?? ''}</span>
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

  const lista = rodadas[jeito];
  const w = lista[i]!;
  const montadas = lugares.map(l => (l == null ? '' : w.banco[l]!));
  const usadas = new Set(lugares.filter((l): l is number => l != null));
  const erradas = conferido === 'errado' ? new Set(posicoesErradas(montadas, w)) : new Set<number>();
  const pronto = conferido === 'certo' || conferido === 'mostrado';

  const conferir = (novos: Lugar[]) => {
    const ms = novos.map(l => (l == null ? '' : w.banco[l]!));
    if (novos.some(l => l == null)) { setConferido('nao'); return; }
    const certo = montouCerto(ms, w);
    tocarResposta(certo);
    if (certo) { setConferido('certo'); if (!errou) setAcertos(a => a + 1); }
    else { setConferido('errado'); setErrou(true); }
  };
  const porPeca = (k: number) => {
    if (pronto || usadas.has(k)) return;
    const vaga = lugares.indexOf(null);
    if (vaga < 0) return;
    const novos = [...lugares]; novos[vaga] = k; setLugares(novos); conferir(novos);
  };
  const tirar = (pos: number) => {
    if (pronto || lugares[pos] == null) return;
    const novos = [...lugares]; novos[pos] = null; setLugares(novos); setConferido('nao');
  };
  const mostrar = () => {
    const usados = new Set<number>();
    const certos = w.pecas.map(p => { const k = w.banco.findIndex((b, idx) => b === p && !usados.has(idx)); usados.add(k); return k; });
    setLugares(certos); setConferido('mostrado'); setErrou(true);
  };
  const proxima = () => {
    if (i + 1 >= lista.length) {
      onFim({ acertos, erros: lista.length - acertos, total: lista.length, segundos: Math.round((Date.now() - inicio.current) / 1000), letrasErradas: [] });
      return;
    }
    const n = lista[i + 1]!;
    setI(i + 1); setErrou(false); setConferido('nao'); setLugares(Array(n.pecas.length).fill(null));
  };

  return (
    <div className="hf-montar grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-ui text-[13px] text-ink-muted tabular-nums">{tx.palavraN(i + 1, lista.length)}</span>
        <button type="button" onClick={() => setJeito(null)} className="min-h-[44px] font-ui text-[13.5px] font-semibold text-[var(--teal-ink)] underline">{tx.trocar}</button>
      </div>

      <div className="rounded-[18px] bg-[var(--sand)] px-4 py-3 text-center">
        <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.monte}</p>
        <p key={i} className="m-0 font-display text-[28px] font-semibold tracking-[-0.02em] text-[var(--accent)] animate-pop">{w.pt}</p>
      </div>

      {/* Os lugares, da direita para a esquerda. */}
      <div dir="rtl" aria-live="polite" className={`hf-montar-muro ${conferido === 'certo' ? 'hf-montar-ergue' : ''}`}>
        {lugares.map((l, pos) => (
          <button key={pos} type="button" onClick={() => tirar(pos)} disabled={pronto || l == null}
                  aria-label={`${tx.vaga(pos + 1)}: ${l == null ? tx.vazia : w.banco[l]}`}
                  style={{ animationDelay: `${pos * 70}ms` }}
                  className={`hf-montar-lugar ${l == null ? 'hf-montar-vazio' : ''} ${erradas.has(pos) ? 'hf-montar-errado' : ''} ${pronto ? 'hf-montar-certo' : ''}`}>
            {l != null && <span lang="he" className="hf-montar-texto">{w.banco[l]}</span>}
          </button>
        ))}
      </div>

      {/* As peças. */}
      {!pronto && (
        <div dir="rtl" className="flex flex-wrap justify-center gap-2.5">
          {w.banco.map((p, k) => (
            <button key={`${i}-${k}`} type="button" onClick={() => porPeca(k)} disabled={usadas.has(k)}
                    aria-label={tx.peca(p)} className="hf-montar-peca">
              <span lang="he" className="hf-montar-texto">{p}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2.5 justify-items-center text-center min-h-[48px]">
        {conferido === 'nao' && <p className="m-0 font-ui text-[14px] text-ink-muted max-w-[44ch]">{tx.dica}</p>}
        {conferido === 'errado' && (
          <>
            <p className="m-0 font-ui text-[14.5px] font-semibold text-[var(--gold-ink)] max-w-[44ch]">{tx.quase}</p>
            <button type="button" onClick={mostrar} className="min-h-[44px] font-ui text-[14px] font-semibold text-[var(--teal-ink)] underline">{tx.mostrar}</button>
          </>
        )}
        {pronto && (
          <>
            <p className="m-0 font-ui text-[15.5px] text-ink">
              <b className={conferido === 'certo' ? 'text-[var(--teal-ink)]' : 'text-[var(--gold-ink)]'}>{conferido === 'certo' ? tx.isso : tx.era}</b>{' '}
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

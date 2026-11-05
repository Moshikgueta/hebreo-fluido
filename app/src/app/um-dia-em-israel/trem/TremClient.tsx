'use client';

/* Um dia em Israel, a parada das 9h: a estação de trem (05/11/2026, do
 * protótipo aprovado pelo dono). As regras moram em lib/engine/trem.ts.
 *   · Ler o painel: as cidades que o aluno já lê; tocar numa linha mostra os
 *     pontos, a leitura e o nome em português.
 *   · Pegar o trem: "Você vai para Haifa"; o aluno acha a linha pelo hebraico
 *     e responde a hora ou a plataforma lendo a linha.
 * Os rótulos do painel só aparecem em hebraico quando o aluno já os lê.
 * Sem nota e nada no progresso: é leitura. */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { allLetters, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import {
  ROTULOS, cidadesLegiveis, opcoesDaPergunta, painel, painelDaViagem, respostaDe, tremAberto, viagensDaRodada,
  type CidadeDoTrem, type LinhaDoPainel, type Pergunta
} from '@/lib/engine/trem';
import { stripNikud } from '@/lib/hebrew';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/estacao-de-trem';

type Viagem = { destino: CidadeDoTrem; pergunta: Pergunta };
type Jogo = {
  viagens: Viagem[]; r: number; linhas: LinhaDoPainel[];
  fase: 'achar' | 'perguntar' | 'feito'; erradas: string[]; opcoes: string[]; opcoesErradas: string[]; limpas: boolean[];
};

const pilula = 'min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold';

export function TremClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const cidades = umDiaEmIsrael().trem ?? [];
  const { prontas } = cidadesLegiveis(cidades, concluidas);
  const alfabeto = useMemo(() => alfabetoDe(concluidas), [concluidas]);
  const [modo, setModo] = useState<'ler' | 'jogo'>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [onda, setOnda] = useState(0);
  const chaveProntas = prontas.map(c => c.id).join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const painelLer = useMemo(() => painel(prontas), [chaveProntas, onda]);
  const mostra = (he: string) => (pontos ? he : stripNikud(he));
  /* Um rótulo em hebraico só quando o aluno já o lê; senão, na língua do site. */
  const rotulo = (he: string, local: string) => (consegueLer(he, alfabeto)
    ? <span lang="he">{mostra(he)}</span>
    : <span className="font-ui text-[12px] leading-tight [overflow-wrap:anywhere]">{local}</span>);

  const montar = (viagens: Viagem[], r: number, limpas: boolean[]): Jogo => ({
    viagens, r, limpas, linhas: painelDaViagem(viagens[r]!.destino, prontas),
    fase: 'achar', erradas: [], opcoes: [], opcoesErradas: []
  });
  const irPara = (m: 'ler' | 'jogo') => {
    setModo(m); setAberta(null);
    setJogo(m === 'jogo' ? montar(viagensDaRodada(prontas), 0, []) : null);
    setOnda(o => o + 1);
  };

  const fim = jogo && jogo.r >= jogo.viagens.length;
  const viagem = jogo && !fim ? jogo.viagens[jogo.r]! : null;
  const alvo = jogo && viagem ? jogo.linhas.find(l => l.id === viagem.destino.id)! : null;

  const escolherLinha = (l: LinhaDoPainel) => {
    if (!jogo || !viagem || jogo.fase !== 'achar' || jogo.erradas.includes(l.id)) return;
    const certa = l.id === viagem.destino.id;
    tocarResposta(certa);
    if (!certa) { setJogo({ ...jogo, erradas: [...jogo.erradas, l.id] }); return; }
    setJogo({ ...jogo, fase: 'perguntar', opcoes: opcoesDaPergunta(jogo.linhas, l, viagem.pergunta) });
  };
  const responder = (o: string) => {
    if (!jogo || !viagem || !alvo || jogo.fase !== 'perguntar' || jogo.opcoesErradas.includes(o)) return;
    const certa = o === respostaDe(alvo, viagem.pergunta);
    tocarResposta(certa);
    if (!certa) { setJogo({ ...jogo, opcoesErradas: [...jogo.opcoesErradas, o] }); return; }
    const limpas = [...jogo.limpas]; limpas[jogo.r] = jogo.erradas.length === 0 && jogo.opcoesErradas.length === 0;
    setJogo({ ...jogo, fase: 'feito', limpas });
  };
  const proxima = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= jogo.viagens.length ? { ...jogo, r } : montar(jogo.viagens, r, jogo.limpas));
    setOnda(o => o + 1);
  };

  const acertos = jogo ? jogo.limpas.filter(Boolean).length : 0;
  const linhas = modo === 'ler' ? painelLer : jogo && !fim ? jogo.linhas : [];

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/um-dia-em-israel" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {txDia.voltarMapa}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
        {p.ready && prontas.length < cidades.length && tremAberto(prontas) && (
          <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.quantasLe(prontas.length, cidades.length)}</p>
        )}
      </header>

      {p.ready && !tremAberto(prontas) && <p className="m-0 font-ui text-[15px] text-ink-body">{tx.poucasAinda}</p>}

      {p.ready && tremAberto(prontas) && (
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

          <section className="hf-estacao" aria-label={tx.estacao}>
            <div className="hf-trilho" aria-hidden>
              <svg className="hf-trem" viewBox="0 0 150 40">
                <rect x="2" y="6" width="96" height="28" rx="6" fill="#FBF9F5" />
                <path d="M98 6h24c14 0 26 12 26 28H98z" fill="#E7B65A" />
                {[10, 32, 54, 76].map(x => <rect key={x} x={x} y="12" width="16" height="10" rx="2" fill="#155059" />)}
                <path d="M110 12h12c6 0 12 5 14 10h-26z" fill="#155059" />
                <rect x="2" y="26" width="146" height="3" fill="#1F8A7D" />
                {[20, 80, 125].map(x => <circle key={x} cx={x} cy="36" r="4" fill="#3B4A4C" />)}
              </svg>
            </div>
            <div className="flex items-baseline justify-between gap-2.5 mb-2.5">
              <span className="hf-estacao-nome">{rotulo(ROTULOS.partidas, tx.partidas)}</span>
              {consegueLer(ROTULOS.partidas, alfabeto) && <small className="font-ui text-[13px] text-[#BFD3CF]">{tx.partidas}</small>}
            </div>

            {jogo && (
              <div className="grid gap-3 mb-3" aria-live="polite">
                {fim ? (
                  <div className="grid gap-3 justify-items-center text-center py-2">
                    <span className="font-display text-[56px] font-bold leading-none text-[#F2B544] tabular-nums">{acertos}/{jogo.viagens.length}</span>
                    <p className="m-0 font-ui text-[16px] max-w-[44ch]">
                      {acertos === jogo.viagens.length ? tx.fimTodas : acertos >= jogo.viagens.length / 2 ? tx.fimMetade : tx.fimPoucas}
                    </p>
                    <button type="button" onClick={() => irPara('jogo')} className="min-h-[48px] px-5 rounded-[13px] bg-[#FBF9F5] text-[#0E3B43] font-ui text-[16px] font-semibold">{tx.jogarDeNovo}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-[15px] font-bold tabular-nums">{tx.viagemN(jogo.r + 1, jogo.viagens.length)}</span>
                      <span className="flex gap-1.5" aria-hidden>
                        {jogo.viagens.map((_, i) => (
                          <span key={i} className={`w-[22px] h-2 rounded-full ${i < jogo.r || (i === jogo.r && jogo.fase === 'feito') ? (jogo.limpas[i] ? 'bg-[#8FD6C8]' : 'bg-[#E7B65A]') : i === jogo.r ? 'bg-[#FBF9F5]' : 'bg-white/20'}`} />
                        ))}
                      </span>
                    </div>
                    <div className="rounded-[16px] bg-white/10 px-4 py-3 font-ui text-[16.5px] leading-snug">
                      {jogo.fase === 'achar' && tx.vaiPara(viagem!.destino.pt)}
                      {jogo.fase === 'perguntar' && (
                        <>{tx.isso} <span lang="he" dir="rtl" className="he text-[1.2em] text-[#8FD6C8]">{stripNikud(alvo!.he)}</span>. {viagem!.pergunta === 'hora' ? tx.qualHora : tx.qualPlataforma}</>
                      )}
                      {jogo.fase === 'feito' && (
                        <span className="grid gap-3">
                          <span>
                            {jogo.limpas[jogo.r] ? tx.naPrimeira : tx.embarcou}{' '}
                            <span lang="he" dir="rtl" className="he text-[1.2em] text-[#8FD6C8]">{alvo!.he}</span> ({alvo!.translit}): {tx.resumo(alvo!.hora, alvo!.plataforma)}
                          </span>
                          <button type="button" onClick={proxima} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[#FBF9F5] text-[#0E3B43] font-ui text-[16px] font-semibold">
                            {jogo.r + 1 < jogo.viagens.length ? tx.proxima : tx.verResultado}
                          </button>
                        </span>
                      )}
                    </div>
                    {jogo.fase === 'perguntar' && (
                      <div className="flex flex-wrap gap-2.5">
                        {jogo.opcoes.map(o => (
                          <button key={o} type="button" onClick={() => responder(o)}
                                  className={`hf-estacao-op ${jogo.opcoesErradas.includes(o) ? 'hf-estacao-op-errada' : ''}`}>
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {linhas.length > 0 && (
              <div className="hf-painel">
                <div className="hf-painel-cab" aria-hidden>
                  {rotulo(ROTULOS.hora, tx.hora)}{rotulo(ROTULOS.destino, tx.destino)}{rotulo(ROTULOS.plataforma, tx.plataforma)}
                </div>
                <ul key={onda} className="hf-painel-vira list-none m-0 p-0">
                  {linhas.map((l, i) => {
                    const certa = jogo && jogo.fase !== 'achar' && l.id === alvo?.id;
                    const errada = jogo?.erradas.includes(l.id);
                    return (
                      <li key={l.id}>
                        <button type="button"
                                onClick={() => (modo === 'ler' ? setAberta(a => (a === l.id ? null : l.id)) : escolherLinha(l))}
                                aria-expanded={modo === 'ler' ? aberta === l.id : undefined}
                                aria-label={tx.linhaRotulo(mostra(l.he), l.hora, l.plataforma)}
                                className={`hf-painel-linha-btn ${certa ? 'hf-painel-certa' : ''} ${errada ? 'hf-painel-errada' : ''}`}>
                          <span className="hf-painel-linha">
                            <span className="hf-led hf-led-num" style={{ animationDelay: `${i * 80}ms` }}>{l.hora}</span>
                            <span className="hf-led hf-led-dest" lang="he" style={{ animationDelay: `${i * 80 + 40}ms` }}>{mostra(l.he)}</span>
                            <span className="hf-led hf-led-num" style={{ animationDelay: `${i * 80 + 80}ms` }}>{l.plataforma}</span>
                          </span>
                          {modo === 'ler' && aberta === l.id && (
                            <span className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 px-2 pt-1 pb-2.5 font-ui text-[15px] text-[#FBF9F5]">
                              <span lang="he" dir="rtl" className="he text-[19px] text-[#8FD6C8]">{l.he}</span>
                              <span className="italic text-[#BFD3CF]">{l.translit}</span>
                              <span>{l.pt}</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p className="m-0 mt-3 font-ui text-[13.5px] text-[#BFD3CF]">
              {modo === 'ler' ? tx.dicaLer : jogo?.fase === 'achar' ? tx.dicaAchar : jogo?.fase === 'perguntar' ? tx.dicaPergunta : ''}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

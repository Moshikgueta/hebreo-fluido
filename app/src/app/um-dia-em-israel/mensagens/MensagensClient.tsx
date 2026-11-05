'use client';

/* Um dia em Israel, a parada das 18h: as mensagens do Dani (05/11/2026, do
 * protótipo aprovado pelo dono). As regras moram em lib/engine/mensagens.ts.
 *   · Ler a conversa: as mensagens que o aluno já lê, na ordem do dia; tocar
 *     mostra os pontos, a leitura e o sentido.
 *   · Responder ao Dani: o Dani fica "digitando", a mensagem chega, e o aluno
 *     escolhe o que ela quer dizer. As já respondidas ficam na conversa.
 * Sem nota e nada no progresso: é leitura. */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { allLetters, umDiaEmIsrael } from '@/lib/content';
import { letrasConcluidas } from '@/lib/vocabulario';
import {
  DIGITANDO_MS, conversaDaRodada, mensagensAbertas, mensagensLegiveis, opcoesDaMensagem, type MensagemDoDani
} from '@/lib/engine/mensagens';
import { stripNikud } from '@/lib/hebrew';
import { useProgress } from '@/lib/state/store';
import { tocarResposta } from '@/lib/som-do-acerto';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/mensagens-do-dani';

type Jogo = { conversa: MensagemDoDani[]; r: number; opcoes: string[]; erradas: string[]; feita: boolean; limpas: boolean[]; digitando: boolean };

const pilula = 'min-h-[44px] px-4 rounded-full border-2 font-ui text-[14.5px] font-semibold';

function Bolha({ m, texto, children, onClick, aberta, nova }: {
  m: MensagemDoDani; texto: string; children?: React.ReactNode; onClick?: () => void; aberta?: boolean; nova?: boolean;
}) {
  const cls = `hf-bolha ${m.minha ? 'hf-bolha-minha' : ''} ${nova ? 'hf-bolha-nova' : ''}`;
  const conteudo = (
    <>
      <span lang="he" className="hf-bolha-he">{texto}</span>
      {children}
      <span className="hf-bolha-hora">{m.hora}</span>
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} aria-expanded={aberta} className={cls}>{conteudo}</button>
    : <div className={cls}>{conteudo}</div>;
}

export function MensagensClient() {
  const p = useProgress();
  const todas = allLetters();
  const concluidas = useMemo(() => letrasConcluidas(p.state, todas), [p.state, todas]);
  const mensagens = umDiaEmIsrael().mensagens ?? [];
  const { prontas } = mensagensLegiveis(mensagens, concluidas);
  const [modo, setModo] = useState<'ler' | 'jogo'>('ler');
  const [pontos, setPontos] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [onda, setOnda] = useState(0);
  const mostra = (he: string) => (pontos ? he : stripNikud(he));

  /* O "digitando..." de cada mensagem nova. */
  const digitando = jogo?.digitando ?? false;
  useEffect(() => {
    if (!digitando) return;
    const t = window.setTimeout(() => setJogo(j => (j ? { ...j, digitando: false } : j)), DIGITANDO_MS);
    return () => window.clearTimeout(t);
  }, [digitando, jogo?.r]);

  const rodada = (conversa: MensagemDoDani[], r: number, limpas: boolean[]): Jogo => ({
    conversa, r, limpas, opcoes: opcoesDaMensagem(conversa[r]!, prontas), erradas: [], feita: false, digitando: true
  });
  const irPara = (m: 'ler' | 'jogo') => {
    setModo(m); setAberta(null);
    setJogo(m === 'jogo' ? rodada(conversaDaRodada(prontas), 0, []) : null);
    setOnda(o => o + 1);
  };

  const fim = jogo && jogo.r >= jogo.conversa.length;
  const atual = jogo && !fim ? jogo.conversa[jogo.r]! : null;

  const responder = (o: string) => {
    if (!jogo || !atual || jogo.digitando || jogo.feita || jogo.erradas.includes(o)) return;
    const certa = o === atual.pt;
    tocarResposta(certa);
    if (!certa) { setJogo({ ...jogo, erradas: [...jogo.erradas, o] }); return; }
    const limpas = [...jogo.limpas]; limpas[jogo.r] = jogo.erradas.length === 0;
    setJogo({ ...jogo, feita: true, limpas });
  };
  const proxima = () => {
    if (!jogo) return;
    const r = jogo.r + 1;
    setJogo(r >= jogo.conversa.length ? { ...jogo, r } : rodada(jogo.conversa, r, jogo.limpas));
  };

  const acertos = jogo ? jogo.limpas.filter(Boolean).length : 0;
  /* No jogo, a conversa mostra as já respondidas (as últimas quatro) e a de agora. */
  const bolhasDoJogo = jogo
    ? [...jogo.conversa.slice(0, jogo.r).slice(-4), ...(atual && !jogo.digitando ? [atual] : [])]
    : [];

  return (
    <div className="grid gap-5 reading">
      <header className="grid gap-2">
        <Link href="/um-dia-em-israel" className="inline-flex items-center min-h-[44px] w-fit font-ui text-[14px] text-[var(--teal-ink)]">← {txDia.voltarMapa}</Link>
        <h1 className="m-0 text-[27px] sm:text-[33px] font-bold leading-tight">{tx.titulo}</h1>
        <p className="m-0 font-ui text-[15.5px] leading-relaxed text-ink-body max-w-[60ch] text-pretty">{tx.intro}</p>
        {p.ready && prontas.length < mensagens.length && mensagensAbertas(prontas) && (
          <p className="m-0 font-ui text-[14px] text-ink-muted">{tx.quantasLe(prontas.length, mensagens.length)}</p>
        )}
      </header>

      {p.ready && !mensagensAbertas(prontas) && <p className="m-0 font-ui text-[15px] text-ink-body">{tx.poucasAinda}</p>}

      {p.ready && mensagensAbertas(prontas) && (
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

          <section className="hf-celular" aria-label={tx.conversa}>
            <div className="hf-celular-topo">
              <span className="hf-celular-avatar" aria-hidden>D</span>
              <span className="grid">
                <b className="font-ui text-[16px] font-semibold">Dani</b>
                <small className="font-ui text-[12.5px] text-[#8FD6C8]">{jogo?.digitando ? tx.digitando : tx.online}</small>
              </span>
            </div>

            <div className="hf-celular-conversa" aria-live="polite">
              <ul key={onda} className="list-none m-0 p-0 grid gap-2">
                {modo === 'ler' && prontas.map((m, i) => (
                  <li key={m.id} className="grid" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <Bolha m={m} texto={mostra(m.he)} aberta={aberta === m.id}
                           onClick={m.minha ? undefined : () => setAberta(a => (a === m.id ? null : m.id))}>
                      {aberta === m.id && (
                        <span className="grid gap-px mt-1 pt-1 border-t border-line">
                          <span lang="he" dir="rtl" className="he text-[19px] text-[var(--teal-ink)] text-right">{m.he}</span>
                          <span className="font-ui text-[14px] italic text-ink-muted">{m.translit}</span>
                          <span className="font-ui text-[15px]">{m.pt}</span>
                        </span>
                      )}
                    </Bolha>
                  </li>
                ))}
                {modo === 'jogo' && bolhasDoJogo.map(m => (
                  <li key={m.id} className="grid"><Bolha m={m} texto={mostra(m.he)} nova={m.id === atual?.id} /></li>
                ))}
              </ul>
              {jogo?.digitando && (
                <div className="hf-digitando" role="status" aria-label={tx.daniDigitando}><i /><i /><i /></div>
              )}
            </div>

            <div className="hf-celular-rodape">
              {jogo && (
                fim ? (
                  <div className="grid gap-3 justify-items-center text-center py-2">
                    <span className="font-display text-[56px] font-bold leading-none text-ink tabular-nums">{acertos}/{jogo.conversa.length}</span>
                    <p className="m-0 font-ui text-[16px] text-ink max-w-[44ch]">
                      {acertos === jogo.conversa.length ? tx.fimTodas : acertos >= jogo.conversa.length / 2 ? tx.fimMetade : tx.fimPoucas}
                    </p>
                    <button type="button" onClick={() => irPara('jogo')} className="min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">{tx.jogarDeNovo}</button>
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-[15px] font-bold text-ink tabular-nums">{tx.mensagemN(jogo.r + 1, jogo.conversa.length)}</span>
                      <span className="flex gap-1.5" aria-hidden>
                        {jogo.conversa.map((_, i) => (
                          <span key={i} className={`w-[18px] h-2 rounded-full ${i < jogo.r || (i === jogo.r && jogo.feita) ? (jogo.limpas[i] ? 'bg-[var(--teal)]' : 'bg-[var(--gold)]') : i === jogo.r ? 'bg-[var(--navy)]' : 'bg-black/15'}`} />
                        ))}
                      </span>
                    </div>
                    {jogo.feita ? (
                      <>
                        <p className="m-0 font-ui text-[16px] leading-snug text-ink">
                          {jogo.limpas[jogo.r] ? tx.naPrimeira : tx.agoraSim}{' '}
                          <span lang="he" dir="rtl" className="he text-[1.2em] text-[var(--teal-ink)]">{atual!.he}</span> ({atual!.translit}): <b>{atual!.pt}</b>
                        </p>
                        <button type="button" onClick={proxima} className="justify-self-start min-h-[48px] px-5 rounded-[13px] bg-[var(--navy)] text-white font-ui text-[16px] font-semibold">
                          {jogo.r + 1 < jogo.conversa.length ? tx.proxima : tx.verResultado}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="m-0 font-ui text-[16px] font-semibold text-ink">{tx.pergunta}</p>
                        <div className="grid gap-2">
                          {jogo.opcoes.map(o => (
                            <button key={o} type="button" onClick={() => responder(o)} disabled={jogo.digitando}
                                    className={`hf-resposta ${jogo.erradas.includes(o) ? 'hf-resposta-errada' : ''}`}>
                              {o}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              )}
              <p className="m-0 font-ui text-[13.5px] text-ink-muted">
                {modo === 'ler' ? tx.dicaLer : jogo?.digitando ? tx.dicaEspera : jogo && !fim && !jogo.feita ? tx.dicaJogo : ''}
              </p>
            </div>
          </section>
          <p className="m-0 font-ui text-[13px] text-ink-muted">{tx.inventada}</p>
        </>
      )}
    </div>
  );
}

/* O Canhão de letras (o antigo Blast; 05/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Em cima, o pedido em português ("Qual é esta letra? Bet", "Qual palavra
 * quer dizer isto? casa"); embaixo, uma arena com quatro alvos em hebraico -
 * letras, sílabas com vogal e palavras - que passam pela tela, e um canhão.
 * Tocar num alvo vira o canhão para ele e dispara: a bala voa até o alvo, e
 * só então a resposta conta. O nome mudou para não lembrar o jogo de outro
 * site; por dentro, o id continua `blast` (o progresso e as métricas são os
 * mesmos).
 *
 * O que ele treina: RECONHECER sem deduzir, que é o que acontece quando
 * alguém lê de verdade uma placa na rua. Não há cronômetro nem tempo por
 * pergunta - os alvos se movem devagar, para mirar, e não para apressar.
 * Acerto avança sozinho, erro segura um pouco mais e mostra qual era a certa.
 * A sequência de acertos zera sem drama. Com "menos movimento", os alvos
 * ficam parados e a bala não voa.
 */

import { useFocoDaRodada } from './foco-da-rodada';
import { useCallback, useEffect, useRef, useState } from 'react';
import { He } from '@/components/hebrew/He';
import type { Pergunta } from '@/lib/engine/deck';
import type { ResultadoJogo } from './Match';
import { tx } from '@/i18n/telas/academia-blast';

const ELOGIO: readonly [number, string][] = [
  [3, tx.elogio3],
  [5, tx.elogio5],
  [8, tx.elogio8],
  [12, tx.elogio12]
];

export function Blast({
  perguntas, onFim, onResposta
}: {
  perguntas: readonly Pergunta[];
  onFim: (r: ResultadoJogo) => void;
  onResposta?: (a: { id: string; letterId: string; certo: boolean; escolhida: string }) => void;
}) {
  const [i, setI] = useState(0);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [sequencia, setSequencia] = useState(0);
  const [elogio, setElogio] = useState<string | null>(null);
  const [erradas, setErradas] = useState<string[]>([]);
  const inicio = useRef(Date.now());
  const avanco = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arena = useRef<HTMLDivElement | null>(null);
  const alvos = useRef<(HTMLButtonElement | null)[]>([]);
  /* A mira e o tiro: o ângulo do canhão (graus) e a bala, do cano até o alvo. */
  const [angulo, setAngulo] = useState(0);
  const [bala, setBala] = useState<{ x: number; y: number; voando: boolean } | null>(null);
  const [mirando, setMirando] = useState<number | null>(null);

  /* A TRAVA, e o defeito que ela conserta.
     ─────────────────────────────────────────────────────────────────────
     `responder` guardava com `if (escolha !== null) return`, e `escolha` vem
     do FECHO do render. Dois toques dentro do mesmo quadro - em alternativas
     DIFERENTES, que é o que acontece num toque duplo de polegar - veem os
     dois o mesmo fecho, com `escolha` ainda nula. O segundo passava:

       · gravava um segundo `onResposta` para a MESMA carta, com a letra
         errada, sujando o registro de confusões que a revisão usa depois;
       · marcava mais um acerto, porque `setAcertos(n => n + 1)` é funcional
         e roda as duas vezes;
       · e agendava um SEGUNDO temporizador por cima do primeiro sem limpá-lo,
         então os dois disparavam e o jogo pulava uma carta.

     O `disabled` do botão não salva: ele também é do render anterior.

     Estado de React é assíncrono por contrato; um `ref` é síncrono. A trava
     guarda o índice já respondido, e não um booleano, para se soltar sozinha
     na carta seguinte. */
  const respondido = useRef(-1);

  /** Um temporizador por vez: agendar sem limpar o anterior era o outro meio
   *  do pulo de carta. */
  const agendar = useCallback((fn: () => void, ms: number) => {
    if (avanco.current) clearTimeout(avanco.current);
    avanco.current = setTimeout(fn, ms);
  }, []);

  useEffect(() => () => { if (avanco.current) clearTimeout(avanco.current); }, []);

  const q = perguntas[i];
  const foco = useFocoDaRodada(i);

  const seguinte = useCallback(() => {
    setEscolha(null);
    setElogio(null);
    if (i + 1 >= perguntas.length) {
      onFim({
        acertos, erros: perguntas.length - acertos, total: perguntas.length,
        segundos: Math.round((Date.now() - inicio.current) / 1000),
        letrasErradas: [...new Set(erradas)]
      });
      return;
    }
    setI(n => n + 1);
  }, [i, perguntas.length, acertos, erradas, onFim]);

  const responder = useCallback((idx: number) => {
    if (escolha !== null || !q) return;
    if (respondido.current === i) return;
    respondido.current = i;
    foco.segurar();
    const certo = idx === q.resposta;
    setEscolha(idx);
    onResposta?.({ id: q.id, letterId: q.letterId, certo, escolhida: q.opcoes[idx] ?? '' });

    if (certo) {
      const nova = sequencia + 1;
      setAcertos(n => n + 1);
      setSequencia(nova);
      const marco = ELOGIO.filter(([n]) => n === nova).map(([, t]) => t)[0];
      if (marco) setElogio(marco);
      agendar(() => {
        setEscolha(null);
        setElogio(null);
        if (i + 1 >= perguntas.length) {
          onFim({
            acertos: acertos + 1, erros: perguntas.length - acertos - 1, total: perguntas.length,
            segundos: Math.round((Date.now() - inicio.current) / 1000),
            letrasErradas: [...new Set(erradas)]
          });
        } else setI(n => n + 1);
      }, marco ? 900 : 520);
      return;
    }

    setSequencia(0);
    setErradas(l => [...l, q.letterId]);
    agendar(seguinte, 1400);
  }, [escolha, q, sequencia, i, perguntas.length, acertos, erradas, onFim, onResposta, seguinte, agendar, foco.segurar]);

  /* O tiro: mira no alvo onde ele está AGORA, a bala voa, e a resposta conta
     quando ela chega. Com "menos movimento", conta na hora. */
  const atirar = useCallback((idx: number) => {
    if (escolha !== null || mirando !== null || !q) return;
    const caixa = arena.current?.getBoundingClientRect();
    const alvo = alvos.current[idx]?.getBoundingClientRect();
    const parado = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.a11yMovimento === 'reduzido');
    if (!caixa || !alvo || parado) { responder(idx); return; }
    const bocaX = caixa.width / 2, bocaY = caixa.height - 40;
    const x = alvo.left - caixa.left + alvo.width / 2, y = alvo.top - caixa.top + alvo.height / 2;
    setAngulo(Math.atan2(x - bocaX, bocaY - y) * 180 / Math.PI);
    setMirando(idx);
    setBala({ x: bocaX, y: bocaY, voando: false });
    requestAnimationFrame(() => requestAnimationFrame(() => setBala({ x, y, voando: true })));
    window.setTimeout(() => { setBala(null); setMirando(null); responder(idx); }, 300);
  }, [escolha, mirando, q, responder]);

  /* Teclado: 1-4 respondem. O mesmo atalho do resto do curso. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || escolha !== null) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.opcoes.length) { e.preventDefault(); atirar(n - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, escolha, atirar]);

  if (!q) return null;
  const emHebraico = q.sentido === 'he';

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <span className="flex-1 h-1.5 rounded-full bg-[var(--sand)] overflow-hidden">
          <span className="block h-full rounded-full bg-[var(--teal)] transition-[width] duration-300"
                style={{ width: `${(i / perguntas.length) * 100}%` }} />
        </span>
        <span className="font-ui text-[13px] tabular-nums text-ink-muted">{i + 1} / {perguntas.length}</span>
        <span className={`font-ui text-[13px] font-bold tabular-nums transition-colors
          ${sequencia >= 3 ? 'text-[var(--gold-ink)]' : 'text-ink-muted'}`}>
          {sequencia > 0 ? tx.seguidos(sequencia) : tx.acertos(acertos)}
        </span>
      </div>

      <div ref={foco.ref} tabIndex={-1} role="group" aria-label={tx.perguntaDe(i + 1, perguntas.length)}
           className="grid gap-3 outline-none">
        <div className="rounded-[18px] bg-[var(--sand)] px-4 py-3 text-center">
          <p className="m-0 font-ui text-[14px] text-ink-muted">{q.enunciadoPt}</p>
          {emHebraico
            ? <He size="lg" tone="navy">{q.alvo}</He>
            : <p key={q.id} className="m-0 font-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[var(--accent)] animate-pop">{q.alvo}</p>}
        </div>

        {/* A arena: os alvos passam, o canhão mira e dispara. */}
        <div ref={arena} className={`hf-canhao-arena ${escolha !== null || mirando !== null ? 'hf-canhao-pausa' : ''}`}>
          <ul className="list-none m-0 p-0" role="list">
            {q.opcoes.map((op, idx) => {
              const estado = escolha === null ? 'neutro'
                : idx === q.resposta ? 'certo'
                : idx === escolha ? 'errado' : 'apagado';
              return (
                <li key={`${q.id}-${idx}`} className={`hf-canhao-faixa hf-canhao-faixa-${idx}`}>
                  <button
                    type="button"
                    ref={el => { alvos.current[idx] = el; }}
                    onClick={() => atirar(idx)}
                    disabled={escolha !== null || mirando !== null}
                    aria-label={tx.alvo(idx + 1, op)}
                    data-resposta={estado === 'certo' ? 'right' : undefined}
                    className={`hf-canhao-alvo hf-canhao-alvo-${estado}`}
                  >
                    {emHebraico
                      ? <span className="font-ui text-[15px] font-semibold">{op}</span>
                      : <span lang="he" dir="rtl" className="he hf-canhao-texto">{op}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {bala && <span aria-hidden className={`hf-canhao-bala ${bala.voando ? 'hf-canhao-voa' : ''}`} style={{ left: bala.x, top: bala.y }} />}
          <span aria-hidden className="hf-canhao" style={{ ['--ang' as string]: `${angulo}deg` }}>
            <span className="hf-canhao-cano" />
            <span className="hf-canhao-base" />
          </span>
        </div>

        <p aria-live="polite" className="min-h-[22px] m-0 font-ui text-[14px] text-center">
          {escolha === null ? (mirando === null ? <span className="text-ink-muted">{tx.mire}</span> : '') : escolha === q.resposta
            ? <span className="text-[var(--teal-ink)] font-semibold">{elogio ?? tx.boa}</span>
            : <span className="text-[var(--gold-ink)] font-semibold">
                {tx.quase(emHebraico ? q.opcoes[q.resposta] : <span lang="he" dir="rtl" className="he">{q.opcoes[q.resposta]}</span>)}
              </span>}
        </p>
      </div>
    </div>
  );
}

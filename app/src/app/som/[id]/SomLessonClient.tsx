'use client';

/* A lição de um som: Vet, Chaf, Fe, Tch, Dj ou J.
 * ─────────────────────────────────────────────────────────────────────────
 * Cinco etapas, como a de uma letra, e com a mesma fixação - é o que deixa a
 * trava de progressão tratar as duas do mesmo jeito (Kaf abre depois de Vet).
 * O que muda é a terceira etapa: uma letra tem traçado para escrever; um som
 * tem um PAR, e o que se treina é a decisão entre os dois.
 *
 *   1 conhecer   - o som, a boca, a regra, as sílabas
 *   2 palavras   - as palavras que têm o som
 *   3 contraste  - lado a lado com o par (ponto à esquerda / à direita, com
 *                  guéresh / sem guéresh), para ler em voz alta. Em Vet, Chaf
 *                  e Fe é "ler": o som sozinho, e o par fica para a lição 20
 *   4 praticar   - exercícios de contraste, sem nota
 *   5 fixação    - o mesmo tipo de pergunta, com nota; 75% domina
 */

import { tx } from '@/i18n/telas/licao-som-lesson-client';
import { PortaDoModulo } from '@/components/learn/PortaDoModulo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { He } from '@/components/hebrew/He';
import { Card, Badge } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { Milestone } from '@/components/game/Game';
import { FixacaoGuiada } from '@/components/learn/FixacaoGuiada';
import { WritingCanvas } from '@/components/learn/WritingCanvas';
import { alvoDoSom } from '@/lib/fixacao';
import { ExercisePlayer, type PlayerResult } from '@/components/learn/ExercisePlayer';
import { OndeNasceOSom } from '@/components/learn/OndeNasceOSom';
import { CompararPronuncia } from '@/components/learn/CompararPronuncia';
import { GravarLeitura } from '@/components/learn/GravarLeitura';
import { AudioButton, hasAudio, useRegistroDeAudio } from '@/components/learn/AudioButton';
import { BrazilianTip, Prose, TituloComSelo, WordReveal } from '@/components/learn/Blocks';
import { Compreensao } from '@/components/learn/Compreensao';
import { useProgress } from '@/lib/state/store';
import { LIBERA_MARK, MASTERY_MARK, porQueTrancada, pendenciasDasLetras } from '@/lib/state/rules';
import { PendenciasAntesDoFim } from '@/components/learn/PendenciasAntesDoFim';
import { tx as txPendencias } from '@/i18n/telas/pendencias-antes-do-fim';
import { allLetters, course } from '@/lib/content';
import type { SomLicao } from '@/lib/engine/extras';
import { CONTRASTE, idDoSom, nomeDaLicao, ordemDeEnsino, portasDosModulos, rodadaDoSom, rotaDaLicao } from '@/lib/sons';
import { track } from '@/lib/analytics';
import { escolherRodada, registrarRodada } from '@/lib/rodadas';

/* Vet, Chaf e Fe não têm mais o contraste (29/09/2026): a terceira etapa é
   ler o som sozinho, e o lado a lado com Bet, Kaf e Pe é a lição 20. O Sin e
   os sons modernos seguem com o contraste. */
const etapasDe = (S: SomLicao) => [
  { n: 1, label: tx.conhecer },
  { n: 2, label: tx.palavras },
  { n: 3, label: S.tipo === 'daguesh' ? tx.ler : tx.contraste },
  { n: 4, label: tx.fixacao },
  { n: 5, label: tx.exercicios }
];

export function SomLessonClient({ som: S }: { som: SomLicao }) {
  const p = useProgress();
  const router = useRouter();
  /* Os exercícios de ouvir só entram quando a gravação existe, e o registro
     de gravações chega depois do primeiro render: a versão dele refaz a lista. */
  const versaoAudio = useRegistroDeAudio();
  const id = idDoSom(S.id);
  const [stage, setStage] = useState(1);
  const [trancada, setTrancada] = useState<ReturnType<typeof porQueTrancada>>(null);
  const [resultado, setResultado] = useState<PlayerResult | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const ordem = useMemo(() => ordemDeEnsino(allLetters(), course.modules), []);

  /* A mesma porta da lição de letra, e pelo mesmo motivo - ver LessonClient. */
  useEffect(() => {
    if (!p.ready) return;
    setTrancada(porQueTrancada(p.state, ordem, id, portasDosModulos(ordem, course.modules)));
  }, [p.ready, p.state, ordem, id]);

  /* Refazer é outra rodada, e o que já apareceu vai para o fim da fila
     (lib/rodadas.ts). */
  /* A etapa 4 é a Fixação guiada, sem nota. Até 11/10/2026 ela era a mesma
     rodada de perguntas da etapa 5, com outra semente. */
  const alvo = useMemo(() => alvoDoSom(S), [S]);
  const teste = useMemo(
    () => escolherRodada(`som-fixacao-${S.id}`, seed => rodadaDoSom(S, { seed, count: 8, temAudio: hasAudio })).itens,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [S, tentativa, versaoAudio]
  );

  const feito = useCallback((n: number) => {
    p.finishStage(id, n);
    if (n < 5) setStage(n + 1);
  }, [p, id]);

  const destino = useDestino(S.modulo, id, ordem);

  if (trancada) return <Trancada titulo={tx.naoAbriu(S.namePt)} trancada={trancada} />;

  const stagesDone = p.state.lessons[id]?.stagesDone ?? [];

  /* Os sons do módulo 7 (05/11/2026): o que ficou para trás nos módulos 1 a 5
     vem antes. Quem já começou esta lição segue com ela aberta. */
  const pendencias = S.modulo >= 6 && p.ready && !stagesDone.length ? pendenciasDasLetras(p.state, course.modules) : [];
  if (pendencias.length) return <PendenciasAntesDoFim titulo={txPendencias.tituloModulo(S.modulo)} pendencias={pendencias} />;

  return (
    <div className="grid gap-6 reading">
      <header className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/mapa"
                className="inline-flex items-center min-h-[44px] pr-3 font-ui text-[13px] text-ink-muted hover:text-ink-body">
            {tx.mapa}
          </Link>
          <Badge tone="accent">{tx.badge(S.modulo, S.licao, S.namePt)}</Badge>
        </div>
        <ol className="flex items-center gap-1.5" aria-label={tx.etapas}>
          {etapasDe(S).map(s => {
            const isDone = stagesDone.includes(s.n);
            const isNow = stage === s.n;
            return (
              <li key={s.n} className="flex-1">
                <button type="button" onClick={() => setStage(s.n)}
                        aria-current={isNow ? 'step' : undefined}
                        aria-label={tx.etapaDe(s.n, s.label)}
                        className="w-full min-h-[44px] grid content-center gap-1.5">
                  <span className={`block h-1.5 rounded-full transition-colors
                    ${isNow ? 'bg-[var(--accent)]' : isDone ? 'bg-[var(--green)]' : 'bg-surface-2'}`} />
                  <span className={`font-ui text-[11px] sm:text-[12px] ${isNow ? 'text-ink font-semibold' : 'text-ink-muted'}`}>
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      {stage === 1 && <Conhecer S={S} onDone={() => feito(1)} />}
      {stage === 2 && <Palavras S={S} onDone={() => feito(2)} />}
      {stage === 3 && (S.tipo === 'daguesh'
        ? <Ler S={S} onDone={() => feito(3)} />
        : <Contraste S={S} onDone={() => feito(3)} />)}
      {stage === 4 && (
        <FixacaoGuiada key={`f-${S.id}`} alvo={alvo} onDone={() => feito(4)} />
      )}
      {stage === 5 && (
        resultado ? (
          <Resultado
            S={S} r={resultado}
            onRetry={() => { setResultado(null); setTentativa(n => n + 1); }}
            onNext={() => router.push(destino.href)}
            dica={destino.dica}
          />
        ) : (
          <ExercisePlayer
            key={`fix-${S.id}-${tentativa}`}
            exercises={teste}
            title={tx.exerciciosSom(S.namePt)}
            onDone={r => {
              track('quiz_completed', { letterId: id, score: r.score });
              registrarRodada(`som-fixacao-${S.id}`, teste);
              setResultado(r);
              p.finishQuiz(id, r.score);
              p.finishStage(id, 5);
            }}
          />
        )
      )}
    </div>
  );
}

/* Para onde se vai depois: a próxima lição do caminho, a não ser que o
   módulo tenha acabado aqui - o 5 fecha no checkpoint (depois da lição 20,
   a do contraste), o 7 no fecho dos três sons juntos. */
export function useDestino(modulo: number, id: string, ordem: readonly string[]) {
  return useMemo(() => {
    const mod = course.modules.find(m => m.n === modulo);
    const doModulo = new Set(mod?.lessons.flatMap(l => l.som ? [idDoSom(l.som)] : l.letters ?? []) ?? []);
    const seguinte = ordem[ordem.indexOf(id) + 1];
    if (seguinte && doModulo.has(seguinte)) {
      const nome = nomeDaLicao(seguinte, allLetters(), course.modules);
      const dica = seguinte === idDoSom(CONTRASTE) ? tx.emSeguidaPares
        : seguinte.startsWith('som-') ? tx.emSeguidaSom(nome) : tx.emSeguidaLetra(nome);
      return { href: rotaDaLicao(seguinte), dica };
    }
    if (mod?.checkpoint) return { href: `/checkpoint/${mod.n}`, dica: tx.emSeguidaCheckpoint(mod.n) };
    if (mod && !mod.letterIds.length) return { href: '/extra/sons-modernos', dica: tx.emSeguidaSons };
    return { href: '/mapa', dica: tx.deVolta };
  }, [modulo, ordem, id]);
}

/** A porta fechada: a lição anterior ainda não foi concluída ou dominada. */
export function Trancada({ titulo, trancada }: { titulo: string; trancada: NonNullable<ReturnType<typeof porQueTrancada>> }) {
  const anterior = nomeDaLicao(trancada.anterior, allLetters(), course.modules);
  /* O fim de um módulo (03/11/2026): a revisão e as leituras dele. */
  if (trancada.falta === 'revisao') {
    return (
      <div className="grid gap-5 focus-col">
        <Card className="p-6 sm:p-8 grid gap-4 justify-items-center text-center">
          <h1 className="font-display text-[23px] sm:text-[27px] font-bold leading-tight text-ink">{titulo}</h1>
          <PortaDoModulo porque={trancada} />
          <LinkButton href="/mapa" variant="ghost" full>{tx.verMapa}</LinkButton>
        </Card>
      </div>
    );
  }
  return (
    <div className="grid gap-5 focus-col">
      <Card className="p-6 sm:p-8 grid gap-4 justify-items-center text-center">
        <h1 className="font-display text-[23px] sm:text-[27px] font-bold leading-tight text-ink">{titulo}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body max-w-[46ch] mx-auto">
          {trancada.falta === 'aula0'
            ? tx.trancadaAula0
            : trancada.falta === 'licao'
            ? tx.trancadaLicao(<strong className="font-semibold text-ink">{anterior}</strong>)
            : tx.trancadaNota(<strong className="font-semibold text-ink">{anterior}</strong>,
                Math.round((trancada.nota ?? 0) * 100), Math.round(LIBERA_MARK * 100))}
        </p>
        <div className="grid gap-2 w-full max-w-[320px] pt-1">
          <LinkButton href={rotaDaLicao(trancada.anterior)} size="lg" full>{tx.irPara(anterior)}</LinkButton>
          <LinkButton href="/mapa" variant="ghost" full>{tx.verMapa}</LinkButton>
        </div>
      </Card>
    </div>
  );
}

/* ── 1 · conhecer ──────────────────────────────────────────────────────── */
function FormaFinalDoSom({ S }: { S: SomLicao }) {
  const p = useProgress();
  const base = S.depoisDe ?? S.id;
  return (
    <Card className="p-6 grid gap-4">
      <h2 className="text-[19px] font-semibold">{tx.noFimDaPalavraTitulo}</h2>
      <div className="flex items-center justify-center gap-5 rounded-[var(--r-md)] bg-surface-2 px-4 py-4">
        <span className="grid justify-items-center gap-1">
          <He size="lg">{S.he}</He>
          <span className="font-ui text-[12px] text-ink-muted">{tx.noComeco}</span>
        </span>
        <span aria-hidden className="text-ink-muted text-[20px]">→</span>
        <span className="grid justify-items-center gap-1">
          <He size="lg">{S.finalHe!}</He>
          <span className="font-ui text-[12px] text-ink-muted">{tx.noFim}</span>
        </span>
        <span className="grid justify-items-center gap-1">
          <He size="lg" cursive>{S.finalHe!}</He>
          <span className="font-ui text-[12px] text-ink-muted">{tx.noFimAMao}</span>
        </span>
      </div>
      <p className="text-[15.5px] leading-relaxed text-ink-body">
        {tx.finalMuda(S.namePt)}
      </p>
      <WritingCanvas
        glyph={S.finalHe!}
        letterId={`${base}-final`}
        label={tx.formaFinal(S.namePt)}
        onScored={score => p.recordWriting(base, score)}
      />
    </Card>
  );
}

function Conhecer({ S, onDone }: { S: SomLicao; onDone: () => void }) {
  return (
    <div className="grid gap-5">
      <Card className="p-6 sm:p-8 grid gap-5">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <span className="grid justify-items-center gap-1">
            <He size="xl" dim>{S.parHe}</He>
            <span className="font-ui text-[13px] text-ink-muted">{S.parNomePt} · {S.parSom}</span>
          </span>
          <span aria-hidden className="text-ink-muted text-[22px]">→</span>
          <span className="grid justify-items-center gap-1">
            <He size="display">{S.he}</He>
            <span className="font-ui text-[15px] font-semibold text-[var(--accent)]">{S.namePt} · {S.som}</span>
          </span>
          {S.finalHe && (
            <span className="grid justify-items-center gap-1">
              <He size="xl">{S.finalHe}</He>
              <span className="font-ui text-[13px] text-ink-muted">{tx.noFimDaPalavra}</span>
            </span>
          )}
        </div>
        {S.tipo === 'gerech' && hasAudio(S.audioId) && (
          <div className="flex justify-center"><AudioButton audioId={S.audioId} label={tx.ouvir(S.namePt)} /></div>
        )}
        <p className="text-[16px] leading-relaxed text-ink-body"><Prose text={S.introPt} /></p>
      </Card>

      <Card className="p-6 grid gap-3">
        <h2 className="text-[19px] font-semibold">{tx.comoPronunciar}</h2>
        <p className="text-[15.5px] leading-relaxed text-ink-body">{tx.soaComo(S.comoPt.includes('{{') ? <Prose text={S.comoPt} /> : S.comoPt)}</p>
        <OndeNasceOSom articulacao={S.articulacao} letra={S.namePt} />
      </Card>

      <Card tone="wash" className="p-6 grid gap-2">
        <h2 className="text-[18px] font-semibold">{tx.quandoTem}</h2>
        <p className="text-[15.5px] leading-relaxed text-ink-body"><Prose text={S.regraPt} /></p>
        <p className="text-[15px] leading-relaxed text-ink-body border-t border-[color:var(--line-soft)] pt-3">
          <Prose text={S.irmaoPt} />
        </p>
      </Card>

      {/* A forma final mora aqui, e não na lição da letra (27/10/2026, pedido
          do dono: "coloca a ך junto com a כ e não com a Kaf"). Ela nunca leva o
          ponto e soa sempre como este som, então é aqui que se aprende a
          reconhecê-la e a escrevê-la. Saiu da lição do Kaf e do Pe junto com o
          traçado (soOLadoDoPonto em lib/sons.ts). */}
      {S.finalHe && <FormaFinalDoSom S={S} />}

      <BrazilianTip mistake={S.erro} />

      {S.curiosidade && (
        <Card tone="wash" className="p-6 grid gap-2">
          <TituloComSelo selo="curiosidade" className="text-[var(--teal-ink)]" />
          <p className="font-ui text-[17px] font-semibold text-ink">{S.curiosidade.tituloPt}</p>
          {S.curiosidade.textoPt.split(/\n\n+/).map((par, i) => (
            <p key={i} className="text-[15.5px] leading-relaxed text-ink-body"><Prose text={par} /></p>
          ))}
        </Card>
      )}

      {S.silabas.length > 0 && (
        <Card className="p-6 grid gap-4">
          <div className="grid gap-1">
            <h2 className="text-[19px] font-semibold">{tx.comCadaVogal}</h2>
            <p className="font-ui text-[13.5px] text-ink-muted">{tx.emTodas(S.rotuloPt[0]!.toUpperCase() + S.rotuloPt.slice(1))}</p>
          </div>
          {/* Como na lição da letra (27/09/2026): tocar na sílaba toca o som,
              e o gravar-e-comparar fica logo abaixo. Sem gravação, a lista. */}
          {S.silabas.some(s => hasAudio(s.audioId)) ? (
            <CompararPronuncia itens={S.silabas} grade />
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3 list-none p-0 m-0" dir="rtl">
              {S.silabas.map(s => (
                <li key={s.he} className="rounded-[var(--r-md)] bg-surface-2 p-3 grid justify-items-center gap-1">
                  <He size="xl">{s.he}</He>
                  <span dir="ltr" className="font-ui text-[14px] font-semibold text-ink">{s.translit}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Compreensao
        id={`checagem-som-${S.id}`}
        titulo={tx.entendeu}
        intro={tx.naoVaiNota}
        perguntas={S.checagem}
        fecho={{
          bom: tx.fechoBom,
          parcial: tx.fechoParcial
        }}
      />

      <Button size="lg" onClick={onDone} full>{tx.continuarPalavras}</Button>
    </div>
  );
}

/* ── 2 · palavras ──────────────────────────────────────────────────────── */
function Palavras({ S, onDone }: { S: SomLicao; onDone: () => void }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="text-[21px] font-bold">{tx.palavrasComOSom(S.namePt)}</h2>
        <p className="font-ui text-[14px] text-ink-muted">
          {S.tipo === 'gerech'
            ? tx.vieramDeFora
            : tx.tenteLer(S.rotuloPt)}
        </p>
      </div>
      <div className="grid gap-3">
        {S.palavras.map(w => (
          <WordReveal key={w.he} word={{ ...w, use: null }} mark={marcaDe(S, w.he)} />
        ))}
      </div>
      <CompararPronuncia itens={S.palavras} titulo={tx.comparepalavras} />
      <Button size="lg" onClick={onDone} full>
        {S.tipo === 'daguesh' ? tx.continuarLeitura : tx.continuarContraste}
      </Button>
    </div>
  );
}

/* ── 3 · ler (Vet, Chaf, Fe) ───────────────────────────────────────────── */
function Ler({ S, onDone }: { S: SomLicao; onDone: () => void }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="text-[21px] font-bold">{tx.lerEmVozAlta(S.namePt)}</h2>
        <p className="font-ui text-[14.5px] leading-relaxed text-ink-body">
          {tx.soOSom(<strong>{S.som}</strong>, S.finalHe ? <He size="inline">{S.finalHe}</He> : null)}
        </p>
      </div>

      <Card className="p-5 grid gap-2">
        <p className="font-ui text-[12px] uppercase tracking-[.07em] text-[var(--accent)] text-center">
          {S.namePt} · {S.rotuloPt}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" dir="rtl">
          {S.silabas.map(s => <Par key={s.he} he={s.he} translit={s.translit} audioId={s.audioId} destaque />)}
        </div>
      </Card>

      <Card className="p-5 grid gap-2 content-start">
        <p className="font-ui text-[12px] uppercase tracking-[.07em] text-[var(--accent)]">
          {tx.comOSom(S.som)}<He size="inline">{S.he}</He>
        </p>
        {S.palavras.map(w => <Linha key={w.he} w={w} mark={marcaDe(S, w.he)} />)}
      </Card>

      <GravarLeitura
        titulo={tx.leiaPalavras}
        instrucao={tx.leiaPalavrasInstrucao(S.som, S.som.toUpperCase())}
        maxSegundos={60}
      />

      <Button size="lg" onClick={onDone} full>{tx.continuarFixacao}</Button>
    </div>
  );
}

/* ── 3 · contraste ─────────────────────────────────────────────────────── */
function Contraste({ S, onDone }: { S: SomLicao; onDone: () => void }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="text-[21px] font-bold">{tx.ouPar(S.parNomePt, S.namePt)}</h2>
        <p className="font-ui text-[14.5px] leading-relaxed text-ink-body">
          {S.tipo !== 'gerech'
            ? tx.ladoALado(S.parRotuloPt, S.rotuloPt, <strong>{S.parSom}</strong>, <strong>{S.som}</strong>)
            : tx.comTraco(<He size="inline">{S.parHe}</He>, <strong>{S.parSom}</strong>,
                <He size="inline">{S.he}</He>, <strong>{S.som}</strong>)}
        </p>
      </div>

      {S.parSilabas.length > 0 && (
        <Card className="p-5 grid gap-2">
          <div className="grid grid-cols-2 gap-3 font-ui text-[12px] uppercase tracking-[.07em] text-ink-muted text-center">
            <span>{S.namePt} · {S.rotuloPt}</span>
            <span>{S.parNomePt} · {S.parRotuloPt}</span>
          </div>
          {S.silabas.map((s, i) => {
            const par = S.parSilabas[i];
            return (
              <div key={s.he} className="grid grid-cols-2 gap-3" dir="ltr">
                <Par he={s.he} translit={s.translit} audioId={s.audioId} destaque />
                {par && <Par he={par.he} translit={par.translit} audioId={par.audioId} />}
              </div>
            );
          })}
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-5 grid gap-2 content-start">
          <p className="font-ui text-[12px] uppercase tracking-[.07em] text-[var(--accent)]">
            {tx.comOSom(S.som)}<He size="inline">{S.he}</He>
          </p>
          {S.palavras.map(w => <Linha key={w.he} w={w} mark={marcaDe(S, w.he)} />)}
        </Card>
        <Card className="p-5 grid gap-2 content-start">
          <p className="font-ui text-[12px] uppercase tracking-[.07em] text-ink-muted">
            {tx.comOSom(S.parSom)}<He size="inline">{S.parHe}</He>
          </p>
          {S.parPalavras.map(w => <Linha key={w.he} w={w} mark={S.tipo === 'ponto' ? [...S.parHe][0]! : S.parHe} />)}
        </Card>
      </div>

      <GravarLeitura
        titulo={tx.leiaColunas}
        instrucao={tx.leiaColunasInstrucao(S.som, S.parSom)}
        maxSegundos={60}
      />

      <Button size="lg" onClick={onDone} full>{tx.continuarFixacao}</Button>
    </div>
  );
}

/* A letra a destacar numa palavra. No Sin, a letra sem o ponto: o ponto do
   ש vem depois da vogal na ordem Unicode (שְׂ = ש + shva + ponto), e o par
   "ש + ponto" nem sempre aparece colado dentro da palavra. */
export function marcaDe(S: SomLicao, he: string): string {
  if (S.tipo === 'ponto') return [...S.he][0]!;
  return S.finalHe && he.includes(S.finalHe) ? S.finalHe : S.he;
}

export function Par({ he, translit, audioId, destaque = false }: {
  he: string; translit: string; audioId: string; destaque?: boolean;
}) {
  return (
    <span className={`flex items-center justify-center gap-3 rounded-[var(--r-md)] px-3 py-2
      ${destaque ? 'bg-[var(--accent-wash)]' : 'bg-surface-2'}`}>
      <He size="lg">{he}</He>
      <span className="font-ui text-[14px] font-semibold text-ink">{translit}</span>
      {hasAudio(audioId) && <AudioButton audioId={audioId} label="" ariaLabel={tx.ouvirItem(translit)} size="sm" />}
    </span>
  );
}

export function Linha({ w, mark }: { w: { he: string; translit: string; pt: string; audioId: string }; mark: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-md)] bg-surface-2 px-3 py-2">
      <He size="word" mark={mark}>{w.he}</He>
      <span className="grid min-w-0">
        <span className="font-ui text-[14px] font-semibold text-ink">{w.translit}</span>
        <span className="font-ui text-[12.5px] text-ink-muted">{w.pt}</span>
      </span>
      {hasAudio(w.audioId) && (
        <span className="ml-auto"><AudioButton audioId={w.audioId} label="" ariaLabel={tx.ouvirItem(w.translit)} size="sm" /></span>
      )}
    </div>
  );
}

/* ── 5 · o resultado ───────────────────────────────────────────────────── */
function Resultado({ S, r, onRetry, onNext, dica }: {
  S: SomLicao; r: PlayerResult; onRetry: () => void; onNext: () => void; dica: string;
}) {
  const pct = Math.round(r.score * 100);
  const bom = r.score >= MASTERY_MARK;
  return (
    <Milestone
      tone={bom ? 'bom' : 'parcial'}
      kicker={tx.placar(r.correct, r.total, pct)}
      title={bom ? tx.firme(S.namePt) : tx.vamosFirmar(S.namePt)}
      body={S.tipo === 'daguesh'
        ? (bom
          ? tx.daguheshBom(S.he, S.rotuloPt, S.som.toUpperCase())
          : tx.daguheshRefaca(Math.round(LIBERA_MARK * 100)))
        : bom
          ? tx.decideBom(S.parSom, S.som)
          : tx.decideRefaca(S.parSom, S.som, Math.round(LIBERA_MARK * 100))}
    >
      <Button variant={bom ? 'secondary' : 'primary'} onClick={onRetry}>{tx.refazer}</Button>
      <Button variant={bom ? 'primary' : 'secondary'} onClick={onNext}>{tx.concluir}</Button>
      <p className="basis-full font-ui text-[13px] text-ink-muted m-0">{dica}</p>
    </Milestone>
  );
}

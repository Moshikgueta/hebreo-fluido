'use client';

/* Modules 6 and 7 as lessons.
 *
 * They introduce no letter, so they do not fit the five-stage letter template -
 * and forcing them into it would be worse than useless: there is no new glyph
 * to trace and no new syllable table. What they do have is the plan's own three
 * lessons, so that is the shape:
 *
 *   module 6 - 21: where the dot goes, and reading when it is not printed
 *              22: the five final forms, together for the first time
 *              23: read without nikud
 *   module 7 - 27: the three modern sounds together, the loanwords and the
 *              quiz that closes the alphabet (24-26 are Tch, Dj and J, each
 *              a lesson of its own at /som/...)
 *
 * Progress is stored under the module id (`mod6`, `mod7`) in the same
 * `lessons` map as a letter, with three stages instead of five, and the closing
 * quiz is recorded as a checkpoint (`cp6`, `cp7`). No new state shape.
 */

import { tx } from '@/i18n/telas/licao-extra-lesson-client';
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { He, HeSeq } from '@/components/hebrew/He';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Milestone } from '@/components/game/Game';
import { ExercisePlayer, type PlayerResult } from '@/components/learn/ExercisePlayer';
import { AudioButton, hasAudio, useRegistroDeAudio } from '@/components/learn/AudioButton';
import { GravacaoDoProfessor } from '@/components/learn/GravacaoDoProfessor';
import { Prose } from '@/components/learn/Blocks';
import { useProgress } from '@/lib/state/store';
import { allLetters, course, extras, type CourseModule } from '@/lib/content';
import { classificar, exerciciosDoPonto, grupoAnalisado, palavrasDoPonto, POSICAO_PT } from '@/lib/engine/posicao-do-ponto';
import { buildDageshQuiz, buildGerechQuiz, type Extras } from '@/lib/engine/extras';
import { EXTRA_STAGE_UNITS, pendenciasDasLetras } from '@/lib/state/rules';
import { PendenciasAntesDoFim } from '@/components/learn/PendenciasAntesDoFim';
import { tx as txPendencias } from '@/i18n/telas/pendencias-antes-do-fim';
import { track } from '@/lib/analytics';
import { escolherRodada, registrarRodada } from '@/lib/rodadas';

export type ExtraSlug = 'sem-o-ponto' | 'sons-modernos';

const STAGES: Record<ExtraSlug, { n: number; label: string; lesson: number }[]> = {
  'sem-o-ponto': [
    { n: 1, label: tx.ondeVemOPonto, lesson: 21 },
    { n: 2, label: tx.asFinais, lesson: 22 },
    { n: 3, label: tx.semNikud, lesson: 23 }
  ],
  'sons-modernos': [
    /* Tch, Dj e J são as lições 24 a 26, cada uma na sua página (/som/...).
       Esta é a 27: os três juntos, e o fecho do alfabeto. */
    { n: 1, label: tx.oGueresh, lesson: 27 },
    { n: 2, label: tx.ler, lesson: 27 },
    { n: 3, label: tx.fecho, lesson: 27 }
  ]
};

export function ExtraLessonClient({ slug, module: mod }: { slug: ExtraSlug; module: CourseModule }) {
  const p = useProgress();
  const router = useRouter();
  const [stage, setStage] = useState(1);
  const [result, setResult] = useState<PlayerResult | null>(null);
  const [run, setRun] = useState(0);

  const stateId = mod.id;                       // 'mod6' | 'mod7'
  const cpId = `cp${mod.n}`;
  const stagesDone = p.state.lessons[stateId]?.stagesDone ?? [];
  const steps = STAGES[slug];

  /* Refazer o fecho é outra rodada, com o que já apareceu no fim da fila
     (lib/rodadas.ts). */
  const categoria = `modulo-${mod.n}-fecho`;
  const quiz = useMemo(
    () => escolherRodada(categoria, seed => slug === 'sem-o-ponto'
      ? buildDageshQuiz(extras(), 10, seed)
      : buildGerechQuiz(extras(), 8, seed)).itens,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, run]
  );

  const done = useCallback((n: number) => {
    p.finishStage(stateId, n, EXTRA_STAGE_UNITS);
    if (n < 3) setStage(n + 1);
  }, [p, stateId]);

  const nextModule = course.modules.find(m => m.n === mod.n + 1);

  /* O que ficou para trás nos módulos 1 a 5 (05/11/2026). Quem já começou
     este módulo segue com ele aberto. */
  const pendencias = p.ready && !stagesDone.length ? pendenciasDasLetras(p.state, course.modules) : [];
  if (pendencias.length) return <PendenciasAntesDoFim titulo={txPendencias.tituloModulo(mod.n)} pendencias={pendencias} />;

  return (
    <div className="grid gap-6 reading">
      <header className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/modulo/${mod.n}`}
                className="inline-flex items-center min-h-[44px] pr-3 font-ui text-[13px]
                           text-ink-muted hover:text-ink-body">
            {tx.modulo(mod.n)}
          </Link>
          <Badge tone="accent">{tx.badge(mod.n, steps[stage - 1]?.lesson)}</Badge>
        </div>
        <ol className="flex items-center gap-1.5" aria-label={tx.etapas}>
          {steps.map(s => {
            const isDone = stagesDone.includes(s.n);
            const isNow = stage === s.n;
            return (
              <li key={s.n} className="flex-1">
                <button
                  type="button"
                  onClick={() => setStage(s.n)}
                  aria-current={isNow ? 'step' : undefined}
                  aria-label={tx.etapaDe(s.n, s.label)}
                  className="w-full min-h-[44px] grid content-center gap-1.5"
                >
                  <span className={`block h-1.5 rounded-full transition-colors
                    ${isNow ? 'bg-[var(--accent)]' : isDone ? 'bg-[var(--green)]' : 'bg-surface-2'}`} />
                  <span className={`font-ui text-[11px] sm:text-[12px]
                    ${isNow ? 'text-ink font-semibold' : 'text-ink-muted'}`}>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      {slug === 'sem-o-ponto' && stage === 1 && <DageshStage onDone={() => done(1)} />}
      {slug === 'sem-o-ponto' && stage === 2 && <FinalsStage onDone={() => done(2)} />}
      {slug === 'sons-modernos' && stage === 1 && <GerechStage onDone={() => done(1)} />}
      {slug === 'sons-modernos' && stage === 2 && <GerechWordsStage onDone={() => done(2)} />}

      {stage === 3 && (
        result ? (
          <ClosingResult
            mod={mod} result={result}
            onRetry={() => { setResult(null); setRun(n => n + 1); }}
            onNext={() => {
              if (nextModule && nextModule.n <= 7) router.push(`/modulo/${nextModule.n}`);
              else router.push('/desafio-final');
            }}
            nextLabel={nextModule && nextModule.n <= 7
              ? tx.proximoModulo(nextModule.n, nextModule.titlePt)
              : tx.desafioFinal}
          />
        ) : slug === 'sem-o-ponto' ? (
          <UnpointedStage
            quiz={quiz}
            onDone={r => {
              setResult(r);
              registrarRodada(categoria, quiz);
              p.finishCheckpoint(cpId, r.score);
              p.finishStage(stateId, 3, EXTRA_STAGE_UNITS);
            }}
          />
        ) : (
          <ExercisePlayer
            key={run}
            exercises={quiz}
            title={tx.fechoDoAlfabeto}
            onDone={r => {
              setResult(r);
              registrarRodada(categoria, quiz);
              p.finishCheckpoint(cpId, r.score);
              p.finishStage(stateId, 3, EXTRA_STAGE_UNITS);
            }}
          />
        )
      )}

    </div>
  );
}

/* ── 6.1 · onde o ponto aparece (30/09/2026) ────────────────────────────
   Era Bet/Vet, Kaf/Chaf e Pe/Fe lado a lado - o mesmo da lição 20. Agora é o
   passo seguinte: fora do livro o ponto não é impresso, e o som sai do lugar
   da letra na palavra. Motor em lib/engine/posicao-do-ponto.ts. */
function DageshStage({ onDone }: { onDone: () => void }) {
  const D = extras().dagesh;
  const { certas, excecoes } = useMemo(() => classificar(palavrasDoPonto(extras(), allLetters())), []);
  const [fase, setFase] = useState<'ler' | 'praticar' | 'feito'>('ler');
  const [rodada, setRodada] = useState(0);
  const exercicios = useMemo(
    () => escolherRodada('modulo-6-ponto', seed => exerciciosDoPonto(certas, { seed, count: 8 })).itens,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [certas, rodada]
  );
  const exemplos = (['comeco', 'depois-de-consoante', 'depois-de-vogal'] as const).map(pos => ({
    pos, palavras: certas.filter(w => w.analise.posicao === pos).slice(0, 3)
  })).filter(x => x.palavras.length);

  if (fase === 'praticar') {
    return (
      <ExercisePlayer
        key={rodada}
        exercises={exercicios}
        title={tx.semPontoImpresso}
        repetirErros
        onDone={() => { registrarRodada('modulo-6-ponto', exercicios); setRodada(n => n + 1); setFase('feito'); }}
      />
    );
  }
  if (fase === 'feito') {
    return (
      <div className="grid gap-5">
        <Milestone tone="bom" kicker={tx.licao21} title={tx.decideOSom}
                   body={tx.emTodaPalavra} />
        <Button size="lg" full onClick={onDone}>{tx.continuarFinais}</Button>
        <Button variant="ghost" onClick={() => setFase('praticar')}>{tx.praticarDeNovo}</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-[25px] sm:text-[30px] font-bold leading-tight">{tx.ondeAparece}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body">
          {tx.doisLados(<He size="inline">ב</He>, <He size="inline">כ</He>, <He size="inline">פ</He>)}
        </p>
      </div>

      <Card tone="wash" className="p-5 grid gap-2">
        <h2 className="text-[18px] font-semibold m-0">{tx.aRegra}</h2>
        <p className="text-[15.5px] leading-relaxed text-ink-body m-0"><Prose text={D.rulePt} /></p>
      </Card>

      {exemplos.map(({ pos, palavras }) => (
        <Card key={pos} className="p-5 grid gap-3">
          <p className="font-ui text-[12px] uppercase tracking-[.07em] text-[var(--accent)] m-0">
            {POSICAO_PT[pos]} · {pos === 'depois-de-vogal' ? tx.semOPonto : tx.comOPonto}
          </p>
          {palavras.map(w => (
            <div key={w.he} className="flex items-center gap-3 rounded-[var(--r-md)] bg-surface-2 px-3 py-2">
              <He size="word" mark={w.analise.letra.he}>{w.he}</He>
              <span className="grid min-w-0">
                <span className="font-ui text-[14px] font-semibold text-ink">{w.translit}</span>
                <span className="font-ui text-[12.5px] text-ink-muted">{w.pt}</span>
              </span>
            </div>
          ))}
        </Card>
      ))}

      <Card className="p-5 grid gap-2">
        <h2 className="text-[17px] font-semibold m-0">{tx.eAsFinais}</h2>
        <p className="text-[15px] leading-relaxed text-ink-body m-0">
          {tx.finaisSemPonto(<He size="inline">ך</He>, <He size="inline">ף</He>)}
        </p>
      </Card>

      {excecoes.length > 0 && (
        <Card tone="amber" className="p-5 grid gap-3">
          <p className="font-ui text-[13px] font-semibold uppercase tracking-[.06em] text-[var(--amber)] m-0">
            {tx.regraNaoBasta}
          </p>
          {excecoes.some(w => w.analise.posicao === 'depois-de-vogal') && (
            <p className="text-[15px] leading-relaxed text-ink-body m-0">
              {tx.dobra}
            </p>
          )}
          {excecoes.some(w => w.analise.posicao === 'depois-de-consoante') && (
            <p className="text-[15px] leading-relaxed text-ink-body m-0">
              {tx.shva(<He size="inline">בְּבַקָשָׁה</He>, <He size="inline">כְּבָר</He>)}
            </p>
          )}
          {excecoes.map(w => (
            <div key={w.he} className="flex items-center gap-3 rounded-[var(--r-md)] bg-surface-2 px-3 py-2">
              <He size="word" mark={grupoAnalisado(w)}>{w.he}</He>
              <span className="font-ui text-[14px] font-semibold text-ink">{w.translit}</span>
              <span className="font-ui text-[12.5px] text-ink-muted">{w.pt}</span>
            </div>
          ))}
        </Card>
      )}

      <Card tone="amber" className="p-5">
        <p className="font-ui text-[13px] font-semibold uppercase tracking-[.06em] text-[var(--amber)] mb-2">
          {tx.naoEDetalhe}
        </p>
        <p className="text-[15px] leading-relaxed text-ink-body"><Prose text={D.warningPt} /></p>
      </Card>

      <Button size="lg" full onClick={() => setFase('praticar')}>{tx.praticarSemPonto}</Button>
    </div>
  );
}

/* ── 6.2 · the five finals, together ────────────────────────────────────── */
function FinalsStage({ onDone }: { onDone: () => void }) {
  const F = extras().finals;
  const descends = F.filter(x => x.descends);
  const stays = F.filter(x => !x.descends);
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-[25px] sm:text-[30px] font-bold leading-tight">{tx.cincoFinais}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body">
          {tx.conheceuCada}
        </p>
      </div>

      <div className="grid gap-3">
        {F.map(x => (
          <Card key={x.fin} className="p-4 grid grid-cols-[auto_auto_1fr_auto] items-center gap-4">
            <He size="lg" dim>{x.base}</He>
            <span aria-hidden className="text-ink-muted">→</span>
            <span className="flex items-baseline gap-3 flex-wrap">
              <He size="lg">{x.fin}</He>
              <span className="font-ui text-[13px] text-ink-muted">{x.namePt}</span>
            </span>
            <span className="grid gap-0.5 justify-items-end">
              <He size="word" mark={x.fin}>{x.word}</He>
              <span className="font-ui text-[12px] text-ink-muted">{x.pt}</span>
            </span>
          </Card>
        ))}
      </div>

      <Card tone="wash" className="p-5 grid gap-3">
        <p className="font-ui text-[13px] uppercase tracking-[.07em] text-[var(--accent)]">
          {tx.atalho}
        </p>
        <p className="text-[15px] leading-relaxed text-ink-body">
          {tx.descem(<HeSeq items={descends.map(x => x.fin)} size="word" sep={null} />,
            <He size="word">{stays[0]?.fin ?? ''}</He>)}
        </p>
      </Card>

      {/* O que uma forma final É (11/10/2026): sem isto, há quem conte 27
          letras, ou pense que ם e ן são duas formas da mesma letra. */}
      <Card className="p-5 grid gap-2.5">
        <h2 className="font-display text-[19px] font-semibold">{tx.outroDesenho}</h2>
        <ul className="grid gap-2 text-[15px] leading-relaxed text-ink-body list-disc pl-5 m-0">
          <li>{tx.final1}</li>
          <li>{tx.final2}</li>
          <li>{tx.final3}</li>
          <li>{tx.final4}</li>
        </ul>
      </Card>

      <MemOuNun />

      <Button size="lg" full onClick={onDone}>{tx.continuarSemNikud}</Button>
    </div>
  );
}

/* ── ם ou ן: o M e o N do fim da palavra (11/10/2026) ──────────────────────
   O brasileiro diz "bem" sem fechar os lábios: o fim vira um som nasal, e
   não um M. Por isso ם e ן soam iguais para ele no começo. São duas letras
   diferentes (mem e nun), cada uma com a sua forma final, e o ouvido precisa
   separá-las. As palavras são do curso e têm gravação de estúdio; sem
   gravação, a pergunta vira de leitura em vez de sumir. */
const FIM_MN: { he: string; fim: 'm' | 'n' }[] = [
  { he: 'אֵם', fim: 'm' }, { he: 'מִן', fim: 'n' }, { he: 'שָׁם', fim: 'm' },
  { he: 'גַן', fim: 'n' }, { he: 'יוֹם', fim: 'm' }, { he: 'חַלוֹן', fim: 'n' }
];

function MemOuNun() {
  const palavras = useMemo(() => {
    const todas = allLetters().flatMap(l => [...l.wordsToRead, ...l.wordsToRecognize]);
    return FIM_MN.flatMap(x => {
      const w = todas.find(t => t.he === x.he);
      return w ? [{ ...x, translit: w.translit, pt: w.pt, audioId: w.audioId }] : [];
    });
  }, []);
  const [resp, setResp] = useState<Record<string, 'm' | 'n'>>({});
  useRegistroDeAudio();
  return (
    <Card tone="wash" className="p-5 sm:p-6 grid gap-4">
      <h2 className="font-display text-[19px] font-semibold">{tx.memOuNunTitulo}</h2>
      <p className="text-[15px] leading-relaxed text-ink-body">
        {tx.memOuNun(<He size="inline">ם</He>, <He size="inline">אֵם</He>,
          <He size="inline">ן</He>, <He size="inline">מִן</He>)}
      </p>
      <div className="grid gap-2">
        <p className="font-ui text-[13px] font-bold uppercase tracking-[.08em] text-[var(--accent)] m-0">
          {tx.escuteDiferenca}
        </p>
        <p className="font-ui text-[14px] leading-relaxed text-ink-body m-0">
          {tx.oucaProfessor}
        </p>
        <GravacaoDoProfessor id="portuguese-em-vs-hebrew-mem" />
        <GravacaoDoProfessor id="final-mem-vs-nun" />
      </div>
      <p className="font-ui text-[15px] font-semibold text-ink m-0">
        {tx.agoraVoce}
      </p>
      <ul className="grid gap-2.5 list-none p-0 m-0">
        {palavras.map(w => {
          const r = resp[w.he];
          const ouvir = hasAudio(w.audioId);
          return (
            <li key={w.he} className="rounded-[var(--r-md)] border border-line bg-surface px-4 py-3 grid gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                {ouvir && <AudioButton audioId={w.audioId} size="sm" label={tx.ouvir} ariaLabel={tx.ouvirPalavra(w.translit)} />}
                {(!ouvir || r) && <He size="word" mark={w.fim === 'm' ? 'ם' : 'ן'}>{w.he}</He>}
                <span className="flex gap-2 ml-auto" role="group" aria-label={tx.comoTermina}>
                  {(['m', 'n'] as const).map(op => (
                    <button key={op} type="button" disabled={!!r}
                            onClick={() => setResp(x => ({ ...x, [w.he]: op }))}
                            className={`min-h-[44px] min-w-[96px] px-3 rounded-[var(--r-sm)] border font-ui text-[15px]
                              ${r && op === w.fim ? 'border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-ink)]'
                                : r === op ? 'border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold-ink)]'
                                : 'border-line bg-surface hover:bg-surface-2 text-ink-body'}`}>
                      {op === 'm' ? 'ם · M' : 'ן · N'}
                    </button>
                  ))}
                </span>
              </div>
              {r && (
                <p role="status" className={`font-ui text-[14px] leading-relaxed m-0 ${r === w.fim ? 'text-[var(--teal-ink)]' : 'text-[var(--gold-ink)]'}`}>
                  {r === w.fim ? tx.isso : tx.nao}
                  {tx.termina(w.translit, w.pt, w.fim === 'm')}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ── 6.3 · reading without the vowels ───────────────────────────────────── */
function UnpointedStage({
  quiz, onDone
}: { quiz: ReturnType<typeof buildDageshQuiz>; onDone: (r: PlayerResult) => void }) {
  const [phase, setPhase] = useState<'study' | 'quiz'>('study');
  const U = extras().unpointed;

  if (phase === 'quiz') {
    return <ExercisePlayer exercises={quiz} title={tx.fechoModulo6} onDone={onDone} />;
  }

  /* Eram oito palavras numa lista corrida, lidas em menos de um minuto - e o
     aluno saía do módulo achando que sabia ler sem nikud. São 24, em três
     blocos que sobem de dificuldade, e um par ambíguo no fim que é a lição de
     verdade: sem os pontos, o contexto é que decide. */
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-[25px] sm:text-[30px] font-bold leading-tight">{tx.lerSemNikud}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body">{U.introPt}</p>
      </div>

      {U.groups.map((g, i) => (
        <section key={g.id} aria-labelledby={`unp-${g.id}`} className="grid gap-2.5">
          <div className="grid gap-1">
            <p className="font-ui text-[11.5px] uppercase tracking-[.1em] text-ink-muted tabular-nums">
              {tx.grupo(i + 1, U.groups.length, g.words.length)}
            </p>
            <h2 id={`unp-${g.id}`} className="font-display text-[18px] font-bold text-ink">
              {g.titlePt}
            </h2>
            <p className="font-ui text-[14px] leading-relaxed text-ink-body max-w-[60ch]">
              {g.notePt}
            </p>
          </div>
          {g.words.map(w => <UnpointedRow key={w.bare} word={w} />)}
        </section>
      ))}

      <AmbiguousCard a={U.ambiguous} />

      <Button size="lg" full onClick={() => { track('checkpoint_started', { checkpointId: 'cp6' }); setPhase('quiz'); }}>
        {tx.prontoFecho}
      </Button>
    </div>
  );
}

/* A única palavra do curso que, sem os pontos, é duas coisas.
   ───────────────────────────────────────────────────────────────────────
   Ela não vira exercício de propósito: não há resposta certa para dar. O que
   ela ensina é justamente que ler hebraico não é decodificar palavra solta -
   e uma questão de múltipla escolha diria o contrário. */
function AmbiguousCard({ a }: { a: Extras['unpointed']['ambiguous'] }) {
  return (
    <Card tone="wash" className="p-5 sm:p-6 grid gap-4">
      <div className="grid gap-1 justify-items-center text-center">
        <p className="font-ui text-[11.5px] uppercase tracking-[.1em] text-ink-muted">
          {tx.umaQueEDuas}
        </p>
        <He size="lg">{a.bare}</He>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {a.readings.map(r => (
          <Card key={r.pointed} className="p-4 grid gap-1 justify-items-center text-center">
            <He size="word">{r.pointed}</He>
            <span className="font-ui text-[13px] text-ink-muted">{r.translit}</span>
            <span className="font-ui text-[14.5px] font-semibold text-ink">{r.pt}</span>
          </Card>
        ))}
      </div>

      <p className="font-ui text-[14px] leading-relaxed text-ink-body max-w-[60ch] mx-auto text-center">
        {a.notePt}
      </p>
    </Card>
  );
}

function UnpointedRow({
  word
}: { word: { bare: string; pointed: string; translit: string; pt: string; audioId: string } }) {
  const [shown, setShown] = useState(false);
  return (
    <Card className="p-4 flex items-center gap-4">
      <He size="lg">{word.bare}</He>
      <div className="ml-auto flex items-center gap-3">
        {shown ? (
          <span className="grid gap-0.5 justify-items-end animate-rise">
            <He size="word" dim>{word.pointed}</He>
            <span className="font-ui text-[12.5px] text-ink-muted">{word.translit} · {word.pt}</span>
          </span>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShown(true)}>{tx.conferir}</Button>
        )}
        <AudioButton audioId={word.audioId} label="" size="sm" />
      </div>
    </Card>
  );
}

/* ── 7.1 · the guéresh ───────────────────────────────────────────────────── */
function GerechStage({ onDone }: { onDone: () => void }) {
  const G = extras().gerech;
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-[25px] sm:text-[30px] font-bold leading-tight">{tx.sonsModernos}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body"><Prose text={G.introPt} /></p>
      </div>

      <Card className="p-6 grid gap-3">
        <h2 className="font-display text-[18px] font-semibold">{tx.oSinal}</h2>
        <p className="text-[15.5px] leading-relaxed text-ink-body"><Prose text={G.signNotePt} /></p>
      </Card>

      <div className="grid gap-3">
        {G.letters.map(g => (
          <Card key={g.id} className="p-5 grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-4">
            <He size="lg" dim>{g.base}</He>
            <span aria-hidden className="text-ink-muted">→</span>
            <He size="lg">{g.he}</He>
            <span className="grid gap-0.5 min-w-0">
              <span className="font-ui text-[16px] font-semibold text-[var(--accent)]">{g.pt}</span>
              <span className="font-ui text-[12.5px] text-ink-muted leading-snug">{g.likePt}</span>
            </span>
            <AudioButton audioId={g.audioId} label="" size="sm" />
          </Card>
        ))}
      </div>

      <Card tone="wash" className="p-5">
        <p className="text-[15px] leading-relaxed text-ink-body">
          {tx.tresSons}
        </p>
      </Card>

      <Button size="lg" full onClick={onDone}>{tx.continuarPalavras}</Button>
    </div>
  );
}

/* ── 7.2 · the loanwords ────────────────────────────────────────────────── */
function GerechWordsStage({ onDone }: { onDone: () => void }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-[25px] sm:text-[30px] font-bold leading-tight">{tx.leiaEConfira}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body">
          {tx.todasAsPalavras}
        </p>
      </div>

      {extras().gerech.letters.map(g => (
        <Card key={g.id} className="p-5 grid gap-3">
          <div className="flex items-center gap-3">
            <He size="lg">{g.he}</He>
            <span className="font-ui text-[15px] font-semibold text-[var(--accent)]">{g.pt}</span>
            <span className="ml-auto"><AudioButton audioId={g.audioId} label="" size="sm" /></span>
          </div>
          <ul className="grid gap-2">
            {g.words.map(w => (
              <li key={w.he}
                  className="flex items-center justify-between gap-4 rounded-[var(--r-md)]
                             bg-surface-2 px-4 py-3">
                <He size="word" mark={g.he}>{w.he}</He>
                <span className="font-ui text-[13.5px] text-ink-muted">{w.pt}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Button size="lg" full onClick={onDone}>{tx.continuarFecho}</Button>
    </div>
  );
}

function ClosingResult({
  mod, result, onRetry, onNext, nextLabel
}: {
  mod: CourseModule; result: PlayerResult;
  onRetry: () => void; onNext: () => void; nextLabel: string;
}) {
  const pct = Math.round(result.score * 100);
  const strong = result.score >= 0.7;
  return (
    <div className="grid gap-5">
      <Milestone
        kicker={tx.kicker(mod.n, result.correct, result.total, pct)}
        title={strong ? tx.concluido : tx.repetir}
        body={strong
          ? tx.separa
          : tx.semPressa}
      >
        <Button variant={strong ? 'secondary' : 'primary'} onClick={onRetry}>{tx.refazer}</Button>
        <Button variant={strong ? 'primary' : 'secondary'} onClick={onNext}>{nextLabel}</Button>
      </Milestone>
      {strong && (
        <Card tone="mint" className="p-5">
          <p className="text-[16px] leading-relaxed text-ink"><Prose text={mod.milestonePt} /></p>
        </Card>
      )}
    </div>
  );
}

'use client';

/* O exame final.
 * ─────────────────────────────────────────────────────────────────────────
 * Five parts, six once there are recordings, each scored on its own. A single
 * percentage cannot answer "can this person read Hebrew?", because reading is
 * several skills stacked and a learner can be strong in three of them and
 * still not read - so the report says WHICH part was weak and links straight
 * to the drill for it.
 *
 * It is gated by real progress rather than by a paywall: it only makes sense
 * with the whole alphabet in hand, and it says so. Retries are unlimited, free,
 * and generate a DIFFERENT exam each time - remembering last week's answers is
 * not the skill being examined.
 *
 * Passing is what issues the certificate, which is why the date of the first
 * pass is never overwritten by a later, worse attempt.
 */

import { GravacaoDoProfessor } from '@/components/learn/GravacaoDoProfessor';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { He } from '@/components/hebrew/He';
import { Card, Badge } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { Milestone, ProgressBar } from '@/components/game/Game';
import { ExercisePlayer, type PlayerResult } from '@/components/learn/ExercisePlayer';
import { audioAvailable } from '@/components/learn/AudioButton';
import { useProgress } from '@/lib/state/store';
import { allLetters, course, extras, scenesUpTo, sentencesUpTo } from '@/lib/content';
import { buildExam, examReport, EXAM_PASS, type Exam, type PartResult }
  from '@/lib/engine/exam';
import { alphabetComplete, isExtraModuleDone, isLessonComplete, isLessonMastered, lettersLeft, pendenciasDasLetras, REGRA_DA_CONCLUSAO } from '@/lib/state/rules';
import { PendenciasAntesDoFim } from '@/components/learn/PendenciasAntesDoFim';
import { tx as txPendencias } from '@/i18n/telas/pendencias-antes-do-fim';
import { idDoSom } from '@/lib/sons';
import { track } from '@/lib/analytics';
import { tx } from '@/i18n/telas/academia-final-challenge-client';
import { AbreDepoisDoPrazo, useAbreEm } from '@/components/platform/AbreDepoisDoPrazo';

type Phase =
  | { kind: 'intro' }
  | { kind: 'brief'; index: number }        // the screen before a part starts
  | { kind: 'running'; index: number }
  | { kind: 'done' };

/* ── o exame sobrevive a recarregar a página ─────────────────────────────
   Recarregar no meio do exame jogava fora as 40 questões e voltava à
   abertura (auditoria de 28/09/2026, QA-003). O exame é gerado de forma
   determinística pelo número da tentativa, então basta guardar a tentativa,
   a parte em que a pessoa está e o resultado das partes feitas: ao voltar,
   ela recomeça a parte em que estava, com as anteriores já contadas. Fica
   no aparelho (localStorage) e vale por 24 horas; um exame esquecido não
   reaparece uma semana depois. */
const CHAVE_EXAME = 'hf-exame-em-andamento-v2';   // v2: o exame ganhou duas partes (28/09); um salvo da v1 apontaria para outras perguntas
const VALIDADE_EXAME_MS = 24 * 3_600_000;
type ExameSalvo = { attempt: number; index: number; results: PartResult[]; em: number };

function lerExame(): ExameSalvo | null {
  try {
    const s = JSON.parse(window.localStorage.getItem(CHAVE_EXAME) || 'null') as ExameSalvo | null;
    if (!s || typeof s.attempt !== 'number' || typeof s.index !== 'number' || !Array.isArray(s.results)) return null;
    if (Date.now() - Number(s.em) > VALIDADE_EXAME_MS) return null;
    return s;
  } catch { return null; }
}
function gravarExame(s: ExameSalvo | null) {
  try {
    if (s) window.localStorage.setItem(CHAVE_EXAME, JSON.stringify(s));
    else window.localStorage.removeItem(CHAVE_EXAME);
  } catch { /* sem armazenamento: o exame só não sobrevive a recarregar */ }
}

export function FinalChallengeClient() {
  const p = useProgress();
  const abreEm = useAbreEm();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [results, setResults] = useState<PartResult[]>([]);
  const [attempt, setAttempt] = useState(() => (p.state.finalChallenge.attempts ?? 0) + 1);
  const [retomado, setRetomado] = useState(false);

  /* Volta ao exame em andamento, se houver. No efeito, e não no estado
     inicial: a página é gerada estática, e o localStorage só existe no
     navegador. */
  useEffect(() => {
    const s = lerExame();
    if (!s) return;
    setAttempt(s.attempt);
    setResults(s.results);
    setPhase({ kind: 'brief', index: s.index });
    setRetomado(true);
  }, []);

  /* Guarda a cada mudança de parte; apaga quando o exame termina ou quando
     ainda não começou. */
  useEffect(() => {
    if (phase.kind === 'brief' || phase.kind === 'running') {
      gravarExame({ attempt, index: phase.index, results, em: Date.now() });
    } else {
      gravarExame(null);
    }
  }, [phase, attempt, results]);

  const letters = allLetters();
  /* A régua do exame e do certificado: dominadas, não só concluídas. */
  const ready = letters.filter(l => isLessonMastered(p.state, l.id));
  /* Módulos 6 e 7 (CONT-010): o exame abre com as 22 letras dominadas, que é
     a regra do certificado, e as duas partes que cobram esses módulos ("Sem
     os pontos" e "Os sons de fora") só entram para quem os fez. */
  const mod6 = course.modules.find(m => m.n === 6);
  const mod7 = course.modules.find(m => m.n === 7);
  const fezMod6 = !mod6 || isExtraModuleDone(p.state, mod6.id);
  const fezMod7 = !mod7 || (isExtraModuleDone(p.state, mod7.id)
    && mod7.lessons.every(ls => !ls.som || isLessonComplete(p.state, idDoSom(ls.som))));
  const audio = audioAvailable();
  const scenes = useMemo(() => scenesUpTo(course.totalLetters), []);
  /* Todas as frases do curso: quem chega aqui fechou o alfabeto, então
     `sentencesUpTo` da última letra é o acervo inteiro. */
  const sentences = useMemo(() => sentencesUpTo(course.totalLetters), []);

  /* One exam per attempt. Rebuilt only when the attempt number changes, so
     leaving a part and coming back does not reshuffle the questions. */
  const exam = useMemo(
    () => buildExam(letters, scenes, {
      audioAvailable: audio, attempt, sentences,
      extras: fezMod7 ? extras() : undefined, semPontos: fezMod6
    }),
    [letters, scenes, sentences, audio, attempt, fezMod6, fezMod7]
  );

  const finishPart = useCallback((r: PlayerResult, index: number) => {
    const section = exam.sections[index]!;
    const next = [...results, { partId: section.part.id, correct: r.correct, total: r.total }];
    setResults(next);

    if (index + 1 < exam.sections.length) {
      setPhase({ kind: 'brief', index: index + 1 });
      return;
    }
    const report = examReport(next);
    p.finishExam(report.score, Object.fromEntries(
      next.map(x => [x.partId, { correct: x.correct, total: x.total }])
    ));
    track('course_completed', { score: report.score });
    setPhase({ kind: 'done' });
  }, [exam.sections, results, p]);

  const restart = useCallback(() => {
    setAttempt(n => n + 1);
    setResults([]);
    setPhase({ kind: 'brief', index: 0 });
  }, []);

  /* ── o cadeado ────────────────────────────────────────────────────────
     O cartão no painel já não deixa entrar aqui sem o alfabeto fechado, mas
     a rota é pública e alguém pode chegar por link, por histórico ou por
     curiosidade. Um cadeado que só existe no botão não é um cadeado - e o
     motivo dele aqui é pedagógico: um exame do alfabeto inteiro feito na
     letra 7 pergunta sobre quinze letras que a pessoa nunca viu e devolve
     um número que não mede nada. */
  if (p.ready && !alphabetComplete(p.state, letters.map(l => l.id))) {
    const faltam = lettersLeft(p.state, letters.map(l => l.id));
    return (
      <div className="focus-col grid gap-5 py-4">
        <Card tone="sand" className="p-6 sm:p-8 grid gap-4 text-center">
          <span aria-hidden className="justify-self-center w-12 h-12 rounded-[14px] bg-[var(--card)]
                                       border border-line grid place-items-center">
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <rect x="3.6" y="7.8" width="10.8" height="7.4" rx="2" stroke="var(--locked)" strokeWidth="1.5" />
              <path d="M6.2 7.8V5.9a2.8 2.8 0 0 1 5.6 0v1.9" stroke="var(--locked)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight">
            {tx.trancadoTitulo}
          </h1>
          <p className="text-[16px] leading-relaxed text-ink-body max-w-[48ch] mx-auto">
            {tx.trancadoTexto(course.totalLetters, faltam, REGRA_DA_CONCLUSAO)}
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-1">
            <LinkButton href="/meu-hebraico">{tx.continuarDeOnde}</LinkButton>
            <LinkButton href="/mapa" variant="secondary">{tx.verMapa}</LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  /* ── o que ficou para trás nos módulos 1 a 5 (05/11/2026) ─────────────
     Quem já fez o exame alguma vez segue com ele aberto. */
  const pendencias = p.ready ? pendenciasDasLetras(p.state, course.modules) : [];
  if (pendencias.length && !(p.state.finalChallenge.attempts ?? 0) && !p.state.finalChallenge.completedAt) {
    return <PendenciasAntesDoFim titulo={txPendencias.tituloExame} pendencias={pendencias} />;
  }

  /* ── o prazo de desistência (03/11/2026) ─────────────────────────────── */
  if (abreEm && phase.kind !== 'done') {
    return <div className="focus-col grid gap-5 py-4"><AbreDepoisDoPrazo o="exame" em={abreEm} /></div>;
  }

  /* ── running a part ───────────────────────────────────────────────────── */
  if (phase.kind === 'running') {
    const section = exam.sections[phase.index]!;
    return (
      <div className="grid gap-5">
        <ExamProgress exam={exam} index={phase.index} results={results} />
        <ExercisePlayer
          key={`${attempt}-${section.part.id}`}
          exercises={section.exercises}
          title={tx.parteTitulo(phase.index + 1, section.part.titlePt)}
          onDone={r => finishPart(r, phase.index)}
        />
      </div>
    );
  }

  /* ── the screen between parts ─────────────────────────────────────────── */
  if (phase.kind === 'brief') {
    const section = exam.sections[phase.index]!;
    return (
      <div className="focus-col grid gap-5">
        <ExamProgress exam={exam} index={phase.index} results={results} />
        <Card className="p-6 sm:p-8 grid gap-4">
          <Badge tone="accent">{tx.parteDe(phase.index + 1, exam.sections.length)}</Badge>
          {retomado && results.length > 0 && (
            <p className="font-ui text-[13.5px] leading-relaxed text-ink-body m-0" role="status">
              {tx.retomado(results.length)}
            </p>
          )}
          <h1 className="text-[26px] sm:text-[32px] font-bold leading-tight">
            {section.part.titlePt}
          </h1>
          <p className="text-[16px] leading-relaxed text-ink-body max-w-[52ch]">
            {section.part.descPt}
          </p>
          <p className="font-ui text-[13.5px] text-ink-muted">
            {tx.questoesSemTempo(section.exercises.length)}
          </p>
          <Button size="lg" full onClick={() => setPhase({ kind: 'running', index: phase.index })}>
            {results.length === 0 ? tx.comecar : tx.continuar}
          </Button>
        </Card>
      </div>
    );
  }

  /* ── the report ───────────────────────────────────────────────────────── */
  if (phase.kind === 'done') {
    const report = examReport(results);
    const pct = Math.round(report.score * 100);
    return (
      <div className="focus-col grid gap-5">
        <Milestone
          kicker={tx.kicker(report.correct, report.total, pct)}
          title={report.bandPt.titlePt}
          body={report.bandPt.bodyPt}
        />

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-[color:var(--line-soft)]">
            <h2 className="font-display text-[16px] font-bold text-ink">{tx.partePorParte}</h2>
          </div>
          <ul className="divide-y divide-[color:var(--line-soft)]">
            {results.map(r => {
              const part = exam.sections.find(s => s.part.id === r.partId)!.part;
              const s = r.total ? r.correct / r.total : 0;
              const weak = s < EXAM_PASS;
              return (
                <li key={r.partId} className="px-5 py-3.5 grid gap-2">
                  <div className="flex items-baseline gap-3">
                    <span className="font-ui text-[14.5px] font-medium text-ink flex-1 min-w-0">
                      {part.titlePt}
                    </span>
                    <span className="font-ui text-[13.5px] tabular-nums text-ink-muted shrink-0">
                      {r.correct}/{r.total}
                    </span>
                  </div>
                  <span className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${weak ? 'bg-[var(--amber)]' : 'bg-[var(--green)]'}`}
                      style={{ width: `${Math.round(s * 100)}%` }}
                    />
                  </span>
                  {weak && (
                    <Link
                      href="/academia"
                      className="inline-flex items-center min-h-[44px] font-ui text-[13px]
                                 text-[var(--accent)] hover:underline"
                    >
                      {tx.treinarNaAcademia(part.titlePt.toLowerCase())}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {report.passed ? (
          <Card tone="mint" className="p-6 grid gap-3">
            <Badge tone="mint">{tx.aprovado}</Badge>
            <h2 className="font-display text-[20px] font-bold leading-snug">
              {tx.certificadoPronto}
            </h2>
            <p className="text-[15px] leading-relaxed text-ink-body">
              {tx.certificadoTexto}
            </p>
            <GravacaoDoProfessor id="final-exam-congrats" />
            <div className="flex flex-wrap gap-3 pt-1">
              <LinkButton href="/certificado" size="lg">{tx.verCertificado}</LinkButton>
              <LinkButton href="/concluido" variant="secondary">{tx.oQueConquistou}</LinkButton>
            </div>
          </Card>
        ) : (
          <Card className="p-6 grid gap-3">
            <p className="text-[15px] leading-relaxed text-ink-body">
              {tx.faltaram(Math.round(EXAM_PASS * 100), Math.max(1, Math.ceil(report.total * EXAM_PASS) - report.correct))}
            </p>
            <Button onClick={restart} className="justify-self-start">{tx.refazer}</Button>
          </Card>
        )}

        {report.passed && (
          <Button variant="ghost" onClick={restart} className="justify-self-center">
            {tx.refazerMesmoAssim}
          </Button>
        )}
      </div>
    );
  }

  /* ── the door ─────────────────────────────────────────────────────────── */
  const enough = ready.length >= course.totalLetters;
  /* O que cai é o que este exame vai cobrar de fato (as partes montadas). */
  const parts = exam.sections.map(sec => ({ ...sec.part, count: sec.exercises.length }));
  const best = p.state.finalChallenge.best;

  return (
    <div className="focus-col grid gap-6">
      <header className="grid gap-3">
        <Badge tone="accent">{tx.exameFinal}</Badge>
        <h1 className="text-[28px] sm:text-[36px] font-bold leading-tight">
          {tx.portaTitulo}
        </h1>
        <p className="text-[16px] leading-relaxed text-ink-body max-w-[52ch]">
          {tx.portaTexto(parts.reduce((n, x) => n + x.count, 0), parts.length)}
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-[color:var(--line-soft)]">
          <h2 className="font-display text-[16px] font-bold text-ink">{tx.oQueCai}</h2>
        </div>
        <ol className="divide-y divide-[color:var(--line-soft)]">
          {parts.map((part, i) => (
            <li key={part.id} className="px-5 py-3 flex gap-3">
              <span aria-hidden className="font-ui text-[13px] tabular-nums text-ink-muted w-5 shrink-0">
                {i + 1}
              </span>
              <span className="grid gap-0.5 min-w-0">
                <span className="font-ui text-[14.5px] font-medium text-ink">{part.titlePt}</span>
                <span className="font-ui text-[13px] leading-relaxed text-ink-muted">
                  {part.descPt}
                </span>
              </span>
              <span className="ml-auto font-ui text-[12.5px] tabular-nums text-ink-muted shrink-0">
                {part.count}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {!audio && (
        <p className="font-ui text-[13px] leading-relaxed text-ink-muted">
          {tx.semEscuta}
        </p>
      )}

      {(!fezMod6 || !fezMod7) && (
        <p className="font-ui text-[13px] leading-relaxed text-ink-muted">
          {!fezMod6 && !fezMod7
            ? tx.semMod6e7
            : !fezMod6
              ? tx.semMod6
              : tx.semMod7}
          {tx.ateLa}
        </p>
      )}

      <Card className="p-6 grid gap-4">
        <ProgressBar
          value={course.totalLetters ? ready.length / course.totalLetters : 0}
          label={tx.licoesConcluidas}
          sublabel={`${ready.length} / ${course.totalLetters}`}
        />
        <div className="flex flex-wrap gap-2">
          {letters.map(l => (
            <span key={l.id} className={isLessonMastered(p.state, l.id) ? '' : 'opacity-30'}>
              <He size="word">{l.letter}</He>
            </span>
          ))}
        </div>
        {best != null && (
          <p className="font-ui text-[13px] text-ink-muted">
            {tx.melhorResultado(Math.round(best * 100))}
            {p.state.finalChallenge.passedAt ? tx.aprovadoCurto : ''}
            {p.state.finalChallenge.attempts
              ? tx.tentativas(p.state.finalChallenge.attempts)
              : ''}
          </p>
        )}
      </Card>

      {enough ? (
        <>
          <Button size="lg" full onClick={() => setPhase({ kind: 'brief', index: 0 })}>
            {tx.comecarExame}
          </Button>
          <p className="font-ui text-[13px] text-ink-muted text-center">
            {tx.aprovacao(Math.round(EXAM_PASS * 100))}
          </p>
          {p.state.finalChallenge.passedAt && (
            <LinkButton href="/certificado" variant="secondary" className="justify-self-center">
              {tx.verMeuCertificado}
            </LinkButton>
          )}
        </>
      ) : (
        <Card tone="amber" className="p-5 grid gap-3">
          <p className="text-[15px] leading-relaxed text-ink-body">
            {tx.faltamLetras(course.totalLetters - ready.length)}
          </p>
          <LinkButton href="/mapa" variant="secondary" className="justify-self-start">
            {tx.voltarMapa}
          </LinkButton>
        </Card>
      )}
    </div>
  );
}

/* A bar that shows the PARTS, not the questions: in a six-part exam "12 de 30"
   tells the learner much less than "part 3 of 6, two behind you". */
function ExamProgress({
  exam, index, results
}: { exam: Exam; index: number; results: PartResult[] }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={tx.partesDoExame}>
      {exam.sections.map((s, i) => {
        const done = results.some(r => r.partId === s.part.id);
        const now = i === index;
        return (
          <li key={s.part.id} className="flex-1 grid gap-1.5">
            <span
              className={`block h-1.5 rounded-full ${
                done ? 'bg-[var(--green)]' : now ? 'bg-[var(--accent)]' : 'bg-surface-2'}`}
            />
            {/* No telefone só a parte ATUAL diz o nome. Com sete partes numa
                linha de 390px cada rótulo fica com uns 50px, e "As letras
                difíceis" vira "As le..." sete vezes - sete etiquetas
                ilegíveis informam menos do que uma legível. As barras
                continuam mostrando onde a pessoa está. */}
            <span className={`font-ui text-[10.5px] sm:text-[11.5px] leading-none truncate
              ${now ? 'text-ink font-semibold' : 'text-ink-muted hidden sm:block'}`}>
              {s.part.titlePt}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

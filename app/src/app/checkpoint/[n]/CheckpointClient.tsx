'use client';

/* A checkpoint closes a module. It is the workbook's own review section, not
 * an invented milestone: the units of the teaching plan hold three to six
 * letters each, and the review lands where the plan puts it.
 *
 * Passing is 70%. Failing is not a failure - it is a suggestion to revisit one
 * or two letters, named specifically, and the retry is unlimited. */

import { tx as txFale } from '@/i18n/telas/fale-comigo';
import { tx } from '@/i18n/telas/licao-checkpoint-client';
import { tx as txRevisao } from '@/i18n/telas/revisao-entre-modulos';
import { ordemDeEnsino, portasDosModulos } from '@/lib/sons';
import { SugestaoDePar } from '@/components/learn/SugestaoDePar';
import { CompartilharConquista } from '@/components/learn/CompartilharConquista';
import { conquistaDoModulo } from '@/lib/compartilhar';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ContadorDeLeitura } from '@/components/learn/ContadorDeLeitura';
import { useRouter } from 'next/navigation';
import { He, HeSeq } from '@/components/hebrew/He';
import { Card, Badge } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { primeiraLeituraId } from '@/lib/laboratorio';
import { Milestone, ProgressBar } from '@/components/game/Game';
import { YaelDiz } from '@/components/aventura/Yael';
import { tx as falaDaYael } from '@/i18n/telas/aventura-yael';
import { ExercisePlayer, type PlayerResult } from '@/components/learn/ExercisePlayer';
import { audioAvailable } from '@/components/learn/AudioButton';
import { Prose } from '@/components/learn/Blocks';
import { useProgress } from '@/lib/state/store';
import { allLetters, course, type CourseModule, type Letter } from '@/lib/content';
import { buildCheckpoint } from '@/lib/engine/exercises';
import { buildSemPontos, MODULOS_COM_RAMPA } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { escolherRodada, registrarRodada } from '@/lib/rodadas';
import { isLessonComplete, isLessonMastered, PASS_MARK, REGRA_DO_DOMINIO_CURTA, revisaoAbreEm } from '@/lib/state/rules';
import { track } from '@/lib/analytics';

export function CheckpointClient({ module: mod, letters }: { module: CourseModule; letters: Letter[] }) {
  const p = useProgress();
  const router = useRouter();
  const [phase, setPhase] = useState<'intro' | 'running' | 'result'>('intro');
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<PlayerResult | null>(null);
  /* As palavras sem pontos do fim (módulos 3 a 5): quantas acertou. Fora da
     nota do checkpoint, que continua sendo sobre as letras do módulo. */
  const [rampa, setRampa] = useState<{ certas: number; total: number } | null>(null);

  const history = useMemo(() => allLetters().filter(l => l.order <= (mod.upTo ?? 0)), [mod.upTo]);
  const comRampa = MODULOS_COM_RAMPA.includes(mod.n);
  /* Refazer o checkpoint é outra rodada, com o que já apareceu no fim da
     fila (lib/rodadas.ts). */
  const exercises = useMemo(
    () => escolherRodada(`checkpoint-${mod.n}`, seed => [
      ...buildCheckpoint(letters, history, { audioAvailable: audioAvailable(), count: 12, seed }),
      ...(comRampa ? buildSemPontos(history, rng(`${seed}-sem-pontos`)) : [])
    ]).itens,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [letters, history, mod.n, run, comRampa]
  );

  const readyLetters = letters.filter(l => isLessonComplete(p.state, l.id));

  /* A revisão que abre o módulo seguinte (03/11/2026) só abre no dia
     seguinte ao último dia em que uma lição deste módulo foi concluída. Só
     vale para os checkpoints que são porta (lib/sons.ts, portasDosModulos);
     e só depois de o progresso carregar, para não piscar trancado. */
  const porta = useMemo(() => {
    const ordem = ordemDeEnsino(allLetters(), course.modules);
    return [...portasDosModulos(ordem, course.modules).values()].find(x => x.checkpoint === mod.checkpoint?.id) ?? null;
  }, [mod.checkpoint?.id]);
  const abreAmanha = p.ready && porta ? revisaoAbreEm(p.state, porta) !== null : false;
  const record = mod.checkpoint ? p.state.checkpoints[mod.checkpoint.id] : undefined;
  const nextModule = course.modules.find(m => m.n === mod.n + 1 && m.letterIds.length);

  if (phase === 'result' && result) {
    const pct = Math.round(result.score * 100);
    const passed = result.score >= PASS_MARK;
    /* `missed` holds exercise ids; the letter is their first segment. */
    const weak = [...new Set(result.missed.map(id => id.split('-')[0] ?? ''))]
      .map(id => letters.find(l => l.id === id))
      .filter((l): l is Letter => !!l);

    return (
      <div className="focus-col grid gap-5">
        {/* A Yael comemora o fim do módulo (28/10/2026); sem a aprovação,
            inclina a cabeça, a cara de "vamos de novo". Decorativa. */}
        <YaelDiz humor={passed ? 'comemora' : 'quase'} tamanho={84} className="justify-self-center -mb-2">
          {passed ? falaDaYael.moduloFechado(mod.n) : falaDaYael.checkpointQuase}
        </YaelDiz>
        <Milestone yael={false}
          kicker={tx.kicker(mod.n, result.correct, result.total)}
          title={passed ? tx.concluido(pct) : tx.quaseLa(pct)}
          body={passed
            ? tx.conhece(history.length)
            : tx.faltouPouco}
        >
          <Button variant={passed ? 'secondary' : 'primary'} onClick={() => { setRun(n => n + 1); setResult(null); setPhase('running'); }}>
            {tx.refazer}
          </Button>
          {passed && (
            <Button onClick={() => router.push(`/modulo/${mod.n}/missao`)}>
              {tx.missaoDoModulo}
            </Button>
          )}
          {passed && nextModule && (
            <Button variant="secondary" onClick={() => router.push(`/modulo/${nextModule.n}`)}>
              {tx.proximoModulo(nextModule.n, nextModule.titlePt)}
            </Button>
          )}
          {passed && !nextModule && (
            <Button onClick={() => router.push('/desafio-final')}>{tx.desafioFinal}</Button>
          )}
          {passed && <CompartilharConquista id={conquistaDoModulo(mod.n)} />}
        </Milestone>

        {passed && (
          <Card tone="mint" className="p-5">
            <p className="text-[16px] leading-relaxed text-ink"><Prose text={mod.milestonePt} /></p>
          </Card>
        )}
        {/* Minha Primeira Leitura (11/10/2026): o módulo fechou, e a prova de
            que isso virou leitura é ler, sozinho, palavras escritas só com
            estas letras. */}
        {passed && mod.kind === 'letters' && (
          <Card tone="wash" className="p-5 grid gap-3 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="grid gap-1 min-w-0">
              <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted m-0">{tx.primeiraLeitura}</p>
              <p className="text-[15px] leading-relaxed text-ink-body m-0">
                {p.state.firsts?.[primeiraLeituraId(mod.n)]
                  ? tx.jaFez
                  : tx.algumasPalavras}
              </p>
            </div>
            <LinkButton href={`/leitura?primeira=${mod.n}`} className="shrink-0">{tx.lerAgora}</LinkButton>
          </Card>
        )}
        {rampa && (
          <Card tone="wash" className="p-5 grid gap-1.5">
            <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted m-0">{tx.semPontinhos}</p>
            <p className="text-[15px] leading-relaxed text-ink-body m-0">
              {tx.rampa(rampa.certas, rampa.total)}
            </p>
          </Card>
        )}

        {/* O fim de um módulo é o melhor momento para o número: "conheço seis
            letras" vira "leio N palavras". */}
        {passed && <ContadorDeLeitura />}
        {/* Fale comigo no fim do módulo (06/11/2026, pedido do dono). */}
        {passed && (
          <Link href={`/fale-comigo?modulo=${mod.n}`}
                className="justify-self-start inline-flex items-center min-h-[44px] font-ui text-[14.5px] font-semibold text-[var(--teal-ink)] hover:underline">
            {txFale.chamadaModulo} →
          </Link>
        )}
        <SugestaoDePar />

        {weak.length > 0 && (
          <Card className="p-5 grid gap-3">
            <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted">
              {tx.valeVoltar}
            </p>
            <ul className="grid gap-2">
              {weak.map(l => (
                <li key={l.id}>
                  <Link href={`/licao/${l.id}`}
                        className="flex items-center gap-4 rounded-[var(--r-md)] p-3 hover:bg-surface-2">
                    <He size="lg">{l.letter}</He>
                    <span className="font-ui text-[15px] text-ink">{l.namePt}</span>
                    <span aria-hidden className="ml-auto text-ink-muted">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  if (phase === 'running') {
    return (
      <ExercisePlayer
        key={run}
        exercises={exercises}
        title={tx.titulo(mod.n)}
        onDone={r => {
          registrarRodada(`checkpoint-${mod.n}`, exercises);
          /* A nota é só dos itens do checkpoint; a rampa sem pontos é
             prática e é contada à parte. */
          const daRampa = (id: string) => id.startsWith('sempontos-');
          const totalRampa = exercises.filter(e => daRampa(e.id)).length;
          const errosRampa = r.missed.filter(daRampa).length;
          const total = r.total - totalRampa;
          const missed = r.missed.filter(id => !daRampa(id));
          const correct = total - missed.length;
          const nucleo = { correct, total, score: total ? correct / total : 0, missed };
          setRampa(totalRampa ? { certas: totalRampa - errosRampa, total: totalRampa } : null);
          setResult(nucleo);
          if (mod.checkpoint) p.finishCheckpoint(mod.checkpoint.id, nucleo.score);
          setPhase('result');
        }}
      />
    );
  }

  return (
    <div className="focus-col grid gap-6">
      <header className="grid gap-3">
        <Link href="/mapa" className="inline-flex items-center min-h-[44px] pr-3 font-ui text-[13px] text-ink-muted hover:text-ink-body">{tx.mapa}</Link>
        <Badge tone="mint">{tx.titulo(mod.n)}</Badge>
        <h1 className="text-[27px] sm:text-[33px] font-bold leading-tight">{mod.titlePt}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body max-w-[52ch]">
          <Prose text={mod.introPt} />
        </p>
      </header>

      <Card className="p-6 grid gap-4">
        {/* "Concluída" e "dominada" são palavras diferentes (UXQA-005): o
            título não afirma domínio sobre uma letra concluída a 50%. */}
        <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted">{tx.letrasDoModulo}</p>
        <ul className="grid gap-2">
          {letters.map(l => {
            const done = isLessonComplete(p.state, l.id);
            const dominada = isLessonMastered(p.state, l.id);
            return (
              <li key={l.id} className="flex items-center gap-3">
                <span aria-hidden className={dominada ? 'text-[var(--green)]' : 'text-ink-muted'}>
                  {dominada ? '✓' : done ? '◐' : '○'}
                </span>
                <He size="word" dim={!done}>{l.letter}</He>
                <span className={`font-ui text-[14px] ${done ? 'text-ink' : 'text-ink-muted'}`}>
                  {l.namePt}
                  <span className="text-ink-muted">
                    {dominada ? tx.concluida : done ? tx.faltaNota : ''}
                  </span>
                </span>
                {!dominada && (
                  <Link href={`/licao/${l.id}`}
                        className="ml-auto inline-flex items-center min-h-[44px] pl-3 font-ui text-[13px]
                                   text-[var(--accent)] hover:underline">
                    {done ? tx.refazerExercicios(REGRA_DO_DOMINIO_CURTA) : tx.fazerLicao}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <ProgressBar
          value={letters.length ? readyLetters.length / letters.length : 0}
          label={tx.licoesConcluidas}
          sublabel={`${readyLetters.length} / ${letters.length}`}
        />
      </Card>

      <Card tone="wash" className="p-6 grid gap-3">
        <p className="font-ui text-[13px] uppercase tracking-[.07em] text-[var(--accent)]">
          {tx.oQueVem}
        </p>
        <p className="text-[15px] leading-relaxed text-ink-body">
          {tx.questoes}
          {comRampa && tx.comRampa}
        </p>
        <div className="pt-1">
          <HeSeq items={letters.map(l => l.letter)} size="word" />
        </div>
      </Card>

      {record?.best != null && (
        <p className="font-ui text-[13.5px] text-ink-muted">
          {tx.melhor(Math.round(record.best * 100), record.attempts)}
        </p>
      )}


      {abreAmanha ? (
        <Card tone="amber" className="p-5 grid gap-2">
          <p className="font-ui text-[15px] font-semibold text-ink">{txRevisao.amanhaTitulo}</p>
          <p className="text-[15px] leading-relaxed text-ink-body">{txRevisao.amanhaTexto}</p>
          <LinkButton href="/academia" className="justify-self-start mt-1">{txRevisao.praticarHoje}</LinkButton>
        </Card>
      ) : readyLetters.length < letters.length ? (
        <Card tone="amber" className="p-5 grid gap-3">
          <p className="text-[15px] leading-relaxed text-ink-body">
            {tx.faltam(letters.length - readyLetters.length, letters.length)}
          </p>
          <Button variant="secondary" className="justify-self-start"
                  onClick={() => { track('checkpoint_started', { checkpointId: mod.checkpoint?.id }); setPhase('running'); }}>
            {tx.mesmoAssim}
          </Button>
        </Card>
      ) : (
        <Button size="lg" full
                onClick={() => { track('checkpoint_started', { checkpointId: mod.checkpoint?.id }); setPhase('running'); }}>
          {tx.comecar}
        </Button>
      )}

      <LinkButton href="/mapa" variant="ghost" size="sm" className="justify-self-center">
        {tx.voltarMapa}
      </LinkButton>
    </div>
  );
}

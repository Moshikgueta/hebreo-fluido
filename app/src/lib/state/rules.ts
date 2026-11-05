/* The learning-state rules: XP, streak, progress, achievements.
 *
 * Every function here is pure - state in, state out, with the day passed as an
 * argument rather than read from the clock. That is what makes the streak
 * testable without mocking time, and it is the reason these rules live apart
 * from the React store. */

import type {
  Achievement, CheckpointProgress, Confusion, DayRecord, GymRecord, LearnerState,
  LessonProgress, LetterSkills, Skill, SkillStat, SrsItem
} from './types';
import { SKILLS } from './types';
import { folgasLivres, usarFolgas } from '@/lib/loja';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/motor-rules';
import { MEU_NOME_EM_HEBRAICO } from '@/lib/recursos';

export const today = (d: Date = new Date()): string => {
  /* Local date, not UTC: a learner practising at 22h in São Paulo must get
     credit for that day, not the next one. */
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (isoDay: string, n: number): string => {
  const [y, m, d] = isoDay.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d + n);
  return today(dt);
};

export const daysBetween = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86_400_000);
};

/* ── XP ─────────────────────────────────────────────────────────────────
   XP represents learning, so every award is tied to an answered question or a
   completed stage. Navigation pays nothing, and re-running a lesson does not
   re-pay its one-time bonuses. */

export const XP = {
  stage: 5,
  lesson: 20,
  perfectQuiz: 10,
  checkpoint: 50,
  review: 15,
  dailyGoal: 5,
  /** Cada acerto praticando letras (lição, revisão, academia, traçado). */
  acerto: 2
} as const;

/**
 * Teto do XP de acertos num dia (pedido do dono em 01/10/2026: mais XP por
 * praticar as letras). 50 acertos por dia pagam; dali em diante a prática
 * continua contando para a meta e para a revisão, mas não paga mais XP.
 * Sem teto, repetir o exercício mais fácil viraria o jeito de comprar as
 * leituras bônus da loja.
 */
export const XP_ACERTOS_POR_DIA = 100;

/** Paga o XP de um acerto, respeitando o teto do dia. */
export function pagarAcerto(state: LearnerState, day: string): LearnerState {
  const prev: DayRecord = state.days[day] ?? emptyDay();
  const ja = prev.xpAcertos ?? 0;
  const valor = Math.min(XP.acerto, XP_ACERTOS_POR_DIA - ja);
  if (valor <= 0) return state;
  const next = awardXp(state, day, valor);
  const dia = next.days[day]!;
  return { ...next, days: { ...next.days, [day]: { ...dia, xpAcertos: ja + valor } } };
}

/** Practice units in a daily goal. One unit is about twenty seconds. */
export const goalTarget = (minutes: number): number => Math.max(3, Math.round(minutes * 3));

/** What one answered question is worth. */
export const ANSWER_UNITS = 1;

/**
 * What finishing one stage of a lesson is worth - about two minutes of
 * reading, listening, tracing or writing. Without this the daily goal could
 * only be met by answering questions, which is the smaller half of the course.
 */
export const STAGE_UNITS = 6;

/**
 * A lesson of module 6 or 7 is bigger than a letter stage - the dagesh lesson
 * covers three letter pairs with their word lists, the finals lesson covers all
 * five forms - so it is worth more. A single constant for "a stage" was the
 * simplification; these two modules are where it stopped being true.
 */
export const EXTRA_STAGE_UNITS = 10;

/* ── streak ─────────────────────────────────────────────────────────────
   A day counts when the learner meets the goal they chose. Breaking it costs
   nothing but the counter: no XP is removed, and the longest run is kept, so
   coming back is never a fresh start. */

export const emptyDay = (): DayRecord => ({ answered: 0, units: 0, xp: 0, goalMet: false });

export function applyPractice(
  state: LearnerState, day: string, practice: { answered?: number; units: number }
): LearnerState {
  const goal = state.onboarding?.goalMinutes ?? 10;
  const target = goalTarget(goal);
  const prev: DayRecord = state.days[day] ?? emptyDay();
  const next: DayRecord = {
    ...prev,
    answered: prev.answered + (practice.answered ?? 0),
    units: prev.units + practice.units
  };

  let xp = state.xp;
  let streak = state.streak;

  if (!prev.goalMet && next.units >= target) {
    next.goalMet = true;
    next.xp = prev.xp + XP.dailyGoal;
    xp += XP.dailyGoal;

    const last = streak.lastDay;
    const gap = last == null ? 0 : daysBetween(last, day);
    let current = last == null ? 1 : gap === 1 ? streak.current + 1 : 1;

    /* As folgas (27/09/2026, lib/loja.ts): se a lacuna foi de um ou dois
       dias e há folga para cada dia perdido, elas são gastas agora e a
       sequência continua como se não tivesse parado. Tudo ou nada. */
    if (last != null && gap > 1 && streak.current > 0) {
      const perdidos = Array.from({ length: gap - 1 }, (_, i) => addDays(last, i + 1));
      const coberto = usarFolgas({ ...state, xp }, perdidos);
      if (coberto) {
        current = streak.current + 1;
        streak = { current, longest: Math.max(streak.longest, current), lastDay: day };
        return { ...coberto, xp, days: { ...state.days, [day]: next }, streak };
      }
    }
    streak = { current, longest: Math.max(streak.longest, current), lastDay: day };
  }

  return { ...state, xp, days: { ...state.days, [day]: next }, streak };
}

/** The streak as it should be DISPLAYED, which is not always what is stored:
 *  a run that ended yesterday is still alive until today ends. */
export function displayStreak(state: LearnerState, day: string): number {
  const { current, lastDay } = state.streak;
  if (!lastDay || current === 0) return 0;
  const gap = daysBetween(lastDay, day);
  if (gap <= 1) return current;
  /* Com folga bastante para os dias perdidos, a sequência continua viva:
     ela será gasta quando a meta de hoje for cumprida. */
  return gap - 1 <= folgasLivres(state).length ? current : 0;
}

export function awardXp(state: LearnerState, day: string, amount: number): LearnerState {
  const prev: DayRecord = state.days[day] ?? emptyDay();
  return {
    ...state,
    xp: state.xp + amount,
    days: { ...state.days, [day]: { ...prev, xp: prev.xp + amount } }
  };
}

/* ── lessons ────────────────────────────────────────────────────────────── */

export const emptyLesson = (letterId: string): LessonProgress => ({
  letterId, stagesDone: [], quizBest: null, quizAttempts: 0,
  perfectBonusPaid: false, completedAt: null
});

export const STAGE_COUNT = 5;

export function completeStage(
  state: LearnerState, letterId: string, stage: number, day: string,
  units: number = STAGE_UNITS
): LearnerState {
  const prev = state.lessons[letterId] ?? emptyLesson(letterId);
  if (prev.stagesDone.includes(stage)) return state;

  const stagesDone = [...prev.stagesDone, stage].sort((a, b) => a - b);
  /* Modules 6 and 7 have three lessons, not five stages; whichever total the
     caller is working to, the lesson bonus is paid when it is reached. */
  const total = units === STAGE_UNITS ? STAGE_COUNT : EXTRA_STAGE_COUNT;
  const justFinished = stagesDone.length === total && !prev.completedAt;
  const lesson: LessonProgress = {
    ...prev, stagesDone,
    completedAt: justFinished ? new Date().toISOString() : prev.completedAt
  };

  let next: LearnerState = { ...state, lessons: { ...state.lessons, [letterId]: lesson } };
  next = awardXp(next, day, XP.stage + (justFinished ? XP.lesson : 0));
  /* A finished stage is practice, and the daily goal has to see it. */
  next = applyPractice(next, day, { units });
  return next;
}

export function recordQuiz(
  state: LearnerState, letterId: string, score: number, day: string
): LearnerState {
  const prev = state.lessons[letterId] ?? emptyLesson(letterId);
  const perfect = score >= 1;
  const payBonus = perfect && !prev.perfectBonusPaid;

  const lesson: LessonProgress = {
    ...prev,
    quizBest: prev.quizBest == null ? score : Math.max(prev.quizBest, score),
    quizAttempts: prev.quizAttempts + 1,
    perfectBonusPaid: prev.perfectBonusPaid || perfect
  };

  let next: LearnerState = { ...state, lessons: { ...state.lessons, [letterId]: lesson } };
  if (payBonus) next = awardXp(next, day, XP.perfectQuiz);

  /* Passou raspando? A letra entra na fila de revisão, hoje.
     ──────────────────────────────────────────────────────────────────────
     Registrada como uma RESPOSTA ERRADA num item sintético, de propósito: é a
     mesma máquina do resto (`recordAnswer` põe na caixa 0, com vencimento
     amanhã), então a letra aparece na "Revisão personalizada" e no aquecimento
     sem nenhum conceito novo. Sem isto, quem termina a lição com 3 de 8 sai
     dela com o mesmo estado de quem fez 8 de 8, e a revisão nunca fica sabendo.

     Só no primeiro fracasso: quem refaz e melhora não é castigado duas vezes,
     e a marca some sozinha quando a letra for respondida certo. */
  if (score < MASTERY_MARK && (prev.quizBest ?? 0) < MASTERY_MARK) {
    next = recordAnswer(next, `fixacao-${letterId}`, letterId, false, day);
  }
  return next;
}

/**
 * CONCLUÍDA e DOMINADA são coisas diferentes, e a diferença é o ponto.
 * ─────────────────────────────────────────────────────────────────────────
 * Até 21/09/2026 só existia a primeira: a etapa 5 era marcada com QUALQUER
 * nota, e como tudo o mais lia `stagesDone`, dava para zerar os vinte e dois
 * quizzes e terminar com 100% de progresso, a conquista "22 letras" e o exame
 * final destravado. O sistema construía a falsa confiança sozinho.
 *
 * O conserto não é trancar a lição. Trancar frustra, e este curso não é um
 * portão - quem quer seguir adiante e voltar depois tem esse direito. O que
 * muda é o que CONTA:
 *
 *   · concluir  - as cinco etapas, sem nota. Libera a próxima letra.
 *   · dominar   - as cinco etapas E 75% na fixação (8 de 10), em QUALQUER tentativa.
 *                 É isto que alimenta a barra, as conquistas e o exame final.
 *
 * "Qualquer tentativa" importa: refazer gera outras perguntas (outra semente),
 * então melhorar é aprender, não decorar o gabarito.
 */
export const MASTERY_MARK = 0.75;

/** Quantas perguntas a fixação tem (buildMiniTest). Um número, num lugar só:
 *  toda frase que diz "N de M" sai daqui (auditoria de 01/10/2026, UXQA-005). */
export const FIXACAO_ITENS = 20;

/** Quantos acertos de `FIXACAO_ITENS` uma nota pede: 75% de 10 são 8. */
export const acertosPara = (marca: number, total: number = FIXACAO_ITENS): number =>
  Math.ceil(marca * total - 1e-9);

/** "8 de 10", derivado das constantes. */
export const REGRA_DO_DOMINIO_CURTA = fmt(tx.regraCurta, { certos: acertosPara(MASTERY_MARK), total: FIXACAO_ITENS });

/** A regra inteira, para a tela dizer o que "dominar" quer dizer. */
export const REGRA_DO_DOMINIO =
  fmt(tx.regraDominio, { etapas: STAGE_COUNT, regra: REGRA_DO_DOMINIO_CURTA });

/**
 * A mesma regra, dita como o que ela é desde 12/10/2026: uma lição
 * CONCLUÍDA. "Dominar" passou a ser outra medida, mais exigente, a do
 * domínio por habilidade ao longo dos dias (lib/dominio.ts). As duas nunca
 * aparecem com o mesmo nome: "lições concluídas" é esta; "letras dominadas"
 * é a de lib/dominio.ts.
 */
export const REGRA_DA_CONCLUSAO =
  fmt(tx.regraConclusao, { etapas: STAGE_COUNT, regra: REGRA_DO_DOMINIO_CURTA });

export const isLessonComplete = (state: LearnerState, letterId: string): boolean =>
  (state.lessons[letterId]?.stagesDone.length ?? 0) >= STAGE_COUNT;

export function isLessonMastered(state: LearnerState, letterId: string): boolean {
  const l = state.lessons[letterId];
  if (!l) return false;
  return l.stagesDone.length >= STAGE_COUNT && (l.quizBest ?? 0) >= MASTERY_MARK;
}

/* As lições de som (Vet, Chaf, Fe, Tch, Dj, J) gravam em `lessons` com o
   prefixo `som-`, com as mesmas cinco etapas e a mesma fixação de uma letra -
   é o que deixa a trava de progressão tratá-las igual. Mas não são letras:
   "22 letras dominadas" continua contando só as 22. */
export const SOM_PREFIXO = 'som-';
export const ehLicaoDeSom = (id: string) => id.startsWith(SOM_PREFIXO);

export const lettersMastered = (state: LearnerState): number =>
  Object.keys(state.lessons).filter(id => !ehLicaoDeSom(id) && isLessonMastered(state, id)).length;

/** As letras concluídas que ainda não chegaram ao domínio na fixação: o que
 *  falta a quem "já fez tudo" e mesmo assim não vê a leitura bônus abrir. */
export const concluidasSemDominio = (state: LearnerState): number =>
  Object.keys(state.lessons)
    .filter(id => !ehLicaoDeSom(id) && isLessonComplete(state, id) && !isLessonMastered(state, id)).length;

/**
 * O alfabeto inteiro fechado - a condição do teste final.
 *
 * Conta as letras REAIS, e não `lessons`: os módulos 6 e 7 também gravam
 * progresso em `lessons` com ids próprios, e contar as chaves daria o
 * alfabeto por concluído duas letras antes do fim.
 *
 * E exige DOMÍNIO, não conclusão: um exame final liberado para quem errou a
 * maior parte de todas as fixações mede a paciência de clicar, não a leitura.
 */
export function alphabetComplete(state: LearnerState, letterIds: readonly string[]): boolean {
  return letterIds.length > 0 && letterIds.every(id => isLessonMastered(state, id));
}

/** Quantas faltam, para a frase do cadeado dizer um número em vez de "algumas".
 *  Conta pela mesma régua que destrava o exame (`alphabetComplete`): um cadeado
 *  que diz "falta 1" e não abre quando essa 1 é concluída sem nota é pior do
 *  que um cadeado sem número. */
export const lettersLeft = (state: LearnerState, letterIds: readonly string[]): number =>
  letterIds.filter(id => !isLessonMastered(state, id)).length;

/* ── checkpoints ────────────────────────────────────────────────────────── */

export const PASS_MARK = 0.7;

export function recordCheckpoint(
  state: LearnerState, id: string, score: number, day: string
): LearnerState {
  const prev: CheckpointProgress = state.checkpoints[id] ?? { id, best: null, attempts: 0, passedAt: null };
  const passing = score >= PASS_MARK;
  const firstPass = passing && !prev.passedAt;

  const cp: CheckpointProgress = {
    id,
    best: prev.best == null ? score : Math.max(prev.best, score),
    attempts: prev.attempts + 1,
    passedAt: firstPass ? new Date().toISOString() : prev.passedAt
  };

  let next: LearnerState = { ...state, checkpoints: { ...state.checkpoints, [id]: cp } };
  if (firstPass) next = awardXp(next, day, XP.checkpoint);
  return next;
}

/* ── mastery, per skill ─────────────────────────────────────────────────
   Five coarse states, and no percentage anywhere. "Forte" means four clean
   answers in a row on that skill, which is a claim the data supports; "93,4%
   de domínio" is a claim nothing supports, and a learner who is told it and
   then fails the next question stops believing the whole screen.

   `revisar` is deliberately reachable FROM `forte`: a letter that was strong
   and has just been missed is the most valuable thing the review can offer, and
   a model that cannot express "was strong, slipped" cannot ask for it. */
export type MasteryLevel = 'novo' | 'aprendendo' | 'praticando' | 'forte' | 'revisar';

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  novo: tx.nivelNovo,
  aprendendo: tx.nivelAprendendo,
  praticando: tx.nivelPraticando,
  forte: tx.nivelForte,
  revisar: tx.nivelRevisar
};

export const emptySkill = (): SkillStat => ({ hits: 0, misses: 0, streak: 0, lastOn: null });

export function skillLevel(stat: SkillStat | undefined): MasteryLevel {
  if (!stat || stat.hits + stat.misses === 0) return 'novo';
  /* A miss that has not yet been answered correctly again. One slip is enough:
     the cost of offering an extra review is a few seconds, the cost of skipping
     a needed one is a letter the learner keeps getting wrong. */
  if (stat.streak === 0 && stat.misses > 0) return 'revisar';
  if (stat.streak >= 4) return 'forte';
  if (stat.streak >= 2) return 'praticando';
  return 'aprendendo';
}

/** The letter's weakest skill that has any evidence - what to practise next. */
export function weakestSkill(skills: LetterSkills | undefined): Skill | null {
  if (!skills) return null;
  const RANK: Record<MasteryLevel, number> = {
    revisar: 0, aprendendo: 1, praticando: 2, forte: 3, novo: 4
  };
  let best: { skill: Skill; rank: number } | null = null;
  for (const s of SKILLS) {
    const lvl = skillLevel(skills[s]);
    if (lvl === 'novo') continue;
    const rank = RANK[lvl];
    if (!best || rank < best.rank) best = { skill: s, rank };
  }
  return best?.skill ?? null;
}

/**
 * One level for the whole letter, for the places that can only show one thing.
 *
 * It is the WEAKEST skill with evidence, not the average. Averaging would let a
 * learner who reads ק perfectly and cannot hear it at all read as "praticando",
 * and the course would move on - which is the exact failure the per-skill model
 * exists to prevent.
 */
export function letterMastery(state: LearnerState, letterId: string): MasteryLevel {
  const skills = state.skills[letterId];
  if (!skills) return 'novo';
  const levels = SKILLS.map(s => skillLevel(skills[s])).filter(l => l !== 'novo');
  if (!levels.length) return 'novo';
  if (levels.includes('revisar')) return 'revisar';
  if (levels.includes('aprendendo')) return 'aprendendo';
  if (levels.includes('praticando')) return 'praticando';
  return 'forte';
}

export function recordSkill(
  state: LearnerState, letterId: string, skill: Skill, correct: boolean, day: string
): LearnerState {
  const letter = state.skills[letterId] ?? {};
  const prev = letter[skill] ?? emptySkill();
  const stat: SkillStat = {
    hits: prev.hits + (correct ? 1 : 0),
    misses: prev.misses + (correct ? 0 : 1),
    streak: correct ? prev.streak + 1 : 0,
    lastOn: day
  };
  /* Os dias de acerto só são contados em registros que nasceram com eles:
     um registro antigo, com respostas e sem o campo, fica sem (ver types.ts). */
  const legado = prev.diasDeAcerto === undefined && prev.hits + prev.misses > 0;
  if (!legado) {
    const novoDia = correct && prev.ultimoAcerto !== day;
    stat.diasDeAcerto = (prev.diasDeAcerto ?? 0) + (novoDia ? 1 : 0);
    stat.ultimoAcerto = correct ? day : (prev.ultimoAcerto ?? null);
  }
  return { ...state, skills: { ...state.skills, [letterId]: { ...letter, [skill]: stat } } };
}

/* ── confusions ─────────────────────────────────────────────────────────
   `confusableWith` in the content says which letters TEND to be mixed up. This
   says which ones THIS learner mixes up, which is a different and more useful
   fact - and it costs nothing to collect, because the player already knows
   which wrong option was tapped. */

export const confusionKey = (correct: string, chosen: string): string => `${correct}>${chosen}`;

export function recordConfusion(
  state: LearnerState, correct: string, chosen: string, day: string
): LearnerState {
  if (!correct || !chosen || correct === chosen) return state;
  const key = confusionKey(correct, chosen);
  const prev = state.confusions[key];
  const next: Confusion = {
    correct, chosen, n: (prev?.n ?? 0) + 1, lastOn: day
  };
  return { ...state, confusions: { ...state.confusions, [key]: next } };
}

/**
 * The pairs worth drilling, worst first.
 *
 * Both directions of a pair count as one confusion: a learner who answers ר for
 * ד and ד for ר does not have two problems, they have one, and drilling it once
 * in both directions is the fix.
 */
export function topConfusions(state: LearnerState, limit = 3): Confusion[] {
  const merged = new Map<string, Confusion>();
  for (const c of Object.values(state.confusions)) {
    const pairKey = [c.correct, c.chosen].sort().join('|');
    const prev = merged.get(pairKey);
    if (!prev) merged.set(pairKey, { ...c });
    else merged.set(pairKey, {
      ...(prev.n >= c.n ? prev : c),
      n: prev.n + c.n,
      lastOn: prev.lastOn > c.lastOn ? prev.lastOn : c.lastOn
    });
  }
  return [...merged.values()]
    .filter(c => c.n >= 2)          // one slip is noise; twice is a pattern
    .sort((a, b) => b.n - a.n || b.lastOn.localeCompare(a.lastOn))
    .slice(0, limit);
}

/** A confusion is settled once the learner answers it right twice running. */
export function clearConfusion(state: LearnerState, correct: string, chosen: string): LearnerState {
  const a = confusionKey(correct, chosen), b = confusionKey(chosen, correct);
  if (!state.confusions[a] && !state.confusions[b]) return state;
  const confusions = { ...state.confusions };
  for (const key of [a, b]) {
    const c = confusions[key];
    if (!c) continue;
    if (c.n <= 1) delete confusions[key];
    else confusions[key] = { ...c, n: c.n - 1 };
  }
  return { ...state, confusions };
}

/* ── the final exam ─────────────────────────────────────────────────────
   Unlimited attempts, no penalty, and the best score is kept - the same
   policy as every other assessment in the course. What is NOT overwritten is
   `passedAt`: the day a learner first passed is a fact about them, and a
   later worse attempt does not take it away. */
export function recordExam(
  state: LearnerState, score: number, parts: Record<string, { correct: number; total: number }>,
  day: string, passMark: number
): LearnerState {
  const prev = state.finalChallenge;
  const passing = score >= passMark;
  const firstPass = passing && !prev.passedAt;

  const next: LearnerState = {
    ...state,
    finalChallenge: {
      best: prev.best == null ? score : Math.max(prev.best, score),
      completedAt: prev.completedAt ?? new Date().toISOString(),
      passedAt: prev.passedAt ?? (passing ? new Date().toISOString() : null),
      attempts: (prev.attempts ?? 0) + 1,
      /* The sitting that just happened, not a best-of composite. */
      parts
    }
  };
  return firstPass ? awardXp(next, day, XP.checkpoint) : next;
}

/**
 * May this learner be issued a certificate?
 *
 * Two conditions, both about the learner and neither about payment: every
 * letter finished, and the exam passed. A certificate for someone who has not
 * passed is worth nothing, including to them.
 */
export function certificateReady(
  state: LearnerState, totalLetters: number
): { ready: boolean; lettersDone: number; examPassed: boolean } {
  const lettersDone = lettersMastered(state);
  const examPassed = !!state.finalChallenge.passedAt;
  return { ready: lettersDone >= totalLetters && examPassed, lettersDone, examPassed };
}

/* ── the reading gym ────────────────────────────────────────────────────
   One record per mode. The time comparison is the learner against their own
   last run and nothing else - no target, no average, no other learners. */
export function recordGym(
  state: LearnerState, modeId: string, score: number, seconds: number, day: string
): LearnerState {
  const prev = state.gym[modeId];
  const rec: GymRecord = {
    runs: (prev?.runs ?? 0) + 1,
    best: prev?.best == null ? score : Math.max(prev.best, score),
    bestSeconds: prev?.bestSeconds == null ? seconds : Math.min(prev.bestSeconds, seconds),
    /* The run before this one. Written here rather than derived on the result
       screen, which by then is looking at the run that just finished and would
       always compare it with itself. */
    previousSeconds: prev?.lastSeconds ?? null,
    lastSeconds: seconds,
    lastOn: day
  };
  return { ...state, gym: { ...state.gym, [modeId]: rec } };
}

/* ── firsts ─────────────────────────────────────────────────────────────
   A moment, not a badge: it happens once, it is dated, and the course can say
   so out loud when it does. */
export function markFirst(state: LearnerState, id: string): LearnerState {
  if (state.firsts[id]) return state;
  return { ...state, firsts: { ...state.firsts, [id]: new Date().toISOString() } };
}

export const hasFirst = (state: LearnerState, id: string): boolean => !!state.firsts[id];

/**
 * Uma resposta de autoavaliação de leitura (12/10/2026). Grava só em
 * `leituraAutoavaliada`: nada de `skills`, de revisão ou de XP, porque
 * "eu li certo" é o que o aluno acha, e não o que o curso mediu.
 */
export function registrarLeitura(state: LearnerState, atividade: string, consegui: boolean, day: string): LearnerState {
  const todas = state.leituraAutoavaliada ?? {};
  const prev = todas[atividade] ?? { tentadas: 0, consegui: 0, ultima: day };
  return {
    ...state,
    leituraAutoavaliada: {
      ...todas,
      [atividade]: { tentadas: prev.tentadas + 1, consegui: prev.consegui + (consegui ? 1 : 0), ultima: day }
    }
  };
}

/* ── spaced review (Leitner) ────────────────────────────────────────────── */

const INTERVALS = [1, 2, 4, 8, 16] as const;

export function recordAnswer(
  state: LearnerState, itemId: string, letterId: string, correct: boolean, day: string,
  skill?: Skill
): LearnerState {
  const prev: SrsItem = state.srs[itemId] ?? {
    itemId, letterId, box: 0, misses: 0, hits: 0, dueOn: day, lastSeen: day, skill
  };

  /* A correct answer promotes one box; a miss drops to box 0. Getting it right
     the first time never creates an entry: the review pool is for what the
     learner actually struggles with, not a log of everything they have seen. */
  if (correct && !state.srs[itemId]) return state;

  const box = (correct ? Math.min(4, prev.box + 1) : 0) as SrsItem['box'];
  const item: SrsItem = {
    ...prev, box,
    skill: prev.skill ?? skill,
    hits: prev.hits + (correct ? 1 : 0),
    misses: prev.misses + (correct ? 0 : 1),
    lastSeen: day,
    dueOn: addDays(day, INTERVALS[box]!)
  };

  /* Four clean hits in a row and it leaves the pool. */
  if (correct && box === 4 && item.hits >= item.misses + 3) {
    const srs = { ...state.srs };
    delete srs[itemId];
    return { ...state, srs };
  }
  return { ...state, srs: { ...state.srs, [itemId]: item } };
}

/**
 * Fecha uma revisão rápida (28/09/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * O defeito que isto resolve: a fila de revisão guarda a PERGUNTA exata que
 * o aluno errou na lição (o id do exercício), e a revisão rápida gera
 * perguntas NOVAS para as mesmas letras, com outros ids. Acertar tudo na
 * revisão não tocava nos itens pendentes: "a revisar" nunca baixava, e o
 * aluno que refazia e consertava os erros via a revisão como não feita.
 *
 * Agora quem conta é a LETRA revisada. Para cada letra que entrou na rodada,
 * os itens dela que estão para hoje andam:
 *   · a letra saiu sem erro na primeira tentativa → o item sobe uma caixa e
 *     volta mais tarde, como um acerto;
 *   · houve erro e o aluno consertou → o item sai de hoje e volta amanhã,
 *     sem subir de caixa. É o que a tela de fim promete ("o que você errar
 *     hoje volta daqui a um dia").
 * As letras que não couberam nesta rodada continuam para hoje.
 */
export function concluirRevisao(
  state: LearnerState, day: string, porLetra: Record<string, { erros: number }>
): LearnerState {
  let next = state;
  for (const item of dueItems(state, day)) {
    const letra = porLetra[item.letterId];
    if (!letra) continue;
    if (letra.erros === 0) {
      next = recordAnswer(next, item.itemId, item.letterId, true, day);
    } else {
      const atual = next.srs[item.itemId];
      if (atual) {
        next = { ...next, srs: { ...next.srs, [item.itemId]: { ...atual, lastSeen: day, dueOn: addDays(day, 1) } } };
      }
    }
  }
  return next;
}

export const dueItems = (state: LearnerState, day: string): SrsItem[] =>
  Object.values(state.srs)
    .filter(i => i.dueOn <= day)
    .sort((a, b) => b.misses - a.misses || a.dueOn.localeCompare(b.dueOn));

/**
 * The letters worth reviewing today, most troublesome first.
 *
 * Three sources, because one was not enough:
 *
 *   · the SRS queue - items due today, weighted by how often they were missed.
 *     This was the whole of it, and it goes quiet as soon as an item's interval
 *     pushes it past today, even for a letter the learner is still failing;
 *   · any skill sitting at `revisar` - a letter that was strong and has just
 *     slipped is the single most valuable thing a review can offer, and the
 *     SRS entry for it may not be due for days;
 *   · the confusion pairs - both letters of a pair this learner actually
 *     trades, because drilling ד without ר beside it teaches nothing about the
 *     distinction that is failing.
 *
 * `byGlyph` maps a glyph back to a letter id for that third source; callers
 * that do not have the content pass nothing and get the first two.
 */
export function weakLetters(
  state: LearnerState, day: string, limit = 3,
  byGlyph?: ReadonlyMap<string, string>
): string[] {
  const score = new Map<string, number>();
  const bump = (id: string, n: number) => score.set(id, (score.get(id) ?? 0) + n);

  for (const i of dueItems(state, day)) bump(i.letterId, i.misses + 1);

  for (const [letterId, skills] of Object.entries(state.skills)) {
    for (const s of SKILLS) {
      if (skillLevel(skills[s]) === 'revisar') bump(letterId, 2);
    }
  }

  if (byGlyph) {
    for (const c of topConfusions(state, 3)) {
      for (const glyph of [c.correct, c.chosen]) {
        const id = byGlyph.get(glyph);
        if (id) bump(id, c.n);
      }
    }
  }

  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(e => e[0]);
}

/**
 * Everything the learner currently owes, as a list they can look at.
 *
 * The review used to be a black box that produced five questions; a learner
 * who wanted to know what it thought they were bad at had no way to find out.
 * This is that list - and it is also what the "para revisar" panel renders.
 */
export type ReviewDebt = {
  letterId: string;
  /** Which skills are the problem, weakest first. */
  skills: Skill[];
  /** How many SRS items are due for it today. */
  due: number;
  /** Glyph pairs this learner trades that involve this letter. */
  confusedWith: string[];
};

export function reviewDebt(
  state: LearnerState, day: string, byGlyph?: ReadonlyMap<string, string>
): ReviewDebt[] {
  const ids = new Set<string>();
  const due = new Map<string, number>();
  for (const i of dueItems(state, day)) {
    ids.add(i.letterId);
    due.set(i.letterId, (due.get(i.letterId) ?? 0) + 1);
  }
  for (const [letterId, skills] of Object.entries(state.skills)) {
    if (SKILLS.some(s => skillLevel(skills[s]) === 'revisar')) ids.add(letterId);
  }

  const confusedWith = new Map<string, string[]>();
  if (byGlyph) {
    for (const c of topConfusions(state, 6)) {
      for (const [mine, theirs] of [[c.correct, c.chosen], [c.chosen, c.correct]] as const) {
        const id = byGlyph.get(mine);
        if (!id) continue;
        ids.add(id);
        confusedWith.set(id, [...(confusedWith.get(id) ?? []), theirs]);
      }
    }
  }

  return [...ids].map(letterId => {
    const skills = state.skills[letterId] ?? {};
    return {
      letterId,
      skills: SKILLS.filter(s => skillLevel(skills[s]) === 'revisar'),
      due: due.get(letterId) ?? 0,
      confusedWith: confusedWith.get(letterId) ?? []
    };
  }).sort((a, b) =>
    (b.due + b.skills.length + b.confusedWith.length) -
    (a.due + a.skills.length + a.confusedWith.length)
  );
}

/**
 * Has the learner been away long enough to want a warm-up?
 *
 * Two days, not one: a learner who studied yesterday does not need to be told
 * they have been away, and being greeted with "vamos aquecer?" after a normal
 * night is the app talking about itself rather than about them.
 */
export function needsWarmUp(state: LearnerState, day: string): boolean {
  const last = state.streak.lastDay;
  if (!last) return false;
  const gap = daysBetween(last, day);
  return gap >= 2 && dueItems(state, day).length > 0;
}

/* ── achievements ───────────────────────────────────────────────────────── */

export type AchievementDef = {
  id: string; titlePt: string; descPt: string;
  test: (s: LearnerState, day: string) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primeira-letra', titlePt: tx.primeiraLetraTitulo, descPt: tx.primeiraLetraDesc,
    test: s => lettersMastered(s) >= 1 },
  { id: 'primeira-palavra', titlePt: tx.primeiraPalavraTitulo, descPt: tx.primeiraPalavraDesc,
    test: s => lettersMastered(s) >= 3 },
  { id: 'modulo-1', titlePt: tx.modulo1Titulo, descPt: tx.modulo1Desc,
    test: s => !!s.checkpoints['cp1']?.passedAt },
  { id: 'tres-dias', titlePt: tx.tresDiasTitulo, descPt: tx.tresDiasDesc,
    test: (s, d) => displayStreak(s, d) >= 3 },
  { id: 'dez-letras', titlePt: tx.dezLetrasTitulo, descPt: tx.dezLetrasDesc,
    test: s => lettersMastered(s) >= 10 },
  { id: 'metade', titlePt: tx.metadeTitulo, descPt: tx.metadeDesc,
    test: s => lettersMastered(s) >= 11 },
  { id: 'checkpoint-perfeito', titlePt: tx.checkpointPerfeitoTitulo, descPt: tx.checkpointPerfeitoDesc,
    test: s => Object.values(s.checkpoints).some(c => (c.best ?? 0) >= 1) },
  { id: 'vinte-e-duas', titlePt: tx.vinteEDuasTitulo, descPt: tx.vinteEDuasDesc,
    test: s => lettersMastered(s) >= 22 },
  { id: 'sem-o-ponto', titlePt: tx.semOPontoTitulo, descPt: tx.semOPontoDesc,
    test: s => !!s.checkpoints['cp6']?.passedAt },
  { id: 'sons-modernos', titlePt: tx.sonsModernosTitulo, descPt: tx.sonsModernosDesc,
    test: s => !!s.checkpoints['cp7']?.passedAt },
  /* Not a count of anything. The one moment the course is actually selling:
     a whole word decoded with no transliteration on the screen. */
  { id: 'sem-apoio', titlePt: tx.semApoioTitulo, descPt: tx.semApoioDesc,
    test: s => !!s.firsts['leitura-sem-translit'] },
  { id: 'leitor', titlePt: tx.leitorTitulo, descPt: tx.leitorDesc,
    test: s => !!s.finalChallenge.completedAt },
  /* As palavras que ele consegue ler. A CONTA é feita em lib/vocabulario.ts,
     nas telas do curso, porque precisa do vocabulário - que não pode ser lido
     numa página pública. Aqui só se lê o marco que ela gravou. */
  { id: 'le-10', titlePt: tx.lePalavrasTitulo(10), descPt: tx.lePalavrasDesc(10),
    test: s => !!s.firsts['le-10'] },
  { id: 'le-25', titlePt: tx.lePalavrasTitulo(25), descPt: tx.lePalavrasDesc(25),
    test: s => !!s.firsts['le-25'] },
  { id: 'le-50', titlePt: tx.lePalavrasTitulo(50), descPt: tx.lePalavrasDesc(50),
    test: s => !!s.firsts['le-50'] },
  { id: 'le-100', titlePt: tx.lePalavrasTitulo(100), descPt: tx.lePalavrasDesc(100),
    test: s => !!s.firsts['le-100'] },
  /* Só onde a "Meu nome em hebraico" existe (lib/recursos.ts). */
  ...(MEU_NOME_EM_HEBRAICO ? [{ id: 'meu-nome', titlePt: tx.meuNomeTitulo, descPt: tx.meuNomeDesc,
    test: (s: LearnerState) => !!s.firsts['meu-nome'] }] : [])
];

/** Returns the state plus the achievements unlocked by this change. */
export function syncAchievements(
  state: LearnerState, day: string
): { state: LearnerState; unlocked: Achievement[] } {
  const have = new Set(state.achievements.map(a => a.id));
  const unlocked: Achievement[] = [];
  for (const def of ACHIEVEMENTS) {
    if (have.has(def.id)) continue;
    if (def.test(state, day)) unlocked.push({ id: def.id, unlockedAt: new Date().toISOString() });
  }
  if (!unlocked.length) return { state, unlocked };
  return { state: { ...state, achievements: [...state.achievements, ...unlocked] }, unlocked };
}

/* ── progressive reading support ────────────────────────────────────────
   The support fades as the alphabet fills in. This is the single most visible
   sign of progress the course has - a learner who needed the transliteration
   on letter 3 and reads without it on letter 18 can SEE that they changed.

   It is a function of letters mastered, not of a setting, because a setting
   would let the learner keep the crutch forever without noticing. */
export type SupportLevel = 'always' | 'on-tap' | 'on-request';

export function supportLevel(mastered: number): SupportLevel {
  if (mastered < 8) return 'always';        // the reading is simply there
  if (mastered < 16) return 'on-tap';       // one tap
  return 'on-request';                      // "Precisa de ajuda?"
}

export const supportLabel = (level: SupportLevel): string =>
  level === 'on-request' ? tx.precisaAjuda : tx.mostrarLeitura;

/* ── overall progress ───────────────────────────────────────────────────── */

/**
 * Course completion.
 *
 * `extraModuleIds` are modules 6 and 7 - three lessons each, no letters. They
 * are part of the course, so leaving them out of the denominator would let the
 * bar read 100% while the reader still cannot handle a word printed without
 * its dots, which is most words.
 */
export function courseProgress(
  state: LearnerState, totalLetters: number, extraModuleIds: readonly string[] = [],
  /** As lições de som (`som-vet`...): cinco etapas cada, como uma letra. */
  somIds: readonly string[] = []
): number {
  if (totalLetters <= 0) return 0;
  const letterIds = new Set(
    Object.keys(state.lessons).filter(id => !extraModuleIds.includes(id) && !ehLicaoDeSom(id))
  );
  const letters = [...letterIds].reduce((a, id) => {
    const l = state.lessons[id];
    return a + (l ? Math.min(STAGE_COUNT, l.stagesDone.length) / STAGE_COUNT : 0);
  }, 0);
  const extras = extraModuleIds.reduce((a, id) => {
    const l = state.lessons[id];
    return a + (l ? Math.min(EXTRA_STAGE_COUNT, l.stagesDone.length) / EXTRA_STAGE_COUNT : 0);
  }, 0);
  const sons = somIds.reduce((a, id) => {
    const l = state.lessons[id];
    return a + (l ? Math.min(STAGE_COUNT, l.stagesDone.length) / STAGE_COUNT : 0);
  }, 0);
  return Math.min(1, (letters + extras + sons) / (totalLetters + extraModuleIds.length + somIds.length));
}

/** Modules 6 and 7 have three lessons, not five stages. */
export const EXTRA_STAGE_COUNT = 3;

export const isExtraModuleDone = (state: LearnerState, id: string): boolean =>
  (state.lessons[id]?.stagesDone.length ?? 0) >= EXTRA_STAGE_COUNT;

/* ── a trava de progressão ────────────────────────────────────────────────
 * Uma letra por vez, e a seguinte abre quando a anterior foi DOMINADA.
 *
 * O curso sempre teve a ordem; o que não tinha era a trava. O mapa dizia
 * "você ainda não chegou" e deixava entrar, e a razão escrita na época era
 * boa: um adulto que quer espiar o módulo 6 pode. O que essa liberdade
 * custava, medido no conteúdo, é que a lição 9 usa palavras com as letras 1
 * a 8 - quem pula chega numa tela onde metade dos símbolos é ruído, conclui
 * que não está entendendo e some. A ordem não é burocracia: é a condição
 * para as palavras fazerem sentido.
 *
 * ── três decisões, e por quê ─────────────────────────────────────────────
 *
 * 1. NUNCA TIRA O QUE JÁ FOI DADO. Se o aluno tem qualquer progresso numa
 *    letra, ela continua aberta, e tudo antes dela também. Isso protege
 *    quem já estava estudando quando esta trava entrou, e protege de um
 *    critério mais duro no futuro: subir a régua trava letra NOVA, nunca
 *    fecha porta por onde alguém já passou. É a regra 50 do escopo -
 *    progresso é dado importante, e dado importante não desaparece.
 *
 * 2. O CRITÉRIO É A FIXAÇÃO, NÃO A VISITA. Cinco etapas feitas e nota de
 *    fixação no mínimo. Clicar em "continuar" cinco vezes não é aprender, e
 *    uma trava que abre com isso não trava nada.
 *
 * 3. A MENSAGEM DIZ O QUE FALTA. "Bloqueado" sozinho é uma porta sem
 *    maçaneta. `porQueTrancada` devolve a letra que falta e o que falta
 *    nela - terminar as etapas ou melhorar a nota.
 */

/* ── a Aula 0 ─────────────────────────────────────────────────────────────
 * Concluída quando a checagem final (17 perguntas) é feita com pelo menos
 * AULA0_MINIMO acertos. Quem já tem progresso em alguma lição conta como
 * tendo feito: a Aula 0 virou obrigatória em 11/10/2026, e ninguém que já
 * estava estudando perde o acesso que tinha. */
export const AULA0_ID = 'aula-0';
export const AULA0_CONCLUIDA = 'aula-0-concluida';
export const AULA0_PERGUNTAS = 17;
export const AULA0_MINIMO = 12;
export const aula0Feita = (state: LearnerState): boolean =>
  !!state.firsts?.[AULA0_CONCLUIDA] || Object.keys(state.lessons ?? {}).length > 0;

/** A etapa `n` de uma lição de letra abre quando a anterior foi concluída
 *  (03/11/2026, decisão do dono: avançar só depois de ler e escrever de
 *  verdade). Etapa já concluída continua aberta, sempre: nada do que o
 *  aluno já fez se fecha. */
export const etapaAberta = (n: number, feitas: readonly number[]) =>
  n === 1 || feitas.includes(n) || feitas.includes(n - 1);

/** A nota de fixação que libera a letra seguinte. Um número, num lugar só. */
export const LIBERA_MARK = 0.8;

/* ── a revisão entre módulos (03/11/2026, decisão do dono) ────────────────
   A primeira lição de um módulo só abre com o checkpoint do módulo anterior
   aprovado, e esse checkpoint só abre num DIA depois do último dia em que o
   aluno concluiu uma lição daquele módulo. É o efeito de espaçamento: o que
   se revisa depois de uma noite fica; e, de quebra, o alfabeto inteiro não
   cabe numa tarde. As portas saem de `portasDosModulos` (lib/sons.ts): hoje,
   na entrada dos módulos 2 a 5.

   NUNCA TIRA O QUE JÁ FOI DADO: checkpoint já aprovado não fecha, e quem já
   entrou numa lição do módulo seguinte segue com ela aberta (a regra de
   `letraLiberada` abaixo vale para as portas também). */
export type PortaDeModulo = {
  /** O módulo cuja revisão abre a porta. */
  modulo: number;
  checkpoint: string;
  /** As lições desse módulo, letras e sons. */
  licoes: readonly string[];
  /** As leituras obrigatórias desse módulo (03/11/2026): a Primeira Leitura
   *  e o texto principal, pelo `firsts` que cada uma grava ao terminar. */
  leituras: readonly { tipo: 'primeira' | 'texto'; id: string }[];
};
export type Portas = ReadonlyMap<string, PortaDeModulo>;

/** Quando a revisão de um módulo abre: `null` se já pode ser feita, ou a
 *  meia-noite (local) de amanhã se alguma lição do módulo foi concluída hoje. */
export function revisaoAbreEm(
  state: LearnerState, porta: Pick<PortaDeModulo, 'checkpoint' | 'licoes'>, agora: Date = new Date()
): Date | null {
  if (state.checkpoints[porta.checkpoint]?.passedAt) return null;
  const hoje = today(agora);
  const estudouHoje = porta.licoes.some(id => {
    const quando = state.lessons[id]?.completedAt;
    return !!quando && today(new Date(quando)) >= hoje;
  });
  if (!estudouHoje) return null;
  const amanha = new Date(agora);
  amanha.setHours(24, 0, 0, 0);
  return amanha;
}

/** A letra foi dominada para efeito de DESTRAVAR a próxima. */
export const liberaSeguinte = (state: LearnerState, letterId: string): boolean => {
  const l = state.lessons[letterId];
  return !!l && l.stagesDone.length >= STAGE_COUNT && (l.quizBest ?? 0) >= LIBERA_MARK;
};

/**
 * Esta letra está aberta para este aluno?
 *
 * `ordem` é a lista de ids na ordem de ensino - a mesma de `course.letters`
 * ordenada por `order`. A primeira está sempre aberta.
 */
export function letraLiberada(
  state: LearnerState, ordem: readonly string[], letterId: string, portas?: Portas
): boolean {
  const i = ordem.indexOf(letterId);
  /* A primeira letra abre quando a Aula 0 foi concluída (11/10/2026).
     ──────────────────────────────────────────────────────────────────────
     Até aqui o álef abria sempre, por decisão do dono em 22/09/2026. Em
     11/10/2026 o dono decidiu o contrário: ninguém começa as letras sem
     antes entender a direção da leitura e o que é o nikud. A Aula 0 conta
     como concluída quando a checagem final dela passa (`aula0Feita`).

     NUNCA TIRA O QUE JÁ FOI DADO (decisão 1, acima): quem já tem progresso
     em qualquer lição continua com tudo aberto, com ou sem a Aula 0. */
  if (i < 0) return false;
  if (i === 0) return aula0Feita(state);

  /* Já entrou alguma vez, aqui ou mais adiante: a porta continua aberta.
     Ver a decisão 1 acima - e note que basta UMA letra posterior com
     progresso para tudo até ela seguir liberado. */
  if (state.lessons[letterId]) return true;
  for (let k = i + 1; k < ordem.length; k++) if (state.lessons[ordem[k]!]) return true;

  if (!liberaSeguinte(state, ordem[i - 1]!)) return false;
  const porta = portas?.get(letterId);
  return !porta || portaAberta(state, porta);
}

/** A revisão aprovada e as leituras feitas. */
const portaAberta = (state: LearnerState, porta: PortaDeModulo) =>
  !!state.checkpoints[porta.checkpoint]?.passedAt && porta.leituras.every(l => !!state.firsts?.[l.id]);

/** O que falta para abrir. `null` quando já está aberta. `falta: 'aula0'`
 *  é a primeira letra antes da Aula 0: `anterior` vem como AULA0_ID. */
export function porQueTrancada(
  state: LearnerState, ordem: readonly string[], letterId: string, portas?: Portas, agora: Date = new Date()
): {
  anterior: string; falta: 'licao' | 'nota' | 'aula0' | 'revisao'; nota: number | null;
  /** Só em `revisao`: o módulo a fechar, quando a revisão abre (ISO, se
   *  ainda não abriu), se ela falta, e as leituras que faltam. */
  modulo?: number; abreEm?: string | null;
  faltaCheckpoint?: boolean; faltaLer?: PortaDeModulo['leituras'];
} | null {
  if (letraLiberada(state, ordem, letterId, portas)) return null;
  const i = ordem.indexOf(letterId);
  if (i <= 0) return { anterior: AULA0_ID, falta: 'aula0', nota: null };
  const anterior = ordem[i - 1]!;
  if (liberaSeguinte(state, anterior)) {
    const porta = portas!.get(letterId)!;
    return {
      anterior, falta: 'revisao', nota: null, modulo: porta.modulo,
      abreEm: revisaoAbreEm(state, porta, agora)?.toISOString() ?? null,
      faltaCheckpoint: !state.checkpoints[porta.checkpoint]?.passedAt,
      faltaLer: porta.leituras.filter(l => !state.firsts?.[l.id])
    };
  }
  const l = state.lessons[anterior];
  const completa = (l?.stagesDone.length ?? 0) >= STAGE_COUNT;
  return { anterior, falta: completa ? 'nota' : 'licao', nota: l?.quizBest ?? null };
}

/** A última letra aberta - para onde mandar quem bateu numa porta trancada. */
export function letraAtual(state: LearnerState, ordem: readonly string[], portas?: Portas): string {
  let ultima = ordem[0]!;
  for (const id of ordem) {
    if (!letraLiberada(state, ordem, id, portas)) break;
    ultima = id;
  }
  return ultima;
}

/* ── o que ficou para trás, antes do fim do curso (05/11/2026, decisão do dono) ──
   A porta entre módulos (acima) só pede a revisão e as leituras de um módulo
   para ENTRAR no seguinte. Quem já tinha entrado antes dela existir, ou passou
   rápido pelas letras, chega ao fim com textos e revisões para trás. Antes dos
   módulos 6 e 7 e do exame final, o que falta nos módulos de letras (1 a 5)
   tem de ser feito.

   NUNCA TIRA O QUE JÁ FOI DADO: quem já começou o módulo 6 ou 7, ou já fez o
   exame alguma vez, segue com ele aberto. */
export type PendenciaDeModulo = {
  modulo: number;
  faltaCheckpoint: boolean;
  faltaLer: { tipo: 'primeira' | 'texto'; id: string }[];
};

export function pendenciasDasLetras(
  state: LearnerState,
  modulos: readonly { n: number; kind?: string; checkpoint: { id: string } | null; textoPrincipal?: boolean }[]
): PendenciaDeModulo[] {
  const out: PendenciaDeModulo[] = [];
  for (const m of modulos) {
    if (m.kind !== 'letters') continue;
    const faltaCheckpoint = !!m.checkpoint && !state.checkpoints?.[m.checkpoint.id]?.passedAt;
    const faltaLer: PendenciaDeModulo['faltaLer'] = [];
    const primeira = `primeira-leitura-m${m.n}`;
    const texto = `texto-${m.n}`;
    if (!state.firsts?.[primeira]) faltaLer.push({ tipo: 'primeira', id: primeira });
    if (m.textoPrincipal && !state.firsts?.[texto]) faltaLer.push({ tipo: 'texto', id: texto });
    if (faltaCheckpoint || faltaLer.length) out.push({ modulo: m.n, faltaCheckpoint, faltaLer });
  }
  return out;
}

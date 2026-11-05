'use client';

/* The one React entry point to learner state.
 *
 * Components never touch a store adapter or the rules module directly: they
 * call the actions here, which apply a pure rule, sync achievements, persist,
 * and emit an analytics event. Keeping that sequence in one place is what
 * stops XP being awarded twice from two different screens. */

import {
  chaveDoItem, registrarCheckpointA1, registrarExameA1, registrarHabilidade, registrarUnidade, responderRevisao, unidadeConcluida,
  type GeneroA1, type TranslitA1
} from './a1-estado';
import { habilidadeDoItem, type ItemA1 } from '@/lib/a1';
import { faixaDe } from '@/lib/tempo-de-etapa';
import { chaveDaAtividade, chaveDaEtapa, descobrir, escolherInteresses, guardarNaColecao, registrarAtividade, visitarEtapa, type Interesse } from './raizes-estado';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode
} from 'react';
import {
  EMPTY_STATE, type Achievement, type Confusion, type LearnerState, type Onboarding,
  type ProgressStore, type Skill
} from './types';
import { LocalProgressStore, persistenceAvailable } from './local';
import { SupabaseProgressStore, supabaseConfigured } from './supabase';
import { WorkerProgressStore } from './worker';
import { criarGravador } from './gravador';
import { mergeStates, sameState } from './merge';
import { apiMode } from '@/lib/account/api';
import { SESSAO_MUDOU } from '@/lib/account/store';
import {
  ANSWER_UNITS, applyPractice, awardXp, clearConfusion, completeStage, courseProgress,
  abrirJarro as abrirJarroNoEstado, idDoJarro, concluirRevisao, displayStreak, pagarAcerto, dueItems, goalTarget, lettersMastered, markFirst, recordAnswer, registrarLeitura,
  recordCheckpoint, recordConfusion, recordExam, recordGym, recordQuiz, recordSkill,
  syncAchievements, today,
  topConfusions, weakLetters, XP
} from './rules';
import { track } from '@/lib/analytics';
import { ACERTO_DO_TRACO } from '@/lib/trace-score';
import { comprar as comprarNaLoja, type ItemDaLoja, type Recusa } from '@/lib/loja';
import { alternarNoCaderno } from '@/lib/caderno';
import {
  fundirRegistro, limparEspelho, registroValido, RODADAS_MUDOU, sincronizarEspelho, type Registro
} from '@/lib/rodadas';
import { EXAM_PASS } from '@/lib/engine/nota-do-exame';

/* Onde o progresso mora, nesta build.
 * ─────────────────────────────────────────────────────────────────────────
 * O Worker vem primeiro porque é o único dos três que resolve o problema de
 * verdade: o aluno que troca de aparelho, ou limpa o navegador, e encontra o
 * curso onde deixou. Ele não abandona o localStorage - embrulha (ver
 * ./worker.ts), porque o curso tem de continuar funcionando sem sinal.
 *
 * O Supabase continua aqui por ser uma porta escrita e nunca ligada; só entra
 * se alguém configurar as duas variáveis, e numa build de Worker isso seria
 * duas fontes de verdade para o mesmo progresso. */
/* As rodadas de exercício (lib/rodadas.ts) têm um espelho no aparelho,
   que as telas leem de forma síncrona. Ao carregar o progresso, o espelho e
   a conta se fundem nos dois sentidos: o que outro aparelho fez desce para
   este, e o que este lembrava antes de a conta guardar rodadas sobe. Devolve
   o próprio estado quando nada mudou - para não gravar à toa. */
function comEspelhoDeRodadas(s: LearnerState): LearnerState {
  const junto = sincronizarEspelho(s.rodadas ?? {});
  return JSON.stringify(junto) === JSON.stringify(s.rodadas ?? {}) ? s : { ...s, rodadas: junto };
}

function createStore(): ProgressStore {
  if (apiMode() === 'worker') return new WorkerProgressStore();
  return supabaseConfigured() ? new SupabaseProgressStore() : new LocalProgressStore();
}

/* Sair da conta numa página em que o provider não montou
   (components/shell/ProgressoQuandoPrecisa.tsx): o mesmo esquecer que o
   provider faz ao ouvir `saiu`, sem o estado na tela. */
export async function esquecerProgressoDoAparelho(): Promise<void> {
  limparEspelho();
  await createStore().esquecerAqui();
}

type Ctx = {
  state: LearnerState;
  ready: boolean;
  /** False in a private window with storage blocked - the UI says so. */
  persistent: boolean;
  /**
   * O servidor já confirmou o que este aparelho tem?
   *
   * Verdadeiro também quando não há conta: aí o aparelho é o único lugar, e
   * não há sincronização prometida a ninguém. Serve para a interface dizer
   * que algo ainda NÃO subiu - nunca para afirmar que subiu.
   */
  sincronizado: boolean;
  day: string;
  /* derived */
  streak: number;
  mastered: number;
  progress: number;
  dueCount: number;
  weak: string[];
  /** Practice credit today, in the same units as `goalTargetToday`. */
  goalUnits: number;
  goalTargetToday: number;
  /* celebrations the shell shows and then clears */
  pending: Achievement[];
  clearPending: () => void;
  /* actions */
  /** The confusions this learner actually has, worst first. */
  confusions: Confusion[];
  setOnboarding: (o: Onboarding) => void;
  /** `segundos`: o tempo ativo da etapa (lib/tempo-de-etapa.ts). Só a faixa
   *  sai, e só na primeira vez que a etapa é concluída. */
  finishStage: (letterId: string, stage: number, units?: number, segundos?: number) => void;
  /**
   * One answer, with everything the adaptive layer needs to learn from it:
   * which skill it tested, and - on a miss - which wrong option was chosen, so
   * ד answered for ר is recorded as that pair rather than as a generic slip.
   */
  answer: (args: {
    itemId: string; letterId: string; correct: boolean;
    skill?: Skill; expected?: string; chosen?: string;
    /** O tipo do exercício, para o acerto por tipo (`state.kinds`). */
    kind?: string;
  }) => void;
  /** O nome em hebraico, como o aluno o confirmou. `null` apaga. */
  setNomeHebraico: (texto: string | null) => void;
  /** Record a moment that can only happen once, and say so. */
  markFirst: (id: string) => void;
  /** Abre o jarro do módulo no mapa: paga XP.jarro uma vez. Devolve se pagou. */
  abrirJarro: (moduloId: string) => boolean;
  /** Autoavaliação de leitura: não mede domínio (rules.ts, `registrarLeitura`). */
  registrarLeitura: (atividade: string, consegui: boolean) => void;
  /**
   * A traced or freehand attempt at a letter, scored 0-1 by the canvas.
   *
   * Writing is the one skill with no question to answer, so it needs its own
   * door into the model - without it `escrever` would stay permanently 'novo'
   * and the dashboard would keep claiming a letter is strong that the learner
   * cannot actually produce.
   */
  recordWriting: (letterId: string, score: number) => void;
  /** One finished reading-gym run: its score and how long it took. */
  finishGym: (modeId: string, score: number, seconds: number) => void;
  finishQuiz: (letterId: string, score: number) => void;
  finishCheckpoint: (id: string, score: number) => void;
  /** Fecha a revisão: `porLetra` diz, de cada letra revisada, quantos erros
   *  houve na primeira tentativa (ver `concluirRevisao`). */
  finishReview: (score: number, porLetra: Record<string, { erros: number }>) => void;
  finishFinalChallenge: (score: number) => void;
  /** One sitting of the final exam: its overall score and each part's. */
  finishExam: (
    score: number, parts: Record<string, { correct: number; total: number }>
  ) => void;
  remember: (route: string) => void;
  reset: () => void;
  /** Troca XP do saldo por um item da loja (lib/loja.ts). Devolve o motivo da recusa, ou null. */
  comprar: (item: ItemDaLoja['id'], alvo?: string) => Recusa | null;
  /* ── o curso Hebraico A1 (06/10/2026) ── */
  /** Como o aluno quer ser tratado nos exercícios do A1 (decisão 9). */
  setGeneroA1: (g: GeneroA1) => void;
  /** Uma rodada de exercícios de uma unidade do A1, com a nota de 0 a 1. */
  finishUnidadeA1: (n: number, nota: number) => void;
  /** Uma prova do exame do A1. */
  finishExameA1: (
    nota: number, parts: Record<string, { correct: number; total: number }>, aprovacao: number
  ) => void;
  /** Um item do A1 respondido pela PRIMEIRA vez numa rodada: revisão
   *  espaçada, habilidade, e a contagem anônima de acerto por tipo. */
  responderItemA1: (n: number, item: ItemA1, certo: boolean, daLeitura?: boolean) => void;
  /** Um checkpoint do A1 terminou, com a nota de 0 a 1. */
  finishCheckpointA1: (n: number, nota: number) => void;
  /** Uma sessão de "Minha revisão" terminou, com tantos itens. */
  revisaoA1Feita: (itens: number) => void;
  marcarFavoritoA1: (chave: string, on: boolean) => void;
  /** Põe ou tira uma palavra do caderno (lib/caderno.ts). */
  alternarCaderno: (he: string) => void;
  setAutoA1: (n: number, itens: number[]) => void;
  setTranslitA1: (valor: TranslitA1) => void;
  /* ── Raízes Sefarditas (21/10/2026) ── */
  /** Uma tentativa de atividade terminada: nota de 0 a 1 e se o critério foi cumprido. Não dá XP. */
  registrarAtividadeRaizes: (modulo: number, id: string, nota: number, concluiu: boolean) => void;
  /** O aluno abriu uma etapa: guarda a primeira visita e o "onde parei". */
  visitarEtapaRaizes: (modulo: number, etapa: string, rota: string) => void;
  /** Uma descoberta (artefato, lugar, personagem...): fica a primeira vez. */
  descobrirRaizes: (chave: string) => void;
  /** Guardar na coleção pessoal, ou tirar. */
  colecaoRaizes: (chave: string, ativo: boolean) => void;
  /** Os interesses escolhidos na entrada (podem mudar a qualquer hora). */
  interessesRaizes: (interesses: Interesse[]) => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function ProgressProvider({
  children, totalLetters, extraModuleIds = [], somIds = []
}: { children: ReactNode; totalLetters: number; extraModuleIds?: string[]; somIds?: string[] }) {
  const store = useMemo(createStore, []);
  /* The caller passes a fresh array literal on every render; keying the memo on
     its contents rather than its identity keeps the context value stable. */
  const extraKey = extraModuleIds.join(',');
  const somKey = somIds.join(',');
  const [state, setState] = useState<LearnerState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  /* Começa em `true` para que a tela não pisque um aviso de "não sincronizado"
     no primeiro render, antes de haver o que sincronizar. */
  const [sincronizado, setSincronizado] = useState(true);
  const [pending, setPending] = useState<Achievement[]>([]);
  /* A última rota avisada pelo AppShell. Guardada num ref porque ela chega
     antes de o estado carregar, e naquele momento não há estado onde pô-la. */
  const rotaPendente = useRef<string | null>(null);
  const [day, setDay] = useState(() => today());
  /* O estado de agora, legível de dentro de um ouvinte de evento que foi
     registrado uma vez só. Sem o ref, o ouvinte guardaria o estado do
     primeiro render para sempre. */
  const stateRef = useRef(state);
  stateRef.current = state;

  /* O estado de AGORA, e é por isto que todo mutador abaixo passa por aqui.
     ──────────────────────────────────────────────────────────────────────
     Um mutador que lê o `state` do render em que foi criado lê o estado de
     ANTES. Sozinho isso não aparece: o React redesenha e o próximo já vê o
     novo. O defeito nasce quando dois mutadores são chamados no MESMO
     manipulador, que é exatamente o que o fim de uma lição faz:

         p.finishQuiz(letra, nota);   // grava a nota  → S1
         p.finishStage(letra, 5);     // parte de S0!  → S2, sem a nota

     O segundo não viu o primeiro, porque entre os dois não houve render.
     Resultado medido: `quizBest` continuava `null` depois de uma fixação
     perfeita, `isLessonMastered` dava falso para sempre, e a letra recém
     concluída nunca entrava na conta de "letras dominadas" - nem ali, nem
     no mapa, nem no cadeado do exame final.

     `commit` já mantinha `stateRef` em dia justamente para o gravador. Ler
     dele custa nada e fecha a classe inteira do defeito, não só esta
     ocorrência: qualquer par de chamadas seguidas passa a compor. */
  const agora = useCallback(() => stateRef.current, []);

  /* Toda gravação passa por aqui, e por um motivo só: ver ./gravador.ts.
     Em resumo, ele grava o estado DE AGORA em vez de uma cópia velha, e não
     grava nada antes de a leitura terminar - que juntos eram o apagamento
     silencioso do progresso a cada troca de página. */
  const gravador = useMemo(
    () => criarGravador(store, () => stateRef.current, () => setSincronizado(store.sincronizado())),
    [store]
  );
  useEffect(() => () => gravador.cancelar(), [gravador]);

  useEffect(() => {
    let alive = true;
    setPersistent(supabaseConfigured() || persistenceAvailable());
    store.load().then(s => {
      if (!alive) return;
      /* O que a pessoa fez ENQUANTO isto carregava não pode ser jogado fora.
         Com o adaptador do Worker a leitura espera a rede, e numa conexão
         ruim cabe uma lição inteira nesse intervalo. `mergeStates` é a mesma
         fusão que concilia dois aparelhos, e ela não desfaz nada. */
      const emMemoria = stateRef.current;
      const fundido = sameState(emMemoria, EMPTY_STATE) ? s : mergeStates(emMemoria, s);
      const inicial = comEspelhoDeRodadas(fundido);
      stateRef.current = inicial;
      setState(inicial);
      setReady(true);
      /* Só agora a gravação é liberada, e nesta ordem: liberar antes de o
         estado estar em mãos é reabrir o defeito que este arquivo conserta. */
      gravador.liberar();
      /* O espelho trouxe rodadas que a conta não tinha: sobem agora. */
      if (inicial !== fundido) gravador.agendar(400);
      /* A rota que o AppShell avisou enquanto o estado carregava ficou de
         fora da fusão; se ela não chegou a entrar, entra agora. */
      if (rotaPendente.current && inicial.lastRoute !== rotaPendente.current) {
        const comRota = { ...inicial, lastRoute: rotaPendente.current };
        stateRef.current = comRota;
        setState(comRota);
        gravador.agendar(400);
      }
    });
    return () => { alive = false; };
  }, [store, gravador]);

  /* Entrar ou sair muda de quem é o progresso: o que estava só neste aparelho
     passa a ser da conta, e o que estava na conta chega aqui. Uma recarga
     resolve as duas coisas de uma vez, porque `load()` é quem funde.
     O `save` antes dela existe por causa do debounce de 250 ms: sem ele, a
     resposta dada um instante antes de clicar em "entrar" ainda não chegou ao
     armazenamento e a fusão não a encontraria. */
  useEffect(() => {
    let alive = true;
    const aoMudar = (e: Event) => {
      const saiu = !!(e as CustomEvent<{ saiu?: boolean }>).detail?.saiu;

      /* SAIR é o oposto de entrar, e tratá-los igual era o defeito: uma
         recarga depois do logout relia o aparelho, achava o progresso de quem
         saiu e o deixava lá. Numa máquina compartilhada, o próximo a sentar
         lê o estudo do anterior. O progresso não se perde - ele está na conta
         e volta no login. */
      if (saiu) {
        gravador.cancelar();
        limparEspelho();
        void store.esquecerAqui().then(() => {
          if (!alive) return;
          stateRef.current = EMPTY_STATE;
          setState(EMPTY_STATE);
          setPending([]);
          setSincronizado(true);
        });
        return;
      }

      void gravador.agora()
        .then(() => store.load())
        .then(s => {
          if (!alive) return;
          const comRodadas = comEspelhoDeRodadas(s);
          stateRef.current = comRodadas;
          setState(comRodadas);
          setSincronizado(store.sincronizado());
          if (comRodadas !== s) gravador.agendar(400);
        });
    };
    window.addEventListener(SESSAO_MUDOU, aoMudar);
    return () => { alive = false; window.removeEventListener(SESSAO_MUDOU, aoMudar); };
  }, [store, gravador]);

  /* A session left open across midnight must not keep crediting yesterday. */
  useEffect(() => {
    const t = setInterval(() => setDay(d => { const n = today(); return n === d ? d : n; }), 60_000);
    return () => clearInterval(t);
  }, []);

  const commit = useCallback((next: LearnerState) => {
    const synced = syncAchievements(next, today());
    if (synced.unlocked.length) {
      setPending(p => [...p, ...synced.unlocked]);
      synced.unlocked.forEach(a => track('achievement_unlocked', { achievementId: a.id }));
    }
    stateRef.current = synced.state;
    setState(synced.state);
    gravador.agendar(250);
  }, [gravador]);

  /* Uma rodada concluída (lib/rodadas.ts avisa) entra no progresso e sobe
     para a conta com ele. Sem XP nem conquista: é memória, não mérito. */
  useEffect(() => {
    const aoRegistrar = (e: Event) => {
      const d = (e as CustomEvent<{ categoria?: string; registro?: Registro }>).detail;
      const novo = registroValido(d?.registro);
      if (!d?.categoria || !novo) return;
      const s = agora();
      const antes = registroValido(s.rodadas?.[d.categoria]);
      const r = antes ? fundirRegistro(antes, novo) : novo;
      if (antes && r === antes) return;
      const next = { ...s, rodadas: { ...(s.rodadas ?? {}), [d.categoria]: r } };
      stateRef.current = next;
      setState(next);
      gravador.agendar(250);
    };
    window.addEventListener(RODADAS_MUDOU, aoRegistrar);
    return () => window.removeEventListener(RODADAS_MUDOU, aoRegistrar);
  }, [agora, gravador]);

  const setOnboarding = useCallback((o: Onboarding) => {
    commit({ ...agora(), onboarding: o });
    track('onboarding_completed', { goalMinutes: o.goalMinutes, reason: o.reason });
  }, [commit, agora]);

  const finishStage = useCallback((letterId: string, stage: number, units?: number, segundos?: number) => {
    const d = today();
    const total = units === undefined ? 5 : 3;
    const before = agora().lessons[letterId]?.stagesDone.length ?? 0;
    const primeira = !(agora().lessons[letterId]?.stagesDone ?? []).includes(stage);
    const next = completeStage(agora(), letterId, stage, d, units);
    commit(next);
    const faixa = primeira && segundos !== undefined ? faixaDe(segundos) : null;
    track('stage_completed', { letterId, stage, primeira, ...(faixa === null ? {} : { faixa }) });
    if (before < total && (next.lessons[letterId]?.stagesDone.length ?? 0) >= total) {
      track('lesson_completed', { letterId });
    }
  }, [commit, agora]);

  const answer = useCallback((args: {
    itemId: string; letterId: string; correct: boolean;
    skill?: Skill; expected?: string; chosen?: string; kind?: string;
  }) => {
    const { itemId, letterId, correct, skill, expected, chosen, kind } = args;
    const d = today();
    let next = recordAnswer(agora(), itemId, letterId, correct, d, skill);
    /* A miss always creates the review entry, even the first time. */
    if (!correct && !next.srs[itemId]) {
      next = { ...next, srs: { ...next.srs, [itemId]: {
        itemId, letterId, box: 0, misses: 1, hits: 0, dueOn: d, lastSeen: d, skill
      } } };
    }
    if (skill) next = recordSkill(next, letterId, skill, correct, d);
    /* The chosen option is the whole point: a wrong answer that names WHICH
       letter was picked instead turns a generic miss into a drillable pair. */
    if (expected && chosen) {
      next = correct
        ? clearConfusion(next, expected, chosen)
        : recordConfusion(next, expected, chosen, d);
    }
    if (kind) {
      const k = next.kinds?.[kind] ?? { h: 0, m: 0 };
      next = { ...next, kinds: { ...(next.kinds ?? {}),
        [kind]: { h: k.h + (correct ? 1 : 0), m: k.m + (correct ? 0 : 1) } } };
    }
    next = applyPractice(next, d, { answered: 1, units: ANSWER_UNITS });
    if (correct) next = pagarAcerto(next, d);
    commit(next);
    track('exercise_answered', { letterId, itemId, correct, skill, kind });
    if (!correct) track('exercise_wrong', { letterId, itemId, chosen });
  }, [commit, agora]);

  const setNomeHebraico = useCallback((texto: string | null) => {
    const limpo = texto?.trim() ?? '';
    commit({ ...agora(), nomeHebraico: limpo ? { texto: limpo, confirmadoEm: new Date().toISOString() } : null });
  }, [commit, agora]);

  const recordWriting = useCallback((letterId: string, score: number) => {
    const d = today();
    /* The bar is 0.5, which is low, and that is the decision: a finger on glass
       is not a pen on paper, and a learner told their readable ג is wrong stops
       trusting the whole app. The canvas is generous; this agrees with it. */
    let next = recordSkill(agora(), letterId, 'escrever', score >= ACERTO_DO_TRACO, d);
    /* Writing is practice even when it comes out badly - more so, in fact. */
    next = applyPractice(next, d, { units: ANSWER_UNITS });
    if (score >= ACERTO_DO_TRACO) next = pagarAcerto(next, d);
    commit(next);
    track('exercise_answered', { letterId, skill: 'escrever', correct: score >= ACERTO_DO_TRACO });
  }, [commit, agora]);

  const finishGym = useCallback((modeId: string, score: number, seconds: number) => {
    const d = today();
    /* XP for a gym run is the review award: it is the same kind of work, and
       paying more for it would turn the gym into the cheapest way to farm. */
    let next = recordGym(agora(), modeId, score, seconds, d);
    next = awardXp(next, d, XP.review);
    commit(next);
    track('gym_completed', { mode: modeId, score, seconds });
  }, [commit, agora]);

  const doRegistrarLeitura = useCallback((atividade: string, consegui: boolean) => {
    commit(registrarLeitura(agora(), atividade, consegui, day));
  }, [commit, agora, day]);

  const doMarkFirst = useCallback((id: string) => {
    if (agora().firsts[id]) return;
    commit(markFirst(agora(), id));
    track('first_reached', { id });
  }, [commit, agora]);

  const abrirJarro = useCallback((moduloId: string) => {
    if (agora().firsts[idDoJarro(moduloId)]) return false;
    commit(abrirJarroNoEstado(agora(), moduloId, day));
    track('first_reached', { id: idDoJarro(moduloId) });
    return true;
  }, [commit, agora, day]);

  const finishQuiz = useCallback((letterId: string, score: number) => {
    commit(recordQuiz(agora(), letterId, score, today()));
    track('quiz_completed', { letterId, score });
  }, [commit, agora]);

  const finishCheckpoint = useCallback((id: string, score: number) => {
    commit(recordCheckpoint(agora(), id, score, today()));
    track('checkpoint_completed', { checkpointId: id, score });
  }, [commit, agora]);

  const finishReview = useCallback((score: number, porLetra: Record<string, { erros: number }>) => {
    const d = today();
    commit(awardXp(concluirRevisao(agora(), d, porLetra), d, XP.review));
    track('review_completed', { score });
  }, [commit, agora]);

  const finishFinalChallenge = useCallback((score: number) => {
    const d = today();
    const s = agora();
    let next: LearnerState = {
      ...s,
      finalChallenge: {
        best: s.finalChallenge.best == null ? score : Math.max(s.finalChallenge.best, score),
        completedAt: s.finalChallenge.completedAt ?? new Date().toISOString()
      }
    };
    next = awardXp(next, d, XP.checkpoint);
    commit(next);
    track('course_completed', { score });
  }, [commit, agora]);

  const finishExam = useCallback((
    score: number, parts: Record<string, { correct: number; total: number }>
  ) => {
    commit(recordExam(agora(), score, parts, today(), EXAM_PASS));
    track('course_completed', { score });
  }, [commit, agora]);

  /* Trocar de tela é a ação mais barata do app e era a mais cara: era ela
     que disparava a gravação do estado vazio por cima do progresso guardado.
     Agora, enquanto o estado não chegou, a rota só é anotada - quem a aplica
     é o efeito de carga, depois de ter o progresso em mãos. */
  const remember = useCallback((route: string) => {
    rotaPendente.current = route;
    if (!gravador.liberado) return;
    setState(s => {
      if (s.lastRoute === route) return s;
      const next = { ...s, lastRoute: route };
      stateRef.current = next;
      return next;
    });
    gravador.agendar(400);
  }, [gravador]);

  const comprar = useCallback((item: ItemDaLoja['id'], alvo?: string): Recusa | null => {
    const r = comprarNaLoja(agora(), item, new Date().toISOString(), alvo);
    if (!r.ok) return r.motivo;
    commit(r.state);
    track('loja_compra', { itemId: item });
    return null;
  }, [commit, agora]);

  /* Raízes Sefarditas: sem XP e sem sequência de dias, de propósito
     (lib/state/raizes-estado.ts). Só o progresso do próprio produto. */
  const registrarAtividadeRaizes = useCallback((modulo: number, id: string, nota: number, concluiu: boolean) => {
    const s = agora();
    commit({ ...s, raizes: registrarAtividade(s.raizes, chaveDaAtividade(modulo, id), nota, concluiu, new Date().toISOString()) });
    /* Grava já, sem esperar os 250 ms do agendamento: concluir uma atividade
       e recarregar logo em seguida perdia a conclusão (visto em raizes.mjs).
       O gravador não descarrega o que estava agendado quando a página sai. */
    void gravador.agora();
  }, [commit, agora, gravador]);

  const visitarEtapaRaizes = useCallback((modulo: number, etapa: string, rota: string) => {
    const s = agora();
    const chave = chaveDaEtapa(modulo, etapa);
    /* Voltar à mesma etapa sem nada novo não grava: o "onde parei" só muda
       quando o lugar muda, para não escrever no servidor a cada clique. */
    if (s.raizes?.etapas[chave] && s.raizes.onde?.rota === rota) return;
    commit({ ...s, raizes: visitarEtapa(s.raizes, chave, rota, new Date().toISOString()) });
  }, [commit, agora]);

  const descobrirRaizes = useCallback((chave: string) => {
    const s = agora();
    if (s.raizes?.descobertas?.[chave]) return;
    commit({ ...s, raizes: descobrir(s.raizes, chave, new Date().toISOString()) });
  }, [commit, agora]);

  const colecaoRaizes = useCallback((chave: string, ativo: boolean) => {
    const s = agora();
    commit({ ...s, raizes: guardarNaColecao(s.raizes, chave, ativo, new Date().toISOString()) });
  }, [commit, agora]);

  const interessesRaizes = useCallback((interesses: Interesse[]) => {
    const s = agora();
    commit({ ...s, raizes: escolherInteresses(s.raizes, interesses, new Date().toISOString()) });
  }, [commit, agora]);

  const setGeneroA1 = useCallback((g: GeneroA1) => {
    const s = agora();
    commit({ ...s, a1: { ...s.a1, genero: { valor: g, em: new Date().toISOString() } } });
  }, [commit, agora]);

  /* Uma rodada do A1 conta como estudo do dia (a sequência de dias é uma só,
     para os dois cursos), e a PRIMEIRA vez que a unidade passa de 70% vale o
     XP de uma lição. Refazer não dá XP de novo: a regra do alfabeto. */
  const finishUnidadeA1 = useCallback((n: number, nota: number) => {
    const d = today();
    const s = agora();
    const antes = unidadeConcluida(s.a1, n);
    let next: LearnerState = { ...s, a1: registrarUnidade(s.a1, n, nota, new Date().toISOString()) };
    next = applyPractice(next, d, { units: ANSWER_UNITS });
    if (!antes && unidadeConcluida(next.a1, n)) {
      next = awardXp(next, d, XP.lesson);
      /* O funil anônimo do painel: em que unidade do A1 as pessoas param. */
      track('stage_completed', { letterId: `a1-u${n}`, stage: 1, primeira: true });
    }
    commit(next);
  }, [commit, agora]);

  const finishExameA1 = useCallback((
    nota: number, parts: Record<string, { correct: number; total: number }>, aprovacao: number
  ) => {
    const d = today();
    const s = agora();
    const jaPassou = !!s.a1.exame.passedAt;
    let next: LearnerState = { ...s, a1: registrarExameA1(s.a1, nota, parts, aprovacao, new Date().toISOString()) };
    next = applyPractice(next, d, { units: ANSWER_UNITS });
    if (!jaPassou && next.a1.exame.passedAt) next = awardXp(next, d, XP.checkpoint);
    commit(next);
  }, [commit, agora]);

  const responderItemA1 = useCallback((n: number, item: ItemA1, certo: boolean, daLeitura = false) => {
    const d = today();
    const s = agora();
    let a1 = responderRevisao(s.a1, chaveDoItem(n, item), certo, d);
    if (item.t !== 'aberta') a1 = registrarHabilidade(a1, habilidadeDoItem(item, daLeitura), certo);
    commit({ ...s, a1 });
    track('exercise_answered', { letterId: `a1-u${n}`, kind: item.t, correct: certo });
  }, [commit, agora]);

  const finishCheckpointA1 = useCallback((n: number, nota: number) => {
    const d = today();
    const s = agora();
    const antes = !!s.a1.checkpoints[String(n)]?.passedAt;
    let next: LearnerState = { ...s, a1: registrarCheckpointA1(s.a1, n, nota, new Date().toISOString()) };
    next = applyPractice(next, d, { units: ANSWER_UNITS });
    if (!antes && next.a1.checkpoints[String(n)]?.passedAt) next = awardXp(next, d, XP.checkpoint);
    commit(next);
    track('checkpoint_completed', { checkpointId: `a1-c${n}`, score: nota });
  }, [commit, agora]);

  const revisaoA1Feita = useCallback((itens: number) => {
    const d = today();
    const s = agora();
    let next: LearnerState = { ...s, a1: { ...s.a1, dias: { ...s.a1.dias, [d]: (s.a1.dias[d] ?? 0) + itens } } };
    next = applyPractice(next, d, { units: ANSWER_UNITS });
    commit(next);
    track('review_completed', { score: itens });
  }, [commit, agora]);

  const marcarFavoritoA1 = useCallback((chave: string, on: boolean) => {
    const s = agora();
    commit({ ...s, a1: { ...s.a1, favoritos: { ...s.a1.favoritos, [chave]: { on, em: new Date().toISOString() } } } });
  }, [commit, agora]);

  const alternarCaderno = useCallback((he: string) => {
    const s = agora();
    commit({ ...s, caderno: alternarNoCaderno(s.caderno, he, new Date().toISOString()) });
  }, [commit, agora]);

  const setAutoA1 = useCallback((n: number, itens: number[]) => {
    const s = agora();
    commit({ ...s, a1: { ...s.a1, auto: { ...s.a1.auto, [String(n)]: { itens, em: new Date().toISOString() } } } });
  }, [commit, agora]);

  const setTranslitA1 = useCallback((valor: TranslitA1) => {
    const s = agora();
    commit({ ...s, a1: { ...s.a1, translit: { valor, em: new Date().toISOString() } } });
  }, [commit, agora]);

  const reset = useCallback(() => {
    gravador.cancelar();
    limparEspelho();
    void store.clear();
    stateRef.current = EMPTY_STATE;
    setState(EMPTY_STATE);
    setPending([]);
  }, [store, gravador]);

  const value = useMemo<Ctx>(() => {
    const goal = state.onboarding?.goalMinutes ?? 10;
    return {
      state, ready, persistent, sincronizado, day,
      streak: displayStreak(state, day),
      mastered: lettersMastered(state),
      progress: courseProgress(state, totalLetters, extraKey ? extraKey.split(',') : [],
        somKey ? somKey.split(',') : []),
      dueCount: dueItems(state, day).length,
      weak: weakLetters(state, day),
      goalUnits: state.days[day]?.units ?? 0,
      goalTargetToday: goalTarget(goal),
      confusions: topConfusions(state),
      pending,
      clearPending: () => setPending([]),
      setOnboarding, finishStage, answer, markFirst: doMarkFirst, abrirJarro, registrarLeitura: doRegistrarLeitura, recordWriting, finishGym,
      finishQuiz, finishCheckpoint, finishReview, finishFinalChallenge, finishExam,
      remember, reset, setNomeHebraico, comprar, setGeneroA1, finishUnidadeA1, finishExameA1,
      responderItemA1, finishCheckpointA1, revisaoA1Feita, marcarFavoritoA1, alternarCaderno, setAutoA1, setTranslitA1,
      registrarAtividadeRaizes, visitarEtapaRaizes, descobrirRaizes, colecaoRaizes, interessesRaizes
    };
  }, [
    state, ready, persistent, sincronizado, day, totalLetters, extraKey, somKey, pending,
    setOnboarding, finishStage, answer, doMarkFirst, abrirJarro, doRegistrarLeitura, recordWriting, finishGym, finishQuiz,
    finishCheckpoint, finishReview, finishFinalChallenge, finishExam, remember, reset,
    setNomeHebraico, comprar, setGeneroA1, finishUnidadeA1, finishExameA1,
    responderItemA1, finishCheckpointA1, revisaoA1Feita, marcarFavoritoA1, alternarCaderno, setAutoA1, setTranslitA1,
    registrarAtividadeRaizes, visitarEtapaRaizes, descobrirRaizes, colecaoRaizes, interessesRaizes
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useProgress(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}

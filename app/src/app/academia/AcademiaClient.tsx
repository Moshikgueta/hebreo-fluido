'use client';

/* Academia de Leitura - the practice room.
 * ─────────────────────────────────────────────────────────────────────────
 * Everything here is generated from what the learner has already unlocked, by
 * the same engine that builds the lessons. Nothing is authored twice, nothing
 * can show a letter they have not met, and the room stays useful after the
 * twenty-second lesson - which is the point. A course you cannot practise is a
 * course you finish once and close.
 *
 * The timed mode races the learner against their OWN last time and nothing
 * else. There is no leaderboard and no target: "da última vez, 41 s" is
 * motivating; "o tempo médio é 28 s" is a reason to stop.
 */

import { DESAFIO_ID, desafioDoDia, desafioFeitoHoje } from '@/lib/engine/desafio';
import { Flashcards, cartasDoBaralho, type Baralho } from '@/components/learn/Flashcards';
import { IconeCadeado } from '@/components/shell/NavIcons';
import { useCallback, useEffect, useMemo, useState, type FocusEvent } from 'react';

/* O foco não pode escapar do jogo (auditoria de 28/09, UX-002). Responder
   desabilita o botão tocado, o foco sai e o próximo Tab caía no rodapé
   ("Reembolso", "Precisa de ajuda?"). Quando o foco sai do jogo sem ir para
   lugar nenhum, ele volta ao primeiro botão ativo do jogo. Um só lugar, para
   os cinco jogos. */
function segurarFoco(e: FocusEvent<HTMLDivElement>) {
  if (e.relatedTarget) return;                        // foi para um lugar de verdade
  const raiz = e.currentTarget;
  requestAnimationFrame(() => {
    const a = document.activeElement;
    if (a && a !== document.body && document.body.contains(a)) return;
    raiz.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true });
  });
}
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PARES_DE_SOM } from '@/lib/engine/pares-de-som';
import { Card, Badge } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { CenaDoJogo, simboloComLetrasDoAluno } from '@/components/ilustra/CenaDoJogo';
import { LivroDaLeitura } from '@/components/ilustra/LivroDaLeitura';
import { He } from '@/components/hebrew/He';
import { Milestone } from '@/components/game/Game';
import { ExercisePlayer, type PlayerResult } from '@/components/learn/ExercisePlayer';
import { SoundLab, VowelSigns } from '@/components/learn/SoundLab';
import { WritingCanvas } from '@/components/learn/WritingCanvas';
import { EscreverPalavras } from '@/components/learn/EscreverPalavras';
import { palavrasDosTextosLidos } from '@/lib/leitura';
import { audioAvailable, hasAudio } from '@/components/learn/AudioButton';
import { ParaRevisar } from '@/components/game/Debt';
import { useProgress } from '@/lib/state/store';
import { allLetters, course, type Letter } from '@/lib/content';
import { leiturasDoModulo } from '@/lib/leituras-do-curso';
import { onCarrier } from '@/lib/hebrew';
import { availableModes, buildGym, confusionPair, type GymMode } from '@/lib/engine/gym';
import { comOsSonsFeitos, idDoSom } from '@/lib/sons';
import { escolherRodada, registrarRodada } from '@/lib/rodadas';
import { GuiaTeclado } from '@/components/learn/GuiaTeclado';
import {
  montarBatalha, montarCacada, montarCursiva, paresParaTreinar, rodadasDeSom,
  nivelDe, NIVEL_LABEL, type Nivel
} from '@/lib/engine/jogos';
import type { LearnerState } from '@/lib/state/types';
import { rng } from '@/lib/engine/rng';
import { Match, type ResultadoJogo } from '@/components/game/Match';
import { Blast } from '@/components/game/Blast';
import { CacaLetra } from '@/components/game/CacaLetra';
import { PomarComTemas } from '@/components/game/PomarComTemas';
import { MontarPalavra } from '@/components/game/MontarPalavra';
import { rodadaDeMontar } from '@/lib/engine/montar';
import { HebraicoNaVidaReal } from '@/components/learn/HebraicoNaVidaReal';
import { perguntasDoPomarPorTema } from '@/lib/engine/pomar';
import { TEMAS } from '@/lib/engine/temas';
import { alfabetoDe, palavrasLegiveis, vocabularioDoCurso } from '@/lib/engine/palavras';
import { Batalha } from '@/components/game/Batalha';
import { ImpressaCursiva } from '@/components/game/ImpressaCursiva';
import { TestRun, RelatorioTeste, type ResultadoTeste } from '@/components/game/TestRun';
import {
  deLetras, habilidadeDoJogo, montarBaralho, perguntasDe, TIPOS_POR_JOGO, type Par, type Pergunta
} from '@/lib/engine/deck';
import { letterMastery } from '@/lib/state/rules';
import { track } from '@/lib/analytics';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/academia-academia-client';

/* Os que saem do BARALHO (lib/engine/deck.ts) e os que saem do motor de
   reconhecimento (lib/engine/jogos.ts). São duas famílias de verdade, e o
   tipo separado é o que impede alguém de passar 'caca' para `fazerJogo` e
   descobrir isso num `undefined` em produção. */
type DadosDeJogo = ReturnType<typeof montarNovo>;
type JogoDeBaralho = 'match' | 'blast' | 'teste';
type JogoNovo = 'caca' | 'batalha' | 'cursiva' | 'pomar' | 'montar';
type Jogo = JogoDeBaralho | JogoNovo;
const DE_BARALHO = (j: Jogo): j is JogoDeBaralho =>
  j === 'match' || j === 'blast' || j === 'teste';

type Screen =
  | { kind: 'menu' }
  /* Palavras inteiras em cursiva, à mão. */
  | { kind: 'palavras-a-mao' }
  | { kind: 'flashcards'; baralho: Baralho }
  | { kind: 'desafio'; startedAt: number }
  | { kind: 'desafioFim'; acertos: number; total: number }
  | { kind: 'run'; mode: GymMode; startedAt: number }
  /* O guia do teclado, entre o toque no modo de digitação e o modo. */
  | { kind: 'teclado'; mode: GymMode }
  | { kind: 'done'; mode: GymMode; result: PlayerResult; seconds: number }
  /* `dados` guarda a rodada dos jogos de reconhecimento, construída UMA vez.
     ──────────────────────────────────────────────────────────────────────
     Ela morava no corpo do render, e isso era um defeito de verdade: a
     rodada é montada a partir do PROGRESSO, e o progresso muda a cada
     resposta - então cada toque remontava a grade, com outro alvo e outras
     letras, debaixo do dedo de quem estava jogando. Medido: uma caça de três
     alvos travava em "2 de 3" e trocava o {{נ}} por um {{ה}} no meio da
     partida.
     Guardada aqui, a rodada é imutável enquanto durar - que é o que uma
     rodada é. */
  | { kind: 'jogo'; jogo: Jogo; rodada: number; dados?: DadosDeJogo }
  | { kind: 'jogoFim'; jogo: Jogo; rodada: number; r: ResultadoJogo }
  | { kind: 'testeFim'; rodada: number; r: ResultadoTeste }
  | { kind: 'lab' }
  | { kind: 'escrita' };

/* Os três jogos, descritos no mesmo formato dos modos da academia - é a
   mesma prateleira, e eles não são um anexo. */
/* `treinaPt` (28/10/2026, rodada 3 da experiência): a habilidade, numa linha.
   Os seis cartões eram iguais, e o aluno escolhia pelo nome do jogo sem saber
   o que cada um exercita. */
export const JOGOS: Record<Jogo, { titlePt: string; descPt: string; treinaPt: string; minimo: number }> = {
  match: {
    titlePt: tx.jogoMatchTitulo,
    descPt: tx.jogoMatchDesc,
    treinaPt: tx.jogoMatchTreina,
    minimo: 3
  },
  blast: {
    titlePt: tx.jogoBlastTitulo,
    descPt: tx.jogoBlastDesc,
    treinaPt: tx.jogoBlastTreina,
    minimo: 4
  },
  teste: {
    titlePt: tx.jogoTesteTitulo,
    descPt: tx.jogoTesteDesc,
    treinaPt: tx.jogoTesteTreina,
    minimo: 4
  },
  /* Os três que entraram em 22/09/2026. Entram NESTA prateleira, e não numa
     tela nova: já existia um lugar para praticar, e um segundo seria dois
     lugares onde o aluno procura a mesma coisa. */
  caca: {
    titlePt: tx.jogoCacaTitulo,
    descPt: tx.jogoCacaDesc,
    treinaPt: tx.jogoCacaTreina,
    minimo: 3
  },
  batalha: {
    titlePt: tx.jogoBatalhaTitulo,
    descPt: tx.jogoBatalhaDesc,
    treinaPt: tx.jogoBatalhaTreina,
    minimo: 2
  },
  cursiva: {
    titlePt: tx.jogoCursivaTitulo,
    descPt: tx.jogoCursivaDesc,
    treinaPt: tx.jogoCursivaTreina,
    minimo: 3
  },
  /* O Pomar das palavras (05/11/2026, aprovado pelo dono): ler palavras para
     ganhar jogadas num tabuleiro de frutas (lib/engine/pomar.ts). */
  pomar: {
    titlePt: tx.jogoPomarTitulo,
    descPt: tx.jogoPomarDesc,
    treinaPt: tx.jogoPomarTreina,
    minimo: 3
  },
  /* Montar a palavra (06/11/2026, pedido do dono): pôr as peças da palavra em
     ordem, com os pontos ou só as letras (lib/engine/montar.ts). */
  montar: {
    titlePt: tx.jogoMontarTitulo,
    descPt: tx.jogoMontarDesc,
    treinaPt: tx.jogoMontarTreina,
    minimo: 3
  }
};

export function AcademiaClient() {
  const p = useProgress();
  /* Os textos do curso, módulo por módulo (05/11/2026): sem a Primeira
     Leitura, que é de palavras soltas e mora na página Leituras. */
  const textosDoCurso = course.modules.flatMap(m =>
    leiturasDoModulo(m, p.state).filter(l => !l.id.startsWith('pl-')).map(l => ({ ...l, modulo: m.n })));
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });

  /* Only what has been unlocked. A letter whose lesson was started counts:
     the learner has met it, and practising it is exactly what they should be
     doing. */
  /* As palavras de som (טוֹב, do Vet) entram quando a lição do som começa,
     pela mesma régua (27/10/2026): antes, terminar o Bet já as trazia. */
  const unlocked = useMemo<Letter[]>(
    () => allLetters()
      .filter(l => (p.state.lessons[l.id]?.stagesDone.length ?? 0) > 0)
      .map(l => comOsSonsFeitos(l, som => (p.state.lessons[idDoSom(som)]?.stagesDone.length ?? 0) > 0)),
    [p.state.lessons]
  );

  /* O desafio do dia, montado uma vez por dia (lib/engine/desafio.ts). */
  /* As letras dos desenhos dos cartões: só as que o aluno já tem. */
  const letrasDaCena = useMemo(() => unlocked.map(l => l.letter), [unlocked]);
  const desafio = useMemo(() => desafioDoDia(unlocked, p.weak, p.day, audioAvailable()),
    [unlocked.length, p.day]);
  const desafioFeito = desafioFeitoHoje(p.state, p.day);
  const nPalavras = useMemo(() => cartasDoBaralho('palavras', unlocked, allLetters()).length, [unlocked]);

  const audio = audioAvailable();
  const modes = useMemo(
    () => availableModes(p.state, unlocked, audio, p.day),
    [p.state, unlocked, audio, p.day]
  );

  /* A rodada é montada UMA vez, quando começa. Montada a cada render ela
     seguiria o estado, e cada resposta muda o domínio das letras, que decide
     quais palavras e letras vêm primeiro: o item seguinte trocaria no meio da
     sessão. A semente vem do começo da sessão, então refazer o modo no mesmo
     dia dá outra rodada. Por isso a dependência é só `screen`. */
  const rodada = useMemo(
    () => (screen.kind === 'run'
      ? (() => {
          /* A semente sai da rodada da categoria: o modo refeito evita as
             perguntas das últimas vezes (lib/rodadas.ts). */
          const gerar = (seed: string) => buildGym(screen.mode, p.state, unlocked, { audioAvailable: audio, day: p.day, seed });
          const { seed, itens } = escolherRodada(`academia-${screen.mode.id}`, s => gerar(s).exercises);
          return { ...gerar(seed), exercises: itens };
        })()
      : null),
    [screen]
  );

  const tecladoOk = !!p.state.firsts['teclado-hebraico'];
  const start = useCallback((mode: GymMode) => {
    /* A digitação pede o teclado hebraico, e o aluno confirma UMA vez que o
       instalou. Sem isso o primeiro exercício seria uma caixa que recebe
       letras latinas e não há o que corrigir. */
    if (mode.needsKeyboard && !tecladoOk) {
      setScreen({ kind: 'teclado', mode });
      return;
    }
    track('gym_started', { mode: mode.id });
    setScreen({ kind: 'run', mode, startedAt: Date.now() });
  }, [tecladoOk]);

  /* Deep-link: o painel manda para cá com o jogo já escolhido, para que
     "Match" no painel seja um toque e não três. */
  const busca = useSearchParams();
  const pedido = busca?.get('jogo');
  /* As duas abas de Praticar (05/11/2026, pedido do dono): as práticas e o
     Hebraico na vida real. `?aba=vida-real` abre direto a segunda. */
  const [aba, setAba] = useState<'praticas' | 'vida-real'>(busca?.get('aba') === 'vida-real' ? 'vida-real' : 'praticas');
  useEffect(() => {
    if (pedido && pedido in JOGOS) {
      setScreen({ kind: 'jogo', jogo: pedido as Jogo, rodada: 0 });
    }
  }, [pedido]);
  /* O vocabulário manda para cá com `?treino=palavras-a-mao`. */
  const treino = busca?.get('treino');
  useEffect(() => {
    if (treino === 'palavras-a-mao') setScreen({ kind: 'palavras-a-mao' });
    if (treino === 'desafio') setScreen({ kind: 'desafio', startedAt: Date.now() });
    if (treino === 'flashcards-letras') setScreen({ kind: 'flashcards', baralho: 'letras' });
    if (treino === 'flashcards-palavras') setScreen({ kind: 'flashcards', baralho: 'palavras' });
    if (treino === 'flashcards-caderno') setScreen({ kind: 'flashcards', baralho: 'caderno' });
  }, [treino]);

  /* As letras que mais custam entram primeiro no baralho. É o mesmo sinal que
     alimenta a revisão - aqui ele só decide a ORDEM, nunca o conteúdo. */
  const peso = useCallback((letterId: string) => {
    const m = letterMastery(p.state, letterId);
    return m === 'novo' ? 1.6 : m === 'aprendendo' ? 1.4 : m === 'forte' ? 0.6 : 1;
  }, [p.state]);

  const fazerJogo = useCallback((jogo: JogoDeBaralho, rodada: number): {
    baralho: Par[]; perguntas: Pergunta[];
  } => {
    const semente = `${jogo}-${unlocked.length}-${rodada}`;
    const fontes = deLetras(unlocked, TIPOS_POR_JOGO[jogo]);
    const quantos = jogo === 'match' ? 6 : jogo === 'blast' ? 12 : 10;
    const baralho = montarBaralho(fontes, { quantos, semente, peso });
    const perguntas = jogo === 'match' ? [] : perguntasDe(baralho, fontes, {
      semente: `${semente}-q`,
      /* No canhão o pedido vem em português e os alvos são o hebraico. */
      sentido: jogo === 'teste' ? 'misto' : jogo === 'blast' ? 'pt' : 'he'
    });
    return { baralho, perguntas };
  }, [unlocked, peso]);

  /* O nível sai do progresso, e não de um seletor na tela. Ver `nivelDe`. */
  const nivel = useMemo(() => nivelDe(p.state, unlocked), [p.state, unlocked]);

  const fazerNovo = useCallback(
    (jogo: Jogo, rodada: number) => montarNovo(jogo, rodada, p.state, unlocked, nivel,
      jogo === 'batalha' ? busca?.get('par') ?? null : null),
    [p.state, unlocked, nivel, busca]);

  /* Que jogo tem material hoje? A mesma conta que a tela do jogo faz antes
     de recusar com "Ainda não há letras suficientes". Com uma letra só, os
     seis abriam e os seis davam nesse beco (auditoria de 01/10/2026,
     VIS-009); agora o cartão diz, antes do clique, quando ele abre. */
  const fechados = useMemo(() => {
    const out: Partial<Record<Jogo, string>> = {};
    for (const jogo of Object.keys(JOGOS) as Jogo[]) {
      const info = JOGOS[jogo];
      let falta: boolean;
      if (unlocked.length < info.minimo) falta = true;
      else if (DE_BARALHO(jogo)) {
        const { baralho, perguntas } = fazerJogo(jogo, 0);
        falta = jogo === 'match' ? baralho.length < info.minimo : perguntas.length < info.minimo;
      } else {
        const d = fazerNovo(jogo, 0);
        falta = jogo === 'caca' ? !d.cacada?.length : jogo === 'cursiva' ? !d.cursiva?.length
          : jogo === 'pomar' ? !TEMAS.some(t => d.pomar?.[t].length)
          : jogo === 'montar' ? !(d.montar?.pontos.length || d.montar?.letras.length) : !d.batalha;
      }
      if (!falta) continue;
      out[jogo] = unlocked.length < info.minimo
        ? fmt(tx.abreCom, { n: info.minimo })
        : jogo === 'batalha' ? tx.abreParecidas : tx.abreMais;
    }
    return out;
  }, [unlocked, fazerJogo, fazerNovo]);

  /* Cada tentativa alimenta o mesmo modelo que as lições alimentam: o jogo
     não tem placar próprio, ele escreve na mesma memória.

     `escolhida` é o que os jogos novos acrescentaram, e não é detalhe: com
     ela o erro deixa de ser "errou o dálet" e passa a ser "trocou ד por ר",
     que é o par treinável. É exatamente isso que a Batalha lê depois para
     saber quais são as inimigas de hoje - o jogo alimenta o critério que
     escolhe o próprio jogo. */
  const registrar = useCallback((a: {
    id: string; letterId: string; certo: boolean; escolhida?: string;
  }) => {
    if (!a.letterId) return;
    const L = unlocked.find(l => l.id === a.letterId);
    /* Só um GLIFO vira troca registrada. No Blast e no Teste a alternativa
       escolhida pode ser um nome ("Mem") ou um som ("m"), e gravar
       `מ>Mem` como confusão sujava a lista que a Batalha lê para escolher os
       pares - uma troca que nenhuma letra do alfabeto consegue resolver. */
    const glifo = a.escolhida && /^[\u05D0-\u05EA]$/.test(a.escolhida) ? a.escolhida : null;
    p.answer({
      itemId: `jogo:${a.id}`, letterId: a.letterId, correct: a.certo,
      skill: habilidadeDoJogo(a.id),
      ...(L && glifo ? { expected: L.letter, chosen: glifo } : {})
    });
  }, [p, unlocked]);

  /* ── os jogos de reconhecimento ─────────────────────────────────────── */
  if (screen.kind === 'jogo' && !DE_BARALHO(screen.jogo)) {
    const jogo = screen.jogo;
    /* Se a tela já carrega a rodada, é ela que vale. A construção aqui só
       serve ao primeiro render e ao deep-link, e o `setScreen` logo abaixo
       congela o resultado - a partir daí nada a remonta. */
    const dados = screen.dados ?? fazerNovo(jogo, screen.rodada);
    if (!screen.dados) setScreen({ ...screen, dados });
    const info = JOGOS[jogo];

    const vazio = jogo === 'caca' ? !dados.cacada?.length
      : jogo === 'cursiva' ? !dados.cursiva?.length
      : jogo === 'pomar' ? !TEMAS.some(t => dados.pomar?.[t].length)
      : jogo === 'montar' ? !(dados.montar?.pontos.length || dados.montar?.letras.length)
      : !dados.batalha;

    if (vazio || unlocked.length < info.minimo) {
      return (
        <Empty onBack={() => setScreen({ kind: 'menu' })}>
          {jogo === 'batalha'
            ? tx.vazioBatalha
            : tx.vazioRodada}
        </Empty>
      );
    }

    const fim = (r: ResultadoJogo) => {
      const score = r.total ? r.acertos / r.total : 0;
      p.finishGym(jogo, score, r.segundos);
      track('game_completed', { jogo, score, seconds: r.segundos });
      setScreen({ kind: 'jogoFim', jogo, rodada: screen.rodada, r });
    };

    return (
      <div className="focus-col grid gap-5" onBlur={segurarFoco}>
        <GymHeader
          mode={{ titlePt: info.titlePt } as GymMode}
          label={NIVEL_LABEL[nivel]}
          onBack={() => setScreen({ kind: 'menu' })}
        />
        {jogo === 'caca' && dados.cacada && (
          <CacaLetra key={`ca-${screen.rodada}`} cacas={dados.cacada} unlocked={unlocked}
                     onResposta={registrar} onFim={fim} />
        )}
        {jogo === 'batalha' && dados.batalha && (
          <Batalha key={`ba-${screen.rodada}`} dados={dados.batalha}
                   onResposta={registrar} onFim={fim} />
        )}
        {jogo === 'pomar' && dados.pomar && (
          <PomarComTemas key={`po-${screen.rodada}`} temas={dados.pomar} onFim={fim} />
        )}
        {jogo === 'montar' && dados.montar && (
          <MontarPalavra key={`mo-${screen.rodada}`} rodadas={dados.montar} onFim={fim} />
        )}
        {jogo === 'cursiva' && dados.cursiva && (
          <ImpressaCursiva key={`cu-${screen.rodada}`} rodadas={dados.cursiva}
                           onResposta={registrar} onFim={fim} />
        )}
      </div>
    );
  }

  /* ── os três jogos de baralho ───────────────────────────────────────── */
  if (screen.kind === 'jogo' && DE_BARALHO(screen.jogo)) {
    const { baralho, perguntas } = fazerJogo(screen.jogo, screen.rodada);
    const info = JOGOS[screen.jogo];
    const poucos = screen.jogo === 'match'
      ? baralho.length < info.minimo
      : perguntas.length < info.minimo;

    if (poucos) {
      return (
        <Empty onBack={() => setScreen({ kind: 'menu' })}>
          {screen.jogo === 'match'
            ? tx.vazioMatch
            : tx.vazioAlternativas}
        </Empty>
      );
    }

    return (
      <div className="focus-col grid gap-5">
        <GymHeader
          mode={{ titlePt: info.titlePt } as GymMode}
          label={info.titlePt}
          onBack={() => setScreen({ kind: 'menu' })}
        />
        {screen.jogo === 'match' && (
          <Match
            key={`m-${screen.rodada}`}
            baralho={baralho}
            semente={`match-${unlocked.length}-${screen.rodada}`}
            onResposta={a => registrar({ id: a.parId, letterId: a.letterId, certo: a.certo })}
            onFim={r => {
              const score = r.total ? r.acertos / (r.acertos + r.erros || 1) : 0;
              p.finishGym('match', score, r.segundos);
              track('game_completed', { jogo: 'match', score: r.total ? r.acertos / (r.acertos + r.erros || 1) : 0, seconds: r.segundos });
              setScreen({ kind: 'jogoFim', jogo: 'match', rodada: screen.rodada, r });
            }}
          />
        )}
        {screen.jogo === 'blast' && (
          <Blast
            key={`b-${screen.rodada}`}
            perguntas={perguntas}
            onResposta={registrar}
            onFim={r => {
              p.finishGym('blast', r.total ? r.acertos / r.total : 0, r.segundos);
              track('game_completed', { jogo: 'blast', score: r.total ? r.acertos / r.total : 0, seconds: r.segundos });
              setScreen({ kind: 'jogoFim', jogo: 'blast', rodada: screen.rodada, r });
            }}
          />
        )}
        {screen.jogo === 'teste' && (
          <TestRun
            key={`t-${screen.rodada}`}
            perguntas={perguntas}
            onResposta={registrar}
            onFim={r => {
              p.finishGym('teste', r.score, r.segundos);
              track('game_completed', { jogo: 'teste', score: r.score, seconds: r.segundos });
              setScreen({ kind: 'testeFim', rodada: screen.rodada, r });
            }}
          />
        )}
      </div>
    );
  }

  if (screen.kind === 'testeFim') {
    return (
      <div className="focus-col grid gap-5">
        <GymHeader mode={{ titlePt: tx.jogoTesteTitulo } as GymMode} label={tx.resultado}
                   onBack={() => setScreen({ kind: 'menu' })} />
        <RelatorioTeste
          r={screen.r}
          onRefazer={() => setScreen({ kind: 'jogo', jogo: 'teste', rodada: screen.rodada + 1 })}
        >
          <Button variant="secondary" onClick={() => setScreen({ kind: 'menu' })}>
            {tx.voltarAcademia}
          </Button>
          <LinkButton href="/meu-hebraico" variant="ghost">{tx.continuarCurso}</LinkButton>
        </RelatorioTeste>
      </div>
    );
  }

  if (screen.kind === 'jogoFim') {
    const { r, jogo } = screen;
    const pct = r.total ? Math.round((r.acertos / r.total) * 100) : 0;

    /* O arco da Batalha: o que mudou desde que ele trocava estas duas.
       ────────────────────────────────────────────────────────────────────
       É a única frase do jogo que compara passado e presente, e por isso ela
       só aparece quando existe passado - um par que veio dos erros DELE, e
       uma rodada que foi bem. Dita para todo mundo, em toda rodada, ela
       viraria enfeite e pararia de significar alguma coisa. */
    const par = jogo === 'batalha' ? confusionPair(p.state, unlocked) : null;
    const arco = par && pct >= 70 && Object.keys(p.state.confusions).length > 0
      ? tx.arco(par[0].namePt, par[1].namePt, r.acertos, r.total)
      : null;

    return (
      <div className="focus-col grid gap-5">
        <Milestone
          kicker={jogo === 'match'
            ? tx.kickerMatch(r.total, r.erros, r.segundos)
            : tx.kickerPlacar(r.acertos, r.total, pct)}
          title={arco ?? (r.erros === 0 ? tx.semErro : pct >= 70 ? tx.boaSessao : tx.sessaoFeita)}
          body={r.erros === 0
            ? tx.corpoFirme
            : tx.corpoEscapouDia}
        >
          <Button onClick={() => setScreen({ kind: 'jogo', jogo, rodada: screen.rodada + 1 })}>
            {tx.maisUma}
          </Button>
          <Button variant="secondary" onClick={() => setScreen({ kind: 'menu' })}>
            {tx.escolherOutro}
          </Button>
          <LinkButton href="/meu-hebraico" variant="ghost">{tx.continuarCurso}</LinkButton>
        </Milestone>
      </div>
    );
  }

  if (screen.kind === 'teclado') {
    const mode = screen.mode;
    return (
      <div className="focus-col grid gap-5">
        <GymHeader mode={mode} label={tx.tecladoRotulo} onBack={() => setScreen({ kind: 'menu' })} />
        {/* O teclado da tela primeiro (UXQA-012): ele funciona em qualquer
            aparelho, sem configurar nada (components/learn/TecladoHebraico.tsx).
            Instalar o teclado do sistema continua sendo o melhor para quem
            vai digitar muito, e fica como opção recolhida, logo abaixo. */}
        <p className="font-ui text-[16px] leading-relaxed text-ink-body m-0">
          {tx.tecladoTexto}
        </p>
        <Button size="lg" onClick={() => {
          p.markFirst('teclado-hebraico');
          track('gym_started', { mode: mode.id });
          setScreen({ kind: 'run', mode, startedAt: Date.now() });
        }}>
          {tx.usarTecladoTela}
        </Button>
        <details className="rounded-[var(--r-md)] border border-line bg-surface px-4 py-3">
          <summary className="min-h-[44px] flex items-center cursor-pointer font-ui text-[15px] font-semibold text-ink">
            {tx.tecladoSistema}
          </summary>
          <div className="grid gap-3 pt-2">
            <p className="font-ui text-[15px] leading-relaxed text-ink-body m-0">
              {tx.tecladoSistemaTexto}
            </p>
            <GuiaTeclado onConfirmar={() => {
              p.markFirst('teclado-hebraico');
              track('keyboard_confirmed', {});
              track('gym_started', { mode: mode.id });
              setScreen({ kind: 'run', mode, startedAt: Date.now() });
            }} />
          </div>
        </details>
      </div>
    );
  }

  if (screen.kind === 'run') {
    const run = rodada ?? { exercises: [], label: '' };
    if (!run.exercises.length) {
      return (
        <Empty onBack={() => setScreen({ kind: 'menu' })}>
          {tx.vazioModo}
        </Empty>
      );
    }
    return (
      <div className="focus-col grid gap-5">
        <GymHeader mode={screen.mode} label={run.label} onBack={() => setScreen({ kind: 'menu' })} />
        {screen.mode.timed && <Cronometro desde={screen.startedAt} />}
        <ExercisePlayer
          key={screen.mode.id + screen.startedAt}
          exercises={run.exercises}
          title={screen.mode.titlePt}
          onDone={result => {
            const seconds = Math.round((Date.now() - screen.startedAt) / 1000);
            track('gym_completed', { mode: screen.mode.id, score: result.score, seconds });
            if (rodada) registrarRodada(`academia-${screen.mode.id}`, rodada.exercises);
            p.finishGym(screen.mode.id, result.score, seconds);
            setScreen({ kind: 'done', mode: screen.mode, result, seconds });
          }}
        />
      </div>
    );
  }

  if (screen.kind === 'done') {
    const { mode, result, seconds } = screen;
    const pct = Math.round(result.score * 100);
    const prev = p.state.gym?.[mode.id];
    /* The previous best was written by finishGym before this screen rendered,
       so "da última vez" has to come from the run before that one. */
    const earlier = prev?.previousSeconds ?? null;
    const recorde = prev?.bestSeconds ?? null;
    /* Bateu o recorde? `finishGym` já gravou esta partida, então o recorde
       guardado JÁ inclui ela - a comparação honesta é com o tempo anterior. */
    const bateu = mode.timed && earlier != null && seconds < earlier;

    return (
      <div className="focus-col grid gap-5">
        <Milestone
          kicker={tx.kickerPlacar(result.correct, result.total, pct)}
          title={bateu ? tx.recordeSeu : pct >= 80 ? tx.boaSessao : tx.sessaoFeita}
          body={
            mode.timed && earlier != null
              ? bateu
                ? tx.tempoBateu(seconds, earlier)
                : tx.tempoLevou(seconds, earlier)
              : mode.timed
                ? tx.tempoPrimeiro(seconds)
                : pct >= 80
                  ? tx.materialFirme
                  : tx.escapouFila
          }
        >
          {/* O placar do modo cronometrado, em números separados.
              ──────────────────────────────────────────────────────────────
              O pedido era ver acertos, erros, precisão, tempo e recorde. Uma
              frase corrida não serve para comparar com a próxima partida -
              e comparar com a própria marca anterior é a única competição que
              este curso tem, de propósito: não há ranking entre alunos. */}
          {mode.timed && (
            <dl className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 list-none p-0 m-0 mb-1">
              {([
                [tx.acertos, String(result.correct)],
                [tx.erros, String(result.total - result.correct)],
                [tx.precisao, `${pct}%`],
                [tx.tempo, `${seconds}s`]
              ] as const).map(([rotulo, valor]) => (
                <div key={rotulo}
                     className="rounded-[var(--r-md)] border border-line bg-surface px-3 py-2.5
                                grid gap-0.5 justify-items-center">
                  <dt className="font-ui text-[11.5px] uppercase tracking-[.08em] text-ink-muted">
                    {rotulo}
                  </dt>
                  <dd className="font-ui text-[19px] font-bold tabular-nums text-ink m-0">{valor}</dd>
                </div>
              ))}
            </dl>
          )}
          {mode.timed && recorde != null && (
            <p className="font-ui text-[13.5px] text-ink-muted m-0 mb-1">
              {tx.melhorTempo(<strong className="font-semibold text-ink">{recorde}s</strong>)}
            </p>
          )}
          <Button onClick={() => start(mode)}>{tx.maisUma}</Button>
          <Button variant="secondary" onClick={() => setScreen({ kind: 'menu' })}>
            {tx.escolherOutroModo}
          </Button>
        </Milestone>
      </div>
    );
  }

  if (screen.kind === 'lab') {
    return (
      <div className="grid gap-5">
        <GymHeader
          mode={{ titlePt: tx.sonsESinais } as GymMode}
          label={tx.tudoQuePodeLer}
          onBack={() => setScreen({ kind: 'menu' })}
        />
        <SoundLab letters={unlocked} />
        <div className="grid gap-2 reading">
          <h2 className="font-display text-[19px] font-bold text-ink mt-2">{tx.sinaisDeVogal}</h2>
          <p className="font-ui text-[14px] text-ink-muted">
            {tx.sinaisTexto}
          </p>
        </div>
        <VowelSigns demoLetter={unlocked[unlocked.length - 1]?.letter} />
      </div>
    );
  }

  if (screen.kind === 'desafio') {
    return (
      <div className="grid gap-5">
        <GymHeader mode={{ titlePt: tx.desafioDoDia } as GymMode}
                   label={tx.desafioRotulo}
                   onBack={() => setScreen({ kind: 'menu' })} />
        <ExercisePlayer
          key={`desafio-${screen.startedAt}`}
          exercises={desafio}
          title={tx.desafioDoDia}
          onDone={r => {
            p.finishGym(DESAFIO_ID, r.score, Math.round((Date.now() - screen.startedAt) / 1000));
            setScreen({ kind: 'desafioFim', acertos: r.correct, total: r.total });
            requestAnimationFrame(() => window.scrollTo({ top: 0 }));
          }}
        />
      </div>
    );
  }

  if (screen.kind === 'desafioFim') {
    return (
      <div className="grid gap-4 justify-items-center text-center rounded-[var(--r-lg)] bg-[var(--accent-bg)]
                      text-white px-6 py-9 shadow-[var(--sh)]">
        <span aria-hidden className="animate-pop grid place-items-center w-16 h-16 rounded-full bg-white text-[var(--navy)] text-[30px] font-bold">✓</span>
        <h2 className="m-0 text-white text-[24px] font-bold">{tx.desafioFeitoTitulo}</h2>
        <p className="m-0 font-ui text-[15.5px] text-white max-w-[36ch]">
          {tx.desafioFeitoTexto(screen.acertos, screen.total)}
        </p>
        <button type="button" onClick={() => setScreen({ kind: 'menu' })}
                className="min-h-[48px] px-5 rounded-[var(--r-md)] bg-white font-ui text-[15px] font-semibold text-[var(--navy)] active:scale-[.97]">
          {tx.voltarPraticar}
        </button>
      </div>
    );
  }

  if (screen.kind === 'flashcards') {
    const deLetras = screen.baralho === 'letras';
    const doCaderno = screen.baralho === 'caderno';
    return (
      <div className="grid gap-5">
        <GymHeader
          mode={{ titlePt: deLetras ? tx.flashLetrasTitulo : doCaderno ? tx.flashCadernoTitulo : tx.flashPalavrasTitulo } as GymMode}
          label={deLetras ? tx.flashLetrasRotulo : doCaderno ? tx.flashCadernoRotulo : tx.flashPalavrasRotulo}
          onBack={() => setScreen({ kind: 'menu' })}
        />
        <Flashcards baralho={screen.baralho} letras={unlocked} todas={allLetters()}
                    semente={`flash-${p.day}`} caderno={p.state.caderno} onBack={() => setScreen({ kind: 'menu' })} />
      </div>
    );
  }

  if (screen.kind === 'palavras-a-mao') {
    return (
      <div className="grid gap-5">
        <GymHeader
          mode={{ titlePt: tx.palavrasAMao } as GymMode}
          label={tx.palavrasAMaoRotulo}
          onBack={() => setScreen({ kind: 'menu' })}
        />
        <EscreverPalavras letras={unlocked} semente={`a-mao-${p.day}`}
                          extras={palavrasDosTextosLidos(p.state)} />
      </div>
    );
  }

  if (screen.kind === 'escrita') {
    /* The letter the learner is weakest at writing, or the newest one. Writing
       practice with nothing to aim at is doodling. */
    const target = unlocked
      .slice()
      .sort((a, b) => {
        const s = (l: Letter) => p.state.skills[l.id]?.escrever?.streak ?? -1;
        return s(a) - s(b) || b.order - a.order;
      })[0] ?? unlocked[unlocked.length - 1];
    if (!target) return <Empty onBack={() => setScreen({ kind: 'menu' })}>{tx.vazioEscrita}</Empty>;
    return (
      <div className="grid gap-5">
        <GymHeader
          mode={{ titlePt: tx.escrita } as GymMode}
          label={tx.letraQueMaisPrecisa(target.namePt)}
          onBack={() => setScreen({ kind: 'menu' })}
        />
        <WritingCanvas
          glyph={target.letter}
          letterId={target.id}
          label={target.namePt}
          onScored={score => p.recordWriting(target.id, score)}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-3 reading">
        <Badge tone="accent">{tx.academiaDeLeitura}</Badge>
        <h1 className="text-[27px] sm:text-[33px] font-bold">{tx.praticar}</h1>
        <p className="font-ui text-[15px] text-ink-muted">
          {tx.intro(unlocked.length)}
        </p>
      </header>

      {!unlocked.length ? (
        <Card tone="amber" className="p-6 grid gap-3">
          <p className="text-[15px] leading-relaxed text-ink-body">
            {tx.abreDepois}
          </p>
          <LinkButton href="/meu-hebraico" className="justify-self-start">{tx.comecarPrimeira}</LinkButton>
        </Card>
      ) : (
        <>
          <div role="tablist" aria-label={tx.abas} className="inline-flex justify-self-start rounded-full border-2 border-line bg-[var(--card)] p-1 gap-1">
            {(['praticas', 'vida-real'] as const).map(a => (
              <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => setAba(a)}
                      className={`min-h-[44px] px-4 rounded-full font-ui text-[14.5px] font-semibold transition-colors
                        ${aba === a ? 'bg-[var(--navy)] text-white' : 'text-ink hover:bg-[var(--sand)]'}`}>
                {a === 'praticas' ? tx.abaPraticas : tx.abaVidaReal}
              </button>
            ))}
          </div>

          {aba === 'vida-real' ? (
            <HebraicoNaVidaReal state={p.state} />
          ) : (<>
          {/* Os jogos primeiro, e em cartões maiores: são eles que alguém
              abre quando tem cinco minutos e nenhuma paciência para escolher
              um modo. Os treinos por assunto continuam logo abaixo, para quem
              sabe o que quer.

              Os seis numa prateleira só, e não dois grupos: para o aluno não
              existe "jogo de baralho" e "jogo de reconhecimento" - existe o
              que ele quer jogar agora. A divisão é do código, e o código não
              é assunto dele. */}
          {/* Os jogos em primeiro lugar e em destaque (05/11/2026, pedido do dono):
              antes vinham depois da lista dos textos e dos flashcards, longe do topo. */}
          <section aria-labelledby="jogos" className="grid gap-3">
            <h2 id="jogos" className="font-display text-[23px] sm:text-[26px] font-bold tracking-[-0.02em] text-ink">
              {tx.jogosDePratica}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
              {/* O Pomar das palavras (05/11/2026, pedido do dono): só aqui, na lista
                  principal, e não em primeiro; antes ficava na aba Hebraico na vida real. */}
              {(['caca', 'batalha', 'cursiva', 'match', 'blast', 'teste', 'montar', 'pomar'] as const).map(jogo => (
                <li key={jogo}>
                  {/* Cartão ilustrado (05/11/2026, aprovado pelo dono): a cena do
                      jogo em cima, com as letras que o aluno já aprendeu. */}
                  <button
                    type="button"
                    disabled={!!fechados[jogo]}
                    onClick={() => setScreen({ kind: 'jogo', jogo, rodada: 0 })}
                    className={`hf-cartao w-full h-full text-left ${fechados[jogo] ? 'hf-cartao-fechado' : ''}`}
                  >
                    <CenaDoJogo jogo={jogo} letras={letrasDaCena} />
                    <span className="grid gap-1.5 content-start p-4 pt-3.5">
                      <span className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
                        {JOGOS[jogo].titlePt}
                      </span>
                      <span className="font-ui text-[12.5px] font-semibold text-[var(--teal-ink)]">
                        {tx.treina(JOGOS[jogo].treinaPt.toLowerCase())}
                      </span>
                      <span className="font-ui text-[13.5px] leading-[1.5] text-ink-muted">
                        {JOGOS[jogo].descPt}
                      </span>
                      {fechados[jogo]
                        ? <span className="font-ui text-[13px] font-semibold text-ink-body">
                            <IconeCadeado size={14} className="inline -mt-0.5 mr-1" />{fechados[jogo]}
                          </span>
                        : <GymBest modeId={jogo} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* As três portas que vieram da barra (28/10/2026, navegação em quatro
              portas): a revisão, a leitura e as palavras moram aqui agora. A
              revisão vem primeiro e diz quantos itens esperam. */}
          <section aria-labelledby="rever" className="grid gap-3">
            <h2 id="rever" className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
              {tx.reverELer}
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-3 list-none p-0 m-0">
              <li className="sm:col-span-3">
                <button type="button" disabled={!desafio.length}
                        onClick={() => setScreen({ kind: 'desafio', startedAt: Date.now() })}
                        className="w-full text-left flex items-center gap-3 rounded-[16px] border border-[var(--teal)]
                                   bg-[var(--teal-soft)] p-4 min-h-[72px] transition-transform active:scale-[.98] disabled:opacity-60">
                  <span aria-hidden className={`shrink-0 grid place-items-center w-10 h-10 rounded-full font-bold text-[16px]
                    ${desafioFeito ? 'bg-[var(--teal)] text-white' : 'bg-[var(--card)] text-[var(--teal-ink)] border border-[var(--teal)]'}`}>
                    {desafioFeito ? '✓' : '5'}
                  </span>
                  <span className="grid gap-0.5 min-w-0">
                    <span className="font-display text-[16.5px] font-semibold text-ink">{tx.desafioDoDia}</span>
                    <span className="font-ui text-[13px] leading-snug text-[var(--teal-ink)]">
                      {desafioFeito ? tx.desafioFeitoHoje : tx.desafioConvite}
                    </span>
                  </span>
                </button>
              </li>
              {([
                ['/revisao', tx.revisao, p.dueCount > 0
                  ? tx.revisaoEspera(p.dueCount)
                  : tx.revisaoEmDia, p.dueCount > 0],
                ['/leituras', tx.leituras, tx.leiturasDesc, false],
                ['/vocabulario', tx.suasPalavras, tx.suasPalavrasDesc(nPalavras), false]
              ] as const).map(([href, titulo, desc, destaque]) => (
                <li key={href}>
                  <Link href={href}
                        className={`h-full flex flex-col gap-1 rounded-[16px] border p-4 min-h-[88px]
                                    transition-[box-shadow,border-color] duration-[250ms] hover:shadow-[var(--sh)] active:scale-[.98]
                                    ${destaque ? 'border-[var(--gold)] bg-[var(--gold-soft)]' : 'border-line bg-[var(--card)] hover:border-[var(--teal)]'}`}>
                    <span className="font-display text-[16.5px] font-semibold text-ink">{titulo}</span>
                    <span className={`font-ui text-[13px] leading-snug ${destaque ? 'text-[var(--gold-ink)] font-semibold' : 'text-ink-muted'}`}>{desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Os textos do curso (05/11/2026, decisão do dono): todos aqui, cada
              um aberto depois de lido no lugar dele no curso, para reler e
              praticar de novo. Os trancados dizem em que módulo estão. */}
          <section aria-labelledby="textos-do-curso" className="grid gap-3">
            <div className="grid gap-1">
              <h2 id="textos-do-curso" className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
                {tx.textosDoCurso}
              </h2>
              <p className="font-ui text-[13.5px] leading-snug text-ink-muted m-0">
                {tx.textosDesc(textosDoCurso.filter(t => t.aberta).length, textosDoCurso.length)}
              </p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
              {textosDoCurso.map(t => (
                <li key={t.id} className="min-w-0">
                  {/* Cartão ilustrado, parte 3: o livrinho do texto do módulo. */}
                  {t.aberta ? (
                    <Link href={t.href} className="hf-topico h-full flex items-center gap-3.5 min-h-[76px]">
                      <LivroDaLeitura tipo="texto" />
                      <span className="grid gap-1 min-w-0">
                        <span className="font-ui text-[12px] font-semibold uppercase tracking-[.06em] text-[var(--teal-ink)]">✓ {tx.moduloN(t.modulo)}</span>
                        <span className="font-display text-[15.5px] font-semibold leading-snug text-ink">{t.titulo}</span>
                      </span>
                    </Link>
                  ) : (
                    <div className="hf-topico hf-topico-fechado h-full flex items-center gap-3.5 min-h-[76px] border-dashed">
                      <LivroDaLeitura tipo="texto" trancado />
                      <span className="grid gap-1 min-w-0">
                        <span className="font-ui text-[12px] font-semibold uppercase tracking-[.06em] text-ink-muted">{tx.moduloN(t.modulo)}</span>
                        <span className="font-display text-[15.5px] font-semibold leading-snug text-ink-muted">{t.titulo}</span>
                        <span className="font-ui text-[12.5px] leading-snug text-ink-muted">{t.porque}</span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Os flashcards (28/10/2026, pedido do dono): o jeito mais rápido de
              rever, em dois baralhos. */}
          <section aria-labelledby="flashcards" className="grid gap-3">
            <h2 id="flashcards" className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
              {tx.flashcards}
            </h2>
            <ul className="grid gap-3 grid-cols-2 list-none p-0 m-0">
              {([
                ['letras', tx.letras, tx.cartasLetras(unlocked.length)],
                ['palavras', tx.palavras, tx.cartasPalavras(nPalavras)]
              ] as const).map(([baralho, titulo, desc]) => (
                <li key={baralho}>
                  <button type="button" disabled={baralho === 'palavras' && nPalavras === 0}
                          onClick={() => setScreen({ kind: 'flashcards', baralho })}
                          className="relative w-full h-full text-left rounded-[18px] border border-line bg-[var(--card)] p-4 grid gap-1
                                     transition-[box-shadow,border-color] duration-[250ms] enabled:hover:shadow-[var(--sh)]
                                     enabled:hover:border-[var(--teal)] enabled:active:scale-[.98] disabled:opacity-60">
                    {/* Duas cartas empilhadas, a de cima levemente girada. */}
                    <span aria-hidden className="relative h-11 w-10 mb-1">
                      <span className="absolute inset-0 rounded-[8px] bg-[var(--teal-soft)] border border-[var(--teal)] rotate-[-8deg]" />
                      <span className="absolute inset-0 rounded-[8px] bg-[var(--card)] border border-line rotate-[4deg]
                                       grid place-items-center font-display text-[15px] font-bold text-[var(--teal-ink)]">
                        {baralho === 'letras'
                          ? <He size="inline">א</He>
                          : <span className="grid gap-1 w-5"><span className="h-[3px] rounded bg-[var(--teal)]" /><span className="h-[3px] w-3 rounded bg-[var(--teal)]" /></span>}
                      </span>
                    </span>
                    <span className="font-display text-[17px] font-semibold text-ink">{titulo}</span>
                    <span className="font-ui text-[12.5px] leading-snug text-ink-muted">{desc}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>


          <h2 className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink mt-2">
            {tx.treinarPorAssunto}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {modes.map(({ mode, ready, whyNot }) => (
              <li key={mode.id}>
                {/* Cartão ilustrado, parte 2 (05/11/2026): o símbolo do assunto
                    numa medalha colorida, a cor fixa por assunto (COR_DO_ASSUNTO). */}
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => start(mode)}
                  className={`hf-topico w-full h-full text-left grid gap-1.5 ${ready ? '' : 'hf-topico-fechado'}`}
                >
                  <span className="flex items-center gap-3.5">
                    <span aria-hidden className={`hf-medalha ${COR_DO_ASSUNTO[mode.id] ?? 'hf-medalha-teal'}`}>
                      {/[֐-׿]/.test(mode.icon)
                        /* A bare vowel mark has nothing to sit on and renders
                           as a stray dot in the corner of the tile; onCarrier
                           puts it on U+25CC, which is Unicode's own way of
                           showing a combining mark on its own. */
                        ? <He size="inline" className="!text-current">{onCarrier(simboloComLetrasDoAluno(mode.icon, letrasDaCena))}</He>
                        : mode.icon}
                    </span>
                    <span className="font-display text-[16.5px] font-semibold tracking-[-0.01em] text-ink">{mode.titlePt}</span>
                    {mode.timed && (
                      <span className="ml-auto font-ui text-[11px] uppercase tracking-[.07em]
                                       text-[var(--accent)]">{tx.tempoMarca}</span>
                    )}
                  </span>
                  <span className="font-ui text-[13.5px] leading-relaxed text-ink-muted">
                    {ready ? mode.descPt : whyNot}
                  </span>
                  <GymBest modeId={mode.id} />
                </button>
              </li>
            ))}
          </ul>

          {/* What the course thinks you are bad at, said out loud. Without it,
              "a revisão escolhe por você" is a claim taken on faith. */}
          <ParaRevisar />

          {/* Not a quiz: the two reference surfaces. Kept at the bottom because
              a learner who came here to practise should not land on a table. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ReferenceCard
              title={tx.sonsESinais}
              desc={tx.refSonsDesc}
              simbolo="♫" cor="hf-medalha-mar"
              onClick={() => setScreen({ kind: 'lab' })}
            />
            <ReferenceCard
              title={tx.escrita}
              desc={tx.refEscritaDesc}
              simbolo="✎" cor="hf-medalha-oliva"
              onClick={() => setScreen({ kind: 'escrita' })}
            />
            <ReferenceCard
              title={tx.palavrasAMao}
              desc={tx.refPalavrasDesc}
              simbolo="✍" cor="hf-medalha-flor"
              onClick={() => setScreen({ kind: 'palavras-a-mao' })}
            />
          </div>
          </>)}
        </>
      )}
    </div>
  );
}

/**
 * A rodada de um jogo de reconhecimento, montada de uma vez.
 *
 * Fora do componente e sem estado próprio: recebe o progresso, devolve a
 * rodada. Quem a chama guarda o resultado (ver `dados` no tipo `Screen`), e
 * essa é a parte que importa - chamá-la a cada render remonta o tabuleiro a
 * cada resposta, porque o progresso muda a cada resposta.
 *
 * Semeada como todo o resto do motor: sair e voltar devolve a MESMA rodada, e
 * "tentar de novo" não vira silenciosamente "tentar outra coisa".
 */
function montarNovo(
  jogo: Jogo, rodada: number, state: LearnerState, unlocked: Letter[], nivel: Nivel,
  /** Um par pedido de fora (`?par=דר`, a sugestão "Vamos praticar a diferença"). */
  parPedido: string | null = null
) {
  const rand = rng(`${jogo}-${unlocked.length}-${rodada}`);
  /* Uma CAÇADA, e não uma caça: cinco rodadas, cada uma com outra letra. A
     tela montava uma rodada só e terminava nela, e era por isso que o jogo
     praticava sempre a mesma letra - o sorteio já era por peso. */
  if (jogo === 'caca') return { cacada: montarCacada(state, unlocked, rand, nivel) };
  if (jogo === 'cursiva') return { cursiva: montarCursiva(state, unlocked, rand, nivel) };
  /* As palavras do curso que o aluno já lê, como no resto da Academia. */
  /* Com a escolha do que treinar (05/11/2026): letras e sons das letras já
     começadas, palavras e leitura das palavras que ele já lê. */
  if (jogo === 'pomar') return { pomar: perguntasDoPomarPorTema(unlocked, palavrasLegiveis(vocabularioDoCurso(allLetters()), alfabetoDe(unlocked)), rand) };
  /* Montar a palavra (06/11/2026): as palavras que ele já lê, nos dois jeitos. */
  if (jogo === 'montar') {
    const legiveis = palavrasLegiveis(vocabularioDoCurso(allLetters()), alfabetoDe(unlocked));
    return { montar: { pontos: rodadaDeMontar(legiveis, 'pontos', rand), letras: rodadaDeMontar(legiveis, 'letras', rand) } };
  }
  /* Vários pares por partida, e não um. `paresParaTreinar` põe primeiro o que
     ELE trocou de verdade e depois o que o conteúdo prevê. */
  /* O giro sai da mesma semente da rodada: cada partida nova traz outros
     pares antigos, e voltar à mesma rodada devolve os mesmos. */
  let pares = paresParaTreinar(state, unlocked, 4, Math.floor(rand() * 97));
  /* O par pedido vem primeiro, e só se as duas letras já foram vistas. */
  if (parPedido) {
    const [g1, g2] = [...parPedido];
    const achar = (g?: string) => unlocked.find(l => l.letter === g || l.finalForm === g);
    const a = achar(g1), b = achar(g2);
    if (a && b && a.id !== b.id) {
      pares = [[a, b] as [Letter, Letter], ...pares.filter(([x, y]) => !([x.id, y.id].includes(a.id) && [x.id, y.id].includes(b.id)))].slice(0, 4);
    }
  }
  if (!pares.length) return {};
  /* E, depois do desenho, o ouvido: até quatro rodadas dos pares de som
     (lib/engine/pares-de-som.ts), só com gravação das duas sílabas. */
  const somRodadas = rodadasDeSom(PARES_DE_SOM, unlocked, rand, hasAudio);
  /* `doAluno` distingue o par que ELE trocou do par que o conteúdo prevê - e
     é o que autoriza, no fim, a frase "você confundia estas duas". */
  const batalha = montarBatalha(pares, Object.keys(state.confusions).length > 0, rand);
  return { batalha: { ...batalha, rodadas: [...batalha.rodadas, ...somRodadas] } };
}

function GymBest({ modeId }: { modeId: string }) {
  const p = useProgress();
  const rec = p.state.gym?.[modeId];
  if (!rec?.runs) return null;
  /* Quando foi a última vez: é o que diz qual jogo está esquecido. */
  const dias = rec.lastOn ? Math.round((Date.parse(p.day) - Date.parse(rec.lastOn)) / 864e5) : NaN;
  const quando = !Number.isFinite(dias) || dias < 0 ? null
    : dias === 0 ? tx.hoje : dias === 1 ? tx.ontem : tx.haDias(dias);
  return (
    <span className="font-ui text-[12px] text-ink-muted tabular-nums">
      {quando && tx.jogado(quando)}
      {tx.sessoes(rec.runs)}
      {rec.bestSeconds != null && tx.melhorTempoCurto(rec.bestSeconds)}
      {rec.bestSeconds == null && rec.best != null && tx.melhorPct(Math.round(rec.best * 100))}
    </span>
  );
}

function ReferenceCard({
  title, desc, simbolo, cor, onClick
}: { title: string; desc: string; simbolo: string; cor: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="hf-topico hf-topico-ref text-left flex items-center gap-3.5 min-h-[88px]">
      <span aria-hidden className={`hf-medalha ${cor}`}>{simbolo}</span>
      <span className="grid gap-1 min-w-0">
        <span className="font-display text-[15.5px] font-semibold text-ink">{title}</span>
        <span className="font-ui text-[13px] leading-relaxed text-ink-muted">{desc}</span>
      </span>
    </button>
  );
}

/* A cor da medalha de cada assunto (cartões ilustrados, parte 2). Fixa por
   assunto, e não pela posição na lista: o aluno reconhece "Vogais" pela cor. */
const COR_DO_ASSUNTO: Record<string, string> = {
  revisao: 'hf-medalha-ouro', letras: 'hf-medalha-teal', vogais: 'hf-medalha-ouro', silabas: 'hf-medalha-mar',
  palavras: 'hf-medalha-flor', fotos: 'hf-medalha-oliva', ouvir: 'hf-medalha-mar', parecidas: 'hf-medalha-terra',
  construir: 'hf-medalha-teal', 'palavras-cursiva': 'hf-medalha-flor', digitar: 'hf-medalha-oliva', relogio: 'hf-medalha-terra'
};

/* O cronômetro do modo «contra o relógio».
 * ─────────────────────────────────────────────────────────────────────────
 * O modo existia com `timed: true` no catálogo desde o começo, e a bandeira
 * não fazia nada: o tempo era medido no fim, por subtração, e o aluno jogava
 * um exercício chamado «contra o relógio» sem relógio nenhum na tela. Um
 * cronômetro que só aparece depois não apressa ninguém.
 *
 * Três decisões, e as três são sobre confiabilidade:
 *
 * · UM temporizador só. Ele nasce com a tela da rodada e morre no `return`
 *   do efeito - é isso que garante que ele não continua correndo depois de o
 *   aluno sair, e a lista de dependências com `desde` é o que garante que
 *   uma partida nova não herda o relógio da anterior. A tela da rodada é
 *   recriada a cada partida (`key` com `startedAt`), então não há acúmulo.
 *
 * · A CONTA NÃO VEM DO TIQUE. Vem de `Date.now() - desde`, que é o relógio
 *   do sistema. Um contador incrementado a cada 250 ms atrasa - o navegador
 *   suspende temporizadores em aba de fundo -, e um cronômetro que atrasa
 *   mede a atenção do navegador em vez da do aluno. O tique só serve para
 *   redesenhar.
 *
 * · Ele SOBE, e não desce. Não há tempo limite: a pressa aqui é contra o
 *   próprio tempo da última vez, e um relógio em contagem regressiva
 *   transformaria um exercício de reconhecimento num exercício de chute.
 */
function Cronometro({ desde }: { desde: number }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [desde]);

  const s = Math.max(0, Math.round((agora - desde) / 1000));
  return (
    <div className="flex items-center justify-center gap-2.5 rounded-[var(--r-md)]
                    border border-line bg-surface px-4 py-2.5">
      <span aria-hidden className="font-ui text-[15px] text-ink-muted">◷</span>
      <span className="font-ui text-[13px] uppercase tracking-[.08em] text-ink-muted">{tx.tempo}</span>
      {/* `aria-live="off"`: o número muda quatro vezes por segundo, e um
          leitor de tela que o anuncie toda vez cobre a pergunta. Quem precisa
          do tempo o encontra pelo rótulo; quem não precisa não é
          interrompido. O total aparece de novo, uma vez, no fim da rodada. */}
      <span aria-live="off"
            className="font-ui text-[18px] font-bold tabular-nums text-ink">
        {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
      </span>
    </div>
  );
}

function GymHeader({
  mode, label, onBack
}: { mode: GymMode; label: string; onBack: () => void }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      {/* Durante o jogo a tela não tinha título nenhum: quem navega por
          títulos com o leitor de tela não achava onde estava (auditoria de
          28/09, UX-013). Visualmente o nome já está no rótulo à direita. */}
      <h1 className="sr-only">{mode.titlePt}</h1>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center min-h-[44px] pr-3 font-ui text-[13px]
                   text-ink-muted hover:text-ink-body"
      >
        {tx.voltarAcademiaSeta}
      </button>
      <span className="font-ui text-[13px] text-ink-muted ml-auto">{label}</span>
    </header>
  );
}

function Empty({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  /* Com título: a tela vazia não tinha heading nenhum, e quem navega por
     títulos não achava nada (VIS-009). */
  return (
    <div className="focus-col grid gap-4">
      <h1 className="text-[23px] font-bold">{tx.semMaterialTitulo}</h1>
      <Card tone="amber" className="p-6">
        <p className="text-[15px] leading-relaxed text-ink-body">{children}</p>
      </Card>
      <Button variant="secondary" onClick={onBack} className="justify-self-start">
        {tx.voltar}
      </Button>
    </div>
  );
}

export function AcademiaLink() {
  return (
    <Link
      href="/academia"
      className="flex items-center justify-between gap-4 rounded-[var(--r-md)] border
                 border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
    >
      <span className="font-ui text-[14px] text-ink">
        {tx.linkAcademia}
      </span>
      <span aria-hidden className="text-ink-muted">→</span>
    </Link>
  );
}

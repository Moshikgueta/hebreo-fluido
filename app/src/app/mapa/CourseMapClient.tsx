'use client';

/* O mapa do curso: uma viagem, de lugar em lugar.
 * ─────────────────────────────────────────────────────────────────────────
 * Cada módulo é um lugar (components/aventura/Cenarios.tsx), ligado ao
 * seguinte por um caminho. O caminho inteiro é visível desde o começo -
 * esconder a estrada é o que faz um curso parecer infinito -, mas o peso é
 * desigual de propósito (28/10/2026, pedido do dono, "mais premium"):
 *
 *   · no topo, o próximo passo, com o que falta e o botão de continuar;
 *   · o lugar concluído encolhe numa faixa e ganha UM sinal só, o carimbo
 *     dourado no caminho (antes eram quatro: o marcador, o selo na
 *     ilustração, a palavra "Concluído" e a barra de 100%);
 *   · o lugar atual abre grande, com a ilustração viva, a barra e as letras;
 *   · o que vem fica em papel, com o caminho tracejado;
 *   · no fim, a chegada: o desafio final e o certificado.
 *
 * As letras são o que o aluno conquistou, e por isso são o maior elemento do
 * cartão. A concluída leva o visto DENTRO do quadro, junto do nome (dá para
 * ver sem distinguir cores), e não pendurado no canto por cima da letra.
 *
 * Uma forma só, do telefone ao desktop. Nada aqui é bloqueado de verdade: o
 * cadeado diz "você ainda não chegou", não "não pode entrar".
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Cenario, LUGAR, type IdDoCenario } from '@/components/aventura/Cenarios';
import { Yael } from '@/components/aventura/Yael';
import { tx as falaDaYael } from '@/i18n/telas/aventura-yael';
import { anotarVisto, lerVisto, moduloParaAnunciar } from '@/lib/desbloqueio';
import { IconeCadeado } from '@/components/shell/NavIcons';
import Link from 'next/link';
import { He } from '@/components/hebrew/He';
import { useProgress } from '@/lib/state/store';
import { allLetters, course, getLetter, type CourseModule } from '@/lib/content';
import { totalLicoes } from '@/lib/content-publico';
import { Prose } from '@/components/learn/Blocks';
import { OrdemPedagogica } from '@/components/learn/OrdemPedagogica';
import { aula0Feita, idDoJarro, isLessonComplete, isLessonMastered, letraLiberada, REGRA_DO_DOMINIO, STAGE_COUNT } from '@/lib/state/rules';
import { EstradaDoModulo, carimbosDaNota, type ParadaDaEstrada } from '@/components/aventura/EstradaDoModulo';
import { leiturasDoModulo } from '@/lib/leituras-do-curso';
import { ETAPA_AULA0, ETAPA_DO_MODULO, ETAPA_FINAL } from '@/lib/jornada';
import { flagship } from '@/lib/catalog';
import { idDoSom, ordemDeEnsino, portasDosModulos } from '@/lib/sons';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/painel-course-map-client';

/* Uma lição do caminho dentro do módulo: uma letra ou um som (Vet, Tch...). */
type Item = { id: string; he: string; nome: string; href: string };

function itensDoModulo(m: CourseModule): Item[] {
  /* Bet, Kaf, Pe e Shin têm, no mesmo módulo, a lição do outro som: o
     cartão da letra mostra o lado dela (בּ "Bet", שׁ "Shin") e o do som
     mostra o outro (ב "Vet", שׂ "Sin"). Sem isso eram dois cartões com o
     mesmo desenho. Os sons modernos ficam fora: a letra sem guéresh está em
     outro módulo. */
  const ladoDe = (letra: string) =>
    m.lessons.find(l => l.som && l.parHe && [...l.parHe][0] === letra)?.parHe;
  return m.lessons.flatMap(ls => {
    if (ls.som) {
      return [{ id: idDoSom(ls.som), he: ls.he ?? '', nome: ls.nomePt ?? ls.som, href: `/som/${ls.som}` }];
    }
    return (ls.letters ?? []).map(getLetter).filter(l => !!l)
      .map(L => {
        const lado = ladoDe(L!.letter);
        return {
          id: L!.id,
          he: lado ?? L!.letter,
          nome: lado ? L!.namePt.split('/')[0]!.trim() : L!.namePt,
          href: `/licao/${L!.id}`
        };
      });
  });
}

type Estado = 'feito' | 'agora' | 'adiante';
type Progresso = ReturnType<typeof useProgress>;

function moduloCompleto(state: Parameters<typeof isLessonComplete>[0], m: CourseModule): boolean {
  const itens = itensDoModulo(m).every(i => isLessonComplete(state, i.id));
  if (m.letterIds.length === 0) return itens && (state.lessons[m.id]?.stagesDone.length ?? 0) >= 3;
  const letras = itens;
  const cp = m.checkpoint ? !!state.checkpoints[m.checkpoint.id]?.passedAt : true;
  return letras && cp;
}

/* As lições que ainda faltam no caminho: cada letra ou som não concluído, e
   as lições de um módulo sem letras (o 6) enquanto ele não fechou. */
function licoesQueFaltam(state: Progresso['state']): number {
  let n = 0;
  for (const m of course.modules) {
    n += itensDoModulo(m).filter(i => !isLessonComplete(state, i.id)).length;
    if (m.letterIds.length === 0 && (state.lessons[m.id]?.stagesDone.length ?? 0) < 3) {
      n += m.lessons.filter(l => !l.som).length;
    }
  }
  return n;
}

/* O estado do i-ésimo módulo: antes da Aula 0 (-2) tudo vem; com o caminho
   inteiro feito (-1) tudo foi. */
function estadoDo(i: number, indiceAtual: number): Estado {
  if (indiceAtual === -2) return 'adiante';
  if (indiceAtual === -1 || i < indiceAtual) return 'feito';
  return i === indiceAtual ? 'agora' : 'adiante';
}

/* O próximo passo, o mesmo que o cartão do módulo atual leva. */
type Passo = { titulo: string; detalhe: string; href: string; rotulo: string };

function proximoPasso(p: Progresso, indiceAtual: number): Passo {
  const faltam = licoesQueFaltam(p.state);
  const detalhe = faltam ? tx.faltamLicoes(faltam) : '';
  if (indiceAtual === -2) {
    return { titulo: `${tx.aula0Curto} · ${tx.comoFunciona}`, detalhe: tx.aula0Falta, href: '/inicio', rotulo: tx.comecar };
  }
  if (indiceAtual >= 0) {
    const m = course.modules[indiceAtual]!;
    const itens = itensDoModulo(m);
    const pendente = itens.find(i => !isLessonComplete(p.state, i.id));
    if (pendente) return { titulo: tx.licaoDe(pendente.nome), detalhe, href: pendente.href, rotulo: tx.continuar };
    if (m.letterIds.length === 0) return { titulo: m.titlePt, detalhe, href: `/modulo/${m.n}`, rotulo: tx.continuar };
    return { titulo: tx.checkpointDo(m.n), detalhe: tx.faltaSoCheckpoint, href: `/checkpoint/${m.n}`, rotulo: tx.continuar };
  }
  /* O caminho inteiro feito: falta o exame, ou dominar alguma letra para ele
     abrir, ou só buscar o certificado. */
  const letras = allLetters();
  const semDominio = letras.find(l => !isLessonMastered(p.state, l.id));
  if (p.state.finalChallenge?.passedAt) {
    return { titulo: tx.certificadoPronto, detalhe: tx.finalFeito, href: '/certificado', rotulo: tx.verCertificado };
  }
  if (semDominio) {
    return { titulo: tx.dominarAntes(semDominio.namePt), detalhe: tx.dominarDetalhe(REGRA_DO_DOMINIO), href: `/licao/${semDominio.id}`, rotulo: tx.continuar };
  }
  return { titulo: ETAPA_FINAL, detalhe: tx.finalFalta, href: '/desafio-final', rotulo: tx.comecar };
}

export function CourseMapClient() {
  const p = useProgress();
  const modulos = course.modules;
  const licoes = totalLicoes();

  /* O módulo atual é o primeiro que ainda não fechou. Antes da Aula 0
     nenhum: o passo atual é ela (12/10/2026). */
  const a0 = aula0Feita(p.state);
  const indiceAtual = a0 ? modulos.findIndex(m => !moduloCompleto(p.state, m)) : -2;
  /* O lugar que abriu desde a última visita (lib/desbloqueio.ts). Só depois
     de o progresso carregar: antes dele o mapa inteiro parece trancado, e
     anotar isso apagaria a lembrança certa. */
  const atualN = indiceAtual >= 0 ? modulos[indiceAtual]!.n : indiceAtual === -2 ? 0 : null;
  const [novo, setNovo] = useState<number | null>(null);
  useEffect(() => {
    if (!p.ready || atualN == null) return;
    const n = moduloParaAnunciar(atualN, lerVisto());
    if (n != null) setNovo(n);
    anotarVisto(atualN);
  }, [p.ready, atualN]);

  const pct = Math.round(p.progress * 100);
  const passo = proximoPasso(p, indiceAtual);

  return (
    <div className="lg:rounded-[24px] lg:bg-[var(--card)] lg:border lg:border-line lg:shadow-[var(--sh)]
                    lg:p-10 lg:pb-11">
      <header className="flex items-center gap-5 mb-6">
        <div className="flex-1 min-w-0">
          <p className="font-ui text-[13px] font-semibold tracking-[.02em] text-[var(--teal-ink)] mb-1.5">
            {tx.meuCurso}
          </p>
          <h1 className="font-display text-[27px] sm:text-[31px] font-semibold leading-[1.1]
                         tracking-[-0.028em] mb-1">
            {flagship().titlePt}
          </h1>
          <p className="font-ui text-[15px] text-ink-muted">
            {fmt(tx.resumo, { modulos: modulos.length, licoes, letras: course.totalLetters })}
          </p>
        </div>
        <Anel pct={pct} />
      </header>

      {/* O próximo passo, antes do caminho: é a pergunta de quem abre o mapa. */}
      {p.ready && (
        <section aria-labelledby="proximo-passo"
                 className="relative mb-8 rounded-[20px] bg-[var(--teal-soft)] p-5 sm:p-6 grid gap-1">
          <p id="proximo-passo" className="font-ui text-[13px] font-semibold text-[var(--teal-ink)] m-0">
            {tx.proximoPasso}
          </p>
          <p className="font-display text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] text-ink m-0">
            {passo.titulo}
          </p>
          {passo.detalhe && <p className="font-ui text-[14.5px] leading-[1.5] text-ink-body m-0">{passo.detalhe}</p>}
          <Link href={passo.href}
                className="mt-3 justify-self-start inline-flex items-center gap-2 min-h-[46px] px-5 rounded-[14px]
                           bg-[var(--accent-bg)] text-white font-ui text-[15.5px] font-semibold
                           hover:brightness-110 transition-[filter]
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                           focus-visible:outline-[var(--teal)]">
            {passo.rotulo}<span aria-hidden>→</span>
          </Link>
        </section>
      )}

      <ol className="list-none p-0 m-0">
        <TrechoAula0 feita={a0} />
        {modulos.map((m, i) => {
          const estado = estadoDo(i, indiceAtual);
          /* O último lugar leva o caminho até a chegada. */
          const seguinte = i + 1 < modulos.length ? estadoDo(i + 1, indiceAtual) : 'adiante';
          return estado === 'feito'
            ? <TrechoFeito key={m.id} module={m} seguinte={seguinte} />
            : <Trecho key={m.id} module={m} estado={estado} novo={novo === m.n} />;
        })}
        <TrechoFinal />
      </ol>

      {/* Depois do caminho inteiro, e não antes: a pergunta "por que {{מ}}
          vem antes de {{ב}}?" só existe para quem acabou de VER a ordem.
          Pô-la em cima seria responder algo que o aluno ainda não perguntou,
          e empurrar o mapa - que é o assunto desta tela - para baixo. */}
      <div className="mt-8">
        <OrdemPedagogica />
      </div>
    </div>
  );
}

/* ── peças do caminho ─────────────────────────────────────────────────── */

/* O quanto do curso já foi, num anel: o número em largura fixa no meio. */
function Anel({ pct }: { pct: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <p className="relative shrink-0 w-[76px] h-[76px] m-0" role="img" aria-label={`${pct}% ${tx.concluido}`}>
      <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--sand)" strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--teal)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
                className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span aria-hidden className="absolute inset-0 grid place-items-center font-display text-[19px] font-semibold
                                  tracking-[-0.02em] text-[var(--teal-ink)] tabular-nums">
        {pct}%
      </span>
    </p>
  );
}

/* O marco no caminho: o carimbo dourado do lugar visitado, o anel do lugar
   em que o aluno está, o número do que vem, e a bandeira da chegada. */
function Marco({ estado, n, chegada = false, pequeno = false }: {
  estado: Estado; n?: number; chegada?: boolean; pequeno?: boolean;
}) {
  const tam = pequeno ? 'w-[28px] h-[28px]' : 'w-[40px] h-[40px] sm:w-11 sm:h-11';
  if (estado === 'feito') {
    return (
      <span aria-hidden className={`${tam} rounded-full grid place-items-center shrink-0 bg-[var(--gold-soft)]
                                    border-2 border-dashed border-[var(--gold)] text-[var(--gold-ink)] -rotate-6`}>
        <svg width={pequeno ? 13 : 17} height={pequeno ? 13 : 17} viewBox="0 0 18 18" fill="none">
          <path d="M3.6 9.4 7 12.8 14.4 5.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (estado === 'agora') {
    return (
      <span aria-hidden className={`${tam} relative rounded-full grid place-items-center shrink-0 bg-[var(--card)]
                                    border-2 border-[var(--teal)] hf-marco-agora`}>
        <span className="w-[12px] h-[12px] rounded-full bg-[var(--teal)]" />
      </span>
    );
  }
  return (
    <span aria-hidden className={`${tam} rounded-full grid place-items-center shrink-0 bg-[var(--paper)]
                                  border-2 border-dashed border-line font-ui text-[14px] font-semibold text-ink-muted
                                  tabular-nums`}>
      {chegada ? (
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <path d="M4.5 16V2.5M4.5 3h8.5l-2 3 2 3H4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : n}
    </span>
  );
}

/* O trecho do caminho até o próximo marco: cheio no que já foi percorrido,
   tracejado no que ainda vem. */
function Caminho({ percorrido }: { percorrido: boolean }) {
  return (
    <span aria-hidden className="flex-1 w-[2px] min-h-[22px]"
          style={{
            background: percorrido ? 'var(--teal)'
              : 'repeating-linear-gradient(to bottom, var(--line) 0 5px, transparent 5px 11px)'
          }} />
  );
}

/* Uma parada do caminho: o marco à esquerda, o conteúdo à direita. */
function Parada({ marco, caminho, children, pb = 'pb-5 sm:pb-6' }: {
  marco: ReactNode; caminho?: ReactNode; children: ReactNode; pb?: string;
}) {
  return (
    <li className="grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[52px_minmax(0,1fr)] gap-3.5 sm:gap-5">
      <div className="flex flex-col items-center">
        {marco}
        {caminho}
      </div>
      <div className={pb}>{children}</div>
    </li>
  );
}

/* ── a Aula 0, o prólogo (12/10/2026) ─────────────────────────────────────
   Ela abre a primeira letra (lib/state/rules.ts, `aula0Feita`), então mora
   no mapa como qualquer etapa. Feita, vira uma linha fina para reler; antes
   disso é o passo atual, em cartão. */
function TrechoAula0({ feita }: { feita: boolean }) {
  if (feita) {
    return (
      <Parada marco={<Marco estado="feito" pequeno />} caminho={<Caminho percorrido />} pb="pb-5">
        <p className="relative m-0 pt-0.5 font-ui text-[14.5px] text-ink-muted">
          <span className="text-ink-muted">{ETAPA_AULA0} · </span>
          <Link href="/inicio" className="font-semibold text-ink hover:underline underline-offset-2
                                         after:absolute after:inset-0 after:content-['']">
            {tx.comoFunciona}
          </Link>
          <span className="ml-2 text-[13.5px] text-[var(--teal-ink)]">{tx.reler}</span>
        </p>
      </Parada>
    );
  }
  return (
    <Parada marco={<Marco estado="agora" />} caminho={<Caminho percorrido={false} />}>
      <div className="relative rounded-[20px] border-2 border-[var(--teal)] bg-[var(--card)] p-5 sm:px-6 sm:py-[22px]
                      shadow-[var(--sh)]">
        <p className="font-ui text-[13px] font-semibold text-[var(--teal-ink)] m-0 mb-1">
          {tx.comeceAqui} · {tx.aula0Rotulo}
        </p>
        <p className="font-display text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] mb-2 text-ink">
          <Link href="/inicio" className="after:absolute after:inset-0 after:rounded-[20px] after:content-['']">
            {tx.comoFunciona}
          </Link>
        </p>
        <p className="font-ui text-[14.5px] leading-[1.5] text-ink-muted m-0">{tx.aula0Falta}</p>
      </div>
    </Parada>
  );
}

/* ── um lugar já visitado: a faixa ────────────────────────────────────────
   A ilustração estreita, o nome do lugar, o título e as letras pequenas.
   O carimbo no caminho é o único sinal de concluído. O título leva à página
   do módulo (missão, texto, prática); cada letra, à sua lição. */
function TrechoFeito({ module: m, seguinte }: { module: CourseModule; seguinte: Estado }) {
  const p = useProgress();
  const itens = itensDoModulo(m);
  const cp = m.checkpoint ? p.state.checkpoints[m.checkpoint.id] : undefined;
  const cpFeito = !!cp?.passedAt;
  const cpNota = cp?.best != null ? Math.round(cp.best * 100) : null;
  const lugar = m.n >= 1 && m.n <= 7 ? LUGAR[m.n as IdDoCenario] : null;
  return (
    <Parada marco={<Marco estado="feito" />} caminho={<Caminho percorrido={seguinte !== 'adiante'} />}>
      <div className="relative flex gap-3.5 items-stretch rounded-[18px] bg-[var(--card)] border border-[var(--line-soft)]
                      p-2.5 pr-4 transition-shadow duration-[250ms] hover:shadow-[var(--sh)]">
        {lugar && (
          <div className="relative w-[84px] sm:w-[112px] shrink-0 rounded-[12px] overflow-hidden min-h-[72px]">
            <Cenario n={m.n as IdDoCenario} />
          </div>
        )}
        <div className="min-w-0 flex-1 py-1 grid gap-1 content-center">
          <p className="font-ui text-[12.5px] text-ink-muted m-0 truncate">
            {tx.moduloLugar(m.n)}
            {lugar && <> · <He size="inline">{lugar.he}</He> {lugar.pt}</>}
          </p>
          <p className="font-display text-[17px] font-semibold tracking-[-0.015em] leading-tight text-ink m-0">
            <Link href={`/modulo/${m.n}`} className="after:absolute after:inset-0 after:rounded-[18px] after:content-['']">
              {m.titlePt}
            </Link>
          </p>
          {itens.length > 0 && (
            <p dir="rtl" className="relative z-[1] m-0 flex flex-wrap gap-x-2.5 gap-y-0.5 justify-end">
              {itens.map(L => (
                <Link key={L.id} href={L.href} title={L.nome}
                      aria-label={`${fmt(tx.abrirLicao, { nome: L.nome })}${tx.letraConcluida}`}
                      className="rounded-md px-0.5 hover:bg-[var(--teal-soft)]">
                  <He size="inline" tone="teal" className="!text-[19px] !leading-[1.25]">{L.he}</He>
                </Link>
              ))}
              {/* O checkpoint aprovado, com a nota, no fim da fileira. */}
              {m.checkpoint && cpFeito && (
                <Link href={`/checkpoint/${m.n}`}
                      aria-label={`${tx.abrirCheckpoint(m.n)}${tx.checkpointAprovado(cpNota)}`}
                      title={`${tx.checkpointRotulo}${tx.checkpointAprovado(cpNota)}`}
                      dir="ltr"
                      className="inline-flex items-center gap-1 rounded-md px-1 font-ui text-[12px] font-semibold
                                 text-[var(--gold-ink)] tabular-nums hover:bg-[var(--gold-soft)]">
                  <svg aria-hidden width="13" height="13" viewBox="0 0 20 20" fill="none">
                    <path d="M5 17V3.5M5 4h9l-2 3 2 3H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {cpNota != null ? `${cpNota}%` : tx.checkpointRotulo}
                </Link>
              )}
            </p>
          )}
        </div>
      </div>
    </Parada>
  );
}

/* ── o lugar atual, e os que vêm ──────────────────────────────────────── */
function Trecho({ module: m, estado, novo = false }: {
  module: CourseModule; estado: Estado;
  /** O lugar acabou de abrir: o cartão se anuncia (ver lib/desbloqueio.ts). */
  novo?: boolean;
}) {
  const p = useProgress();
  const cartao = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!novo) return;
    const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cartao.current?.scrollIntoView({ block: 'center', behavior: calmo ? 'auto' : 'smooth' });
  }, [novo]);
  const itens = itensDoModulo(m);
  /* A ordem de ensino, a mesma que a trava da lição usa. Calculada aqui e
     não no carregamento do arquivo: na plataforma o conteúdo das letras
     chega do servidor depois, e uma constante de módulo nasceria vazia. */
  const ordem = ordemDeEnsino(allLetters(), course.modules);
  const portas = portasDosModulos(ordem, course.modules);
  const feitas = itens.filter(i => isLessonComplete(p.state, i.id)).length;
  const extra = m.letterIds.length === 0;
  /* O módulo 7 tem as três lições de som E o fecho de três etapas. */
  const etapas = feitas + (extra ? Math.min(3, p.state.lessons[m.id]?.stagesDone.length ?? 0) : 0);
  const total = itens.length + (extra ? 3 : 0);
  const pct = total ? Math.round((etapas / total) * 100) : 0;
  const pendente = itens.find(i => !isLessonComplete(p.state, i.id));
  /* As letras todas feitas e o checkpoint ainda não (27/10/2026): o cartão
     dizia "Em andamento" ao lado de 100%, e levava de volta à primeira
     letra. Agora diz o que falta e leva até lá. */
  const faltaCheckpoint = estado === 'agora' && !extra && !pendente && !!m.checkpoint
    && !p.state.checkpoints[m.checkpoint.id]?.passedAt;
  const destino = faltaCheckpoint ? `/checkpoint/${m.n}`
    : pendente ? pendente.href : extra ? `/modulo/${m.n}` : itens[0]?.href ?? `/modulo/${m.n}`;
  /* A próxima letra a estudar, a única que ganha o anel (`hf-chama`). */
  const proxima = estado === 'agora' ? pendente?.id ?? null : null;
  const lugar = m.n >= 1 && m.n <= 7 ? LUGAR[m.n as IdDoCenario] : null;

  /* A estrada do módulo atual (05/11/2026, aprovada pelo dono): as mesmas
     letras, travas e links de sempre, desenhados em fila, com o jarro na
     metade, as leituras do módulo e o portão do checkpoint. */
  const estrada: ParadaDaEstrada[] = [];
  let jarro: 'fechado' | 'pronto' | 'aberto' = 'fechado';
  if (estado === 'agora' && !extra && itens.length) {
    const meio = Math.max(1, Math.floor(itens.length / 2));
    jarro = p.state.firsts[idDoJarro(m.id)] ? 'aberto' : feitas >= Math.ceil(itens.length / 2) ? 'pronto' : 'fechado';
    itens.forEach((L, i) => {
      const feita = isLessonComplete(p.state, L.id);
      const etapasFeitas = p.state.lessons[L.id]?.stagesDone.length ?? 0;
      const comecada = etapasFeitas > 0 && !feita;
      const bloqueada = p.ready && !feita && !comecada && !letraLiberada(p.state, ordem, L.id, portas);
      const liberada = feita || comecada || (p.ready && !bloqueada);
      const agora = p.ready && L.id === proxima && liberada;
      const estadoDaLetra = feita ? tx.letraConcluida
        : comecada ? fmt(tx.letraEtapas, { n: etapasFeitas, total: STAGE_COUNT })
        : bloqueada ? tx.letraBloqueada : agora ? tx.letraProxima : '';
      estrada.push({
        chave: L.id, tipo: L.href.startsWith('/som/') ? 'som' : 'letra', he: L.he, nome: L.nome,
        sub: L.href.startsWith('/som/') ? tx.jSomNovo : tx.jLetraNova,
        href: liberada ? L.href : null,
        estado: feita ? 'feita' : agora ? 'agora' : bloqueada ? 'trancada' : 'livre',
        rotuloAcessivel: liberada ? `${fmt(tx.abrirLicao, { nome: L.nome })}${estadoDaLetra}` : `${L.nome}${estadoDaLetra}`
      });
      if (i + 1 === meio) {
        const sub = jarro === 'aberto' ? tx.jJarroAberto : jarro === 'pronto' ? tx.jJarroPronto : tx.jJarroFechado;
        estrada.push({ chave: 'jarro', tipo: 'jarro', nome: tx.jJarro, sub, estado: jarro === 'aberto' ? 'feita' : 'livre', rotuloAcessivel: `${tx.jJarro}: ${sub}` });
      }
    });
    for (const l of leiturasDoModulo(m, p.state)) {
      estrada.push({
        chave: l.id, tipo: l.id.startsWith('pl-') ? 'leitura' : l.id.startsWith('rv-') ? 'revisao' : 'texto',
        nome: l.titulo, sub: l.desc, href: l.feita ? l.href : `/modulo/${m.n}`,
        estado: l.feita ? 'feita' : 'livre', rotuloAcessivel: `${l.titulo}${l.feita ? tx.letraConcluida : ''}`
      });
    }
    if (m.checkpoint) {
      const cp = p.state.checkpoints[m.checkpoint.id];
      const aprovado = !!cp?.passedAt;
      const nota = cp?.best != null ? Math.round(cp.best * 100) : null;
      const estadoDoCp = aprovado ? tx.checkpointAprovado(nota) : !pendente ? tx.checkpointPronto : tx.checkpointDepois;
      estrada.push({
        chave: 'checkpoint', tipo: 'checkpoint', nome: tx.checkpointRotulo,
        sub: aprovado && nota != null ? `${nota}%` : tx.checkpointDo(m.n), href: `/checkpoint/${m.n}`,
        estado: aprovado ? 'feita' : !pendente ? 'agora' : 'livre',
        rotuloAcessivel: `${tx.abrirCheckpoint(m.n)}${estadoDoCp}`, carimbos: carimbosDaNota(cp?.best, aprovado)
      });
    }
  }

  /* `--locked` e não um cinza escrito à mão (alto contraste e tema escuro);
     "Abre depois do módulo N" e não "Em breve": o módulo só espera o
     anterior (auditoria de 01/10/2026, VIS-010). */
  const situacao = estado === 'agora'
    ? (faltaCheckpoint ? tx.faltaCheckpoint : tx.emAndamento)
    : m.n === 1 ? tx.abreDepoisAula0 : fmt(tx.abreDepoisModulo, { n: m.n - 1 });

  return (
    <Parada marco={<Marco estado={estado} n={m.n} />} caminho={<Caminho percorrido={false} />}>
      {/* O cartão inteiro leva ao próximo passo do módulo, e cada letra já
          feita (ou começada) leva à SUA lição. Um link não pode morar dentro
          de outro, então o do cartão é o título, esticado sobre o cartão todo
          por um `::after`, e as letras ficam por cima dele. */}
      <div
        ref={cartao}
        className={`relative rounded-[20px] p-5 sm:px-6 sm:py-[22px] transition-shadow duration-[250ms]
          ${estado === 'agora'
            ? 'bg-[var(--card)] border-2 border-[var(--teal)] shadow-[var(--sh)]'
            /* O módulo que vem RECUA: papel, borda tracejada e o cadeado. O
               texto fica em `--ink-muted`, que passa 4,5:1 (sem `opacity`). */
            : 'bg-[var(--paper)] border border-line border-dashed hover:shadow-[var(--sh)]'}`}
      >
        {/* O lugar do módulo (28/10/2026, a aventura ilustrada). Só o
            módulo em que o aluno está se mexe; o trancado aparece desbotado.
            O desenho é decorativo: o que ele diz está no texto do cartão. */}
        {lugar && (
          <div className={`relative -mx-5 -mt-5 sm:-mx-6 sm:-mt-[22px] mb-4 overflow-hidden rounded-t-[18px]
                          ${estado === 'agora' ? 'h-[128px] sm:h-[150px]' : 'h-[72px] sm:h-[88px]'}
                          ${novo ? 'hf-desbloqueio' : ''}`}>
            <Cenario n={m.n as IdDoCenario} vivo={estado === 'agora'} trancado={estado === 'adiante'} />
            {/* O lugar que acabou de abrir: o cadeado balança e some, a cor
                volta ao desenho, a Yael chega pulando e o selo aparece. Só
                transform, opacidade e filtro, uma vez; com "reduzir
                movimento" tudo já nasce no estado final. */}
            {novo && (
              <>
                <span aria-hidden className="hf-cadeado-abre absolute inset-0 grid place-items-center">
                  <span className="grid place-items-center w-14 h-14 rounded-full bg-[var(--card)] shadow-[var(--sh)]">
                    <IconeCadeado size={26} />
                  </span>
                </span>
                <span aria-hidden className="hf-yael-chega absolute right-2 bottom-0 w-[64px] sm:w-[76px]">
                  <Yael pulando />
                </span>
                {/* Quando ela chega, fala, no céu do desenho (o chão tem o nome
                    do lugar). Para o leitor de tela vale o aviso logo abaixo. */}
                <span aria-hidden className="hf-yael-fala absolute left-3 top-2 max-w-[165px] sm:max-w-[220px]
                                 rounded-[14px] border-2 border-line bg-[var(--card)] px-2.5 py-1
                                 font-ui text-[12.5px] font-semibold leading-tight text-ink">
                  {falaDaYael.lugarNovo(lugar.pt.split(',')[0]!)}
                </span>
                <span className="hf-selo-novo absolute right-3 top-3 rounded-full bg-[var(--gold-solid)] px-3 py-1
                                 font-ui text-[12.5px] font-bold text-white shadow-[var(--sh)]">
                  {tx.lugarNovo}
                </span>
                <span className="sr-only" role="status">{tx.lugarNovoAberto(lugar.pt)}</span>
              </>
            )}
            {/* O nome do lugar é uma palavra que o aluno já lê neste módulo. */}
            {estado === 'agora' && (
              <span className="absolute left-3 bottom-2.5 inline-flex items-baseline gap-2 rounded-full
                               bg-[var(--card)]/92 pl-3 pr-3 py-0.5 shadow-[var(--sh)]">
                <span className="text-[17px] text-ink"><He size="inline">{lugar.he}</He></span>
                <span className="font-ui text-[12px] text-ink-muted">{lugar.translit} · {lugar.pt}</span>
              </span>
            )}
          </div>
        )}

        <p className={`flex items-center gap-1.5 font-ui text-[13px] m-0 mb-1
                       ${estado === 'agora' ? 'text-[var(--teal-ink)] font-semibold' : 'text-ink-muted'}`}>
          {estado === 'adiante' && (
            <svg aria-hidden width="13" height="13" viewBox="0 0 18 18" fill="none">
              <rect x="3.6" y="7.8" width="10.8" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M6.2 7.8V5.9a2.8 2.8 0 0 1 5.6 0v1.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          )}
          <span>{situacao}</span>
          <span className="text-ink-muted font-normal">· {tx.moduloLicoes(m.n, m.lessons.length)}</span>
        </p>

        <p className={`font-display text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] leading-tight mb-1
                       ${estado === 'adiante' ? 'text-ink-muted' : 'text-ink'}`}>
          <Link href={destino} className="after:absolute after:inset-0 after:rounded-[20px] after:content-['']">
            {m.titlePt}
          </Link>
        </p>
        {ETAPA_DO_MODULO[m.n] && (
          <p className="font-ui text-[14px] text-ink-muted m-0 mb-4">{ETAPA_DO_MODULO[m.n]}</p>
        )}

        {estado === 'agora' && (
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-1 h-2 rounded-full bg-[var(--sand)] overflow-hidden">
              <span className="block h-full rounded-full bg-[var(--teal)] transition-[width] duration-500"
                    style={{ width: `${pct}%` }} />
            </span>
            <span className="font-ui text-[13.5px] font-semibold text-[var(--teal-ink)] tabular-nums">{pct}%</span>
          </div>
        )}

        {itens.length === 0 ? (
          <p className="font-ui text-[14.5px] leading-[1.5] text-ink-muted">
            <Prose text={m.subPt} />
          </p>
        ) : estrada.length ? (
          <EstradaDoModulo paradas={estrada} jarro={jarro} onAbrirJarro={() => p.abrirJarro(m.id)} />
        ) : (
          /* As letras do módulo da direita para a esquerda, na ordem em que
             se aprendem (11/10/2026): `dir` no contêiner, e a ordem do HTML
             continua a do curso, para o teclado e o leitor de tela. */
          <div dir="rtl" className="flex flex-wrap gap-2.5">
            {itens.map(L => {
              const feita = isLessonComplete(p.state, L.id);
              const etapasFeitas = p.state.lessons[L.id]?.stagesDone.length ?? 0;
              const comecada = etapasFeitas > 0 && !feita;
              const aberta = feita || comecada;
              /* Cadeado na letra que a trava de progressão ainda fecha (a
                 mesma regra da lição, `letraLiberada`). A próxima a estudar
                 fica SEM cadeado, e nada aparece antes de o progresso
                 carregar - senão o mapa inteiro piscaria trancado. */
              const bloqueada = p.ready && !aberta && !letraLiberada(p.state, ordem, L.id, portas);
              const liberada = aberta || (p.ready && !bloqueada);
              const ehAProxima = p.ready && L.id === proxima && liberada;
              const estadoDaLetra = feita ? tx.letraConcluida
                : comecada ? fmt(tx.letraEtapas, { n: etapasFeitas, total: STAGE_COUNT })
                : bloqueada ? tx.letraBloqueada : ehAProxima ? tx.letraProxima : '';
              const classe = `relative z-[1] min-w-[60px] px-2 pt-2 pb-1.5 rounded-[14px] border grid justify-items-center gap-0.5
                ${liberada ? 'hover:shadow-[var(--sh)] hover:border-[var(--teal)] transition-[box-shadow,border-color]' : ''}
                ${feita ? 'bg-[var(--teal-soft)] border-[var(--edge-teal)]'
                  : comecada || ehAProxima ? 'bg-[var(--card)] border-[var(--teal)] border-2'
                  : estado === 'adiante' ? 'bg-transparent border-line border-dashed'
                  : 'bg-[var(--sand)] border-line'}
                ${ehAProxima ? 'hf-chama' : ''}`;
              /* A letra concluída leva o visto, e não só outra cor: dá para
                 ver de relance, inclusive sem distinguir cores. O visto fica
                 dentro do quadro, ao lado do nome, sem cobrir a letra. */
              const miolo = (
                <>
                  <He size="inline" tone={feita ? 'teal' : estado === 'adiante' ? 'muted' : 'navy'}
                      className="!text-[30px] !leading-[1.15]">
                    {L.he}
                  </He>
                  <span dir="ltr" className={`inline-flex items-center gap-1 font-ui text-[11px] tracking-[.02em]
                    ${feita ? 'text-[var(--teal-ink)] font-semibold' : 'text-ink-muted'}`}>
                    {feita && (
                      <svg aria-hidden width="10" height="10" viewBox="0 0 18 18" fill="none">
                        <path d="M3.6 9.4 7 12.8 14.4 5.4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {bloqueada && <span aria-hidden className="leading-none"><IconeCadeado size={11} /></span>}
                    {L.nome}
                  </span>
                </>
              );
              /* Ganha link a letra já aberta e a liberada; a trancada, com o
                 cadeado, continua sem link e é alcançada na ordem. */
              return liberada ? (
                <Link key={L.id} href={L.href} className={classe}
                      title={`${L.nome}${estadoDaLetra}`}
                      aria-current={ehAProxima ? 'step' : undefined}
                      aria-label={`${fmt(tx.abrirLicao, { nome: L.nome })}${estadoDaLetra}`}>
                  {miolo}
                </Link>
              ) : (
                <span key={L.id} className={classe} title={`${L.nome}${estadoDaLetra}`}
                      aria-label={`${L.nome}${estadoDaLetra}`}>
                  {miolo}
                </span>
              );
            })}
            {/* O checkpoint do módulo, a última peça do caminho (28/10/2026,
                pedido do dono). Aprovado: dourado, com a melhor nota. Com as
                letras feitas: o anel da vez. Antes disso fica quieto, mas
                abre - o checkpoint nunca foi trancado (ver ModuleClient). */}
            {m.checkpoint && estado !== 'adiante' && (() => {
              const cp = p.state.checkpoints[m.checkpoint!.id];
              const aprovado = !!cp?.passedAt;
              const pronto = !aprovado && !pendente;
              const estadoDoCp = aprovado
                ? tx.checkpointAprovado(cp?.best != null ? Math.round(cp.best * 100) : null)
                : pronto ? tx.checkpointPronto : tx.checkpointDepois;
              return (
                <Link href={`/checkpoint/${m.n}`}
                      title={`${tx.checkpointRotulo}${estadoDoCp}`}
                      aria-label={`${tx.abrirCheckpoint(m.n)}${estadoDoCp}`}
                      className={`relative z-[1] min-w-[60px] px-2 pt-2 pb-1.5 rounded-[14px] border grid justify-items-center gap-0.5
                                  hover:shadow-[var(--sh)] transition-[box-shadow,border-color]
                                  ${aprovado ? 'bg-[var(--gold-soft)] border-[var(--gold)]'
                                    : pronto ? 'bg-[var(--card)] border-[var(--gold)] border-2 hf-chama'
                                    : 'bg-[var(--sand)] border-line border-dashed'}`}>
                  <svg aria-hidden width="28" height="28" viewBox="0 0 20 20" fill="none"
                       className={aprovado || pronto ? 'text-[var(--gold)]' : 'text-ink-muted'}>
                    <path d="M5 17V3.5M5 4h9l-2 3 2 3H5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span dir="ltr" className={`font-ui text-[11px] tracking-[.02em] tabular-nums
                    ${aprovado ? 'text-[var(--gold-ink)] font-semibold' : 'text-ink-muted'}`}>
                    {aprovado && cp?.best != null ? `✓ ${Math.round(cp.best * 100)}%` : tx.checkpointRotulo}
                  </span>
                </Link>
              );
            })()}
          </div>
        )}
        {m.milestonePt && estado !== 'adiante' && (
          <p className="relative mt-4 font-ui text-[14px] leading-relaxed m-0 text-ink-muted">
            <strong className="font-semibold text-ink">{estado === 'feito' ? tx.metaAlcancada : tx.meta}</strong>
            <Prose text={m.milestonePt} />
          </p>
        )}
      </div>
    </Parada>
  );
}

/* ── a chegada: Meu desafio final (12/10/2026) ───────────────────────────
   Abre com as lições das 22 letras dominadas, que é a régua do exame
   (FinalChallengeClient); feito quando o exame foi aprovado. O fim do
   caminho é mostrado como chegada, com o selo do certificado. */
function TrechoFinal() {
  const p = useProgress();
  const ids = allLetters().map(l => l.id);
  const aprovado = !!p.state.finalChallenge?.passedAt;
  const aberto = ids.every(id => isLessonMastered(p.state, id));
  const estado: Estado = aprovado ? 'feito' : aberto ? 'agora' : 'adiante';
  return (
    <Parada marco={<Marco estado={estado} chegada />} pb="pb-2">
      <div className={`relative flex gap-4 items-center rounded-[20px] p-5 sm:px-6 sm:py-[22px] transition-shadow duration-[250ms]
        hover:shadow-[var(--sh)]
        ${estado === 'agora' ? 'bg-[var(--card)] border-2 border-[var(--teal)] shadow-[var(--sh)]'
          : estado === 'adiante' ? 'bg-[var(--paper)] border border-line border-dashed'
          : 'bg-[var(--gold-soft)] border border-[var(--gold)]'}`}>
        <SeloDoCertificado ativo={estado !== 'adiante'} />
        <div className="min-w-0 flex-1">
          <p className={`font-ui text-[13px] m-0 mb-1 ${estado === 'adiante' ? 'text-ink-muted' : 'text-[var(--teal-ink)] font-semibold'}`}>
            {tx.chegada} · {estado === 'feito' ? tx.aprovado : estado === 'agora' ? tx.disponivel : tx.abreQuando}
          </p>
          <p className="font-display text-[19px] sm:text-[21px] font-semibold tracking-[-0.02em] mb-1.5 text-ink">
            <Link href={estado === 'feito' ? '/certificado' : '/desafio-final'}
                  className="after:absolute after:inset-0 after:rounded-[20px] after:content-['']">
              {ETAPA_FINAL}
            </Link>
          </p>
          <p className="font-ui text-[14.5px] leading-[1.5] text-ink-muted m-0">
            {estado === 'feito' ? tx.finalFeito : tx.finalFalta}
          </p>
        </div>
      </div>
    </Parada>
  );
}

/* O selo do certificado, desenhado: um círculo com a fita, sem texto
   (o que ele diz está no cartão). */
function SeloDoCertificado({ ativo }: { ativo: boolean }) {
  const cor = ativo ? 'var(--gold)' : 'var(--line)';
  return (
    <svg aria-hidden width="52" height="60" viewBox="0 0 52 60" fill="none" className="shrink-0">
      <path d="M17 36 11 58l9-5 5 7 4-20M35 36l6 22-9-5-5 7-4-20" fill={ativo ? 'var(--gold-soft)' : 'none'} stroke={cor} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="26" cy="24" r="20" fill={ativo ? 'var(--gold-soft)' : 'var(--paper)'} stroke={cor} strokeWidth="1.8" />
      <circle cx="26" cy="24" r="14.5" stroke={cor} strokeWidth="1.2" strokeDasharray="2.5 2.5" />
      <path d="M19.5 24.5 24 29l9-9.5" stroke={cor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CourseMapNotFound() {
  return <p className="font-ui text-[15px] text-ink-muted">{tx.naoEncontrado}</p>;
}

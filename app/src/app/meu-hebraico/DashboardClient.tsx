'use client';

/* Meu Hebraico - o painel do aluno.
 * ─────────────────────────────────────────────────────────────────────────
 * Responde a uma pergunta - "o que eu faço hoje?" - e responde com UMA ação
 * principal, porque fadiga de decisão é o que faz curso de auto-estudo não
 * terminar.
 *
 * Desde que a plataforma tem conta, ele responde a uma segunda pergunta logo
 * abaixo: "e depois?". A prateleira de cursos fica no fim, nunca no topo. Um
 * painel que abre com quatro cursos à venda é uma loja; o aluno que entrou
 * hoje quer a aula de hoje.
 */

import { somPt } from '@/lib/som-pt';
import Link from 'next/link';
import { useMemo } from 'react';
import { He } from '@/components/hebrew/He';
import { Card, Badge, Skeleton } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { CartaoCurso, PlanoDeHoje } from '@/components/platform/Painel';
import { flagship } from '@/lib/catalog';
import { TesteFinalCard } from '@/components/game/TesteFinal';
import { useProgress } from '@/lib/state/store';
import { allLetters, course, getLetter, getModule } from '@/lib/content';
import { Prose } from '@/components/learn/Blocks';
import { alphabetComplete, aula0Feita, isExtraModuleDone, isLessonComplete, LIBERA_MARK, needsWarmUp, porQueTrancada, revisaoAbreEm } from '@/lib/state/rules';
import { useAccount } from '@/lib/account/store';
import { OfertaProximoCurso } from '@/components/platform/ProximoPasso';
import { AccessNotice } from '@/components/platform/AccessNotice';
import { TrilhaDoModulo } from '@/components/platform/TrilhaDoModulo';
import { InstalarApp } from '@/components/platform/InstalarApp';
import { desafioFeitoHoje } from '@/lib/desafio-feito';
import { primeiraLeituraId } from '@/lib/laboratorio';
import { resumoDoDominio } from '@/lib/dominio';
import { ehContraste, idDoSom, nomeDaLicao, ordemDeEnsino, portasDosModulos, rotaDaLicao, soOLadoDoPonto } from '@/lib/sons';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/painel-dashboard-client';
import { tx as txRevisao } from '@/i18n/telas/revisao-entre-modulos';
import { passosDaPorta } from '@/components/learn/PortaDoModulo';

/** Itens vencidos a partir dos quais o painel sugere revisar antes da lição. */
export const REVISAO_URGENTE = 15;

export function DashboardClient() {
  const p = useProgress();
  const account = useAccount();


  /* Where to pick up: the first lesson that is not finished, in course order.
     A checkpoint interrupts when its whole module is done and it is not. */
  const next = useMemo(() => {
    for (const m of course.modules) {
      /* As lições do módulo na ordem do plano: letras e lições de som (Vet
         logo depois de Bet, Tch/Dj/J antes do fecho do módulo 7). */
      for (const ls of m.lessons) {
        if (ls.som && !isLessonComplete(p.state, idDoSom(ls.som))) {
          return { kind: 'som' as const, som: ls.som, nome: ls.nomePt ?? ls.som, lesson: ls.n, module: m };
        }
        for (const id of ls.letters ?? []) {
          if (!isLessonComplete(p.state, id)) {
            return { kind: 'letter' as const, letter: getLetter(id)!, module: m };
          }
        }
      }
      /* Modules 6 and 7 teach no letter but are not optional: they are where
         reading without nikud starts. They sit in the sequence, in order. */
      if (!m.letterIds.length) {
        if (!isExtraModuleDone(p.state, m.id)) {
          return { kind: 'extra' as const, module: m };
        }
        continue;
      }
      for (const id of m.letterIds) {
        if (!isLessonComplete(p.state, id)) {
          return { kind: 'letter' as const, letter: getLetter(id)!, module: m };
        }
      }
      if (m.checkpoint && !p.state.checkpoints[m.checkpoint.id]?.passedAt) {
        return { kind: 'checkpoint' as const, checkpoint: m.checkpoint, module: m };
      }
    }
    return { kind: 'done' as const };
  }, [p.state]);

  /* A próxima lição pode estar trancada: a anterior foi concluída com nota
     abaixo de LIBERA_MARK. Aí o cartão principal aponta para TERMINAR a
     anterior, nunca para a porta trancada (auditoria de 01/10/2026, UXQA-002). */
  const terminar = useMemo(() => {
    const id = next.kind === 'letter' ? next.letter.id : next.kind === 'som' ? idDoSom(next.som) : null;
    if (!id) return null;
    const ordem = ordemDeEnsino(allLetters(), course.modules);
    const porque = porQueTrancada(p.state, ordem, id, portasDosModulos(ordem, course.modules));
    /* Antes da Aula 0 o cartão principal já é ela (`aula0Primeiro`). A
       revisão entre módulos já é o próximo passo do painel (`checkpoint`). */
    if (!porque || porque.falta === 'aula0' || porque.falta === 'revisao') return null;
    return {
      id: porque.anterior,
      nome: nomeDaLicao(porque.anterior, allLetters(), course.modules),
      nota: porque.nota
    };
  }, [next, p.state]);

  /* As leituras que faltam para abrir o módulo seguinte (03/11/2026): a
     revisão já aprovada, a próxima lição trancada pelas leituras. O cartão
     principal aponta para a primeira que falta. */
  const ler = useMemo(() => {
    const id = next.kind === 'letter' ? next.letter.id : next.kind === 'som' ? idDoSom(next.som) : null;
    if (!id) return null;
    const ordem = ordemDeEnsino(allLetters(), course.modules);
    const porque = porQueTrancada(p.state, ordem, id, portasDosModulos(ordem, course.modules));
    if (porque?.falta !== 'revisao' || porque.faltaCheckpoint) return null;
    const passo = passosDaPorta(porque).find(x => !x.feito);
    return passo ? { ...passo, proximo: porque.modulo! + 1 } : null;
  }, [next, p.state]);

  /* A Aula 0 é a ação principal enquanto não foi CONCLUÍDA (desde 11/10/2026
     ela é obrigatória e abre a primeira letra). Depois, a lição. */
  const aula0Primeiro = !aula0Feita(p.state);

  /* O primeiro módulo de letras concluído cuja Primeira Leitura ainda não
     foi feita. Um por vez: quem chega com três módulos prontos lê o primeiro. */
  const primeiraPendente = useMemo(() => course.modules.find(m => m.kind === 'letters'
    && m.letterIds.length > 0
    && m.letterIds.every(id => isLessonComplete(p.state, id))
    && !p.state.firsts?.[primeiraLeituraId(m.n)]) ?? null, [p.state]);

  /* O checkpoint que abre o módulo seguinte pode estar esperando o dia de
     amanhã (03/11/2026, `revisaoAbreEm`): o cartão diz isso. */
  const revisaoAmanha = useMemo(() => {
    if (next.kind !== 'checkpoint') return false;
    const ordem = ordemDeEnsino(allLetters(), course.modules);
    const porta = [...portasDosModulos(ordem, course.modules).values()].find(x => x.checkpoint === next.checkpoint.id);
    return !!porta && revisaoAbreEm(p.state, porta) !== null;
  }, [next, p.state]);

  const dominio = useMemo(() => resumoDoDominio(p.state, allLetters().map(l => l.id)), [p.state]);

  const alfabetoFechado = alphabetComplete(p.state, allLetters().map(l => l.id));

  /* Lições concluídas: uma lição do curso são as cinco etapas de uma letra,
     e os módulos sem letra contam pelas três etapas próprias. */
  const licoesFeitas = Object.values(p.state.lessons)
    .filter(l => (l?.stagesDone.length ?? 0) >= 5).length;


  if (!p.ready) return <DashboardSkeleton />;

  if (!p.state.onboarding) {
    return (
      <div className="grid gap-6">
        <Welcome />
      </div>
    );
  }

  /* O nome do onboarding manda, e não o da conta: é o apelido que a pessoa
     escolheu para este curso, e ela pode ter aberto a conta com o nome
     completo por causa da nota fiscal. O da conta é a reserva. */
  const name = p.state.onboarding.name?.trim()
    || account.session?.account.name.trim().split(/\s+/)[0]
    || '';

  /* A frase de orientação do topo: onde a pessoa está e o que vem agora. */
  const totalLetras = course.totalLetters;
  const orientacao = aula0Primeiro
    ? tx.orientaAula0
    : ler
      ? fmt(txRevisao.paraAbrir(ler.proximo), { nome: ler.nome })
    : terminar
      ? fmt(tx.orientaTerminar, { nome: terminar.nome })
      : next.kind === 'letter'
        ? (p.mastered === 0
            ? fmt(tx.orientaPrimeira, { nome: next.letter.namePt })
            : fmt(tx.orientaLetra, { n: p.mastered, total: totalLetras, nome: next.letter.namePt }))
        : next.kind === 'som'
          ? fmt(tx.orientaSom, {
              n: p.mastered, total: totalLetras,
              licao: ehContraste(next.som) ? next.nome.toLowerCase() : fmt(tx.oSom, { nome: next.nome })
            })
          : next.kind === 'checkpoint'
            ? fmt(tx.orientaCheckpoint, { n: next.module.n })
            : next.kind === 'extra'
              ? fmt(tx.orientaExtra, { n: next.module.n, titulo: next.module.titlePt })
              : tx.orientaFim;

  /* A lição do plano de hoje: a mesma do botão principal. */
  const licaoDeHoje = aula0Primeiro ? { nome: tx.hojeAula0, href: '/inicio' }
    : ler ? { nome: ler.nome, href: ler.href }
    : terminar ? { nome: terminar.nome, href: rotaDaLicao(terminar.id) }
    : next.kind === 'letter' ? { nome: next.letter.namePt, href: `/licao/${next.letter.id}` }
    : next.kind === 'som' ? { nome: next.nome, href: `/som/${next.som}` }
    : next.kind === 'checkpoint' ? { nome: fmt(tx.hojeCheckpoint, { n: next.module.n }), href: `/checkpoint/${next.module.n}` }
    : next.kind === 'extra' ? { nome: fmt(tx.hojeModulo, { n: next.module.n }), href: `/modulo/${next.module.n}` }
    : null;

  return (
    <div className="grid gap-6 sm:gap-8">
      {/* A boas-vindas (28/10/2026, pedido do dono: "feia e sem informação
          que oriente"). Data, saudação e UMA frase que diz em que ponto do
          curso a pessoa está e o que vem agora. O detalhe do dia fica no
          "Seu plano de hoje", logo abaixo do botão principal. */}
      <header className="grid gap-1">
        <p className="m-0 font-ui text-[13px] font-semibold uppercase tracking-[.1em] text-[var(--accent)]">
          {hojePorExtenso()}
        </p>
        <h1 className="m-0 font-display text-[28px] sm:text-[32px] font-semibold leading-[1.1] tracking-[-0.028em]">
          {greeting()}{name ? `, ${name}` : ''}.
        </h1>
        <p className="m-0 font-ui text-[16px] sm:text-[16.5px] leading-snug text-ink-body max-w-[52ch]">
          {orientacao}
        </p>
      </header>

      <AccessNotice />

      {/* Coming back after a gap: three questions on what was slipping, before
          anything new. A learner who has been away for a week and is handed a
          brand-new letter spends the lesson quietly discovering they have
          forgotten the last one. */}
      {/* E também quando a revisão acumulou (11/10/2026): com REVISAO_URGENTE
          itens vencidos, a letra nova vai em cima de letras que estão
          escapando. A ação principal continua sendo a lição; isto vem antes
          dela, como sugestão. */}
      {(needsWarmUp(p.state, p.day) || p.dueCount >= REVISAO_URGENTE) && (
        <Card tone="mint" className="p-5 sm:p-6 grid sm:grid-cols-[1fr_auto] items-center gap-4">
          <div className="grid gap-1">
            <p className="font-display text-[18px] font-bold text-ink">{tx.revisarTitulo}</p>
            <p className="font-ui text-[14px] leading-relaxed text-ink-body">
              {needsWarmUp(p.state, p.day)
                ? tx.revisarAusente
                : tx.revisarItens(p.dueCount)}
            </p>
          </div>
          <LinkButton href="/revisao" className="justify-self-start sm:justify-self-end">
            {tx.revisarAgora}
          </LinkButton>
        </Card>
      )}

      {/* The primary action, alone and unmissable. */}
      <section aria-labelledby="continuar">
        <h2 id="continuar" className="sr-only">{tx.continuarAprendendo}</h2>
        {aula0Primeiro && (
          <div className="grid gap-2">
            <CartaoCurso
              kicker={tx.antesDaPrimeira}
              titulo={tx.comoFunciona}
              sub={tx.aula0Sub}
              pct={p.progress}
              href="/inicio"
              cta={tx.aula0Cta}
              modulo={1}
            />
          </div>
        )}

        {!aula0Primeiro && terminar && (
          <CartaoCurso
            kicker={tx.emAndamento}
            titulo={flagship().titlePt}
            sub={fmt(tx.terminarSub, { nome: terminar.nome, pct: Math.round(LIBERA_MARK * 100) })
              + (terminar.nota != null ? fmt(tx.melhorNota, { nota: Math.round(terminar.nota * 100) }) : '')}
            pct={p.progress}
            href={rotaDaLicao(terminar.id)}
            cta={fmt(tx.terminarCta, { nome: terminar.nome })}
            modulo={next.kind !== 'done' ? next.module.n : undefined}
          />
        )}

        {!aula0Primeiro && ler && next.kind !== 'done' && (
          <CartaoCurso
            kicker={tx.emAndamento}
            titulo={flagship().titlePt}
            sub={txRevisao.lerSub(ler.proximo)}
            pct={p.progress}
            href={ler.href}
            cta={txRevisao.irPara(ler.nome)}
            modulo={next.module.n}
          />
        )}

        {!aula0Primeiro && !terminar && !ler && next.kind === 'letter' && (
          <CartaoCurso
            kicker={tx.emAndamento}
            titulo={flagship().titlePt}
            sub={fmt(tx.letraSub, {
              modulo: next.module.n, licao: next.letter.lesson, nome: next.letter.namePt,
              som: somPt(soOLadoDoPonto(next.letter).sound)
            })}
            pct={p.progress}
            href={`/licao/${next.letter.id}`}
            cta={(p.state.lessons[next.letter.id]?.stagesDone.length ?? 0) > 0
              ? tx.continuarAprendendo : tx.comecarLicao}
            modulo={next.module.n}
            letra={next.letter.letraComPonto ?? next.letter.letter}
          />
        )}

        {!aula0Primeiro && !terminar && !ler && next.kind === 'som' && (
          <CartaoCurso
            kicker={tx.emAndamento}
            titulo={flagship().titlePt}
            sub={fmt(tx.somSub, {
              modulo: next.module.n, licao: next.lesson,
              nome: ehContraste(next.som) ? next.nome.toLowerCase() : fmt(tx.oSom, { nome: next.nome })
            })}
            pct={p.progress}
            href={`/som/${next.som}`}
            cta={(p.state.lessons[idDoSom(next.som)]?.stagesDone.length ?? 0) > 0
              ? tx.continuarAprendendo : tx.comecarLicao}
            modulo={next.module.n}
          />
        )}

        {next.kind === 'checkpoint' && (
          <CartaoCurso
            kicker={fmt(tx.checkpointKicker, { n: next.module.n })}
            titulo={next.module.titlePt}
            sub={fmt(tx.checkpointSub, { n: next.module.letterIds.length })
              + (revisaoAmanha ? ` ${txRevisao.abreAmanha}` : '')}
            pct={p.progress}
            href={`/checkpoint/${next.module.n}`}
            cta={tx.checkpointCta}
            modulo={next.module.n}
          />
        )}

        {next.kind === 'extra' && (
          <CartaoCurso
            kicker={fmt(tx.moduloKicker, { n: next.module.n })}
            titulo={next.module.titlePt}
            sub={tx.extraSub}
            pct={p.progress}
            href={`/modulo/${next.module.n}`}
            cta={(p.state.lessons[next.module.id]?.stagesDone.length ?? 0) > 0
              ? tx.continuarAprendendo : tx.comecarModulo}
            modulo={next.module.n}
          />
        )}

        {next.kind === 'done' && (
          <CartaoCurso
            kicker={tx.fimKicker}
            titulo={tx.fimTitulo}
            sub={tx.fimSub}
            pct={1}
            href="/desafio-final"
            cta={tx.fimCta}
            modulo={7}
          />
        )}
      </section>

      {/* O caminho do módulo (28/10/2026): as letras dele, tocáveis. */}
      {!aula0Primeiro && <TrilhaDoModulo />}

      <PlanoDeHoje licao={licaoDeHoje} semDesafio={!aula0Primeiro} />

      {/* Três atalhos de prática, numa fileira (28/10/2026). Antes eram
          quatro cartões de jogo e um teste final, a duas telas daqui. */}
      {!aula0Primeiro && (
        <section aria-labelledby="praticar" className="grid gap-2.5 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="praticar" className="m-0 font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">
              {tx.praticarPoucos}
            </h2>
            <Link href="/academia" className="inline-flex items-center min-h-[44px] font-ui text-[13px] text-[var(--teal-ink)] hover:underline">
              {tx.verTudo}
            </Link>
          </div>
          <ul className="min-w-0 grid grid-cols-3 gap-2.5 list-none p-0 m-0">
            {([
              ['/academia?treino=desafio', desafioFeitoHoje(p.state, p.day) ? '✓' : '5', tx.atalhoDesafio,
                desafioFeitoHoje(p.state, p.day) ? tx.atalhoDesafioFeito : tx.atalhoDesafioTempo],
              ['/academia?treino=flashcards-letras', 'א', tx.atalhoFlashcards, tx.atalhoFlashcardsDesc],
              ['/leituras', 'אב', tx.atalhoLeitura, tx.atalhoLeituraDesc]
            ] as const).map(([href, icone, titulo, desc]) => (
              <li key={href} className="min-w-0">
                <Link href={href}
                      className="h-full grid justify-items-center content-start gap-1 text-center rounded-[16px] border border-line
                                 bg-[var(--card)] px-2 py-3.5 transition-[box-shadow,border-color,transform] duration-[200ms]
                                 hover:shadow-[var(--sh)] hover:border-[var(--teal)] active:scale-[.96]">
                  <span aria-hidden className="grid place-items-center w-11 h-11 rounded-full bg-[var(--teal-soft)] text-[var(--teal-ink)]
                                               font-ui text-[17px] font-bold">
                    {/[א-ת]/.test(icone) ? <He size="inline" tone="teal">{icone}</He> : icone}
                  </span>
                  <span className="font-display text-[14.5px] font-semibold leading-tight text-ink [overflow-wrap:anywhere]">{titulo}</span>
                  <span className="font-ui text-[12px] leading-tight text-ink-muted">{desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* O curso como app no celular, depois da primeira letra (28/10/2026).
          Some de vez com "Agora não". */}
      {!aula0Primeiro && licoesFeitas > 0 && <InstalarApp variante="cartao" />}

      {/* A Primeira Leitura do módulo que acabou de fechar (11/10/2026). */}
      {!aula0Primeiro && primeiraPendente && !ler && (
        <Card tone="wash" className="p-5 grid gap-2.5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="grid gap-1 min-w-0">
            <Badge tone="accent">{tx.primeiraBadge}</Badge>
            <p className="font-display text-[17px] font-semibold text-ink mt-1">
              {fmt(tx.primeiraTitulo, { n: primeiraPendente.n })}
            </p>
            <p className="text-[14.5px] leading-relaxed text-ink-body">
              {tx.primeiraTexto}
            </p>
          </div>
          <LinkButton href={`/leitura?primeira=${primeiraPendente.n}`} className="shrink-0">{tx.lerAgora}</LinkButton>
        </Card>
      )}

      {/* A aula 0, e o peso dela muda com o momento.
          ──────────────────────────────────────────────────────────────
          Para quem ainda não abriu lição nenhuma é um cartão de verdade,
          logo abaixo da ação principal: as cinco coisas que ninguém explica
          a um brasileiro antes da primeira letra - para que lado se lê, por
          que as vogais não são letras, por que uma letra muda de desenho no
          fim da palavra, e como o curso funciona.

          Para quem já começou vira uma linha discreta, porque aí é consulta
          e não caminho. Em nenhum dos dois casos ela é obrigatória. */}
      {aula0Primeiro ? null : licoesFeitas === 0 ? (
        <Card className="p-5 grid gap-2.5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="grid gap-1 min-w-0">
            <Badge tone="accent">{tx.antesDaPrimeira}</Badge>
            <p className="font-display text-[17px] font-semibold text-ink mt-1">
              {tx.comoFunciona}
            </p>
            <p className="text-[14.5px] leading-relaxed text-ink-body">
              {tx.comoFuncionaTexto}
            </p>
          </div>
          <LinkButton href="/inicio" variant="secondary" className="shrink-0">{tx.lerAgora}</LinkButton>
        </Card>
      ) : null}


      {/* A Aula 0 para reler, numa linha (o mapa também a tem). O painel
          precisa linkar /inicio: é a regra da varredura do curso. */}
      {!aula0Primeiro && licoesFeitas > 0 && (
        <p className="font-ui text-[13.5px] text-ink-muted">
          {tx.reler(t => (
            <Link href="/inicio" className="inline-flex items-center min-h-[44px] hover:text-[var(--accent)] underline underline-offset-2">
              {t}
            </Link>
          ))}
        </p>
      )}

      {/* O pedido de depoimento (29/09/2026), só depois de seis lições - antes
          disso a pessoa ainda não tem o que contar. Discreto e sem troca:
          nada de XP ou desconto por depoimento. Ver /depoimento. */}
      {licoesFeitas >= 6 && (
        <p className="font-ui text-[13.5px] text-ink-muted">
          {tx.depoimento(t => (
            <Link href="/depoimento" className="hover:text-[var(--accent)] underline underline-offset-2">
              {t}
            </Link>
          ))}
        </p>
      )}

      {/* Os números numa faixa só (28/10/2026, painel mais curto): o que já
          foi feito, e a porta para o Progresso, onde ficam o domínio, as
          palavras que você lê, a semana e o seu nome. Um zero não informa
          nada e desanima: o número aparece quando há o que contar. */}
      {licoesFeitas > 0 && (
        <Link href="/conquistas"
              className="flex items-center gap-4 rounded-[16px] border border-line
                         bg-[var(--card)] px-4 py-3.5 transition-[box-shadow,border-color] duration-[200ms]
                         hover:shadow-[var(--sh)] hover:border-[var(--teal)]">
          <MiniNumero n={p.mastered} rotulo={p.mastered === 1 ? tx.licaoConcluida : tx.licoesConcluidas} />
          {dominio.contagem.dominada > 0 && (
            <MiniNumero n={dominio.contagem.dominada} rotulo={dominio.contagem.dominada === 1 ? tx.letraDominada : tx.letrasDominadas} />
          )}
          {p.streak > 0 && <MiniNumero n={p.streak} rotulo={p.streak === 1 ? tx.diaSeguido : tx.diasSeguidos} />}
          <span aria-hidden className="ml-auto font-ui text-[18px] text-[var(--teal-ink)]">→</span>
          <span className="sr-only">{tx.verSeuProgresso}</span>
        </Link>
      )}

      {/* O teste final só aparece quando importa: com o alfabeto fechado. */}
      {alfabetoFechado && <TesteFinalCard compacto />}

      {/* A oferta do curso seguinte aparece num momento só: quando as 22
          letras estão fechadas. Antes disso o aluno está no meio de uma
          coisa, e vender a próxima no meio da atual é o que faz o painel de
          um curso pago parecer um panfleto. Depois disso "e agora?" é a
          pergunta que ele mesmo está fazendo. */}
      {alfabetoFechado && <OfertaProximoCurso />}

    </div>
  );
}

function MiniNumero({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <span className="grid gap-0.5 min-w-0">
      <span className="font-display text-[22px] font-semibold leading-none text-[var(--teal-ink)] tabular-nums">{n}</span>
      <span className="font-ui text-[12px] leading-tight text-ink-muted">{rotulo}</span>
    </span>
  );
}

function hojePorExtenso(): string {
  const t = new Date().toLocaleDateString(tx.localeDaData, { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return tx.bomDia;
  if (h < 19) return tx.boaTarde;
  return tx.boaNoite;
}

/* A primeira vez depois da compra.
 *
 * Não é mais uma página de vendas - quem chega aqui já pagou, e repetir o
 * argumento de venda para quem já comprou soa a cobrança. O texto diz o que
 * vai acontecer agora e manda para o onboarding, que é onde a pessoa escolhe
 * o nome e a meta diária. */
function Welcome() {
  const m1 = getModule(1);
  /* O caminho até a primeira letra, em três passos (28/10/2026): quem acabou
     de pagar quer saber o que acontece agora e quanto tempo leva. */
  const caminho = [
    { t: tx.passo1Titulo, d: tx.passo1Texto },
    { t: tx.passo2Titulo, d: tx.passo2Texto },
    { t: m1 ? fmt(tx.passo3Titulo, { titulo: m1.titlePt }) : tx.passo3Reserva, d: tx.passo3Texto }
  ];
  return (
    <>
      <section aria-labelledby="bem-vindo"
               className="relative overflow-hidden rounded-[20px] bg-[var(--navy)] text-white px-6 py-8 sm:px-10 sm:py-11 grid gap-6">
        <span aria-hidden className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(70% 140% at 92% 0%, rgba(143,214,200,.2), transparent 60%)' }} />
        <div className="relative grid gap-3">
          <p className="m-0 font-ui text-[12.5px] font-bold uppercase tracking-[.14em] text-[var(--teal-lite)]">
            {tx.bemVindo}
          </p>
          <h1 id="bem-vindo" className="m-0 text-white text-[30px] sm:text-[38px] font-bold leading-[1.12]">
            {tx.liberado}
          </h1>
          <p className="m-0 text-[16.5px] leading-relaxed text-white max-w-[48ch]">
            {/* O "22" estava escrito à mão aqui. É o mesmo defeito que pôs dois
                números diferentes na vitrine: letra e lição são grandezas
                parecidas, e a cópia manual erra em silêncio. */}
            {fmt(tx.boasVindasTexto, { letras: course.totalLetters, modulos: course.modules.length })}
          </p>
        </div>
        <div aria-hidden className="relative flex justify-center gap-3 py-1">
          {['מ', 'ת', 'א', 'נ', 'ה', 'י'].map((l, k) => (
            <span key={l} className="animate-rise" style={{ animationDelay: `${k * 90}ms` }}>
              <He size="lg" className="text-white/85">{l}</He>
            </span>
          ))}
        </div>
        <div className="relative">
          <LinkButton href="/onboarding" size="lg" full className="!bg-white !text-[var(--navy)] sm:!w-auto">
            {tx.comecar}
          </LinkButton>
        </div>
      </section>

      <Card className="p-6 sm:p-7 grid gap-4">
        <h2 className="m-0 font-display text-[19px] font-semibold text-ink">{tx.oQueVem}</h2>
        <ol className="grid gap-4 list-none p-0 m-0">
          {caminho.map((c, k) => (
            <li key={c.t} className="grid grid-cols-[auto_1fr] gap-3.5 items-start">
              <span aria-hidden
                    className="grid place-items-center w-8 h-8 rounded-full bg-[var(--teal-soft)]
                               text-[var(--teal-ink)] font-ui text-[14px] font-bold tabular-nums">{k + 1}</span>
              <span className="grid gap-0.5">
                <span className="font-ui text-[15.5px] font-semibold text-ink">{c.t}</span>
                <span className="font-ui text-[14px] leading-relaxed text-ink-body">{c.d}</span>
              </span>
            </li>
          ))}
        </ol>
        {m1 && (
          <p className="m-0 border-t border-[color:var(--line-soft)] pt-4 text-[14.5px] leading-relaxed text-ink-body">
            <Prose text={m1.milestonePt} />
          </p>
        )}
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-[132px] w-full rounded-[var(--r-lg)]" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Skeleton className="h-[148px] rounded-[var(--r-lg)]" />
        <Skeleton className="h-[148px] rounded-[var(--r-lg)]" />
      </div>
    </div>
  );
}

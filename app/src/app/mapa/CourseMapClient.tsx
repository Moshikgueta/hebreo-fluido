'use client';

/* O mapa do curso: uma viagem, de lugar em lugar.
 * ─────────────────────────────────────────────────────────────────────────
 * No topo, o próximo passo, com o que falta e o botão de continuar. Embaixo,
 * desde 06/11/2026 (pedido do dono: "a melhor experiência com o mapa"), o
 * caminho inteiro numa estrada só (components/aventura/EstradaDoModulo.tsx):
 * a Aula 0, cada módulo com a faixa do lugar dele presa no topo enquanto se
 * rola por ele, todas as etapas, e o desafio final. A Yael anda até a etapa
 * de agora, e a página rola com ela e abre onde o aluno está. Tocar numa
 * etapa abre o cartão dela. O caminho inteiro é visível desde o começo -
 * esconder a estrada é o que faz um curso parecer infinito -, e o cadeado diz
 * "você ainda não chegou", não "não pode entrar".
 */

import { useEffect, useState } from 'react';
import { anotarVisto, lerVisto, moduloParaAnunciar } from '@/lib/desbloqueio';
import Link from 'next/link';
import { useProgress } from '@/lib/state/store';
import { allLetters, course } from '@/lib/content';
import { totalLicoes } from '@/lib/content-publico';
import { OrdemPedagogica } from '@/components/learn/OrdemPedagogica';
import { aula0Feita, isLessonComplete, isLessonMastered, REGRA_DO_DOMINIO } from '@/lib/state/rules';
import { EstradaDoModulo } from '@/components/aventura/EstradaDoModulo';
import { itensDoModulo, moduloCompleto, useEstradaDoCurso } from '@/components/aventura/estrada-do-modulo';
import { ETAPA_FINAL } from '@/lib/jornada';
import { flagship } from '@/lib/catalog';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/painel-course-map-client';

type Progresso = ReturnType<typeof useProgress>;

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
  const estrada = useEstradaDoCurso();

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

      {/* O caminho inteiro numa estrada só (06/11/2026, pedido do dono): a
          Aula 0, cada módulo com a faixa do lugar dele, e o desafio final. */}
      <EstradaDoModulo itens={estrada} pronto={p.ready} onAbrirJarro={id => p.abrirJarro(id)} seguir novo={novo} />

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

export function CourseMapNotFound() {
  return <p className="font-ui text-[15px] text-ink-muted">{tx.naoEncontrado}</p>;
}

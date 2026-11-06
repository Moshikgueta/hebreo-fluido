'use client';

/* As peças do painel, no desenho do design.
 * ─────────────────────────────────────────────────────────────────────────
 * O cartão navy, os quatro números, o cartão de revisão em gold e o gráfico
 * da semana. Todos leem o progresso real - nenhum número aqui é ilustração.
 *
 * O gráfico da semana merece uma nota, porque o dado não é óbvio: o estado
 * guarda `units`, que são blocos de VINTE SEGUNDOS de prática, e não minutos.
 * Contar questões respondidas seria mentir para baixo - a maior parte do que
 * se faz numa lição (traçar, ler em voz alta, ouvir) não é uma alternativa
 * marcada. Então minutos = units / 3, e é o mesmo número que alimenta a meta
 * diária.
 */

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { He } from '@/components/hebrew/He';
import { Card } from '@/components/ui/Card';
import { useProgress } from '@/lib/state/store';
import { allLetters, getLetter } from '@/lib/content';
import { desafioFeitoHoje } from '@/lib/desafio-feito';
import { tx } from '@/i18n/telas/conta-painel';
import { Cenario, LUGAR, type IdDoCenario } from '@/components/aventura/Cenarios';
import { Yael, YaelDiz } from '@/components/aventura/Yael';
import { falaDaSemana, resumoDaSemana } from '@/lib/resumo-da-semana';

/* ── o cartão do curso ──────────────────────────────────────────────────── */
export function CartaoCurso({
  kicker, titulo, sub, pct, href, cta, modulo, letra
}: {
  kicker: string; titulo: string; sub: string; pct: number; href: string; cta: string;
  /** O lugar do módulo em que o aluno está (28/10/2026): o cartão abre com
   *  o desenho dele, vivo, e a Yael. Sem ele, o cartão de sempre. */
  modulo?: number;
  /** A letra da vez, grande, ao lado do título. */
  letra?: string;
}) {
  /* A barra começa em zero e cresce depois de montada: o movimento é o que
     diz "você avançou até aqui". Pintada já no lugar final, ela é só uma
     barra. 260ms é o tempo de a tela assentar antes de ela partir. */
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setLargura(pct), 260);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-[var(--navy)] px-6 py-7 sm:px-[30px] sm:pb-[26px] sm:pt-[30px]">
      <span aria-hidden className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(70% 140% at 92% 0%, rgba(143,214,200,.18), transparent 60%)' }} />
      {modulo != null && modulo >= 1 && modulo <= 7 && (
        <div aria-hidden className="relative -mx-6 -mt-7 sm:-mx-[30px] sm:-mt-[30px] mb-5 h-[112px] sm:h-[150px] overflow-hidden">
          <Cenario n={modulo as IdDoCenario} vivo />
          <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--navy)] to-transparent" />
          <span className="absolute left-4 top-3 rounded-full bg-[var(--card)]/92 px-3 py-0.5 font-ui text-[12.5px] font-semibold text-ink shadow-[var(--sh)]">
            {tx.moduloELugar(modulo, LUGAR[modulo as IdDoCenario].pt.split(',')[0]!)}
          </span>
          <span className="absolute right-3 bottom-1 w-[58px] sm:w-[70px]"><Yael /></span>
        </div>
      )}
      <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="font-ui text-[13px] font-bold uppercase tracking-[.1em] text-[var(--teal-lite)] mb-2.5">
            {kicker}
          </p>
          <div className="flex items-center gap-3.5 mb-1.5">
            {letra && (
              <span aria-hidden className="shrink-0 grid place-items-center w-[60px] h-[60px] rounded-[16px] bg-white/10 border border-white/15">
                <He size="lg" tone="lite">{letra}</He>
              </span>
            )}
            <p className="m-0 font-display text-[22px] sm:text-[25px] font-semibold tracking-[-0.025em] text-white">
              {titulo}
            </p>
          </div>
          <p className="font-ui text-[15.5px] text-white/[.66] mb-5">{sub}</p>
          <div className="flex items-center gap-3.5 max-w-[420px]">
            <span className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden"
                  role="progressbar" aria-valuenow={Math.round(pct * 100)}
                  aria-valuemin={0} aria-valuemax={100} aria-label={tx.progressoNoCurso}>
              <span className="block h-full rounded-full transition-[width] duration-[1200ms] ease-[var(--ease-fill)]"
                    style={{ width: `${Math.round(largura * 100)}%`,
                             background: 'linear-gradient(90deg,var(--teal),var(--teal-lite))' }} />
            </span>
            <span className="font-ui text-[15px] font-bold text-white tabular-nums">
              {Math.round(pct * 100)}%
            </span>
          </div>
        </div>
        <Link href={href}
              className="justify-self-start sm:justify-self-end inline-flex items-center justify-center
                         rounded-[13px] bg-white text-[var(--navy)] font-ui font-semibold text-[16.5px]
                         px-[26px] py-[15px] whitespace-nowrap
                         transition-transform duration-[180ms] hover:-translate-y-[2px]">
          {cta}
        </Link>
      </div>
    </div>
  );
}

/* ── os quatro números ──────────────────────────────────────────────────── */
export function CartaoNumero({
  n, rotulo, tom = 'teal', icone
}: { n: ReactNode; rotulo: string; tom?: 'teal' | 'gold' | 'neutro'; icone: ReactNode }) {
  const FUNDO = {
    teal: 'bg-[var(--teal-soft)] text-[var(--teal-ink)]',
    gold: 'bg-[var(--gold-soft)] text-[var(--gold)]',
    neutro: 'bg-[var(--sand)] text-ink-muted'
  } as const;
  return (
    <Card className="p-5">
      <span aria-hidden className={`mb-2.5 w-[30px] h-[30px] rounded-[9px] grid place-items-center ${FUNDO[tom]}`}>
        {icone}
      </span>
      <p className="font-display text-[26px] sm:text-[29px] font-semibold tracking-[-0.03em] leading-none text-ink tabular-nums">
        {n}
      </p>
      <p className="font-ui text-[14px] text-ink-muted mt-1">{rotulo}</p>
    </Card>
  );
}

/* ── revisar ────────────────────────────────────────────────────────────── */
export function CartaoRevisao() {
  const p = useProgress();
  if (p.dueCount === 0) return null;

  const letras = p.weak.map(id => getLetter(id)).filter(l => !!l).slice(0, 5);
  const minutos = Math.max(3, Math.round(p.dueCount * 0.8));

  return (
    <Card tone="ember" className="p-6">
      <p className="flex items-center gap-2.5 mb-3">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M17 7A7.5 7.5 0 1 0 18 10.5" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M17 3.2V7h-3.8" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-display text-[18px] font-semibold tracking-[-0.018em] text-[var(--gold-ink)]">
          {tx.horaDeRevisar}
        </span>
      </p>
      <p className="font-ui text-[15.5px] leading-[1.55] text-[var(--gold-body)] mb-4">
        {/* `dueCount` conta ITENS da fila, não letras (VIS-004): "2 letras"
            com uma letra só na lista era a contagem errada com a palavra errada. */}
        {p.dueCount === 1
          ? tx.umItem
          : tx.nItens(p.dueCount)}{' '}
        {tx.levaCerca(minutos)}
      </p>
      {letras.length > 0 && (
        <div className="flex flex-wrap gap-[7px] mb-[18px]">
          {letras.map(l => (
            <span key={l!.id} title={l!.namePt}
                  className="w-[38px] h-[38px] rounded-[11px] bg-[var(--card)] grid place-items-center">
              <He size="inline" tone="navy" className="!text-[22px] !leading-none">{l!.letter}</He>
            </span>
          ))}
        </div>
      )}
      <Link href="/revisao"
            className="inline-flex items-center rounded-[12px] bg-[var(--gold-solid)] text-white
                       font-ui font-semibold text-[15.5px] px-[22px] py-3
                       transition-transform duration-[180ms] hover:-translate-y-[2px]">
        {tx.comecarRevisao}
      </Link>
    </Card>
  );
}

/* ── a semana ───────────────────────────────────────────────────────────── */
const DIA = tx.diasDaSemana;

export function CartaoSemana() {
  const p = useProgress();
  /* O resumo dos sete dias terminando hoje (lib/resumo-da-semana.ts): o
     tempo por dia, os dias com estudo, as letras e as palavras novas, e o
     comentário da Yael. Só lê o progresso. */
  const hoje = p.day;
  const r = resumoDaSemana(p.state, hoje, allLetters());
  const { fala, humor } = falaDaSemana(r);
  const teto = Math.max(...r.dias.map(d => d.units), 1);
  const h = Math.floor(r.minutos / 60);

  return (
    <Card className="p-6 grid gap-5">
      <div>
        <p className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink mb-1">{tx.suaSemana}</p>
        <p className="font-ui text-[14px] text-ink-muted m-0">
          {r.minutos === 0 ? tx.nadaEstudado : tx.estudados(h, r.minutos % 60)}
        </p>
      </div>
      <YaelDiz humor={humor} tamanho={60}>
        {fala === 'palavras' ? tx.falaPalavras(r.palavrasNovas) : fala === 'ritmo' ? tx.falaRitmo : fala === 'quieta' ? tx.falaQuieta : tx.falaContinua}
      </YaelDiz>
      <dl className="grid grid-cols-3 gap-2 m-0">
        {([[r.diasEstudados, tx.diasDeEstudo], [r.letras.length, tx.letrasNovas], [r.palavrasNovas, tx.palavrasNovas]] as const).map(([n, rotulo]) => (
          <div key={rotulo} className="grid gap-0.5 rounded-[var(--r-md)] bg-[var(--sand)] px-3 py-2.5 text-center">
            <dd className="m-0 font-display text-[24px] font-bold tabular-nums text-ink">{n}</dd>
            <dt className="font-ui text-[12px] leading-tight text-ink-muted">{rotulo}</dt>
          </div>
        ))}
      </dl>
      {r.letras.length > 0 && (
        <p className="m-0 flex flex-wrap items-center gap-2" aria-label={r.letras.map(l => l.namePt).join(', ')}>
          {r.letras.map(l => (
            <span key={l.id} aria-hidden className="grid place-items-center w-10 h-10 rounded-[12px] bg-[var(--teal-soft)]">
              <He size="inline">{l.letter}</He>
            </span>
          ))}
        </p>
      )}
      <div className="flex items-end gap-[9px] h-[92px]">
        {r.dias.map((d, i) => {
          const eHoje = d.chave === hoje;
          const altura = d.units === 0 ? 4 : Math.max(8, Math.round((d.units / teto) * 100));
          return (
            <div key={d.chave} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span
                className="w-full rounded-[7px] transition-[height] duration-700 ease-[var(--ease-fill)]"
                style={{
                  height: `${altura}%`,
                  background: d.units === 0 ? '#EDEAE2' : eHoje ? 'var(--teal)' : 'var(--edge-teal)'
                }}
              />
              <span className={`font-ui text-[12px] ${eHoje ? 'font-bold text-[var(--teal-ink)]' : 'text-ink-muted'}`}>
                {DIA[d.dow] ?? DIA[i]}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* Os ícones dos quatro números. Traço, 16px, herdando a cor do selo. */
export const IconeLetras = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15.5 10 4l6 11.5M6.4 11.6h7.2" stroke="currentColor" />
  </svg>
);
export const IconeLicoes = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" />
  </svg>
);
export const IconeRevisar = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 6.6A6.6 6.6 0 1 0 17 10M16 3v3.6h-3.6" stroke="currentColor" />
  </svg>
);
export const IconeTempo = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="6.8" stroke="currentColor" />
    <path d="M10 6.2V10l2.6 1.8" stroke="currentColor" />
  </svg>
);

/* ── o plano de hoje (28/10/2026, pedido do dono) ──────────────────────────
   "A boas-vindas está feia e sem informação que oriente." O painel dizia
   "Boa noite, Ana. Continue de onde você parou." e mais nada: o aluno não
   sabia quanto estudar, se a revisão estava em dia, nem se a sequência
   estava garantida. Agora são três linhas, cada uma com um estado que se vê
   de longe (o círculo cheio é feito), e as três leem o progresso real:

     · a meta do dia, em minutos (os mesmos `units` da meta e da sequência);
     · a lição: concluída hoje, ou a próxima;
     · a revisão: em dia, ou quantos itens esperam.

   Nada aqui é ação principal: o botão grande continua sendo o do cartão
   navy, logo acima. */
export function PlanoDeHoje({ licao, semDesafio = false }: {
  licao: { nome: string; href: string } | null;
  /** O painel mostra o desafio nos atalhos; aqui ele sairia repetido. */
  semDesafio?: boolean;
}) {
  const p = useProgress();
  const minutos = Math.floor(p.goalUnits / 3);
  const alvo = Math.max(1, Math.round(p.goalTargetToday / 3));
  const metaFeita = p.goalUnits >= p.goalTargetToday;
  const licaoHoje = Object.values(p.state.lessons)
    .some(l => l?.completedAt?.slice(0, 10) === p.day);
  const revisaoEmDia = p.dueCount === 0;

  const linhas: { feito: boolean; titulo: string; detalhe: string; href?: string; acao?: string }[] = [
    {
      feito: metaFeita,
      titulo: metaFeita ? tx.metaCumprida : tx.metaDoDia(alvo),
      detalhe: metaFeita
        ? (p.streak > 0 ? tx.sequenciaGarantida(p.streak) : tx.amanhaContinua)
        : tx.minutosHoje(minutos, alvo) + (p.streak > 0 ? tx.cumpraParaManter(p.streak) : '')
    },
    licaoHoje
      ? { feito: true, titulo: tx.licaoFeita, detalhe: licao ? tx.aProxima(licao.nome) : tx.bomTrabalho }
      : { feito: false, titulo: licao ? tx.licao(licao.nome) : tx.licaoDeHoje,
          detalhe: tx.umaLicaoLeva, href: licao?.href, acao: tx.abrir },
    revisaoEmDia
      ? { feito: true, titulo: tx.revisaoEmDia, detalhe: tx.nadaEsperando }
      : { feito: false, titulo: tx.revisaoItens(p.dueCount),
          detalhe: tx.tresMinutos, href: '/revisao', acao: tx.revisar }
  ];
  const feitos = linhas.filter(l => l.feito).length;

  return (
    <Card className="p-5 sm:p-6 grid gap-4">
      <div className="flex items-center gap-4">
        <AnelDaMeta fracao={Math.min(1, p.goalUnits / Math.max(1, p.goalTargetToday))} minutos={minutos} />
        <div className="grid gap-0.5 min-w-0">
          <h2 className="m-0 font-display text-[19px] font-semibold tracking-[-0.018em] text-ink">{tx.seuPlano}</h2>
          <p className="m-0 font-ui text-[14px] text-ink-muted tabular-nums">
            {feitos === linhas.length ? tx.tudoFeito : tx.feitosDe(feitos, linhas.length)}
          </p>
        </div>
      </div>
      {/* Só o que falta (06/11/2026, painel mais curto): o que já foi feito
          está na conta "N de 3 feitos" logo acima. */}
      {feitos < linhas.length && (
      <ul className="grid gap-1 list-none p-0 m-0">
        {linhas.filter(l => !l.feito).map(l => (
          <li key={l.titulo} className="flex items-center gap-3 rounded-[12px] py-2">
            <span aria-hidden
                  className={`shrink-0 grid place-items-center w-7 h-7 rounded-full border-2 text-[14px] font-bold
                              ${l.feito ? 'bg-[var(--teal)] border-[var(--teal)] text-white' : 'border-[var(--line)] text-transparent'}`}>
              ✓
            </span>
            <span className="grid min-w-0 flex-1">
              <span className={`font-ui text-[15px] font-semibold ${l.feito ? 'text-ink-muted' : 'text-ink'}`}>
                <span className="sr-only">{l.feito ? tx.feito : tx.aFazer}</span>{l.titulo}
              </span>
              <span className="font-ui text-[13.5px] leading-snug text-ink-muted">{l.detalhe}</span>
            </span>
            {l.href && l.acao && (
              <Link href={l.href}
                    className="shrink-0 inline-flex items-center min-h-[44px] px-3 rounded-[10px] font-ui text-[14px]
                               font-semibold text-[var(--teal-ink)] hover:bg-[var(--teal-soft)]">
                {l.acao} →
              </Link>
            )}
          </li>
        ))}
      </ul>
      )}
      {/* O desafio do dia fica FORA da conta "N de 3": é opcional, e não
          fazê-lo não deixa nada por fazer (28/10/2026). */}
      {!semDesafio && p.state.lessons && Object.keys(p.state.lessons).length > 0 && (
        desafioFeitoHoje(p.state, p.day)
          ? <p className="m-0 font-ui text-[13.5px] text-ink-muted border-t border-[color:var(--line-soft)] pt-3">{tx.desafioFeito}</p>
          : <Link href="/academia?treino=desafio"
                  className="flex items-center justify-between gap-3 border-t border-[color:var(--line-soft)] pt-3 min-h-[44px]
                             font-ui text-[14px] text-[var(--teal-ink)] font-semibold hover:underline">
              <span>{tx.desafioOpcional}</span>
              <span aria-hidden>→</span>
            </Link>
      )}
    </Card>
  );
}

/* O anel da meta: começa vazio e enche depois de montado, como a barra do
   cartão navy. Só `stroke-dashoffset`, que não mexe no layout. */
function AnelDaMeta({ fracao, minutos }: { fracao: number; minutos: number }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setF(fracao), 260);
    return () => clearTimeout(t);
  }, [fracao]);
  const r = 24, c = 2 * Math.PI * r;
  return (
    <span className="relative shrink-0 grid place-items-center w-[60px] h-[60px]">
      <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden className="-rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--teal)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - f)}
                style={{ transition: 'stroke-dashoffset 1100ms var(--ease-fill, ease-out)' }} />
      </svg>
      <span className="absolute grid justify-items-center leading-none font-ui text-ink tabular-nums">
        <span className="text-[15px] font-bold">{minutos}</span>
        <span className="text-[10px] text-ink-muted">{tx.min}</span>
      </span>
    </span>
  );
}

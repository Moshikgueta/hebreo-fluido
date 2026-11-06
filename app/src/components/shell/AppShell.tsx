'use client';

/* The shell, in two shapes.
 * ─────────────────────────────────────────────────────────────────────────
 * Below 1024px the course is a single column with a bottom bar under the
 * thumb - the phone is where most of the studying happens, and that layout is
 * not a compromise.
 *
 * At 1024px and up it becomes a desk: a persistent sidebar carrying navigation
 * AND standing progress, and a content area wide enough to put things side by
 * side. That is the real argument for a desktop version - not more pixels for
 * the same column, but more of the course visible at once. On a phone the
 * question is "what now?"; at a desk it is "where am I in this?", and the
 * sidebar answers that without a click.
 *
 * What does NOT change with width: the reading measure. Prose stays near 65
 * characters and the Hebrew stays large. A 1100px line of Portuguese is harder
 * to read than a 600px one, and the Hebrew is the subject at every size.
 */

import { CompartilharConquista } from '@/components/learn/CompartilharConquista';
import { podeCompartilhar } from '@/lib/compartilhar';
import { RedesSociais } from './RedesSociais';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { carregarManifesto } from '@/lib/audio-registro';
import { useProgress } from '@/lib/state/store';
import { ITENS, saldo } from '@/lib/loja';
import { XPIndicator } from '@/components/game/Game';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ACHIEVEMENTS } from '@/lib/state/rules';
import { Logo } from '@/components/shell/Logo';
import { He } from '@/components/hebrew/He';
import {
  IconeHoje, IconeMapa, IconePraticar, IconeConquistas, IconePerfil, IconeRecompensas
} from '@/components/shell/NavIcons';
import { useAccount } from '@/lib/account/store';
import { FLAGSHIP } from '@/lib/catalog';
import { DemoNotice } from '@/components/shell/DemoNotice';
import { SessaoCaiu } from '@/components/shell/SessaoCaiu';
import { tx } from '@/i18n/telas/conta-app-shell';

/* A navegação, e ONDE cada item aparece no telefone.
 * ─────────────────────────────────────────────────────────────────────────
 * "Hoje" é /meu-hebraico e não mais "/": desde que existe site público, a
 * raiz é a página de vendas, e o painel do aluno tem endereço próprio.
 *
 * O campo `movel` existe porque antes disto a barra de baixo era
 * `NAV.slice(0, 5)` - uma regra de POSIÇÃO. Ela funcionava por acidente: o
 * sexto item por acaso era o perfil, que no telefone já mora no cabeçalho.
 * Um item novo inserido em qualquer lugar antes do fim empurrava outro para
 * fora da barra, e nada reclamava: a tela do desktop continuava completa, e
 * só o telefone perdia um destino. Agora cada item DIZ onde aparece, e
 * `varrer-curso.mjs` compara os dois conjuntos num navegador de verdade.
 *
 *   'barra' - na barra inferior, sob o polegar, e na sidebar
 *   'conta' - no cabeçalho do telefone, como a inicial da conta, e na sidebar
 *   'cabecalho' - no cabeçalho do telefone, como ícone, e na sidebar
 */
/* Quatro portas (28/10/2026, decisão do dono: "o caminho do estudante
   simples e fácil de navegar"). Eram seis ou sete na barra do telefone, com
   rótulos de 10,5 px, e o aluno tinha de saber a diferença entre Revisão,
   Praticar e Palavras. Agora cada porta é uma pergunta:
     Hoje      - o que eu faço agora?
     Curso     - onde estou no caminho? (o mapa, as lições e a Aula 0)
     Praticar  - quero treinar (revisão, flashcards, jogos, leitura, palavras)
     Progresso - o que eu já conquistei? (diário, coleção, conquistas)
   Nenhuma página saiu: Revisão e Palavras abrem pelo alto de Praticar, e a
   Aula 0 pelo topo do mapa e pelo botão principal de Hoje. `secao` diz quais
   endereços acendem cada porta. */
const NAV = [
  { href: '/meu-hebraico', label: tx.navHoje, icon: IconeHoje, movel: 'barra', secao: [] },
  { href: '/mapa', label: tx.navCurso, icon: IconeMapa, movel: 'barra',
    secao: ['/inicio', '/licao', '/som', '/extra', '/modulo', '/checkpoint', '/desafio-final', '/concluido'] },
  { href: '/academia', label: tx.navPraticar, icon: IconePraticar, movel: 'barra',
    secao: ['/revisao', '/vocabulario', '/leitura', '/leituras', '/hebraico-na-rua', '/meu-nome', '/teclado-hebraico', '/bonus', '/nikud-biblico'] },
  { href: '/conquistas', label: tx.navProgresso, icon: IconeConquistas, movel: 'barra',
    secao: ['/historia', '/certificado', '/meu-hebraico/dominio'] },
  /* Perfil mora na sidebar no desktop; no telefone ele é a inicial da conta
     no cabeçalho, que diz de relance EM QUAL conta a pessoa está. */
  /* Recompensas (27/09/2026): um ícone próprio, a pedido do dono do curso.
     No telefone ele é o presente do cabeçalho, ao lado do XP que ele gasta. */
  { href: '/loja', label: tx.navRecompensas, icon: IconeRecompensas, movel: 'cabecalho', secao: [] },
  { href: '/perfil', label: tx.navPerfil, icon: IconePerfil, movel: 'conta', secao: [] }
] as const;

/** A porta acesa: a própria página, ou uma página da seção dela. */
function portaAtiva(pathname: string | null, item: (typeof NAV)[number]): boolean {
  if (isActive(pathname, item.href)) return true;
  const aqui = (pathname ?? '/').replace(/\/+$/, '') || '/';
  return item.secao.some(base => aqui === base || aqui.startsWith(`${base}/`));
}

/**
 * Is this nav item the page we are on?
 *
 * The export uses directory-style URLs (`trailingSlash: true`), so the browser
 * reports `/mapa/` while the link says `/mapa` - and a plain equality check
 * therefore matched nothing but the home page. Every screen except the
 * dashboard was rendering with no item marked current, in the sidebar and in
 * the bottom bar, and with no `aria-current` for a screen reader either.
 */
/* Pré-carregar as rotas da navegação só para quem tem o curso (28/10/2026).
   As rotas do curso passam pelo portão, e o Next pré-carrega todo link que
   aparece na tela: enquanto a sessão não respondia, ou numa conta que ainda
   não tem o curso (o PIX esperando, em /perfil), cada link virava um 403 no
   servidor. Para o aluno com o curso nada muda: depois de a sessão responder,
   o pré-carregamento volta. É a mesma regra do LinkButton (components/ui). */
function usePreCarregar(): false | undefined {
  const account = useAccount();
  return account.ready && account.signedIn && account.can(FLAGSHIP) ? undefined : false;
}

export function isActive(pathname: string | null, href: string): boolean {
  const here = (pathname ?? '/').replace(/\/+$/, '') || '/';
  const target = href.replace(/\/+$/, '') || '/';
  return here === target;
}

export function AppShell({ children }: { children: ReactNode }) {
  const p = useProgress();
  const preCarregar = usePreCarregar();
  const pathname = usePathname();
  const { remember } = p;

  useEffect(() => { if (pathname) remember(pathname); }, [pathname, remember]);
  /* Os clipes gravados pelo painel depois da build (lib/audio-registro.ts). */
  useEffect(() => { void carregarManifesto(); }, []);

  const avisos = (
    <>
      <DemoNotice />
      <SessaoCaiu />
      {!p.persistent && (
        <Card tone="ember" className="p-4 mb-4">
          <p className="font-ui text-[13px] leading-relaxed text-[var(--gold-body)]">
            {tx.armazenamentoBloqueado}
          </p>
        </Card>
      )}
      {/* O que ainda não subiu.
          ─────────────────────────────────────────────────────────────────
          Um aviso que só aparece quando há conta E a última gravação não foi
          aceita pelo servidor. Ele diz o que é verdade e para de dizer: o
          trabalho está no aparelho, e vai subir sozinho. Não é erro, não pede
          ação, e por isso não é vermelho.
          Sem isto, quem estuda no avião e nunca mais abre o app naquele
          celular só descobre a diferença abrindo o notebook e achando menos
          do que deixou. */}
      {p.ready && !p.sincronizado && (
        <Card tone="ember" className="p-4 mb-4">
          <p className="font-ui text-[13px] leading-relaxed text-[var(--gold-body)]">
            {tx.naoSincronizado}
          </p>
        </Card>
      )}
    </>
  );

  return (
    /* `data-plataforma` é a fronteira do tema escuro.
       ────────────────────────────────────────────────────────────────────
       O escuro vale nas telas do aluno e não na vitrine (ver a nota do modo
       escuro em styles/tokens.css), e o CSS descobre onde está por
       `html:has([data-plataforma])`. A marca é posta aqui, na casca do aluno,
       porque é exatamente ela que define "isto é a plataforma" - o mesmo
       lugar que já decide se há sidebar ou barra do polegar.

       Ela vem no HTML GERADO, e não é acrescentada pelo React depois: o
       `:has()` casa já na primeira pintura, junto com o carimbo do script de
       arranque, e por isso não existe lampejo claro antes de a página montar.
       Numa navegação para o site público a marca simplesmente sai do
       documento, e a página volta a ser clara sozinha. */
    <div data-plataforma className="min-h-[100dvh] flex flex-col">
      {/* No telefone o topo carrega a marca e a conta; a navegação fica
          embaixo, sob o polegar. Num desktop o cabeçalho some inteiro: a
          sidebar navy já carrega marca, navegação e perfil, e uma segunda
          barra em cima seria a mesma informação duas vezes. */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-[color:var(--line-soft)]
                         bg-[color-mix(in_srgb,var(--cream)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 h-[60px] flex items-center justify-between gap-4">
          {/* Abaixo de 380 px só o quadrado ע: a 360 px o nome passava por
              baixo do "◆ XP" (auditoria de 01/10, VIS-003). O site público
              já faz o mesmo abaixo de sm. */}
          <Link href="/meu-hebraico" prefetch={preCarregar} className="flex items-center min-w-0 min-h-[44px] -ml-1 pl-1 pr-2 rounded-md">
            <span className="min-[380px]:hidden"><Logo size={30} words={false} /></span>
            <span className="hidden min-[380px]:inline-flex min-w-0"><Logo size={30} /></span>
            <span className="sr-only min-[380px]:hidden">{tx.marca}</span>
          </Link>
          <div className="flex items-center gap-4">
            {/* O XP leva às Recompensas (27/09/2026): é onde ele vale alguma coisa. */}
            {p.ready && (
              <Link href="/loja" prefetch={preCarregar} aria-label={tx.xpAbrirRecompensas(p.state.xp)}
                    className="inline-flex items-center min-h-[40px] px-1.5 rounded-[var(--r-md)] hover:bg-surface-2">
                <XPIndicator xp={p.state.xp} />
              </Link>
            )}
            {/* E o ícone próprio delas. O ponto dourado: há saldo para trocar
                pelo item mais barato - como o ponto da Revisão na barra. */}
            {p.ready && (
              <Link href="/loja" prefetch={preCarregar} aria-label={tx.navRecompensas}
                    aria-current={isActive(pathname, '/loja') ? 'page' : undefined}
                    className={`relative inline-grid place-items-center w-[40px] h-[40px] rounded-full hover:bg-surface-2
                      ${isActive(pathname, '/loja') ? 'text-[var(--accent)] bg-[var(--accent-wash)]' : 'text-ink-muted'}`}>
                <IconeRecompensas size={21} />
                {saldo(p.state) >= Math.min(...Object.values(ITENS).map(i => i.custo)) && (
                  <span aria-hidden className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-[var(--gold)]" />
                )}
              </Link>
            )}
            <ProfileLink />
          </div>
        </div>
      </header>

      <div className="flex-1 w-full mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-7 lg:py-8">
        {/* O quadro do design: sidebar e conteúdo dentro de um cartão só, com
            canto de 24px e a sombra padrão. Abaixo de lg ele se desfaz - num
            telefone, uma moldura de cartão em volta da tela inteira é só
            perda de largura. */}
        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:rounded-[24px]
                        lg:bg-[var(--card)] lg:border lg:border-line lg:shadow-[var(--sh)]
                        lg:overflow-hidden">
          <Sidebar pathname={pathname} />
          {/* O espaço embaixo é do TAMANHO DA BARRA, e o `pb` não divide
              classe com nenhum `py`.
              ──────────────────────────────────────────────────────────
              Estava `py-6 sm:py-8 … pb-[92px]`, e a partir de 640px o
              `sm:py-8` vencia: a media query vem depois na folha gerada,
              e um `py` sobrescreve o `pb` sem aviso. O resultado, medido:
              32px de espaço para uma barra de 60px. O último botão de cada
              página - "Continuar para as palavras", os cartões dos módulos
              6 e 7, "Ver todos os cursos" - terminava POR BAIXO da
              navegação fixa, e o toque ia para o link da barra em vez de
              para o botão. Só sumia acima de 1024px, onde a barra não
              existe, que é exatamente onde ninguém testa com o dedo.

              Agora o topo é `pt-*` e o rodapé é `pb-*`: eles não se
              cruzam mais, e `app/toque.mjs` mede a tela de verdade. */}
          <main id="hf-principal" data-foco={ROTAS_DE_FOCO.test(pathname ?? '') ? '' : undefined}
                className="min-w-0 pt-6 sm:pt-8 lg:px-9 lg:pt-[34px]
                           pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-10">
            {avisos}
            {children}
            <RodapeDeAjuda />
          </main>
        </div>
      </div>

      <BottomBar pathname={pathname} />

      {p.pending.length > 0 && (
        <AchievementToast ids={p.pending.map(a => a.id)} onClose={p.clearPending} />
      )}
    </div>
  );
}

/* ── o modo foco (06/11/2026, pedido do dono: "a melhor experiência") ─────
   Numa lição, num checkpoint, no desafio final, na revisão, numa estação de
   Um dia em Israel e dentro de um jogo, a tela é só daquilo: o rodapé de ajuda e o aviso de direitos somem
   (styles: `html:has([data-foco])`). A barra de navegação fica, e a ajuda e o
   aviso continuam em todas as outras telas do curso. A marca d'água fica
   sempre. Os jogos da Academia, que moram na mesma rota do menu, marcam o
   foco com `useModoFoco` enquanto estão abertos. */
/* As estações de Um dia em Israel também (06/11/2026, pedido do dono); o
   mapa do dia, /um-dia-em-israel, continua com o rodapé. */
const ROTAS_DE_FOCO = /^\/(licao|som|checkpoint|desafio-final|revisao|um-dia-em-israel\/[a-z-]+)(\/|$)/;

/** Põe a tela em modo foco enquanto `ativo` for verdade. */
export function useModoFoco(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    document.documentElement.dataset.foco = '';
    return () => { delete document.documentElement.dataset.foco; };
  }, [ativo]);
}

/* ── a saída de emergência ───────────────────────────────────────────────
   Medido em 22/09/2026, listando todo link visível das telas do curso: de
   dentro do curso NÃO havia caminho nenhum para suporte, dúvidas, termos,
   privacidade ou reembolso. Eles existem, e estavam ligados só ao site de
   vendas - que é exatamente o lugar onde quem já comprou nunca mais entra.
   O único contato era um endereço de e-mail solto no perfil.

   Quem trava numa lição, quem quer cancelar ou quem tem uma dúvida de
   cobrança tinha de adivinhar o endereço do site para pedir ajuda. É o mesmo
   defeito da aula 0, na parte que mais custa: a pessoa que precisa de socorro
   é a que menos deveria ter de procurar.

   Fica no rodapé de TODA tela do curso, no fim do conteúdo e dentro do
   mesmo <main>, por dois motivos. É onde a convenção da web manda procurar
   ajuda e o que lá está não disputa atenção com a lição. E, por ser uma
   marcação só - e não uma para o telefone e outra para o computador -, ele
   não tem como aparecer numa largura e faltar na outra.

   Some na impressão: numa folha impressa da lição, uma fileira de links é
   tinta gasta. */
function RodapeDeAjuda() {
  return (
    <footer className="hf-rodape-ajuda print:hidden mt-10 pt-5 border-t border-[color:var(--line-soft)]">
      <nav aria-label={tx.ajudaEInformacoes}>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 list-none p-0 m-0">
          {[
            ['/suporte', tx.precisaDeAjuda],
            ['/faq', tx.duvidasFrequentes],
            ['/reembolso', tx.reembolso],
            ['/termos', tx.termos],
            ['/privacidade', tx.privacidade],
            ['/acessibilidade', tx.acessibilidade]
          ].map(([href, label]) => (
            <li key={href}>
              {/* Alvo de 44px de altura também aqui: um link de 13px em cima
                  da barra fixa é o tipo de alvo que se erra com o polegar. */}
              <Link href={href!} prefetch={false}
                    className="inline-flex items-center min-h-[44px] font-ui text-[13px]
                               text-ink-muted hover:text-[var(--accent)] hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <RedesSociais classe="mt-1" />
    </footer>
  );
}

/* ── a mesa: a coluna navy ──────────────────────────────────────────────
   248px, fundo navy, do topo ao pé do quadro. O item ativo é um retângulo
   de branco a 12% com o ícone em teal claro - e não uma cor de texto só,
   que num fundo escuro quase não se vê.

   No rodapé, o que vem depois: um aluno que não sabe que existe um A1 não
   compra um A1. */
function Sidebar({ pathname }: { pathname: string | null }) {
  const p = useProgress();
  const preCarregar = usePreCarregar();

  return (
    <aside className="hidden lg:flex flex-col gap-[26px] bg-[var(--navy)] px-[18px] py-[26px]">
      <Link href="/meu-hebraico" prefetch={preCarregar} className="flex items-center gap-2.5 px-2 rounded-md">
        <span aria-hidden className="w-8 h-8 rounded-[9px] bg-white/[.12] grid place-items-center shrink-0">
          <span style={{ fontSize: 16, marginTop: -2, lineHeight: 1 }}>
            <He size="inline" tone="lite" className="leading-none">ע</He>
          </span>
        </span>
        <span className="font-display font-semibold text-[16px] tracking-[-0.02em] text-white">
          {tx.marca}
        </span>
      </Link>

      <nav aria-label={tx.navegacaoPrincipal}>
        <ul className="grid gap-[3px]">
          {NAV.map(item => {
            const active = portaAtiva(pathname, item);
            const Icone = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={preCarregar}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-[11px] rounded-[11px] px-3 py-2.5
                    font-ui text-[15px] transition-colors
                    ${active
                      ? 'bg-white/[.12] text-white font-semibold'
                      : 'text-white/[.66] font-medium hover:bg-white/[.06]'}`}
                >
                  <Icone className={active ? 'text-[var(--teal-lite)]' : 'text-white/[.55]'} />
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/academia' && p.dueCount > 0 && (
                    <span className="rounded-full bg-[var(--gold-solid)] px-[7px] py-[2px]
                                     font-ui text-[11.5px] font-bold text-white tabular-nums">
                      {p.dueCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1" />

      {/* Aqui havia um cartão de "próximo nível" dizendo que o A1 seria
          liberado ao concluir a Alfabetização. Removido em 25/09/2026, a
          pedido do dono do curso: o A1 não existe ainda e será vendido à
          parte, então o cartão prometia de graça um curso que vai custar. */}

      {/* Branco a 85% (antes 45%, 3,8:1 - auditoria de 28/09, UX-007), e
          "nas lições": os jogos da Academia não têm os atalhos (UX-014). */}
      <p className="font-ui text-[12px] leading-relaxed text-white/[.85] px-1">
        {tx.nasLicoes}<Key dark>1</Key>-<Key dark>4</Key>{tx.respondem}<Key dark>{tx.teclaEnter}</Key>{tx.avanca}
      </p>
    </aside>
  );
}

/* A porta do perfil, no topo, em todas as larguras.
 *
 * Uma inicial num círculo, e não um ícone genérico: é o único lugar da
 * plataforma que confirma, de relance, EM QUAL CONTA a pessoa está. Numa
 * casa com login isso não é enfeite - é a resposta para "será que comprei com
 * outro e-mail?", que é a dúvida que gera metade dos pedidos de suporte. */
function ProfileLink() {
  const account = useAccount();
  if (!account.ready || !account.signedIn) return null;
  const name = account.session!.account.name.trim();
  const initial = (name || account.session!.account.email)[0]!.toUpperCase();

  return (
    <Link
      href="/perfil"
      className="min-w-[44px] min-h-[44px] grid place-items-center rounded-full
                 hover:bg-surface-2 transition-colors"
      title={name || account.session!.account.email}
    >
      <span aria-hidden
            className="w-[30px] h-[30px] rounded-full bg-[var(--accent-wash)]
                       text-[var(--accent)] font-ui text-[13px] font-bold
                       grid place-items-center">
        {initial}
      </span>
      <span className="sr-only">{tx.suaConta}</span>
    </Link>
  );
}

export function Key({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <kbd className={`inline-block min-w-[18px] px-1.5 py-[1px] rounded-[5px] text-center font-ui text-[11px]
      ${dark ? 'border border-white/20 bg-white/10 text-white/70'
             : 'border border-line bg-[var(--card)] text-ink-body'}`}>
      {children}
    </kbd>
  );
}

/* ── the thumb ──────────────────────────────────────────────────────────── */
function BottomBar({ pathname }: { pathname: string | null }) {
  const p = useProgress();
  const preCarregar = usePreCarregar();
  const itens = NAV.filter(item => item.movel === 'barra');
  /* O rótulo cresce quando a Aula 0 sai da barra (28/10/2026): com seis
     itens, cada um tem 58,7 px num celular de 360px, e "Progresso" a 11,5 px
     mede 57. Abaixo de 360px (o iPhone SE antigo, 320) cai para 10 px. Com
     sete, 10,5 px é o que cabe a partir de 360. */
  /* Quatro portas: cada uma tem 90 px num celular de 360, e o rótulo
     cresce para 12,5 px. */
  const rotulo = 'text-[12.5px]';
  return (
    <nav
      aria-label={tx.navegacaoPrincipal}
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[color:var(--line-soft)]
                 bg-[color-mix(in_srgb,var(--paper)_94%,transparent)] backdrop-blur-md
                 pb-[env(safe-area-inset-bottom)]"
    >
      {/* Sete alvos num aparelho de 390px dão 54px cada, e o rótulo mais
          largo ("Progresso") mede 52 a 10,5 px. O `min-w-0` é o que impede um deles de
          esticar a linha: sem ele, `flex-1` respeita a largura do conteúdo e
          a barra fica mais larga que a tela. */}
      <ul className="mx-auto w-full max-w-[680px] px-1 flex items-stretch justify-around">
        {itens.map(item => {
          const active = portaAtiva(pathname, item);
          const Icone = item.icon;
          return (
            <li key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                prefetch={preCarregar}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`relative h-[60px] flex flex-col items-center justify-center gap-1.5
                  font-ui ${rotulo} leading-none text-center px-0.5 transition-colors
                  whitespace-nowrap
                  ${active ? 'text-[var(--accent)] font-semibold' : 'text-ink-muted'}`}
              >
                <span aria-hidden className="hf-barra-icone inline-grid"><Icone size={19} /></span>
                <span className="hf-barra-rotulo">{item.label}</span>
                {item.href === '/academia' && p.dueCount > 0 && (
                  <span aria-hidden
                        className="absolute top-2 right-[30%] w-[7px] h-[7px] rounded-full bg-[var(--gold)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AchievementToast({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const first = ACHIEVEMENTS.find(a => a.id === ids[0]);
  const nosJogos = (usePathname() ?? '').startsWith('/academia');
  /* Com o teclado hebraico da tela aberto, o pé da tela é dele: o aviso vai
     para o alto, e nunca por cima das teclas (auditoria de 01/10, UXQA-014). */
  const [comTeclado, setComTeclado] = useState(false);
  useEffect(() => { setComTeclado(!!document.getElementById('teclado-hebraico')); }, [ids]);
  const embaixo = nosJogos && !comTeclado;
  /* Quem tocou em "Compartilhar" está usando o aviso: ele não some sozinho
     no meio da folha de compartilhar. Com o botão, o aviso fica mais tempo. */
  const [segura, setSegura] = useState(false);
  const compartilhavel = !!first && podeCompartilhar(first.id);
  useEffect(() => {
    if (segura) return;
    const t = setTimeout(onClose, compartilhavel ? 12000 : 6000);
    return () => clearTimeout(t);
  }, [onClose, segura, compartilhavel]);
  if (!first) return null;

  return (
    /* Under the header, not above the bottom bar. Anchored low it landed on
       top of the answer feedback and the Continuar button - the two things the
       learner is looking at when an achievement fires. */
    <div
      role="status"
      /* Nos jogos da academia a instrução e o alvo ficam no alto da tela, e o
         aviso preso embaixo do cabeçalho os cobria (auditoria de 28/09,
         UX-018). Lá ele desce para acima da barra e do botão de acessibilidade; o
         "Continuar" das lições, que motivou o topo, não existe nos jogos. */
      className={`fixed left-1/2 -translate-x-1/2 z-40 w-[min(420px,calc(100vw-32px))] animate-rise
                  ${embaixo ? 'bottom-[136px] lg:bottom-6' : 'top-[68px]'}`}
    >
      {/* Uma linha só (27/10/2026, rodada 2 da experiência): com o botão de
          compartilhar embaixo do título, o aviso ocupava cerca de 125 px no
          alto do celular e cobria o título do relatório do exame. */}
      <Card tone="mint" className="py-2.5 pl-4 pr-2 shadow-[var(--shadow-2)] flex items-center gap-3">
        <span aria-hidden className="text-[var(--mint-ink)] text-[18px] leading-none">◆</span>
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[11px] uppercase tracking-[.1em] text-[var(--mint-ink)] truncate">
            {compartilhavel ? tx.conquista : tx.conquistaDesbloqueada}{ids.length > 1 ? ` +${ids.length - 1}` : ''}
          </p>
          {/* O título quebra em até duas linhas: cortado em "Primeira pala…"
              ele deixava de dizer o que foi conquistado. */}
          <p className="font-display text-[15.5px] font-semibold leading-tight text-ink line-clamp-2">{first.titlePt}</p>
        </div>
        {compartilhavel && (
          <div className="shrink-0" onFocus={() => setSegura(true)} onPointerDown={() => setSegura(true)}>
            <CompartilharConquista id={first.id} curto />
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onClose} aria-label={tx.fechar}>✕</Button>
      </Card>
    </div>
  );
}

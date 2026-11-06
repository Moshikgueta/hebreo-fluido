'use client';

/* O hero.
 * ─────────────────────────────────────────────────────────────────────────
 * Desde 29/10/2026 (pedido do dono): QUEM ensina e O QUE se recebe, na
 * primeira tela. De um lado o título, o subtítulo, três itens e os dois
 * botões; do outro, o retrato do Moshik com a legenda e, por cima do canto
 * dele, um celular com uma tela de exercício de verdade da plataforma
 * (/media/plataforma-exercicio.webp, capturada da lição do Mem). É curso numa
 * plataforma, não aula particular, e a composição diz isso sem texto a mais.
 *
 * O retrato saiu da seção "Sobre" (Fecho.tsx) e só aparece aqui: a mesma foto
 * duas vezes na página repetia a apresentação. É o único `fetchPriority="high"`
 * da página. (No celular a maior pintura é o fundo, AtmosferaFundo: ver lá.)
 *
 * No celular a ordem é título, subtítulo, foto, itens e botões; a foto sai em
 * 4:3 (até 1024 px) para os botões ficarem perto da primeira tela. A entrada é CSS (`hero-entra`,
 * globals.css), parada com "reduzir movimento".
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { whatsappUrl } from '@/lib/empresa';
import { Check, Container } from './base';
import { SEM_MIDIA, type HeroMedia } from './media';
import { tx } from '@/i18n/telas/venda-hero';

const ITENS = [tx.bullet1, tx.bullet2, tx.bullet3];

export function Hero({
  primaryHref, primaryLabel, retrato, midia = SEM_MIDIA
}: {
  primaryHref: string;
  primaryLabel: string;
  /** O retrato do professor, quando o arquivo existe (curso-de-hebraico/page.tsx). */
  retrato: string | null;
  /** A camada de atmosfera, quando o arquivo existe. Ver ./media.ts. */
  midia?: HeroMedia;
}) {
  const entra = (n: number) => ({ animationDelay: `${[0, 40, 110, 180, 240][n]}ms` });
  const zap = whatsappUrl();

  return (
    <header className="relative overflow-hidden">
      <AtmosferaFundo midia={midia} />
      <Container className="relative pt-6 pb-14 sm:pt-[56px] sm:pb-24
                            grid gap-y-5 sm:gap-y-8 lg:gap-x-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center">
        <div className="hero-entra lg:col-start-1 lg:row-start-1 lg:self-end" data-entrada style={entra(1)}>
          <h1 className="font-display font-semibold text-[clamp(32px,4.4vw,56px)] leading-[1.04]
                         tracking-[-0.035em] text-balance m-0 mb-3 sm:mb-5 max-w-[17ch]">
            {tx.titulo}
          </h1>
          <p className="font-ui text-[15.5px] sm:text-[18px] leading-[1.5] text-ink-body text-pretty max-w-[50ch] m-0">
            {tx.subtitulo}
          </p>
        </div>

        <div className="relative w-full max-w-[480px] mx-auto lg:mx-0 lg:justify-self-end
                        lg:col-start-2 lg:row-start-1 lg:row-span-2 hero-entra-lamina"
             data-entrada style={entra(3)}>
          <Retrato retrato={retrato} />
        </div>

        <div className="hero-entra lg:col-start-1 lg:row-start-2 lg:self-start" data-entrada style={entra(2)}>
          <ul className="grid gap-1.5 sm:gap-2 list-none p-0 m-0 mb-5 sm:mb-8">
            {ITENS.map(t => (
              <li key={t} className="flex items-center gap-2.5 font-ui text-[15.5px] sm:text-[16.5px] font-medium text-ink">
                <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-[var(--teal-soft)]">
                  <Check size={13} color="var(--teal)" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          {/* Os dois com a mesma altura e o mesmo raio; no celular, a largura
              toda, o principal primeiro. */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link
              href={primaryHref}
              className="group inline-flex items-center justify-center gap-2.5 rounded-[12px] min-h-[54px]
                         text-center leading-[1.3] bg-[var(--accent-bg)] text-white
                         font-ui font-semibold text-[16.5px] px-7
                         shadow-[0_1px_0_rgba(255,255,255,.08)_inset,0_1px_2px_rgba(14,59,67,.2),0_8px_20px_-10px_rgba(14,59,67,.55)]
                         transition-[background-color,transform] duration-150 ease-out
                         hover:bg-[var(--navy-2)] active:scale-[.98]"
            >
              {primaryLabel}
              <span aria-hidden
                    className="transition-transform duration-150 ease-out group-hover:translate-x-[3px]">→</span>
            </Link>
            {zap && (
              <a
                href={zap}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] min-h-[54px] px-6
                           bg-[var(--card)] text-ink font-ui font-semibold text-[16px]
                           shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(27,33,31,.05)]
                           transition-[box-shadow,transform] duration-150 ease-out
                           hover:shadow-[0_0_0_1px_#C9C3B4,0_1px_2px_rgba(27,33,31,.08)] active:scale-[.98]"
              >
                <IconeWhatsapp />
                {tx.whatsapp}
                <span className="sr-only">{tx.abreWhatsapp}</span>
              </a>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}

/* O retrato com o celular por cima do canto.
 * ─────────────────────────────────────────────────────────────────────────
 * A foto fica à direita (76% da largura) e o celular à esquerda, entrando uns
 * pixels nela; a legenda vai embaixo da foto, depois do celular. Tudo em
 * porcentagem da mesma caixa, para a composição ser a mesma do telefone ao
 * monitor. O recorte é só CSS (`object-cover`): no celular, 4:3 com o rosto
 * no meio; do desktop para cima, o 4:5 do próprio arquivo.
 *
 * `data-a11y-desvia`: o botão de acessibilidade sai de cima (CONV-021).
 */
function Retrato({ retrato }: { retrato: string | null }) {
  return (
    <figure data-a11y-desvia className="relative m-0">
      <div className="ml-[24%] rounded-[20px] overflow-hidden bg-[var(--sand)]
                      shadow-[0_0_0_1px_rgba(27,33,31,.06),0_30px_60px_-30px_rgba(14,59,67,.35)]">
        {retrato ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={retrato}
            alt={tx.fotoAlt}
            width={680}
            height={850}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="block w-full h-auto aspect-[4/3] lg:aspect-[4/5] object-cover object-[50%_52%]"
          />
        ) : (
          <div aria-hidden className="aspect-[4/3] lg:aspect-[4/5]" />
        )}
      </div>
      <figcaption className="ml-[37%] mt-3 font-ui">
        <span className="block text-[15.5px] sm:text-[16.5px] font-semibold text-ink leading-tight">{tx.nome}</span>
        <span className="block text-[13px] sm:text-[14px] leading-[1.4] text-ink-muted mt-1">{tx.credenciais}</span>
      </figcaption>
      <div className="absolute left-0 bottom-0 w-[31%] sm:w-[34%] rounded-[18px] sm:rounded-[26px] p-[4px] sm:p-[6px]
                      bg-[var(--navy)]
                      shadow-[0_0_0_1px_rgba(255,255,255,.06)_inset,0_24px_44px_-18px_rgba(6,42,48,.55)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/plataforma-exercicio.webp"
          alt={tx.mockupAlt}
          width={540}
          height={1169}
          loading="eager"
          decoding="async"
          className="block w-full h-auto rounded-[14px] sm:rounded-[20px]"
        />
      </div>
    </figure>
  );
}

/* O balão do WhatsApp, em traço, na cor do texto do botão. */
export function IconeWhatsapp() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--teal-ink)]">
      <path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6Z" />
      <path d="M9.2 9.1c.2 2.4 2.6 4.8 5.2 5.4l1.1-1.2-1.6-.9-.8.6c-.9-.4-1.9-1.4-2.3-2.3l.6-.8-.9-1.6Z" />
    </svg>
  );
}

/* A camada de atmosfera: a foto atrás de TODO o hero.
 * ─────────────────────────────────────────────────────────────────────────
 * A primeira versão punha a foto só em volta do mockup, num anel de 50px.
 * Não funcionou, e o motivo é instrutivo: a imagem foi composta em 16:9 com
 * o meio vazio de propósito - parede clara à esquerda, luz de cortina e
 * xícara à direita, tampo de madeira embaixo. Espremida num anel estreito e
 * cortada pelo `object-cover`, o que sobrava não era uma mesa: eram manchas
 * cinzentas nos cantos, com a aresta reta do retângulo aparecendo.
 *
 * Então ela ocupa o hero inteiro, que é para o que foi feita - e a
 * composição da foto cai exatamente em cima da composição da página:
 *
 *   à esquerda   parede vazia, onde fica o texto. O creme cobre quase tudo,
 *                e o título continua com o contraste que tinha;
 *   à direita    a luz e a xícara, atrás do mockup, onde a profundidade é
 *                bem-vinda;
 *   embaixo      a madeira, que dissolve na faixa seguinte.
 *
 * Desde 29/10/2026 a maior pintura do hero é o retrato do professor, e é ele
 * que pede a imagem com prioridade alta; a atmosfera fica com a baixa.
 *
 * O hebraico NUNCA vem do arquivo gerado. Ele é desenhado aqui, com a fonte
 * do produto - um gerador de imagem erra a grafia, e uma palavra errada na
 * primeira tela de um curso de hebraico é o pior defeito possível.
 */
function AtmosferaFundo({ midia }: { midia: HeroMedia }) {
  const [move, setMove] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const fino = window.matchMedia?.('(min-width: 1024px)');
    setMove(!mq?.matches && !!fino?.matches);
  }, []);

  const temVideo = !!midia.video && !!midia.poster && move;
  if (!temVideo && !midia.imagem) return null;

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {temVideo ? (
        <video
          className="w-full h-full object-cover object-[68%_50%] opacity-[.55]"
          src={midia.video!}
          poster={midia.poster!}
          autoPlay muted loop playsInline preload="none"
        />
      ) : (
        /* `<picture>` e não `<img>` sozinho: o recorte de 640px pesa 4,7 KB
           contra 15 KB do grande, e esta imagem está acima da dobra - é o
           tipo de byte que atrasa a primeira tela num 4G. Sem o arquivo
           pequeno o `<source>` não é emitido e todo mundo recebe o grande.

           Sem `fetchPriority="low"` desde 31/10/2026 (auditoria de SEO): no
           celular esta é a MAIOR pintura da primeira tela (o LCP que o Google
           mede), e com prioridade baixa ela esperava o retrato de 118 KB
           chegar. Medido no Chromium com a emulação do Lighthouse móvel
           (CPU 4x, 150 ms, 1,6 Mbps; mediana de 5): LCP 2,57 -> 1,1 a 1,2 s,
           e o retrato chega no mesmo tempo de antes (2,3 s). São 4,7 KB.

           `object-[68%_50%]`: quando a janela é mais alta que 16:9, o corte
           tem de puxar para a direita, onde estão a cortina e a xícara. No
           centro a foto é parede, e parede cortada é um fundo liso. */
        <picture>
          {midia.imagemMobile && <source media="(max-width: 700px)" srcSet={midia.imagemMobile} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={midia.imagem!}
            alt=""
            width={1280}
            height={725}
            className="w-full h-full object-cover object-[68%_50%] opacity-[.55]"
            loading="eager"
            decoding="async"
          />
        </picture>
      )}

      {/* O creme por cima, em duas passadas. A primeira é horizontal e existe
          para o TEXTO: à esquerda ela é quase sólida, e o título fica com o
          mesmo contraste que tinha sem foto nenhuma. A segunda é vertical e
          existe para as BORDAS: sem ela a faixa teria uma aresta reta contra
          o cabeçalho em cima e contra a seção seguinte embaixo. */}
      <div className="absolute inset-0"
           style={{
             background: 'linear-gradient(95deg, var(--cream) 0%, rgba(251,249,245,.97) 30%, ' +
                         'rgba(251,249,245,.72) 48%, rgba(251,249,245,.42) 70%, rgba(251,249,245,.6) 100%)'
           }} />
      <div className="absolute inset-0"
           style={{
             background: 'linear-gradient(to bottom, var(--cream) 0%, rgba(251,249,245,0) 22%, ' +
                         'rgba(251,249,245,0) 58%, var(--cream) 100%)'
           }} />
    </div>
  );
}

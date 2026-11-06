'use client';

/* O checkout.
 * ─────────────────────────────────────────────────────────────────────────
 * Três passos numa página só, com o resumo do pedido sempre à vista:
 *
 *   1. conta      - entrar ou criar, sem sair daqui;
 *   2. pagamento  - PIX, cartão à vista ou parcelado;
 *   3. confirmação- o servidor diz que o acesso saiu, e só ele.
 *
 * Decisões que valem a pena registrar:
 *
 * · Criar conta acontece ANTES de pagar, e não depois. O inverso é comum e é
 *   pior: alguém paga, o navegador fecha no meio, e existe um pagamento sem
 *   dono. Com a conta primeiro, todo pedido nasce ligado a alguém.
 *
 * · Quem já tem o curso não vê formulário de pagamento. Vender duas vezes a
 *   mesma coisa para a mesma pessoa é um estorno garantido e uma avaliação
 *   ruim.
 *
 * · O acesso é confirmado perguntando ao servidor (`orderStatus`), nunca pelo
 *   que volta na URL. A Mercado Pago manda o comprador de volta com
 *   parâmetros na query - e qualquer pessoa consegue digitar esses parâmetros
 *   na barra de endereço. É exatamente o erro que o projeto irmão em espanhol
 *   documenta no IMPLEMENTATION.md dele.
 *
 * · A consulta tem limite. Se o pagamento não cair em trinta minutos, a tela
 *   para de perguntar e explica o que fazer - em vez de girar para sempre e
 *   deixar a pessoa achando que travou.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Badge } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { He } from '@/components/hebrew/He';
import { useAccount } from '@/lib/account/store';
import { AuthError, MESSAGES, daysLeft, type Order, type PaymentMethod } from '@/lib/account/types';
import { ancora, brl, fimDoPreLancamento, getCourse, parcelasMax, pixPrice, tipoDe, type CatalogCourse, paginaDeVenda } from '@/lib/catalog';
import { comParceria, fimDaParceria, parceriaAtual, precoDaParceria } from '@/lib/parceria';
import { contarComOrigem, origemAtual } from '@/lib/origem';
import { confirmaSozinho, empresa, formasAtivas, INICIO_DO_ACESSO, JANELA_DE_RENOVACAO_DIAS, pagaDeFora, pagaPeloStripe, parcelasTexto, soPix, temPix } from '@/lib/empresa';
import { abrirCheckout } from '@/lib/paddle-checkout';
import { AuthForm } from '@/components/platform/AuthForm';
import { track } from '@/lib/analytics';
import { api } from '@/lib/account/api';
import { deveRetomarPix } from './retomada';
import { tx } from '@/i18n/telas/conta-checkout-client';
import { cpfValido, mascaraCpf, nomeCompletoValido } from '@/lib/cpf';
import { LOCALE_INTL } from '@/i18n';

/** De quanto em quanto tempo perguntar, e por quanto tempo insistir.
 *
 *  Trinta minutos, a validade do código PIX, e não cinco (compra real de
 *  28/09/2026): quem paga pelo app do banco no MESMO celular deixa esta aba
 *  em segundo plano, o navegador congela a consulta, e ao voltar depois de
 *  cinco minutos a tela já tinha desistido - o acesso só saía na varredura.
 *  Depois dos primeiros cinco minutos a pergunta fica mais espaçada, para não
 *  gastar à toa a cota de consultas da conta. */
const POLL_MS = 3_000;
const LENTO_DEPOIS_MS = 5 * 60_000;
const POLL_LENTO_MS = 15_000;
const GIVE_UP_MS = 30 * 60_000;

export function CheckoutClient({ slug }: { slug: string }) {
  const account = useAccount();
  const router = useRouter();
  /* Parceria (lib/parceria.ts): lida depois de montar, porque mora no
     armazenamento do aparelho e a página é gerada sem ele. */
  const [parceria, setParceria] = useState<string | null>(null);
  useEffect(() => { setParceria(parceriaAtual()); contarComOrigem('checkout-aberto'); }, []);
  const c = comParceria(getCourse(slug)!, parceria);


  /* Lidos uma vez: vêm de data/empresa.json, que é fixo no momento da build. */
  const CONFIRMA_SOZINHO = confirmaSozinho();
  /* O que a conta da Mercado Pago aceita NESTA build - resolvido na
     publicação (scripts/pagamento-ativo.mjs), não escrito à mão. Sobrando uma
     forma só, a tela para de perguntar e passa a informar: uma escolha com
     uma opção não é uma escolha, e dá ao comprador a impressão de que ele
     perdeu alguma coisa. */
  /* Os sites de fora: um botão só, que abre o checkout do Paddle ou leva à
     página do Stripe (desde 05/11/2026). */
  const PADDLE = pagaDeFora();
  const STRIPE = pagaPeloStripe();
  const FORMAS = formasAtivas();
  const UMA_FORMA = FORMAS.length === 1;
  const SO_CARTAO = UMA_FORMA && FORMAS[0] === 'card';

  const [method, setMethod] = useState<PaymentMethod>(STRIPE ? 'stripe' : PADDLE ? 'paddle' : (FORMAS[0] ?? 'pix'));
  /* O aviso do checkout do Paddle (fechou sem pagar, não carregou). */
  const [avisoPaddle, setAvisoPaddle] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* Os dados da nota fiscal (06/11/2026, pedido do dono, depois de falar com
     o contador): só no site brasileiro. O nome começa com o da conta quando
     ele já tem sobrenome. O CPF nunca é guardado no navegador. */
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [erroNome, setErroNome] = useState(false);
  const [erroCpf, setErroCpf] = useState(false);
  const nomeDaConta = account.session?.account.name ?? '';
  useEffect(() => {
    if (!nomeCompleto && nomeCompletoValido(nomeDaConta)) setNomeCompleto(nomeDaConta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeDaConta]);
  const [gaveUp, setGaveUp] = useState(false);
  const [copied, setCopied] = useState(false);
  /* Estado próprio, e não uma mensagem de erro vermelha: a plataforma pode
     estar no ar antes da conta da Mercado Pago existir, e isso não é falha. */
  const [paymentsOff, setPaymentsOff] = useState(false);
  /* O PIX reaberto de uma visita anterior (PAY-B-002): muda só uma frase. */
  const [retomado, setRetomado] = useState(false);

  /* "Já é dono" só bloqueia a compra fora da janela de renovação: nos últimos
     45 dias o servidor aceita um pedido novo e ESTENDE o prazo, e esta tela
     precisa deixar a pessoa chegar até ele - era daqui que o botão "Renovar
     acesso" do painel saía para bater num "nada a pagar". */
  const restam = daysLeft(account.session, slug);
  const owned = account.can(slug) && (restam === null || restam > 45);
  /* Qual passo a pessoa viu (23/10/2026, plano de marketing, teste C4): o da
     conta, para quem chegou sem sessão, e o do pagamento. Uma vez cada por
     visita (contarComOrigem); quem cria a conta aqui conta nos dois. */
  useEffect(() => {
    if (!account.ready || owned) return;
    contarComOrigem(account.signedIn ? 'checkout-pagar' : 'checkout-conta');
  }, [account.ready, account.signedIn, owned]);
  /* O pacote não vira um direito com o slug dele: ele libera cada produto de
     `componentes`. Quem já tem um deles (fora da janela de renovação) compra
     só o que falta - o servidor recusa com `ja-tem-parte`. */
  const tipo = tipoDe(c);
  const jaTemParte = tipo === 'pacote' && (c.componentes ?? []).some(s => {
    const r = daysLeft(account.session, s);
    return account.can(s) && (r === null || r > 45);
  });
  /* Para onde a compra leva. O e-book abre em /israel/, uma página estática
     fora do app: navegação de verdade, não a do roteador. */
  const destino = c.abre ?? '/meu-hebraico';
  const irPara = (href: string) => { if (href.startsWith('/israel')) window.location.assign(href); else router.push(href); };
  const oQue = tipo === 'livro' ? tx.oLivro : tipo === 'pacote' ? tx.oCombo : tx.oCurso;
  const parcelas = parcelasMax(c.price);
  const total = method === 'pix' ? pixPrice(c.price) : c.price.brl;

  /* ── o PIX que já existe ─────────────────────────────────────────────
     Auditoria de 01/10/2026, PAY-B-002. O código vivia só na memória da
     aba: quem voltava do aplicativo do banco com a aba recarregada (o
     celular descarta abas em segundo plano) via de novo "Pagar", gerava um
     SEGUNDO PIX e, pagando os dois, pagava duas vezes. Ao abrir, a tela
     pergunta se há um PIX deste curso ainda dentro do prazo e reabre o
     MESMO código, com a consulta de sempre. Uma vez por visita: "Gerar outro
     código" não pode ser desfeito por esta busca. */
  const procurouPix = useRef(false);
  useEffect(() => {
    if (PADDLE) return;
    if (!deveRetomarPix({
      pronto: account.ready, logado: account.signedIn, dono: owned,
      temPedido: !!order, jaProcurou: procurouPix.current
    })) return;
    procurouPix.current = true;
    let stop = false;
    void (async () => {
      try {
        const aberto = await (await api()).pixPendente(slug);
        /* `stop` também cobre a pessoa que clicou em Pagar no meio da
           pergunta: o pedido novo muda `order`, e a limpeza deste efeito
           descarta a resposta. */
        if (stop || !aberto) return;
        setMethod('pix');
        setRetomado(true);
        setOrder(aberto);
      } catch { /* sem PIX para reabrir: a tela segue como sempre */ }
    })();
    return () => { stop = true; };
  }, [account.ready, account.signedIn, owned, order, slug, PADDLE]);

  /* ── a consulta ──────────────────────────────────────────────────── */
  const startedAt = useRef<number>(0);
  /* Fora do efeito: ele recomeça a cada resposta (o pedido novo é outro
     objeto), e a hora da última pergunta tem de sobreviver a isso. */
  const ultimaPergunta = useRef<number>(0);
  useEffect(() => {
    if (!order || order.status !== 'pending') return;
    /* No PIX direto ninguém vai responder esta pergunta: o dinheiro cai na
       conta do recebedor sem avisar o site, e a liberação é feita à mão. Uma
       consulta que roda cinco minutos para depois dizer "não apareceu" não
       informa nada - só ensina que o site não funciona. Ver `pagamento.modo`
       em data/empresa.json. */
    if (!CONFIRMA_SOZINHO) return;
    startedAt.current = startedAt.current || Date.now();
    let stop = false;

    const perguntar = async (agora = false) => {
      if (stop) return;
      const passou = Date.now() - startedAt.current;
      if (passou > GIVE_UP_MS) {
        setGaveUp(true);
        clearInterval(timer);
        return;
      }
      if (!agora && passou > LENTO_DEPOIS_MS && Date.now() - ultimaPergunta.current < POLL_LENTO_MS) return;
      ultimaPergunta.current = Date.now();
      try {
        const fresh = await account.orderStatus(order.id);
        if (stop) return;
        setOrder(fresh);
        if (fresh.status === 'paid') {
          clearInterval(timer);
          /* A sessão tem de ser relida: é ela que passa a carregar o direito
             de acesso, e o portão do curso lê dela. */
          await account.refresh();
          track('course_completed', { id: `compra-${slug}` });
        }
      } catch {
        /* Uma falha de rede no meio de uma espera não é motivo para desistir:
           a próxima volta tenta de novo, e o prazo acima é quem desiste. */
      }
    };
    const timer = setInterval(() => { void perguntar(); }, POLL_MS);

    /* Voltou do app do banco: pergunta NA HORA, sem esperar a próxima volta. */
    const aoVoltar = () => { if (document.visibilityState === 'visible') void perguntar(true); };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      stop = true; clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [order, account, slug, CONFIRMA_SOZINHO]);

  const pay = useCallback(async () => {
    /* Os dados da nota, conferidos antes de qualquer coisa (o servidor
       confere de novo). */
    const nomeOk = PADDLE ? null : nomeCompletoValido(nomeCompleto);
    const cpfOk = PADDLE ? null : cpfValido(cpf);
    if (!PADDLE) {
      setErroNome(!nomeOk); setErroCpf(!cpfOk);
      if (!nomeOk || !cpfOk) {
        document.getElementById(!nomeOk ? 'nota-nome' : 'nota-cpf')?.focus();
        return;
      }
    }
    setBusy(true);
    setError(null);
    setGaveUp(false);
    setAvisoPaddle(null);
    startedAt.current = 0;
    try {
      const created = await account.startOrder({
        courseSlug: slug, method,
        ...(method === 'card' ? { installments: parcelas } : {}),
        ...(parceria ? { parceria } : {}),
        /* De onde a pessoa veio (lib/origem.ts): só para o painel do dono. */
        ...(origemAtual() ? { origem: origemAtual()! } : {}),
        ...(nomeOk && cpfOk ? { nomeCompleto: nomeOk, cpf: cpfOk } : {})
      });
      /* O cartão sai daqui: quem coleta o número é a Mercado Pago, e é assim
         que esta plataforma nunca vê um dado de cartão. */
      if (created.redirectUrl) {
        window.location.href = created.redirectUrl;
        return;
      }
      /* O Paddle abre por cima desta página. A consulta ao servidor só
         começa quando ele diz que o pagamento passou (o pedido entra em
         `order`); fechar sem pagar deixa a pessoa clicar de novo, e cada
         clique é um pedido novo, como no cartão da Mercado Pago. */
      if (created.paddle) {
        try {
          await abrirCheckout(created.paddle, {
            email: account.session?.account.email,
            aoConcluir: () => { setAvisoPaddle(null); setOrder(created); },
            aoFechar: () => setAvisoPaddle(tx.paddleFechou)
          });
        } catch {
          setError(tx.paddleNaoCarregou);
        }
        return;
      }
      setOrder(created);
    } catch (e) {
      if (e instanceof AuthError && e.code === 'payments-off') setPaymentsOff(true);
      else setError(e instanceof AuthError ? e.message : MESSAGES.server);
    } finally {
      setBusy(false);
    }
  }, [account, slug, method, parcelas, parceria, nomeCompleto, cpf, PADDLE]);

  /* ── o pagamento ainda não foi ligado ────────────────────────────── */
  if (paymentsOff) {
    return (
      <Shell course={c}>
        <Card tone="amber" className="p-6 grid gap-3">
          <Badge>{tx.emConfiguracao}</Badge>
          <h1 className="font-display text-[21px] font-bold text-ink">
            {tx.pagamentoDesligado}
          </h1>
          <p className="font-ui text-[14.5px] leading-relaxed text-ink-body">
            {tx.pagamentoDesligadoTexto}
          </p>
          <p className="font-ui text-[14px] text-ink">
            <a href={`mailto:${empresa.contato.emailSuporte}`}
               className="text-[var(--accent)] font-medium hover:underline">
              {empresa.contato.emailSuporte}
            </a>
          </p>
          <LinkButton href={paginaDeVenda(c.slug)} variant="secondary" className="justify-self-start">
            {tx.voltarAoCurso}
          </LinkButton>
        </Card>
      </Shell>
    );
  }

  /* ── já tem parte do pacote ──────────────────────────────────────── */
  if (account.ready && jaTemParte && order?.status !== 'paid') {
    const falta = (c.componentes ?? []).map(s => getCourse(s)).filter((x): x is CatalogCourse => !!x)
      .filter(x => !account.can(x.slug));
    return (
      <Shell course={c}>
        <Card tone="mint" className="p-6 grid gap-3">
          <Badge tone="mint">{tx.jaTemParte}</Badge>
          <h1 className="font-display text-[21px] font-bold text-ink">
            {tx.leveSoOQueFalta}
          </h1>
          <p className="font-ui text-[14.5px] leading-relaxed text-ink-body">
            {tx.pacoteCobrariaDeNovo}
          </p>
          {falta.map(x => (
            <LinkButton key={x.slug} href={`/checkout/${x.slug}`} size="lg" className="justify-self-start">
              {tx.comprar(x.titlePt, brl(x.price.brl))}
            </LinkButton>
          ))}
        </Card>
      </Shell>
    );
  }

  /* ── já é dono ───────────────────────────────────────────────────── */
  if (account.ready && owned && order?.status !== 'paid') {
    return (
      <Shell course={c}>
        <Card tone="mint" className="p-6 grid gap-3">
          <Badge tone="mint">{tx.jaESeu}</Badge>
          <h1 className="font-display text-[21px] font-bold text-ink">
            {tipo === 'livro' ? tx.livroJaNaConta : tx.cursoJaNaConta}
          </h1>
          <p className="font-ui text-[14.5px] leading-relaxed text-ink-body">
            {tipo === 'livro' ? tx.nadaAPagar : tx.nadaAPagarContinue}
          </p>
          {tipo === 'livro'
            ? <a href={destino} className="justify-self-start inline-flex items-center min-h-[48px] px-5 rounded-full bg-[var(--accent-bg)] text-white font-ui font-semibold">{tx.abrirLivro}</a>
            : <LinkButton href="/meu-hebraico" size="lg" className="justify-self-start">{tx.irParaMeuHebraico}</LinkButton>}
        </Card>
      </Shell>
    );
  }

  /* ── pago ────────────────────────────────────────────────────────── */
  if (order?.status === 'paid') {
    return (
      <Shell course={c}>
        <Card tone="mint" className="p-6 sm:p-8 grid gap-4 justify-items-center text-center">
          <He size="lg" dim>ע</He>
          <Badge tone="mint">{tx.pagamentoConfirmado}</Badge>
          <h1 className="font-display text-[24px] sm:text-[28px] font-bold text-ink max-w-[20ch]">
            {tx.prontoESeu(oQue)}
          </h1>
          <p className="font-ui text-[14.5px] leading-relaxed text-ink-body max-w-[44ch]">
            {tipo === 'livro'
              ? tx.livroLiberado(c.accessMonths)
              : tipo === 'pacote'
                ? tx.comboLiberado
                : tx.cursoLiberado(c.accessMonths)}
          </p>
          <Button size="lg" onClick={() => irPara(destino)}>{tipo === 'livro' ? tx.abrirLivro : tipo === 'pacote' ? tx.abrirBiblioteca : tx.comecarAgora}</Button>
        </Card>
      </Shell>
    );
  }

  /* ── precisa de conta ────────────────────────────────────────────── */
  if (account.ready && !account.signedIn) {
    return (
      <Shell course={c}>
        <Card className="p-5 grid gap-2">
          <Badge tone="accent">{tx.passo1}</Badge>
          <h1 className="font-display text-[19px] font-bold text-ink">
            {tx.primeiroSuaConta}
          </h1>
          <p className="font-ui text-[14px] leading-relaxed text-ink-body">
            {tx.primeiroSuaContaTexto}
          </p>
        </Card>
        {/* O mesmo formulário do /criar-conta, com o retorno apontando de volta
            para cá - quem cria a conta no meio da compra volta para a compra. */}
        <div className="-mx-4 sm:-mx-6">
          <AuthFormInline slug={slug} />
        </div>
      </Shell>
    );
  }

  /* ── pagamento ───────────────────────────────────────────────────── */
  const daParceria = parceria ? precoDaParceria(getCourse(slug)!, parceria) : null;
  return (
    <Shell course={c}>
      <Card className="p-5 sm:p-6 grid gap-5">
        {daParceria !== null && parceria && (
          <p className="m-0 rounded-[var(--r-md)] bg-[var(--gold-soft)] px-4 py-3 font-ui text-[14.5px] text-[var(--gold-ink)]">
            {tx.parceriaAntes}<strong>{brl(daParceria)}</strong>
            {fimDaParceria(getCourse(slug)!) ? tx.parceriaAte(fimDaParceria(getCourse(slug)!)!) : ''}.
          </p>
        )}
        <div className="grid gap-1">
          <Badge tone="accent">{tx.passo2}</Badge>
          {/* Um h1 por passo (auditoria de 01/10/2026, VIS-012): o título que já
              existia, promovido. "Seu pedido", no resumo, é o h2. */}
          <h1 className="font-display text-[19px] font-bold text-ink mt-1">{tx.comoQuerPagar}</h1>
        </div>

        {/* A escolha só aparece quando existe escolha.
            ──────────────────────────────────────────────────────────────
            Duas coisas diferentes podem deixar uma forma só de pé, e as duas
            caem aqui:

            · o modo `pix-direto`, em que o cartão não tem como funcionar
              porque não há adquirente nenhum;
            · a conta da Mercado Pago não ter aquele meio habilitado, o que
              a publicação descobre perguntando a eles e grava em
              `pagamento.formas` (scripts/pagamento-ativo.mjs).

            Em ambos, oferecer a opção que falha é pior do que oferecer só a
            que funciona: quem escolhe e recebe erro conclui que o site está
            quebrado, e não volta para tentar a outra. E, em ambos, a escolha
            volta SOZINHA na publicação seguinte ao dia em que a forma voltar
            a existir - não há nada comentado no código esperando alguém
            lembrar de descomentar. */}
        {PADDLE ? (
          <p className="font-ui text-[14.5px] leading-relaxed text-ink-body
                        bg-surface-2 rounded-[var(--r-md)] px-4 py-3">
            <strong>{STRIPE ? tx.stripeComoPaga : tx.paddleComoPaga}</strong>{' · '}{(STRIPE ? tx.stripeTexto : tx.paddleTexto)(brl(c.price.brl))}
          </p>
        ) : UMA_FORMA ? (
          <p className="font-ui text-[14.5px] leading-relaxed text-ink-body
                        bg-surface-2 rounded-[var(--r-md)] px-4 py-3">
            {SO_CARTAO ? (
              <>
                <strong>{tx.cartaoDeCredito}</strong>{tx.soCartao(brl(c.price.brl), parcelasTexto(parcelas))}
              </>
            ) : (
              <>
                <strong>{tx.pix}</strong>{tx.soPix(brl(total), c.price.pixDiscountPct)}
              </>
            )}
          </p>
        ) : (
          <fieldset className="grid gap-3" disabled={order?.status === 'pending'} data-a11y-desvia>
            <legend className="sr-only">{tx.formaDePagamento}</legend>

            <MethodOption
              checked={method === 'pix'} onSelect={() => setMethod('pix')}
              titlePt={tx.pix}
              detailPt={c.price.pixDiscountPct > 0
                ? tx.pixComDesconto(brl(pixPrice(c.price)), c.price.pixDiscountPct)
                : tx.pixSemDesconto(brl(c.price.brl))}
            />

            <MethodOption
              checked={method === 'card'} onSelect={() => setMethod('card')}
              titlePt={tx.cartaoDeCredito}
              detailPt={tx.cartaoDetalhe(brl(c.price.brl), parcelasTexto(parcelas))}
            />
          </fieldset>
        )}

        {method === 'card' && (
          <p className="font-ui text-[13px] leading-relaxed text-ink-muted
                        bg-surface-2 rounded-[var(--r-md)] px-4 py-3">
            {tx.cartaoNaMercadoPago}
          </p>
        )}

        {avisoPaddle && (
          <p aria-live="polite"
             className="font-ui text-[13.5px] leading-relaxed text-ink-body
                        bg-[var(--amber-wash)] rounded-[var(--r-md)] px-4 py-3">
            {avisoPaddle}
          </p>
        )}

        {error && (
          <p role="alert"
             className="font-ui text-[13.5px] leading-relaxed text-[var(--ember)]
                        bg-[var(--ember-wash)] rounded-[var(--r-md)] px-4 py-3">
            {error}
          </p>
        )}

        {/* ── esperando o PIX ──────────────────────────────────────── */}
        {order?.status === 'pending' && order.pix ? (
          <PixPanel
            order={order} copied={copied} gaveUp={gaveUp} automatico={CONFIRMA_SOZINHO}
            retomado={retomado}
            onCopy={async () => {
              try {
                await navigator.clipboard.writeText(order.pix!.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch { setCopied(false); }
            }}
            onRetry={() => { setOrder(null); setGaveUp(false); setRetomado(false); }}
          />
        ) : order?.status === 'pending' ? (
          <p aria-live="polite" className="font-ui text-[14px] text-ink-body">
            {order.method === 'paddle' || order.method === 'stripe' ? tx.paddleConfirmando : tx.aguardandoConfirmacao}
          </p>
        ) : (
          <>
            {!PADDLE && (
              <fieldset className="grid gap-3 border-0 p-0 m-0">
                <legend className="font-ui text-[15px] font-semibold text-ink mb-1">{tx.dadosNota}</legend>
                <label className="grid gap-1.5">
                  <span className="font-ui text-[14px] font-semibold text-ink-body">{tx.nomeCompleto}</span>
                  <input id="nota-nome" type="text" autoComplete="name" value={nomeCompleto} maxLength={120}
                         onChange={e => { setNomeCompleto(e.target.value); setErroNome(false); }}
                         aria-invalid={erroNome} aria-describedby={erroNome ? 'nota-nome-erro' : 'nota-ajuda'}
                         className="min-h-[48px] rounded-[var(--r-md)] border border-line bg-[var(--card)] px-3.5 font-ui text-[16px] text-ink
                                    aria-[invalid=true]:border-[var(--ember)]" />
                  {erroNome && <span id="nota-nome-erro" role="alert" className="font-ui text-[13px] text-[var(--ember)]">{tx.nomeInvalido}</span>}
                </label>
                <label className="grid gap-1.5">
                  <span className="font-ui text-[14px] font-semibold text-ink-body">{tx.cpf}</span>
                  <input id="nota-cpf" type="text" inputMode="numeric" autoComplete="off" value={cpf} placeholder="000.000.000-00"
                         onChange={e => { setCpf(mascaraCpf(e.target.value)); setErroCpf(false); }}
                         aria-invalid={erroCpf} aria-describedby={erroCpf ? 'nota-cpf-erro' : 'nota-ajuda'}
                         className="min-h-[48px] rounded-[var(--r-md)] border border-line bg-[var(--card)] px-3.5 font-ui text-[16px] text-ink tabular-nums
                                    aria-[invalid=true]:border-[var(--ember)]" />
                  {erroCpf && <span id="nota-cpf-erro" role="alert" className="font-ui text-[13px] text-[var(--ember)]">{tx.cpfInvalido}</span>}
                </label>
                <p id="nota-ajuda" className="m-0 font-ui text-[12.5px] leading-relaxed text-ink-muted">
                  {tx.dadosNotaAjuda}<Link href="/privacidade" className="underline underline-offset-2">{tx.politica}</Link>.
                </p>
              </fieldset>
            )}
            <CondicoesDaCompra curso={c} renovacao={restam !== null && restam <= JANELA_DE_RENOVACAO_DIAS} />
            <Button size="lg" full onClick={pay} disabled={busy}>
              {busy ? (PADDLE ? tx.paddleAbrindo : tx.gerando) : tx.pagar(brl(PADDLE ? c.price.brl : total))}
            </Button>
            <p className="font-ui text-[12.5px] leading-relaxed text-ink-muted text-center">
              {/* A declaração de idade está só nos Termos, art. 3 (pedido do dono,
                  30/09/2026): concordar com eles é fazê-la. */}
              {tx.aoContinuar}{' '}
              <Link href="/termos" className="text-[var(--accent)] hover:underline">
                {tx.termosDeUso}
              </Link>{' '}
              {tx.eComA}{' '}
              <Link href="/privacidade" className="text-[var(--accent)] hover:underline">
                {tx.politicaDePrivacidade}
              </Link>.
            </p>
          </>
        )}
      </Card>
    </Shell>
  );
}

/* ── as condições da compra ─────────────────────────────────────────────
 *
 * O Decreto 7.962/2013 pede que as condições da oferta apareçam de forma
 * clara ANTES de fechar a compra - não escondidas num link, não depois. São
 * quatro perguntas, e todas as respostas saem de data/: o que você leva, por
 * quanto tempo, quando o acesso abre, e como desistir.
 *
 * Fica logo acima do botão de propósito. Uma condição que o leitor teria de
 * rolar para trás para encontrar não foi informada; foi arquivada.
 */
function CondicoesDaCompra({ curso, renovacao = false }: { curso: CatalogCourse; renovacao?: boolean }) {
  const LINHAS: [string, React.ReactNode][] = [
    [tx.oQueVoceLeva, tipoDe(curso) === 'livro'
      ? tx.levaLivro(curso.titlePt)
      : tipoDe(curso) === 'pacote'
        ? tx.levaCombo
        : tx.levaCurso(curso.titlePt)],
    /* PAY-B-011 (auditoria de 01/10/2026): na renovação os meses SOMAM ao
       fim do acesso atual (`grantAccess`), e o quadro dizia o contrário. */
    [tx.porQuantoTempo, renovacao
      ? tx.tempoRenovacao(curso.accessMonths)
      : tipoDe(curso) === 'livro'
        ? tx.tempoLivro(curso.accessMonths, INICIO_DO_ACESSO)
        : tx.tempoCurso(curso.accessMonths, INICIO_DO_ACESSO)],
    /* 30/09/2026 (CDC, art. 6º, III): dito com todas as letras, e não
       deduzido de "12 meses". Renovar é uma compra nova, feita pela pessoa. */
    [tx.cobranca, tx.cobrancaTexto],
    /* COM-007 (auditoria de 28/09): o que NÃO vem junto, antes de pagar. */
    [tx.naoVemJunto, tipoDe(curso) === 'livro' ? <>
      {tx.naoVemLivro}{' '}
      <Link href="/termos" className="text-[var(--accent)] hover:underline">{tx.termos}</Link>.
    </> : <>
      {tx.naoVemCurso}{' '}
      <Link href="/termos" className="text-[var(--accent)] hover:underline">{tx.termos}</Link>.
    </>],
    /* O prazo prometido aqui é o prazo que a plataforma consegue cumprir, e
       ele muda com o trilho de cobrança: com confirmação automática o acesso
       abre sozinho; no PIX direto alguém confere o extrato e libera. Uma
       condição de oferta que promete o que o sistema não faz é justamente o
       que o Decreto 7.962 existe para impedir. */
    [tx.quandoAbre, confirmaSozinho()
      ? (temPix()
        ? tx.abreComPix
        : tx.abreSemPix)
      /* PIX direto: a liberação é À MÃO. "Em alguns minutos" prometia o que
         só a confirmação automática faz (auditoria de 28/09, LEGAL-017). */
      : tx.abreManual(empresa.atendimento.prazoRespostaUteis)],
    [tx.seDesistir, <>
      {tx.desistirTexto(empresa.politicas.arrependimentoDias)}{' '}
      <Link href="/reembolso" className="text-[var(--accent)] hover:underline">
        {tx.politicaDeReembolso}
      </Link>.
    </>]
  ];

  return (
    <div className="rounded-[var(--r-md)] bg-surface-2 px-4 py-3.5 grid gap-2">
      <p className="font-ui text-[11.5px] uppercase tracking-[.08em] text-ink-muted">
        {tx.condicoes}
      </p>
      <dl className="grid gap-1.5 m-0">
        {LINHAS.map(([rotulo, valor]) => (
          <div key={rotulo}
               className="grid sm:grid-cols-[minmax(0,130px)_minmax(0,1fr)] gap-x-3 gap-y-0.5">
            <dt className="font-ui text-[12.5px] text-ink-muted">{rotulo}</dt>
            <dd className="m-0 min-w-0 font-ui text-[13px] leading-[1.5] text-ink-body">
              {valor}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── o painel do PIX ──────────────────────────────────────────────────────
 *
 * Tem dois textos porque tem dois mundos, e a diferença entre eles é grande o
 * bastante para justificar dizer coisas diferentes:
 *
 * · `automatico` (Mercado Pago)  o provedor avisa, a tela pergunta de três em
 *   três segundos, e o acesso abre com a pessoa olhando. Aí "pode deixar esta
 *   página aberta" é verdade, e é a melhor instrução.
 *
 * · PIX direto  nada avisa ninguém. Alguém olha o extrato e libera. Prometer
 *   que a página se atualiza sozinha seria uma mentira que a própria pessoa
 *   descobre em trinta segundos, e o que ela conclui não é "o pagamento
 *   demora", é "o site está quebrado".
 *
 * Por isso o segundo texto diz o prazo real e diz o que fazer com ele: fechar
 * a página e voltar entrando na conta. Prometer menos e entregar antes gera
 * menos suporte do que o contrário.
 */
function PixPanel({
  order, copied, gaveUp, automatico, retomado, onCopy, onRetry
}: {
  order: Order; copied: boolean; gaveUp: boolean; automatico: boolean; retomado: boolean;
  onCopy: () => void; onRetry: () => void;
}) {
  const ate = new Date(order.pix!.expiresAt).toLocaleTimeString(LOCALE_INTL, {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  });
  return (
    <div className="grid gap-4">
      {retomado && (
        <p className="font-ui text-[13.5px] leading-relaxed text-ink-body
                      bg-[var(--accent-wash)] rounded-[var(--r-md)] px-4 py-3">
          {tx.pixRetomado(ate)}
        </p>
      )}
      <div className="grid gap-2">
        <p className="font-ui text-[12px] uppercase tracking-[.07em] text-ink-muted">
          {tx.pixCopiaECola}
        </p>
        <code className="block break-all rounded-[var(--r-md)] border border-line bg-surface-2
                         px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-body">
          {order.pix!.code}
        </code>
        <Button variant="secondary" onClick={onCopy} full>
          {copied ? tx.copiado : tx.copiarCodigo}
        </Button>
      </div>

      {!automatico ? (
        <div className="grid gap-2">
          <p aria-live="polite" className="font-ui text-[14px] leading-relaxed text-ink-body
                                           bg-surface-2 rounded-[var(--r-md)] px-4 py-3">
            {tx.pixManual(empresa.atendimento.prazoRespostaUteis)}
          </p>
          <p className="font-ui text-[12.5px] leading-relaxed text-ink-muted">
            {tx.sePassarDoPrazo}{' '}
            <a href={`mailto:${empresa.contato.emailSuporte}`}
               className="text-[var(--accent)] hover:underline">
              {empresa.contato.emailSuporte}
            </a>{' '}
            {tx.comONumero}<code className="font-mono">{order.id}</code>.
          </p>
        </div>
      ) : gaveUp ? (
        <div className="grid gap-3">
          <p role="alert" className="font-ui text-[14px] leading-relaxed text-ink-body
                                     bg-[var(--amber-wash)] rounded-[var(--r-md)] px-4 py-3">
            {tx.pagamentoNaoApareceu}
          </p>
          <Button variant="secondary" onClick={onRetry} full>{tx.gerarOutroCodigo}</Button>
        </div>
      ) : (
        <p aria-live="polite" className="font-ui text-[14px] leading-relaxed text-ink-body">
          {tx.esperandoPagamento}
        </p>
      )}
    </div>
  );
}

/* ── peças ────────────────────────────────────────────────────────────── */

function MethodOption({
  checked, onSelect, titlePt, detailPt
}: { checked: boolean; onSelect: () => void; titlePt: string; detailPt: string }) {
  return (
    <label className={`flex items-start gap-3 rounded-[var(--r-md)] border-2 p-4 cursor-pointer
      transition-colors ${checked ? 'border-[var(--accent-soft)] bg-[var(--accent-wash)]'
                                  : 'border-line bg-surface hover:border-[var(--accent-soft)]'}`}>
      <input
        type="radio" name="metodo" checked={checked} onChange={onSelect}
        className="mt-1 w-[18px] h-[18px] accent-[var(--accent)]"
      />
      <span className="grid gap-0.5 min-w-0">
        <span className="font-ui text-[15px] font-semibold text-ink">{titlePt}</span>
        <span className="font-ui text-[13px] leading-relaxed text-ink-body">{detailPt}</span>
      </span>
    </label>
  );
}

/** O formulário de conta, apontando o retorno para o próprio checkout. */
function AuthFormInline({ slug }: { slug: string }) {
  /* `voltarAqui`: o retorno é o próprio checkout, com a consulta junto
     (`?parceria=`), e o link "Entrar" leva o mesmo destino. O `?next=` da
     URL não serve aqui: nenhum link para o checkout o traz, e sem ele a
     pessoa ia para o painel e era devolvida à página de venda. */
  return <AuthForm mode="signup" nivelDoTitulo="h2" voltarAqui key={slug} />;
}

function Shell({ course, children }: {
  course: ReturnType<typeof getCourse>; children: React.ReactNode;
}) {
  const c = course!;
  const parcelas = parcelasMax(c.price);
  const cheio = ancora(c.price);
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 sm:px-6 py-10 sm:py-14
                    grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="grid gap-5">
        <nav aria-label={tx.voceEstaEm} className="font-ui text-[13px] text-ink-muted">
          <Link href={paginaDeVenda(c.slug)} className="hover:text-[var(--accent)]">
            {c.titlePt}
          </Link>
          <span aria-hidden> · </span>
          <span>{tx.pagamento}</span>
        </nav>
        {children}
      </div>

      {/* O resumo fica visível o tempo todo, inclusive no celular, onde ele
          vai para cima do formulário e não para baixo dele - ninguém paga o
          que não consegue ver. */}
      <Card tone="wash" className="p-5 grid gap-3 content-start order-first lg:order-last">
        <h2 className="font-ui text-[11px] uppercase tracking-[.08em] text-[var(--accent)]">
          {tx.seuPedido}
        </h2>
        <p className="font-display text-[17px] font-bold text-ink leading-snug">{c.titlePt}</p>
        <p className="font-ui text-[13px] text-ink-muted">
          {tipoDe(c) === 'livro'
            ? tx.resumoLivro(c.modules.length, c.accessMonths)
            : tipoDe(c) === 'pacote'
              ? tx.resumoCombo(c.accessMonths)
              : tx.resumoCurso(c.stats.modules, c.stats.lessons || null, c.accessMonths)}
        </p>
        {/* O número grande é o número que vai ser cobrado.
            ──────────────────────────────────────────────────────────────
            Quando só existe PIX, o valor cheio em destaque e um "ou 12x" logo
            abaixo descrevem uma compra que não está à venda - e o resumo do
            pedido é justamente onde a pessoa confere quanto vai sair. Aqui o
            desconto do PIX deixa de ser uma alternativa e passa a ser o preço,
            com o valor cheio ficando como referência.

            E o inverso vale igual: sem PIX habilitado, a linha "R$ X no PIX"
            anuncia um desconto que o checkout não tem como dar. Um preço
            anunciado e não praticado não é detalhe de tela - é propaganda
            enganosa, e o lugar onde ela apareceria é exatamente onde a
            pessoa decide. */}
        {soPix() ? (
          <div className="border-t border-[color:var(--line-soft)] pt-3 grid gap-1">
            <p className="font-display text-[26px] font-bold text-ink leading-none">
              {brl(pixPrice(c.price))}
            </p>
            <p className="font-ui text-[12.5px] text-ink-body">
              {tx.noPix}
              {c.price.pixDiscountPct > 0
                && tx.descontoSobre(c.price.pixDiscountPct, brl(c.price.brl))}
            </p>
          </div>
        ) : (
          <div className="border-t border-[color:var(--line-soft)] pt-3 grid gap-1">
            {/* O mesmo rótulo da capa, no resumo do pedido: quem chegou aqui
                pela página de vendas confere se é o mesmo preço, e um número
                sozinho não responde isso. Ver `ancora()` em lib/catalog.ts. */}
            {cheio && (
              <p className="font-ui text-[11px] uppercase tracking-[.08em] text-[var(--accent)]">
                {tx.preLancamento(fimDoPreLancamento(c.price) || null, brl(cheio))}
              </p>
            )}
            <p className="font-display text-[26px] font-bold text-ink leading-none">
              {brl(c.price.brl)}
            </p>
            <p className="font-ui text-[12.5px] text-ink-body">
              {pagaPeloStripe() ? tx.stripeResumo : pagaDeFora() ? tx.paddleResumo : tx.ouNoCartao(parcelasTexto(parcelas))}
            </p>
            {c.price.pixDiscountPct > 0 && temPix() && (
              <p className="font-ui text-[12.5px] font-medium text-[var(--accent)]">
                {tx.pixDesconto(brl(pixPrice(c.price)), c.price.pixDiscountPct)}
              </p>
            )}
          </div>
        )}
        {/* A desistência no resumo, e não só no passo 2 (28/10/2026, revisão
            das páginas de venda): o passo 1 pede nome, e-mail e senha antes de
            mostrar as condições, e o direito do CDC é o que mais pesa para quem
            ainda não conhece o curso. Mesmo prazo de data/empresa.json. */}
        <p className="border-t border-[color:var(--line-soft)] pt-3 font-ui text-[12.5px] leading-[1.5] text-ink-body">
          {tx.resumoDesistir(empresa.politicas.arrependimentoDias)}
        </p>
      </Card>
    </div>
  );
}

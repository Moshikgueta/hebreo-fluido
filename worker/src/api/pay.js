/* Pagamento: criar, conferir, receber o aviso.
 * ─────────────────────────────────────────────────────────────────────────
 * Três rotas e uma função. As rotas são portas; a função `settle` é a única
 * coisa no sistema inteiro que libera acesso, e ela é chamada pelos três
 * caminhos pelos quais um pagamento pode chegar até nós:
 *
 *   webhook    - a Mercado Pago avisa;
 *   verify     - o comprador está com a tela aberta e perguntamos;
 *   reconcile  - o cron varre pendentes antigos.
 *
 * Um caminho só não basta: webhook se perde, aba fecha, e o cron sozinho
 * faria o comprador esperar dez minutos olhando para "aguardando". Três
 * caminhos redundantes com UMA função de liberação é a forma de ter
 * resiliência sem ter três regras diferentes de quando liberar.
 *
 * E `settle` é idempotente por construção: o UNIQUE em payment_events barra o
 * aviso repetido, e o próprio `settle` não faz nada se o pedido já está pago.
 */

import { fail, json, notSignedIn, readJson } from '../lib/http.js';
import { ip, ipCompleto, requireAccount } from './auth.js';
import { MOTIVOS_DESISTENCIA, motivoValido } from '../lib/motivos.js';
import { contarChave } from './estatisticas.js';
import { clampInstallments, getCourse, isSellable, itensDoPedido, parceriaValida, priceCents, tipoDe } from '../lib/catalog.js';
import { origemDoCorpo } from '../lib/origem.js';
import {
  acessosVencidos, arrependimentosDe, createOrder, entitlementExpiry, entitlementOf, estornoAtualizar,
  estornoCriar, estornoDe, estornosDe, estornosParaVarrer, findAccountById, getOrder, grantAccess, log,
  conteudoBaixado, markPaid, ordersOf, outroPedidoPagoRecente, pedirArrependimento, pixPendente, recibosManuaisPendentes,
  recordEvent, refundOrder, reservarAviso, soltarAviso, throttled, ultimoPagamentoDe, updateOrder
} from '../lib/db.js';
import {
  dataBR, dataHoraBR, mailReady, mensagemDeArrependimentoDono,
  mensagemDeAlerta, reaisBR, sendMail
} from '../lib/mail.js';
import { mensagens } from '../lib/mensagens.js';
import { MARCA, idiomaDaConta, tituloDoCurso } from '../lib/idioma.js';
import {
  cancelPayment, createCardPreference, createPix, getPayment, mapStatus, paymentsFor, paymentsOfChargeback,
  paymentsOfMerchantOrder, refundPayment, verifyWebhookSignature
} from '../lib/mercadopago.js';
import { brCode, confereBrCode } from '../lib/pix.js';
import {
  buscarTransacao, conferirAssinatura, criarTransacao, ehSandbox, estornarTransacao, idDeTransacao,
  paddlePronto, pagamentoDe, tokenDoCliente
} from '../lib/paddle.js';
import empresa from '../../../data/empresa.json';
import { DIAS_PADDLE, diasDoPedido, prazoDeDesistencia } from '../lib/desistencia.js';
import { gravarTermosDoPedido, linkDaVersao, versaoAtual } from '../lib/versoes.js';

/* ── qual trilho de cobrança está ligado ──────────────────────────────────
 * Sai de data/empresa.json, e não de uma variável de ambiente, porque os
 * DOIS lados precisam da mesma resposta: o Worker, para saber o que criar, e
 * o checkout, para saber o que oferecer. Em dois lugares eles divergem, e a
 * divergência aqui é uma tela que oferece cartão e um servidor que não sabe
 * cobrar no cartão.
 */
const PAGAMENTO = (empresa.pagamento && empresa.pagamento.modo) || 'mercadopago';
const pixDireto = () => PAGAMENTO === 'pix-direto';

/* O site em inglês cobra pelo Paddle (PLANO-INGLES.md, etapa 5), em dólar.
   Decidido pelo idioma do Worker, e não por data/empresa.json: o arquivo é o
   mesmo nas duas builds, e o build do app decide pelo mesmo critério
   (NEXT_PUBLIC_LOCALE, lib/empresa.ts). */
const paddle = env => !!env && (env.LOCALE === 'en' || env.LOCALE === 'es');

/* E QUAIS FORMAS a conta do provedor aceita nesta build.
 * ─────────────────────────────────────────────────────────────────────────
 * Resolvido na publicação por scripts/pagamento-ativo.mjs, que pergunta à
 * Mercado Pago. Ausente (build antiga) significa os dois, que era o
 * comportamento de antes do campo existir.
 *
 * O checkout já esconde o que não dá para cobrar; isto é para quem chama a
 * API direto - e para o dia em que a tela e o servidor discordarem, que é o
 * dia em que alguém mexe num e esquece o outro. */
const FORMAS = (empresa.pagamento && empresa.pagamento.formas) || null;
const aceita = forma => {
  if (pixDireto()) return forma === 'pix';
  if (!FORMAS) return true;
  return forma === 'pix' ? !!FORMAS.pix : !!FORMAS.cartao;
};

/* ── o prazo de desistência ────────────────────────────────────────────────
 * Em lib/desistencia.js desde 03/11/2026 (o acesso também o usa). */
export { DIAS_PADDLE, prazoDeDesistencia };

/** Um pedido, no formato que o app espera (app/src/lib/account/types.ts).
 *  `desistenciaEm` é o momento do pedido de desistência, se houver. */
const toOrder = (row, desistenciaEm = null, estorno = null, ultimoPagamento = undefined) => ({
  id: row.id,
  courseSlug: row.course_slug,
  amountCents: row.amount_cents,
  method: row.method,
  status: row.status,
  createdAt: new Date(row.created_at).toISOString(),
  paidAt: row.paid_at ? new Date(Number(row.paid_at)).toISOString() : null,
  /* Até quando o botão "Desistir da compra" aparece. Só para pedido pago. */
  desistirAte: row.status === 'paid' && row.paid_at
    ? new Date(prazoDeDesistencia(row.paid_at, diasDoPedido(row))).toISOString() : null,
  desistenciaEm: desistenciaEm ? new Date(desistenciaEm).toISOString() : null,
  /* Como o dinheiro está voltando: `automatico` (o site pediu o estorno à
     Mercado Pago), `manual` (o dono estorna) ou null (não houve desistência). */
  estorno: estorno ? (['manual', 'erro'].includes(estorno) ? 'manual' : 'automatico') : null,
  /* Só na consulta da tela de retorno: o que o provedor disse por último
     sobre o pagamento deste pedido ('em-analise', 'recusado', ...), para o
     TEXTO da tela (PAY-B-003). Nunca decide acesso. */
  ...(ultimoPagamento !== undefined ? { ultimoPagamento } : {}),
  ...(row.pix_code ? {
    pix: {
      code: row.pix_code,
      qrPngBase64: null,     // o QR não é guardado: é grande e derivável do código
      expiresAt: new Date(row.pix_expires_at || Date.now()).toISOString()
    }
  } : {})
});

const origin = request => new URL(request.url).origin;

/* ── POST /api/pay/create ───────────────────────────────────────────────── */

export async function create({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();

  /* Cada pedido é uma linha aqui e uma cobrança de verdade na Mercado Pago,
     com chave de idempotência nova. Sem freio, uma conta gratuita num laço
     enchia o painel de cobranças fantasmas e a fila da varredura de pedidos
     que nunca vão compensar - e gastava a cota diária de escrita do D1, umas
     oito linhas por pedido. Por HORA desde a auditoria de 24/09/2026: seis
     por conta é um humano indeciso; o de endereço segura quem cria contas
     descartáveis para contornar o primeiro. Ninguém abre dez checkouts por
     hora. */
  if (await throttled(env, `payip-h:${ip(request)}`, 10, 3_600_000)) return fail('rate-limited-hora', 429);
  if (await throttled(env, `pay-h:${account.id}`, 6, 3_600_000)) return fail('rate-limited-hora', 429);

  const body = await readJson(request);
  if (!body || typeof body !== 'object') return fail('server');

  const course = getCourse(typeof body.courseSlug === 'string' ? body.courseSlug : '');
  if (!isSellable(course)) return fail('server', 404);

  /* A plataforma pode estar no ar antes de a conta da Mercado Pago existir -
     e esse é um estado normal, não uma falha. Sem token não se cria pedido
     nenhum: melhor uma tela que diz "o pagamento ainda não está ligado" do
     que um 502 genérico e um pedido pendente que nunca vai compensar.

     No modo `pix-direto` isso não se aplica: o BR Code não depende de token
     nenhum, que é exatamente o motivo de esse modo existir. */
  if (paddle(env)) {
    /* Sem a chave, ou com o token do Paddle.js de outro ambiente, o checkout
       abriria e recusaria todo cartão: melhor dizer que não está ligado. */
    if (!paddlePronto(env) || !tokenDoCliente(env)) return fail('payments-off', 503);
    if (!(Number(course.price && course.price.usd) > 0)) return fail('server', 404);
  } else if (!pixDireto() && !env.MP_ACCESS_TOKEN) return fail('payments-off', 503);

  /* Já é dono: não cobra de novo. Vender duas vezes a mesma coisa para a mesma
     pessoa é estorno garantido - e é um erro fácil de cometer quando o
     comprador abre o checkout por um link antigo.

     Exceto nos últimos 45 dias: aí é RENOVAÇÃO, e `grantAccess` estende a
     partir do vencimento, então pagar cedo não perde dia nenhum. Sem esta
     janela o botão "Renovar acesso" do painel levava a um checkout que
     respondia 409 - a renovação só era possível DEPOIS de perder o acesso. */
  /* No pacote, a pergunta vale para cada produto dele: quem já tem o curso
     (fora da janela de renovação) compra só o e-book, e o checkout diz isso
     com o erro `ja-tem-parte`, em vez de cobrar de novo o que já é dele. */
  const RENOVACAO_MS = 45 * 86_400_000;
  const itens = itensDoPedido(course);
  for (const item of itens) {
    const vence = await entitlementExpiry(env, account.id, item.courseSlug);
    if (vence !== null && (vence === undefined || vence - Date.now() > RENOVACAO_MS)) {
      return fail(tipoDe(course) === 'pacote' ? 'ja-tem-parte' : 'already-owned', 409);
    }
  }

  /* Uma forma que esta implantação não consegue cobrar é recusada AQUI, em
     vez de virar um pedido que nunca vai ser pago - ou, pior, uma chamada à
     Mercado Pago que volta com um erro cru na cara do comprador.

     Dois motivos possíveis, e o código de erro é o mesmo para os dois porque
     a resposta para quem chamou também é: o modo `pix-direto`, em que não há
     adquirente nenhum para o cartão; e a conta do provedor não ter aquele
     meio habilitado, o que a publicação descobre perguntando a eles.

     O checkout já esconde o que não dá para cobrar. Isto é para quem chama a
     API direto, e para o dia em que a tela e o servidor discordarem. */
  if (paddle(env)) return criarNoPaddle(env, request, account, course, body);

  const pedido = body.method === 'card' ? 'card' : 'pix';
  if (!aceita(pedido)) return fail(pedido === 'card' ? 'card-off' : 'pix-off', 409);

  const method = pedido;
  const installments = method === 'card' ? clampInstallments(course, body.installments) : 1;

  /* O VALOR sai do catálogo. Do corpo só vem o NOME de uma parceria, que
     vale apenas se estiver em PARCERIAS (lib/catalog.js). */
  const parceria = parceriaValida(body.parceria) ? body.parceria : null;
  const amountCents = priceCents(course, method, parceria);

  /* O PIX anterior ainda pagável deste curso, se houver: ao gerar outro, ele
     é cancelado na Mercado Pago (PAY-B-002). Lido antes de criar o novo. */
  const pixAnterior = method === 'pix' && !pixDireto()
    ? await pixPendente(env, account.id, course.slug) : null;

  /* De onde a pessoa veio (lib/origem.js): só para o dono ler, nunca muda
     o preço nem o que o pedido abre. */
  const { fonte: origem, campanha } = origemDoCorpo(body.origem);

  const order = await createOrder(env, {
    accountId: account.id, courseSlug: course.slug, amountCents, method, installments, parceria,
    origem, campanha
  });
  /* A versão dos Termos que vale para este pedido (LEGAL-104). */
  await gravarTermosDoPedido(env, order.id);

  try {
    /* ── PIX direto ────────────────────────────────────────────────────
       Nenhuma chamada de rede: o BR Code é montado aqui, a partir da chave
       do recebedor em data/empresa.json. Não há `provider_ref` porque não
       há provedor, e o pedido nasce e fica `pending` até alguém olhar o
       extrato e liberar - o que a tela diz com todas as letras.

       O código é RELIDO antes de sair. Um BR Code errado não falha aqui:
       falha no aplicativo do banco do comprador, com "QR Code inválido" e
       nenhuma pista, no pior momento possível. */
    if (pixDireto()) {
      const { pix: conf } = empresa.pagamento;
      const codigo = brCode({
        chave: conf.chave,
        nome: conf.titular,
        cidade: conf.cidade,
        valor: amountCents / 100,
        txid: order.id
      });

      const conferido = confereBrCode(codigo);
      if (!conferido.ok) throw new Error(`br code invalido: ${conferido.erro}`);

      /* Trinta minutos, como o PIX da Mercado Pago. Não é o banco que
         expira o código - é a nossa tela que para de mostrá-lo, para que
         ninguém pague um pedido esquecido de ontem. */
      const expira = Date.now() + 30 * 60_000;
      await updateOrder(env, order.id, {
        provider_ref: null,
        pix_code: codigo,
        pix_expires_at: expira,
        status: 'pending'
      });
      await log(env, account.id, 'pix-direto', `${order.id} ${amountCents}`);
      return json(toOrder(await getOrder(env, order.id)));
    }

    if (method === 'pix') {
      const pix = await createPix(env, { order, course, account, origin: origin(request) });
      await updateOrder(env, order.id, {
        provider_ref: pix.paymentId,
        pix_code: pix.pixCode,
        pix_expires_at: pix.expiresAt,
        status: pix.status === 'paid' ? 'paid' : 'pending'
      });
      /* O raríssimo caso de já nascer aprovado. Passa pelo mesmo `settle` que
         todo o resto, para que não exista um segundo lugar que libera acesso. */
      if (pix.status === 'paid') await settle(env, order.id, pix.paymentId, 'verify');
      /* Só DEPOIS que o novo código existe: se a criação falhar, o aluno
         continua com o anterior. A recusa (já pago, já vencido) é ignorada. */
      if (pixAnterior && pixAnterior.provider_ref) {
        try {
          await cancelPayment(env, pixAnterior.provider_ref);
          await updateOrder(env, pixAnterior.id, { status: 'expired' });
          await log(env, account.id, 'pix-cancelado', `${pixAnterior.id} trocado por ${order.id}`);
        } catch (e) {
          await log(env, account.id, 'pix-cancelar-falhou', `${pixAnterior.id} ${e.message || e}`);
        }
      }
      return json(toOrder(await getOrder(env, order.id)));
    }

    const pref = await createCardPreference(env, {
      order, course, account, origin: origin(request)
    });
    await updateOrder(env, order.id, { provider_ref: pref.preferenceId, pay_url: pref.payUrl });
    return json({ ...toOrder(await getOrder(env, order.id)), redirectUrl: pref.payUrl });

  } catch (e) {
    /* O pedido fica registrado como falho e não some: um pedido apagado é um
       pagamento que pode cair depois sem ter onde encaixar. */
    await updateOrder(env, order.id, { status: 'failed' });

    /* O MOTIVO, e não só o código.
       ──────────────────────────────────────────────────────────────────
       `e.message` é "mercadopago 400" - verdadeiro e inútil. O que diz o
       que consertar está em `e.data`, o corpo que eles devolvem:
       `invalid_payer_email`, conta sem chave PIX habilitada, "cannot
       operate between same user" (comprar do próprio vendedor). São
       consertos diferentes atrás do mesmo 400, e sem isto a única saída
       é adivinhar qual.

       Vai para a trilha, e não só para o console: ler o log do Worker
       exige alguém com o painel da Cloudflare aberto na hora exata. A
       trilha espera. */
    let detalhe = '';
    try { detalhe = e && e.data ? JSON.stringify(e.data).slice(0, 400) : ''; }
    catch { /* objeto com ciclo, ou getter que lança */ }
    await log(env, account.id, 'pay-create-failed',
      `${order.id} ${method} ${e.message || e} ${detalhe}`.trim());

    /* Código próprio, e não o `server` genérico.
       ──────────────────────────────────────────────────────────────────
       "Alguma coisa quebrou do nosso lado, tente de novo" é a frase certa
       para quase toda falha e a errada para esta. Aqui a pessoa está com
       o cartão na mão: ela tenta de novo, falha de novo, e vai embora -
       e a falha é de configuração, então tentar de novo NUNCA vai
       funcionar. O texto desse código (app/src/lib/account/types.ts) diz
       que o problema é nosso e dá o endereço do suporte, que é o único
       caminho que resolve para ela hoje. */
    return fail('payment-failed', 502);
  }
}

/* ── o pedido no Paddle ─────────────────────────────────────────────────
 * Um meio só (`paddle`): cartão, PayPal, Apple Pay e Google Pay aparecem no
 * próprio checkout do Paddle, que decide pelo país do comprador. Sem
 * parcelas e sem desconto: o valor é `price.usd` do catálogo, em centavos.
 * A tela recebe o id da transação e o token do Paddle.js e abre o checkout
 * por cima da página; quem vê o número do cartão é só o Paddle. */
async function criarNoPaddle(env, request, account, course, body) {
  const amountCents = Math.round(Number(course.price.usd) * 100);
  const { fonte: origem, campanha } = origemDoCorpo(body.origem);
  const order = await createOrder(env, {
    accountId: account.id, courseSlug: course.slug, amountCents, method: 'paddle', installments: 1,
    origem, campanha, currency: 'USD', provider: 'paddle'
  });
  await gravarTermosDoPedido(env, order.id);
  try {
    const txn = await criarTransacao(env, { order, course, account });
    if (!txn || !idDeTransacao(txn.id)) throw new Error('paddle sem id de transacao');
    await updateOrder(env, order.id, { provider_ref: txn.id });
    return json({
      ...toOrder(await getOrder(env, order.id)),
      paddle: { transactionId: txn.id, clientToken: tokenDoCliente(env), sandbox: ehSandbox(env) }
    });
  } catch (e) {
    await updateOrder(env, order.id, { status: 'failed' });
    let detalhe = '';
    try { detalhe = e && e.data ? JSON.stringify(e.data).slice(0, 400) : ''; } catch { /* idem */ }
    await log(env, account.id, 'pay-create-failed', `${order.id} paddle ${e.message || e} ${detalhe}`.trim());
    return fail('payment-failed', 502);
  }
}

/* ── GET /api/pay/verify?order=… ────────────────────────────────────────── */

export async function verify({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();

  const id = new URL(request.url).searchParams.get('order');
  const order = await getOrder(env, id);
  /* O pedido de outra pessoa responde igual a um pedido inexistente. Um id de
     pedido não é credencial - ele aparece na URL, no histórico, na captura de
     tela colada num chamado de suporte. */
  if (!order || order.account_id !== account.id) return fail('server', 404);

  /* No PIX direto não há a quem perguntar: o BR Code é nosso e o dinheiro cai
     na conta sem avisar ninguém. O pedido fica `pending` até alguém liberar à
     mão, e a tela do comprador precisa saber disso para parar de girar em vez
     de prometer uma confirmação que não vem. */
  /* `failed` também (27/09/2026): um cartão recusado marca o pedido, e a
     segunda tentativa, aprovada, era invisível para esta consulta - só o
     aviso da Mercado Pago a liberava, e um aviso perdido deixava quem pagou
     do lado de fora. */
  /* `expired` também (01/10/2026, PAY-B-009): um cartão em análise
     antifraude por mais de 24 h vira `expired` na varredura, e a aprovação
     que vem depois precisa ser achada por quem volta à tela. Um `failed` sem
     `provider_ref` nunca existiu no provedor: não há a quem perguntar. */
  const consultavel = order.status === 'pending'
    || ((order.status === 'failed' || order.status === 'expired') && order.provider_ref);
  if (consultavel && !pixDireto()) {
    /* Cada consulta aqui é uma chamada à Mercado Pago com a nossa
       credencial. A tela pergunta a cada três segundos; um laço perguntaria
       mil vezes por minuto e gastaria a cota do vendedor com a conta de um
       comprador. Vinte por minuto por conta, e uma consulta feita há menos
       de cinco segundos vale como resposta. */
    const recente = order.checked_at && Date.now() - Number(order.checked_at) < 5_000;
    /* O teto da hora: 180 consultas são quinze minutos da tela perguntando a
       cada cinco segundos. Passado isso a tela recebe o que está gravado, e
       quem liquida é o aviso da Mercado Pago ou a varredura de 5 em 5 min -
       o comprador espera minutos a mais, e a cota de escrita não paga a
       espera. */
    /* 240 por hora: a tela espera até 30 minutos (a validade do PIX), a cada
       3 s nos primeiros 5 e a cada 15 s depois - cerca de 200 perguntas. */
    if (!recente && !await throttled(env, `verify-h:${account.id}`, 240, 3_600_000)
        && !await throttled(env, `verify:${account.id}`, 20)) {
      await settleFromProvider(env, order, 'verify');
    }
    return json(toOrder(await getOrder(env, order.id), null, null, await ultimoPagamentoDe(env, order.id)));
  }
  return json(toOrder(order, null, null, await ultimoPagamentoDe(env, order.id)));
}

/* ── GET /api/pay/pix?curso=… | ?order=… ─────────────────────────────────
 * O PIX ainda pagável, para reabrir (auditoria de 01/10/2026, PAY-B-002).
 * O código vivia só na memória da aba: recarregar, ou voltar do aplicativo
 * do banco com a aba descartada pelo celular, mostrava de novo o botão
 * "Pagar", e quem clicava gerava um segundo PIX - o caminho mais curto para
 * "paguei duas vezes". Com `curso`, o pendente mais recente daquele curso;
 * com `order`, aquele pedido. Só da própria conta, e só enquanto vale:
 * fora disso, `{ order: null }`. */
export async function pixAberto({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();
  const q = new URL(request.url).searchParams;
  const id = q.get('order');
  let row = null;
  if (id) {
    const o = await getOrder(env, id);
    if (o && o.account_id === account.id && o.status === 'pending' && o.method === 'pix'
        && o.pix_code && Number(o.pix_expires_at) > Date.now()) row = o;
  } else {
    const curso = getCourse(String(q.get('curso') || ''));
    if (curso) row = await pixPendente(env, account.id, curso.slug);
  }
  return json({ order: row ? toOrder(row) : null });
}

/* ── GET /api/orders ────────────────────────────────────────────────────── */

export async function orders({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();
  const pedidos = await arrependimentosDe(env, account.id);
  const estornos = await estornosDe(env, account.id);
  return json({
    orders: (await ordersOf(env, account.id)).map(o =>
      toOrder(o, pedidos.get(String(o.id)) || null, estornos.get(String(o.id)) || null)),
    /* Os acessos que venceram, com a data (PAY-B-004). A sessão só carrega os
       que valem, e o /perfil tratava quem pagou e venceu como quem nunca
       comprou. */
    vencidos: await acessosVencidos(env, account.id)
  });
}

/* ── POST /api/pay/desistir ─────────────────────────────────────────────── */

/**
 * O pedido de desistência, feito pelo próprio site.
 * ─────────────────────────────────────────────────────────────────────────
 * O Decreto 7.962/2013 (art. 5º) quer duas coisas que o e-mail sozinho não
 * dava: que o consumidor possa desistir "pela mesma ferramenta utilizada
 * para a contratação" - o site - e que o recebimento seja confirmado
 * IMEDIATAMENTE. Então: um botão em Sua conta → Compras, este endpoint, e um
 * e-mail de confirmação que sai na hora, com a data e a hora do pedido.
 *
 * E o estorno sai SOZINHO (decisão do dono, 28/09/2026): este endpoint pede
 * à Mercado Pago a devolução total na hora - ver `iniciarEstorno`. Antes o
 * pedido só virava um e-mail para o dono, sem lista, sem lembrete e sem
 * prazo controlado (auditoria, LEGAL-013/PAY-003), e o CDC quer a devolução
 * imediata. Quando a Mercado Pago confirma o estorno, `applyPayment` fecha o
 * acesso como sempre; o que não dá para estornar sozinho vira alerta ao dono
 * até ser resolvido (worker/src/alertas.js).
 *
 * Pedir de novo não faz nada de novo: vale o PRIMEIRO pedido, e a pessoa
 * recebe a mesma resposta - inclusive depois do prazo, porque o que importa
 * é que ela pediu dentro dele.
 */
export async function desistir({ request, env, ctx }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();
  if (await throttled(env, `desistir-h:${account.id}`, 10, 3_600_000)) return fail('rate-limited-hora', 429);

  const body = await readJson(request);
  if (!body || typeof body !== 'object') return fail('server');
  const order = await getOrder(env, typeof body.order === 'string' ? body.order : '');
  if (!order || order.account_id !== account.id) return fail('server', 404);

  const jaPedido = (await arrependimentosDe(env, account.id)).get(String(order.id));
  if (jaPedido) {
    return json({ ok: true, novo: false, pedidoEm: new Date(jaPedido).toISOString() });
  }

  if (order.status !== 'paid') return fail('nao-pago', 409);
  const ate = prazoDeDesistencia(order.paid_at, diasDoPedido(order));
  if (!ate || Date.now() > ate) return fail('fora-do-prazo', 409);

  const r = await pedirArrependimento(env, {
    orderId: order.id, accountId: account.id, ip: ipCompleto(request)
  });
  /* O motivo, se a pessoa quis dizer (04/10/2026). Opcional e de uma lista
     fechada (lib/motivos.js): sem motivo, ou com um inválido, a desistência
     segue igual. Vai no e-mail do dono e soma um contador sem nome. */
  const motivo = motivoValido(body.motivo);
  let estado = null;
  if (r.novo) {
    await log(env, account.id, 'desistencia-pedida', order.id);
    /* O estorno ANTES dos e-mails, para que eles digam o que de fato
       aconteceu com o dinheiro. Nunca lança: o pedido já está gravado, e o
       que falhar aqui a varredura tenta de novo. */
    estado = await iniciarEstorno(env, order);
    if (motivo) await contarChave(env, `m|${motivo}`);
    const avisar = avisarDesistencia(env, order, account, r.pedidoEm, estado, motivo);
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(avisar);
    else await avisar;
  }
  return json({ ok: true, novo: r.novo, pedidoEm: new Date(r.pedidoEm).toISOString() });
}

/* ── o estorno da desistência ──────────────────────────────────────────────
 * Estados em `estornos` (schema.sql): pendente → pedido → concluido, ou
 * manual/erro quando não há como devolver sozinho.
 */

/** Tentativas antes de desistir e chamar o dono. Com o intervalo dobrando a
 *  partir de 5 min (teto de 6 h), oito tentativas cobrem pouco mais de um
 *  dia - bem dentro dos dez dias úteis prometidos. */
const MAX_TENTATIVAS = 8;
const espera = n => Math.min(5 * 60_000 * 2 ** Math.max(0, n - 1), 6 * 3_600_000);

/** Dá para estornar sozinho? Só um pagamento da Mercado Pago, com o id dele,
 *  e com a credencial no ar. PIX direto, liberação à mão e convite não. */
const estornavel = (env, order) =>
  order.provider === 'paddle'
    ? paddlePronto(env) && idDeTransacao(order.provider_ref)
    : !pixDireto() && !!env.MP_ACCESS_TOKEN && order.provider === 'mercadopago'
      && /^\d{1,24}$/.test(String(order.provider_ref || ''));

/** Cria o estorno do pedido e faz a primeira tentativa. Devolve o estado. */
export async function iniciarEstorno(env, order) {
  try {
    const auto = estornavel(env, order);
    const row = await estornoCriar(env, {
      orderId: order.id, paymentId: auto ? order.provider_ref : '', estado: auto ? 'pendente' : 'manual'
    });
    if (!auto) {
      await log(env, order.account_id, 'estorno-manual', order.id);
      return 'manual';
    }
    return await tentarEstorno(env, row);
  } catch (e) {
    console.error('estorno', e && e.stack || e);
    return null;
  }
}

/** Uma tentativa. Devolve o estado depois dela. */
async function tentarEstorno(env, row) {
  const order = await getOrder(env, row.order_id);
  if (!order) return row.estado;
  if (order.status === 'refunded') {
    await estornoAtualizar(env, order.id, { estado: 'concluido' });
    return 'concluido';
  }
  const tentativas = Number(row.tentativas || 0) + 1;
  try {
    const refund = idDeTransacao(row.payment_id)
      ? await estornarTransacao(env, row.payment_id)
      : await refundPayment(env, row.payment_id, `estorno-${order.id}`);
    await estornoAtualizar(env, order.id, {
      estado: 'pedido', tentativas, refund_id: String(refund && refund.id || ''), erro: ''
    });
    await log(env, order.account_id, 'estorno-pedido', `${order.id} ${refund && refund.status || ''}`.trim());
  } catch (e) {
    /* A Mercado Pago recusou. Se foi porque o pagamento JÁ está devolvido
       (o dono estornou pelo painel, ou uma resposta nossa se perdeu), o
       acerto abaixo fecha o pedido; senão, tenta de novo mais tarde. */
    const motivo = `${e && e.status || ''} ${e && e.data && (e.data.message || e.data.error) || e && e.message || ''}`
      .trim().slice(0, 200);
    const desistir = tentativas >= MAX_TENTATIVAS;
    await estornoAtualizar(env, order.id, {
      estado: desistir ? 'erro' : 'pendente', tentativas, erro: motivo,
      proxima_em: Date.now() + espera(tentativas)
    });
    await log(env, order.account_id, 'estorno-falhou', `${order.id} ${tentativas}/${MAX_TENTATIVAS} ${motivo}`);
    if (desistir) await avisarEstornoTravado(env, order, motivo);
  }
  /* O mesmo caminho do webhook: pergunta à Mercado Pago o estado do
     pagamento e aplica. Se ela já diz `refunded`, o acesso fecha aqui. */
  try { await settleFromPaymentId(env, row.payment_id, 'estorno'); } catch { /* a varredura tenta */ }
  const depois = await getOrder(env, order.id);
  if (depois && depois.status === 'refunded') {
    await estornoAtualizar(env, order.id, { estado: 'concluido' });
    return 'concluido';
  }
  if (await seguirParaOutroPagamento(env, row, depois)) return 'pendente';
  return (await estornoDe(env, order.id))?.estado || null;
}

/** O pedido foi pago DUAS vezes e o estorno devolveu um dos pagamentos: ele
 *  continua `paid`, agora pelo outro (PAY-B-008, `applyPayment`). Desistir é
 *  receber tudo de volta, então o estorno segue para o pagamento que restou,
 *  do zero. true quando seguiu. */
async function seguirParaOutroPagamento(env, row, order) {
  if (!order || order.status !== 'paid') return false;
  const ref = String(order.provider_ref || '');
  if (!/^\d{1,24}$/.test(ref) || ref === String(row.payment_id)) return false;
  await estornoAtualizar(env, order.id, {
    payment_id: ref, estado: 'pendente', tentativas: 0, proxima_em: Date.now(), erro: ''
  });
  await log(env, order.account_id, 'estorno-segue', `${order.id}: estornar também ${ref}`);
  return true;
}

/** Oito tentativas falharam: o dono precisa agir. O lembrete diário de
 *  worker/src/alertas.js repete até resolver; este é o aviso imediato. */
async function avisarEstornoTravado(env, order, motivo) {
  try {
    const dono = String(env.SUPPORT_EMAIL || '').trim();
    if (!dono || !mailReady(env)) return;
    await sendMail(env, {
      to: dono,
      ...mensagemDeAlerta({
        assunto: `Estorno automático falhou: ${order.id}`,
        linhas: [
          `O estorno da desistência do pedido ${order.id} (${reaisBR(order.amount_cents, order.currency)}) falhou ${MAX_TENTATIVAS} vezes.`,
          ...(order.provider === 'paddle' ? [
            `Última resposta do Paddle: ${motivo || 'sem detalhe'}.`,
            '',
            `Devolva pelo painel do Paddle (Transactions -> ${order.provider_ref || 'a transação'} -> Refund).`
          ] : [
            `Última resposta da Mercado Pago: ${motivo || 'sem detalhe'}.`,
            '',
            'Devolva pelo painel da Mercado Pago (Atividade -> o pagamento -> Devolver dinheiro).'
          ]),
          'Quando ela confirmar, o acesso fecha sozinho e este pedido sai do lembrete diário.'
        ]
      })
    });
  } catch { /* o lembrete diário cobre */ }
}

/** A parte da varredura de 5 em 5 min: tenta de novo os pendentes e acerta
 *  os que a Mercado Pago já confirmou. Nunca lança. */
export async function runEstornos(env) {
  let tentados = 0;
  for (const row of await estornosParaVarrer(env)) {
    try {
      if (row.estado === 'pendente') { await tentarEstorno(env, row); tentados++; continue; }
      /* `pedido`: a Mercado Pago aceitou; confere se já devolveu. */
      try { await settleFromPaymentId(env, row.payment_id, 'estorno'); } catch { /* próxima */ }
      const order = await getOrder(env, row.order_id);
      if (await seguirParaOutroPagamento(env, row, order)) continue;
      await estornoAtualizar(env, row.order_id,
        order && order.status === 'refunded' ? { estado: 'concluido' } : { estado: 'pedido' });
    } catch (e) {
      console.error('estornos', e && e.stack || e);
    }
  }
  return { tentados };
}

/** Os dois e-mails da desistência: a confirmação para quem pediu, e o aviso
 *  ao dono dizendo se o estorno saiu sozinho ou se é com ele. Nunca lança -
 *  o pedido já está gravado. */
async function avisarDesistencia(env, order, account, pedidoEm, estado, motivo = null) {
  try {
    if (!mailReady(env)) return;
    const curso = getCourse(order.course_slug)?.titlePt || order.course_slug;
    const cursoDoAluno = tituloDoCurso(getCourse(order.course_slug), idiomaDaConta(account), curso);
    const valor = reaisBR(order.amount_cents, order.currency);
    const quando = dataHoraBR(pedidoEm);
    const prazoUteis = Number(empresa.politicas?.prazoReembolsoUteis) || 10;
    const marca = idiomaDaConta(account) === 'en' ? MARCA.en : (empresa.nomeFantasia || MARCA.pt);

    const r = await sendMail(env, {
      to: account.email,
      ...mensagens(idiomaDaConta(account)).arrependimento({
        nome: account.name || '', curso: cursoDoAluno, valor, pedido: order.id, pedidoEm: quando,
        prazoUteis, cartao: order.method === 'card', marca,
        suporte: empresa.contato?.emailSuporte || '',
        estornoPedido: estado === 'pedido' || estado === 'concluido'
      })
    });
    await log(env, account.id, r.ok ? 'desistencia-confirmada' : 'desistencia-email-falhou',
      r.ok ? order.id : `${order.id} ${r.motivo}`);

    const dono = String(env.SUPPORT_EMAIL || '').trim();
    if (dono) {
      const baixado = await conteudoBaixado(env, account.id, Number(order.paid_at) || Number(order.created_at));
      await sendMail(env, {
        to: dono,
        ...mensagemDeArrependimentoDono({
          email: account.email, curso, valor, pedido: order.id, pedidoEm: quando,
          prazoUteis, pixDireto: pixDireto(), marca, estado,
          motivo: motivo ? MOTIVOS_DESISTENCIA[motivo] : null,
          conteudo: { dias: baixado.dias, primeiro: baixado.primeiro ? dataHoraBR(baixado.primeiro) : null }
        })
      });
    }
  } catch (e) {
    console.error('desistencia', e && e.stack || e);
  }
}

/* ── POST /api/pay/webhook ──────────────────────────────────────────────── */

export async function webhook({ request, env }) {
  const url = new URL(request.url);
  const body = await readJson(request, 32 * 1024) || {};

  /* A Mercado Pago manda o id ora na query, ora no corpo, dependendo do tipo
     de aviso e da versão da integração. Aceitar os dois é mais barato do que
     descobrir em produção qual deles chegou. */
  const dataId = url.searchParams.get('data.id') || body?.data?.id || url.searchParams.get('id');
  const type = String(url.searchParams.get('type') || body?.type || url.searchParams.get('topic') || body?.topic || '');

  /* Pagamento, contestação (chargeback) e pedido do Checkout Pro. Até
     28/09/2026 só `payment` era lido, e uma contestação que chegasse pelo
     tópico `chargebacks` deixava o aluno com o curso e sem o dinheiro
     (auditoria, PAY-002). Aviso de plano, de assinatura ou de outro produto
     chega na mesma URL e não tem o que fazer aqui. */
  const tipo = !type || type.startsWith('payment') ? 'payment'
    : type.startsWith('chargeback') ? 'chargeback'
    : type.startsWith('merchant_order') ? 'merchant_order'
    : '';
  if (!dataId || !tipo) {
    return json({ ok: true });
  }

  /* Um id de pagamento da Mercado Pago é um número. Qualquer outra coisa não
     é um aviso deles, e não chega nem à assinatura - nem, mais adiante, à
     URL da consulta, onde um id escolhido por alguém viraria um caminho. */
  if (typeof dataId !== 'string' && typeof dataId !== 'number') return json({ ok: true });
  if (!/^\d{1,24}$/.test(String(dataId))) return json({ ok: true });

  const recusa = {};
  if (!await verifyWebhookSignature(env, request, dataId, recusa)) {
    /* A trilha guarda a recusa, mas não uma linha por requisição: esta é uma
       rota pública, e uma escrita gratuita no D1 por chamada anônima é o
       jeito mais barato de esgotar a cota de escrita da plataforma inteira.
       Uma linha por endereço por HORA; o resto só leva o 401. Era trinta por
       minuto, e cada pedido falso até o trigésimo custava o freio e a trilha -
       umas cento e vinte linhas por minuto de uma máquina só, numa rota que
       nem a borda freia (auditoria de 24/09/2026). */
    if (!await throttled(env, `whk-h:${ip(request)}`, 1, 3_600_000)) {
      await log(env, null, 'webhook-bad-signature', `${dataId} ${recusa.motivo || ''}`.trim());
    }
    /* 401, e não 200: um remetente legítimo com segredo errado precisa saber
       que está sendo recusado, em vez de achar que entregou. E o código é
       específico, porque quem lê esta resposta é o painel da Mercado Pago e um
       operador humano - não o app. */
    return json({ error: 'bad-signature' }, 401);
  }

  /* A assinatura prova QUEM mandou, não O QUE aconteceu. O status vem de uma
     consulta nossa - e, para contestação e pedido, de uma consulta que leva
     aos pagamentos, que seguem pelo mesmo caminho. */
  let resultado;
  if (tipo === 'payment') {
    resultado = await settleFromPaymentId(env, String(dataId), 'webhook');
  } else {
    let ids;
    try {
      ids = tipo === 'chargeback'
        ? await paymentsOfChargeback(env, String(dataId))
        : await paymentsOfMerchantOrder(env, String(dataId));
    } catch (e) {
      /* 404 = não é nosso; o resto é erro nosso ou deles, e a MP reenvia. */
      if (e && e.status === 404) return json({ ok: true });
      if (e && (e.status === 400 || e.status === 403)) {       // PAY-006
        await avisoAlheio(env, `${tipo} ${dataId} ${e.status}`);
        return json({ ok: true });
      }
      await erroDeLiberacao(env, null, `${tipo} ${dataId} ${e && e.message || e}`);
      return json({ error: 'retry' }, 500);
    }
    for (const id of ids.filter(i => /^\d{1,24}$/.test(i))) {
      const r = await settleFromPaymentId(env, id, `webhook-${tipo}`);
      if (r === 'erro') resultado = 'erro';
    }
    if (tipo === 'chargeback') await log(env, null, 'contestacao', `${dataId} ${ids.join(',')}`.slice(0, 200));
  }
  /* Duas respostas, para dois casos que a Mercado Pago trata diferente:
     · um erro NOSSO (banco fora, consulta que caiu) devolve 500, e ela
       reenvia - que é exatamente o que se quer de um aviso que não
       conseguimos processar;
     · um pagamento que não é nosso, ou já resolvido, devolve 200, senão
       ela reenviaria para sempre um aviso que não tem o que fazer aqui. */
  if (resultado === 'erro') return json({ error: 'retry' }, 500);
  return json({ ok: true });
}

/* ── POST /api/pay/paddle ─────────────────────────────────────────────────
 * O aviso do Paddle. Mesmo desenho do da Mercado Pago: a assinatura prova
 * QUEM mandou; o que aconteceu vem de uma consulta nossa à transação, que
 * segue pelo mesmo `applyPayment`. Interessa `transaction.*` (pago,
 * concluído) e `adjustment.*` (estorno, contestação); o resto responde 200. */
export async function webhookPaddle({ request, env }) {
  if (!paddle(env)) return json({ ok: true });
  const corpo = await request.text();
  if (corpo.length > 128 * 1024) return json({ ok: true });

  const recusa = {};
  if (!await conferirAssinatura(env, request, corpo, recusa)) {
    if (!await throttled(env, `whk-h:${ip(request)}`, 1, 3_600_000)) {
      await log(env, null, 'webhook-bad-signature', `paddle ${recusa.motivo || ''}`.trim());
    }
    return json({ error: 'bad-signature' }, 401);
  }

  let aviso;
  try { aviso = JSON.parse(corpo); } catch { return json({ ok: true }); }
  const tipo = String(aviso && aviso.event_type || '');
  const dados = (aviso && aviso.data) || {};
  const txnId = tipo.startsWith('transaction.') ? dados.id
    : tipo.startsWith('adjustment.') ? dados.transaction_id
    : null;
  if (!idDeTransacao(txnId)) return json({ ok: true });

  const r = await settleFromPaymentId(env, String(txnId), 'webhook');
  if (tipo.startsWith('adjustment.') && dados.action === 'chargeback') {
    await log(env, null, 'contestacao', `paddle ${txnId}`);
  }
  /* 500 faz o Paddle reenviar, que é o que se quer de um erro nosso. */
  if (r === 'erro') return json({ error: 'retry' }, 500);
  return json({ ok: true });
}

/* ── a liberação ────────────────────────────────────────────────────────── */

/**
 * Consulta o provedor por um pedido pendente e resolve o que achar.
 *
 * Usa a busca por `external_reference` porque num PIX o id do pagamento já é
 * conhecido, mas num cartão do Checkout Pro o pagamento nasce com id que
 * nunca chegou até nós se o webhook se perdeu. O nosso id de pedido é o único
 * fio que atravessa os dois casos.
 */
export async function settleFromProvider(env, order, source) {
  await updateOrder(env, order.id, { checked_at: Date.now() });
  try {
    /* No Paddle o id da transação é conhecido desde a criação: pergunta direto. */
    if (order.provider === 'paddle') {
      if (!idDeTransacao(order.provider_ref)) return null;
      return await applyPayment(env, order, pagamentoDe(await buscarTransacao(env, order.provider_ref)), source);
    }
    const found = await paymentsFor(env, order.id);
    if (!found.length) return null;
    /* Se houver mais de um (o comprador tentou duas vezes), o aprovado manda. */
    const payment = found.find(p => mapStatus(p.status) === 'paid') || found[0];
    /* `await` aqui, e não só `return`: uma promessa rejeitada devolvida de
       dentro de um try NÃO é pega pelo catch dele. Sem o await, uma falha na
       liberação escapava sem log e derrubava a varredura inteira. */
    return await applyPayment(env, order, payment, source);
  } catch (e) {
    await erroDeLiberacao(env, order.account_id, `${order.id} ${e.message || e}`);
    return 'erro';
  }
}

/** O caminho do webhook: temos o id do pagamento e precisamos achar o pedido.
 *  Devolve `null` quando não há o que fazer (pagamento de outra loja, pedido
 *  inexistente) e `'erro'` quando algo NOSSO falhou - a diferença decide se a
 *  Mercado Pago deve reenviar o aviso. */
export async function settleFromPaymentId(env, paymentId, source) {
  try {
    const payment = idDeTransacao(paymentId)
      ? pagamentoDe(await buscarTransacao(env, paymentId))
      : await getPayment(env, paymentId);
    const orderId = payment?.external_reference;
    if (!orderId) return null;
    const order = await getOrder(env, orderId);
    if (!order) return null;
    return await applyPayment(env, order, payment, source);
  } catch (e) {
    /* Um id que a Mercado Pago não conhece (o simulador do painel, um
       pagamento de outra conta) não é falha nossa: responder 500 faria ela
       reenviar para sempre um aviso que nunca vai ter o que fazer aqui. */
    if (e && e.status === 404) return null;
    /* No AVISO, 400/403 também é "não é nosso": a Mercado Pago responde assim
       a um pagamento de outro vendedor, e devolver 500 faria ela reenviar até
       o limite dela, com uma linha de erro por tentativa (PAY-006). Na
       varredura e na tela, 403 continua sendo erro - ali ele quer dizer que a
       NOSSA credencial perdeu permissão, e isso precisa virar alerta. */
    if (e && (e.status === 400 || e.status === 403) && String(source).startsWith('webhook')) {
      await avisoAlheio(env, `pagamento ${paymentId} ${e.status}`);
      return null;
    }
    await erroDeLiberacao(env, null, `pagamento ${paymentId} ${e.message || e}`);
    return 'erro';
  }
}

/** A trilha do erro de liberação, com teto: um provedor fora do ar durante
 *  uma varredura, ou um aviso reenviado em laço, não pode virar uma linha
 *  por tentativa até a cota de escrita acabar. */
/** Um aviso sobre um pagamento que a nossa credencial não enxerga. Fica na
 *  trilha (uma linha por hora), sem virar alerta ao dono. */
async function avisoAlheio(env, detalhe) {
  if (!await throttled(env, 'webhook-alheio', 1, 3_600_000)) await log(env, null, 'webhook-alheio', detalhe);
}

async function erroDeLiberacao(env, accountId, detalhe) {
  console.error('settle', detalhe);
  if (!await throttled(env, 'settle-error', 20)) await log(env, accountId, 'settle-error', detalhe);
}

/** Atalho para quando já temos os dois lados. */
export const settle = (env, orderId, paymentId, source) =>
  settleFromPaymentId(env, paymentId, source);

/**
 * A ÚNICA função que libera acesso.
 *
 * Quatro travas, e cada uma fecha um jeito conhecido de dar o curso de graça:
 *   · evento repetido não faz nada (UNIQUE em payment_events);
 *   · pedido já pago não faz nada;
 *   · valor menor do que o pedido não libera;
 *   · moeda diferente não libera.
 *
 * E a lição da auditoria, que vale contra o instinto: a chave do evento é o
 * pagamento E O ESTADO DELE. Um pagamento da Mercado Pago é um objeto que
 * muda - o mesmo id é `pending` hoje e `approved` daqui a um minuto. Com a
 * chave só no id, a PRIMEIRA vez que este código via um pagamento (a tela
 * consultando três segundos depois de o QR aparecer) gastava a única vaga
 * dele, e a aprovação que vinha depois batia no UNIQUE e era descartada.
 * Todo PIX pago, sem exceção, ficaria pendente para sempre. A trava contra
 * liberar duas vezes é `order.status === 'paid'`, logo abaixo - e sempre foi.
 */
async function applyPayment(env, order, payment, source) {
  let status = mapStatus(payment.status);

  /* Em centavos, sempre. */
  const paidCents = Math.round(Number(payment.transaction_amount || 0) * 100);
  const refundedCents = Math.round(Number(payment.transaction_amount_refunded || 0) * 100);
  const currency = String(payment.currency_id || 'BRL');

  /* Um estorno PARCIAL não muda o status na Mercado Pago: o pagamento continua
     `approved`, com `transaction_amount_refunded` maior que zero. Se o que
     ficou é menos do que o curso custa, o curso não está pago - é o mesmo
     critério do valor a menor, logo abaixo, aplicado depois do fato. */
  if (status === 'paid' && refundedCents > 0 && paidCents - refundedCents < order.amount_cents) {
    status = 'refunded';
  }

  const fresh = await recordEvent(env, {
    eventId: `${payment.id}:${status}`, orderId: order.id, status, raw: payment, source
  });

  /* O pedido, relido: o que chegou aqui pode ter sido lido antes de uma
     liberação que aconteceu no meio do caminho. */
  const atual = (await getOrder(env, order.id)) || order;
  const course = getCourse(order.course_slug);
  const months = course ? course.accessMonths : 12;
  /* O que este pedido abre: o próprio produto, ou cada produto do pacote. */
  const itens = course ? itensDoPedido(course) : [{ courseSlug: order.course_slug, months }];

  if (status === 'refunded') {
    /* Estorno ou chargeback. Fecha a porta - o cookie não carrega direito
       nenhum, então fecha na hora - e deixa o pedido dizendo o que aconteceu.
       Antes, um estorno depois de pago não fazia NADA: nem revogava, nem
       marcava, nem registrava. Quem pedia o dinheiro de volta ficava com os
       doze meses.

       Recua os meses DESTE pedido, e não apaga tudo: o estorno de uma
       renovação não pode levar junto os meses da compra anterior, que
       ninguém devolveu. Quando este pedido é o único, recuar e apagar dão no
       mesmo.

       Recuar e marcar o pedido são UMA transação, que só age se o pedido
       ainda está `paid` (ver `refundOrder`). A leitura de `atual.status`
       aqui barra o aviso que chega depois; o que chega AO MESMO TEMPO lia
       "pago" também e recuava os meses uma segunda vez. */
    /* O estorno de um pagamento que NÃO é o que pagou este pedido (27/09/2026).
       Um comprador pode pagar o mesmo pedido duas vezes - o link do cartão
       continua aceitando pagamento -, e o dono estorna a cobrança duplicada.
       O aviso desse estorno chega aqui com o pedido `paid`, e antes recuava
       os doze meses que o OUTRO pagamento, intacto, continua pagando.
       `markPaid` guarda em `provider_ref` o id do pagamento que pagou; o
       estorno só fecha a porta quando é dele. */
    if (atual.status === 'paid' && atual.provider_ref && String(atual.provider_ref) !== String(payment.id)) {
      if (fresh) {
        await log(env, order.account_id, 'estorno-duplicado',
          `${order.id}: estornado ${payment.id}, o pedido segue pago por ${atual.provider_ref}`);
      }
      return status;
    }
    if (atual.status === 'paid') {
      /* O caso inverso do de cima (01/10/2026, PAY-B-008): o pagamento
         estornado É o que está gravado, mas o pedido foi pago duas vezes e o
         OUTRO pagamento continua aprovado. Fechar o acesso aqui tiraria o
         curso de quem segue pagando por ele. O pedido passa a apontar para o
         pagamento que restou, e o acesso fica. */
      const outro = await outroPagamentoAprovado(env, atual, payment.id);
      if (outro) {
        await updateOrder(env, order.id, { provider_ref: String(outro.id) });
        await log(env, order.account_id, 'estorno-duplicado',
          `${order.id}: estornado ${payment.id}, o pedido segue pago por ${outro.id}`);
        return status;
      }
      const r = await refundOrder(env, {
        accountId: order.account_id,
        courseSlug: itens[0].courseSlug,
        orderId: order.id,
        months: itens[0].months,
        itens,
        why: `${payment.id} via ${source}`
      });
      if (r.refunded) {
        await log(env, order.account_id, 'estorno', `${order.id} ${payment.status} ${refundedCents || paidCents} via ${source}`);
        /* Só quem virou o pedido para `refunded` avisa: `refundOrder` é
           condicional, então o aviso repetido e o simultâneo não mandam um
           segundo e-mail (PAY-B-006). */
        await avisarEstorno(env, atual, {
          contestacao: payment.status === 'charged_back', restaAte: r.until
        });
      }
    } else if (atual.status === 'pending') {
      await updateOrder(env, order.id, { status: 'refunded' });
    }
    return status;
  }

  if (status !== 'paid') {
    if (fresh && atual.status === 'pending' && status === 'failed') {
      await updateOrder(env, order.id, { status });
    }
    return status;
  }

  /* Aprovado. Um aviso de aprovação repetido (`!fresh`) chega até aqui de
     propósito: se o pedido já está pago, a linha seguinte encerra; se NÃO
     está - uma liberação que caiu no meio, entre gravar o evento e gravar o
     direito - o reenvio é justamente a chance de terminar o serviço. */
  if (atual.status === 'paid') {
    /* Um SEGUNDO pagamento aprovado para um pedido já pago é uma cobrança em
       dobro: o comprador pagou duas vezes. Não muda o acesso, mas precisa
       aparecer na trilha - antes passava calado, e o dono só descobria pela
       reclamação. O `fresh` evita repetir a linha a cada reenvio do aviso. */
    if (fresh && atual.provider_ref && String(atual.provider_ref) !== String(payment.id)) {
      await log(env, order.account_id, 'pagamento-duplicado',
        `${order.id}: pago por ${atual.provider_ref} e de novo por ${payment.id} - estornar o segundo`);
    }
    return 'paid';
  }

  /* O valor. Um pagamento aprovado de R$ 1,00 apontando para um pedido de
     R$ 147,00 não é um pagamento deste pedido - é alguém que montou o próprio
     link com o nosso external_reference. */
  if (paidCents < order.amount_cents || currency !== order.currency) {
    await log(env, order.account_id, 'pay-mismatch',
      `${order.id}: cobrado ${order.amount_cents} ${order.currency}, pago ${paidCents} ${currency}`);
    return 'failed';
  }

  /* A linha de acesso ANTES de conceder, porque `grantAccess` apaga a
     diferença: depois dele toda conta tem acesso, e não haveria como saber se
     esta compra abriu a porta ou esticou um prazo que já existia. É só o que
     decide o texto do e-mail - "seu acesso está liberado" contra "foi
     renovado" -, e mandar a primeira frase a quem já estudava há meses é o
     tipo de detalhe que faz a mensagem inteira parecer automática. */
  const antes = await entitlementOf(env, order.account_id, itens[0].courseSlug);

  /* O direito PRIMEIRO, o pedido DEPOIS. A ordem é o que torna uma
     liberação interrompida recuperável: se o banco cair entre as duas
     escritas, o pedido continua `pending`, o reenvio do aviso chega até
     aqui de novo e termina o serviço. Na ordem inversa o pedido ficava
     `paid` sem direito nenhum, e cada reenvio parava na linha "já está pago"
     lá em cima.

     Nem o reenvio nem uma liberação simultânea concedem duas vezes: o
     `grantAccess` não faz nada se a linha já aponta para este pedido, e
     decide isso dentro do mesmo comando que grava. A conferência que ficava
     aqui, numa leitura separada, deixava duas liberações simultâneas lerem
     "ainda não" e estenderem os meses uma da outra - ver
     worker/concessao.mjs. */
  for (const item of itens) {
    await grantAccess(env, {
      accountId: order.account_id,
      courseSlug: item.courseSlug,
      orderId: order.id,
      months: item.months
    });
  }

  /* Só quem de fato virou o pedido para `paid` registra e manda o recibo.
     As outras liberações simultâneas chegam aqui com o serviço feito. */
  if (!await markPaid(env, order.id, payment.id)) return 'paid';

  await log(env, order.account_id, 'paid', `${order.id} via ${source}`);

  /* Dois PEDIDOS pagos, e não um pedido pago duas vezes (auditoria de
     28/09, PAY-004). "Gerar outro código" cria um PIX novo e o anterior
     continua pagável por 30 minutos; quem paga os dois ganha 24 meses, o
     que é coerente com o dinheiro, mas quase sempre é engano. A trilha
     `pedido-duplicado` vira alerta ao dono (worker/src/alertas.js), que
     confirma com o aluno e estorna um. Falha aqui não desfaz a liberação. */
  try {
    const outro = await outroPedidoPagoRecente(env, order, 24 * 3_600_000);
    if (outro) {
      await log(env, order.account_id, 'pedido-duplicado',
        `${order.id} pago; ${outro.id} do mesmo curso já estava pago - confirmar com o aluno e estornar um`);
    }
  } catch (e) { console.error('pedido-duplicado', e && e.stack || e); }

  /* Primeira compra ou renovação. Se a linha lida acima ainda era de outro
     pedido (ou não existia), ela é o retrato de antes: renovação é ter
     acesso valendo. Se já apontava para ESTE pedido - uma liberação
     interrompida sendo retomada, ou uma simultânea que concedeu primeiro -,
     o retrato de antes se perdeu, e a pista é `granted_at`: uma linha
     criada por esta compra nasce depois do pedido; uma estendida por ela é
     mais velha que ele. */
  const primeiraCompra = antes && String(antes.order_id) === String(order.id)
    ? Number(antes.granted_at) >= Number(order.created_at)
    : !(antes && (antes.expires_at === null || Number(antes.expires_at) > Date.now()));

  await confirmarPorEmail(env, order, primeiraCompra);
  return 'paid';
}

/** Outro pagamento APROVADO deste pedido, intacto (o que sobrou depois do
 *  estorno cobre o preço), que não seja `exceto`. null quando não há, e
 *  sempre null fora da Mercado Pago (pedido liberado à mão). Uma falha da
 *  consulta sobe: melhor a Mercado Pago reenviar o aviso do que fechar o
 *  acesso de quem continua pagando (PAY-B-008). */
async function outroPagamentoAprovado(env, order, exceto) {
  if (order.provider !== 'mercadopago') return null;
  const lista = await paymentsFor(env, order.id);
  return lista.find(p => {
    if (String(p.id) === String(exceto) || mapStatus(p.status) !== 'paid') return false;
    const pago = Math.round(Number(p.transaction_amount || 0) * 100);
    const devolvido = Math.round(Number(p.transaction_amount_refunded || 0) * 100);
    return pago - devolvido >= order.amount_cents && String(p.currency_id || 'BRL') === order.currency;
  }) || null;
}

/**
 * "O estorno está concluído" - para o aluno, uma vez por pedido (auditoria
 * de 01/10/2026, PAY-B-006). Chamado por quem VIROU o pedido para
 * `refunded`: o aviso da Mercado Pago (desistência, estorno pelo painel,
 * contestação) e o "Já devolvi" de /admin/estornos. Nunca lança: o acesso
 * já fechou, e um e-mail que não sai fica na trilha.
 */
export async function avisarEstorno(env, order, { contestacao = false, restaAte = null } = {}) {
  try {
    if (!mailReady(env)) return;
    const account = await findAccountById(env, order.account_id);
    if (!account?.email || /\.(invalid|local)$/i.test(account.email)) return;
    /* Na língua da conta: o aviso do provedor e o painel do dono rodam no
       Worker brasileiro para as contas dos dois sites (lib/idioma.js). */
    const idioma = idiomaDaConta(account);
    const m = mensagens(idioma);
    const curso = tituloDoCurso(getCourse(order.course_slug), idioma, order.course_slug);
    const r = await sendMail(env, {
      to: account.email,
      ...m.estorno({
        nome: account.name || '', curso, valor: reaisBR(order.amount_cents, order.currency),
        pedido: order.id, cartao: order.method === 'card', contestacao,
        restaAte: restaAte ? m.data(restaAte) : '',
        marca: idioma === 'en' ? MARCA.en : (empresa.nomeFantasia || MARCA.pt),
        suporte: empresa.contato?.emailSuporte || ''
      })
    });
    await log(env, account.id, r.ok ? 'estorno-email-enviado' : 'estorno-email-falhou',
      r.ok ? order.id : `${order.id} ${r.motivo}`);
  } catch (e) {
    console.error('mail-estorno', e && e.stack || e);
  }
}

/**
 * Os recibos das liberações feitas à mão (PAY-B-005). Actions → Acesso →
 * `liberar` com `pedido` marca o pedido pago e concede o acesso em SQL; o
 * e-mail sai daqui, na varredura seguinte, com o mesmo texto e a mesma regra
 * de primeira compra ou renovação do recibo automático. A reserva em
 * `avisos` (`recibo:<pedido>`) garante um envio só; falhou, solta e tenta de
 * novo em 5 minutos. Nunca lança.
 */
export async function enviarRecibosManuais(env) {
  if (!mailReady(env)) return 0;
  let n = 0;
  for (const order of await recibosManuaisPendentes(env)) {
    const chave = `recibo:${order.id}`;
    if (!await reservarAviso(env, chave)) continue;
    const ent = await entitlementOf(env, order.account_id, order.course_slug);
    const primeiraCompra = !ent || String(ent.order_id) !== String(order.id)
      || Number(ent.granted_at) >= Number(order.created_at);
    const ok = await confirmarPorEmail(env, order, primeiraCompra);
    if (ok) n++; else await soltarAviso(env, chave);
  }
  return n;
}

/**
 * O recibo, na caixa de entrada de quem pagou.
 *
 * ── por que AQUI, e exatamente aqui ─────────────────────────────────────
 * Este ponto roda uma vez por pedido, e não por acaso: só chega aqui quem
 * ganhou o `markPaid` - a troca de `pending` para `paid` feita num comando só,
 * que duas liberações simultâneas não conseguem ganhar juntas. A leitura
 * `if (atual.status === 'paid')` lá em cima barra a passagem que chega
 * depois, mas não a que chega AO MESMO TEMPO. E há três caminhos que levam um
 * pagamento a ser liquidado - o retorno do navegador, o aviso da Mercado
 * Pago e a varredura de dez em dez minutos -, então um disparo colocado
 * mais acima mandaria o mesmo e-mail três vezes.
 *
 * ── e por que ele NUNCA derruba a compra ────────────────────────────────
 * Falha aberta, como todo o resto do módulo de e-mail. O acesso já foi
 * concedido e o pedido já está pago quando esta função começa; um provedor
 * fora do ar não pode desfazer isso nem devolver erro a quem pagou. O que
 * acontece na falha é o que tem de acontecer: fica registrado na trilha,
 * com o motivo, para que "não recebi o e-mail" tenha resposta em vez de
 * palpite.
 */
async function confirmarPorEmail(env, order, primeiraCompra) {
  try {
    if (!mailReady(env)) return false;

    const account = await findAccountById(env, order.account_id);
    if (!account?.email) return false;

    const curso = getCourse(order.course_slug);
    const tipo = tipoDe(curso);
    /* A validade que o recibo mostra: a do próprio produto, ou a do primeiro
       produto do pacote (o curso). */
    const vence = await entitlementExpiry(env, account.id, itensDoPedido(curso)[0]?.courseSlug || order.course_slug);
    const site = String(env.SITE_ORIGIN || '').replace(/\/+$/, '');

    /* No idioma da conta: o site em inglês manda o recibo em inglês. */
    const idioma = idiomaDaConta(account);
    const m = mensagens(idioma);
    const msg = m.compra({
      nome: account.name || '',
      curso: tituloDoCurso(curso, idioma, order.course_slug),
      valor: reaisBR(order.amount_cents, order.currency),
      pedido: order.id,
      expiraEm: m.data(vence),
      link: tipo === 'livro' ? `${site}/israel/` : `${site}/meu-hebraico/`,
      tipo,
      ebook: tipo === 'pacote' ? `${site}/israel/` : null,
      aula0: `${site}/inicio/`,
      marca: idioma === 'en' ? MARCA.en : (empresa.nomeFantasia || MARCA.pt),
      suporte: empresa.contato?.emailSuporte || '',
      arrependimentoDias: diasDoPedido(order),
      /* Uma renovação não diz "seu acesso está liberado" a quem já estava
         estudando: diz que foi estendido. É a mesma compra e outra notícia. */
      renovacao: !primeiraCompra,
      /* O contrato que vale para esta compra (Decreto 7.962/2013, art. 4º,
         IV), e onde desistir pelo site (art. 5º). */
      /* LEGAL-104: a cópia FIXA da versão que valeu para este pedido, e não
         a página de hoje. Pedido de antes da coluna: a versão em vigor. */
      termos: linkDaVersao(site, 'termos', order.termos_versao || versaoAtual('termos', env)),
      reembolso: linkDaVersao(site, 'reembolso', versaoAtual('reembolso', env)),
      versao: [
        m.data(Date.parse(`${(idioma === 'en' && empresa.politicas?.atualizadoEmEn) || (idioma === 'es' && empresa.politicas?.atualizadoEmEs) || empresa.politicas?.atualizadoEm || ''}T12:00:00Z`)),
        (order.termos_versao || versaoAtual('termos', env))
          && `${idioma === 'en' ? 'code' : 'código'} ${order.termos_versao || versaoAtual('termos', env)}`
      ].filter(Boolean).join(', '),
      desistir: `${site}/perfil/`
    });

    const r = await sendMail(env, { to: account.email, ...msg });
    await log(env, account.id, r.ok ? 'compra-enviada' : 'compra-email-falhou',
      r.ok ? order.id : `${order.id} ${r.motivo}${r.detalhe ? ': ' + r.detalhe : ''}`);
    if (!r.ok) console.error('mail-compra', r.motivo, r.status || '', r.detalhe || '');
    return !!r.ok;
  } catch (e) {
    /* Um erro aqui é um e-mail que não saiu, nunca uma compra desfeita. */
    console.error('mail-compra', e && e.stack || e);
    return false;
  }
}

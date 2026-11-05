/* Stripe: o pagamento dos sites de fora (inglês e espanhol), desde 05/11/2026.
 * ─────────────────────────────────────────────────────────────────────────
 * Pedido do dono: o Stripe no lugar do Paddle nos dois sites de fora. Quem
 * escolhe é `pagamento.exterior` em data/empresa.json ("stripe" ou
 * "paddle"), lido pelos DOIS lados: o Worker, para saber o que criar, e a
 * build, para saber que botão mostrar (tools/export-content.mjs).
 *
 * A diferença que importa para o resto do código: no Paddle o vendedor
 * perante o comprador é o Paddle; no Stripe é a NOSSA empresa. O Stripe só
 * processa o cartão. Imposto do país do comprador e lei de consumo passam a
 * ser nossos (Termos e Privacidade em inglês e espanhol dizem isso).
 *
 * O desenho é o de lib/paddle.js e lib/mercadopago.js: criar a cobrança,
 * consultar, devolver, conferir o aviso, e `pagamentoDe` traduzir a sessão
 * para os campos que applyPayment (api/pay.js) já lê. A liberação continua
 * sendo UMA função, com as mesmas travas.
 *
 * O pagamento é o Checkout HOSPEDADO do Stripe (checkout.stripe.com): o
 * checkout redireciona para lá e o Stripe devolve para /checkout/<curso>/
 * obrigado/, que pergunta ao servidor, como o cartão da Mercado Pago. Sem
 * Stripe.js nesta página, então a CSP não muda e o número do cartão nunca
 * passa por aqui.
 *
 * Os segredos (painel da Cloudflare, empurrados pela publicação):
 *   STRIPE_SECRET_KEY      sk_live_... (ou sk_test_... para testar) ou uma
 *                          chave restrita rk_live_ / rk_test_
 *   STRIPE_WEBHOOK_SECRET  whsec_..., do destino de eventos em
 *                          Developers > Webhooks, apontado para
 *                          https://<domínio>/api/pay/stripe
 * E uma variável opcional, no wrangler.toml:
 *   STRIPE_IMPOSTO = "1"   liga o Stripe Tax (o imposto calculado por país).
 *                          Só com o registro feito no painel do Stripe; é
 *                          decisão do dono com o contador.
 */

const API = 'https://api.stripe.com/v1';

const chave = env => String((env && env.STRIPE_SECRET_KEY) || '').trim();

/** A chave é de teste? `sk_test_` ou `rk_test_`: não cobra de verdade. */
export const ehTeste = env => /^(sk|rk)_test_/.test(chave(env));

/** O Stripe está ligado nesta implantação? Sem a chave não se cria pedido. */
export const stripePronto = env => /^(sk|rk)_(live|test)_/.test(chave(env));

/** Um id de sessão do Checkout. Qualquer outra coisa não vai para a URL. */
export const idDeSessao = id => /^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(String(id || ''));

/** Os parâmetros no formato que a API do Stripe lê
 *  (application/x-www-form-urlencoded, com colchetes para o que é aninhado). */
export function formulario(obj, prefixo = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const nome = prefixo ? `${prefixo}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => {
      if (item && typeof item === 'object') formulario(item, `${nome}[${i}]`, out);
      else out.append(`${nome}[${i}]`, String(item));
    });
    else if (typeof v === 'object') formulario(v, nome, out);
    else out.append(nome, String(v));
  }
  return out;
}

async function call(env, path, { method = 'GET', body, idempotencia, signal } = {}) {
  const headers = { 'Authorization': `Bearer ${chave(env)}` };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencia) headers['Idempotency-Key'] = idempotencia;
  const res = await fetch(API + path, {
    method, headers, body: body ? formulario(body).toString() : undefined, signal
  });
  let data = null;
  try { data = await res.json(); } catch { /* resposta vazia */ }
  if (!res.ok) {
    /* O motivo vem em `error.code` / `error.message` ("resource_missing",
       "url_invalid"...): é ele que vai para a trilha. */
    const err = new Error(`stripe ${res.status}`);
    err.status = res.status;
    err.data = data && data.error
      ? { code: data.error.code, type: data.error.type, message: String(data.error.message || '').slice(0, 300) }
      : data;
    throw err;
  }
  return data;
}

/**
 * A sessão do Checkout para o pedido.
 * ─────────────────────────────────────────────────────────────────────────
 * O preço vai DENTRO dela (`price_data`), calculado do nosso catálogo:
 * nada a cadastrar no painel do Stripe, e data/courses.json continua sendo o
 * único lugar do preço. `client_reference_id` e `metadata.order_id` ligam a
 * sessão ao pedido; `payment_intent_data.metadata` leva o mesmo número para
 * o pagamento, que é o que chega nos avisos de estorno e de contestação.
 *
 * O preço anunciado é o preço pago: com o Stripe Tax ligado, o imposto vai
 * DENTRO dele (`tax_behavior: inclusive`).
 */
export async function criarSessao(env, { order, course, account, origin }) {
  const nome = (env && env.LOCALE === 'es' && course.titleEs) || course.titleEn || course.titlePt || course.slug;
  const meses = course.accessMonths || 12;
  const volta = `${origin}/checkout/${course.slug}`;
  return call(env, '/checkout/sessions', {
    method: 'POST',
    idempotencia: `pedido-${order.id}`,
    body: {
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: String(order.currency || 'USD').toLowerCase(),
          unit_amount: order.amount_cents,
          tax_behavior: 'inclusive',
          product_data: {
            name: nome,
            description: env && env.LOCALE === 'es' ? `${meses} meses de acceso` : `${meses} months of access`
          }
        }
      }],
      client_reference_id: order.id,
      customer_email: account && account.email ? account.email : undefined,
      locale: env && env.LOCALE === 'es' ? 'es' : 'en',
      metadata: { order_id: order.id, account_id: String(account.id) },
      payment_intent_data: { metadata: { order_id: order.id, account_id: String(account.id) } },
      ...(String(env && env.STRIPE_IMPOSTO || '') === '1' ? { automatic_tax: { enabled: true } } : {}),
      success_url: `${volta}/obrigado/?order=${order.id}`,
      cancel_url: `${volta}/`
    }
  });
}

/** A sessão, com o pagamento e a cobrança dele (estornos e contestação). */
export const buscarSessao = (env, id) =>
  call(env, `/checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent.latest_charge.dispute`);

/** Um pagamento (PaymentIntent), para achar o pedido de um aviso de estorno. */
export const buscarPagamento = (env, id) =>
  call(env, `/payment_intents/${encodeURIComponent(id)}`);

/** Um id de PaymentIntent. */
export const idDePagamento = id => /^pi_[A-Za-z0-9]{10,200}$/.test(String(id || ''));

/** Pede ao Stripe o estorno total do pedido (o pagamento da sessão). O
 *  Stripe avisa por `charge.refunded`; é aí que o acesso fecha. */
export async function estornarSessao(env, sessaoId, chaveDeIdempotencia) {
  const sessao = await buscarSessao(env, sessaoId);
  const pi = sessao && sessao.payment_intent;
  const piId = typeof pi === 'string' ? pi : pi && pi.id;
  if (!idDePagamento(piId)) {
    const err = new Error('stripe sem pagamento para estornar');
    err.status = 409;
    throw err;
  }
  return call(env, '/refunds', {
    method: 'POST',
    idempotencia: chaveDeIdempotencia,
    body: { payment_intent: piId, reason: 'requested_by_customer' }
  });
}

/**
 * Uma sessão do Stripe no vocabulário que applyPayment lê.
 * ─────────────────────────────────────────────────────────────────────────
 * O status sai no vocabulário da MERCADO PAGO de propósito: é o que
 * `mapStatus` (lib/mercadopago.js) entende, e é ele quem decide o que é
 * pago. Fechado: o que não for reconhecido vira `pending`, nunca `approved`.
 *
 *   payment_status paid / no_payment_required  → approved
 *   status expired                             → cancelled
 *   o resto (open, unpaid)                     → pending
 *   cobrança estornada por inteiro             → refunded
 *   contestação perdida                        → charged_back
 *
 * O estorno PARCIAL não muda o status: sai em `transaction_amount_refunded`,
 * e applyPayment fecha o acesso quando o que sobra é menos que o preço, a
 * mesma regra da Mercado Pago.
 */
export function pagamentoDe(sessao) {
  const s = sessao || {};
  const pago = Math.round(Number(s.amount_total || 0));
  const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
  const cobranca = pi && pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
  const devolvido = Math.round(Number(cobranca && cobranca.amount_refunded || 0));
  const contestacao = cobranca && cobranca.disputed ? (cobranca.dispute && cobranca.dispute.status) : null;

  let status;
  if (s.payment_status === 'paid') status = 'approved';
  else if (s.status === 'expired') status = 'cancelled';
  else status = 'pending';
  /* Uma contestação PERDIDA é dinheiro que voltou ao comprador pelo banco.
     A consulta expande a contestação (`buscarSessao`); a aberta não fecha o
     acesso, só a perdida, e o aviso `charge.dispute.closed` refaz a consulta. */
  if (status === 'approved' && contestacao === 'lost') status = 'charged_back';
  else if (status === 'approved' && pago > 0 && devolvido >= pago) status = 'refunded';

  return {
    id: String(s.id || ''),
    status,
    transaction_amount: pago / 100,
    transaction_amount_refunded: (status === 'charged_back' ? pago : devolvido) / 100,
    currency_id: String(s.currency || '').toUpperCase(),
    external_reference: s.client_reference_id || (s.metadata && s.metadata.order_id) || null
  };
}

/**
 * Confere o cabeçalho `Stripe-Signature: t=...,v1=...`.
 * ─────────────────────────────────────────────────────────────────────────
 * O Stripe assina `${t}.${corpo cru}` com HMAC-SHA256 e o segredo do destino
 * (o `whsec_...` inteiro é a chave). O corpo tem de ser o CRU: quem chama lê
 * `request.text()` e passa aqui antes de interpretar. Pode haver mais de um
 * v1 (troca de segredo): basta um conferir.
 *
 * Sem STRIPE_WEBHOOK_SECRET a resposta é `false`, nunca "deixa passar": um
 * aviso não verificado é uma rota pública que concede acesso.
 */
export async function conferirAssinatura(env, request, corpo, out = {}) {
  const segredo = String((env && env.STRIPE_WEBHOOK_SECRET) || '').trim();
  if (!segredo) { out.motivo = 'sem-segredo'; return false; }

  let t = null;
  const v1 = [];
  for (const parte of String(request.headers.get('stripe-signature') || '').split(',')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    const k = parte.slice(0, i).trim(), v = parte.slice(i + 1).trim();
    if (k === 't') t = v;
    else if (k === 'v1' && v) v1.push(v.toLowerCase());
  }
  if (!t || !v1.length) { out.motivo = 'sem-assinatura'; return false; }

  const idade = Math.abs(Date.now() - Number(t) * 1000);
  if (!Number.isFinite(idade) || idade > 5 * 60_000) { out.motivo = `fora-da-janela t=${t}`; return false; }

  const { hmacHex, timingSafeEqual } = await import('./crypto.js');
  const esperado = await hmacHex(segredo, `${t}.${corpo}`);
  const ok = v1.some(h => timingSafeEqual(esperado, h));
  if (!ok) out.motivo = 'hmac-diferente';
  return ok;
}

/**
 * O pedido de um aviso. `checkout.session.*` traz a sessão (com o pedido em
 * `client_reference_id`); `charge.*` e `charge.dispute.*` trazem só o
 * pagamento, e o pedido está no `metadata` dele. Devolve o id do pedido ou
 * null quando o aviso não é de um pedido nosso.
 */
export async function pedidoDoAviso(env, aviso) {
  const tipo = String(aviso && aviso.type || '');
  const obj = (aviso && aviso.data && aviso.data.object) || {};
  if (tipo.startsWith('checkout.session.')) {
    return obj.client_reference_id || (obj.metadata && obj.metadata.order_id) || null;
  }
  if (tipo.startsWith('charge.')) {
    if (obj.metadata && obj.metadata.order_id) return obj.metadata.order_id;
    const pi = obj.payment_intent;
    if (!idDePagamento(pi)) return null;
    const pagamento = await buscarPagamento(env, pi);
    return (pagamento && pagamento.metadata && pagamento.metadata.order_id) || null;
  }
  return null;
}

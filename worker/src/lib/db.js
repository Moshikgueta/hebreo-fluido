/* O banco: todas as consultas num lugar só.
 * ─────────────────────────────────────────────────────────────────────────
 * Nenhum handler escreve SQL. Não é gosto por camada - é que duas dessas
 * funções decidem quem tem acesso ao curso, e regra de acesso espalhada por
 * seis arquivos é regra que diverge.
 *
 * Tudo aqui usa parâmetros ligados (`?`). Não existe uma única string de SQL
 * montada por concatenação neste arquivo, e não deve passar a existir.
 */

import { newId, PBKDF2_ITER } from './crypto.js';
import { diasDoPedido, prazoDeDesistencia } from './desistencia.js';

const now = () => Date.now();

/* ── contas ─────────────────────────────────────────────────────────────── */

export const normalizeEmail = s => String(s || '').trim().toLowerCase();

export const findAccountByEmail = (env, email) =>
  env.DB.prepare('SELECT * FROM accounts WHERE email = ?').bind(normalizeEmail(email)).first();

export const findAccountById = (env, id) =>
  env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first();

export async function createAccount(env, { email, name, hash, salt, iterations, idioma = 'pt' }) {
  const mail = normalizeEmail(email);
  /* `idioma`: o do site em que a conta nasce (lib/idioma.js, migração 0004). */
  await env.DB.prepare(
    `INSERT INTO accounts (email, name, pass_hash, pass_salt, pass_iter, created_at, idioma)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(mail, String(name || '').trim().slice(0, 80), hash, salt,
         iterations || PBKDF2_ITER, now(), idioma === 'en' || idioma === 'es' ? idioma : 'pt').run();
  return findAccountByEmail(env, mail);
}

/** Regrava o hash da senha, sem mexer em mais nada. Usado pelo re-hasheamento
 *  do login, quando o custo do PBKDF2 sobe - ver a nota em lib/crypto.js. */
export async function setPasswordHash(env, accountId, { hash, salt, iterations }) {
  await env.DB.prepare(
    'UPDATE accounts SET pass_hash = ?, pass_salt = ?, pass_iter = ? WHERE id = ?'
  ).bind(hash, salt, iterations, accountId).run();
}

/**
 * Derruba todo cookie já emitido para a conta, sem trocar a senha.
 *
 * É o que "sair" tem de fazer: limpar o cookie do navegador não invalida o
 * VALOR dele, que continua conferindo por sete dias em qualquer outro lugar
 * onde tenha sido copiado. Sobe a `session_version`, e a resposta do logout
 * é a única coisa que muda para quem saiu. Efeito colateral deliberado: sai
 * de todos os aparelhos ao mesmo tempo.
 */
export async function bumpSessionVersion(env, accountId) {
  await env.DB.prepare(
    'UPDATE accounts SET session_version = session_version + 1 WHERE id = ?'
  ).bind(accountId).run();
}

/**
 * Troca a senha DE VERDADE: grava o hash novo e derruba toda sessão aberta.
 *
 * O `session_version + 1` é a metade que se esquece. Trocar a senha porque
 * alguém entrou na conta e não expulsar esse alguém é não ter trocado nada -
 * o cookie dele continua assinado e válido por até sete dias. Quem troca a
 * senha recebe um cookie novo na mesma resposta; todo o resto cai.
 *
 * É uma consulta só, e os dois campos andam juntos por isso: separados, um
 * `await` entre eles é uma janela em que a senha é nova e a sessão é velha.
 */
export async function changePassword(env, accountId, { hash, salt, iterations }) {
  await env.DB.prepare(
    `UPDATE accounts
        SET pass_hash = ?, pass_salt = ?, pass_iter = ?,
            session_version = session_version + 1
      WHERE id = ?`
  ).bind(hash, salt, iterations, accountId).run();
  /* Um pedido de recuperação que ainda não foi usado deixa de valer aqui.
     Sem isto, um link pedido por um invasor continuaria de pé depois de o
     dono trocar a senha - que é justamente a hora em que ele não pode
     continuar. */
  await resetInvalidateAll(env, accountId);
  return findAccountById(env, accountId);
}

/* ── recuperação de senha ───────────────────────────────────────────────── */

/**
 * Registra um pedido. Recebe o HASH do token, nunca o token.
 *
 * Os pedidos anteriores da conta morrem aqui: pedir de novo invalida o link
 * anterior. É o que a pessoa espera de "não chegou, mandei outro" - e fecha a
 * janela em que três links válidos circulam por caixas de entrada diferentes.
 */
export async function resetCreate(env, { accountId, tokenHash, ttlMs, ip }) {
  const t = now();
  await resetInvalidateAll(env, accountId);
  await env.DB.prepare(
    `INSERT INTO password_resets (token_hash, account_id, created_at, expires_at, request_ip)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(tokenHash, accountId, t, t + ttlMs, String(ip || '').slice(0, 60)).run();
  return t + ttlMs;
}

/** O pedido, se ele existe. Vencido ou usado vem do mesmo jeito - quem chama
 *  decide, e os dois casos respondem igual para quem está do outro lado. */
export const resetFind = (env, tokenHash) =>
  env.DB.prepare(
    `SELECT token_hash, account_id, created_at, expires_at, used_at
       FROM password_resets WHERE token_hash = ?`
  ).bind(tokenHash).first();

/**
 * Consome o pedido, e responde se ELE ainda estava lá para ser consumido.
 *
 * O `used_at IS NULL` dentro do UPDATE é o que torna isso uma operação só.
 * Conferir antes e marcar depois deixa uma janela entre as duas em que dois
 * cliques simultâneos no mesmo link passam os dois - e o segundo troca a
 * senha de novo, depois de o primeiro já ter entrado.
 */
export async function resetUse(env, tokenHash, at = now()) {
  const r = await env.DB.prepare(
    `UPDATE password_resets SET used_at = ?
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`
  ).bind(at, tokenHash, at).run();
  return !!(r.meta && r.meta.changes);
}

/** Derruba os pedidos abertos da conta. Chamado ao criar um novo e ao trocar
 *  a senha por qualquer caminho. */
export async function resetInvalidateAll(env, accountId, at = now()) {
  await env.DB.prepare(
    'UPDATE password_resets SET used_at = ? WHERE account_id = ? AND used_at IS NULL'
  ).bind(at, accountId).run();
}

/** Faxina dos vencidos. Roda junto com a varredura de pagamentos - um cron a
 *  mais só para isto seria um cron a mais para manter. */
export async function resetPurge(env, at = now()) {
  await env.DB.prepare('DELETE FROM password_resets WHERE expires_at < ?')
    .bind(at - 7 * 86_400_000).run();
}

/* ── confirmação de e-mail ────────────────────────────────────────────────
 * Mesma forma da recuperação: o banco guarda o sha256 do token, e o consumo
 * é um UPDATE condicional - conferir e gravar numa operação só.
 *
 * Toda função aqui pode encontrar a tabela AUSENTE, porque ela entrou depois
 * das outras e a publicação não aplica o schema.sql. Quem chama trata a
 * falha como "não confirmado" e segue: um cadastro não pode cair porque uma
 * migração esperou.
 */

/** Um link novo. Os anteriores ainda não usados desta conta morrem aqui: "não
 *  chegou, mandei outro" não pode deixar três links valendo. */
export async function verifyCreate(env, { accountId, email, tokenHash, ttlMs }) {
  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM email_verifications WHERE account_id = ? AND confirmed_at IS NULL'
    ).bind(accountId),
    env.DB.prepare(
      `INSERT INTO email_verifications (token_hash, account_id, email, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(tokenHash, accountId, normalizeEmail(email), t, t + ttlMs)
  ]);
  return t + ttlMs;
}

/**
 * Confirma, e responde se foi ESTA chamada que confirmou.
 *
 * O link só vale para a conta que o pediu e para o endereço que ela tinha
 * quando pediu - as duas coisas estão no WHERE, junto com o prazo. Um link
 * de outra conta, vencido ou já usado responde igual: `false`.
 */
export async function verifyConfirm(env, { tokenHash, accountId, email }, at = now()) {
  const r = await env.DB.prepare(
    `UPDATE email_verifications SET confirmed_at = ?
      WHERE token_hash = ? AND account_id = ? AND email = ?
        AND confirmed_at IS NULL AND expires_at > ?`
  ).bind(at, tokenHash, accountId, normalizeEmail(email), at).run();
  return Number(r && r.meta && r.meta.changes) > 0;
}

/** O endereço ATUAL da conta está confirmado? `null` quando não dá para saber
 *  (a tabela ainda não existe) - e aí a tela não pede nada. */
export async function emailVerified(env, accountId, email) {
  try {
    const row = await env.DB.prepare(
      `SELECT 1 AS ok FROM email_verifications
        WHERE account_id = ? AND email = ? AND confirmed_at IS NOT NULL LIMIT 1`
    ).bind(accountId, normalizeEmail(email)).first();
    return !!row;
  } catch {
    return null;
  }
}

/** Uma recuperação de senha concluída provou a caixa de entrada. Grava isso
 *  como confirmação, com a chave do próprio pedido de recuperação. */
export async function verifyFromReset(env, { accountId, email, resetHash }, at = now()) {
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO email_verifications
         (token_hash, account_id, email, created_at, expires_at, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(`reset:${resetHash}`, accountId, normalizeEmail(email), at, at, at).run();
  } catch {
    /* Tabela ausente: a senha foi trocada, que é o que importava. */
  }
}

/** Faxina dos links nunca usados, uma semana depois de vencerem. Os
 *  confirmados ficam: são a prova. */
export async function verifyPurge(env, at = now()) {
  await env.DB.prepare(
    'DELETE FROM email_verifications WHERE confirmed_at IS NULL AND expires_at < ?'
  ).bind(at - 7 * 86_400_000).run();
}

/**
 * Faxina da trilha. Cento e oitenta dias, e depois some.
 *
 * A trilha existe para responder "o que aconteceu com esta conta" na semana
 * em que alguém pergunta - não para guardar, para sempre, cada login que
 * falhou e cada aviso de webhook recusado. Uma tabela que só cresce é a que
 * vira o maior arquivo de dados pessoais do sistema sem ninguém decidir isso,
 * e é a que qualquer um pode encher de graça pela rota do webhook.
 */
export async function logPurge(env, at = now()) {
  await env.DB.prepare('DELETE FROM access_log WHERE created_at < ?')
    .bind(at - 180 * 86_400_000).run();
}

/* ── registros de acesso (Marco Civil, art. 15) ───────────────────────────
 * Ver o comentário da tabela em worker/schema.sql: seis meses é o mínimo
 * da lei, e 190 dias é esse mínimo com folga para meses de 31 dias.
 */
export const REGISTROS_DIAS = 190;

/** Grava uma entrada na conta. Nunca lança: o registro é obrigação legal,
 *  mas derrubar o login de alguém porque a tabela falhou não protege
 *  ninguém - o erro vai para o log do Worker, onde alguém vê. */
export async function registrarAcesso(env, { accountId, evento, ip }, at = now()) {
  try {
    await env.DB.prepare(
      'INSERT INTO registros_acesso (account_id, evento, ip, criado_em) VALUES (?, ?, ?, ?)'
    ).bind(accountId, evento, String(ip || '').slice(0, 64), at).run();
  } catch (e) {
    console.error('registro de acesso', e && e.message || e);
  }
}

export async function registrosPurge(env, at = now()) {
  await env.DB.prepare('DELETE FROM registros_acesso WHERE criado_em < ?')
    .bind(at - REGISTROS_DIAS * 86_400_000).run();
}

/* ── desistência da compra ──────────────────────────────────────────────── */

/** Registra o pedido de desistência. Devolve `{ novo, pedidoEm }`: pedir de
 *  novo não cria outra linha, e o momento que vale é o do PRIMEIRO pedido. */
export async function pedirArrependimento(env, { orderId, accountId, ip }, at = now()) {
  const r = await env.DB.prepare(
    `INSERT OR IGNORE INTO arrependimentos (order_id, account_id, pedido_em, ip)
     VALUES (?, ?, ?, ?)`
  ).bind(orderId, accountId, at, String(ip || '').slice(0, 64)).run();
  const row = await env.DB.prepare('SELECT pedido_em FROM arrependimentos WHERE order_id = ?')
    .bind(orderId).first();
  return { novo: Number(r && r.meta && r.meta.changes) > 0, pedidoEm: row ? Number(row.pedido_em) : at };
}

/** O IP do pedido de desistência prova QUEM pediu, e só importa enquanto a
 *  desistência pode ser contestada. Depois de REGISTROS_DIAS (o mesmo prazo
 *  do registro de acesso do Marco Civil) ele sai; a data e a hora do pedido
 *  ficam, junto com o registro da compra. Antes, o IP ficava para sempre e
 *  sobrevivia à exclusão da conta (auditoria de 28/09, LEGAL-002). */
export async function arrependimentosIpPurge(env, at = now()) {
  await env.DB.prepare("UPDATE arrependimentos SET ip = '' WHERE ip <> '' AND pedido_em < ?")
    .bind(at - REGISTROS_DIAS * 86_400_000).run();
}

/** Os pedidos de desistência da conta, por pedido de compra. Tabela ausente
 *  vira "nenhum": a lista de compras não pode sumir por causa disto. */
export async function arrependimentosDe(env, accountId) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT order_id, pedido_em FROM arrependimentos WHERE account_id = ?'
    ).bind(accountId).all();
    return new Map((results || []).map(r => [String(r.order_id), Number(r.pedido_em)]));
  } catch {
    return new Map();
  }
}

/* ── estorno automático da desistência ──────────────────────────────────
   O estado mora em `estornos` (ver o comentário da tabela em schema.sql).
   Toda leitura aqui tolera a tabela ausente: a lista de compras e a
   varredura não podem cair porque uma publicação ainda não criou a tabela. */

/** Cria a linha do estorno. Pedir de novo não cria outra. */
export async function estornoCriar(env, { orderId, paymentId, estado }, at = now()) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO estornos (order_id, payment_id, estado, proxima_em, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(orderId, String(paymentId || ''), estado, at, at, at).run();
  return estornoDe(env, orderId);
}

export const estornoDe = (env, orderId) =>
  env.DB.prepare('SELECT * FROM estornos WHERE order_id = ?').bind(orderId).first();

/** Muda só as colunas desta lista; o resto fica. */
const COLUNAS_ESTORNO = ['estado', 'tentativas', 'proxima_em', 'refund_id', 'erro', 'payment_id'];
export async function estornoAtualizar(env, orderId, campos, at = now()) {
  const cols = Object.keys(campos).filter(c => COLUNAS_ESTORNO.includes(c));
  if (!cols.length) return;
  await env.DB.prepare(
    `UPDATE estornos SET ${cols.map(c => `${c} = ?`).join(', ')}, atualizado_em = ? WHERE order_id = ?`
  ).bind(...cols.map(c => campos[c]), at, orderId).run();
}

/** Os estornos da conta, por pedido de compra: `{ estado }`. */
export async function estornosDe(env, accountId) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT e.order_id, e.estado FROM estornos e JOIN orders o ON o.id = e.order_id
        WHERE o.account_id = ?`
    ).bind(accountId).all();
    return new Map((results || []).map(r => [String(r.order_id), String(r.estado)]));
  } catch {
    return new Map();
  }
}

/** O que a varredura tem de mexer: pendentes vencidos e pedidos à espera de
 *  confirmação há mais de 15 minutos. */
export async function estornosParaVarrer(env, { limit = 10 } = {}, at = now()) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM estornos
        WHERE (estado = 'pendente' AND proxima_em <= ?1)
           OR (estado = 'pedido' AND atualizado_em <= ?2)
        ORDER BY atualizado_em LIMIT ?3`
    ).bind(at, at - 15 * 60_000, limit).all();
    return results || [];
  } catch {
    return [];
  }
}

/** Os que ainda pedem atenção do dono: manual, erro, ou mais de um dia sem
 *  confirmação. Com o e-mail da conta, porque quem lê é o dono.
 *
 *  Um pedido já `refunded` não entra, qualquer que seja o estado do estorno
 *  (30/09/2026): o dono que devolve pelo painel da Mercado Pago um estorno
 *  "manual" ou "erro" fecha o pedido pelo aviso dela, mas a linha do estorno
 *  ficava como estava, e o lembrete diário não parava nunca. */
export async function estornosAbertos(env, at = now()) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT e.order_id, e.estado, e.erro, e.tentativas, e.criado_em, o.amount_cents, o.method,
              a.email
         FROM estornos e JOIN orders o ON o.id = e.order_id
         LEFT JOIN accounts a ON a.id = o.account_id
        WHERE o.status <> 'refunded'
          AND (e.estado IN ('manual', 'erro')
               OR (e.estado IN ('pendente', 'pedido') AND e.criado_em <= ?))
        ORDER BY e.criado_em`
    ).bind(at - 24 * 3_600_000).all();
    return results || [];
  } catch {
    return [];
  }
}

/* ── monitoramento ──────────────────────────────────────────────────────── */

/** Marca que `nome` rodou agora. */
/* ── travas ──────────────────────────────────────────────────────────────
   Uma execução por vez de um trabalho agendado. Pega quem conseguir gravar
   a trava vencida (ou inexistente) num comando só; `ate` diz até quando ela
   vale, e uma trava de quem morreu no meio vence sozinha. Falha ABERTA: sem
   a tabela, ou com o D1 fora, a resposta é "pode seguir". */
export async function pegarTrava(env, nome, validadeMs, at = now()) {
  try {
    const r = await env.DB.prepare(
      `INSERT INTO travas (nome, ate) VALUES (?1, ?2)
       ON CONFLICT(nome) DO UPDATE SET ate = excluded.ate WHERE travas.ate <= ?3`
    ).bind(nome, at + validadeMs, at).run();
    return Number(r && r.meta && r.meta.changes) > 0;
  } catch {
    return true;
  }
}

export async function soltarTrava(env, nome) {
  try { await env.DB.prepare('UPDATE travas SET ate = 0 WHERE nome = ?').bind(nome).run(); }
  catch { /* vence sozinha */ }
}

export async function bater(env, nome, at = now()) {
  try {
    await env.DB.prepare(
      'INSERT INTO batimentos (nome, em) VALUES (?, ?) ON CONFLICT(nome) DO UPDATE SET em = excluded.em'
    ).bind(nome, at).run();
  } catch { /* o batimento nunca derruba a varredura */ }
}

/** Quando `nome` rodou pela última vez, ou null. */
export async function ultimoBatimento(env, nome) {
  try {
    const r = await env.DB.prepare('SELECT em FROM batimentos WHERE nome = ?').bind(nome).first();
    return r ? Number(r.em) : null;
  } catch {
    return null;
  }
}

/** Reserva o aviso `chave`. true = ninguém mandou ainda, mande; false = já
 *  foi. É o que faz o lembrete sair uma vez por dia, e não a cada 5 min. */
export async function reservarAviso(env, chave, at = now()) {
  try {
    const r = await env.DB.prepare('INSERT OR IGNORE INTO avisos (chave, enviado_em) VALUES (?, ?)')
      .bind(chave, at).run();
    return Number(r && r.meta && r.meta.changes) > 0;
  } catch {
    return false;
  }
}

/** Solta a reserva quando o e-mail não saiu, para a próxima varredura tentar. */
export async function soltarAviso(env, chave) {
  try { await env.DB.prepare('DELETE FROM avisos WHERE chave = ?').bind(chave).run(); } catch { /* idem */ }
}

/** Quantas vezes cada ação apareceu na trilha desde `desde`. */
export async function contarAcoes(env, acoes, desde) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT action, COUNT(*) AS n FROM access_log
        WHERE created_at >= ? AND action IN (${acoes.map(() => '?').join(', ')})
        GROUP BY action`
    ).bind(desde, ...acoes).all();
    return Object.fromEntries((results || []).map(r => [String(r.action), Number(r.n)]));
  } catch {
    return {};
  }
}

/** Avisos com mais de 60 dias saem: só servem para deduplicar. */
/* ── respostas 5xx (01/10/2026, SEC-A-005) ──────────────────────────────────
 * O que o alerta diário conta. Uma linha por hora com upsert: cada 5xx é uma
 * escrita, mas a tabela não cresce com a rajada. Nunca lança - quem chama é o
 * caminho de uma resposta que já deu errado. */
const HORA_MS = 3_600_000;
export async function contar5xx(env, at = now()) {
  try {
    await env.DB.prepare(
      'INSERT INTO respostas_5xx (hora, n) VALUES (?, 1) ON CONFLICT(hora) DO UPDATE SET n = n + 1'
    ).bind(Math.floor(at / HORA_MS) * HORA_MS).run();
  } catch { /* banco fora: o 5xx que não se conta está no painel da Cloudflare */ }
}

/** Soma das respostas 5xx desde `desde` (ms), ou null se não deu para ler. */
export async function somar5xx(env, desde) {
  try {
    const r = await env.DB.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM respostas_5xx WHERE hora >= ?')
      .bind(Math.floor(desde / HORA_MS) * HORA_MS).first();
    return r ? Number(r.n) : 0;
  } catch {
    return null;
  }
}

export async function respostas5xxPurge(env, at = now()) {
  try { await env.DB.prepare('DELETE FROM respostas_5xx WHERE hora < ?').bind(at - 7 * 86_400_000).run(); }
  catch { /* idem */ }
}

export async function avisosPurge(env, at = now()) {
  try { await env.DB.prepare('DELETE FROM avisos WHERE enviado_em < ?').bind(at - 60 * 86_400_000).run(); }
  catch { /* idem */ }
}

/* ── direitos de acesso ─────────────────────────────────────────────────── */

/** Só os que ainda valem. Um direito vencido não é devolvido: nada acima
 *  deveria precisar saber a diferença entre "nunca teve" e "não tem mais". */
export async function activeEntitlements(env, accountId, at = now()) {
  const { results } = await env.DB.prepare(
    `SELECT e.course_slug, e.granted_at, e.expires_at, e.order_id,
            o.status AS order_status, o.paid_at, o.provider
       FROM entitlements e LEFT JOIN orders o ON o.id = e.order_id
      WHERE e.account_id = ? AND (e.expires_at IS NULL OR e.expires_at > ?)`
  ).bind(accountId, at).all();
  return (results || []).map(r => {
    /* Ainda no prazo de desistência (03/11/2026, decisão do dono): o exame
       final, o certificado e as leituras bônus abrem depois dele. Só para
       acesso que veio de um pedido PAGO; presente e liberação à mão, não. */
    const prazo = r.order_status === 'paid' && r.paid_at ? prazoDeDesistencia(r.paid_at, diasDoPedido(r)) : null;
    return {
      courseSlug: r.course_slug,
      grantedAt: new Date(r.granted_at).toISOString(),
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      orderId: r.order_id,
      desistivelAte: prazo && prazo > at ? new Date(prazo).toISOString() : null
    };
  });
}

/** Até quando o acesso a `slug` ainda pode ser desistido (ms), ou null. */
export async function desistivelAte(env, accountId, slug, at = now()) {
  const e = (await activeEntitlements(env, accountId, at)).find(x => x.courseSlug === slug);
  return e && e.desistivelAte ? Date.parse(e.desistivelAte) : null;
}

/**
 * Quando o acesso a um curso vence: um instante em ms, `null` se não há
 * direito nenhum (nem vencido), `undefined` se o direito não tem vencimento.
 * É o que decide se um pedido novo é compra repetida ou renovação.
 */
export async function entitlementExpiry(env, accountId, slug) {
  const row = await env.DB.prepare(
    'SELECT expires_at FROM entitlements WHERE account_id = ? AND course_slug = ?'
  ).bind(accountId, slug).first();
  if (!row) return null;
  return row.expires_at === null || row.expires_at === undefined ? undefined : Number(row.expires_at);
}

export async function hasEntitlement(env, accountId, slug, at = now()) {
  const row = await env.DB.prepare(
    `SELECT 1 FROM entitlements
      WHERE account_id = ? AND course_slug = ? AND (expires_at IS NULL OR expires_at > ?)`
  ).bind(accountId, slug, at).first();
  return !!row;
}

/**
 * Concede (ou renova) o acesso.
 *
 * Renovar ESTENDE o que ainda vale, em vez de recomeçar a contagem: quem
 * renova com dois meses sobrando não pode perder esses dois meses por ter
 * pagado cedo. Se já venceu, conta a partir de hoje.
 *
 * ── um pedido concede UMA vez, e isso é decidido dentro do SQL ────────────
 * Webhook, tela e varredura podem liberar o mesmo pagamento no mesmo
 * instante. A versão anterior lia a validade, somava os meses em JavaScript e
 * gravava - e quem chamava conferia "este pedido já concedeu?" numa leitura
 * separada, antes. Duas liberações simultâneas liam "não" as duas, e cada uma
 * estendia a anterior: um pedido de 12 meses virava 24 ou 36, e o estorno
 * recuava só 12. Medido em worker/concessao.mjs.
 *
 * Agora é um comando só. A soma dos meses sai da linha como ela está NA HORA
 * da escrita, e o `WHERE ... order_id IS NOT excluded.order_id` faz de um
 * segundo pedido de concessão do mesmo pedido um nada. O SQLite executa um
 * comando por vez, então não há janela entre conferir e gravar.
 *
 * A conta dos meses é a do SQLite (`'+12 months'`), que transborda o dia do
 * mesmo jeito que `Date#setMonth` em UTC - 31/01 + 1 mês é 03/03 nos dois.
 *
 * Devolve `{ granted, until }`: `granted` é falso quando este pedido já tinha
 * concedido, e aí `until` é null.
 */
export async function grantAccess(env, { accountId, courseSlug, orderId, months }) {
  const t = now();
  const m = Math.max(1, Math.floor(Number(months) || 12));

  const row = await env.DB.prepare(
    `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
     VALUES (?1, ?2, ?3,
             unixepoch(CAST(?3 AS INTEGER) / 1000, 'unixepoch', ?5) * 1000 + CAST(?3 AS INTEGER) % 1000,
             ?4)
     ON CONFLICT(account_id, course_slug) DO UPDATE SET
       expires_at =
         unixepoch(CAST(CASE WHEN entitlements.expires_at > ?3 THEN entitlements.expires_at ELSE ?3 END
                        AS INTEGER) / 1000, 'unixepoch', ?5) * 1000
         + CAST(CASE WHEN entitlements.expires_at > ?3 THEN entitlements.expires_at ELSE ?3 END
                AS INTEGER) % 1000,
       order_id = excluded.order_id
     WHERE entitlements.order_id IS NOT excluded.order_id
     RETURNING expires_at`
  ).bind(accountId, courseSlug, t, orderId, `+${m} months`).first();

  if (!row) return { granted: false, until: null };

  const until = Number(row.expires_at);
  await log(env, accountId, 'grant', `${courseSlug} até ${new Date(until).toISOString()} (${orderId})`);
  return { granted: true, until };
}

/** A linha de acesso como está agora - qual pedido concedeu por último, desde
 *  quando e até quando -, ou `null`. Só decide o TEXTO do recibo; quem impede
 *  a concessão dupla é o próprio `grantAccess`. */
export const entitlementOf = (env, accountId, courseSlug) =>
  env.DB.prepare(
    'SELECT order_id, granted_at, expires_at FROM entitlements WHERE account_id = ? AND course_slug = ?'
  ).bind(accountId, courseSlug).first();

/**
 * O estorno de UM pedido: recua os meses dele e marca o pedido `refunded`.
 *
 * Recua, e não apaga: quando o pedido estornado é a renovação de quem já
 * tinha oito meses pagos, apagar a linha tiraria também os oito meses que
 * ninguém devolveu. A linha só some se não sobrar nada - ou se não tinha
 * vencimento, que nenhum curso vende hoje.
 *
 * ── uma vez só, e tudo ou nada ────────────────────────────────────────────
 * Webhook, tela e varredura podem ver o mesmo estorno no mesmo instante. A
 * versão anterior lia "o pedido está pago?", recuava e só depois marcava - e
 * dois avisos simultâneos liam "pago" os dois e recuavam duas vezes. Quem
 * tinha renovado perdia a compra anterior junto (worker/concessao.mjs).
 *
 * Agora são três comandos num `batch`, que o D1 executa como UMA transação:
 * cada um só age se o pedido ainda está `paid`, e o último o tira de lá. O
 * segundo aviso encontra o pedido já `refunded` e não faz nada. E como é
 * tudo ou nada, uma queda no meio não deixa o acesso recuado com o pedido
 * ainda pago (que o reenvio recuaria de novo), nem o contrário.
 *
 * Devolve `{ refunded, until }`: `refunded` é falso quando outra chamada já
 * tinha estornado este pedido; `until` é a validade que sobrou, ou null se o
 * acesso sumiu.
 */
export async function refundOrder(env, { accountId, courseSlug, orderId, months, itens = null, why = '' }) {
  const t = now();
  const pago = `EXISTS (SELECT 1 FROM orders WHERE id = ?3 AND status = 'paid')`;
  /* Um pedido de pacote recua os meses de CADA produto que ele abriu, na
     mesma transação: o pedido só sai de `paid` no último comando, então
     recuar um produto e não o outro não acontece. */
  const lista = (itens && itens.length ? itens : [{ courseSlug, months }])
    .map(i => ({ courseSlug: i.courseSlug, m: Math.max(1, Math.floor(Number(i.months) || 12)) }));

  const comandos = lista.flatMap(({ courseSlug: slug, m }) => [
    env.DB.prepare(
      `UPDATE entitlements
          SET expires_at = unixepoch(CAST(expires_at AS INTEGER) / 1000, 'unixepoch', ?4) * 1000
                           + CAST(expires_at AS INTEGER) % 1000
        WHERE account_id = ?1 AND course_slug = ?2 AND expires_at IS NOT NULL
          AND ${pago}`
    ).bind(accountId, slug, orderId, `-${m} months`),
    env.DB.prepare(
      `DELETE FROM entitlements
        WHERE account_id = ?1 AND course_slug = ?2
          AND (expires_at IS NULL OR expires_at <= ?4)
          AND ${pago}`
    ).bind(accountId, slug, orderId, t)
  ]);
  const resultados = await env.DB.batch([...comandos,
    env.DB.prepare(
      `UPDATE orders SET status = 'refunded' WHERE id = ? AND status = 'paid'`
    ).bind(orderId)
  ]);
  const marcado = resultados[resultados.length - 1];

  if (!(Number(marcado && marcado.meta && marcado.meta.changes) > 0)) {
    return { refunded: false, until: null };
  }

  let until = null;
  for (const [k, { courseSlug: slug }] of lista.entries()) {
    const row = await entitlementOf(env, accountId, slug);
    const fica = row && row.expires_at !== null ? Number(row.expires_at) : null;
    if (k === 0) until = fica;
    await log(env, accountId, 'revoke', fica
      ? `${slug} recuou para ${new Date(fica).toISOString()} ${why}`.trim()
      : `${slug} ${why}`.trim());
  }
  return { refunded: true, until };
}

/* ── convites ───────────────────────────────────────────────────────────── */

/** Registra (ou atualiza) um convite. Vale mesmo sem conta existir ainda. */
export async function inviteCreate(env, { email, courseSlug, months, note }) {
  await env.DB.prepare(
    `INSERT INTO invites (email, course_slug, months, note, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email, course_slug) DO UPDATE SET
       months = excluded.months, note = excluded.note,
       created_at = excluded.created_at, used_at = NULL`
  ).bind(normalizeEmail(email), courseSlug, Number(months) || 12,
         String(note || '').slice(0, 200), now()).run();
}

/**
 * Os convites pendentes deste e-mail. Uma LEITURA, e só.
 *
 * ── por que não existe mais um `inviteRedeem` ────────────────────────────
 * Existia, e virava acesso sozinho no cadastro e no login. A auditoria
 * (F-18) mostrou o que isso significa: o convite é endereçado a um e-mail
 * que ainda NÃO tem conta, e a única credencial exigida para resgatá-lo era
 * escrever esse e-mail num formulário de cadastro. Quem soubesse que o
 * endereço de alguém foi presenteado - e quem presenteia costuma contar -
 * chegava primeiro e levava o curso.
 *
 * Fechar isso por automação exigiria provar a posse da caixa de entrada:
 * mais uma tabela, mais uma tela, mais um e-mail, e uma janela de prefetch
 * de cliente de e-mail para pensar. Só que o dono JÁ está no circuito de
 * todo presente - é ele quem roda `liberar` - e ele sabe quem presenteou.
 * Então o cadastro num endereço presenteado deixou de virar acesso e passou
 * a AVISAR o dono (worker/src/api/auth.js), que confirma com um `liberar` -
 * e aí o acesso é concedido direto, porque a conta agora existe.
 *
 * Nunca lança: é chamada no meio do cadastro, e um presente que falha não
 * pode impedir alguém de criar a conta.
 */
export async function invitesPendentes(env, email) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT course_slug, months FROM invites WHERE email = ? AND used_at IS NULL'
    ).bind(normalizeEmail(email)).all();
    return results || [];
  } catch {
    return [];
  }
}

/* ── pedidos ────────────────────────────────────────────────────────────── */

export async function createOrder(env, o) {
  const id = newId('HF');
  await env.DB.prepare(
    `INSERT INTO orders (id, account_id, course_slug, amount_cents, currency, method,
                         installments, status, provider, created_at, parceria, origem, campanha,
                         nome_completo, cpf)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, o.accountId, o.courseSlug, o.amountCents, o.currency || 'BRL', o.method,
         o.installments || 1, o.provider || 'mercadopago', now(), o.parceria || null, o.origem || null, o.campanha || null,
         o.nomeCompleto || null, o.cpf || null).run();
  return getOrder(env, id);
}

export const getOrder = (env, id) =>
  env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();

/* A lista de Compras do /perfil. Um pedido `failed` sem `provider_ref` é um
   clique em Pagar cuja cobrança nem chegou a nascer no provedor (auditoria de
   01/10/2026, PAY-B-010): não houve pagamento, não há o que mostrar, e cada
   tentativa aparecia como uma compra "Não concluída" em vermelho. */
export const ordersOf = (env, accountId, limit = 50) =>
  env.DB.prepare(
    `SELECT * FROM orders
      WHERE account_id = ? AND NOT (status = 'failed' AND provider_ref IS NULL)
      ORDER BY created_at DESC LIMIT ?`
  ).bind(accountId, limit).all().then(r => r.results || []);

/** O PIX ainda pagável de um curso: o pedido `pending` mais recente da conta,
 *  com código e com o prazo no futuro (auditoria de 01/10/2026, PAY-B-002).
 *  É o que o checkout reabre ao voltar do aplicativo do banco, em vez de
 *  gerar um segundo PIX. null quando não há. */
export async function pixPendente(env, accountId, courseSlug, at = now()) {
  return await env.DB.prepare(
    `SELECT * FROM orders
      WHERE account_id = ? AND course_slug = ? AND status = 'pending' AND method = 'pix'
        AND pix_code IS NOT NULL AND pix_expires_at > ?
      ORDER BY created_at DESC LIMIT 1`
  ).bind(accountId, courseSlug, at).first() || null;
}

/** O que o provedor disse por último sobre um pedido, em palavras nossas:
 *  'em-analise' (cartão em análise na operadora), 'aguardando' (o pagamento
 *  existe e espera), 'recusado', 'aprovado', 'devolvido', ou null quando
 *  nenhum pagamento apareceu ainda. Decide só o TEXTO da tela de retorno
 *  (PAY-B-003); acesso nunca sai daqui. */
export async function ultimoPagamentoDe(env, orderId) {
  try {
    const row = await env.DB.prepare(
      `SELECT raw FROM payment_events WHERE order_id = ?
        ORDER BY created_at DESC, rowid DESC LIMIT 1`
    ).bind(orderId).first();
    if (!row) return null;
    let st = '';
    try { st = String(JSON.parse(row.raw).status || ''); } catch { return null; }
    return ({
      in_process: 'em-analise', in_mediation: 'em-analise', pending: 'aguardando',
      authorized: 'aprovado', approved: 'aprovado', rejected: 'recusado', cancelled: 'recusado',
      refunded: 'devolvido', charged_back: 'devolvido'
    })[st] || null;
  } catch {
    return null;
  }
}

/** Os acessos VENCIDOS da conta, por curso: `[{ courseSlug, expiredAt }]`.
 *  A tabela guarda uma linha por conta e curso, então o vencimento que está
 *  lá é o mais recente. É o que deixa o /perfil e a página do curso dizerem
 *  "seu acesso terminou em ..." em vez de tratar quem pagou como visitante
 *  (auditoria de 01/10/2026, PAY-B-004). */
export async function acessosVencidos(env, accountId, at = now()) {
  const { results } = await env.DB.prepare(
    `SELECT course_slug, expires_at FROM entitlements
      WHERE account_id = ? AND expires_at IS NOT NULL AND expires_at <= ?
      ORDER BY expires_at DESC`
  ).bind(accountId, at).all();
  return (results || []).map(r => ({
    courseSlug: r.course_slug,
    expiredAt: new Date(Number(r.expires_at)).toISOString()
  }));
}

export async function updateOrder(env, id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  /* Os nomes vêm de literais deste arquivo, nunca de entrada externa; os
     valores vão ligados. Uma lista branca explícita deixa isso verificável em
     vez de confiável. */
  const ALLOWED = new Set([
    'status', 'provider_ref', 'pay_url', 'pix_code', 'pix_expires_at', 'paid_at', 'checked_at'
  ]);
  const safe = keys.filter(k => ALLOWED.has(k));
  if (!safe.length) return;
  await env.DB.prepare(
    `UPDATE orders SET ${safe.map(k => `${k} = ?`).join(', ')} WHERE id = ?`
  ).bind(...safe.map(k => fields[k]), id).run();
}

/**
 * Marca o pedido como pago - e diz se foi ESTA chamada que marcou.
 *
 * Das liberações simultâneas de um mesmo pagamento, só uma recebe `true`, e é
 * ela quem registra `paid` na trilha e manda o recibo. Sem isto cada caminho
 * que chegasse junto mandava o seu, e o comprador recebia três recibos iguais.
 */
export async function markPaid(env, id, providerRef, at = now()) {
  const r = await env.DB.prepare(
    `UPDATE orders SET status = 'paid', paid_at = ?, provider_ref = ?
      WHERE id = ? AND status <> 'paid'`
  ).bind(at, String(providerRef), id).run();
  return Number(r && r.meta && r.meta.changes) > 0;
}

/* ── a lista de novidades (api/novidades.js) ─────────────────────────────
   As duas falham FECHADAS para quem pergunta e abertas para quem usa: sem a
   tabela (o schema.sql entra na publicação, mas um banco de teste pode não
   tê-la), ninguém está na lista, e a conta continua funcionando. */

/** A pessoa pediu para receber o aviso do próximo curso? */
export async function novidadesQuer(env, accountId) {
  try {
    return !!await env.DB.prepare('SELECT 1 AS x FROM novidades WHERE account_id = ?')
      .bind(accountId).first();
  } catch { return false; }
}

export async function novidadesMarcar(env, accountId, quer, at = now()) {
  await env.DB.prepare(quer
    ? 'INSERT INTO novidades (account_id, criado_em) VALUES (?, ?) ON CONFLICT(account_id) DO NOTHING'
    : 'DELETE FROM novidades WHERE account_id = ?'
  ).bind(...(quer ? [accountId, at] : [accountId])).run();
}

/* ── o lembrete para estudar (worker/src/lembrete.js) ────────────────────
   Mesmo desenho da lista de novidades: sem a tabela, ninguém pediu. */

/** A pessoa pediu o lembrete para estudar? */
export async function lembreteQuer(env, accountId) {
  try {
    return !!await env.DB.prepare('SELECT 1 AS x FROM lembretes_estudo WHERE account_id = ?')
      .bind(accountId).first();
  } catch { return false; }
}

export async function lembreteMarcar(env, accountId, quer, at = now()) {
  await env.DB.prepare(quer
    ? 'INSERT INTO lembretes_estudo (account_id, criado_em) VALUES (?, ?) ON CONFLICT(account_id) DO NOTHING'
    : 'DELETE FROM lembretes_estudo WHERE account_id = ?'
  ).bind(...(quer ? [accountId, at] : [accountId])).run();
}

/** Outro pedido PAGO da mesma conta e do mesmo curso, pago dentro da janela
 *  (auditoria de 28/09, PAY-004). null quando não há. */
export async function outroPedidoPagoRecente(env, order, janelaMs, at = now()) {
  return await env.DB.prepare(
    `SELECT id, paid_at FROM orders
      WHERE account_id = ? AND course_slug = ? AND status = 'paid'
        AND id <> ? AND paid_at >= ?
      ORDER BY paid_at DESC LIMIT 1`
  ).bind(order.account_id, order.course_slug, order.id, at - janelaMs).first() || null;
}

/** Pendentes que já têm idade para valer uma pergunta ao provedor.
 *
 *  Os `failed` entram também (27/09/2026): um cartão recusado marca o pedido,
 *  o comprador tenta de novo no mesmo checkout e é aprovado - e esse pedido
 *  ficava fora da varredura. Se o aviso da Mercado Pago se perdesse, quem
 *  pagou não entrava nunca. Depois de 24 h eles expiram como os pendentes. */
/*  Um `failed` SEM `provider_ref` fica de fora (01/10/2026, PAY-B-010): a
 *  cobrança nem nasceu no provedor, não há pagamento para achar, e cada
 *  consulta dele com a credencial quebrada virava `settle-error` e um alerta
 *  falso de "liberação que falhou". */
export function stalePendingOrders(env, { olderThanMs = 60_000, limit = 25 } = {}) {
  return env.DB.prepare(
    `SELECT * FROM orders
      WHERE (status = 'pending' OR (status = 'failed' AND provider_ref IS NOT NULL))
        AND created_at < ?
      ORDER BY created_at ASC LIMIT ?`
  ).bind(now() - olderThanMs, limit).all().then(r => r.results || []);
}

/** Pedidos EXPIRADOS que tiveram pagamento no provedor (um evento gravado),
 *  criados nos últimos `dias`, que ninguém consultou nas últimas `intervaloMs`
 *  (01/10/2026, PAY-B-009). É o cartão que ficou em análise antifraude por
 *  mais de 24 h: a varredura o expirava e nunca mais perguntava, e uma
 *  aprovação depois disso só chegava pelo webhook. Agora ele continua sendo
 *  perguntado, com calma, por uma semana. */
export function expiredOrdersToRecheck(env, { dias = 7, intervaloMs = 6 * 3_600_000, limit = 5 } = {}, at = now()) {
  return env.DB.prepare(
    `SELECT * FROM orders o
      WHERE o.status = 'expired' AND o.provider_ref IS NOT NULL
        AND o.created_at >= ?1 AND (o.checked_at IS NULL OR o.checked_at < ?2)
        AND EXISTS (SELECT 1 FROM payment_events e WHERE e.order_id = o.id)
      ORDER BY COALESCE(o.checked_at, 0) ASC LIMIT ?3`
  ).bind(at - dias * 86_400_000, at - intervaloMs, limit).all().then(r => r.results || []);
}

/** Pedidos pagos à mão (Actions → Acesso → `liberar` com `pedido`) cujo
 *  recibo ainda não saiu (PAY-B-005). A Action só fala SQL; quem manda o
 *  e-mail é a varredura, com o mesmo texto do recibo automático. A chave
 *  `recibo:<pedido>` em `avisos` é o que impede o segundo envio. */
export function recibosManuaisPendentes(env, { dias = 7, limit = 10 } = {}, at = now()) {
  return env.DB.prepare(
    `SELECT * FROM orders o
      WHERE o.status = 'paid' AND o.provider = 'manual' AND o.paid_at >= ?1
        AND NOT EXISTS (SELECT 1 FROM avisos a WHERE a.chave = 'recibo:' || o.id)
      ORDER BY o.paid_at ASC LIMIT ?2`
  ).bind(at - dias * 86_400_000, limit).all().then(r => r.results || []);
}

/* ── os avisos de fim de acesso (PAY-B-004) ──────────────────────────────
   Três marcos por vencimento: 30 dias antes, 7 dias antes e o dia do fim.
   Cada um sai UMA vez para aquele vencimento - a chave inclui o próprio
   `expires_at`, então uma renovação (que muda a data) recomeça os marcos, e
   a varredura que roda de novo no mesmo dia não manda duas vezes. */

/** Os direitos que entraram na janela de algum marco e ainda não receberam
 *  o aviso dele. Uma linha por (direito, marco), com o e-mail da conta. */
export async function vencimentosParaAvisar(env, { limit = 20 } = {}, at = now()) {
  const D = 86_400_000;
  try {
    const { results } = await env.DB.prepare(
      `SELECT e.account_id, e.course_slug, e.expires_at, a.email, a.name, a.idioma, m.marco
         FROM entitlements e
         JOIN accounts a ON a.id = e.account_id
         JOIN (SELECT 'd30' AS marco, ?1 AS de, ?2 AS ate
               UNION ALL SELECT 'd7', ?3, ?4
               UNION ALL SELECT 'fim', ?5, ?6) m
           ON e.expires_at > m.de AND e.expires_at <= m.ate
        WHERE e.expires_at IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM avisos_vencimento v
                           WHERE v.account_id = e.account_id AND v.course_slug = e.course_slug
                             AND v.expires_at = e.expires_at AND v.marco = m.marco)
        ORDER BY e.expires_at ASC LIMIT ?7`
    ).bind(
      at + 23 * D, at + 30 * D,      // 30 dias: entrou na janela entre 30 e 23 dias antes
      at, at + 7 * D,                // 7 dias: de 7 dias antes até o fim
      at - 3 * D, at,                // o fim: venceu nos últimos três dias
      limit
    ).all();
    return results || [];
  } catch {
    /* Tabela ainda não criada pela publicação: ninguém é avisado, nada cai. */
    return [];
  }
}

/** Reserva o marco. true = esta chamada reservou e deve mandar. */
export async function reservarVencimento(env, { accountId, courseSlug, expiresAt, marco }, at = now()) {
  try {
    const r = await env.DB.prepare(
      `INSERT OR IGNORE INTO avisos_vencimento (account_id, course_slug, expires_at, marco, enviado_em)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(accountId, courseSlug, expiresAt, marco, at).run();
    return Number(r && r.meta && r.meta.changes) > 0;
  } catch {
    return false;
  }
}

/** Solta a reserva quando o e-mail não saiu: a próxima varredura tenta. */
export async function soltarVencimento(env, { accountId, courseSlug, expiresAt, marco }) {
  try {
    await env.DB.prepare(
      `DELETE FROM avisos_vencimento
        WHERE account_id = ? AND course_slug = ? AND expires_at = ? AND marco = ?`
    ).bind(accountId, courseSlug, expiresAt, marco).run();
  } catch { /* a reserva fica; o aviso deste marco se perde, o curso não */ }
}

/* ── lembretes dos primeiros dias (worker/src/ativacao.js) ─────────────── */

/** Compras pagas cujo marco (d1, d3, d7) caiu na janela e ainda não saiu,
 *  com o que o lembrete precisa: contato, quantas lições a conta concluiu e
 *  quando o progresso mudou pela última vez. Só pedidos de `cursos`, pagos a
 *  partir de `desde`. Tabela ausente: lista vazia. */
export async function ativacoesParaAvisar(env, { cursos, desde, limit = 20 }, at = now()) {
  const D = 86_400_000;
  if (!cursos || !cursos.length) return [];
  const lista = cursos.map((_, i) => `?${i + 9}`).join(', ');
  try {
    const { results } = await env.DB.prepare(
      `SELECT o.id AS order_id, o.account_id, o.course_slug, o.paid_at, a.email, a.name, a.idioma,
              p.updated_at AS progresso_em, m.marco,
              (SELECT COUNT(*) FROM json_each(CASE WHEN json_valid(p.state) THEN p.state ELSE '{}' END, '$.lessons') l
                WHERE json_extract(l.value, '$.completedAt') IS NOT NULL) AS concluidas
         FROM orders o
         JOIN accounts a ON a.id = o.account_id
         LEFT JOIN progress p ON p.account_id = o.account_id
         JOIN (SELECT 'd1' AS marco, ?1 AS de, ?2 AS ate
               UNION ALL SELECT 'd3', ?3, ?4
               UNION ALL SELECT 'd7', ?5, ?6) m
           ON o.paid_at > m.de AND o.paid_at <= m.ate
        WHERE o.status = 'paid' AND o.paid_at >= ?7 AND o.course_slug IN (${lista})
          AND NOT EXISTS (SELECT 1 FROM avisos_ativacao v WHERE v.order_id = o.id AND v.marco = m.marco)
        ORDER BY o.paid_at ASC LIMIT ?8`
    ).bind(
      at - 3 * D, at - 1 * D,     // d1: pago entre 3 dias e 1 dia atrás
      at - 6 * D, at - 3 * D,     // d3: entre 6 e 3 dias atrás
      at - 10 * D, at - 7 * D,    // d7: entre 10 e 7 dias atrás
      desde, limit, ...cursos
    ).all();
    return results || [];
  } catch {
    return [];
  }
}

/** Reserva o marco do pedido. true = esta chamada reservou e deve mandar. */
export async function reservarAtivacao(env, { orderId, marco }, at = now()) {
  try {
    const r = await env.DB.prepare(
      'INSERT OR IGNORE INTO avisos_ativacao (order_id, marco, enviado_em) VALUES (?, ?, ?)'
    ).bind(orderId, marco, at).run();
    return Number(r && r.meta && r.meta.changes) > 0;
  } catch {
    return false;
  }
}

/** Solta a reserva quando o e-mail não saiu: a próxima rodada tenta. */
export async function soltarAtivacao(env, { orderId, marco }) {
  try {
    await env.DB.prepare('DELETE FROM avisos_ativacao WHERE order_id = ? AND marco = ?').bind(orderId, marco).run();
  } catch { /* o lembrete deste marco se perde, o curso não */ }
}

/** Pedidos PAGOS pela Mercado Pago nos últimos `dias`, que a varredura não
 *  conferiu nas últimas 24 h. É a rede para estorno e contestação cujo aviso
 *  nunca chegou (auditoria de 28/09, PAY-002): antes, a varredura só olhava
 *  pendentes, e um pedido pago nunca mais era perguntado. */
export function paidOrdersToRecheck(env, { dias = 120, limit = 10 } = {}, at = now()) {
  return env.DB.prepare(
    `SELECT * FROM orders
      WHERE status = 'paid' AND provider = 'mercadopago'
        AND paid_at >= ?1 AND (checked_at IS NULL OR checked_at < ?2)
      ORDER BY COALESCE(checked_at, 0) ASC LIMIT ?3`
  ).bind(at - dias * 86_400_000, at - 86_400_000, limit).all().then(r => r.results || []);
}

/* ── eventos de pagamento ───────────────────────────────────────────────── */

/**
 * Grava o que o provedor disse e responde se ESTE aviso é novo.
 *
 * `false` significa "já processado" - a Mercado Pago reenvia o mesmo aviso por
 * desenho, e sem esta trava um pedido poderia liberar acesso duas vezes.
 */
export async function recordEvent(env, { eventId, orderId, status, raw, source }) {
  try {
    await env.DB.prepare(
      `INSERT INTO payment_events (event_id, order_id, status, raw, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(String(eventId), orderId || null, status || null,
           JSON.stringify(enxuto(raw)).slice(0, 8000), source, now()).run();
    return true;
  } catch {
    /* Violação do UNIQUE: aviso repetido. Não é erro, é o caso normal. */
    return false;
  }
}

/**
 * O que do pagamento vale a pena guardar.
 *
 * O objeto inteiro que a Mercado Pago devolve traz o e-mail do pagador, o
 * CPF dele e, num cartão, o nome do titular e os primeiros e últimos dígitos.
 * Nada disso é lido por ninguém aqui - a liberação usa status, valor, moeda
 * e referência - e guardá-lo para sempre numa tabela sem faxina é um dossiê
 * de identidade esperando um vazamento. Fica só o que responde "o que a
 * Mercado Pago disse sobre este pagamento", que é o propósito da tabela.
 */
const GUARDAR = [
  'id', 'status', 'status_detail', 'transaction_amount', 'transaction_amount_refunded',
  'currency_id', 'external_reference', 'date_created', 'date_approved',
  'payment_method_id', 'payment_type_id', 'live_mode'
];
export function enxuto(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const fica = Object.fromEntries(GUARDAR.filter(k => k in raw).map(k => [k, raw[k]]));
  /* O que sobrou depois da taxa (26/10/2026, receita líquida do painel de
     marketing): só dois NÚMEROS, tirados de `transaction_details` e
     `fee_details`. Os dois objetos inteiros ficam de fora: o primeiro pode
     trazer a instituição e a referência bancária do pagador. */
  const liquido = raw.transaction_details && Number(raw.transaction_details.net_received_amount);
  if (Number.isFinite(liquido) && liquido > 0) fica.liquido = liquido;
  if (Array.isArray(raw.fee_details)) {
    const taxas = raw.fee_details.reduce((s, f) => s + (Number(f && f.amount) || 0), 0);
    if (taxas > 0) fica.taxas = Math.round(taxas * 100) / 100;
  }
  return fica;
}

/* ── freio ──────────────────────────────────────────────────────────────── */

/**
 * Verdadeiro quando a chave estourou o limite nesta janela de um minuto.
 *
 * Contagem simples, e de propósito: um freio exato exigiria coordenação, e o
 * que este precisa impedir é uma máquina tentando mil senhas - não um humano
 * digitando errado três vezes.
 */
export async function throttled(env, key, limit = 10, janelaMs = 60_000) {
  return (await contar(env, key, limit, janelaMs)).negado;
}

/* O miolo de `throttled` e de `reservarVaga`: devolve, além do veredicto, se
   a chamada GRAVOU (só quem gravou tem uma vaga para devolver). */
async function contar(env, key, limit, janelaMs) {
  /* `window_at` é o INÍCIO da janela, em milissegundos - a mesma escala para
     toda janela, de um minuto ou de uma hora. Já foi um índice
     (`floor(now / janela)`), e aí a limpeza feita por uma chave de um minuto
     apagava as linhas das chaves de uma hora, cujos índices são cem vezes
     menores: o teto de uma hora do pedido de senha sumia a cada login. A
     janela também vai na chave, para que dois tetos sobre o mesmo nome não
     colidam. */
  const window_at = Math.floor(now() / janelaMs) * janelaMs;
  const k = janelaMs === 60_000 ? key : `${key}@${janelaMs}`;

  /* A leitura prévia só serve para POUPAR a escrita de quem já estourou -
     senão o freio é o próprio amplificador: quem está sendo barrado continua
     gastando a cota de escrita do D1, uma linha por requisição. Ela pode
     NEGAR, nunca autorizar: a decisão de deixar passar sai da escrita
     atômica logo abaixo. A primeira versão desta mudança decidia pela
     leitura, e a verificação independente da auditoria mostrou o custo: uma
     rajada de duzentas requisições em paralelo lia "zero" duzentas vezes e
     passava inteira. Ler e depois gravar não é uma operação; gravar e
     receber o valor de volta é. */
  const antes = await env.DB.prepare(
    'SELECT hits FROM throttle WHERE key = ? AND window_at = ?'
  ).bind(k, window_at).first();
  if (antes && antes.hits >= limit) return { negado: true, gravou: false, k, window_at };

  /* Um comando só, e o SQLite devolve o valor DEPOIS do incremento: duas
     requisições simultâneas recebem números diferentes, e só as `limit`
     primeiras recebem um número que passa. */
  const row = await env.DB.prepare(
    `INSERT INTO throttle (key, window_at, hits) VALUES (?, ?, 1)
     ON CONFLICT(key, window_at) DO UPDATE SET hits = hits + 1
     RETURNING hits`
  ).bind(k, window_at).first();
  const hits = row && Number.isFinite(Number(row.hits)) ? Number(row.hits) : limit + 1;
  /* Limpeza oportunista: sem ela a tabela cresce para sempre, e um cron só
     para isso seria um cron a mais para manter.
     ────────────────────────────────────────────────────────────────────
     ⚠ O HORIZONTE PRECISA SER MAIOR QUE A MAIOR JANELA EM USO. A primeira
     versão apagava tudo com mais de duas horas, o que era verdade enquanto
     a maior janela era de uma hora. No dia em que entrou uma janela de 24
     horas (o aviso de convite pendente), a linha recém-criada dessa janela
     - carimbada no INÍCIO do dia, portanto com mais de duas horas às duas
     da tarde - era apagada pela limpeza da própria chamada que a criou. O
     contador nunca passava de um, e o freio de 24 horas não freava nada.
     Duas vezes a maior janela, e a regra escrita aqui para a próxima. */
  const FAXINA_MS = 48 * 3_600_000;
  if (hits === 1) {
    await env.DB.prepare('DELETE FROM throttle WHERE window_at < ?')
      .bind(now() - FAXINA_MS).run();
  }
  return { negado: hits > limit, gravou: true, k, window_at };
}

/**
 * Reserva uma vaga no freio ANTES de fazer a coisa cara, e devolve a vaga
 * se ela não precisar contar.
 *
 * É o freio do login (auditoria de 01/10/2026, SEC-A-002). O teto de ERROS
 * só deveria gastar quando a senha erra, e a primeira versão fazia isso com
 * uma leitura (`estourou`) antes e o gasto depois da verificação. Só que a
 * verificação leva milissegundos de PBKDF2, e quarenta tentativas em
 * paralelo liam "abaixo do teto" quarenta vezes: todas eram avaliadas, e o
 * teto de 5 por minuto virava o que a rajada coubesse. Aqui a vaga é tomada
 * pela escrita atômica de `throttled` (só as `limit` primeiras passam,
 * inclusive em paralelo) e quem ACERTOU a senha a devolve, para que o teto
 * continue contando só as falhas: um estranho errando não tranca a dona.
 *
 * `devolver` nunca lança e só existe de verdade quando a chamada gravou.
 * Devolver a última vaga apaga a linha, para que acertar a senha não deixe
 * rastro no freio.
 */
export async function reservarVaga(env, key, limit = 10, janelaMs = 60_000) {
  const r = await contar(env, key, limit, janelaMs);
  let devolvida = !r.gravou;
  const devolver = async () => {
    if (devolvida) return;
    devolvida = true;
    try {
      /* `hits <= 1` com a minha vaga ainda contada quer dizer que a única
         vaga da linha é a minha. Senão, desconta um. */
      const apagou = await env.DB.prepare(
        'DELETE FROM throttle WHERE key = ? AND window_at = ? AND hits <= 1'
      ).bind(r.k, r.window_at).run();
      if (!apagou?.meta?.changes) {
        await env.DB.prepare(
          'UPDATE throttle SET hits = hits - 1 WHERE key = ? AND window_at = ? AND hits > 0'
        ).bind(r.k, r.window_at).run();
      }
    } catch {
      /* Uma vaga não devolvida é um erro a mais na conta de quem acertou;
         nunca derruba o login. */
    }
  };
  return { negado: r.negado, devolver };
}

/**
 * A chave já estourou? Só lê, não conta.
 *
 * É a metade "pergunta" do freio, para quando gastar o orçamento tem de ser
 * uma decisão separada de conferi-lo: o login gasta o orçamento do e-mail só
 * quando a senha ERRA. Antes, nove tentativas erradas de um estranho
 * trancavam a dona da conta para fora com a senha certa na mão.
 */
export async function estourou(env, key, limit = 10, janelaMs = 60_000) {
  const window_at = Math.floor(now() / janelaMs) * janelaMs;
  const k = janelaMs === 60_000 ? key : `${key}@${janelaMs}`;
  const row = await env.DB.prepare(
    'SELECT hits FROM throttle WHERE key = ? AND window_at = ?'
  ).bind(k, window_at).first();
  return !!row && row.hits >= limit;
}

/* ── trilha ─────────────────────────────────────────────────────────────── */

/* O conteúdo do curso saiu para esta conta (auditoria de 01/10/2026,
   SEC-A-010): uma linha por conta por dia, na trilha, e só a partir do
   200 (o 304 do cache não conta). É o que diz ao dono, num pedido de
   desistência, se o curso inteiro já foi baixado. Não muda o direito de
   desistir: é informação. */
export async function registrarConteudo(env, accountId, at = now()) {
  try {
    const ja = await env.DB.prepare(
      "SELECT 1 FROM access_log WHERE account_id = ? AND action = 'conteudo' AND created_at > ? LIMIT 1"
    ).bind(accountId, at - 86_400_000).first();
    if (!ja) await log(env, accountId, 'conteudo', '');
  } catch { /* a trilha nunca derruba a aula */ }
}

/** Em quantos dias o conteúdo saiu para a conta desde `desde`, e o primeiro. */
export async function conteudoBaixado(env, accountId, desde) {
  try {
    const r = await env.DB.prepare(
      "SELECT COUNT(*) AS dias, MIN(created_at) AS primeiro FROM access_log WHERE account_id = ? AND action = 'conteudo' AND created_at >= ?"
    ).bind(accountId, desde).first();
    return { dias: Number(r?.dias) || 0, primeiro: r?.primeiro ?? null };
  } catch { return { dias: 0, primeiro: null }; }
}

export async function log(env, accountId, action, detail = '') {
  try {
    await env.DB.prepare(
      'INSERT INTO access_log (account_id, action, detail, created_at) VALUES (?, ?, ?, ?)'
    ).bind(accountId || null, action, String(detail).slice(0, 500), now()).run();
  } catch {
    /* A trilha nunca derruba a operação que ela registra. */
  }
}

/**
 * O último e-mail de recuperação SAIU?
 *
 * `true`, `false`, ou `null` quando ninguém pediu um link ainda.
 *
 * Existe porque "a chave está configurada" e "o e-mail está chegando" são
 * duas perguntas diferentes, e a distância entre as duas é uma armadilha de
 * verdade: a Resend recusa com 403 enquanto o domínio do remetente não
 * estiver verificado, e o sintoma é NADA. A tela diz "o link está a
 * caminho", o pedido responde 200, a saúde diz `email: true` - e ninguém
 * recebe coisa nenhuma. Dá para ficar semanas assim sem desconfiar.
 *
 * Lê a trilha em vez de guardar estado novo: a informação já está lá,
 * gravada por `forgot` a cada tentativa.
 */
export async function ultimoEnvioDeSenha(env) {
  try {
    const row = await env.DB.prepare(
      `SELECT action FROM access_log
        WHERE action IN ('forgot-enviado', 'forgot-falhou')
        ORDER BY id DESC LIMIT 1`
    ).first();
    if (!row) return null;
    return row.action === 'forgot-enviado';
  } catch {
    /* Sem tabela, sem resposta - e isso não é falha de saúde. */
    return null;
  }
}

/* ── progresso ──────────────────────────────────────────────────────────── */

/** O estado gravado, ou `null` para quem nunca sincronizou. */
/** Existe linha de progresso para a conta, legível ou não? É a pergunta do
 *  DELETE: uma linha com JSON quebrado também precisa poder ser apagada. */
export async function hasProgress(env, accountId) {
  return !!(await env.DB.prepare('SELECT 1 AS ok FROM progress WHERE account_id = ?')
    .bind(accountId).first());
}

export async function getProgress(env, accountId) {
  const row = await env.DB.prepare(
    'SELECT state, version, rev, updated_at FROM progress WHERE account_id = ?'
  ).bind(accountId).first();
  if (!row) return null;
  let state = null;
  /* Um JSON quebrado aqui não pode derrubar a carga do curso. Vale o mesmo
     que "nunca sincronizou": o aparelho manda o que tem e a linha se
     conserta na próxima escrita. */
  try { state = JSON.parse(row.state); } catch { return null; }
  return { state, version: row.version, rev: row.rev, updatedAt: row.updated_at };
}

/**
 * Grava, mas só por cima da revisão que o cliente declara ter lido.
 *
 * Devolve `{ ok: true, rev }` quando gravou, e `{ ok: false, atual }` quando
 * outro aparelho escreveu no meio - aí quem chamou funde e tenta de novo. É
 * a trava que faz o celular e o notebook somarem em vez de se sobrescreverem.
 *
 * `expected === 0` significa "não li nada, esta linha deveria não existir":
 * é o primeiro envio de um aparelho. Se a linha já existir, é conflito.
 */
export async function putProgress(env, accountId, { state, version, expected }) {
  const t = now();
  const texto = JSON.stringify(state);

  if (!expected) {
    try {
      await env.DB.prepare(
        `INSERT INTO progress (account_id, state, version, rev, updated_at)
         VALUES (?, ?, ?, 1, ?)`
      ).bind(accountId, texto, Number(version) || 2, t).run();
      return { ok: true, rev: 1, updatedAt: t };
    } catch {
      /* A chave primária recusou: já existe linha. É conflito, não erro. */
      const atual = await getProgress(env, accountId);
      return { ok: false, atual };
    }
  }

  /* O `rev = ?` no WHERE é a comparação e a escrita no mesmo comando - é
     isso que torna a troca atômica sem precisar de transação. */
  const r = await env.DB.prepare(
    `UPDATE progress SET state = ?, version = ?, rev = rev + 1, updated_at = ?
      WHERE account_id = ? AND rev = ?`
  ).bind(texto, Number(version) || 2, t, accountId, Number(expected)).run();

  if (r.meta && r.meta.changes) {
    return { ok: true, rev: Number(expected) + 1, updatedAt: t };
  }
  return { ok: false, atual: await getProgress(env, accountId) };
}

/** Apaga o progresso do servidor. O "apagar meu progresso" do perfil. */
export async function clearProgress(env, accountId) {
  await env.DB.prepare('DELETE FROM progress WHERE account_id = ?').bind(accountId).run();
}

/* ── apagar a conta ───────────────────────────────────────────────────────
 * O direito de exclusão da LGPD (art. 18, VI), atendido pelo próprio titular
 * e não por um pedido de suporte.
 *
 * ── por que a linha da conta não é DELETADA ──────────────────────────────
 * Ela é ESVAZIADA. A diferença é o que fica em pé depois.
 *
 * `orders` referencia `accounts(id)`, e a lei brasileira não deixa apagar o
 * registro de uma venda junto com o cliente: a nota, o valor, a data e o
 * estorno são obrigação fiscal e contábil, e sobrevivem ao pedido de
 * exclusão - a própria LGPD prevê isso (art. 16, I). Apagar a linha da conta
 * deixaria todo pedido dela apontando para um id que não existe mais, e o
 * livro caixa viraria um monte de órfãos que ninguém consegue conferir.
 *
 * Então some tudo o que é PESSOA - e-mail, nome, senha - e fica um número
 * opaco, ao qual os pedidos continuam presos. O que resta não identifica
 * ninguém, que é a definição de dado anonimizado: fora do alcance da lei
 * justamente porque não aponta mais para uma pessoa.
 *
 * ── o e-mail some de verdade, e libera o cadastro ────────────────────────
 * O `UNIQUE` em `email` impede duas contas com o mesmo endereço, então um
 * e-mail deixado na linha esvaziada trancaria para sempre a pessoa que um dia
 * quisesse voltar. Ele vira `apagada+<id>@invalido.local` - único por
 * construção, num domínio reservado que não existe e para onde nada é
 * enviado. Voltar depois é criar uma conta nova, do zero, com o mesmo
 * endereço.
 *
 * ── e a senha ────────────────────────────────────────────────────────────
 * O hash é substituído por lixo aleatório em vez de ficar vazio. Um campo
 * vazio é um valor que alguma verificação futura pode achar que casa com
 * alguma coisa; 32 bytes de aleatório não casam com senha nenhuma, nem com a
 * antiga. E `session_version` sobe, o que derruba na hora todo cookie já
 * emitido - inclusive o da aba ao lado, e o do celular que ficou logado.
 *
 * `payment_events` não entra na lista porque já nasce sem dado pessoal: o
 * `enxuto()` acima guarda status e valor, e joga fora o e-mail, o CPF e o
 * nome do titular que a Mercado Pago manda.
 */
export async function deleteAccount(env, accountId) {
  const id = Number(accountId);
  const conta = await env.DB.prepare('SELECT email FROM accounts WHERE id = ?').bind(id).first();
  if (!conta) return { ok: false };

  const hex = n => [...crypto.getRandomValues(new Uint8Array(n))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  /* Hash E sal aleatórios, e não campos vazios: a linha esvaziada continua
     tendo a FORMA de uma linha normal, então nenhum caminho de verificação
     precisa aprender um caso especial para ela. */
  const hashMorto = hex(32), salMorto = hex(16);

  /* Numa transação só: metade apagada é pior do que nada apagado - seria uma
     conta sem acesso, sem progresso e ainda com o e-mail da pessoa dentro. */
  await env.DB.batch([
    env.DB.prepare('DELETE FROM progress      WHERE account_id = ?').bind(id),
    env.DB.prepare('DELETE FROM entitlements  WHERE account_id = ?').bind(id),
    env.DB.prepare('DELETE FROM password_resets WHERE account_id = ?').bind(id),
    /* Convites são chaveados por E-MAIL, e não por conta: um presente
       pendente guarda o endereço de quem ia recebê-lo. */
    env.DB.prepare('DELETE FROM invites       WHERE email = ?').bind(conta.email),
    /* O nome completo e o CPF (06/11/2026) ficam só nas vendas que
       aconteceram, porque a nota fiscal é obrigação fiscal (LGPD, art. 16,
       I). Num pedido que nunca foi pago não há nota nenhuma: eles saem. */
    env.DB.prepare(
      `UPDATE orders SET nome_completo = NULL, cpf = NULL
        WHERE account_id = ? AND status NOT IN ('paid', 'refunded')`
    ).bind(id),
    env.DB.prepare(
      `UPDATE accounts
          SET email = ?, name = '', pass_hash = ?, pass_salt = ?,
              session_version = session_version + 1
        WHERE id = ?`
    ).bind(`apagada+${id}@invalido.local`, hashMorto, salMorto, id)
  ]);

  /* As confirmações de e-mail guardam o endereço, então vão junto - mas fora
     da transação acima, porque a tabela pode ainda não existir (ela entrou
     depois, e a publicação não aplica o schema.sql). Dentro do batch, a
     ausência dela derrubaria a exclusão inteira; aqui, tabela ausente é só
     nada para apagar. */
  try {
    await env.DB.prepare('DELETE FROM email_verifications WHERE account_id = ?').bind(id).run();
  } catch { /* tabela ausente */ }
  /* A lista de novidades guarda a vontade de receber e-mail: some junto. */
  try {
    await env.DB.prepare('DELETE FROM novidades WHERE account_id = ?').bind(id).run();
  } catch { /* tabela ausente */ }
  /* O pedido do lembrete para estudar também é vontade de receber e-mail. */
  try {
    await env.DB.prepare('DELETE FROM lembretes_estudo WHERE account_id = ?').bind(id).run();
  } catch { /* tabela ausente */ }
  /* O código pendente do segundo fator do administrador. */
  try {
    await env.DB.prepare('DELETE FROM admin_codigos WHERE account_id = ?').bind(id).run();
  } catch { /* tabela ausente */ }
  /* O exame do A1 e o certificado (com o nome da pessoa) saem com ela: a
     página pública de verificação deixa de achar o código. */
  try {
    await env.DB.prepare('DELETE FROM certificados WHERE account_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM provas_a1 WHERE account_id = ?').bind(id).run();
  } catch { /* tabela ausente */ }
  /* O registro do aceite dos Termos também. */
  try {
    await env.DB.prepare('DELETE FROM aceites WHERE account_id = ?').bind(id).run();
  } catch { /* tabela ausente */ }
  /* O depoimento é dado da pessoa e sai com ela - publicado ou não. */
  try {
    await env.DB.prepare('DELETE FROM depoimentos WHERE account_id = ?').bind(id).run();
  } catch { /* tabela ausente */ }

  /* A marca invisível do conteúdo, os aparelhos conectados e os avisos de
     fim de acesso só existem por causa da conta: somem com ela. */
  for (const t of ['marcas', 'aparelhos', 'avisos_vencimento']) {
    try {
      await env.DB.prepare(`DELETE FROM ${t} WHERE account_id = ?`).bind(id).run();
    } catch { /* tabela ausente */ }
  }

  /* A trilha fica, e é justamente ela que responde "por que este pedido não
     tem cliente?" daqui a um ano. Não guarda o e-mail: guarda que houve. */
  await log(env, id, 'conta-apagada');
  return { ok: true };
}

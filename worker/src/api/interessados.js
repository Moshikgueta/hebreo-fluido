/* A lista de interessados (23/10/2026, plano de marketing, decisão 1).
 * ─────────────────────────────────────────────────────────────────────────
 * Quem ainda não comprou e quer continuar em contato: as próximas letras por
 * e-mail (no fim do teste grátis) ou o aviso de quando um produto "Em breve"
 * abrir. Até aqui, quem não comprava na hora sumia (marketing/01-diagnostico.md).
 *
 *   POST /api/interessados {email, interesse, origem?, consentiu}
 *   POST /api/interessados/confirmar {t}
 *   POST /api/interessados/sair {t}
 *
 * As regras, que são o produto:
 *
 *   · SÓ COM CONSENTIMENTO. A caixa começa desmarcada e o servidor exige
 *     `consentiu: true`. Nenhum outro caminho põe alguém na lista.
 *   · SÓ DEPOIS DE CONFIRMAR. Qualquer um pode digitar o endereço de outra
 *     pessoa, então a inscrição só vale com o clique no link do e-mail. Sem
 *     ele, nada mais é mandado, e a linha some em 7 dias (sequencia.js).
 *     O clique abre /confirmar-lista, e é a PÁGINA que manda o POST: cliente
 *     de e-mail abre links sozinho para gerar prévia, e um GET que
 *     confirmasse inscreveria quem não pediu.
 *   · SAIR É FÁCIL. Todo e-mail da lista traz o link de /sair-da-lista (o
 *     mesmo da lista de novidades, com um `i` na frente do token), sem login
 *     e sem freio: sair nunca esbarra num "tente mais tarde". Sair apaga a
 *     linha; quem quiser voltar se inscreve e confirma de novo.
 *   · NADA DE ORÁCULO. A resposta é a mesma para endereço novo, já inscrito
 *     ou já confirmado: a tela não diz quem está na lista.
 *   · A COTA DO D1. Rota pública que escreve: 10 por hora por endereço de IP
 *     (conferido antes de tudo) e 3 por dia por endereço de e-mail (sha256).
 *
 * Os tokens são o id e uma assinatura HMAC com prefixo de domínio próprio
 * ('interessados:confirmar:' e 'interessados:sair:'): um não serve pelo outro,
 * e nenhum serve para a lista de novidades. Não expiram.
 */

import { desligado, fail, json, readJson } from '../lib/http.js';
import { hmacB64, sha256hex, timingSafeEqual } from '../lib/crypto.js';
import { normalizeEmail, throttled } from '../lib/db.js';
import { mailReady, sendMail } from '../lib/mail.js';
import { mensagens } from '../lib/mensagens.js';
import { idiomaDoWorker } from '../lib/idioma.js';
import { fonteValida } from '../lib/origem.js';
import { emailOk, ip } from './auth.js';

export const INTERESSES = ['curso', 'israel', 'raizes', 'a1'];
const DIA = 86_400_000;
/** Em quantos dias depois da confirmação sai cada e-mail da sequência das letras. */
export const DIAS_DA_SEQUENCIA = [2, 4, 7, 10, 14];
/** `passo` de quem terminou a sequência (ou saiu dela por já ter comprado). */
export const SEQUENCIA_FEITA = DIAS_DA_SEQUENCIA.length + 1;

const assinar = (env, uso, id) => hmacB64(env.SESSION_SECRET, `interessados:${uso}:${id}`);

export async function token(env, uso, id) {
  return `i${id}.${await assinar(env, uso, id)}`;
}

const site = env => String(env.SITE_ORIGIN || '').replace(/\/+$/, '');
export const linkDeConfirmacao = async (env, id) =>
  `${site(env)}/confirmar-lista/?t=${encodeURIComponent(await token(env, 'confirmar', id))}`;
export const linkDeSaida = async (env, id) =>
  `${site(env)}/sair-da-lista/?t=${encodeURIComponent(await token(env, 'sair', id))}`;

/** O id de um token válido para `uso`, ou null. */
async function lerToken(env, uso, t) {
  const m = /^i(\d{1,12})\.([A-Za-z0-9_-]{20,})$/.exec(typeof t === 'string' ? t : '');
  if (!m || !env.SESSION_SECRET) return null;
  const id = Number(m[1]);
  return timingSafeEqual(m[2], await assinar(env, uso, id)) ? id : null;
}

const lista = s => String(s || '').split(',').filter(x => INTERESSES.includes(x));
const juntar = (atual, novo) => [...new Set([...lista(atual), novo])].join(',');

/**
 * Põe (ou reabre) a inscrição e diz se ainda falta confirmar. Quem tinha
 * saído volta como novo: precisa confirmar de novo. Não manda e-mail.
 * Devolve { id, confirmado } ou null se o banco falhar.
 */
export async function inscrever(env, { email, interesse, origem }, at = Date.now()) {
  const fonte = fonteValida(origem) ? origem : null;
  try {
    const atual = await env.DB.prepare('SELECT * FROM interessados WHERE email = ?').bind(email).first();
    if (!atual) {
      const r = await env.DB.prepare(
        'INSERT INTO interessados (email, interesses, origem, criado_em) VALUES (?, ?, ?, ?)'
      ).bind(email, interesse, fonte, at).run();
      return { id: Number(r.meta.last_row_id), confirmado: false };
    }
    if (atual.saiu_em) {
      await env.DB.prepare(
        `UPDATE interessados SET interesses = ?, origem = COALESCE(?, origem), criado_em = ?,
                confirmado_em = NULL, saiu_em = NULL, passo = 0, proximo_em = NULL WHERE id = ?`
      ).bind(interesse, fonte, at, atual.id).run();
      return { id: atual.id, confirmado: false };
    }
    const interesses = juntar(atual.interesses, interesse);
    await env.DB.prepare('UPDATE interessados SET interesses = ? WHERE id = ?').bind(interesses, atual.id).run();
    if (atual.confirmado_em) await entrarNaSequencia(env, atual.id, interesses, at);
    return { id: atual.id, confirmado: !!atual.confirmado_em };
  } catch (e) {
    console.error('interessados', e && e.stack || e);
    return null;
  }
}

/** Quem confirmou e pediu as letras entra na sequência, se ainda não entrou. */
async function entrarNaSequencia(env, id, interesses, at) {
  if (!lista(interesses).includes('curso')) return;
  await env.DB.prepare(
    'UPDATE interessados SET passo = 1, proximo_em = ? WHERE id = ? AND passo = 0'
  ).bind(at + DIAS_DA_SEQUENCIA[0] * DIA, id).run();
}

/** POST /api/interessados - sempre {ok:true} quando o pedido é válido. */
export async function entrar({ request, env }) {
  if (await throttled(env, `interessados-ip:${ip(request)}`, 10, 3_600_000)) return fail('rate-limited', 429);
  const b = await readJson(request, 1024);
  const email = normalizeEmail(b && b.email);
  if (!emailOk(email)) return fail('email-invalido');
  if (!b || b.consentiu !== true) return fail('consentimento');
  const interesse = String(b.interesse || '');
  if (!INTERESSES.includes(interesse)) return fail('bad-request');
  if (!mailReady(env)) return desligado('sem-email');
  if (await throttled(env, `interessados:${await sha256hex(email)}`, 3, DIA)) return json({ ok: true });

  const r = await inscrever(env, { email, interesse, origem: b.origem });
  if (!r) return fail('erro', 503);
  if (!r.confirmado) {
    const m = mensagens(idiomaDoWorker(env)).confirmacaoDaLista({
      interesses: [interesse], confirmar: await linkDeConfirmacao(env, r.id), suporte: env.SUPPORT_EMAIL || ''
    });
    const enviado = await sendMail(env, { to: email, ...m });
    if (!enviado.ok) console.error('interessados', enviado.motivo, enviado.status || '', enviado.detalhe || '');
  }
  return json({ ok: true });
}

/** POST /api/interessados/confirmar {t} - o botão da página do link. */
export async function confirmar({ request, env }) {
  const b = await readJson(request, 1024);
  const id = await lerToken(env, 'confirmar', b && b.t);
  if (!id) return fail('link-invalido');
  const at = Date.now();
  const linha = await env.DB.prepare('SELECT interesses, saiu_em FROM interessados WHERE id = ?').bind(id).first();
  if (!linha || linha.saiu_em) return fail('link-invalido');
  await env.DB.prepare('UPDATE interessados SET confirmado_em = COALESCE(confirmado_em, ?) WHERE id = ?').bind(at, id).run();
  await entrarNaSequencia(env, id, linha.interesses, at);
  return json({ ok: true, interesses: lista(linha.interesses) });
}

/** POST /api/interessados/sair {t} - sem login e sem freio. */
export async function sair({ request, env }) {
  const b = await readJson(request, 1024);
  const id = await lerToken(env, 'sair', b && b.t);
  if (!id) return fail('link-invalido');
  /* Sair APAGA a inscrição: o consentimento acabou, e o endereço não tem
     mais para que ficar. Fica só um contador do dia (`l|saiu`), sem e-mail. */
  const r = await env.DB.prepare('DELETE FROM interessados WHERE id = ?').bind(id).run();
  if (Number(r && r.meta && r.meta.changes) > 0) {
    try {
      await env.DB.prepare(
        `INSERT INTO estatisticas (dia, chave, n) VALUES (?1, 'l|saiu', 1)
         ON CONFLICT(dia, chave) DO UPDATE SET n = n + 1`
      ).bind(new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)).run();
    } catch { /* contador perdido não impede a saída */ }
  }
  return json({ ok: true });
}

/** Os números para o painel: só contagens. */
export async function resumo(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT interesses, origem,
              (confirmado_em IS NOT NULL AND saiu_em IS NULL) AS ativo,
              (confirmado_em IS NULL AND saiu_em IS NULL) AS aguardando,
              (saiu_em IS NOT NULL) AS saiu
         FROM interessados`
    ).all();
    const r = { ativos: 0, aguardando: 0, sairam: 0, porInteresse: {}, porOrigem: {} };
    try {
      const s = await env.DB.prepare("SELECT SUM(n) AS n FROM estatisticas WHERE chave = 'l|saiu'").first();
      r.sairam = Number(s && s.n) || 0;
    } catch { /* sem contador ainda */ }
    for (const l of results || []) {
      if (l.saiu) continue;
      if (l.aguardando) { r.aguardando++; continue; }
      r.ativos++;
      for (const i of lista(l.interesses)) r.porInteresse[i] = (r.porInteresse[i] || 0) + 1;
      const o = l.origem || 'direto';
      r.porOrigem[o] = (r.porOrigem[o] || 0) + 1;
    }
    return r;
  } catch {
    return null;
  }
}

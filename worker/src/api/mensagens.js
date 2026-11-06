/* Fale comigo: dúvidas e comentários dos alunos (06/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 *   · QUEM ESCREVE: só conta com o curso liberado (como o depoimento).
 *   · O QUE FICA: o tipo (dúvida ou comentário), o texto, de onde veio (o
 *     módulo, quando o aluno escreve no fim de um) e quando. O dono recebe um
 *     e-mail na hora, com resposta direta para o aluno (reply_to), e lê todas
 *     em /admin/mensagens, onde marca como respondida.
 *   · FREIO: oito por hora por conta. Ninguém escreve mais do que isso para
 *     tirar dúvida, e um laço não enche a caixa do dono.
 *   · APAGAR A CONTA apaga as mensagens (lib/db.js, deleteAccount), e "Meus
 *     dados" as leva (api/meus-dados.js).
 */

import { fail, json, notSignedIn, readJson } from '../lib/http.js';
import { hasEntitlement, log, throttled } from '../lib/db.js';
import { exigirAdmin } from '../lib/admin.js';
import { requireAccount } from './auth.js';
import { mailReady, mensagemDeAlerta, sendMail } from '../lib/mail.js';

const COURSE = 'alfabetizacao';
export const TEXTO_MIN = 5;
export const TEXTO_MAX = 2000;
const TIPOS = new Set(['duvida', 'comentario']);
const CONTEXTO = /^modulo-[1-9]$/;

const paragrafos = s => String(s ?? '').replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, ' ')
  .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n').trim();

/** O que o aluno mandou, conferido. `{erro}` com o código se não serve. */
export function validar(b) {
  if (!b || typeof b !== 'object') return { erro: 'bad-request' };
  const tipo = String(b.tipo || '');
  if (!TIPOS.has(tipo)) return { erro: 'bad-request' };
  const texto = paragrafos(b.texto);
  if ([...texto].length < TEXTO_MIN) return { erro: 'texto-curto' };
  if ([...texto].length > TEXTO_MAX) return { erro: 'texto-longo' };
  const contexto = typeof b.contexto === 'string' && CONTEXTO.test(b.contexto) ? b.contexto : null;
  return { ok: { tipo, texto, contexto } };
}

async function aluno(request, env) {
  const account = await requireAccount(request, env);
  if (!account) return { erro: notSignedIn() };
  if (!await hasEntitlement(env, account.id, COURSE)) return { erro: fail('no-access', 403) };
  return { account };
}

const deLinha = r => ({
  id: r.id, tipo: r.tipo, texto: r.texto, contexto: r.contexto || null,
  enviadaEm: r.criado_em, respondidaEm: r.respondida_em || null
});

/** GET /api/mensagens - as do próprio aluno, as mais novas primeiro. */
export async function minhas({ request, env }) {
  const { account, erro } = await aluno(request, env);
  if (erro) return erro;
  let results = [];
  try {
    ({ results } = await env.DB.prepare(
      'SELECT * FROM mensagens WHERE account_id = ? ORDER BY criado_em DESC LIMIT 50'
    ).bind(account.id).all());
  } catch { /* tabela ausente */ }
  return json({ mensagens: (results || []).map(deLinha) });
}

/** POST /api/mensagens {tipo, texto, contexto?} - manda uma dúvida ou um comentário. */
export async function enviar({ request, env, ctx }) {
  const { account, erro } = await aluno(request, env);
  if (erro) return erro;
  if (await throttled(env, `mensagem:${account.id}`, 8, 3_600_000)) return fail('rate-limited', 429);
  const v = validar(await readJson(request, 16 * 1024));
  if (v.erro) return fail(v.erro);
  const m = v.ok, agora = Date.now();
  await env.DB.prepare(
    'INSERT INTO mensagens (account_id, tipo, texto, contexto, criado_em) VALUES (?, ?, ?, ?, ?)'
  ).bind(account.id, m.tipo, m.texto, m.contexto, agora).run();
  await log(env, account.id, 'mensagem-enviada', m.tipo);

  /* O aviso ao dono, com a resposta indo direto para o aluno. Nunca falha a
     rota: a mensagem já está guardada e aparece no painel. */
  const dono = String(env.SUPPORT_EMAIL || '').trim()
    || String(env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)[0] || '';
  if (dono && mailReady(env)) {
    const msg = mensagemDeAlerta({
      assunto: `${m.tipo === 'duvida' ? 'dúvida' : 'comentário'} de ${account.name || account.email}`,
      linhas: [
        `${account.name || 'Um aluno'} (${account.email}) mandou ${m.tipo === 'duvida' ? 'uma dúvida' : 'um comentário'}${m.contexto ? ` no fim do ${m.contexto.replace('-', ' ')}` : ''}:`,
        '',
        ...m.texto.split('\n'),
        '',
        'Responda este e-mail para responder direto ao aluno. Todas as mensagens ficam em /admin/mensagens.'
      ]
    });
    const entregar = async () => {
      const e = await sendMail(env, { to: dono, ...msg, replyTo: account.email });
      if (!e || !e.ok) console.error('mensagem', 'aviso ao dono', e && e.motivo, e && e.detalhe || '');
    };
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(entregar());
    else await entregar();
  }
  return json({ ok: true });
}

/** GET /api/admin/mensagens - todas, as não respondidas primeiro. */
export async function listar({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  let results = [];
  try {
    ({ results } = await env.DB.prepare(
      `SELECT m.*, a.email, a.name FROM mensagens m JOIN accounts a ON a.id = m.account_id
        ORDER BY CASE WHEN m.respondida_em IS NULL THEN 0 ELSE 1 END, m.criado_em DESC LIMIT 500`
    ).all());
  } catch { /* tabela ausente */ }
  return json({ mensagens: (results || []).map(r => ({ ...deLinha(r), email: r.email, nome: r.name })) });
}

/** PUT /api/admin/mensagens {id, respondida} - marca (ou desmarca) como respondida. */
export async function marcar({ request, env }) {
  const { account, erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const b = await readJson(request);
  const id = Number(b && b.id);
  if (!Number.isInteger(id) || id <= 0 || typeof (b && b.respondida) !== 'boolean') return fail('bad-request');
  const r = await env.DB.prepare('UPDATE mensagens SET respondida_em = ? WHERE id = ?')
    .bind(b.respondida ? Date.now() : null, id).run();
  if (!r || !r.meta || !r.meta.changes) return fail('not-found', 404);
  await log(env, account.id, 'mensagem-marcada', `${id} ${b.respondida ? 'respondida' : 'aberta'}`);
  return json({ ok: true });
}

/** As que chegaram desde `desde` e ainda não foram respondidas (alertas). */
export async function abertasDesde(env, desde) {
  try {
    const r = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM mensagens WHERE respondida_em IS NULL AND criado_em >= ?'
    ).bind(desde).first();
    return (r && r.n) || 0;
  } catch { return 0; }
}

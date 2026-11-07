/* O código de seis dígitos do administrador (30/09/2026). Ver a nota do
 * segundo fator em lib/admin.js.
 *
 *   POST /api/admin/codigo            manda o código ao e-mail da conta
 *   POST /api/admin/codigo/conferir   {codigo} → cookie `__Host-hf_admin`
 *
 * O código vale 10 minutos e aceita 5 tentativas; é guardado só como hash,
 * e um código novo substitui o anterior. Pedir código tem freio (5 por hora),
 * e cada tentativa, certa ou errada, vai para a trilha.
 */

import { desligado, fail, json, notSignedIn, readJson } from '../lib/http.js';
import { log, throttled } from '../lib/db.js';
import { sha256hex, timingSafeEqual } from '../lib/crypto.js';
import { cookieDeAdmin, isAdmin, ADMIN_HORAS } from '../lib/admin.js';
import { readSession } from '../lib/session.js';
import { mailReady, sendMail } from '../lib/mail.js';
import { requireAccount } from './auth.js';

const VALIDADE_MS = 10 * 60_000;
const TENTATIVAS = 5;

const hashDo = (accountId, codigo) => sha256hex(`admin-codigo:${accountId}:${codigo}`);

function seisDigitos() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

async function administrador(request, env) {
  const account = await requireAccount(request, env);
  if (!account) return { erro: notSignedIn() };
  if (!isAdmin(account, env)) return { erro: fail('not-admin', 403) };
  return { account };
}

export async function enviar({ request, env }) {
  const { account, erro } = await administrador(request, env);
  if (erro) return erro;
  if (!mailReady(env)) return desligado('sem-email');
  if (await throttled(env, `admin-codigo:${account.id}`, 5, 3_600_000)) return fail('rate-limited-hora', 429);
  const codigo = seisDigitos();
  await env.DB.prepare(
    `INSERT INTO admin_codigos (account_id, hash, expira, tentativas) VALUES (?1, ?2, ?3, 0)
     ON CONFLICT(account_id) DO UPDATE SET hash = ?2, expira = ?3, tentativas = 0`
  ).bind(account.id, await hashDo(account.id, codigo), Date.now() + VALIDADE_MS).run();
  const r = await sendMail(env, {
    to: account.email,
    subject: 'Seu código de acesso ao painel do Hebraico Fluente',
    text: [
      `Seu código: ${codigo}`,
      '',
      `Ele vale 10 minutos e abre os painéis de administrador por ${ADMIN_HORAS} horas, só no aparelho em que você o digitar.`,
      '',
      'Se não foi você que pediu, alguém tem a sua senha: troque-a agora em Sua conta.'
    ].join('\n')
  });
  if (!r || !r.ok) {
    await log(env, account.id, 'admin-codigo-falhou', r && r.motivo || '');
    return fail('sem-email', 503);
  }
  await log(env, account.id, 'admin-codigo-enviado', '');
  return json({ ok: true, validadeMinutos: VALIDADE_MS / 60_000 });
}

export async function conferir({ request, env }) {
  const { account, erro } = await administrador(request, env);
  if (erro) return erro;
  const b = await readJson(request);
  const codigo = String(b && b.codigo || '').replace(/\D/g, '');
  if (codigo.length !== 6) return fail('codigo-invalido');
  /* A tentativa é GASTA antes de comparar, num comando só (auditoria de
     01/10/2026, SEC-A-002). Antes era ler `tentativas`, comparar e só então
     somar um na falha: quarenta palpites em paralelo liam "zero de cinco"
     quarenta vezes e eram todos avaliados. Agora o UPDATE com a condição é a
     corrida inteira: só as cinco primeiras recebem a linha de volta. O acerto
     apaga a linha logo abaixo, então gastar a tentativa certa não custa nada. */
  const row = await env.DB.prepare(
    `UPDATE admin_codigos SET tentativas = tentativas + 1
     WHERE account_id = ? AND expira >= ? AND tentativas < ?
     RETURNING hash`
  ).bind(account.id, Date.now(), TENTATIVAS).first();
  if (!row) return fail('codigo-vencido', 400);
  if (!timingSafeEqual(row.hash, await hashDo(account.id, codigo))) {
    await log(env, account.id, 'admin-codigo-errado', '');
    return fail('codigo-invalido');
  }
  await env.DB.prepare('DELETE FROM admin_codigos WHERE account_id = ?').bind(account.id).run();
  await log(env, account.id, 'admin-codigo-ok', '');
  const sess = await readSession(request, env);
  return json({ ok: true, horas: ADMIN_HORAS }, 200, { 'Set-Cookie': await cookieDeAdmin(env, sess) });
}

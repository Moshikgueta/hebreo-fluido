/* A segunda letra por e-mail (03/10/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Quem termina o teste grátis da capa e ainda não quer comprar pode pedir a
 * segunda letra do curso (o Mem) por e-mail. É UM e-mail, com a letra, e só.
 *
 *   POST /api/segunda-letra {email}
 *
 * O que NÃO acontece: o endereço não entra em lista nenhuma e não é gravado,
 * a menos que a pessoa marque a caixa das próximas letras (23/10/2026); aí
 * ele entra na lista de interessados, e só vale depois de confirmado.
 * O que fica, por no máximo 48 horas, é o freio: o sha256 do endereço (para
 * não mandar duas vezes no mesmo dia, nem deixar alguém encher a caixa de
 * outra pessoa) e o IP (no máximo 5 pedidos por hora), como no cadastro.
 *
 * Como qualquer pessoa pode digitar o endereço de outra, o e-mail diz que foi
 * pedido no site e que, se não foi ela, basta ignorar: não vem mais nada.
 *
 * A resposta não conta se o endereço já tinha pedido hoje: devolve ok do mesmo
 * jeito, para a tela não servir de oráculo de quem pediu o quê.
 */

import { desligado, fail, json, readJson } from '../lib/http.js';
import { normalizeEmail, throttled } from '../lib/db.js';
import { sha256hex } from '../lib/crypto.js';
import { mailReady, sendMail } from '../lib/mail.js';
import { mensagens } from '../lib/mensagens.js';
import { idiomaDoWorker } from '../lib/idioma.js';
import { emailOk, ip } from './auth.js';
import { contarEtapa } from './estatisticas.js';
import { inscrever, linkDeConfirmacao } from './interessados.js';

const DIA_MS = 86_400_000;

export async function pedir({ request, env }) {
  const b = await readJson(request, 1024);
  const email = normalizeEmail(b && b.email);
  if (!emailOk(email)) return fail('email-invalido');
  if (!mailReady(env)) return desligado('sem-email');
  if (await throttled(env, `segunda-letra-ip:${ip(request)}`, 5, 3_600_000)) return fail('rate-limited', 429);
  if (await throttled(env, `segunda-letra:${await sha256hex(email)}`, 1, DIA_MS)) return json({ ok: true });

  const site = String(env.SITE_ORIGIN || new URL(request.url).origin).replace(/\/+$/, '');
  /* A caixa "quero receber as próximas letras" (23/10/2026, começa
     desmarcada): com ela, o endereço entra na lista de interessados e o
     e-mail do Mem leva o link de confirmação. Sem ela, nada muda: o
     endereço não é gravado. Ver api/interessados.js. */
  let confirmar = null;
  if (b.lista === true) {
    const r = await inscrever(env, { email, interesse: 'curso', origem: b.origem });
    if (r && !r.confirmado) confirmar = await linkDeConfirmacao(env, r.id);
  }
  /* No idioma do site em que a pessoa fez o teste (lib/idioma.js). */
  const m = mensagens(idiomaDoWorker(env)).segundaLetra({ site, suporte: env.SUPPORT_EMAIL || '', confirmar });
  const r = await sendMail(env, { to: email, ...m });
  if (!r.ok) {
    console.error('segunda-letra', r.motivo, r.status || '', r.detalhe || '');
    return fail('envio', 502);
  }
  await contarEtapa(env, 'segunda-letra');
  return json({ ok: true });
}

/* A sequência das letras e a faxina da lista de interessados (23/10/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Quem confirmou que quer as próximas letras (api/interessados.js) recebe
 * cinco e-mails, em DIAS_DA_SEQUENCIA depois da confirmação: o Tav, por que
 * uma letra de cada vez, a pergunta da Bíblia, a lição por dentro e, por
 * último, o convite com o preço do catálogo. Cada um uma vez: `passo` só
 * anda depois do envio aceito, e um envio que falha tenta no dia seguinte.
 *
 * Quem já tem o curso sai da sequência sem receber o convite (o endereço da
 * inscrição tem conta com o curso valendo). Quem saiu da lista não recebe
 * nada. Todo e-mail leva o link de saída no corpo e no List-Unsubscribe.
 *
 * A faxina: inscrição não confirmada em 7 dias é apagada.
 *
 * Roda na varredura, uma vez por dia (trava `sequencia`). Nunca lança.
 */

import { activeEntitlements, findAccountByEmail, pegarTrava } from './lib/db.js';
import { getCourse } from './lib/catalog.js';
import { mailReady, sendMail } from './lib/mail.js';
import { mensagens } from './lib/mensagens.js';
import { idiomaDoWorker } from './lib/idioma.js';
import { DIAS_DA_SEQUENCIA, SEQUENCIA_FEITA, linkDeSaida } from './api/interessados.js';
import { diasDeFora } from './lib/desistencia.js';
import empresa from '../../data/empresa.json';

const DIA = 86_400_000;
const CURSO = 'alfabetizacao';

/** Apaga as inscrições não confirmadas há mais de 7 dias. */
export async function faxinaDaLista(env, at = Date.now()) {
  try {
    await env.DB.prepare('DELETE FROM interessados WHERE confirmado_em IS NULL AND saiu_em IS NULL AND criado_em < ?')
      .bind(at - 7 * DIA).run();
  } catch { /* tabela ainda não criada */ }
}

async function jaTemOCurso(env, email, at) {
  const conta = await findAccountByEmail(env, email);
  if (!conta) return false;
  return (await activeEntitlements(env, conta.id, at)).some(e => e.courseSlug === CURSO || e.courseSlug === 'alfabetizacao-e-israel');
}

export async function runSequencia(env, at = Date.now()) {
  await faxinaDaLista(env, at);
  if (!mailReady(env)) return { enviados: 0 };
  if (!await pegarTrava(env, 'sequencia', 23 * 3_600_000, at)) return { enviados: 0, pulada: true };
  let linhas = [];
  try {
    ({ results: linhas } = await env.DB.prepare(
      `SELECT id, email, passo, confirmado_em FROM interessados
        WHERE confirmado_em IS NOT NULL AND saiu_em IS NULL
          AND passo BETWEEN 1 AND ? AND proximo_em <= ?
        ORDER BY proximo_em ASC LIMIT 50`
    ).bind(DIAS_DA_SEQUENCIA.length, at).all());
  } catch { return { enviados: 0 }; }

  const site = String(env.SITE_ORIGIN || '').replace(/\/+$/, '');
  const c = getCourse(CURSO);
  /* A lista não tem conta: o idioma é o do Worker, que neste repositório
     tem banco próprio (lib/idioma.js). No inglês, o preço é o price.usd e o
     prazo de desistência é o do Paddle. */
  const idioma = idiomaDoWorker(env);
  const preco = c && c.price ? {
    usd: idioma !== 'pt' ? (c.price.usd || null) : null,
    brl: c.price.brl, listBrl: c.price.listBrl || null, pixPct: c.price.pixDiscountPct || 0,
    parcelas: c.price.installments || 12, meses: c.accessMonths || 12,
    desistir: idioma !== 'pt' ? diasDeFora(empresa) : (Number(empresa.politicas && empresa.politicas.arrependimentoDias) || 7)
  } : null;

  let enviados = 0;
  for (const l of linhas || []) {
    try {
      if (await jaTemOCurso(env, l.email, at)) {
        await env.DB.prepare('UPDATE interessados SET passo = ?, proximo_em = NULL WHERE id = ?').bind(SEQUENCIA_FEITA, l.id).run();
        continue;
      }
      const sair = await linkDeSaida(env, l.id);
      const r = await sendMail(env, {
        to: l.email,
        ...mensagens(idioma).sequencia({
          passo: l.passo, site, sair, preco,
          suporte: empresa.contato?.emailSuporte || '', marca: empresa.nomeFantasia || 'Hebraico Fluente'
        }),
        headers: { 'List-Unsubscribe': `<${sair}>` }
      });
      if (!r || !r.ok) continue;
      enviados++;
      const proximo = l.passo + 1;
      const fim = proximo > DIAS_DA_SEQUENCIA.length;
      await env.DB.prepare('UPDATE interessados SET passo = ?, proximo_em = ? WHERE id = ?').bind(
        fim ? SEQUENCIA_FEITA : proximo,
        fim ? null : Number(l.confirmado_em) + DIAS_DA_SEQUENCIA[proximo - 1] * DIA,
        l.id
      ).run();
    } catch (e) {
      console.error('sequencia', e && e.stack || e);
    }
  }
  return { enviados };
}

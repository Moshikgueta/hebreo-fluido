/* O lembrete para estudar, na varredura (28/10/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Para quem pediu em Sua conta (api/lembrete.js), a partir das 19h de
 * Brasília, uma vez por dia e só se a pessoa ainda não estudou hoje:
 *
 *   · "estudou" = algum dia do progresso (`days[d].units`) com unidade de
 *     estudo. O dia é o que o aparelho gravou (data local), comparado com o
 *     dia de Brasília;
 *   · TRÊS lembretes seguidos sem estudo e eles param, até a pessoa estudar
 *     de novo (`seguidos`). Lembrete que vira cobrança diária não ajuda
 *     ninguém, e insistir depois de um "não" calado é o que não fazemos;
 *   · só para conta com o curso valendo; nunca para `.invalid` e `.local`.
 *
 * Cada conta é atendida uma vez por dia (`ultimo_dia`). A reserva é o
 * próprio UPDATE condicional: duas varreduras ao mesmo tempo não mandam dois
 * e-mails. Envio recusado devolve a reserva, e a próxima rodada tenta.
 *
 * Nunca lança: um lembrete que falha não pode derrubar a varredura.
 */

import { hasEntitlement, normalizeEmail } from './lib/db.js';
import { mailReady, sendMail } from './lib/mail.js';
import { mensagens } from './lib/mensagens.js';
import { idiomaDaConta, marcaDoEmail, origemDoIdioma } from './lib/idioma.js';
import { lembreteLigado, linkDeSaida } from './api/lembrete.js';
import empresa from '../../data/empresa.json';

export const HORA_DO_LEMBRETE = 19;
export const LEMBRETES_SEGUIDOS = 3;
const CURSO = 'alfabetizacao';
const BRASILIA = 3 * 3_600_000;

/** O dia (YYYY-MM-DD) e a hora em Brasília. Sem horário de verão desde 2019. */
export function agoraEmBrasilia(at = Date.now()) {
  const d = new Date(at - BRASILIA);
  return { dia: d.toISOString().slice(0, 10), hora: d.getUTCHours() };
}

/**
 * O que fazer com uma conta hoje. Pura, para o teste.
 *   `estudouEm`  o último dia com estudo no progresso (ou null);
 *   `ultimoDia`  o último dia em que a varredura cuidou da conta (ou null);
 *   `seguidos`   lembretes desde o último estudo.
 * Devolve se manda e com que contagem a linha fica.
 */
export function decidir({ hoje, estudouEm, ultimoDia, seguidos }) {
  const voltou = !!estudouEm && (!ultimoDia || estudouEm >= ultimoDia);
  const base = voltou ? 0 : Number(seguidos) || 0;
  if (estudouEm && estudouEm >= hoje) return { manda: false, seguidos: 0 };
  if (base >= LEMBRETES_SEGUIDOS) return { manda: false, seguidos: base };
  return { manda: true, seguidos: base + 1 };
}

async function marcar(env, id, hoje, seguidos, antes) {
  /* Condicional: só quem ainda não foi atendido hoje. É a reserva. */
  const r = await env.DB.prepare(
    `UPDATE lembretes_estudo SET ultimo_dia = ?, seguidos = ?
      WHERE account_id = ? AND (ultimo_dia IS NULL OR ultimo_dia < ?)`
  ).bind(hoje, seguidos, id, hoje).run();
  return Number(r && r.meta && r.meta.changes) > 0;
}

export async function runLembretes(env, at = Date.now(), { limite = 50 } = {}) {
  if (!lembreteLigado(env) || !mailReady(env)) return { enviados: 0 };
  const { dia: hoje, hora } = agoraEmBrasilia(at);
  if (hora < HORA_DO_LEMBRETE) return { enviados: 0 };
  let linhas = [];
  try {
    ({ results: linhas } = await env.DB.prepare(
      `SELECT l.account_id, l.ultimo_dia, l.seguidos, a.email, a.name, a.idioma,
              (SELECT MAX(d.key) FROM json_each(CASE WHEN json_valid(p.state) THEN p.state ELSE '{}' END, '$.days') d
                WHERE COALESCE(json_extract(d.value, '$.units'), 0) > 0) AS estudou_em
         FROM lembretes_estudo l
         JOIN accounts a ON a.id = l.account_id
         LEFT JOIN progress p ON p.account_id = l.account_id
        WHERE l.ultimo_dia IS NULL OR l.ultimo_dia < ?
        ORDER BY l.account_id LIMIT ?`
    ).bind(hoje, limite).all());
  } catch {
    return { enviados: 0 }; /* tabela ainda não criada */
  }

  let enviados = 0;
  for (const l of linhas || []) {
    try {
      const id = l.account_id;
      const email = normalizeEmail(l.email);
      const valida = email && !/\.(invalid|local)$/i.test(email) && await hasEntitlement(env, id, CURSO, at);
      const d = decidir({ hoje, estudouEm: l.estudou_em, ultimoDia: l.ultimo_dia, seguidos: l.seguidos });
      if (!valida || !d.manda) {
        await marcar(env, id, hoje, valida ? d.seguidos : Number(l.seguidos) || 0);
        continue;
      }
      if (!await marcar(env, id, hoje, d.seguidos)) continue;
      const idioma = idiomaDaConta(l);
      const site = origemDoIdioma(env, idioma);
      const sair = await linkDeSaida(env, id, site);
      const r = await sendMail(env, {
        to: email,
        ...mensagens(idioma).lembrete({
          nome: l.name || '',
          painel: `${site}/meu-hebraico/`,
          praticar: `${site}/academia/`,
          sair,
          marca: marcaDoEmail(idioma, empresa)
        }),
        headers: { 'List-Unsubscribe': `<${sair}>` }
      });
      if (r && r.ok) enviados++;
      else {
        await env.DB.prepare('UPDATE lembretes_estudo SET ultimo_dia = ?, seguidos = ? WHERE account_id = ?')
          .bind(l.ultimo_dia ?? null, Number(l.seguidos) || 0, id).run();
      }
    } catch (e) {
      console.error('lembrete', e && e.stack || e);
    }
  }
  return { enviados };
}

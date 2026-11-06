/* Quem comprou (02/10/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Até aqui, saber quem pagou pedia o painel da Mercado Pago ou uma consulta
 * no D1. Este é o mesmo dado, no site, com o segundo fator do administrador:
 *
 *   GET /api/admin/vendas   as últimas 200 compras pagas ou estornadas
 *
 * Só leitura. Cada linha diz também se o pedido veio de um link de campanha
 * (`orders.parceria`, migração 0002) e de que origem (`orders.origem` e
 * `orders.campanha`, migração 0003); pedidos de antes delas vêm sem a marca.
 * Pedidos pendentes, vencidos e recusados ficam fora de `vendas` (não houve
 * dinheiro) e vão para `naoPagos`.
 *
 * Desde 23/10/2026, a compra de uma conta de ADMIN_EMAILS vem com
 * `teste: true`: são os testes do dono, que o painel mostra à parte e não soma.
 *
 * Desde 04/11/2026, também os pedidos NÃO pagos (`naoPagos`: PIX vencido,
 * cartão recusado, aguardando), sem os testes do dono, e o fechamento de
 * cada módulo de quem pagou (`revisoes`, `leituras`).
 *
 * Desde 03/11/2026, também quando a pessoa desistiu pelo site e se já tinha
 * passado no exame final - para medir quem faz o curso e desiste -, em
 * quantos dias ela estudou e uma ESTIMATIVA do tempo de prática: a soma das
 * unidades da meta diária (`days[*].units`, cerca de 20 segundos cada; ver
 * `goalTarget` em app/src/lib/state/rules.ts). Não é relógio: o tempo real
 * de cada etapa só sai anônimo, nas estatísticas.
 * Desde 05/10/2026, cada compra diz também se a pessoa já começou o curso:
 * quando o progresso dela foi gravado pela última vez (`progress.updated_at`,
 * que só muda quando algo de verdade mudou) e quais lições ela concluiu.
 * A lista sai do próprio SQLite (json_each), para não abrir 200 estados no
 * Worker; um estado que não seja JSON válido vira lista vazia em vez de
 * derrubar a lista. Quais delas são LETRAS (e não os módulos extras ou as
 * lições de som, que moram no mesmo `lessons`) o painel decide, com a lista
 * de letras do curso que ele já tem.
 */

import { json } from '../lib/http.js';
import { emailsDeAdmin, exigirAdmin } from '../lib/admin.js';
import { normalizeEmail } from '../lib/db.js';

const LIMITE = 200;
/** Uma unidade da meta diária vale cerca de 20 segundos (rules.ts, goalTarget). */
const UNIDADE_SEGUNDOS = 20;

const lista = texto => {
  try { const l = JSON.parse(texto || '[]'); return Array.isArray(l) ? l.map(String) : []; } catch { return []; }
};

export async function listar({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const { results } = await env.DB.prepare(
    `SELECT o.id, o.course_slug, o.amount_cents, o.method, o.installments, o.status,
            o.created_at, o.paid_at, o.parceria, o.origem, o.campanha, a.name, a.email, o.nome_completo, o.cpf,
            p.updated_at AS progresso_em,
            (SELECT d.pedido_em FROM arrependimentos d WHERE d.order_id = o.id) AS desistiu_em,
            CASE WHEN json_valid(p.state) THEN json_extract(p.state, '$.finalChallenge.passedAt') END AS exame_em,
            (SELECT json_extract(e.raw, '$.liquido') FROM payment_events e
              WHERE e.order_id = o.id AND e.status = 'paid' AND json_valid(e.raw)
              ORDER BY e.created_at DESC LIMIT 1) AS liquido,
            (SELECT json_group_array(l.key) FROM json_each(CASE WHEN json_valid(p.state) THEN p.state ELSE '{}' END, '$.lessons') l
              WHERE json_extract(l.value, '$.completedAt') IS NOT NULL) AS concluidas,
            (SELECT COUNT(*) FROM json_each(CASE WHEN json_valid(p.state) THEN p.state ELSE '{}' END, '$.days') d
              WHERE COALESCE(json_extract(d.value, '$.units'), 0) > 0
                 OR COALESCE(json_extract(d.value, '$.answered'), 0) > 0) AS dias_estudo,
            (SELECT SUM(COALESCE(json_extract(d.value, '$.units'), 0))
               FROM json_each(CASE WHEN json_valid(p.state) THEN p.state ELSE '{}' END, '$.days') d) AS unidades,
            (SELECT json_group_array(c.key) FROM json_each(CASE WHEN json_valid(p.state) THEN p.state ELSE '{}' END, '$.checkpoints') c
              WHERE json_extract(c.value, '$.passedAt') IS NOT NULL) AS revisoes,
            (SELECT json_group_array(f.key) FROM json_each(CASE WHEN json_valid(p.state) THEN p.state ELSE '{}' END, '$.firsts') f
              WHERE f.key LIKE 'primeira-leitura-m%' OR f.key LIKE 'texto-%') AS leituras
       FROM orders o LEFT JOIN accounts a ON a.id = o.account_id
                     LEFT JOIN progress p ON p.account_id = o.account_id
      WHERE o.status IN ('paid', 'refunded')
      ORDER BY COALESCE(o.paid_at, o.created_at) DESC
      LIMIT ?`
  ).bind(LIMITE).all();
  const admins = emailsDeAdmin(env);

  /* Os pedidos que NÃO foram pagos (04/11/2026, pedido do dono): o PIX que
     venceu, o cartão recusado, o que ainda espera. Só para o dono ver quem
     tentou comprar - o painel não manda nada a ninguém. `comprouDepois` diz
     se a mesma conta pagou o mesmo curso em outro pedido. */
  const { results: naoPagos } = await env.DB.prepare(
    `SELECT o.id, o.course_slug, o.amount_cents, o.method, o.status, o.created_at, o.origem, o.campanha,
            a.name, a.email,
            EXISTS (SELECT 1 FROM orders o2 WHERE o2.account_id = o.account_id AND o2.course_slug = o.course_slug
                     AND o2.status IN ('paid', 'refunded')) AS comprou_depois
       FROM orders o LEFT JOIN accounts a ON a.id = o.account_id
      WHERE o.status NOT IN ('paid', 'refunded')
      ORDER BY o.created_at DESC
      LIMIT ?`
  ).bind(LIMITE).all();

  return json({
    naoPagos: (naoPagos || [])
      .filter(v => !(v.email && admins.includes(normalizeEmail(v.email))))
      .map(v => ({
        orderId: v.id, curso: v.course_slug, valorCentavos: v.amount_cents, metodo: v.method,
        status: v.status, criadoEm: v.created_at, origem: v.origem || null, campanha: v.campanha || null,
        nome: v.name || '', email: v.email || null, comprouDepois: !!v.comprou_depois
      })),
    vendas: (results || []).map(v => ({
      orderId: v.id, curso: v.course_slug, valorCentavos: v.amount_cents, metodo: v.method,
      /* O que a Mercado Pago depositou depois da taxa (enxuto: `liquido`). Null em
         pagamento anterior a 26/10/2026, no PIX direto e na liberação à mão. */
      liquidoCentavos: Number.isFinite(Number(v.liquido)) && v.liquido != null ? Math.round(Number(v.liquido) * 100) : null,
      parcelas: v.installments, status: v.status, pagoEm: v.paid_at || v.created_at,
      parceria: v.parceria || null, origem: v.origem || null, campanha: v.campanha || null, nome: v.name || '', email: v.email || null,
      /* Os dados da nota fiscal (06/11/2026), nas compras que os têm. */
      nomeCompleto: v.nome_completo || null, cpf: v.cpf || null,
      estudouEm: v.progresso_em || null, concluidas: lista(v.concluidas),
      /* Desistência pelo site (03/11/2026): quando foi pedida, para o painel
         dizer quantos dias depois da compra e até onde a pessoa chegou. */
      desistiuEm: v.desistiu_em || null, exameFeito: !!v.exame_em,
      diasDeEstudo: Number(v.dias_estudo) || 0,
      /* O fechamento de cada módulo (04/11/2026): as revisões aprovadas
         (cp1…) e as leituras feitas (primeira-leitura-mN, texto-N). */
      revisoes: lista(v.revisoes), leituras: lista(v.leituras),
      minutosEstimados: Math.round((Number(v.unidades) || 0) * UNIDADE_SEGUNDOS / 60),
      teste: !!v.email && admins.includes(normalizeEmail(v.email))
    }))
  });
}

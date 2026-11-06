/* "Baixar meus dados": uma cópia, em arquivo, do que o site guarda sobre a
 * conta (LGPD, art. 18, II e V: acesso e portabilidade). Auditoria de
 * 01/10/2026, LEGAL-122. Antes isso só existia por pedido por e-mail.
 * ─────────────────────────────────────────────────────────────────────────
 * Exige sessão. Sai em JSON legível, `private, no-store`, como anexo.
 *
 * O que NÃO vai, e por quê:
 *   · hash e sal da senha, versão de sessão, aparelhos (ids de sessão):
 *     credenciais, e entregá-las num arquivo é criar um jeito de roubá-las;
 *   · a marca anticópia da conta (`marcas`): é a assinatura que identifica
 *     uma cópia vazada do curso; entregá-la ensina a apagá-la. Fica a
 *     pergunta para o advogado (audit/2026-10-01/PARA-O-ADVOGADO.md);
 *   · código PIX e link de pagamento dos pedidos: são de pagar, não dados.
 */

import { fail, json, notSignedIn } from '../lib/http.js';
import { log, throttled } from '../lib/db.js';
import { requireAccount } from './auth.js';

const iso = ms => (ms === null || ms === undefined || ms === '' ? null : new Date(Number(ms)).toISOString());

async function todas(env, sql, ...args) {
  try { return (await env.DB.prepare(sql).bind(...args).all()).results || []; }
  catch { return []; } /* tabela ausente num banco antigo: o arquivo sai sem ela */
}
async function uma(env, sql, ...args) {
  try { return await env.DB.prepare(sql).bind(...args).first(); }
  catch { return null; }
}

/** Monta o arquivo. Separado da rota para o teste. */
export async function dadosDaConta(env, account, agora = Date.now()) {
  const id = account.id;
  const progresso = await uma(env, 'SELECT state, updated_at FROM progress WHERE account_id = ?', id);
  let estado = null;
  try { estado = progresso ? JSON.parse(progresso.state) : null; } catch { estado = progresso?.state ?? null; }
  const depo = await uma(env,
    'SELECT texto, forma, nome_publico, cidade, publicar, contato, estado, criado_em, atualizado_em FROM depoimentos WHERE account_id = ?', id);
  const novidades = await uma(env, 'SELECT criado_em FROM novidades WHERE account_id = ?', id);
  const lembrete = await uma(env, 'SELECT criado_em FROM lembretes_estudo WHERE account_id = ?', id);

  return {
    geradoEm: iso(agora),
    sobre: 'Cópia dos dados que o Hebraico Fluente guarda sobre a sua conta (LGPD, art. 18). '
      + 'Não incluídos, por segurança: a senha (guardada só como hash), os identificadores de sessão '
      + 'e de aparelho, e a marca anticópia do conteúdo.',
    conta: { email: account.email, nome: account.name || '', criadaEm: iso(account.created_at) },
    acessos: (await todas(env,
      'SELECT course_slug, granted_at, expires_at, order_id FROM entitlements WHERE account_id = ?', id))
      .map(e => ({ curso: e.course_slug, liberadoEm: iso(e.granted_at), terminaEm: iso(e.expires_at), pedido: e.order_id })),
    pedidos: (await todas(env,
      'SELECT * FROM orders WHERE account_id = ? ORDER BY created_at', id))
      .map(o => ({
        id: o.id, curso: o.course_slug, valorCentavos: o.amount_cents, moeda: o.currency, forma: o.method,
        parcelas: o.installments, situacao: o.status, criadoEm: iso(o.created_at), pagoEm: iso(o.paid_at),
        versaoDosTermos: o.termos_versao ?? null,
        /* Os dados da nota fiscal (06/11/2026), quando o pedido os tem. */
        nomeCompleto: o.nome_completo ?? null, cpf: o.cpf ?? null
      })),
    /* Fale comigo (06/11/2026). */
    mensagens: (await todas(env,
      'SELECT tipo, texto, contexto, criado_em, respondida_em FROM mensagens WHERE account_id = ? ORDER BY criado_em', id))
      .map(m => ({ tipo: m.tipo, texto: m.texto, contexto: m.contexto ?? null, enviadaEm: iso(m.criado_em), respondidaEm: iso(m.respondida_em) })),
    desistencias: (await todas(env,
      'SELECT order_id, pedido_em, ip FROM arrependimentos WHERE account_id = ?', id))
      .map(a => ({ pedido: a.order_id, pedidaEm: iso(a.pedido_em), ip: a.ip })),
    aceites: (await todas(env,
      'SELECT documento, versao, aceito_em FROM aceites WHERE account_id = ? ORDER BY aceito_em', id))
      .map(a => ({ documento: a.documento, versao: a.versao, aceitoEm: iso(a.aceito_em) })),
    registrosDeAcesso: (await todas(env,
      'SELECT evento, ip, criado_em FROM registros_acesso WHERE account_id = ? ORDER BY criado_em', id))
      .map(r => ({ evento: r.evento, ip: r.ip, em: iso(r.criado_em) })),
    trilha: (await todas(env,
      'SELECT action, created_at FROM access_log WHERE account_id = ? ORDER BY created_at', id))
      .map(r => ({ acao: r.action, em: iso(r.created_at) })),
    avisoDoProximoCurso: novidades ? { pedidoEm: iso(novidades.criado_em) } : null,
    lembreteParaEstudar: lembrete ? { pedidoEm: iso(lembrete.criado_em) } : null,
    depoimento: depo ? {
      texto: depo.texto, forma: depo.forma, nomePublico: depo.nome_publico, cidade: depo.cidade,
      autorizouPublicar: !!depo.publicar, aceitaContato: !!depo.contato, situacao: depo.estado,
      enviadoEm: iso(depo.criado_em), atualizadoEm: iso(depo.atualizado_em)
    } : null,
    examesA1: (await todas(env,
      'SELECT criada_em, entregue_em, nota, partes FROM provas_a1 WHERE account_id = ? ORDER BY criada_em', id))
      .map(p => ({ sorteadaEm: iso(p.criada_em), entregueEm: iso(p.entregue_em), nota: p.nota ?? null, partes: p.partes ? JSON.parse(p.partes) : null })),
    certificados: (await todas(env,
      'SELECT id, curso, nome, nota, aprovado_em, emitido_em, publico FROM certificados WHERE account_id = ?', id))
      .map(c => ({ codigo: c.id, curso: c.curso, nome: c.nome, nota: c.nota, aprovadoEm: iso(c.aprovado_em), emitidoEm: iso(c.emitido_em), verificacaoPublica: !!c.publico })),
    progresso: progresso ? { atualizadoEm: iso(progresso.updated_at), estado } : null
  };
}

/* GET /api/account/dados */
export async function exportar({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();
  /* Um arquivo inteiro do banco por pedido: dez por hora bastam a qualquer um. */
  if (await throttled(env, `dados-h:${account.id}`, 10, 3_600_000)) return fail('rate-limited-hora', 429);

  const dados = await dadosDaConta(env, account);
  await log(env, account.id, 'dados-exportados');
  const dia = new Date().toISOString().slice(0, 10);
  return json(dados, 200, {
    'Cache-Control': 'private, no-store',
    'Content-Disposition': `attachment; filename="hebraico-fluente-meus-dados-${dia}.json"`
  });
}

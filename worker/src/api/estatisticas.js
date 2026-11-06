/* Onde os alunos erram e onde param (30/09/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * O dono do curso não tinha como saber qual exercício trava a turma nem em
 * que lição as pessoas desistem: os eventos de aprendizagem ficavam no
 * navegador de cada aluno. Agora o app manda, em lote, só CONTAGENS:
 *
 *   · resposta   - tipo do exercício, lição, certa ou errada;
 *   · etapa      - lição e etapa, só na PRIMEIRA vez que ela é concluída
 *                  (repetir uma etapa não conta de novo: o funil é de
 *                  alunos, não de cliques);
 *   · tempo      - junto da etapa, a FAIXA de tempo ativo que ela levou
 *                  (28/10/2026, app/src/lib/tempo-de-etapa.ts): 0 a 6, de
 *                  "menos de 1 min" a "20 min ou mais". Nunca os segundos.
 *
 * O que é guardado é uma linha por dia e por chave, com um contador:
 * `estatisticas (dia, chave, n)`. Nenhuma linha tem conta, e-mail, IP,
 * aparelho ou horário - somar os contadores de um dia não diz quem fez o
 * quê. A sessão só é conferida para barrar lixo de fora; ela não é gravada.
 * As linhas saem depois de um ano (alertas.js).
 *
 * Só conta quem tem o curso liberado (auditoria de 01/10/2026, SEC-A-008).
 * Conta é de graça, e com qualquer conta logada um script mandava 30 lotes
 * de 60 eventos por minuto: o dono decide onde mexer no curso por estes
 * números, e eles eram envenenáveis por quem nunca estudou. Sem curso, a
 * resposta continua 204 (o app não tem o que fazer com um erro aqui) e nada
 * é escrito, nem o freio.
 *
 * Quem lê é o dono, em /admin/estatisticas.
 */

import { fail, json, notSignedIn, readJson } from '../lib/http.js';
import { activeEntitlements, throttled } from '../lib/db.js';
import { ehCurso } from '../lib/catalog.js';
import { emailsDeAdmin, exigirAdmin } from '../lib/admin.js';
import { fonteValida } from '../lib/origem.js';
import { ip, requireAccount } from './auth.js';
import { resumo as resumoDaLista } from './interessados.js';
import { retencaoDoBanco } from '../lib/retencao.js';

const ID = /^[a-z0-9-]{1,40}$/;
const MAX_EVENTOS = 60;
export const GUARDA_DIAS = 365;
const DIA_MS = 86_400_000;

const hojeBrasilia = (at = Date.now()) => new Date(at - 3 * 3_600_000).toISOString().slice(0, 10);

/** As faixas de tempo vão de 0 a FAIXAS - 1 (as mesmas de app/src/lib/tempo-de-etapa.ts). */
export const FAIXAS = 7;

/** A faixa de tempo de uma etapa vira a chave `t|<lição>|<etapa>|<faixa>`, ou null. */
export function chaveDoTempo(ev) {
  if (!ev || ev.e !== 'etapa' || ev.f === undefined) return null;
  const base = chaveDe(ev);
  const f = Number(ev.f);
  if (!base || !Number.isInteger(f) || f < 0 || f >= FAIXAS) return null;
  return `t|${String(ev.l)}|${Number(ev.s)}|${f}`;
}

/** O evento do app vira uma chave de contador, ou null se não serve. */
export function chaveDe(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const l = String(ev.l ?? '');
  if (!ID.test(l)) return null;
  if (ev.e === 'resposta') {
    const k = String(ev.k ?? '');
    if (!ID.test(k) || typeof ev.c !== 'boolean') return null;
    return `r|${k}|${l}|${ev.c ? 1 : 0}`;
  }
  if (ev.e === 'etapa') {
    const s = Number(ev.s);
    if (!Number.isInteger(s) || s < 1 || s > 5) return null;
    return `e|${l}|${s}`;
  }
  return null;
}

/** POST /api/estatisticas {eventos:[...]} - sempre 204, a não ser sem sessão. */
export async function registrar({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();
  /* Antes do freio: quem não tem curso não gasta nem a escrita dele. */
  if (!(await activeEntitlements(env, account.id)).some(e => ehCurso(e.courseSlug))) return new Response(null, { status: 204 });
  if (await throttled(env, `estat:${account.id}`, 30, 60_000)) return new Response(null, { status: 204 });
  const b = await readJson(request, 16 * 1024);
  const eventos = b && Array.isArray(b.eventos) ? b.eventos.slice(0, MAX_EVENTOS) : [];
  const soma = new Map();
  for (const ev of eventos) {
    for (const k of [chaveDe(ev), chaveDoTempo(ev)]) {
      if (k) soma.set(k, (soma.get(k) || 0) + 1);
    }
  }
  if (!soma.size) return new Response(null, { status: 204 });
  const dia = hojeBrasilia();
  try {
    await env.DB.batch([...soma].map(([chave, n]) => env.DB.prepare(
      `INSERT INTO estatisticas (dia, chave, n) VALUES (?1, ?2, ?3)
       ON CONFLICT(dia, chave) DO UPDATE SET n = n + ?3`
    ).bind(dia, chave, n)));
  } catch (e) {
    /* Estatística perdida não é problema do aluno. */
    console.error('estatisticas', e && e.stack || e);
  }
  return new Response(null, { status: 204 });
}

/* Links de campanha (02/10/2026): hebraicofluente.com.br/sefarad, o link da
   parceria com a associação sefardita. Conta só o total de visitas por dia,
   na mesma tabela e com a mesma regra das outras contagens: sem conta,
   e-mail, IP, horário nem cookie. A visita leva direto ao teste grátis. */
export const LINKS_DE_CAMPANHA = new Map([
  ['/sefarad', 'sefarad'],
  /* Os do Instagram (04/10/2026): a bio, as figurinhas de link dos stories e
     o link mandado no direct. Cada um conta à parte. */
  ['/bio', 'bio'], ['/stories', 'stories'], ['/dm', 'dm']
]);
/* Os links que vão para a página "Comece aqui" (24/10/2026, decisão do dono)
   em vez do teste grátis: só a bio, que recebe gente de todo post. Stories e
   direct chegam de um conteúdo que já diz do que se trata. */
/* A bio ia para o "Comece aqui" (24/10/2026); desde 27/10/2026 o site fica só
   com o curso de alfabetização, e ela vai direto à página do curso. */
export const PARA_O_COMECE_AQUI = new Set([]);
const ROBO = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget|python|headless/i;

export async function contarCampanha(env, origem, request) {
  if (request.method !== 'GET' || ROBO.test(request.headers.get('user-agent') || '')) return;
  try {
    await env.DB.prepare(
      `INSERT INTO estatisticas (dia, chave, n) VALUES (?1, ?2, 1)
       ON CONFLICT(dia, chave) DO UPDATE SET n = n + 1`
    ).bind(hojeBrasilia(), `o|${origem}`).run();
  } catch (e) {
    console.error('campanha', e && e.stack || e);
  }
}

/* O teste grátis da capa (03/10/2026): até onde os visitantes chegam.
   ─────────────────────────────────────────────────────────────────────────
   Quem faz o teste ainda não tem conta, então aqui não há sessão a conferir.
   O app manda só o NOME da etapa alcançada, uma vez por etapa e por visita
   (app/src/lib/funil-demo.ts), e o servidor soma por dia na mesma tabela,
   com a chave `d|<etapa>`: sem conta, e-mail, IP, horário nem cookie.

   Contra contagem inflada: nome fora da lista não conta, robô não conta, e
   cada endereço de IP conta no máximo 40 etapas por hora (o freio guarda o
   IP só durante a janela, como o do cadastro). Uma visita inteira usa 9. */
export const ETAPAS_DA_DEMO = ['visto', 'reconhecer', 'comparar', 'vogais', 'escrever', 'achar', 'ler', 'pronto', 'cta', 'segunda-letra'];
/* `segunda-letra` não vem do navegador: é contada pelo servidor quando o
   e-mail da segunda letra sai (api/segunda-letra.js). */
const SO_DO_SERVIDOR = new Set(['segunda-letra']);

/** POST /api/demo {etapa} - sempre 204. */
export async function contarDemo({ request, env }) {
  const nada = new Response(null, { status: 204 });
  if (ROBO.test(request.headers.get('user-agent') || '')) return nada;
  const b = await readJson(request, 1024);
  const etapa = String(b && b.etapa || '');
  if (!ETAPAS_DA_DEMO.includes(etapa) || SO_DO_SERVIDOR.has(etapa)) return nada;
  if (await throttled(env, `demo-ip:${ip(request)}`, 40, 3_600_000)) return nada;
  await contarEtapa(env, etapa);
  return nada;
}

/* O portal (a capa desde 23/10/2026): que jornada e que produto as pessoas
   abrem. Decisão do dono: o contador próprio, como o do teste grátis, e não
   uma ferramenta de terceiros. O app manda só o NOME do evento, uma vez por
   evento e por visita (app/src/lib/funil-portal.ts); o servidor soma por dia
   em `p|<evento>`: sem conta, e-mail, IP, horário nem cookie. Mesmos freios
   da demo: lista fechada, robô fora, 40 por hora por endereço (o freio guarda
   o IP só durante a janela). Uma visita inteira usa no máximo 12. */
export const EVENTOS_DO_PORTAL = [
  'visto',
  'jornada-hebraico', 'jornada-israel', 'jornada-raizes',
  'produto-alfabetizacao', 'produto-hebraico-a1', 'produto-israel-alem-do-roteiro', 'produto-raizes-sefarditas',
  'palavra-ouvir', 'palavra-revelar',
  'cta-curso', 'cta-explorar',
  /* A prévia grátis do e-book em /previa (23/10/2026): quem abriu, quem encheu
     a mochila, quem montou um prato, quem abriu o diário e quem foi ao curso. */
  'previa-visto', 'previa-mochila-cheia', 'previa-prato-pronto', 'previa-diario-aberto', 'previa-clique-curso',
  /* A página "Comece aqui" (/comece-aqui, o destino do link da bio desde
     24/10/2026): quem abriu, qual caminho escolheu e quem foi ao curso. */
  'comece-visto', 'comece-ler', 'comece-israel', 'comece-palavra', 'comece-curso'
];

/* O funil por origem (23/10/2026, plano de marketing): quem abriu a página
   de venda e quem abriu o checkout, separados pela fonte da visita (lista
   fechada em lib/origem.js). Somados em `f|<evento>|<fonte>`; fonte que não
   está na lista conta como `direto`. Mesmo endpoint e mesmo freio do portal.
   `checkout-conta` (o checkout pediu a conta a quem chegou sem sessão) e
   `checkout-pagar` (mostrou o pagamento) entraram em 23/10/2026: são os dois
   lados do passo que o teste C4 do plano mexe, medidos antes de ele começar. */
/* `teste-visto` e `teste-pronto` (31/10/2026, plano de SEO aprovado pelo
   dono): o teste grátis da página do curso visto e terminado, por origem,
   para saber quantos testes a busca traz. Os totais por etapa continuam em
   `d|<etapa>` (contarDemo); estes são duas linhas a mais por visita. */
export const EVENTOS_COM_FONTE = ['venda-visto', 'checkout-aberto', 'checkout-conta', 'checkout-pagar', 'teste-visto', 'teste-pronto'];

/** POST /api/portal {evento, fonte?} - sempre 204. */
export async function contarPortal({ request, env }) {
  const nada = new Response(null, { status: 204 });
  if (ROBO.test(request.headers.get('user-agent') || '')) return nada;
  const b = await readJson(request, 1024);
  const evento = String(b && b.evento || '');
  const comFonte = EVENTOS_COM_FONTE.includes(evento);
  if (!comFonte && !EVENTOS_DO_PORTAL.includes(evento)) return nada;
  if (await throttled(env, `portal-ip:${ip(request)}`, 40, 3_600_000)) return nada;
  if (comFonte) {
    const fonte = fonteValida(b.fonte) ? b.fonte : 'direto';
    await contarChave(env, `f|${evento}|${fonte}`);
  } else {
    await contarChave(env, `p|${evento}`);
  }
  return nada;
}

/* Pedidos e compras por origem no período (orders.origem, migração 0003).
   Pedido = criado no período, qualquer estado; compra = paga no período e
   não estornada; estorno = estornado, contado pela data do pagamento.
   Pedido sem origem (de antes da migração, ou sem nada no aparelho) aparece
   como `sem-marca`. Banco sem a coluna: lista vazia, o resto do painel segue.
   Pedidos de contas de ADMIN_EMAILS (os testes do dono, 23/10/2026) ficam de
   fora e são contados à parte em `pedidosDeTeste`. */
async function pedidosPorFonte(env, desdeMs) {
  const admins = emailsDeAdmin(env);
  const fora = admins.length ? `AND LOWER(COALESCE(a.email, '')) NOT IN (${admins.map((_, i) => `?${i + 2}`).join(', ')})` : '';
  try {
    const { results } = await env.DB.prepare(
      `SELECT COALESCE(o.origem, 'sem-marca') AS fonte,
              SUM(CASE WHEN o.created_at >= ?1 THEN 1 ELSE 0 END) AS pedidos,
              SUM(CASE WHEN o.status = 'paid' AND o.paid_at >= ?1 THEN 1 ELSE 0 END) AS compras,
              SUM(CASE WHEN o.status = 'paid' AND o.paid_at >= ?1 THEN o.amount_cents ELSE 0 END) AS receita_centavos,
              SUM(CASE WHEN o.status = 'refunded' AND o.paid_at >= ?1 THEN 1 ELSE 0 END) AS estornos
         FROM orders o LEFT JOIN accounts a ON a.id = o.account_id
        WHERE (o.created_at >= ?1 OR o.paid_at >= ?1) ${fora}
        GROUP BY 1`
    ).bind(desdeMs, ...admins).all();
    return (results || []).map(r => ({
      fonte: r.fonte, pedidos: r.pedidos || 0, compras: r.compras || 0,
      receitaCentavos: r.receita_centavos || 0, estornos: r.estornos || 0
    }));
  } catch { return []; }
}

/** Quantos pedidos de contas de administrador o período teve (os testes). */
async function pedidosDeTeste(env, desdeMs) {
  const admins = emailsDeAdmin(env);
  if (!admins.length) return 0;
  try {
    const r = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM orders o JOIN accounts a ON a.id = o.account_id
        WHERE (o.created_at >= ?1 OR o.paid_at >= ?1)
          AND LOWER(a.email) IN (${admins.map((_, i) => `?${i + 2}`).join(', ')})`
    ).bind(desdeMs, ...admins).first();
    return Number(r && r.n) || 0;
  } catch { return 0; }
}

/* O funil numa linha por semana (24/10/2026, marketing/04-painel.md, "O funil,
   numa linha por semana"). Semana de segunda a domingo, no relógio de
   Brasília, as últimas SEMANAS_DO_FUNIL contando a de hoje. Tudo sai das
   mesmas fontes do resto do painel, sem nada novo gravado:
     capa / teste / testeFeito  p|visto, d|visto, d|pronto
     venda / checkout / conta / pagar  f|<evento>|* somados de todas as fontes
     leads      interessados confirmados na semana (quem saiu foi apagado e
                não aparece; o total de hoje está na seção da lista)
     pedidos    orders criados na semana; compras/receita: pagos na semana,
                estornos: estornados contados pela semana do pagamento
   Pedidos de contas de ADMIN_EMAILS ficam de fora, como em pedidosPorFonte. */
export const SEMANAS_DO_FUNIL = 8;
const segundaDe = dia => {
  const t = Date.parse(`${dia}T00:00:00Z`);
  return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * DIA_MS).toISOString().slice(0, 10);
};
const semanaDoMs = ms => segundaDe(hojeBrasilia(ms));
const CAMPO_DA_CHAVE = { 'p|visto': 'capa', 'd|visto': 'teste', 'd|pronto': 'testeFeito' };
const CAMPO_DA_FONTE = { 'venda-visto': 'venda', 'checkout-aberto': 'checkout', 'checkout-conta': 'conta', 'checkout-pagar': 'pagar' };

export async function funilSemanal(env, agora = Date.now(), semanas = SEMANAS_DO_FUNIL) {
  const inicio = segundaDe(hojeBrasilia(agora - (semanas - 1) * 7 * DIA_MS));
  const inicioMs = Date.parse(`${inicio}T00:00:00-03:00`);
  const linhas = new Map();
  for (let i = 0; i < semanas; i++) {
    const semana = new Date(Date.parse(`${inicio}T00:00:00Z`) + i * 7 * DIA_MS).toISOString().slice(0, 10);
    linhas.set(semana, { semana, capa: 0, venda: 0, teste: 0, testeFeito: 0, checkout: 0, conta: 0, pagar: 0,
      leads: 0, pedidos: 0, compras: 0, receitaCentavos: 0, estornos: 0 });
  }
  const somar = (semana, campo, n) => { const l = linhas.get(semana); if (l) l[campo] += n; };
  try {
    const { results } = await env.DB.prepare(
      `SELECT dia, chave, n FROM estatisticas
        WHERE dia >= ?1 AND (chave IN ('p|visto', 'd|visto', 'd|pronto') OR chave LIKE 'f|%')`
    ).bind(inicio).all();
    for (const r of results || []) {
      const p = String(r.chave).split('|');
      const campo = p[0] === 'f' ? CAMPO_DA_FONTE[p[1]] : CAMPO_DA_CHAVE[r.chave];
      if (campo) somar(segundaDe(r.dia), campo, Number(r.n) || 0);
    }
  } catch { /* tabela ausente: as colunas do contador ficam em zero */ }
  const admins = emailsDeAdmin(env);
  const fora = admins.length ? `AND LOWER(COALESCE(a.email, '')) NOT IN (${admins.map((_, i) => `?${i + 2}`).join(', ')})` : '';
  try {
    const { results } = await env.DB.prepare(
      `SELECT o.created_at, o.paid_at, o.status, o.amount_cents
         FROM orders o LEFT JOIN accounts a ON a.id = o.account_id
        WHERE (o.created_at >= ?1 OR o.paid_at >= ?1) ${fora}`
    ).bind(inicioMs, ...admins).all();
    for (const o of results || []) {
      if (o.created_at >= inicioMs) somar(semanaDoMs(o.created_at), 'pedidos', 1);
      if (!o.paid_at || o.paid_at < inicioMs) continue;
      if (o.status === 'paid') {
        somar(semanaDoMs(o.paid_at), 'compras', 1);
        somar(semanaDoMs(o.paid_at), 'receitaCentavos', Number(o.amount_cents) || 0);
      } else if (o.status === 'refunded') somar(semanaDoMs(o.paid_at), 'estornos', 1);
    }
  } catch { /* sem pedidos legíveis: as colunas de venda ficam em zero */ }
  try {
    const { results } = await env.DB.prepare(
      'SELECT confirmado_em FROM interessados WHERE confirmado_em >= ?1 AND saiu_em IS NULL'
    ).bind(inicioMs).all();
    for (const r of results || []) somar(semanaDoMs(r.confirmado_em), 'leads', 1);
  } catch { /* tabela ausente: leads em zero */ }
  return [...linhas.values()];
}

/** Soma 1 na etapa do teste, hoje. Nunca lança. */
export const contarEtapa = (env, etapa) => contarChave(env, `d|${etapa}`);

/** GET /api/admin/estatisticas?dias=30 - as somas do período. */
export async function ler({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const dias = Math.min(GUARDA_DIAS, Math.max(1, Number(new URL(request.url).searchParams.get('dias')) || 30));
  const desde = hojeBrasilia(Date.now() - (dias - 1) * DIA_MS);
  let linhas = [];
  try {
    ({ results: linhas } = await env.DB.prepare(
      'SELECT chave, SUM(n) AS n FROM estatisticas WHERE dia >= ? GROUP BY chave'
    ).bind(desde).all());
  } catch { /* tabela ausente: nada ainda */ }
  const respostas = new Map();
  const etapas = [];
  const tempos = [];
  const campanhas = [];
  const demo = [];
  const motivos = [];
  const portal = [];
  const porFonte = [];
  for (const { chave, n } of linhas || []) {
    const p = String(chave).split('|');
    if (p[0] === 'r' && p.length === 4) {
      const k = `${p[1]}|${p[2]}`;
      const r = respostas.get(k) || { kind: p[1], licao: p[2], total: 0, erros: 0 };
      r.total += n;
      if (p[3] === '0') r.erros += n;
      respostas.set(k, r);
    } else if (p[0] === 'e' && p.length === 3) {
      etapas.push({ licao: p[1], etapa: Number(p[2]), n });
    } else if (p[0] === 't' && p.length === 4) {
      tempos.push({ licao: p[1], etapa: Number(p[2]), faixa: Number(p[3]), n });
    } else if (p[0] === 'o' && p.length === 2) {
      campanhas.push({ origem: p[1], visitas: n });
    } else if (p[0] === 'd' && p.length === 2) {
      demo.push({ etapa: p[1], n });
    } else if (p[0] === 'm' && p.length === 2) {
      motivos.push({ motivo: p[1], n });
    } else if (p[0] === 'p' && p.length === 2) {
      portal.push({ evento: p[1], n });
    } else if (p[0] === 'f' && p.length === 3) {
      porFonte.push({ evento: p[1], fonte: p[2], n });
    }
  }
  /* O dia `desde` começa à meia-noite de Brasília (UTC-3, sem horário de verão). */
  const desdeMs = Date.parse(`${desde}T00:00:00-03:00`);
  const pedidos = await pedidosPorFonte(env, desdeMs);
  const testes = await pedidosDeTeste(env, desdeMs);
  /* A lista de interessados: o total de hoje (não depende do período). */
  const interessados = await resumoDaLista(env);
  const semanas = await funilSemanal(env);
  /* Os alunos voltam? (06/11/2026): só contagens, sem as contas de admin. */
  const retencao = await retencaoDoBanco(env, emailsDeAdmin(env), hojeBrasilia());
  return json({ dias, desde, respostas: [...respostas.values()], etapas, tempos, campanhas, demo, motivos, portal, porFonte, pedidos, pedidosDeTeste: testes, interessados, semanas, retencao });
}

/** Soma 1 numa chave de contador, hoje. Nunca lança: estatística perdida
 *  não é problema de ninguém. Usado pelos motivos de desistência (m|<motivo>,
 *  api/pay.js), que não identificam quem desistiu. */
export async function contarChave(env, chave) {
  try {
    await env.DB.prepare(
      `INSERT INTO estatisticas (dia, chave, n) VALUES (?1, ?2, 1)
       ON CONFLICT(dia, chave) DO UPDATE SET n = n + 1`
    ).bind(hojeBrasilia(), chave).run();
  } catch (e) {
    console.error('estatisticas', e && e.stack || e);
  }
}

/** As linhas de mais de um ano (chamado pela varredura, em alertas.js). */
export async function estatisticasPurge(env, at = Date.now()) {
  try {
    await env.DB.prepare('DELETE FROM estatisticas WHERE dia < ?').bind(hojeBrasilia(at - GUARDA_DIAS * DIA_MS)).run();
  } catch { /* tabela ausente */ }
}

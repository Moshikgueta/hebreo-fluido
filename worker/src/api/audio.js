/* As gravações feitas pelo painel (/admin/gravar).
 * ─────────────────────────────────────────────────────────────────────────
 * Até aqui um clipe só existia de um jeito: um `audio/<id>.mp3` no git, que
 * a build copia para o site. Isso continua valendo. O painel acrescenta um
 * segundo lugar - a tabela `gravacoes` do D1 -, para o dono do curso gravar
 * pelo navegador do celular e o som entrar no ar na hora, sem arquivo, sem
 * upload manual e sem publicação.
 *
 * ── o que NÃO muda ──────────────────────────────────────────────────────
 * O endereço. Toda lição, exercício e botão continua pedindo
 * `/audio/<id>.mp3`, pelo mesmo id de sempre. O Worker é que decide de onde
 * o som sai: com gravação do painel, do banco; sem ela, do arquivo do git.
 * Por isso gravar pelo painel SUBSTITUI o arquivo do estúdio sem tocar em
 * nada - e apagar a gravação do painel faz o arquivo do estúdio voltar.
 *
 * O portão continua na frente: `/audio` é rota paga (gate.js), e esta função
 * só é chamada depois que ele deixou passar.
 *
 * ── o formato ───────────────────────────────────────────────────────────
 * O arquivo é guardado como o navegador gravou: `audio/mp4` (AAC) no Safari
 * e no Chrome recente, e WAV quando o navegador só sabe gravar WebM ou Ogg -
 * o painel converte antes de enviar, porque WebM não toca em todo iPhone.
 * O `Content-Type` sai do que foi guardado, e não da extensão `.mp3` do
 * endereço: o navegador decide pelo tipo, e toca.
 *
 * ── o corte ─────────────────────────────────────────────────────────────
 * Quem grava aperta "Gravar", respira e fala: o arquivo começa com meio
 * segundo de silêncio. O painel mede onde a voz começa e termina e manda os
 * dois instantes (`inicio_ms`, `fim_ms`); o curso toca só esse trecho, com
 * um fragmento de mídia (`#t=0.42,1.31`), que Safari, Chrome e Firefox
 * respeitam. O arquivo guardado fica inteiro - o corte pode ser refeito.
 *
 * ── quem pode gravar ────────────────────────────────────────────────────
 * Só as contas listadas em `ADMIN_EMAILS` (wrangler.toml [vars], separadas
 * por vírgula). Uma conta comum recebe 403 em toda rota de escrita, com
 * sessão válida ou não.
 */

import { json, fail, readBytes, readJson } from '../lib/http.js';
import { normalizeEmail } from '../lib/db.js';
import { exigirAdmin, isAdmin } from '../lib/admin.js';
import { nomesOrganizados, idDoClipe, EXTENSAO } from '../lib/nomes-audio.js';
import { responderRange } from '../lib/range.js';

import catalogoAudio from '../../../data/audio.json';
import letters from '../../../app/content/letters.json';

const CLIPES = catalogoAudio.clips;
const IDS = new Set(CLIPES.map(idDoClipe));
const NOMES = nomesOrganizados(CLIPES, letters.map(l => l.id));

/* O D1 aceita linhas de até 2 MB. Um clipe de 15 s em AAC tem ~120 KB; em
   WAV mono de 44,1 kHz, ~1,3 MB. O teto fica abaixo do limite do banco, com
   folga para as outras colunas. */
export const MAX_BYTES = 1_500_000;

export const ID_RE = /^he-[0-9a-f]{8}$/;

/* ── administrador ─────────────────────────────────────────────────────
   Em lib/admin.js. Reexportado aqui
   porque os testes do painel de gravação o importam deste módulo. */
export { isAdmin };

/* ── o tipo, conferido pelo conteúdo ───────────────────────────────────────
 * O `Content-Type` do envio é o que o navegador declara, e cada um declara
 * de um jeito (`audio/x-m4a`, `video/mp4`, `audio/mp4;codecs=mp4a.40.2`).
 * O tipo guardado é o normalizado, e só é aceito se os primeiros bytes
 * batem com ele: o que sai daqui é servido com esse tipo para todo aluno. */
const APELIDOS = {
  'audio/mp4': 'audio/mp4', 'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4',
  'video/mp4': 'audio/mp4', 'audio/aac': 'audio/aac', 'audio/x-aac': 'audio/aac',
  'audio/wav': 'audio/wav', 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav',
  'audio/webm': 'audio/webm', 'video/webm': 'audio/webm', 'audio/ogg': 'audio/ogg'
};

export const normalizarTipo = t =>
  APELIDOS[String(t || '').split(';')[0].trim().toLowerCase()] || null;

const ascii = (b, de, ate) => String.fromCharCode(...b.subarray(de, ate));

export function conteudoBate(tipo, b) {
  if (b.length < 12) return false;
  switch (tipo) {
    case 'audio/mp4': return ascii(b, 4, 8) === 'ftyp';
    case 'audio/aac': return b[0] === 0xff && (b[1] & 0xf0) === 0xf0;
    case 'audio/wav': return ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE';
    case 'audio/webm': return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    case 'audio/ogg': return ascii(b, 0, 4) === 'OggS';
    default: return false;
  }
}

const inteiroOuNulo = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 60_000 ? n : null;
};

/* O D1 devolve BLOB como ArrayBuffer ou, em versões antigas do runtime, como
   lista de números. Os dois viram bytes. */
const bytesDe = v => (v instanceof Uint8Array ? v : new Uint8Array(v));

/* ── o manifesto: quais clipes o painel gravou ─────────────────────────────
 * Público de propósito: é uma lista de ids opacos, sem som e sem texto. O
 * curso lê no início para saber que um item ganhou áudio depois da build -
 * senão o botão "Ouvir" e os exercícios de escuta só apareceriam na próxima
 * publicação. Uma falha do banco devolve a lista vazia: o curso continua com
 * os clipes do git, que é exatamente o estado antes do painel existir. */
export async function manifesto({ env }) {
  let linhas = [];
  try {
    const r = await env.DB.prepare(
      'SELECT audio_id, inicio_ms, fim_ms, atualizado_em FROM gravacoes'
    ).all();
    linhas = r.results || [];
  } catch (e) {
    console.error('audio manifest', e && e.stack || e);
  }
  const clips = {};
  for (const l of linhas) clips[l.audio_id] = [l.atualizado_em, l.inicio_ms, l.fim_ms];
  return json({ clips }, 200, { 'Cache-Control': 'no-store' });
}

/* ── servir o som ──────────────────────────────────────────────────────────
 * `null` quando o painel não tem gravação desse id: o Worker segue para o
 * arquivo do git. O Safari só toca mídia de servidor que responde a `Range`
 * (ele pede `bytes=0-1` antes de tudo), então os pedidos parciais saem 206;
 * a conta vive em lib/range.js, que também fatia os mp3 do git. */
export async function servir(request, env, audioId) {
  if (!ID_RE.test(audioId)) return null;
  const linha = await env.DB.prepare(
    'SELECT tipo, dados, atualizado_em FROM gravacoes WHERE audio_id = ?'
  ).bind(audioId).first();
  if (!linha) return null;

  return responderRange(request, bytesDe(linha.dados), {
    'Content-Type': linha.tipo,
    'ETag': `"${audioId}-${linha.atualizado_em}"`
  });
}

/* ── o painel ──────────────────────────────────────────────────────────── */

/** O catálogo inteiro, com o nome organizado de cada item e o que já foi gravado. */
export async function lista({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const r = await env.DB.prepare(
    'SELECT audio_id, tipo, tamanho, inicio_ms, fim_ms, duracao_ms, autor, atualizado_em, pendente FROM gravacoes'
  ).all();
  const gravacoes = {};
  for (const l of r.results || []) {
    gravacoes[l.audio_id] = {
      tipo: l.tipo, tamanho: l.tamanho, inicio: l.inicio_ms, fim: l.fim_ms,
      duracao: l.duracao_ms, autor: l.autor, em: l.atualizado_em, pendente: !!l.pendente,
      arquivo: `${NOMES[l.audio_id]}.${EXTENSAO[l.tipo] || 'bin'}`
    };
  }
  const catalogo = CLIPES.map(c => ({
    id: idDoClipe(c), num: c.num, he: c.he, translit: c.translit, gloss: c.gloss,
    kind: c.kind, where: c.where, nome: NOMES[idDoClipe(c)]
  }));
  return json({ catalogo, gravacoes }, 200, { 'Cache-Control': 'no-store' });
}

/** Grava ou substitui. O corpo é o arquivo de áudio, cru. */
export async function salvar({ request, env }) {
  const { account, erro } = await exigirAdmin(request, env);
  if (erro) return erro;

  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (!ID_RE.test(id) || !IDS.has(id)) return fail('unknown-clip', 404);

  const tipo = normalizarTipo(request.headers.get('Content-Type'));
  if (!tipo) return fail('unsupported-type', 415);

  const dados = await readBytes(request, MAX_BYTES);
  if (!dados) return fail('too-large', 413);
  if (!conteudoBate(tipo, dados)) return fail('bad-audio', 422);

  const inicio = inteiroOuNulo(url.searchParams.get('inicio'));
  const fim = inteiroOuNulo(url.searchParams.get('fim'));
  const duracao = inteiroOuNulo(url.searchParams.get('duracao'));
  const corte = inicio !== null && fim !== null && fim > inicio;
  const agora = Date.now();

  await env.DB.prepare(
    `INSERT INTO gravacoes (audio_id, tipo, dados, tamanho, inicio_ms, fim_ms, duracao_ms, autor, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(audio_id) DO UPDATE SET tipo = excluded.tipo, dados = excluded.dados,
       tamanho = excluded.tamanho, inicio_ms = excluded.inicio_ms, fim_ms = excluded.fim_ms,
       duracao_ms = excluded.duracao_ms, autor = excluded.autor, atualizado_em = excluded.atualizado_em,
       pendente = 0`
  ).bind(id, tipo, dados, dados.length, corte ? inicio : null, corte ? fim : null,
    duracao, normalizeEmail(account.email), agora).run();

  return json({
    ok: true, id, tipo, tamanho: dados.length, em: agora,
    arquivo: `${NOMES[id]}.${EXTENSAO[tipo]}`
  });
}

/** Remove a gravação do painel. Se houver arquivo do estúdio no git, ele volta a tocar. */
export async function apagar({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return fail('unknown-clip', 404);
  await env.DB.prepare('DELETE FROM gravacoes WHERE audio_id = ?').bind(id).run();
  return json({ ok: true, id });
}

/** Marca (ou desmarca) uma gravação para regravar: `{ id, pendente }`.
    Só gravação do painel; o aluno continua ouvindo a que existe até a nova
    ser salva, e salvar tira a marca (migração 0005). */
export async function pendente({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const b = await readJson(request, 1024);
  const id = typeof b?.id === 'string' ? b.id : '';
  if (!ID_RE.test(id) || !IDS.has(id)) return fail('unknown-clip', 404);
  const marca = b?.pendente === false ? 0 : 1;
  const r = await env.DB.prepare('UPDATE gravacoes SET pendente = ? WHERE audio_id = ?').bind(marca, id).run();
  if (!r.meta || !r.meta.changes) return fail('not-recorded', 404);
  return json({ ok: true, id, pendente: !!marca });
}

/** O arquivo guardado, para o painel ouvir - ou baixar com o nome
    organizado (`alef.mp4`) quando pedido com `&baixar=1`. */
export async function arquivo({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return fail('unknown-clip', 404);
  const linha = await env.DB.prepare('SELECT tipo, dados FROM gravacoes WHERE audio_id = ?').bind(id).first();
  if (!linha) return fail('not-found', 404);
  const nome = `${NOMES[id] || id}.${EXTENSAO[linha.tipo] || 'bin'}`;
  const baixar = new URL(request.url).searchParams.get('baixar') === '1';
  return new Response(bytesDe(linha.dados), {
    headers: {
      'Content-Type': linha.tipo,
      'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${nome}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}

/* O cache dos clipes (auditoria de 01/10/2026, PERF-008). Cada toque em
   "ouvir" era um pedido ao Worker com 4 ou 5 leituras do D1 e saía
   `no-store`: um clipe já ouvido em outra aula era baixado e conferido de
   novo. Agora um dia no navegador do aluno, e SÓ nele: `private` proíbe
   cache compartilhado, `Vary: Cookie` não reaproveita o clipe para outro
   cookie, e o primeiro pedido continua passando pelo portão. Gravação
   substituída no painel muda o `?v=` do endereço (lib/audio-registro.ts),
   então o cache nunca toca a versão velha. Só respostas de áudio (200, 206
   e 304): o 302 e o 403 do portão continuam `no-store`. */
export const CACHE_DO_CLIPE = 'private, max-age=86400';
export function clipeComCache(path, status) {
  return /^\/audio\/he-[0-9a-f]{8}\.mp3$/.test(path) && (status === 200 || status === 206 || status === 304);
}

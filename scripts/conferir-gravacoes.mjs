/* Conferir as gravações feitas pelo painel (/admin/gravar) - só leitura.
 * ─────────────────────────────────────────────────────────────────────────
 * O painel avisa na hora quando uma gravação sai baixa ou estourada, mas
 * depois de 42 falas ninguém lembra qual passou raspando. Isto lê do banco
 * cada gravação de um grupo do catálogo (data/audio.json) e mede, no trecho
 * que o curso toca (o corte `inicio_ms`-`fim_ms`):
 *
 *   · se existe;
 *   · a duração e o ritmo (segundos por sílaba, pela contagem de vogais);
 *   · o volume médio e o pico (baixo demais, ou estourado);
 *   · pausas longas no meio (a frase pode ter sido gravada em duas vezes);
 *   · voz logo FORA do corte (o corte pode ter comido o começo ou o fim).
 *
 * Nada é escrito no banco e nenhum som sai daqui: o resumo da execução
 * mostra só o texto do curso e os números, mesmo o repositório sendo
 * privado. O `autor` da gravação (um e-mail) nunca é lido.
 *
 *   GRUPO="leitura de revisão" node scripts/conferir-gravacoes.mjs
 *
 * Precisa do wrangler (npm ci na raiz), de CLOUDFLARE_API_TOKEN e do ffmpeg.
 */

import { readFileSync, writeFileSync, mkdtempSync, appendFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GRUPO = (process.env.GRUPO || 'leitura de revisão').trim().normalize('NFC');
const RESUMO = process.env.GITHUB_STEP_SUMMARY;
const say = s => { console.log(s); if (RESUMO) appendFileSync(RESUMO, s + '\n'); };

const clips = JSON.parse(readFileSync(new URL('../data/audio.json', import.meta.url))).clips
  .filter(c => (c.where?.[0] || '').normalize('NFC').startsWith(GRUPO));
if (!clips.length) { say(`Nenhum item do catálogo começa com "${GRUPO}".`); process.exit(1); }

const ID_RE = /^[a-z0-9-]+$/;
const idDe = c => String(c.file || '').replace(/\.mp3$/, '');

function consulta(sql) {
  const out = execFileSync(process.env.WRANGLER || 'node_modules/.bin/wrangler',
    ['d1', 'execute', 'hebreo-fluido', '--remote', '--json', '--command', sql],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
  return JSON.parse(out)[0]?.results ?? [];
}

/* O ffmpeg escreve as medições no stderr. */
const medida = (arquivo, de, ate, filtro) => {
  const args = ['-hide_banner', '-nostats', '-ss', String(Math.max(0, de)),
    ...(ate != null ? ['-to', String(ate)] : []), '-i', arquivo, '-af', filtro, '-f', 'null', '-'];
  return spawnSync('ffmpeg', args, { encoding: 'utf8' }).stderr || '';
};
/* Que parte do trecho fica a 90% do pico, ou mais. Voz limpa encosta no
   próprio pico só por um instante (perto de 0,02% das amostras); voz que
   estourou fica com o topo da onda achatado, lá em cima por muito mais tempo
   (0,15% ou mais, medido com voz real estourada de 5 dB e recomprimida em
   AAC, que é como o painel guarda). Pico perto de 0 dB sozinho não diz nada. */
const noTopo = (arquivo, de, ate) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', String(Math.max(0, de)), '-to', String(ate),
    '-i', arquivo, '-ac', '1', '-f', 's16le', '-acodec', 'pcm_s16le', '-'], { maxBuffer: 64 * 1024 * 1024 });
  const b = r.stdout || Buffer.alloc(0);
  const n = Math.floor(b.length / 2);
  if (!n) return 0;
  let m = 0;
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(b.readInt16LE(i * 2)));
  let k = 0;
  for (let i = 0; i < n; i++) if (Math.abs(b.readInt16LE(i * 2)) >= 0.9 * m) k++;
  return (100 * k) / n;
};
const num = (txt, re) => { const m = txt.match(re); return m ? Number(m[1]) : null; };
const duracaoDoArquivo = arquivo => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo], { encoding: 'utf8' });
  return Number(r.stdout.trim()) || null;
};

const silabas = he => (he.normalize('NFD').match(/[ְ-ׇֻ]|וּ|וֹ/g) || [])
  .filter(v => v !== 'ְ').length || 1;

const pasta = mkdtempSync(join(tmpdir(), 'gravacoes-'));
const linhas = [];
let problemas = 0;

for (const c of clips) {
  const id = idDe(c);
  if (!ID_RE.test(id)) { linhas.push({ c, flags: ['id inválido no catálogo'] }); problemas++; continue; }
  const [r] = consulta(`SELECT tipo, inicio_ms, fim_ms, atualizado_em, hex(dados) AS hx FROM gravacoes WHERE audio_id = '${id}'`);
  if (!r) { linhas.push({ c, flags: ['SEM GRAVAÇÃO'] }); problemas++; continue; }
  const ext = /wav/.test(r.tipo) ? 'wav' : /webm/.test(r.tipo) ? 'webm' : 'm4a';
  const arquivo = join(pasta, `${id}.${ext}`);
  writeFileSync(arquivo, Buffer.from(r.hx, 'hex'));

  const total = duracaoDoArquivo(arquivo) ?? 0;
  const ini = r.inicio_ms != null ? r.inicio_ms / 1000 : 0;
  const fim = r.fim_ms != null ? r.fim_ms / 1000 : total;
  const dur = Math.max(0, fim - ini);
  const vol = medida(arquivo, ini, fim, 'volumedetect');
  const media = num(vol, /mean_volume:\s*(-?[\d.]+) dB/);
  const pico = num(vol, /max_volume:\s*(-?[\d.]+) dB/);
  const sil = medida(arquivo, ini, fim, 'silencedetect=noise=-40dB:d=0.7');
  const pausas = [...sil.matchAll(/silence_duration:\s*([\d.]+)/g)].map(m => Number(m[1]));
  /* 150 ms logo antes e logo depois do corte: voz ali é palavra cortada. */
  const antes = ini > 0.05 ? num(medida(arquivo, Math.max(0, ini - 0.15), ini, 'volumedetect'), /max_volume:\s*(-?[\d.]+) dB/) : null;
  const depois = fim < total - 0.05 ? num(medida(arquivo, fim, Math.min(total, fim + 0.15), 'volumedetect'), /max_volume:\s*(-?[\d.]+) dB/) : null;
  const ritmo = dur / silabas(c.he);

  const flags = [];
  if (media != null && media < -32) flags.push('baixo');
  const topo = noTopo(arquivo, ini, fim);
  if (pico != null && pico > -1 && topo >= 0.1) flags.push('estourado');
  else if (pico != null && pico > -1 && topo >= 0.05) flags.push('no limite');
  if (pausas.some(p => p > 1.0)) flags.push(`pausa de ${Math.max(...pausas).toFixed(1).replace('.', ',')} s no meio`);
  if (antes != null && pico != null && antes > pico - 12) flags.push('voz antes do corte');
  if (depois != null && pico != null && depois > pico - 12) flags.push('voz depois do corte');
  if (ritmo < 0.11) flags.push('rápido ou cortado');
  if (dur > 0.5 * silabas(c.he) + 1.0) flags.push('lento demais');
  if (flags.length) problemas++;
  linhas.push({ c, dur, ritmo, media, pico, topo, em: r.atualizado_em, flags });
}

const f1 = n => (n == null ? '-' : n.toFixed(1).replace('.', ','));
/* `atualizado_em` é Date.now() do Worker; mostrado no horário de Brasília. */
const quando = ms => (ms == null ? '-' : new Date(Number(ms) < 1e12 ? Number(ms) * 1000 : Number(ms))
  .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }));
const f2 = n => (n == null ? '-' : n.toFixed(2).replace('.', ','));
say(`## Gravações: ${GRUPO}`);
say('');
say(`${clips.length} itens · ${linhas.filter(l => !l.flags.includes('SEM GRAVAÇÃO')).length} gravados · ${problemas} para olhar`);
say('');
say('| # | Grupo | Leitura | Duração (s) | s/sílaba | Média (dB) | Pico (dB) | No topo (%) | Salva em | Atenção |');
say('|---|---|---|---|---|---|---|---|---|---|');
for (const l of linhas) {
  say(`| ${l.c.num} | ${l.c.where[0]} | ${l.c.translit ?? ''} | ${f1(l.dur)} | ${f2(l.ritmo)} | ${f1(l.media)} | ${f1(l.pico)} | ${l.topo == null ? '-' : l.topo.toFixed(3).replace('.', ',')} | ${quando(l.em)} | ${l.flags.join(', ') || 'ok'} |`);
}

/* As últimas gravações salvas no painel, de qualquer grupo: quando uma fala
   regravada não muda, é aqui que se vê onde a gravação foi parar. */
const porId = new Map(JSON.parse(readFileSync(new URL('../data/audio.json', import.meta.url))).clips.map(c => [idDe(c), c]));
const ultimas = consulta('SELECT audio_id, atualizado_em FROM gravacoes ORDER BY atualizado_em DESC LIMIT 8');
say('');
say('### As últimas 8 gravações salvas no painel');
say('');
say('| Salva em | Grupo | Leitura |');
say('|---|---|---|');
for (const u of ultimas) {
  const c = porId.get(u.audio_id);
  say(`| ${quando(u.atualizado_em)} | ${c?.where?.[0] ?? '(fora do catálogo)'} | ${c?.translit ?? u.audio_id} |`);
}

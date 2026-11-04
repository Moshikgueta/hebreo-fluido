/* Traz as gravações do painel (/admin/gravar) do banco para o git.
 * ─────────────────────────────────────────────────────────────────────────
 *   node tools/exportar-gravacoes.mjs            (no deploy-worker.yml, disparo manual com "exportar_gravacoes")
 *   node tools/exportar-gravacoes.mjs --ensaiar  (confere o tratamento, sem banco)
 *
 * O painel grava direto no D1 (tabela `gravacoes`), e o Worker já serve dali:
 * o aluno ouve na hora. Este script é a outra metade - leva cada gravação para
 * `audio/<id>.mp3`, no mesmo formato e acabamento dos clipes cortados do
 * estúdio, para que o curso tenha as gravações no repositório (cópia de
 * segurança, build que não depende do banco, e um lugar só para conferir).
 *
 * O TRATAMENTO é o do `cortar-audio`, com as mesmas medidas:
 *   · só o trecho da voz (`inicio_ms`/`fim_ms`, medido pelo painel);
 *   · mono ANTES de qualquer filtro (a lição da voz dobrada, 25/09/2026);
 *   · 80 ms de respiro antes, 220 ms depois, fade de 10 ms nas pontas;
 *   · volume médio em -20 dB, pico nunca acima de -1,5 dB;
 *   · MP3 de 96 kb/s, 44,1 kHz.
 *
 * Ler o banco: pelo `wrangler d1 execute --remote`, com a credencial do deploy
 * (CLOUDFLARE_API_TOKEN). O áudio sai do banco em hexadecimal, em lotes
 * pequenos: um lote grande estouraria o tamanho da resposta do D1.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const AUDIO = join(ROOT, 'audio');
/* O wrangler do package-lock.json da raiz quando `npm ci` rodou (SEC-A-009:
   as dependências dele vêm do lockfile, com hash); senão o npx, na mesma
   versão. */
const LOCAL = join(ROOT, 'node_modules', '.bin', 'wrangler');
const [CMD, ...BASE] = existsSync(LOCAL) ? [LOCAL] : ['npx', '--yes', 'wrangler@4.135.0'];
const WRANGLER = [...BASE, 'd1', 'execute', 'hebreo-fluido', '--remote', '--json', '--command'];
const LOTE = 4;

const PAD_HEAD_MS = 80;
const PAD_TAIL_S = 0.22;
const FADE_S = 0.01;
const TARGET_MEAN_DB = -20;
const PEAK_CEIL_DB = -1.5;
const MP3_KBPS = 96;

const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
/* O ffmpeg escreve as medidas no STDERR e sai com sucesso: o `2>&1` traz as duas. */
function medida(arquivo) {
  const saida = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostdin -i "${arquivo}" -af volumedetect -f null - 2>&1`], { encoding: 'utf8' });
  const mean = Number((saida.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)/) ?? [])[1] ?? TARGET_MEAN_DB);
  const peak = Number((saida.match(/max_volume:\s*(-?\d+(?:\.\d+)?)/) ?? [])[1] ?? 0);
  return { mean, peak };
}

const EXT = { 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg' };

/** Uma gravação do banco → o clipe pronto em `destino`. */
export function tratar(bruto, tipo, inicioMs, fimMs, destino) {
  const tmp = join(tmpdir(), `grav-${process.pid}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmp, { recursive: true });
  try {
    const entrada = join(tmp, `in.${EXT[tipo] || 'bin'}`);
    writeFileSync(entrada, bruto);
    /* O corte vai DENTRO da cadeia (atrim), e não como -ss/-to: depois do
       arquivo de entrada, -to limita a duração da SAÍDA, e cortava fora os
       respiros que o próprio filtro acrescenta - o ensaio pegou. */
    const corte = inicioMs != null && fimMs != null && fimMs > inicioMs
      ? [`atrim=start=${(inicioMs / 1000).toFixed(3)}:end=${(fimMs / 1000).toFixed(3)}`, 'asetpts=PTS-STARTPTS'] : [];
    const meio = join(tmp, 'meio.wav');
    ff(['-y', '-i', entrada, '-af',
      [...corte, 'aresample=44100', 'aformat=channel_layouts=mono', `adelay=${PAD_HEAD_MS}`, `apad=pad_dur=${PAD_TAIL_S}`].join(','),
      meio]);
    const { mean, peak } = medida(meio);
    const ganho = Math.min(TARGET_MEAN_DB - mean, PEAK_CEIL_DB - peak);
    const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', meio], { encoding: 'utf8' }).trim()) || 1;
    ff(['-y', '-i', meio, '-af',
      `volume=${ganho.toFixed(2)}dB,afade=t=in:d=${FADE_S},afade=t=out:st=${Math.max(0, dur - FADE_S).toFixed(3)}:d=${FADE_S}`,
      '-ac', '1', '-ar', '44100', '-b:a', `${MP3_KBPS}k`, destino]);
    return { ganho, dur };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function sql(consulta) {
  const saida = execFileSync(CMD, [...WRANGLER, consulta], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const json = JSON.parse(saida.slice(saida.indexOf('[')));
  return json[0]?.results ?? [];
}

function exportar() {
  const lista = sql('SELECT audio_id, tipo, inicio_ms, fim_ms, tamanho, atualizado_em FROM gravacoes ORDER BY audio_id');
  console.log(`\n  ${lista.length} gravação(ões) no painel\n`);
  mkdirSync(AUDIO, { recursive: true });
  let feitos = 0;
  const falhas = [];
  for (let i = 0; i < lista.length; i += LOTE) {
    const lote = lista.slice(i, i + LOTE);
    const ids = lote.map(r => `'${String(r.audio_id).replace(/[^a-z0-9-]/g, '')}'`).join(',');
    const dados = new Map(sql(`SELECT audio_id, hex(dados) AS h FROM gravacoes WHERE audio_id IN (${ids})`).map(r => [r.audio_id, r.h]));
    for (const r of lote) {
      try {
        const bruto = Buffer.from(dados.get(r.audio_id) || '', 'hex');
        if (!bruto.length) throw new Error('sem dados');
        tratar(bruto, r.tipo, r.inicio_ms, r.fim_ms, join(AUDIO, `${r.audio_id}.mp3`));
        feitos++;
      } catch (e) {
        falhas.push(`${r.audio_id}: ${String(e.message || e).slice(0, 120)}`);
      }
    }
    console.log(`    ${Math.min(i + LOTE, lista.length)}/${lista.length}`);
  }
  console.log(`\n  ✓ ${feitos} clipe(s) em audio/`);
  if (falhas.length) {
    console.log(`  ✗ ${falhas.length} falha(s):\n    ${falhas.join('\n    ')}`);
    process.exitCode = 1;
  }
}

/* O ensaio: uma "gravação de celular" de mentira - estéreo, AAC num MP4,
   meio segundo de silêncio, 0,4 s de voz e silêncio depois - passa pelo
   tratamento e o clipe tem de sair mono, cortado, nivelado e sem voz dobrada
   (o respiro inicial em silêncio total). */
function ensaiar() {
  const tmp = join(tmpdir(), `ensaio-grav-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const mp4 = join(tmp, 'celular.m4a');
  ff(['-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo:d=0.5', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=0.4:sample_rate=48000',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo:d=0.6',
    '-filter_complex', '[1]pan=stereo|c0=c0|c1=c0,volume=-12dB[v];[0][v][2]concat=n=3:v=0:a=1[o]', '-map', '[o]', '-c:a', 'aac', mp4]);
  const saida = join(tmp, 'saida.mp3');
  const bruto = readFileSync(mp4);
  tratar(bruto, 'audio/mp4', 460, 960, saida);
  const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=channels:format=duration', '-of', 'csv=p=0', saida], { encoding: 'utf8' });
  const { mean } = medida(saida);
  const inicio = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostdin -i "${saida}" -af "atrim=0:0.06,volumedetect" -f null - 2>&1`], { encoding: 'utf8' });
  const respiro = Number((inicio.match(/max_volume:\s*(-?\d+(?:\.\d+)?)/) ?? [])[1] ?? 0);
  const [canais, dur] = info.trim().split(/\s+/).map(Number);
  let falhas = 0;
  const conferir = (ok, msg) => { console.log(`  ${ok ? '✓' : '✗'} ${msg}`); if (!ok) falhas++; };
  conferir(canais === 1, `mono (${canais} canal)`);
  conferir(dur > 0.6 && dur < 0.95, `cortado no trecho da voz + respiros (${dur.toFixed(2)} s)`);
  conferir(Math.abs(mean - TARGET_MEAN_DB) < 4, `nivelado (${mean} dB, alvo ${TARGET_MEAN_DB})`);
  conferir(respiro < -50, `respiro inicial em silêncio, sem voz dobrada (${respiro} dB)`);
  rmSync(tmp, { recursive: true, force: true });
  process.exitCode = falhas ? 1 : 0;
}

if (process.argv.includes('--ensaiar')) ensaiar();
else exportar();


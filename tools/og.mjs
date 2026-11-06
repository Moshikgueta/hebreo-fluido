/* Os cartões de compartilhamento: app/public/media/og*.jpg, 1200x630.
   ─────────────────────────────────────────────────────────────────────────
   O site vai ser divulgado por link colado em conversa - WhatsApp, grupo de
   sinagoga, story, direct do Instagram. O que aparece ali é o cartão, e ele
   é a primeira impressão para muito mais gente do que a própria capa.

   Quatro cartões (23/10/2026, pedido do dono), um por porta de entrada:
   · og-portal.jpg  a capa, o portal das três jornadas (e o resto do site)
   · og-curso.jpg   o curso de alfabetização e as páginas dele
   · og-livro.jpg   o livro Israel Além do Óbvio, "Em breve"
   · og-previa.jpg  a prévia grátis do livro (/previa), o link do direct
   Qual cartão vai em qual rota: `ogDaRota` em app/src/lib/seo.ts. A prévia
   é montada pelo editorial (web.mjs --previa), que aponta para og-previa.jpg.

   Três decisões que continuam valendo:

   · É GERADO COM AS FONTES E AS CORES DO PRODUTO, num navegador de verdade -
     e não desenhado à parte, que é como um cartão fica diferente do site no
     mês seguinte. As faces são as mesmas de app/public/fonts.
   · O HEBRAICO É DESENHADO PELA FONTE, nunca por um gerador de imagem. A
     palavra é שָׁלוֹם, a única que um brasileiro reconhece antes de estudar, e
     a mesma do curso e da capa. Nenhum hebraico novo entra aqui.
   · PROMESSA NENHUMA QUE O SITE NÃO FAÇA. Os números saem do course.json, os
     nomes do livro saem do catálogo, e o livro aparece como o site o mostra:
     "Em breve", sem preço.

   Nome novo a cada cartão novo: /media sai com cache de um ano, e o
   WhatsApp e o Instagram guardam a imagem pelo endereço. O og.jpg antigo
   (o do curso, até 23/10/2026) fica no lugar para links já compartilhados.

   Só roda quando alguém pede. Os JPEGs ficam no repositório, porque o deploy
   não pode depender de um navegador para ter cartão.

   node tools/og.mjs  (da raiz) */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const raiz = new URL('..', import.meta.url);
const arq = (p) => new URL(p, raiz);
const b64 = (p) => readFileSync(arq(p)).toString('base64');

const curso = JSON.parse(readFileSync(arq('app/content/course.json'), 'utf8'));
const licoes = curso.modules.reduce((n, m) => n + m.lessons.length, 0);
const catalogo = JSON.parse(readFileSync(arq('data/courses.json'), 'utf8')).courses;
const livro = catalogo.find(c => c.slug === 'israel-alem-do-roteiro');
const subtitulo = String(livro.taglinePt).replace(/\.$/, '');

const FONTES = {
  display: 'app/public/fonts/bricolage-grotesque-latin-600-normal.woff2',
  displayBold: 'app/public/fonts/bricolage-grotesque-latin-700-normal.woff2',
  ui: 'app/public/fonts/instrument-sans-latin-500-normal.woff2',
  uiForte: 'app/public/fonts/instrument-sans-latin-600-normal.woff2',
  he: 'app/public/fonts/noto-serif-hebrew-hebrew-500-normal.woff2'
};

const BASE = `
  @font-face { font-family: D; src: url(data:font/woff2;base64,${b64(FONTES.display)}) format('woff2'); font-weight: 600 }
  @font-face { font-family: D; src: url(data:font/woff2;base64,${b64(FONTES.displayBold)}) format('woff2'); font-weight: 700 }
  @font-face { font-family: U; src: url(data:font/woff2;base64,${b64(FONTES.ui)}) format('woff2'); font-weight: 500 }
  @font-face { font-family: U; src: url(data:font/woff2;base64,${b64(FONTES.uiForte)}) format('woff2'); font-weight: 600 }
  @font-face { font-family: H; src: url(data:font/woff2;base64,${b64(FONTES.he)}) format('woff2') }

  :root { --navy:#0E3B43; --navy-2:#155059; --teal:#1F8A7D; --teal-lite:#8FD6C8; --teal-soft:#E3F2EF;
          --gold:#B8862F; --gold-soft:#F6ECD9; --sand:#F3F0E9; --cream:#FBF9F5; --line:#E4DFD3; --ink-muted:#5B6560 }
  * { margin:0; padding:0; box-sizing:border-box }
  body { width:1200px; height:630px; background:var(--cream); position:relative; overflow:hidden }
  .card { position:relative; height:100%; padding:64px 72px; display:flex; flex-direction:column; justify-content:space-between }

  .marca { display:flex; align-items:center; gap:14px }
  .selo  { width:52px; height:52px; border-radius:15px; background:var(--navy); display:grid; place-items:center }
  .selo span { font-family:H; font-size:30px; color:var(--teal-lite); line-height:1; margin-top:-2px }
  .marca b { font-family:D; font-weight:700; font-size:25px; letter-spacing:-.02em; color:var(--navy) }

  .palavra { text-align:center; background:rgba(255,255,255,.72); border:1px solid var(--line);
             border-radius:22px; padding:20px 34px 18px }
  .palavra .he { font-family:H; font-size:62px; line-height:1.25; color:var(--navy); display:block }
  .palavra .tr { font-family:U; font-size:19px; color:var(--teal); display:block; margin-top:2px }
  .palavra .pt { font-family:U; font-size:19px; color:var(--ink-muted); display:block }
`;

const marca = (cor = '', nome = 'Hebraico Fluente') => `<div class="marca"><span class="selo"><span>ע</span></span><b${cor ? ` style="color:${cor}"` : ''}>${nome}</b></div>`;
const shalom = `<div class="palavra"><span class="he" lang="he" dir="rtl">שָׁלוֹם</span><span class="tr">shalóm</span><span class="pt">olá · paz</span></div>`;
/* O mesmo quadro no cartão em inglês: a transliteração do site de fora (sem
   acento) e o sentido em inglês. */
const shalomEn = `<div class="palavra"><span class="he" lang="he" dir="rtl">שָׁלוֹם</span><span class="tr">shalom</span><span class="pt">hello · peace</span></div>`;
const shalomEs = `<div class="palavra"><span class="he" lang="he" dir="rtl">שָׁלוֹם</span><span class="tr">shalóm</span><span class="pt">hola · paz</span></div>`;
const foto = `.foto { position:absolute; inset:0; background:url(data:image/webp;base64,${b64('app/public/media/hero.webp')}) 68% 50% / cover; opacity:.5 }
  .veu  { position:absolute; inset:0; background:linear-gradient(95deg, var(--cream) 0%, rgba(251,249,245,.97) 34%,
          rgba(251,249,245,.7) 54%, rgba(251,249,245,.4) 78%, rgba(251,249,245,.62) 100%) }`;

/* A arte do livro: um sol e três faixas de paisagem, desenhados aqui, nas
   cores do site. Não é a capa do editorial (que é privado): é a mesma ideia,
   num desenho próprio, sem hebraico nem mapa. */
const paisagem = `<svg class="arte" viewBox="0 0 1200 630" aria-hidden="true">
  <circle cx="960" cy="250" r="118" fill="#B8862F"/>
  <circle cx="960" cy="250" r="160" fill="none" stroke="#B8862F" stroke-opacity=".35" stroke-width="2"/>
  <circle cx="960" cy="250" r="206" fill="none" stroke="#B8862F" stroke-opacity=".18" stroke-width="2"/>
  <path d="M0 380 C240 340 440 372 640 350 C860 326 1040 362 1200 340 L1200 630 L0 630 Z" fill="#1F8A7D"/>
  <path d="M0 450 C280 420 520 462 760 438 C960 418 1080 440 1200 430 L1200 630 L0 630 Z" fill="#155059"/>
  <path d="M0 530 C320 506 600 540 840 520 C1000 506 1120 518 1200 514 L1200 630 L0 630 Z" fill="#0E3B43" fill-opacity=".85"/>
</svg>`;

const CARTOES = [
  {
    arquivo: 'og-portal.jpg',
    css: `${foto}
      h1 { font-family:D; font-weight:700; font-size:64px; line-height:1.05; letter-spacing:-.035em; color:var(--navy); max-width:17ch }
      .pe { display:flex; align-items:flex-end; justify-content:space-between; gap:40px }
      .jornadas { display:flex; flex-wrap:wrap; gap:10px; max-width:640px }
      .jornadas span { font-family:U; font-weight:600; font-size:21px; padding:10px 18px; border-radius:999px }
      .j1 { background:var(--teal-soft); color:#17675D } .j2 { background:var(--gold-soft); color:#7A5717 } .j3 { background:var(--sand); color:var(--navy); border:1px solid var(--line) }`,
    corpo: `<div class="foto"></div><div class="veu"></div>
      <div class="card">
        ${marca()}
        <h1>Aprenda a ler hebraico. Depois, descubra Israel e as raízes sefarditas.</h1>
        <div class="pe">
          <div class="jornadas"><span class="j1">Aprender hebraico</span><span class="j2">Descobrir Israel</span><span class="j3">Raízes sefarditas</span></div>
          ${shalom}
        </div>
      </div>`
  },
  {
    arquivo: 'og-curso.jpg',
    css: `${foto}
      h1 { font-family:D; font-weight:700; font-size:74px; line-height:1.03; letter-spacing:-.035em; color:var(--navy); max-width:15ch }
      .pe { display:flex; align-items:flex-end; justify-content:space-between; gap:40px }
      .fatos { font-family:U; font-size:23px; color:var(--ink-muted); display:flex; gap:14px; align-items:center }
      .fatos i { width:4px; height:4px; border-radius:50%; background:var(--line); display:block }`,
    corpo: `<div class="foto"></div><div class="veu"></div>
      <div class="card">
        ${marca()}
        <h1>Aprenda a ler hebraico do zero.</h1>
        <div class="pe">
          <div class="fatos"><span>${licoes} lições</span><i></i><span>${curso.letters.length} letras</span><i></i><span>feito para brasileiros</span></div>
          ${shalom}
        </div>
      </div>`
  },
  /* O cartão do site em inglês (PLANO-INGLES.md, etapa 7): o mesmo desenho
     do og-curso, com o texto em inglês. É o único do site de fora, que só
     vende o curso (`ogDaRota` em app/src/lib/seo.ts). */
  {
    arquivo: 'og-curso-en.jpg',
    lang: 'en',
    css: `${foto}
      h1 { font-family:D; font-weight:700; font-size:74px; line-height:1.03; letter-spacing:-.035em; color:var(--navy); max-width:15ch }
      .pe { display:flex; align-items:flex-end; justify-content:space-between; gap:40px }
      .fatos { font-family:U; font-size:23px; color:var(--ink-muted); display:flex; gap:14px; align-items:center }
      .fatos i { width:4px; height:4px; border-radius:50%; background:var(--line); display:block }`,
    corpo: `<div class="foto"></div><div class="veu"></div>
      <div class="card">
        ${marca()}
        <h1>Learn to read Hebrew from zero.</h1>
        <div class="pe">
          <div class="fatos"><span>${licoes} lessons</span><i></i><span>${curso.letters.length} letters</span><i></i><span>at your own pace</span></div>
          ${shalomEn}
        </div>
      </div>`
  },
  /* O do site em espanhol (PLANO-ESPANHOL.md, 04/11/2026): o mesmo desenho, o texto em espanhol.
     Com a marca Hebreo Fluido desde 06/11/2026 (decisão do dono), num arquivo de nome novo:
     /media sai com cache de um ano. */
  {
    arquivo: 'og-hebreo-fluido.jpg',
    lang: 'es',
    css: `${foto}
      h1 { font-family:D; font-weight:700; font-size:74px; line-height:1.03; letter-spacing:-.035em; color:var(--navy); max-width:15ch }
      .pe { display:flex; align-items:flex-end; justify-content:space-between; gap:40px }
      .fatos { font-family:U; font-size:23px; color:var(--ink-muted); display:flex; gap:14px; align-items:center }
      .fatos i { width:4px; height:4px; border-radius:50%; background:var(--line); display:block }`,
    corpo: `<div class="foto"></div><div class="veu"></div>
      <div class="card">
        ${marca('', 'Hebreo Fluido')}
        <h1>Aprende a leer hebreo desde cero.</h1>
        <div class="pe">
          <div class="fatos"><span>${licoes} lecciones</span><i></i><span>${curso.letters.length} letras</span><i></i><span>a tu ritmo</span></div>
          ${shalomEs}
        </div>
      </div>`
  },
  ...[['og-livro.jpg', 'Em breve'], ['og-previa.jpg', 'Prévia grátis']].map(([arquivo, selo]) => ({
    arquivo,
    css: `body { background:var(--navy) }
      .arte { position:absolute; inset:0; width:1200px; height:630px }
      .selo { background:rgba(255,255,255,.08); box-shadow:inset 0 0 0 1.5px rgba(143,214,200,.55) }
      .sombra { position:absolute; inset:0; background:linear-gradient(90deg, var(--navy) 0%, var(--navy) 38%, rgba(14,59,67,.6) 52%, rgba(14,59,67,0) 70%) }
      .titulo { display:grid; gap:6px }
      .t1 { font-family:D; font-weight:700; font-size:112px; line-height:.95; letter-spacing:-.02em; color:#fff }
      .t2 { font-family:D; font-weight:600; font-size:50px; line-height:1; letter-spacing:.01em; color:#E2B864; text-transform:uppercase }
      .sub { font-family:U; font-size:26px; color:#E9DCC0; margin-top:14px; max-width:22ch; line-height:1.3 }
      .pe { display:flex; align-items:center; gap:18px }
      .selo-livro { font-family:U; font-weight:600; font-size:22px; color:var(--navy); background:#E2B864; padding:10px 20px; border-radius:999px }
      .autor { font-family:U; font-weight:600; font-size:20px; letter-spacing:.14em; text-transform:uppercase; color:#E9DCC0 }`,
    corpo: `${paisagem}<div class="sombra"></div>
      <div class="card">
        ${marca('#fff')}
        <div class="titulo">
          <span class="t1">ISRAEL</span>
          <span class="t2">Além do Óbvio</span>
          <span class="sub">${subtitulo}.</span>
        </div>
        <div class="pe"><span class="selo-livro">${selo}</span><span class="autor">${livro.autorPt}</span></div>
      </div>`
  }))
];

const navegador = await chromium.launch({ executablePath: process.env.HF_CHROMIUM || undefined });
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
mkdirSync(new URL('app/public/media/', raiz), { recursive: true });
/* `node tools/og.mjs og-curso-en.jpg` refaz só os cartões pedidos. */
const pedidos = process.argv.slice(2);
for (const c of CARTOES.filter(c => !pedidos.length || pedidos.includes(c.arquivo))) {
  await pagina.setContent(`<!doctype html><html lang="${c.lang || 'pt-BR'}"><head><meta charset="utf-8"><style>${BASE}\n${c.css}</style></head><body>${c.corpo}</body></html>`, { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(250);
  /* JPEG, e não PNG: um décimo do tamanho. O WhatsApp busca esta imagem
     antes de desenhar a prévia, e uma prévia que demora não aparece. */
  const jpg = await pagina.screenshot({ type: 'jpeg', quality: 90 });
  writeFileSync(arq(`app/public/media/${c.arquivo}`), jpg);
  console.log(`app/public/media/${c.arquivo}  1200x630  ${(jpg.length / 1024).toFixed(1)} KB`);
}
await navegador.close();
console.log(`(${licoes} lições · ${curso.letters.length} letras, lidos do course.json; o livro, do catálogo)`);

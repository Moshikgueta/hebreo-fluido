/* A camada de acessibilidade, num navegador de verdade.
   ─────────────────────────────────────────────────────────────────────────
   Um teste de unidade prova que o atributo é carimbado. Ele não prova a
   única coisa que importa para o leitor: que a TELA muda. Entre o atributo
   e o pixel há a cascata do Tailwind, o `@layer base`, um seletor escrito
   errado e um `zoom` que o navegador pode ignorar - e nenhum desses aparece
   em teste nenhum que não abra um navegador.

   Então aqui tudo é medido no computado:

     · o botão existe em toda página, e é alcançável pelo teclado;
     · 150% muda o tamanho renderizado de um parágrafo de verdade;
     · o alto contraste muda a cor da tinta, e o que sai passa 7:1;
     · o espaçamento maior muda a entrelinha do português e NÃO mexe no
       hebraico (que é a regra que mais custa se quebrar calado);
     · menos animação zera a duração;
     · a preferência atravessa a navegação, que é para o que serve o script
       de arranque;
     · e nada disso faz a página rolar de lado num telefone.

   Precisa do `out/` construído. node a11y.mjs (de dentro de app/). */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { EM_ESPANHOL, EM_INGLES, OUT } from './saida.mjs';
/* Os nomes dos controles, nos dois idiomas da build (dicionários
   conta-botao-acessibilidade.ts e conta-plataforma-pecas.ts). */
const R = EM_INGLES
  ? { ajustes: 'Accessibility settings', ajustesRe: /Accessibility settings/, contraste: 'More contrast',
      espaco: 'More space between lines', movimento: 'Less animation', normal: 'Reset to default',
      links: 'Underline links', mostrar: 'Show password', ocultar: 'Hide password' }
  /* O espanhol (04/11/2026): os mesmos botões, com o texto do dicionário. */
  : EM_ESPANHOL
  ? { ajustes: 'Ajustes de accesibilidad', ajustesRe: /Ajustes de accesibilidad/, contraste: 'Más contraste',
      espaco: 'Más espacio entre líneas', movimento: 'Menos animación', normal: 'Volver a lo normal',
      links: 'Subrayar enlaces', mostrar: 'Mostrar contraseña', ocultar: 'Ocultar contraseña' }
  : { ajustes: 'Ajustes de acessibilidade', ajustesRe: /Ajustes de acessibilidade/, contraste: 'Mais contraste',
      espaco: 'Mais espaço entre linhas', movimento: 'Menos animação', normal: 'Voltar ao normal',
      links: 'Sublinhar links', mostrar: 'Mostrar senha', ocultar: 'Ocultar senha' };


const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg', '.txt': 'text/plain'
};

const servidor = createServer((req, res) => {
  const limpo = decodeURIComponent(req.url.split('?')[0]);
  for (const f of [`${OUT}${limpo}`, `${OUT}${limpo}/index.html`, `${OUT}${limpo}.html`, `${OUT}/404.html`]) {
    if (!existsSync(f) || f.endsWith('/')) continue;
    try {
      const corpo = readFileSync(f);
      res.writeHead(f.endsWith('404.html') ? 404 : 200,
        { 'Content-Type': TIPOS[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream' });
      return res.end(corpo);
    } catch { /* diretório */ }
  }
  res.writeHead(404); res.end('404');
});
await new Promise(r => servidor.listen(4573, r));
const BASE = 'http://localhost:4573';

let falhas = 0;
const ok = m => console.log(`  ✓ ${m}`);
const erro = m => { console.log(`  ✗ ${m}`); falhas++; };
const conferir = (cond, m) => (cond ? ok(m) : erro(m));

/* ── contraste, pela fórmula da WCAG ─────────────────────────────────── */
const canal = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luz = rgb => {
  const [r, g, b] = rgb.map(v => canal(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a, b) => {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const rgb = css => (css.match(/\d+/g) || []).slice(0, 3).map(Number);

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage();

const abrirPainel = async p => {
  await p.getByRole('button', { name: R.ajustesRe }).click();
  await p.getByRole('dialog', { name: R.ajustes }).waitFor();
};
const atributo = (p, nome) => p.evaluate(n => document.documentElement.getAttribute(n), nome);

console.log('\n── o botão ───────────────────────────────────');

/* Em toda página, e não só na capa: quem precisa do recurso precisa dele na
   lição. As duas cascas (site e plataforma) têm de carregá-lo. */
for (const rota of ['/', '/curso-de-hebraico/', '/faq/', '/entrar/', '/meu-hebraico/']) {
  await pg.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
  const n = await pg.getByRole('button', { name: R.ajustesRe }).count();
  conferir(n === 1, `${rota.padEnd(24)} tem o botão (${n})`);
}

await pg.goto(`${BASE}/`, { waitUntil: 'networkidle' });

/* Alvo de toque: 44px é o mínimo da WCAG 2.5.8, e um botão de acessibilidade
   abaixo disso seria uma piada de mau gosto. */
const caixa = await pg.getByRole('button', { name: R.ajustesRe }).boundingBox();
conferir(caixa.width >= 44 && caixa.height >= 44,
  `alvo de toque ${Math.round(caixa.width)}x${Math.round(caixa.height)}px`);

/* O atalho que o painel anuncia tem de funcionar - anunciar um atalho morto
   é pior do que não ter atalho. */
await pg.keyboard.press('Alt+Shift+A');
conferir(await pg.getByRole('dialog', { name: R.ajustes }).isVisible(),
  'Alt+Shift+A abre o painel');
await pg.keyboard.press('Escape');
conferir(await pg.getByRole('dialog', { name: R.ajustes }).count() === 0,
  'Esc fecha');

console.log('\n── tamanho do texto ──────────────────────────');

const alvoTexto = pg.locator('#conteudo p').first();
const antes = await alvoTexto.evaluate(el => el.getBoundingClientRect().height);
await abrirPainel(pg);
await pg.getByRole('button', { name: '150%', exact: true }).click();
conferir(await atributo(pg, 'data-a11y-texto') === '150', 'o atributo vai para 150');
const depois = await alvoTexto.evaluate(el => el.getBoundingClientRect().height);
conferir(depois > antes * 1.3,
  `o parágrafo cresce de verdade: ${Math.round(antes)}px → ${Math.round(depois)}px`);

/* E o botão NÃO cresce junto: ele mora fora do contêiner com zoom, senão em
   150% sai da tela e prende a pessoa no ajuste que acabou de fazer. */
const caixa150 = await pg.getByRole('button', { name: R.ajustesRe }).boundingBox();
conferir(Math.abs(caixa150.width - caixa.width) < 2,
  `o botão fica do mesmo tamanho (${Math.round(caixa150.width)}px)`);
conferir(caixa150.x + caixa150.width <= 1280 && caixa150.y + caixa150.height <= 900,
  'e continua dentro da tela');

console.log('\n── a preferência atravessa a navegação ───────');

await pg.goto(`${BASE}/faq/`, { waitUntil: 'domcontentloaded' });
conferir(await atributo(pg, 'data-a11y-texto') === '150',
  'outra página já abre em 150% (script de arranque)');

console.log('\n── mais contraste ────────────────────────────');

/* O `domcontentloaded` acima é de propósito (o carimbo vem antes do React),
   mas o botão só responde depois da hidratação: um clique antes dela se
   perde, e no runner lento do CI isso derrubou a publicação do PR #41. */
await pg.waitForLoadState('networkidle');
await abrirPainel(pg);
await pg.getByRole('button', { name: '100%', exact: true }).click();
await pg.getByLabel(R.contraste).check();
conferir(await atributo(pg, 'data-a11y-contraste') === 'alto', 'o atributo é carimbado');

const corpo = pg.locator('#conteudo p').first();
const tinta = rgb(await corpo.evaluate(el => getComputedStyle(el).color));
const fundo = rgb(await pg.evaluate(() => getComputedStyle(document.body).backgroundColor));
const r = razao(tinta, fundo);
conferir(r >= 7, `texto do corpo a ${r.toFixed(1)}:1 sobre o papel (AAA pede 7)`);

console.log('\n── mais espaço, e o hebraico intocado ────────');

await pg.goto(`${BASE}/biblia/`, { waitUntil: 'networkidle' });
const pt = pg.locator('#conteudo p').first();
const he = pg.locator('.he').first();
const temHe = await he.count() > 0;
const entrelinhaAntes = await pt.evaluate(el => getComputedStyle(el).lineHeight);
const espacoHeAntes = temHe ? await he.evaluate(el => getComputedStyle(el).letterSpacing) : null;

await abrirPainel(pg);
await pg.getByLabel(R.espaco).check();
await pg.keyboard.press('Escape');

const entrelinhaDepois = await pt.evaluate(el => getComputedStyle(el).lineHeight);
conferir(parseFloat(entrelinhaDepois) > parseFloat(entrelinhaAntes),
  `a entrelinha do português cresce: ${entrelinhaAntes} → ${entrelinhaDepois}`);

if (temHe) {
  const espacoHeDepois = await he.evaluate(el => getComputedStyle(el).letterSpacing);
  /* A regra mais cara de quebrar calado: letter-spacing no hebraico desloca
     o sinal de vogal para fora da consoante, e num curso que ensina a LER
     esses sinais isso é conteúdo errado, não tela feia. */
  conferir(espacoHeDepois === espacoHeAntes,
    `o hebraico mantém o espaçamento (${espacoHeDepois})`);
} else {
  erro('não achei hebraico em /biblia/ para conferir');
}

console.log('\n── menos animação ────────────────────────────');

await abrirPainel(pg);
await pg.getByLabel(R.movimento).check();
await pg.keyboard.press('Escape');
const dur = await pg.evaluate(() => {
  const el = document.querySelector('#conteudo a, #conteudo button');
  return el ? getComputedStyle(el).transitionDuration : null;
});
conferir(dur !== null && parseFloat(dur) < 0.01, `transição zerada (${dur})`);

console.log('\n── voltar ao normal ──────────────────────────');

await abrirPainel(pg);
await pg.getByRole('button', { name: R.normal }).click();
const sobrou = await pg.evaluate(() =>
  [...document.documentElement.attributes].map(a => a.name).filter(n => n.startsWith('data-a11y')));
conferir(sobrou.length === 0, `nenhum atributo sobra (${sobrou.join(', ') || 'limpo'})`);

console.log('\n── num telefone, com tudo ligado ─────────────');

const cel = await ctx.newPage();
await cel.setViewportSize({ width: 390, height: 844 });
await cel.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await abrirPainel(cel);
await cel.getByRole('button', { name: '150%', exact: true }).click();
await cel.getByLabel(R.contraste).check();
await cel.getByLabel(R.espaco).check();
await cel.getByLabel(R.links).check();
await cel.keyboard.press('Escape');
await cel.waitForTimeout(400);

const rolaDeLado = await cel.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
conferir(!rolaDeLado, 'a página não rola de lado');

const botaoCel = await cel.getByRole('button', { name: R.ajustesRe }).boundingBox();
conferir(botaoCel.x >= 0 && botaoCel.x + botaoCel.width <= 390,
  'o botão continua acessível na tela do telefone');

/* A plataforma tem OUTRA casca - cabeçalho próprio e barra do polegar -, e
   ela nunca foi vista em 150%. A capa passar não diz nada sobre a lição,
   que é onde o aluno passa o tempo dele. */
for (const rota of ['/meu-hebraico/', '/mapa/']) {
  await cel.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
  await cel.waitForTimeout(300);
  const rolou = await cel.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  conferir(!rolou, `${rota.padEnd(18)} em 150% não rola de lado`);
}

console.log('\n── o olho da senha ───────────────────────────');

await cel.goto(`${BASE}/entrar/`, { waitUntil: 'networkidle' });
const senha = cel.locator('#senha');
conferir(await senha.getAttribute('type') === 'password', 'o campo começa escondido');
await cel.getByRole('button', { name: R.mostrar }).click();
conferir(await senha.getAttribute('type') === 'text', 'o botão revela o que foi digitado');
conferir(await senha.getAttribute('autocomplete') === 'current-password',
  'e o autocomplete não muda junto (o gerenciador de senhas continua vendo o campo)');
await cel.getByRole('button', { name: R.ocultar }).click();
conferir(await senha.getAttribute('type') === 'password', 'e esconde de novo');

console.log('\n──────────────────────────────────────────────');
await navegador.close();
servidor.close();

if (falhas) {
  console.log(`\n${falhas} problema(s) na camada de acessibilidade.\n`);
  process.exit(1);
}
console.log('a camada de acessibilidade funciona num navegador de verdade.\n');

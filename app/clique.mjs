/* Toda página pública, clicada.
   ─────────────────────────────────────────────────────────────────────────
   Este arquivo existe por causa de um defeito que passou por TODAS as outras
   redes e foi o visitante quem encontrou.

   A aba «Escrita» da capa renderizava o componente de traçado do curso, que
   lê o depósito de conteúdo pago. Esse depósito só é enchido pelo portão do
   aluno, e a capa é pública - então a leitura lançava, e como isso acontecia
   durante o render, o React derrubava a árvore inteira. Quem clicasse naquela
   aba não via um painel vazio: via a página de vendas virar «Application
   error: a client-side exception has occurred».

   Nada acusou. Os testes de unidade não abrem navegador. `varrer-site.mjs`
   abre, mas só CARREGA as páginas - e a capa carrega perfeitamente, porque o
   erro mora atrás de um clique. `capa.mjs` mede a atmosfera do hero e a barra
   fixa, não os controles. O HTML exportado traz só a primeira aba.

   A lição, que vale além deste caso: numa página pública, TUDO o que responde
   a um toque é superfície de falha, e uma superfície que ninguém toca é uma
   superfície que ninguém conferiu.

   ── o que se cobra aqui ─────────────────────────────────────────────────
   Toca em todo controle de toda página livre - abas, acordeões, alternativas,
   botões de etapa -, em desktop e em celular, e recusa qualquer exceção não
   tratada. Não é um teste de aparência: é a pergunta «a página sobrevive a
   ser usada?», que era exatamente a que faltava.

   Links não são clicados, de propósito: sair da página é outra rota, e as
   rotas estão todas na lista. O que se quer aqui é o que acontece SEM sair.

   Precisa do out/ construído. Serve nos dois modos - as páginas livres são as
   mesmas -, e a de plataforma é a que vai ao ar.
   node clique.mjs (de dentro de app/). */

import { createServer } from 'node:http';
import { readFileSync, existsSync, writeSync } from 'node:fs';
import { chromium } from 'playwright';
import { EM_ESPANHOL, EM_INGLES, OUT } from './saida.mjs';
/* Os textos que esta conferência procura, nos dois idiomas da build: o
   inglês sai dos dicionários de app/src/i18n/telas (venda-demo-alef.tsx e
   licao-trace-board.ts). Mudou um texto lá, muda aqui. */
const R = EM_INGLES ? {
  testar: /test me now/i, qualAlef: 'text=/Which of these is Alef/', quase: /Almost/, toqueDeNovo: /Tap again/,
  forma: /Alef has this shape/, isso: /That's it!/, continuar: /^Continue/, qualDasDuas: /which of the two is Alef/,
  ayin: /Ayin/, vogais: /Now the vowels/, ouvirAria: 'button[aria-label^="Hear “"]', proxima: /Next/,
  ouvirBotao: /^🔊Listen$/, ouvirDeNovo: /Listen again/, comparar: /Now compare it with another letter/, jogo: /Now a game from the Academy/, jogoErro: /This is not Alef/, conferir: /^Check$/,
  conferirDisse: /(Compare it with the model|stroke|shape|line|Almost|Good|That's it)/i, acheAlef: /Now find Alef/,
  direita: /starts on the right/, leia: /Now read a word/, aquiDentro: /find Alef in here/, terminei: /I finished the first letter/,
  umDe22: /1 of 22 letters/i, primeiraLetra: /just learned your first letter/i, oQueFez: /What you just did/i,
  escreveu: /Wrote Alef with your finger/, seuEmail: 'Your email', asOutras: /I want to learn the other/
} : EM_ESPANHOL ? {
  /* O espanhol (04/11/2026): os mesmos passos, com o texto do dicionário (venda-demo-alef.tsx). */
  testar: /probar ahora/i, qualAlef: 'text=/Cuál de estas es el Álef/', quase: /Casi/, toqueDeNovo: /Toca de nuevo/,
  forma: /El Álef tiene esta forma/, isso: /¡Eso!/, continuar: /^Continuar/, qualDasDuas: /cuál de las dos es el Álef/,
  ayin: /Áyin/, vogais: /Ahora las vocales/, ouvirAria: 'button[aria-label^="Escuchar “"]', proxima: /Siguiente/,
  ouvirBotao: /^🔊Escuchar$/, ouvirDeNovo: /Escucha de nuevo/, comparar: /Ahora compáralo con otra letra/, jogo: /Ahora un juego de la Academia/, jogoErro: /Esta no es el Álef/, conferir: /^Verificar$/,
  conferirDisse: /(Compara con el modelo|trazo|forma|línea|Casi|Bien|Eso)/i, acheAlef: /Ahora encuentra el Álef/,
  direita: /empieza a la derecha/, leia: /Ahora lee una palabra/, aquiDentro: /encontrar el Álef aquí dentro/, terminei: /Terminé la primera letra/,
  umDe22: /1 de 22 letras/i, primeiraLetra: /acabas de aprender tu primera letra/i, oQueFez: /Lo que acabas de hacer/i,
  escreveu: /Escribiste el Álef con el dedo/, seuEmail: 'Tu correo', asOutras: /Quiero aprender las otras/
} : {
  testar: /testar agora/i, qualAlef: 'text=/Qual destas é o Álef/', quase: /Quase/, toqueDeNovo: /Toque de novo/,
  forma: /O Álef tem esta forma/, isso: /Isso!/, continuar: /^Continuar/, qualDasDuas: /qual das duas é o Álef/,
  ayin: /Áyin/, vogais: /Agora as vogais/, ouvirAria: 'button[aria-label^="Ouvir “"]', proxima: /Próxima/,
  ouvirBotao: /^🔊Ouvir$/, ouvirDeNovo: /Ouça de novo/, comparar: /Agora compare com outra letra/, jogo: /Agora um jogo da Academia/, jogoErro: /Esta não é o Álef/, conferir: /^Conferir$/,
  conferirDisse: /(Compare com o modelo|traço|forma|linha|Quase|Boa|Isso)/i, acheAlef: /Agora ache o Álef/,
  direita: /começa à direita/, leia: /Agora leia uma palavra/, aquiDentro: /achar o Álef aqui dentro/, terminei: /Terminei a primeira letra/,
  umDe22: /1 de 22 letras/i, primeiraLetra: /acabou de aprender sua primeira letra/i, oQueFez: /O que você fez agora/i,
  escreveu: /Escreveu o Álef com o dedo/, seuEmail: 'Seu e-mail', asOutras: /Quero aprender as outras/
};


const log = s => writeSync(1, s + '\n');

const T = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.txt': 'text/plain'
};
const srv = createServer((q, r) => {
  const c = decodeURIComponent(q.url.split('?')[0]);
  for (const f of [`${OUT}${c}`, `${OUT}${c}/index.html`, `${OUT}${c}.html`, `${OUT}/404.html`]) {
    if (!existsSync(f) || f.endsWith('/')) continue;
    try {
      const b = readFileSync(f);
      r.writeHead(200, { 'Content-Type': T[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream' });
      return r.end(b);
    } catch { /* diretório: tenta o próximo */ }
  }
  r.writeHead(404); r.end('404');
});
await new Promise(r => srv.listen(4497, r));
const BASE = 'http://127.0.0.1:4497';

/* As páginas que um visitante alcança sem conta. A mesma lista de
   `check-legal.mjs`, mais as que têm controle interativo. */
const ROTAS = [
  '/', '/curso-de-hebraico/', '/aprender-hebraico/', '/descobrir-israel/', '/israel-alem-do-obvio/', '/raizes-sefarditas/',
  '/metodo/', '/cursos/', '/sobre/', '/faq/',
  '/biblia/', '/termos/', '/privacidade/', '/reembolso/', '/suporte/',
  '/acessibilidade/', '/entrar/', '/criar-conta/'
];

/* 390 é o telefone em que a landing é lida de verdade; 1280 é onde as abas
   ficam numa linha só e os cartões em três colunas. Os dois, porque o
   defeito que originou este arquivo aparecia nos dois e nada garante que o
   próximo apareça. */
const LARGURAS = [1280, 390];

/* Quantos toques por página. Alto o bastante para varrer a capa inteira e
   baixo o bastante para a varredura terminar. */
const TETO = 90;

let falhas = 0;
const erro = m => { log(`  ✗ ${m}`); falhas++; };

const b = await chromium.launch({ executablePath: process.env.HF_CHROMIUM });

for (const width of LARGURAS) {
  log(`\n── ${width}px ${'─'.repeat(42)}`);
  const ctx = await b.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
  const p = await ctx.newPage();

  for (const rota of ROTAS) {
    const explosoes = [];
    const consoles = [];
    p.removeAllListeners('pageerror');
    p.removeAllListeners('console');
    p.on('pageerror', e => explosoes.push(String(e.message || e).slice(0, 220)));
    p.on('console', m => { if (m.type() === 'error') consoles.push(m.text().slice(0, 220)); });

    await p.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
    /* A sequência de entrada do hero leva 1,9 s, e um clique no meio dela
       testa um estado que ninguém vê. */
    await p.waitForTimeout(rota === '/curso-de-hebraico/' ? 2300 : 500);

    if (explosoes.length) {
      erro(`${rota} explodiu só ao CARREGAR: ${explosoes[0]}`);
      continue;
    }

    /* Todo controle que responde a toque e NÃO navega. Um link leva a outra
       rota, e as rotas já estão todas nesta lista. */
    const alvos = await p.evaluate(() => {
      const visivel = e => {
        if (typeof e.checkVisibility === 'function'
            && !e.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }))
          return false;
        const r = e.getBoundingClientRect();
        return r.width > 8 && r.height > 8;
      };
      return [...document.querySelectorAll('button, summary, [role="tab"], [role="button"]')]
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => visivel(e) && !e.closest('a'))
        .map(({ i }) => i);
    });

    let tocados = 0;
    const todos = p.locator('button, summary, [role="tab"], [role="button"]');

    for (const i of alvos.slice(0, TETO)) {
      const el = todos.nth(i);
      /* `force`: um controle sob a barra fixa do celular ainda é um controle,
         e o que se mede aqui é o que o componente faz quando chamado - não se
         o dedo alcança. Isso é trabalho do `toque.mjs`. */
      await el.click({ force: true, timeout: 1500 }).catch(() => {});
      tocados++;
      if (explosoes.length) break;
      /* Um respiro curto: o estado entra, o efeito roda, e o erro - se
         houver - chega antes do próximo toque. */
      await p.waitForTimeout(40);
    }
    await p.waitForTimeout(350);

    /* E a página continua viva? Um React derrubado troca o corpo inteiro
       pela tela de erro do Next, então basta procurar por ela. */
    const morta = await p.evaluate(() =>
      /Application error|client-side exception/i.test(document.body?.innerText || ''));

    if (explosoes.length) {
      erro(`${rota} explodiu depois de ${tocados} toque(s): ${explosoes[0]}`);
    } else if (morta) {
      erro(`${rota} virou tela de erro depois de ${tocados} toque(s)`);
    } else if (consoles.length) {
      erro(`${rota} deixou ${consoles.length} erro(s) no console: ${consoles[0]}`);
    } else {
      log(`  ✓ ${rota.padEnd(26)} ${String(tocados).padStart(2)} controles tocados, nada quebrou`);
    }
  }
  await ctx.close();
}

/* ── e a rota recarregada direto ────────────────────────────────────────
   Uma âncora dentro da capa (#experimente) tem de sobreviver a ser aberta
   de fora: quem recebe o link por mensagem chega assim, e um export estático
   que não resolve a âncora entrega a página rolada no lugar errado ou, pior,
   um 404. */
{
  log('\n── aberta direto pelo link ────────────────────────');
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  const explosoes = [];
  p.on('pageerror', e => explosoes.push(String(e.message || e).slice(0, 200)));

  for (const alvo of ['/curso-de-hebraico/#experimente', '/curso-de-hebraico/#decisoes', '/curso-de-hebraico/#duvidas']) {
    await p.goto(`${BASE}${alvo}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const id = alvo.split('#')[1];
    const existe = await p.locator(`#${id}`).count();
    if (!existe) erro(`${alvo}: a seção #${id} não existe na página`);
    else if (explosoes.length) erro(`${alvo}: ${explosoes[0]}`);
    else log(`  ✓ ${alvo.padEnd(20)} a seção existe e a página abre inteira`);
  }
  await ctx.close();
}

/* ── a aula aberta da Álef, do começo ao fim ────────────────────────────
   A demo é a peça de conversão da página: se ela travar, o visitante não vê
   uma seção quebrada - ele vê que o produto interativo não é interativo. As
   quatro etapas são percorridas aqui como um visitante as percorre, e os
   dois caminhos da pergunta são exercidos, porque o ERRO é o que a seção
   promete tratar bem.

   Roda nas duas larguras: no telefone a grade de alternativas é 2×2 e os
   botões mudam de lugar, que é onde um alvo pequeno demais apareceria. */
for (const width of LARGURAS) {
  log(`\n── a aula aberta da Álef · ${width}px ${'─'.repeat(Math.max(0, 18 - String(width).length))}`);
  const ctx = await b.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
  const p = await ctx.newPage();
  const explosoes = [];
  p.on('pageerror', e => explosoes.push(String(e.message || e).slice(0, 200)));

  await p.goto(`${BASE}/curso-de-hebraico/#experimente`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);

  const secao = p.locator('#experimente');
  if (!(await secao.count())) { erro(`${width}px: a seção da demo não existe`); await ctx.close(); continue; }
  await secao.scrollIntoViewIfNeeded();

  /* 1 · conhecer → reconhecer. Oito etapas desde 03/10/2026. */
  const comecar = secao.locator('button', { hasText: R.testar }).first();
  if (!(await comecar.count())) { erro(`${width}px: não achei o botão que abre a demo`); await ctx.close(); continue; }
  await comecar.click();
  await p.waitForTimeout(300);

  const pergunta = await secao.locator(R.qualAlef).count();
  if (!pergunta) erro(`${width}px: a etapa de reconhecimento não apareceu`);

  /* Todo alvo de toque com pelo menos 44px, que é a regra da casa. */
  const pequenos = await secao.evaluate(el => [...el.querySelectorAll('button')]
    .filter(b => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 44; }).length);
  if (pequenos) erro(`${width}px: ${pequenos} botão(ões) da demo abaixo de 44px de altura`);

  /* 2a · a resposta ERRADA: explica e deixa tentar de novo. */
  const opcoes = secao.locator('ul li button');
  const glifos = await opcoes.evaluateAll(bs => bs.map(b => (b.innerText || '').trim()));
  const iErrada = glifos.findIndex(g => g && g !== 'א');
  const iCerta = glifos.findIndex(g => g === 'א');
  if (iErrada < 0 || iCerta < 0) {
    erro(`${width}px: não achei as alternativas da demo (li ${JSON.stringify(glifos)})`);
  } else {
    await opcoes.nth(iErrada).click();
    await p.waitForTimeout(350);
    const txt = (await secao.innerText()).replace(/\s+/g, ' ');
    if (!R.quase.test(txt)) erro(`${width}px: o erro não recebeu retorno`);
    else if (!R.toqueDeNovo.test(txt)) erro(`${width}px: o erro não devolve a tentativa`);
    else if (!R.forma.test(txt)) erro(`${width}px: o erro não diz onde olhar`);
    else log(`  ✓ ${String(width).padStart(4)}px  o erro explica e devolve a tentativa`);

    /* 2b · a resposta CERTA */
    await opcoes.nth(iCerta).click();
    await p.waitForTimeout(350);
    const ok2 = (await secao.innerText()).replace(/\s+/g, ' ');
    if (!R.isso.test(ok2)) erro(`${width}px: o acerto não recebeu retorno`);
    else log(`  ✓ ${String(width).padStart(4)}px  o acerto confirma`);

    /* 3 · escrever - a etapa em que o dedo faz alguma coisa.
       ──────────────────────────────────────────────────────────────────
       O que se prova aqui é o que nenhuma captura mostra: que a tinta cai
       SOB O PONTEIRO. É a mesma conta de coordenadas que a lição usa, e ela
       já saiu errada uma vez - por isso a demo é medida do mesmo jeito que
       `escrita.mjs` mede o curso, e não só «o canvas existe». */
    /* 2c · comparar e vogais (03/10/2026): rodadas de escolha, cada uma com
       um erro que ensina. Aqui se responde o certo e se segue. */
    const toca = async (texto) => {
      const b = secao.locator('[data-opcoes] li button', { hasText: texto }).first();
      if (!(await b.count())) { erro(`${width}px: não achei a alternativa ${texto}`); return false; }
      await b.click(); await p.waitForTimeout(300); return true;
    };
    const segue = async (rotulo) => {
      const b = secao.locator('button', { hasText: rotulo }).first();
      if (!(await b.count())) { erro(`${width}px: não achei o botão ${rotulo}`); return; }
      await b.click(); await p.waitForTimeout(350);
    };
    /* Escrever vem logo depois do acerto (30/10/2026). */
    await segue(R.continuar);

    const canvas = secao.locator('canvas').first();
    if (!(await canvas.count())) {
      erro(`${width}px: a etapa de escrita não tem quadro`);
    } else {
      await canvas.scrollIntoViewIfNeeded();
      await p.waitForTimeout(200);
      const cx = await canvas.evaluate(c => {
        const r = c.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      const px = cx.x + cx.w * 0.68, py = cx.y + cx.h * 0.68;
      await p.mouse.move(px, py);
      await p.mouse.down();
      await p.mouse.move(px + 22, py + 22, { steps: 6 });
      await p.mouse.up();
      await p.waitForTimeout(250);

      const tinta = await canvas.evaluate((c, alvo) => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let sx = 0, sy = 0, n = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          if (d[(y * c.width + x) * 4 + 3] > 40) { sx += x; sy += y; n++; }
        }
        if (!n) return null;
        const r = c.getBoundingClientRect();
        return { n, x: r.x + (sx / n) * (r.width / c.width), y: r.y + (sy / n) * (r.height / c.height) };
      }, null);

      if (!tinta) erro(`${width}px: o traço na demo não deixou tinta nenhuma`);
      else {
        /* O centro do traço fica no meio do segmento desenhado. */
        const alvoX = px + 11, alvoY = py + 11;
        const dx = tinta.x - alvoX, dy = tinta.y - alvoY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          erro(`${width}px: a tinta da demo caiu a Δx=${dx.toFixed(1)} Δy=${dy.toFixed(1)} do ponteiro`);
        } else {
          log(`  ✓ ${String(width).padStart(4)}px  a escrita desenha sob o dedo (Δ ${dx.toFixed(1)}, ${dy.toFixed(1)})`);
        }
      }

      /* E o retorno de «Conferir». */
      const conferir = secao.locator('button', { hasText: R.conferir }).first();
      if (!(await conferir.count())) erro(`${width}px: a escrita não tem botão de conferir`);
      else {
        await conferir.click();
        await p.waitForTimeout(300);
        const dito = (await secao.innerText()).replace(/\s+/g, ' ');
        if (!R.conferirDisse.test(dito)) {
          erro(`${width}px: conferir a escrita não disse nada`);
        } else {
          log(`  ✓ ${String(width).padStart(4)}px  conferir a escrita responde`);
        }
      }
    }

    /* 4 · ler. O botão de seguir NUNCA depende de ter desenhado: um canvas
       não é alcançável por teclado, e prender a demo ali seria fechá-la para
       quem navega sem ponteiro. */
    await segue(R.comparar);
    if (!R.qualDasDuas.test(await secao.innerText())) erro(`${width}px: a etapa de comparar não apareceu`);
    await toca('ע');
    if (!R.ayin.test(await secao.innerText())) erro(`${width}px: o erro do comparar não explica o Áyin`);
    await toca('א');
    await segue(R.vogais);
    /* A tabela das sílabas toca a voz do professor (03/10/2026). */
    const silabas = await secao.locator(R.ouvirAria).count();
    if (silabas !== 5) erro(`${width}px: a tabela das vogais tem ${silabas} botões de ouvir, e não 5`);
    for (const [som, prox] of [['i', R.proxima], ['o', R.proxima], ['a', R.proxima]]) {
      await toca(som); await segue(prox);
    }
    /* A rodada de ouvir: o botão existe, e o erro manda ouvir de novo. */
    if (!(await secao.locator('button', { hasText: R.ouvirBotao }).count())) erro(`${width}px: a rodada de ouvir não tem botão`);
    await toca('אַ');
    if (!R.ouvirDeNovo.test(await secao.innerText())) erro(`${width}px: o erro da rodada de ouvir não manda ouvir de novo`);
    await toca('אוּ');
    log(`  ✓ ${String(width).padStart(4)}px  comparar e vogais respondem`);
    await segue(R.acheAlef);
    await toca('שָׁלוֹם');
    if (!R.direita.test(await secao.innerText())) erro(`${width}px: o erro do achar não ensina a direção`);
    await toca('אֶתְמוֹל'); await segue(R.proxima);
    await toca('אֹכֶל');
    log(`  ✓ ${String(width).padStart(4)}px  achar o Álef nas palavras responde`);
    /* O jogo da Academia (30/10/2026): a Caça à letra. Um erro pisca e volta;
       achar todos os Álef abre o botão da leitura. */
    await segue(R.jogo);
    const celulas = secao.locator('[data-caca] li button');
    if ((await celulas.count()) !== 15) erro(`${width}px: a grade da caça não tem 15 letras`);
    await celulas.filter({ hasNotText: 'א' }).first().click(); await p.waitForTimeout(200);
    if (!R.jogoErro.test(await secao.innerText())) erro(`${width}px: o erro da caça não diz onde olhar`);
    const alefs = celulas.filter({ hasText: 'א' });
    for (let i = 0; i < await alefs.count(); i++) { await alefs.nth(i).click(); await p.waitForTimeout(120); }
    if (!(await secao.locator('button', { hasText: R.leia }).count())) erro(`${width}px: achar todos os Álef não terminou a caça`);
    else log(`  ✓ ${String(width).padStart(4)}px  a caça à letra responde`);
    await secao.locator('button', { hasText: R.leia }).first().click();
    await p.waitForTimeout(300);
    const leitura = (await secao.innerText()).replace(/\s+/g, ' ');
    if (!R.aquiDentro.test(leitura)) erro(`${width}px: a etapa de leitura não apareceu`);
    else log(`  ✓ ${String(width).padStart(4)}px  a leitura mostra a palavra`);

    /* 4 · a conquista e o CTA */
    await secao.locator('button', { hasText: R.terminei }).first().click();
    await p.waitForTimeout(400);
    const fim = (await secao.innerText()).replace(/\s+/g, ' ');
    /* `/i`: o rótulo é `uppercase` por CSS, e `innerText` devolve o texto
       RENDERIZADO - "1 DE 22 LETRAS". A primeira versão desta regra procurava
       a forma escrita no código e acusava uma seção que estava certa. */
    if (!R.umDe22.test(fim)) erro(`${width}px: o fim da demo não mostra 1 de 22`);
    if (!R.primeiraLetra.test(fim)) erro(`${width}px: falta a frase da conquista`);
    /* O resultado: o que a pessoa fez. Ela riscou o quadro, então a escrita entra. */
    if (!R.oQueFez.test(fim)) erro(`${width}px: falta o resultado no fim do teste`);
    else if (!R.escreveu.test(fim)) erro(`${width}px: o resultado não conta a escrita de quem escreveu`);
    else log(`  ✓ ${String(width).padStart(4)}px  o fim mostra o que a pessoa fez`);
    /* A segunda letra por e-mail: o campo existe e tem rótulo. */
    if (!(await secao.getByLabel(R.seuEmail).count())) erro(`${width}px: falta o pedido da segunda letra no fim do teste`);
    else log(`  ✓ ${String(width).padStart(4)}px  o fim oferece a segunda letra por e-mail`);

    /* O CTA tem de levar ao FLUXO DE COMPRA, e não a mais uma página de
       texto. É o ponto de maior intenção da visita inteira. */
    const cta = secao.locator('a', { hasText: R.asOutras }).first();
    if (!(await cta.count())) erro(`${width}px: nenhum CTA no fim da demo`);
    else {
      const href = await cta.getAttribute('href');
      if (!/^\/checkout\//.test(href || '')) erro(`${width}px: o CTA da demo vai para "${href}", e não para o checkout`);
      else log(`  ✓ ${String(width).padStart(4)}px  a demo fecha em 1 de 22 e leva ao checkout`);
    }
  }

  if (explosoes.length) erro(`${width}px: a demo explodiu - ${explosoes[0]}`);
  await ctx.close();
}

await b.close();
srv.close();
log('');
if (falhas) {
  log(`${falhas} página(s) pública(s) quebram sob o dedo.\n`);
  process.exit(1);
}
log('toda página pública sobrevive a ser usada, em desktop e em celular.\n');

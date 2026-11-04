/* O progresso atravessando dois aparelhos, de verdade.
   ────────────────────────────────────────────────────────────────────────
   Contra o Worker rodando (npm run dev:worker, porta 8788) e o D1 local.
   Uma conta, dois contextos de navegador com estados DIFERENTES no
   localStorage - é o celular e o notebook. O que se prova aqui é a frase que
   justifica a tabela `progress` existir: ninguém perde trabalho.

     1. o aparelho A estudou o Mem e sobe sozinho ao abrir o site;
     2. o aparelho B, que estudou o Tav, encontra o Mem ao abrir;
     3. o aparelho A, recarregado, encontra o Tav;
     4. as rodadas de exercício (lib/rodadas.ts) atravessam também: o que um
        aparelho lembrava sobe, e o outro passa a evitar as mesmas perguntas;
     5. apagar progresso num aparelho limpa também o servidor.

   Roda com: node sincronia.mjs   (variável HF_CHROMIUM para o navegador) */

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const BASE = process.env.HF_BASE || 'http://127.0.0.1:8788';
const hoje = new Date().toISOString().slice(0, 10);
const email = `sync-${Date.now()}@hebraico.test`;

const licao = id => ({
  letterId: id, stagesDone: [1, 2, 3, 4, 5], quizBest: 1, quizAttempts: 1,
  perfectBonusPaid: true, completedAt: new Date().toISOString()
});

const estado = (licoes, xp) => ({
  version: 2,
  onboarding: { reason: 'familia', goalMinutes: 10, startingPoint: 'zero', name: 'M', completedAt: new Date().toISOString() },
  xp,
  lessons: Object.fromEntries(licoes.map(id => [id, licao(id)])),
  checkpoints: {}, srs: {}, achievements: [],
  days: { [hoje]: { answered: 4, units: 8, xp, goalMet: false } },
  streak: { current: 1, longest: 1, lastDay: hoje },
  lastRoute: null, finalChallenge: { best: null, completedAt: null },
  skills: {}, confusions: {}, firsts: {}, gym: {}
});

/* ── a conta ────────────────────────────────────────────────────────────── */
const cadastro = await fetch(`${BASE}/api/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ aceitouTermos: true, declarouIdade: true, name: 'Sincronia', email, password: 'senha-de-teste-123' })
});
if (!cadastro.ok) {
  console.error('não deu para criar a conta:', cadastro.status, await cadastro.text());
  process.exit(1);
}
const bruto = cadastro.headers.get('set-cookie') || '';
const valor = (bruto.match(/__Host-hf_session=([^;]+)/) || [])[1];
if (!valor) { console.error('sem cookie de sessão na resposta'); process.exit(1); }

/* O servidor só guarda progresso de quem tem curso (auditoria de 24/09/2026,
   worker/src/api/progress.js), então a conta de teste recebe o acesso direto
   no D1 LOCAL - o mesmo que o `liberar` do Actions faz em produção. Contra
   outro endereço que não o local, este passo não tem como rodar. */
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(BASE)) {
  console.error('sincronia.mjs concede o curso pelo D1 local; aponte HF_BASE para o wrangler dev.');
  process.exit(1);
}
execFileSync('npx', ['wrangler', 'd1', 'execute', 'hebreo-fluido', '--local', '--command',
  `INSERT INTO entitlements (account_id, course_slug, granted_at, expires_at, order_id)
   SELECT id, 'alfabetizacao', unixepoch()*1000, unixepoch()*1000 + 31536000000, 'SINCRONIA'
     FROM accounts WHERE email = '${email}'`], { cwd: '..', stdio: 'ignore' });

const comCookie = (extra = {}) => ({
  headers: { Cookie: `__Host-hf_session=${valor}`, ...extra }
});

const servidor = async () => {
  const r = await fetch(`${BASE}/api/progress`, comCookie());
  const j = await r.json();
  return {
    rev: j.rev,
    letras: j.state ? Object.keys(j.state.lessons || {}).sort() : [],
    xp: j.state ? j.state.xp : null,
    rodadas: j.state && j.state.rodadas
      ? Object.fromEntries(Object.entries(j.state.rodadas).map(([k, v]) => [k, v.n])) : {}
  };
};

/* ── os dois aparelhos ──────────────────────────────────────────────────── */
const b = await chromium.launch({ executablePath: process.env.HF_CHROMIUM });
const erros = [];

async function aparelho(nome, semente) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  if (semente) {
    await ctx.addInitScript(s => {
      try { localStorage.setItem('hebraico-fluente-v1', s); } catch { /* */ }
    }, JSON.stringify(semente));
  }
  const p = await ctx.newPage();
  /* O aparelho entra pela API, de dentro da página, e não com um cookie
     plantado: o cookie é `__Host-hf_session`, e o protocolo de automação do
     Chromium recusa gravar um cookie Secure para uma URL http - enquanto o
     navegador aceita o mesmo cookie vindo numa resposta de 127.0.0.1, que ele
     trata como origem confiável. O `fetch` precisa de uma página da própria
     origem; o JSON de /api/health serve, e não carrega o app antes da hora. */
  await p.goto(`${BASE}/api/health`);
  const entrou = await p.evaluate(async ([e, s]) => (await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e, password: s })
  })).status, [email, 'senha-de-teste-123']);
  if (entrou !== 200) throw new Error(`${nome}: login respondeu ${entrou}`);
  /* Os erros de console contam daqui em diante: o login acima abre um JSON,
     e o pedido de /favicon.ico que o navegador faz para ele não é do app. */
  p.on('console', m => { if (m.type() === 'error') erros.push(`${nome}: ${m.text()}`); });
  p.on('pageerror', e => erros.push(`${nome} pageerror: ${e.message}`));
  return { ctx, p };
}

const leLocal = p => p.evaluate(() => {
  try {
    const s = JSON.parse(localStorage.getItem('hebraico-fluente-v1') || '{}');
    return { letras: Object.keys(s.lessons || {}).sort(), xp: s.xp ?? null };
  } catch { return { letras: [], xp: null }; }
});

const abrir = async p => {
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1400);            /* load + fusão + PUT */
};

console.log('\n  SINCRONIA ENTRE APARELHOS\n');
console.log(`  conta: ${email}`);
console.log('  servidor no começo:', JSON.stringify(await servidor()));

/* 1. o celular estudou o Mem e abre o site */
const A = await aparelho('celular', estado(['mem'], 120));
await abrir(A.p);
console.log('  1) celular abre  → servidor:', JSON.stringify(await servidor()));

/* 2. o notebook estudou o Tav e abre o site */
const B = await aparelho('notebook', estado(['tav'], 90));
await abrir(B.p);
console.log('  2) notebook abre → local:   ', JSON.stringify(await leLocal(B.p)));
console.log('                     servidor:', JSON.stringify(await servidor()));

/* 3. o celular recarrega e encontra o que o notebook fez */
await abrir(A.p);
console.log('  3) celular volta → local:   ', JSON.stringify(await leLocal(A.p)));

/* 3b. e abrir de novo, sem nada novo, NÃO pode gravar: `rev` tem de ficar
   parada. Se ela subir a cada carregamento, todo aluno escreve no D1 em toda
   página que abre, para sempre. */
const antes = (await servidor()).rev;
await abrir(A.p);
await abrir(B.p);
const depois = (await servidor()).rev;
console.log(`  3b) duas aberturas sem novidade → rev ${antes} → ${depois}`,
            depois === antes ? '(não gravou, certo)' : '(GRAVOU À TOA)');

/* 4. as rodadas. Um terceiro aparelho tem memória de rodadas de ANTES de a
   conta guardá-las (só no espelho local, `hf-rodadas-v1`): o checkpoint 1
   feito duas vezes. Ao abrir, isso sobe; o notebook, ao voltar, recebe no
   espelho dele - que é o que as telas leem para escolher as perguntas. */
const C = await aparelho('tablet', estado(['mem'], 120));
await C.ctx.addInitScript(() => {
  try {
    if (!localStorage.getItem('hf-rodadas-v1')) {
      localStorage.setItem('hf-rodadas-v1', JSON.stringify({ 'checkpoint-1': { n: 2, vistas: ['aa', 'bb'] } }));
    }
  } catch { /* */ }
});
await abrir(C.p);
const comRodadas = await servidor();
console.log('  4) tablet abre   → servidor rodadas:', JSON.stringify(comRodadas.rodadas));
await abrir(B.p);
const noNotebook = await B.p.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('hf-rodadas-v1') || '{}'); } catch { return {}; }
});
console.log('     notebook volta → espelho:', JSON.stringify(noNotebook));
const r1 = (await servidor()).rev;
await abrir(B.p);
await abrir(C.p);
const r2 = (await servidor()).rev;
console.log(`  4b) duas aberturas sem novidade → rev ${r1} → ${r2}`,
            r2 === r1 ? '(não gravou, certo)' : '(GRAVOU À TOA)');
const rodadasOk = comRodadas.rodadas['checkpoint-1'] === 2
  && noNotebook['checkpoint-1']?.n === 2 && r2 === r1;

/* 5. apagar num aparelho apaga no servidor */
await A.p.evaluate(async () => {
  await fetch('/api/progress', { method: 'DELETE', credentials: 'same-origin' });
});
console.log('  5) apagou        → servidor:', JSON.stringify(await servidor()));

console.log('\n  erros de console:', erros.length ? erros.slice(0, 3) : 'nenhum', '\n');
await b.close();
if (!rodadasOk) { console.error('  ✗ as rodadas não atravessaram os aparelhos'); process.exitCode = 1; }
else console.log('  ✓ as rodadas atravessam os aparelhos pela conta, sem gravar à toa\n');

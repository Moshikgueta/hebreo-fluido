/* Cartões de festa (05/11/2026): lib/engine/cartoes.ts, data/cartoes-de-festa.json,
 * os desenhos (components/ilustra/DesenhoDoCartao.tsx) e o "mandar a um amigo"
 * (worker/src/api/cartao.js): só quem tem o curso assina; o link só leva um
 * cartão do curso e dois nomes só de letras; a página pública confere a
 * assinatura e tira o hebraico do conteúdo, nunca do link. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error - módulo JS do Worker, sem tipos
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import { createOrder, grantAccess } from '../../worker/src/lib/db.js';
import {
  NOME_MAX, OPCOES_DE_CARTAO, RODADAS_DE_CARTAO, cartoesAbertos, cartoesLegiveis, limparNome, nomeValido,
  opcoesDoCartao, rodadasDoJogo, type CartaoDeFesta
} from '@/lib/engine/cartoes';
import { PARADAS } from '@/lib/engine/um-dia';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { DESENHOS } from '@/components/ilustra/DesenhoDoCartao';
import { conteudoPago } from '@/lib/content-servidor';
import { NAO_LISTADAS, PAGAS } from '@/lib/seo';
import { ROTAS_LEVES } from '@/lib/rotas';
import { cookieDe, envDeTeste, pedido } from './ajuda/d1';

const DADOS = (JSON.parse(readFileSync(new URL('../../data/cartoes-de-festa.json', import.meta.url), 'utf8')) as { cartoes: (CartaoDeFesta & { revisado: boolean })[] }).cartoes;
const cartoes = conteudoPago.umDia.cartoes ?? [];
const letras = conteudoPago.letters;

const SITE = 'https://hebraicofluente.com.br';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };
type Env = ReturnType<typeof envDeTeste> & { DB: { bruto: import('node:sqlite').DatabaseSync } };

async function conta(env: Env, email: string, comprou = true) {
  const r = await auth.signup({
    request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana', email, password: 'senha-boa-123' }), env, ctx
  });
  const cookie = cookieDe(r);
  const { id } = env.DB.bruto.prepare('SELECT id FROM accounts WHERE email = ?').get(email) as { id: number };
  if (comprou) {
    const order = await createOrder(env, { accountId: id, courseSlug: 'alfabetizacao', amountCents: 14700, method: 'pix' });
    await grantAccess(env, { accountId: id, courseSlug: 'alfabetizacao', orderId: order.id, months: 12 });
  }
  return cookie;
}
const criar = (env: Env, cookie: string, corpo: unknown) => worker.fetch(new Request(`${SITE}/api/cartao`, {
  method: 'POST', headers: { cookie, Origin: SITE, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
}), env, ctx);
const abrir = (env: Env, t: string) => worker.fetch(new Request(`${SITE}/api/cartao?t=${encodeURIComponent(t)}`), env, ctx);

describe('os cartões de festa', () => {
  it('saem só os revisados, sem a marca, cada um com um desenho que existe', () => {
    expect(cartoes.map(c => c.id)).toEqual(DADOS.filter(c => c.revisado).map(c => c.id));
    expect(cartoes.length).toBeGreaterThanOrEqual(OPCOES_DE_CARTAO);
    for (const c of cartoes) {
      expect('revisado' in c).toBe(false);
      expect(DESENHOS[c.desenho], c.id).toBeTruthy();
      expect(c.situacaoPt && c.translit && c.pt, c.id).toBeTruthy();
    }
  });

  it('sem chataf, e daguesh só em בּ/כּ/פּ', () => {
    for (const c of cartoes) {
      expect(/[ֱ-ֳ]/u.test(c.he), c.id).toBe(false);
      const comPonto = [...c.he.normalize('NFC').matchAll(/([א-ת])[ְ-ׇֻׁׂ]*ּ/gu)].map(m => m[1]);
      for (const l of comPonto) expect('בכךפףו', `${c.id}: ${l}`).toContain(l);
    }
  });

  it('a parada está no mapa, com rota', () => {
    expect(PARADAS.find(x => x.id === 'cartoes')?.rota).toBe('/um-dia-em-israel/cartoes');
  });

  it('com nenhuma letra, nenhum cartão; com as 22, todos', () => {
    expect(cartoesLegiveis(cartoes, []).prontos).toEqual([]);
    expect(cartoesLegiveis(cartoes, letras).prontos.length).toBe(cartoes.length);
  });

  it('a cada letra, só aparecem cartões com letras já ensinadas, e as opções também', () => {
    const ordem = [...letras].sort((a, b) => a.order - b.order);
    for (let n = 1; n <= ordem.length; n++) {
      const ja = ordem.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const { prontos } = cartoesLegiveis(cartoes, ja);
      for (const c of prontos) expect(consegueLer(c.he, alfabeto), c.id).toBe(true);
      if (!cartoesAbertos(prontos)) continue;
      const rodadas = rodadasDoJogo(prontos, rng(`r-${n}`));
      expect(rodadas.length).toBe(Math.min(RODADAS_DE_CARTAO, prontos.length));
      expect(new Set(rodadas.map(c => c.id)).size).toBe(rodadas.length);
      for (const alvo of rodadas) {
        const ops = opcoesDoCartao(alvo, prontos, rng(`o-${n}-${alvo.id}`));
        expect(ops.length).toBe(OPCOES_DE_CARTAO);
        expect(ops.map(o => o.id)).toContain(alvo.id);
        expect(new Set(ops.map(o => o.id)).size).toBe(ops.length);
        for (const o of ops) expect(consegueLer(o.he, alfabeto), o.id).toBe(true);
      }
    }
  });

  it('os nomes: só letras, até o limite, sem invisíveis', () => {
    for (const ok of ['', 'Ana', 'Maria José', "D'Ávila", 'Ana-Lu', 'משה', 'Zoë']) expect(nomeValido(ok), ok).toBe(true);
    for (const ruim of ['ana.com/x', 'http://x', 'Ana 2', '<b>', 'a'.repeat(NOME_MAX + 1), '-Ana', 'x:y', 'golpe.com', 'Sr. João']) expect(nomeValido(ruim), ruim).toBe(false);
    expect(limparNome('  Ana‮  Lu ‏')).toBe('Ana Lu');
  });

  it('a página do amigo é aberta, leve e fora da busca; a parada é paga', () => {
    expect(NAO_LISTADAS as readonly string[]).toContain('/cartao-de-festa');
    expect(ROTAS_LEVES as readonly string[]).toContain('/cartao-de-festa');
    expect(PAGAS.some(p => '/cartao-de-festa'.startsWith(p))).toBe(false);
    expect(PAGAS.some(p => '/um-dia-em-israel/cartoes'.startsWith(p))).toBe(true);
  });
});

describe('mandar um cartão a um amigo', () => {
  const ID = DADOS.find(c => c.revisado)!.id;

  it('só quem tem o curso assina, com um cartão do curso e nomes só de letras', async () => {
    const env = envDeTeste() as Env;
    const ana = await conta(env, 'ana@exemplo.com');
    const bia = await conta(env, 'bia@exemplo.com', false);
    expect((await criar(env, '', { cartao: ID, para: 'Bia', de: 'Ana' })).status).toBe(401);
    expect((await criar(env, bia, { cartao: ID, para: 'Bia', de: 'Ana' })).status).toBe(403);
    expect((await criar(env, ana, { cartao: 'golpe', para: 'Bia', de: 'Ana' })).status).toBe(400);
    expect((await criar(env, ana, { cartao: ID, para: 'Bia', de: '' })).status).toBe(400);
    expect((await criar(env, ana, { cartao: ID, para: 'acesse golpe.com', de: 'Ana' })).status).toBe(400);
    expect((await criar(env, ana, { cartao: ID, para: 'Bia', de: 'a'.repeat(NOME_MAX + 1) })).status).toBe(400);
    const r = await criar(env, ana, { cartao: ID, para: '', de: 'Ana' });
    expect(r.status).toBe(200);
    const { token } = await r.json() as { token: string };
    expect(token).toMatch(/^[\w-]+\.[\w-]+$/);
  });

  it('abre só com a assinatura certa, e o hebraico vem do curso', async () => {
    const env = envDeTeste() as Env;
    const ana = await conta(env, 'ana@exemplo.com');
    const { token } = await (await criar(env, ana, { cartao: ID, para: ' Bia‮ ', de: 'Ana' })).json() as { token: string };
    const r = await abrir(env, token);
    expect(r.status).toBe(200);
    const d = await r.json() as { cartao: CartaoDeFesta; para: string; de: string };
    const doCurso = cartoes.find(c => c.id === ID)!;
    expect(d.para).toBe('Bia');
    expect(d.de).toBe('Ana');
    expect(d.cartao).toEqual({ id: ID, he: doCurso.he, translit: doCurso.translit, pt: doCurso.pt, desenho: doCurso.desenho, cor: doCurso.cor });
    /* Trocar o corpo e manter a assinatura não passa. */
    const [corpo, sig] = token.split('.');
    const outro = Buffer.from(JSON.stringify([ID, 'Bia', 'Golpista'])).toString('base64url');
    expect((await abrir(env, `${outro}.${sig}`)).status).toBe(400);
    expect((await abrir(env, `${corpo}.x${sig}`)).status).toBe(400);
    expect((await abrir(env, '')).status).toBe(400);
    expect((await abrir(envDeTeste({ SESSION_SECRET: 'outro' }) as Env, token)).status).toBe(400);
  });
});

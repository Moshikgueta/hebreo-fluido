/* Fale comigo: dúvidas e comentários dos alunos (worker/src/api/mensagens.js, 06/11/2026). */
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error - módulo JS do Worker, sem tipos
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import { createOrder, grantAccess, deleteAccount } from '../../worker/src/lib/db.js';
// @ts-expect-error - idem
import { validar } from '../../worker/src/api/mensagens.js';
// @ts-expect-error - idem
import { dadosDaConta } from '../../worker/src/api/meus-dados.js';
// @ts-expect-error - idem
import { isGatedPath } from '../../worker/src/gate.js';
import { PAGAS } from '@/lib/seo';
import { cookieDe, envDeTeste, pedido, comoAdmin } from './ajuda/d1';

const SITE = 'https://hebraicofluente.com.br';
type Env = ReturnType<typeof envDeTeste> & { DB: { bruto: import('node:sqlite').DatabaseSync } };

async function aluno(env: Env, email: string, comprou = true) {
  const ctx = { waitUntil: () => {} };
  const r = await auth.signup({
    request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana Souza', email, password: 'senha-boa-123' }), env, ctx
  });
  const cookie = cookieDe(r);
  const { id } = env.DB.bruto.prepare('SELECT id FROM accounts WHERE email = ?').get(email) as { id: number };
  if (comprou) {
    const order = await createOrder(env, { accountId: id, courseSlug: 'alfabetizacao', amountCents: 14700, method: 'pix' });
    await grantAccess(env, { accountId: id, courseSlug: 'alfabetizacao', orderId: order.id, months: 12 });
  }
  return { cookie, id };
}

const chamar = (env: Env, metodo: string, path: string, cookie: string, body?: unknown, ctx = { waitUntil: (_p: Promise<unknown>) => {} }) =>
  worker.fetch(new Request(`${SITE}${path}`, {
    method: metodo,
    headers: { cookie, Origin: SITE, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  }), env, ctx);

describe('fale comigo', () => {
  it('confere o que chega', () => {
    expect(validar({ tipo: 'duvida', texto: '  Como leio o\r\n\r\n\r\nkamats?  ' }).ok).toEqual({ tipo: 'duvida', texto: 'Como leio o\n\nkamats?', contexto: null });
    expect(validar({ tipo: 'comentario', texto: 'Adorei o módulo', contexto: 'modulo-3' }).ok?.contexto).toBe('modulo-3');
    expect(validar({ tipo: 'comentario', texto: 'Adorei o módulo', contexto: 'qualquer' }).ok?.contexto).toBeNull();
    expect(validar({ tipo: 'outro', texto: 'Adorei o módulo' }).erro).toBe('bad-request');
    expect(validar({ tipo: 'duvida', texto: 'oi' }).erro).toBe('texto-curto');
    expect(validar({ tipo: 'duvida', texto: 'x'.repeat(2001) }).erro).toBe('texto-longo');
  });

  it('o aluno manda, o dono recebe por e-mail com resposta para o aluno, lê e marca como respondida', async () => {
    const enviados: { to: string[]; reply_to?: string; subject: string; text: string }[] = [];
    const env = envDeTeste({ ADMIN_EMAILS: 'dono@exemplo.com', RESEND_API_KEY: 're_x', EMAIL_FROM: 'contato@hebraicofluente.com.br' }) as Env;
    const ana = await aluno(env, 'ana@exemplo.com');
    vi.stubGlobal('fetch', async (_u: string, init?: RequestInit) => { enviados.push(JSON.parse(String(init?.body))); return new Response('{"id":"x"}'); });
    const esperas: Promise<unknown>[] = [];
    const r = await chamar(env, 'POST', '/api/mensagens', ana.cookie, { tipo: 'duvida', texto: 'Como leio o kamats?', contexto: 'modulo-2' },
      { waitUntil: p => { esperas.push(p); } });
    expect(r.status).toBe(200);
    await Promise.all(esperas);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.to).toEqual(['dono@exemplo.com']);
    expect(enviados[0]!.reply_to).toBe('ana@exemplo.com');
    expect(enviados[0]!.text).toContain('Como leio o kamats?');
    vi.unstubAllGlobals();

    const minhas = await (await chamar(env, 'GET', '/api/mensagens', ana.cookie)).json() as { mensagens: { texto: string; contexto: string; respondidaEm: number | null }[] };
    expect(minhas.mensagens).toMatchObject([{ texto: 'Como leio o kamats?', contexto: 'modulo-2', respondidaEm: null }]);

    const dono = await aluno(env, 'dono@exemplo.com', false);
    dono.cookie = await comoAdmin(env, dono.cookie);
    expect((await chamar(env, 'GET', '/api/admin/mensagens', ana.cookie)).status).toBe(403);
    const lista = await (await chamar(env, 'GET', '/api/admin/mensagens', dono.cookie)).json() as { mensagens: { id: number; email: string }[] };
    expect(lista.mensagens).toHaveLength(1);
    expect(lista.mensagens[0]!.email).toBe('ana@exemplo.com');
    expect((await chamar(env, 'PUT', '/api/admin/mensagens', dono.cookie, { id: lista.mensagens[0]!.id, respondida: true })).status).toBe(200);
    const depois = await (await chamar(env, 'GET', '/api/mensagens', ana.cookie)).json() as { mensagens: { respondidaEm: number | null }[] };
    expect(depois.mensagens[0]!.respondidaEm).toBeTypeOf('number');
  });

  it('só quem tem o curso; e a conta apagada leva as mensagens; "Meus dados" as traz', async () => {
    const env = envDeTeste() as Env;
    const sem = await aluno(env, 'sem@exemplo.com', false);
    expect((await chamar(env, 'POST', '/api/mensagens', sem.cookie, { tipo: 'duvida', texto: 'Como leio o kamats?' })).status).toBe(403);
    const ana = await aluno(env, 'ana@exemplo.com');
    await chamar(env, 'POST', '/api/mensagens', ana.cookie, { tipo: 'comentario', texto: 'Adorei o curso até aqui!' });
    const dados = await dadosDaConta(env, { id: ana.id, email: 'ana@exemplo.com', created_at: 0 });
    expect(dados.mensagens).toMatchObject([{ tipo: 'comentario', texto: 'Adorei o curso até aqui!' }]);
    await deleteAccount(env, ana.id);
    expect(env.DB.bruto.prepare('SELECT COUNT(*) AS n FROM mensagens').get()).toEqual({ n: 0 });
  });

  it('a página fica atrás do portão', () => {
    expect(isGatedPath('/fale-comigo/')).toBe(true);
    expect(PAGAS).toContain('/fale-comigo');
  });
});

/* A gravação PENDENTE do painel /admin/gravar (04/11/2026, pedido do dono).
 *
 *   · só administrador marca;
 *   · só gravação que existe pode ficar pendente;
 *   · o aluno continua ouvindo a gravação marcada;
 *   · salvar a nova tira a marca;
 *   · a migração 0005 já marca as duas que a conferência achou no limite.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cookieDe, envDeTeste, pedido, comoAdmin } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import worker from '../../worker/src/worker.js';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - módulo JS do Worker, sem tipos
import { idDoClipe } from '../../worker/src/lib/nomes-audio.js';
import catalogo from '../../data/audio.json';

const SITE = 'https://hebraicofluente.com.br';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };
const ADMIN = 'dono@hebraicofluente.com.br';
type Clip = { num: number; translit: string | null; file: string };
const CLIPES = (catalogo as { clips: Clip[] }).clips;
const ALEF = idDoClipe(CLIPES.find(c => c.translit === 'Álef')!);

const mp4 = () => {
  const b = new Uint8Array(64);
  b.set([0, 0, 0, 24], 0);
  b.set([...'ftypM4A '].map(c => c.charCodeAt(0)), 4);
  return b;
};

async function cenario() {
  const env = envDeTeste({ ADMIN_EMAILS: ADMIN });
  const criar = async (email: string) => cookieDe(await auth.signup({
    request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Teste', email, password: 'senha-boa-123' }),
    env, ctx
  }));
  const admin = await comoAdmin(env, await criar(ADMIN));
  const aluno = await criar('aluna@exemplo.com.br');
  const chamar = (metodo: string, caminho: string, cookie: string, body?: BodyInit, headers: Record<string, string> = {}) =>
    worker.fetch(new Request(`${SITE}${caminho}`, {
      method: metodo, body, headers: { Cookie: cookie, Origin: SITE, ...headers }
    }), env, ctx) as Promise<Response>;
  const marcar = (id: string, pendente: boolean, cookie = admin) =>
    chamar('POST', '/api/admin/audio/pendente', cookie, JSON.stringify({ id, pendente }), { 'Content-Type': 'application/json' });
  const enviar = () => chamar('PUT', `/api/admin/audio?id=${ALEF}`, admin, mp4() as unknown as BodyInit, { 'Content-Type': 'audio/mp4' });
  const lista = async () => (await (await chamar('GET', '/api/admin/audio', admin)).json()) as
    { gravacoes: Record<string, { pendente: boolean }> };
  return { env, admin, aluno, marcar, enviar, lista };
}

describe('PENDENTE', () => {
  it('só administrador marca, e só gravação que existe', async () => {
    const { aluno, marcar, enviar } = await cenario();
    expect((await marcar(ALEF, true)).status).toBe(404);
    expect((await enviar()).status).toBe(200);
    expect((await marcar(ALEF, true, aluno)).status).toBe(403);
    expect((await marcar('he-00000000', true)).status).toBe(404);
    expect((await marcar(ALEF, true)).status).toBe(200);
  });

  it('a lista mostra a marca, desmarcar tira, e salvar a nova também tira', async () => {
    const { marcar, enviar, lista } = await cenario();
    await enviar();
    expect((await lista()).gravacoes[ALEF]!.pendente).toBe(false);
    await marcar(ALEF, true);
    expect((await lista()).gravacoes[ALEF]!.pendente).toBe(true);
    await marcar(ALEF, false);
    expect((await lista()).gravacoes[ALEF]!.pendente).toBe(false);
    await marcar(ALEF, true);
    await enviar();
    expect((await lista()).gravacoes[ALEF]!.pendente).toBe(false);
  });

  it('a migração marca as gravações nº 795 e nº 838', () => {
    const sql = readFileSync(new URL('../../worker/migrations/0005-gravacoes-pendente.sql', import.meta.url), 'utf8');
    for (const num of [795, 838]) {
      const c = CLIPES.find(x => x.num === num)!;
      expect(sql).toContain(`'${idDoClipe(c)}'`);
    }
  });
});

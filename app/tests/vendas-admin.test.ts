/* Quem comprou (02/10/2026): o painel /admin/vendas. Ver
 * worker/src/api/vendas-admin.js.
 *
 *   · só o administrador, com o código, lista;
 *   · entram as pagas e as estornadas, não as pendentes nem as recusadas;
 *   · o pedido feito com a parceria guarda o nome dela, e a lista mostra.
 */
import { describe, expect, it } from 'vitest';
import { cookieDe, envDeTeste, pedido, comoAdmin } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import worker from '../../worker/src/worker.js';
// @ts-expect-error - idem
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - idem
import { createOrder } from '../../worker/src/lib/db.js';

const SITE = 'https://hebraicofluente.com.br';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };
type Env = ReturnType<typeof envDeTeste> & { DB: { bruto: import('node:sqlite').DatabaseSync } };
const DONO = 'dono@exemplo.com';

async function conta(env: Env, email: string, name = 'X') {
  const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`,
    { aceitouTermos: true, declarouIdade: true, name, email, password: 'senha-boa-123' }), env, ctx });
  return cookieDe(r);
}
const idDe = (env: Env, email: string) =>
  (env.DB.bruto.prepare('SELECT id FROM accounts WHERE email = ?').get(email) as { id: number }).id;
const listar = (env: Env, cookie: string) =>
  worker.fetch(new Request(`${SITE}/api/admin/vendas`, { headers: { cookie } }), env, ctx);

describe('o painel de vendas', () => {
  it('só o administrador com o código lista', async () => {
    const env = envDeTeste({ ADMIN_EMAILS: DONO }) as Env;
    const aluno = await conta(env, 'ana@exemplo.com');
    const soSenha = await conta(env, DONO);
    expect((await listar(env, aluno)).status).toBe(403);
    expect(await (await listar(env, soSenha)).json()).toEqual({ error: 'admin-codigo' });
  });

  it('lista quem pagou, com o link de onde veio', async () => {
    const env = envDeTeste({ ADMIN_EMAILS: DONO }) as Env;
    await conta(env, 'ana@exemplo.com', 'Ana');
    await conta(env, 'bia@exemplo.com', 'Bia');
    const dono = await comoAdmin(env, await conta(env, DONO));
    const ana = idDe(env, 'ana@exemplo.com');
    const bia = idDe(env, 'bia@exemplo.com');

    const doLink = await createOrder(env, { accountId: ana, courseSlug: 'alfabetizacao', amountCents: 14700, method: 'card', installments: 12, parceria: 'sefarad' });
    const semLink = await createOrder(env, { accountId: bia, courseSlug: 'alfabetizacao', amountCents: 13230, method: 'pix' });
    const pendente = await createOrder(env, { accountId: bia, courseSlug: 'alfabetizacao', amountCents: 13230, method: 'pix' });
    expect(doLink.parceria).toBe('sefarad');
    expect(semLink.parceria).toBeNull();
    env.DB.bruto.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").run(2000, doLink.id);
    env.DB.bruto.prepare("UPDATE orders SET status = 'refunded', paid_at = ? WHERE id = ?").run(1000, semLink.id);

    const { vendas } = await (await listar(env, dono)).json() as { vendas: Record<string, unknown>[] };
    expect(vendas).toEqual([
      { orderId: doLink.id, curso: 'alfabetizacao', valorCentavos: 14700, liquidoCentavos: null, metodo: 'card', parcelas: 12,
        status: 'paid', pagoEm: 2000, parceria: 'sefarad', origem: null, campanha: null, nome: 'Ana', email: 'ana@exemplo.com', nomeCompleto: null, cpf: null,
        estudouEm: null, concluidas: [], teste: false, desistiuEm: null, exameFeito: false, diasDeEstudo: 0, minutosEstimados: 0, revisoes: [], leituras: [] },
      { orderId: semLink.id, curso: 'alfabetizacao', valorCentavos: 13230, liquidoCentavos: null, metodo: 'pix', parcelas: 1,
        status: 'refunded', pagoEm: 1000, parceria: null, origem: null, campanha: null, nome: 'Bia', email: 'bia@exemplo.com', nomeCompleto: null, cpf: null,
        estudouEm: null, concluidas: [], teste: false, desistiuEm: null, exameFeito: false, diasDeEstudo: 0, minutosEstimados: 0, revisoes: [], leituras: [] }
    ]);
    expect(vendas.some(v => v.orderId === pendente.id)).toBe(false);
  });

  it('diz se quem comprou já começou o curso, e que lições concluiu', async () => {
    const env = envDeTeste({ ADMIN_EMAILS: DONO }) as Env;
    await conta(env, 'ana@exemplo.com', 'Ana');
    await conta(env, 'bia@exemplo.com', 'Bia');
    await conta(env, 'caio@exemplo.com', 'Caio');
    const dono = await comoAdmin(env, await conta(env, DONO));
    const [ana, bia, caio] = ['ana', 'bia', 'caio'].map(n => idDe(env, `${n}@exemplo.com`)) as [number, number, number];
    for (const [id, quando] of [[ana, 3000], [bia, 2000], [caio, 1000]] as [number, number][]) {
      const o = await createOrder(env, { accountId: id, courseSlug: 'alfabetizacao', amountCents: 14700, method: 'card' });
      env.DB.bruto.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").run(quando, o.id);
    }
    const estado = { version: 2, lessons: {
      alef: { letterId: 'alef', completedAt: '2026-10-04T12:00:00Z' },
      mem: { letterId: 'mem', completedAt: '2026-10-04T13:00:00Z' },
      shin: { letterId: 'shin', completedAt: null }
    } };
    env.DB.bruto.prepare('INSERT INTO progress (account_id, state, version, rev, updated_at) VALUES (?, ?, 2, 1, ?)')
      .run(ana, JSON.stringify(estado), 5000);
    /* um estado estragado não derruba a lista: vira lista vazia */
    env.DB.bruto.prepare('INSERT INTO progress (account_id, state, version, rev, updated_at) VALUES (?, ?, 2, 1, ?)')
      .run(bia, '{isto não é json', 4000);

    const { vendas } = await (await listar(env, dono)).json() as { vendas: Record<string, unknown>[] };
    expect(vendas.map(v => [v.nome, v.estudouEm, v.concluidas])).toEqual([
      ['Ana', 5000, ['alef', 'mem']], ['Bia', 4000, []], ['Caio', null, []]
    ]);
  });

  it('diz em quantos dias a pessoa estudou e estima o tempo de prática', async () => {
    const env = envDeTeste({ ADMIN_EMAILS: DONO }) as Env;
    await conta(env, 'ana@exemplo.com', 'Ana');
    const dono = await comoAdmin(env, await conta(env, DONO));
    const ana = idDe(env, 'ana@exemplo.com');
    const o = await createOrder(env, { accountId: ana, courseSlug: 'alfabetizacao', amountCents: 14700, method: 'card' });
    env.DB.bruto.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").run(1000, o.id);
    const estado = { version: 2, lessons: {}, days: {
      '2026-11-01': { answered: 10, units: 90, xp: 0, goalMet: true },
      '2026-11-02': { answered: 4, units: 45, xp: 0, goalMet: true },
      '2026-11-03': { answered: 0, units: 0, xp: 0, goalMet: false }
    } };
    env.DB.bruto.prepare('INSERT INTO progress (account_id, state, version, rev, updated_at) VALUES (?, ?, 2, 1, ?)')
      .run(ana, JSON.stringify(estado), 5000);
    const { vendas } = await (await listar(env, dono)).json() as { vendas: Record<string, unknown>[] };
    /* 135 unidades de 20 segundos = 45 minutos; o dia sem nada não conta */
    expect(vendas.map(v => [v.nome, v.diasDeEstudo, v.minutosEstimados])).toEqual([['Ana', 2, 45]]);
  });

  it('lista os pedidos não pagos, e diz se a pessoa comprou depois', async () => {
    const env = envDeTeste({ ADMIN_EMAILS: DONO }) as Env;
    await conta(env, 'ana@exemplo.com', 'Ana');
    await conta(env, 'bia@exemplo.com', 'Bia');
    const dono = await comoAdmin(env, await conta(env, DONO));
    const ana = idDe(env, 'ana@exemplo.com');
    const bia = idDe(env, 'bia@exemplo.com');
    const venceu = await createOrder(env, { accountId: ana, courseSlug: 'alfabetizacao', amountCents: 13230, method: 'pix' });
    env.DB.bruto.prepare("UPDATE orders SET status = 'expired' WHERE id = ?").run(venceu.id);
    const pagou = await createOrder(env, { accountId: ana, courseSlug: 'alfabetizacao', amountCents: 13230, method: 'pix' });
    env.DB.bruto.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").run(Date.now(), pagou.id);
    const espera = await createOrder(env, { accountId: bia, courseSlug: 'alfabetizacao', amountCents: 14700, method: 'card' });
    /* o teste do dono não entra */
    const doDono = await createOrder(env, { accountId: idDe(env, DONO), courseSlug: 'alfabetizacao', amountCents: 14700, method: 'pix' });

    const { naoPagos } = await (await listar(env, dono)).json() as { naoPagos: Record<string, unknown>[] };
    const porId = Object.fromEntries(naoPagos.map(x => [x.orderId, x]));
    expect(porId[venceu.id]).toMatchObject({ nome: 'Ana', status: 'expired', metodo: 'pix', comprouDepois: true });
    expect(porId[espera.id]).toMatchObject({ nome: 'Bia', status: 'pending', comprouDepois: false });
    expect(porId[pagou.id]).toBeUndefined();
    expect(porId[doDono.id]).toBeUndefined();
  });

  it('diz as revisões e as leituras feitas', async () => {
    const env = envDeTeste({ ADMIN_EMAILS: DONO }) as Env;
    await conta(env, 'ana@exemplo.com', 'Ana');
    const dono = await comoAdmin(env, await conta(env, DONO));
    const ana = idDe(env, 'ana@exemplo.com');
    const o = await createOrder(env, { accountId: ana, courseSlug: 'alfabetizacao', amountCents: 14700, method: 'card' });
    env.DB.bruto.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").run(1000, o.id);
    const estado = { version: 2, lessons: {},
      checkpoints: { cp1: { id: 'cp1', best: 0.9, attempts: 1, passedAt: '2026-11-01T10:00:00Z' }, cp2: { id: 'cp2', best: 0.5, attempts: 1, passedAt: null } },
      firsts: { 'primeira-leitura-m1': '2026-11-01', 'texto-2': '2026-11-02', 'meu-nome': '2026-11-02' } };
    env.DB.bruto.prepare('INSERT INTO progress (account_id, state, version, rev, updated_at) VALUES (?, ?, 2, 1, ?)')
      .run(ana, JSON.stringify(estado), 5000);
    const { vendas } = await (await listar(env, dono)).json() as { vendas: Record<string, unknown>[] };
    expect(vendas[0]).toMatchObject({ revisoes: ['cp1'], leituras: ['primeira-leitura-m1', 'texto-2'] });
  });
});

/* O trilho de reserva, ponta a ponta (auditoria de 01/10/2026, PAY-B-014).
 * ─────────────────────────────────────────────────────────────────────────
 * Quando a credencial da Mercado Pago não autentica na publicação, o site
 * vai ao ar em `pix-direto` (scripts/pagamento-ativo.mjs): o BR Code é nosso,
 * nada confirma o pagamento sozinho, e a liberação é o `liberar` com
 * `pedido` da Action. Nenhum teste passava por esse caminho inteiro. Este
 * arquivo troca o modo em data/empresa.json só para ele e percorre: criar
 * o PIX (sem chamada de rede nenhuma), a tela consultar sem girar, o código
 * ser reaberto, a varredura não expirar nem perguntar, a Action liberar o
 * pedido, o recibo sair, e a desistência virar estorno com o dono.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieDe, envDeTeste, pedido, DADOS_FISCAIS } from './ajuda/d1';
import { PIX_CENTAVOS, PIX_TEXTO } from './ajuda/preco';

vi.mock('../../data/empresa.json', () => {
  const real = JSON.parse(readFileSync(new URL('../../data/empresa.json', import.meta.url), 'utf8'));
  return { default: { ...real, pagamento: { ...real.pagamento, modo: 'pix-direto' } } };
});

// @ts-expect-error - módulo JS do Worker, sem tipos
const auth = await import('../../worker/src/api/auth.js');
// @ts-expect-error - idem
const pay = await import('../../worker/src/api/pay.js');
// @ts-expect-error - idem
const { runReconcile } = await import('../../worker/src/reconcile.js');
// @ts-expect-error - idem
const { hasEntitlement } = await import('../../worker/src/lib/db.js');
// @ts-expect-error - idem
const { confereBrCode } = await import('../../worker/src/lib/pix.js');

const SITE = 'https://hebraicofluente.com.br';
const ctx = { waitUntil: (_p: Promise<unknown>) => {} };
type Env = Record<string, unknown> & { DB: { bruto: import('node:sqlite').DatabaseSync } };

let chamadas: string[];
let enviados: { to: string; subject: string; text: string }[];
beforeEach(() => {
  chamadas = []; enviados = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.host === 'api.resend.test') {
      const b = JSON.parse(String(init?.body ?? '{}'));
      if (!String(b.subject).startsWith('Confirme seu e-mail')) enviados.push({ to: b.to[0], subject: b.subject, text: b.text });
      return new Response('{"id":"m"}', { status: 200 });
    }
    chamadas.push(String(url));
    return new Response('{}', { status: 500 });
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

const SCRIPT = fileURLToPath(new URL('../../scripts/sql-liberar-pedido.sh', import.meta.url));

describe('PIX direto, do código ao recibo', () => {
  it('cria, reabre, espera a Action, libera, manda o recibo e aceita a desistência', async () => {
    /* Sem MP_ACCESS_TOKEN: no PIX direto ele não faz falta. */
    const env = envDeTeste({
      RESEND_API_KEY: 're_teste', EMAIL_FROM: 'Hebraico Fluente <c@hebraicofluente.com.br>',
      RESEND_BASE: 'https://api.resend.test', SUPPORT_EMAIL: 'dono@exemplo.com'
    }) as Env;
    const s = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Ana', email: 'ana@exemplo.com.br', password: 'senha-boa-123' }), env, ctx });
    const cookie = cookieDe(s);
    const { account } = await s.json() as { account: { id: number } };

    /* Cartão não existe neste trilho. */
    const cartao = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'card' }, { Cookie: cookie }), env, ctx });
    expect(cartao.status).toBe(409);
    expect(await cartao.json()).toEqual({ error: 'card-off' });

    const r = await pay.create({ request: pedido(`${SITE}/api/pay/create`, { ...DADOS_FISCAIS, courseSlug: 'alfabetizacao', method: 'pix', amount: 1 }, { Cookie: cookie }), env, ctx });
    expect(r.status).toBe(200);
    const ordem = await r.json() as { id: string; status: string; amountCents: number; pix: { code: string } };
    expect(ordem).toMatchObject({ status: 'pending', amountCents: PIX_CENTAVOS });
    expect(confereBrCode(ordem.pix.code).ok, 'BR Code inválido').toBe(true);
    expect(ordem.pix.code).toContain(PIX_TEXTO);
    expect(chamadas, 'o PIX direto chamou a rede').toEqual([]);

    /* A tela consulta e recebe o que está gravado, sem perguntar a ninguém. */
    const v = await pay.verify({ request: new Request(`${SITE}/api/pay/verify?order=${ordem.id}`, { headers: { Cookie: cookie } }), env });
    expect((await v.json() as { status: string }).status).toBe('pending');

    /* Voltou ao checkout: o mesmo código. */
    const aberto = await pay.pixAberto({ request: new Request(`${SITE}/api/pay/pix?curso=alfabetizacao`, { headers: { Cookie: cookie } }), env });
    expect((await aberto.json() as { order: { pix: { code: string } } }).order.pix.code).toBe(ordem.pix.code);

    /* Dois dias depois, a varredura não expirou nem perguntou nada. */
    env.DB.bruto.prepare('UPDATE orders SET created_at = created_at - ?').run(2 * 86_400_000);
    await runReconcile(env);
    expect(env.DB.bruto.prepare('SELECT status FROM orders').get()).toEqual({ status: 'pending' });
    expect(chamadas).toEqual([]);
    expect(await hasEntitlement(env, account.id, 'alfabetizacao')).toBe(false);

    /* O dono confere o extrato e roda a Action. */
    env.DB.bruto.exec(execFileSync('bash', [SCRIPT, ordem.id, 'ana@exemplo.com.br', '12'], { encoding: 'utf8' }));
    expect(await hasEntitlement(env, account.id, 'alfabetizacao')).toBe(true);
    await runReconcile(env);
    expect(enviados.filter(m => m.to === 'ana@exemplo.com.br').map(m => m.subject))
      .toEqual(['Seu acesso está liberado - Alfabetização em Hebraico']);

    /* A desistência pelo site existe, e o estorno é com o dono. */
    const d = await pay.desistir({ request: pedido(`${SITE}/api/pay/desistir`, { order: ordem.id }, { Cookie: cookie }), env, ctx });
    expect(d.status).toBe(200);
    expect(env.DB.bruto.prepare('SELECT estado FROM estornos').get()).toEqual({ estado: 'manual' });
  });
});

/* O nome completo e o CPF da nota fiscal (06/11/2026): a regra da tela
 * (app/src/lib/cpf.ts) e a do servidor (worker/src/lib/cpf.js) concordam, e o
 * pedido do site brasileiro não nasce sem eles. */
import { describe, expect, it, vi } from 'vitest';
import { cpfValido, mascaraCpf, nomeCompletoValido } from '@/lib/cpf';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as servidor from '../../worker/src/lib/cpf.js';

const CPFS = ['529.982.247-25', '52998224725', '111.444.777-35', '529.982.247-24', '111.111.111-11', '123', '', '5299822472a', '000.000.000-00'];
const NOMES = ['Maria da Silva', '  João   Pereira ', 'Ana', 'Ana B.', "Joana D'Arc Souza", 'José-Maria Ávila', 'Maria 123', 'x'.repeat(130) + ' y'];

describe('dados da nota fiscal', () => {
  it('o CPF confere os dígitos verificadores e recusa sequências repetidas', () => {
    expect(cpfValido('529.982.247-25')).toBe('52998224725');
    expect(cpfValido('111.444.777-35')).toBe('11144477735');
    expect(cpfValido('529.982.247-24')).toBeNull();
    expect(cpfValido('111.111.111-11')).toBeNull();
    expect(cpfValido('123')).toBeNull();
  });
  it('o nome completo pede nome e sobrenome, só com letras', () => {
    expect(nomeCompletoValido('  João   Pereira ')).toBe('João Pereira');
    expect(nomeCompletoValido('Ana')).toBeNull();
    expect(nomeCompletoValido('Maria 123')).toBeNull();
    expect(nomeCompletoValido("Joana D'Arc Souza")).toBe("Joana D'Arc Souza");
  });
  it('a tela e o servidor dão a mesma resposta', () => {
    for (const c of CPFS) expect(servidor.cpfValido(c), c).toBe(cpfValido(c));
    for (const n of NOMES) expect(servidor.nomeCompletoValido(n), n).toBe(nomeCompletoValido(n));
  });
  it('a máscara do CPF enquanto se digita', () => {
    expect(mascaraCpf('529')).toBe('529');
    expect(mascaraCpf('5299')).toBe('529.9');
    expect(mascaraCpf('5299822')).toBe('529.982.2');
    expect(mascaraCpf('52998224725999')).toBe('529.982.247-25');
  });
});

/* O pedido no servidor: sem os dados, recusa; com eles, grava no pedido; ao
   apagar a conta, só a venda paga guarda o CPF. */
import { cookieDe, DADOS_FISCAIS, envDeTeste, pedido } from './ajuda/d1';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as pay from '../../worker/src/api/pay.js';
// @ts-expect-error - módulo JS do Worker, sem tipos
import * as auth from '../../worker/src/api/auth.js';
// @ts-expect-error - módulo JS do Worker, sem tipos
import { deleteAccount } from '../../worker/src/lib/db.js';

const SITE = 'https://hebraicofluente.com.br';
const ctx = { waitUntil: () => {} };

describe('o pedido do site brasileiro', () => {
  it('sem nome completo ou CPF válido não nasce; com eles, ficam no pedido; ao apagar a conta, só a venda paga os guarda', async () => {
    const env = envDeTeste({ MP_ACCESS_TOKEN: 'TEST-x' }) as never as Record<string, never> & { DB: { bruto: { prepare(s: string): { all(...a: unknown[]): unknown[]; run(...a: unknown[]): unknown } } } };
    const r = await auth.signup({ request: pedido(`${SITE}/api/auth/signup`, { aceitouTermos: true, declarouIdade: true, name: 'Maria', email: 'maria@x.com', password: 'senha-boa-123' }), env, ctx });
    const cookie = cookieDe(r);
    /* A Mercado Pago não é chamada de verdade: o pedido fica falho, com os dados. */
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 500 }));
    const criar = (extra: Record<string, unknown>) =>
      pay.create({ request: pedido(`${SITE}/api/pay/create`, { courseSlug: 'alfabetizacao', method: 'pix', ...extra }, { Cookie: cookie }), env, ctx });
    for (const ruim of [{}, { nomeCompleto: 'Maria', cpf: DADOS_FISCAIS.cpf }, { nomeCompleto: DADOS_FISCAIS.nomeCompleto, cpf: '529.982.247-24' }]) {
      const res = await criar(ruim);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe('dados-fiscais');
    }
    expect(env.DB.bruto.prepare('SELECT COUNT(*) AS n FROM orders').all()).toEqual([{ n: 0 }]);
    await criar({ ...DADOS_FISCAIS });
    const linhas = env.DB.bruto.prepare('SELECT id, account_id, nome_completo, cpf FROM orders').all() as { id: string; account_id: number; nome_completo: string; cpf: string }[];
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ nome_completo: 'Maria da Silva', cpf: '52998224725' });
    /* Um pedido pago e um que não foi: ao apagar a conta, só o pago guarda. */
    env.DB.bruto.prepare(`INSERT INTO orders (id, account_id, course_slug, amount_cents, method, status, created_at, nome_completo, cpf)
      VALUES ('HFPAGO', ?, 'alfabetizacao', 100, 'pix', 'paid', 1, 'Maria da Silva', '52998224725')`).run(linhas[0]!.account_id);
    await deleteAccount(env, linhas[0]!.account_id);
    const depois = env.DB.bruto.prepare('SELECT id, nome_completo, cpf FROM orders ORDER BY id').all() as { id: string; cpf: string | null }[];
    expect(depois.find(o => o.id === 'HFPAGO')?.cpf).toBe('52998224725');
    expect(depois.find(o => o.id !== 'HFPAGO')?.cpf).toBeNull();
  });
});

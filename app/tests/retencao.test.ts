/* Os alunos voltam? (06/11/2026): worker/src/lib/retencao.js. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do worker, sem tipos
import { retencao, retencaoDoBanco } from '../../worker/src/lib/retencao.js';
import { bancoDeTeste } from './ajuda/d1';

describe('os alunos voltam?', () => {
  const hoje = '2026-11-20';
  it('conta só quem já teve tempo: o dia seguinte e a segunda semana', () => {
    const r = retencao([
      ['2026-11-01', '2026-11-02', '2026-11-09'],   // voltou no dia 2 e na semana 2
      ['2026-11-01', '2026-11-05'],                 // não voltou no dia 2 nem na semana 2
      ['2026-11-19'],                               // começou ontem: fora das duas bases
      ['2026-11-18', '2026-11-19', '2026-11-20'],   // dia 2 sim; semana 2 ainda não conta
      [],                                           // nunca estudou
      ['lixo', '2026-12-31']                        // datas inválidas ou no futuro não contam
    ], hoje);
    expect(r.alunos).toBe(4);
    expect(r.baseDia2).toBe(3);
    expect(r.voltouDia2).toBe(2);
    expect(r.baseSemana2).toBe(2);
    expect(r.voltouSemana2).toBe(1);
    expect(r.ativos7).toBe(2);
  });
  it('sem alunos, zeros', () => {
    expect(retencao([], hoje)).toEqual({ alunos: 0, baseDia2: 0, voltouDia2: 0, baseSemana2: 0, voltouSemana2: 0, ativos7: 0 });
  });
  it('lê os dias no banco (json_each) e deixa as contas de admin de fora', async () => {
    const DB = bancoDeTeste();
    const conta = (id: number, email: string, dias: string[]) => {
      DB.bruto.prepare('INSERT INTO accounts (id, email, pass_hash, pass_salt, created_at) VALUES (?, ?, ?, ?, ?)').run(id, email, 'h', 's', 1);
      DB.bruto.prepare('INSERT INTO progress (account_id, state, updated_at) VALUES (?, ?, ?)')
        .run(id, JSON.stringify({ days: Object.fromEntries(dias.map(d => [d, { answered: 1 }])) }), 1);
    };
    conta(1, 'aluna@x.com', ['2026-11-01', '2026-11-02']);
    conta(2, 'aluno@x.com', ['2026-11-01']);
    conta(3, 'dono@x.com', ['2026-11-01', '2026-11-02', '2026-11-19']);
    const r = await retencaoDoBanco({ DB }, ['dono@x.com'], hoje);
    expect(r.alunos).toBe(2);
    expect(r.voltouDia2).toBe(1);
    expect(r.baseDia2).toBe(2);
  });
});

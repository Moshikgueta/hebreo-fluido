/* Os textos na área de prática abrem só depois de lidos no lugar deles no
 * curso (05/11/2026, decisão do dono). lib/leituras-do-curso.ts. */
import { describe, expect, it } from 'vitest';
import { leiturasDoModulo } from '@/lib/leituras-do-curso';
import { course } from '@/lib/content';
import { textoLidoId } from '@/lib/engine/textos';
import { primeiraLeituraId } from '@/lib/laboratorio';
import type { LearnerState } from '@/lib/state/types';

const estado = (firsts: Record<string, string>, lessons: Record<string, unknown> = {}) =>
  ({ firsts, lessons, checkpoints: {} }) as unknown as LearnerState;
const m2 = course.modules.find(m => m.n === 2)!;

describe('textos na prática', () => {
  it('módulo começado, texto não lido: trancado, dizendo o módulo', () => {
    const s = estado({}, { gimel: { letterId: 'gimel', stagesDone: [1, 2, 3, 4, 5] } });
    const tx = leiturasDoModulo(m2, s).find(l => l.id === 'tx-2')!;
    expect(tx.aberta).toBe(false);
    expect(tx.porque).toContain('2');
  });

  it('lido no módulo: abre', () => {
    const s = estado({ [textoLidoId(2)]: '2026-11-05', [primeiraLeituraId(2)]: '2026-11-05' });
    const ls = leiturasDoModulo(m2, s);
    expect(ls.find(l => l.id === 'tx-2')!.aberta).toBe(true);
    expect(ls.find(l => l.id === 'pl-2')!.aberta).toBe(true);
    expect(ls.filter(l => l.id !== 'tx-2' && l.id !== 'pl-2').every(l => !l.aberta)).toBe(true);
  });

  it('todo texto do curso aparece, aberto ou trancado', () => {
    const todos = course.modules.flatMap(m => leiturasDoModulo(m, estado({})).filter(l => !l.id.startsWith('pl-')));
    expect(todos.length).toBe(18);
    expect(todos.every(l => !l.aberta && !!l.porque)).toBe(true);
  });
});

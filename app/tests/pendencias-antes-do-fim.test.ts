/* O que ficou para trás nos módulos 1 a 5, antes dos módulos 6 e 7 e do
 * exame final (05/11/2026, decisão do dono). */
import { describe, expect, it } from 'vitest';
import { pendenciasDasLetras } from '@/lib/state/rules';
import { primeiraLeituraId, textoLidoId } from '@/lib/engine/textos';
import { course } from '@/lib/content-publico';
import type { LearnerState } from '@/lib/state/types';

const vazio = { checkpoints: {}, firsts: {} } as unknown as LearnerState;
const tudo = (): LearnerState => {
  const checkpoints: Record<string, unknown> = {};
  const firsts: Record<string, string> = {};
  for (const m of course.modules) {
    if (m.kind !== 'letters') continue;
    if (m.checkpoint) checkpoints[m.checkpoint.id] = { id: m.checkpoint.id, best: 1, attempts: 1, passedAt: '2026-11-01' };
    firsts[primeiraLeituraId(m.n)] = '2026-11-01';
    if (m.textoPrincipal) firsts[textoLidoId(m.n)] = '2026-11-01';
  }
  return { checkpoints, firsts } as unknown as LearnerState;
};

describe('pendências dos módulos de letras', () => {
  it('olha só os módulos 1 a 5', () => {
    expect(pendenciasDasLetras(vazio, course.modules).map(p => p.modulo)).toEqual([1, 2, 3, 4, 5]);
  });

  it('usa os mesmos ids das leituras que o curso grava', () => {
    const [m2] = pendenciasDasLetras(vazio, course.modules).filter(p => p.modulo === 2);
    expect(m2!.faltaCheckpoint).toBe(true);
    expect(m2!.faltaLer).toEqual([
      { tipo: 'primeira', id: primeiraLeituraId(2) },
      { tipo: 'texto', id: textoLidoId(2) }
    ]);
  });

  it('tudo feito: nada pendente', () => {
    expect(pendenciasDasLetras(tudo(), course.modules)).toEqual([]);
  });

  it('o caso de 05/11: letras feitas, faltando textos e a revisão do 5', () => {
    const s = tudo();
    delete (s.firsts as Record<string, string>)[textoLidoId(2)];
    delete (s.firsts as Record<string, string>)[primeiraLeituraId(3)];
    delete (s.firsts as Record<string, string>)[textoLidoId(3)];
    delete (s.checkpoints as Record<string, unknown>).cp5;
    delete (s.firsts as Record<string, string>)[primeiraLeituraId(5)];
    delete (s.firsts as Record<string, string>)[textoLidoId(5)];
    const r = pendenciasDasLetras(s, course.modules);
    expect(r.map(p => [p.modulo, p.faltaCheckpoint, p.faltaLer.map(l => l.tipo)])).toEqual([
      [2, false, ['texto']],
      [3, false, ['primeira', 'texto']],
      [5, true, ['primeira', 'texto']]
    ]);
  });
});

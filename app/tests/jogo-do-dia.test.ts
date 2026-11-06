/* O jogo de hoje (06/11/2026): lib/engine/jogo-do-dia.ts. */
import { describe, expect, it } from 'vitest';
import { jogoDoDia } from '@/lib/engine/jogo-do-dia';

const base = { abertos: ['caca', 'batalha', 'ouvir', 'montar'] as const, hoje: '2026-11-06', letraDeHoje: null, trocas: [], ultimaVez: {}, caca: 'caca' as const, batalha: 'batalha' as const };

describe('o jogo de hoje', () => {
  it('aprendeu uma letra hoje: a caça à letra, com a letra', () => {
    expect(jogoDoDia({ ...base, letraDeHoje: 'Yud' })).toEqual({ jogo: 'caca', motivo: { tipo: 'letra-nova', letra: 'Yud' } });
  });
  it('trocou duas letras esta semana: a batalha, com o par que mais troca', () => {
    const trocas = [
      { correct: 'ב', chosen: 'כ', n: 2, lastOn: '2026-11-04' },
      { correct: 'ד', chosen: 'ר', n: 5, lastOn: '2026-11-05' },
      { correct: 'ה', chosen: 'ח', n: 9, lastOn: '2026-10-01' } // velha demais
    ];
    expect(jogoDoDia({ ...base, trocas })).toEqual({ jogo: 'batalha', motivo: { tipo: 'confusao', a: 'ד', b: 'ר' } });
  });
  it('senão, o que nunca jogou, e depois o que jogou há mais tempo', () => {
    const r = jogoDoDia({ ...base, ultimaVez: { caca: '2026-11-05', batalha: '2026-11-01', ouvir: '2026-11-03' } });
    expect(r).toEqual({ jogo: 'montar', motivo: { tipo: 'nunca-jogou' } });
    const r2 = jogoDoDia({ ...base, ultimaVez: { caca: '2026-11-05', batalha: '2026-11-01', ouvir: '2026-11-03', montar: '2026-11-04' } });
    expect(r2).toEqual({ jogo: 'batalha', motivo: { tipo: 'faz-tempo' } });
  });
  it('só entre os abertos; sem nenhum, nada', () => {
    expect(jogoDoDia({ ...base, abertos: ['ouvir'] as never, letraDeHoje: 'Yud' })?.jogo).toBe('ouvir');
    expect(jogoDoDia({ ...base, abertos: [] as never })).toBeNull();
  });
  it('varia de um dia para o outro quando nunca jogou nenhum', () => {
    const dias = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'].map(hoje => jogoDoDia({ ...base, hoje })!.jogo);
    expect(new Set(dias).size).toBeGreaterThan(1);
  });
});

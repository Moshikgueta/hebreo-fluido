/* A estrada do módulo no mapa (05/11/2026): o jarro (lib/state/rules.ts) e os
 * carimbos do checkpoint (components/aventura/EstradaDoModulo.tsx). */
import { describe, expect, it } from 'vitest';
import { abrirJarro, idDoJarro, XP } from '@/lib/state/rules';
import { EMPTY_STATE } from '@/lib/state/types';
import { mergeStates } from '@/lib/state/merge';
import { carimbosDaNota } from '@/components/aventura/EstradaDoModulo';

describe('o jarro do módulo', () => {
  it('paga XP.jarro (20) uma vez só', () => {
    const um = abrirJarro(EMPTY_STATE, 'm1', '2026-11-05');
    expect(XP.jarro).toBe(20);
    expect(um.xp).toBe(EMPTY_STATE.xp + 20);
    expect(um.firsts[idDoJarro('m1')]).toBeTruthy();
    expect(abrirJarro(um, 'm1', '2026-11-05')).toBe(um);
    expect(abrirJarro(um, 'm2', '2026-11-05').xp).toBe(EMPTY_STATE.xp + 40);
  });
  it('aberto em dois aparelhos antes de sincronizar não paga duas vezes', () => {
    const a = abrirJarro(EMPTY_STATE, 'm1', '2026-11-05');
    const b = abrirJarro(EMPTY_STATE, 'm1', '2026-11-05');
    const junto = mergeStates(a, b);
    expect(junto.xp).toBe(EMPTY_STATE.xp + 20);
    expect(junto.firsts[idDoJarro('m1')]).toBeTruthy();
  });
});

describe('os carimbos do checkpoint', () => {
  it('1 até 69%, 2 até 89%, 3 com 90% ou mais; nenhum sem aprovação', () => {
    expect(carimbosDaNota(0.95, false)).toBe(0);
    expect(carimbosDaNota(null, true)).toBe(0);
    expect(carimbosDaNota(0.6, true)).toBe(1);
    expect(carimbosDaNota(0.69, true)).toBe(1);
    expect(carimbosDaNota(0.7, true)).toBe(2);
    expect(carimbosDaNota(0.89, true)).toBe(2);
    expect(carimbosDaNota(0.9, true)).toBe(3);
  });
});

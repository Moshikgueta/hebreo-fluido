/* A prática interativa dentro de cada texto (05/11/2026):
 * lib/engine/pratica-do-texto.ts. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { praticaDoTexto, FRASES_PARA_MONTAR } from '@/lib/engine/pratica-do-texto';
import { stripNikud } from '@/lib/hebrew';
import type { Texto } from '@/lib/engine/textos';

const TEXTOS = (JSON.parse(readFileSync(new URL('../../data/textos.json', import.meta.url), 'utf8')) as { textos: Texto[] }).textos;
const semEspaco = (s: string) => s.replace(/\s+/g, '');

describe('prática interativa do texto', () => {
  it('todo texto tem frases para montar, e a frase montada é uma linha do texto', () => {
    for (const t of TEXTOS) {
      const ex = praticaDoTexto(t, `t-${t.modulo}`, 'alef');
      const frases = ex.filter(e => e.kind === 'build-word');
      expect(frases.length, t.tituloPt).toBeGreaterThanOrEqual(1);
      expect(frases.length, t.tituloPt).toBeLessThanOrEqual(FRASES_PARA_MONTAR);
      const linhas = t.linhas.map(l => semEspaco(t.semPontos ? stripNikud(l.he) : l.he));
      for (const f of frases) {
        if (f.kind !== 'build-word') continue;
        expect(linhas).toContain(f.target);
        expect(semEspaco(f.tiles.join(''))).not.toBe('');
        expect(f.tiles.join('')).not.toBe(f.target);
      }
    }
  });

  it('ligar: pares de palavras novas com sentidos diferentes', () => {
    for (const t of TEXTOS) {
      const lig = praticaDoTexto(t, `t-${t.modulo}`, 'alef').find(e => e.kind === 'match');
      if (!lig || lig.kind !== 'match') continue;
      expect(lig.pairs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(lig.pairs.map(p => p.right)).size).toBe(lig.pairs.length);
    }
  });

  it('ouvir só aparece com a gravação no ar', () => {
    const base = TEXTOS[0]!;
    const t: Texto = { ...base, linhas: base.linhas.map((l, i) => ({ ...l, audioId: `he-linha-${i}` })) };
    expect(praticaDoTexto(t, 'x', 'alef').some(e => e.kind === 'listen-meaning')).toBe(false);
    const com = praticaDoTexto(t, 'x', 'alef', () => true).find(e => e.kind === 'listen-meaning');
    expect(com).toBeTruthy();
    if (com && com.kind === 'listen-meaning') expect(com.options[com.answer]).toBe(t.linhas.find(l => l.audioId === com.audioId)!.pt);
  });

  it('a mesma semente dá a mesma prática', () => {
    expect(praticaDoTexto(TEXTOS[0]!, 's', 'alef')).toEqual(praticaDoTexto(TEXTOS[0]!, 's', 'alef'));
  });
});

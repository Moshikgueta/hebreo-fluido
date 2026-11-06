/* Minha Jornada no Hebraico (lib/jornada.ts, /mapa), 12/10/2026. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { course } from '@/lib/content-publico';
import { ETAPA_AULA0, ETAPA_DO_MODULO, ETAPA_FINAL } from '@/lib/jornada';

const fonte = (p: string) => readFileSync(join(__dirname, '..', 'src', p), 'utf8');

describe('as etapas do caminho', () => {
  it('uma por módulo que existe, na ordem do curso, sem nome repetido', () => {
    const ns = course.modules.map(m => m.n);
    expect(Object.keys(ETAPA_DO_MODULO).map(Number).sort()).toEqual([...ns].sort());
    const nomes = [ETAPA_AULA0, ...ns.map(n => ETAPA_DO_MODULO[n]!), ETAPA_FINAL];
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('todo módulo tem a meta que o mapa mostra', () => {
    for (const m of course.modules) expect(m.milestonePt?.trim(), `módulo ${m.n}`).toBeTruthy();
  });

  it('o mapa começa na Aula 0 e termina no desafio final', () => {
    /* Desde 06/11/2026 o mapa é uma estrada só (components/aventura/). */
    expect(fonte('app/mapa/CourseMapClient.tsx')).toContain('<EstradaDoModulo itens={estrada}');
    const s = fonte('components/aventura/estrada-do-modulo.ts');
    expect(s.indexOf("chave: 'aula0'")).toBeGreaterThan(-1);
    expect(s.indexOf("chave: 'aula0'")).toBeLessThan(s.indexOf("chave: 'final'"));
    /* A meta de cada módulo aparece no cartão da última estação dele. */
    expect(s).toContain("meta: m.milestonePt && !adiante ? { texto: m.milestonePt, alcancada: estadoM === 'feito' }");
    expect(fonte('components/aventura/EstradaDoModulo.tsx')).toContain('p.meta.alcancada ? tx.metaAlcancada : tx.meta');
    /* O texto mora no dicionário da tela (app/src/i18n/telas/). */
    expect(fonte('i18n/telas/painel-course-map-client.ts')).toContain("metaAlcancada: '✓ Meta alcançada: '");
    expect(s).toContain('isLessonMastered(p.state, l.id)');
  });

  it('o certificado diz o que o exame verificou', () => {
    expect(fonte('app/certificado/CertificadoClient.tsx')).toContain('<strong>{tx.verificouRotulo}</strong>');
    expect(fonte('i18n/telas/painel-certificado-client.tsx')).toContain("verificouRotulo: 'O que o exame verificou:'");
  });
});

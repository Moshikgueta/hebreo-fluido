/* A estação de trem (05/11/2026): lib/engine/trem.ts e data/estacao-de-trem.json. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  LINHAS_NO_PAINEL, MINIMO_DE_CIDADES, OPCOES_DA_PERGUNTA, PLATAFORMAS, ROTULOS, VIAGENS_POR_RODADA,
  cidadesLegiveis, opcoesDaPergunta, painel, painelDaViagem, respostaDe, tremAberto, viagensDaRodada, type CidadeDoTrem
} from '@/lib/engine/trem';
import { PARADAS } from '@/lib/engine/um-dia';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { conteudoPago } from '@/lib/content-servidor';
import { PAGAS } from '@/lib/seo';

const DADOS = (JSON.parse(readFileSync(new URL('../../data/estacao-de-trem.json', import.meta.url), 'utf8')) as { cidades: (CidadeDoTrem & { revisado: boolean })[] }).cidades;
const cidades = conteudoPago.umDia.trem ?? [];
const letras = conteudoPago.letters;
const semChatafNemDaguesh = (he: string, id: string) => {
  expect(/[\u05B1-\u05B3]/u.test(he), id).toBe(false);
  const comPonto = [...he.normalize('NFC').matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(m => m[1]);
  for (const l of comPonto) expect('בכךפףו', `${id}: ${l}`).toContain(l);
};

describe('a estação de trem', () => {
  it('saem só as cidades revisadas, sem a marca, sem repetir', () => {
    expect(cidades.map(c => c.id)).toEqual(DADOS.filter(c => c.revisado).map(c => c.id));
    expect(cidades.length).toBeGreaterThanOrEqual(LINHAS_NO_PAINEL);
    expect(new Set(cidades.map(c => c.he)).size).toBe(cidades.length);
    for (const c of cidades) {
      expect('revisado' in c).toBe(false);
      expect(c.translit && c.pt, c.id).toBeTruthy();
    }
  });

  it('sem chataf, e daguesh só em בּ/כּ/פּ, nas cidades e nos rótulos do painel', () => {
    for (const c of cidades) semChatafNemDaguesh(c.he, c.id);
    for (const [k, he] of Object.entries(ROTULOS)) semChatafNemDaguesh(he, k);
  });

  it('a parada está no mapa, com rota paga', () => {
    const rota = PARADAS.find(x => x.id === 'trem')?.rota;
    expect(rota).toBe('/um-dia-em-israel/trem');
    expect(PAGAS.some(p => rota!.startsWith(p))).toBe(true);
  });

  it('com nenhuma letra, nenhuma cidade; com as 22, todas', () => {
    expect(cidadesLegiveis(cidades, []).prontas).toEqual([]);
    expect(cidadesLegiveis(cidades, letras).prontas.length).toBe(cidades.length);
  });

  it('o painel: horas sempre crescentes e diferentes, plataformas de 1 a 4', () => {
    for (let k = 0; k < 30; k++) {
      const linhas = painel(cidades, rng(`p-${k}`));
      const horas = linhas.map(l => l.hora);
      expect([...horas].sort()).toEqual(horas);
      expect(new Set(horas).size).toBe(horas.length);
      for (const l of linhas) {
        expect(l.hora).toMatch(/^\d\d:\d\d$/);
        expect(l.plataforma).toBeGreaterThanOrEqual(1);
        expect(l.plataforma).toBeLessThanOrEqual(PLATAFORMAS);
      }
    }
  });

  it('a cada letra, só aparecem cidades com letras já ensinadas; cada viagem tem resposta única', () => {
    const ordem = [...letras].sort((a, b) => a.order - b.order);
    for (let n = 1; n <= ordem.length; n++) {
      const ja = ordem.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const { prontas } = cidadesLegiveis(cidades, ja);
      for (const c of prontas) expect(consegueLer(c.he, alfabeto), c.id).toBe(true);
      if (!tremAberto(prontas)) continue;
      expect(prontas.length).toBeGreaterThanOrEqual(MINIMO_DE_CIDADES);
      const viagens = viagensDaRodada(prontas, rng(`v-${n}`));
      expect(viagens.length).toBe(Math.min(VIAGENS_POR_RODADA, prontas.length));
      expect(new Set(viagens.map(v => v.destino.id)).size).toBe(viagens.length);
      for (const v of viagens) {
        const linhas = painelDaViagem(v.destino, prontas, rng(`l-${n}-${v.destino.id}`));
        expect(linhas.length).toBe(Math.min(LINHAS_NO_PAINEL, prontas.length));
        expect(new Set(linhas.map(l => l.id)).size).toBe(linhas.length);
        for (const l of linhas) expect(consegueLer(l.he, alfabeto), l.id).toBe(true);
        const alvo = linhas.find(l => l.id === v.destino.id)!;
        const ops = opcoesDaPergunta(linhas, alvo, v.pergunta, rng(`o-${n}-${v.destino.id}`));
        expect(ops.length).toBe(OPCOES_DA_PERGUNTA);
        expect(new Set(ops).size).toBe(ops.length);
        expect(ops).toContain(respostaDe(alvo, v.pergunta));
      }
    }
  });
});

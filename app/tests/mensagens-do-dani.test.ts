/* Mensagens do Dani (05/11/2026): lib/engine/mensagens.ts e data/mensagens-do-dani.json. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MENSAGENS_POR_RODADA, MINIMO_DE_MENSAGENS, OPCOES_DA_MENSAGEM, conversaDaRodada, mensagensAbertas, mensagensLegiveis,
  opcoesDaMensagem, type MensagemDoDani
} from '@/lib/engine/mensagens';
import { PARADAS } from '@/lib/engine/um-dia';
import { alfabetoDe, consegueLer } from '@/lib/engine/palavras';
import { rng } from '@/lib/engine/rng';
import { conteudoPago } from '@/lib/content-servidor';
import { PAGAS } from '@/lib/seo';

const DADOS = (JSON.parse(readFileSync(new URL('../../data/mensagens-do-dani.json', import.meta.url), 'utf8')) as { mensagens: (MensagemDoDani & { revisado: boolean })[] }).mensagens;
const mensagens = conteudoPago.umDia.mensagens ?? [];
const letras = conteudoPago.letters;

describe('as mensagens do Dani', () => {
  it('saem só as mensagens revisadas, sem a marca, com sentidos diferentes', () => {
    expect(mensagens.map(m => m.id)).toEqual(DADOS.filter(m => m.revisado).map(m => m.id));
    expect(mensagens.length).toBeGreaterThanOrEqual(MENSAGENS_POR_RODADA);
    expect(new Set(mensagens.map(m => m.pt)).size).toBe(mensagens.length);
    for (const m of mensagens) {
      expect('revisado' in m).toBe(false);
      expect(m.hora).toMatch(/^\d\d:\d\d$/);
    }
  });

  it('sem chataf, e daguesh só em בּ/כּ/פּ', () => {
    for (const m of mensagens) {
      expect(/[\u05B1-\u05B3]/u.test(m.he), m.id).toBe(false);
      const comPonto = [...m.he.normalize('NFC').matchAll(/([\u05D0-\u05EA])[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC/gu)].map(x => x[1]);
      for (const l of comPonto) expect('בכךפףו', `${m.id}: ${l}`).toContain(l);
    }
  });

  it('a parada está no mapa, com rota paga', () => {
    const rota = PARADAS.find(x => x.id === 'mensagens')?.rota;
    expect(rota).toBe('/um-dia-em-israel/mensagens');
    expect(PAGAS.some(p => rota!.startsWith(p))).toBe(true);
  });

  it('a cada letra, só aparecem mensagens com letras já ensinadas; opções de mensagens que ele lê', () => {
    expect(mensagensLegiveis(mensagens, []).prontas).toEqual([]);
    expect(mensagensLegiveis(mensagens, letras).prontas.length).toBe(mensagens.length);
    const ordem = [...letras].sort((a, b) => a.order - b.order);
    for (let n = 1; n <= ordem.length; n++) {
      const ja = ordem.slice(0, n);
      const alfabeto = alfabetoDe(ja);
      const { prontas } = mensagensLegiveis(mensagens, ja);
      for (const m of prontas) expect(consegueLer(m.he, alfabeto), m.id).toBe(true);
      if (!mensagensAbertas(prontas)) continue;
      const doDani = prontas.filter(m => !m.minha);
      expect(doDani.length).toBeGreaterThanOrEqual(MINIMO_DE_MENSAGENS);
      const conversa = conversaDaRodada(prontas, rng(`c-${n}`));
      expect(conversa.length).toBe(Math.min(MENSAGENS_POR_RODADA, doDani.length));
      expect(new Set(conversa.map(m => m.id)).size).toBe(conversa.length);
      expect(conversa.every(m => !m.minha), 'a mensagem do aluno não entra no jogo').toBe(true);
      expect(conversa.map(m => m.hora)).toEqual([...conversa.map(m => m.hora)].sort());
      for (const m of conversa) {
        const ops = opcoesDaMensagem(m, prontas, rng(`o-${n}-${m.id}`));
        expect(ops.length).toBe(OPCOES_DA_MENSAGEM);
        expect(new Set(ops).size).toBe(ops.length);
        expect(ops).toContain(m.pt);
        const lidas = new Set(prontas.map(x => x.pt));
        for (const o of ops) expect(lidas.has(o), o).toBe(true);
      }
    }
  });
});

/* O baralho: uma fonte de dados para os três jogos.
 * ─────────────────────────────────────────────────────────────────────────
 * Match, Blast e Teste rápido não têm conteúdo próprio. Os três consomem o
 * MESMO baralho - uma lista de pares `{ he, pt }` com um tipo - e a diferença
 * entre eles é só o que se faz com o par:
 *
 *   Match  mostra os dois lados embaralhados e pede que se juntem;
 *   Blast  (o Canhão de letras) pede em português e o aluno acerta, entre
 *          quatro alvos em hebraico que se movem, o certo;
 *   Teste  mistura os dois sentidos e guarda os erros para revisão.
 *
 * Por que uma camada em vez de três jogos com dados próprios:
 *
 * · ESCALA. Hoje o baralho vem das 22 letras. O Hebraico A1 vem aí, e lá a
 *   matéria são palavras e formas verbais, não letras. `Fonte` é o formato
 *   comum: quem tiver `{ id, he, pt }` alimenta os três jogos sem que eles
 *   saibam de que curso vieram. `deLetras` é o primeiro adaptador; um
 *   `dePalavras` entra ao lado dele sem tocar em jogo nenhum.
 * · REGRA DA ORDEM. O curso não mostra letra que a pessoa ainda não viu, e
 *   isso vale para os distratores também - errar entre ג e ד só ensina se as
 *   duas já foram apresentadas. Quem monta o baralho passa as letras
 *   liberadas; daí para baixo ninguém precisa lembrar da regra.
 * · SEMENTE. Como no resto do motor, nada usa Math.random: a mesma semente
 *   dá o mesmo baralho, e "tentar de novo" é tentar o MESMO, não outro.
 */

import type { Letter } from '@/lib/content';
import { rng, shuffled, take, type Rand } from './rng';
import { fonemasDe, somPt } from '@/lib/som-pt';
import { tx } from '@/i18n/telas/motor-deck';

/** O que um par cobra do aluno. Fica no par para o placar poder dizer em que
 *  tipo de associação ele foi bem, e para o Teste variar de propósito. */
export type TipoPar = 'nome' | 'som' | 'silaba' | 'palavra';

export type Par = {
  id: string;
  /** O lado hebraico. Sempre renderizado por <He>, nunca cru. */
  he: string;
  /** O lado latino: nome da letra, som, transliteração ou tradução. */
  pt: string;
  tipo: TipoPar;
  /** De que letra este par saiu - o progresso é registrado por letra. */
  letterId: string;
  /** O som em IPA, quando o par é de som (ver `chavesDe`). */
  som?: string;
};

/** Qualquer conteúdo que sirva de baralho. É o contrato que um curso futuro
 *  precisa cumprir, e ele é curto de propósito. */
export type Fonte = {
  id: string;
  he: string;
  pt: string;
  tipo: TipoPar;
  letterId: string;
  /** O som em IPA, quando o par é de som: é por ele que dois sons iguais
   *  com rótulos diferentes ("k" do Kaf e do Kuf) se reconhecem. */
  som?: string;
};

/**
 * As chaves de "mesma resposta" de um par.
 *
 * Duas fontes com uma chave em comum não podem ser certa e distratora da
 * mesma pergunta, nem dois cartões do mesmo Match (auditoria de 01/10/2026,
 * CONT-005): ת e ט fazem "t", א e ע são mudas, קִ e כִּ se leem "ki". Som
 * compara pelo fonema; o resto, pela leitura sem acento e sem caixa, com
 * "mudo..." valendo como uma coisa só.
 */
export function chavesDe(f: { pt: string; tipo: TipoPar; som?: string }): string[] {
  if (f.tipo === 'som' && f.som) return fonemasDe(f.som);
  const k = f.pt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return [k.startsWith('mudo') ? 'mudo' : k];
}

/**
 * Que habilidade uma resposta de jogo exercitou, lida do id do par.
 * ─────────────────────────────────────────────────────────────────────────
 * Os seis jogos gravavam TUDO como `rec`. Um Match de palavras, um Teste de
 * sílabas e um Blast de sons escreviam na mesma conta, e essa conta decide
 * coisas: o nível dos jogos, a letra "forte" do painel, o que a revisão
 * oferece. Jogar muito inflava o reconhecimento e não tocava na leitura.
 *
 * O id já carrega o tipo - `som:mem`, `sil:mem:a`, `pal:mem:...` -, então
 * não é preciso passar nada novo pelos componentes. O que não é de baralho
 * (Caça, Batalha, Impressa × Cursiva) é reconhecimento de forma, e fica `rec`.
 */
export function habilidadeDoJogo(id: string): 'rec' | 'som' | 'ler' {
  if (id.startsWith('som:')) return 'som';
  if (id.startsWith('sil:') || id.startsWith('pal:')) return 'ler';
  return 'rec';
}

export const ROTULO_TIPO: Record<TipoPar, string> = {
  nome: tx.tipoNome,
  som: tx.tipoSom,
  silaba: tx.tipoSilaba,
  palavra: tx.tipoPalavra
};

/* ── adaptador: as letras do curso de alfabetização ─────────────────────── */

/**
 * Transforma letras em pares.
 *
 * O `sound` de uma letra vem escrito como "/m/" ou "(mudo)"; no jogo ele é
 * limpo, porque a barra é um caractere neutro e o par "מ ↔ /m/" numa linha
 * com hebraico ao lado é exatamente o tipo de coisa que o algoritmo bidi
 * reordena. O contrato do projeto resolve isso com isolamento no <He>, e
 * aqui a limpeza evita o problema antes de ele existir.
 */
export function deLetras(letras: readonly Letter[], tipos: readonly TipoPar[]): Fonte[] {
  const out: Fonte[] = [];
  for (const L of letras) {
    if (tipos.includes('nome')) {
      out.push({ id: `nome:${L.id}`, he: L.letter, pt: L.namePt, tipo: 'nome', letterId: L.id });
    }
    if (tipos.includes('som')) {
      /* O rótulo legível (lib/som-pt.ts), não o IPA cru: "/j/" o brasileiro
         lê como o J de "janela" (CONT-003). */
      const som = somPt(L.sound).trim();
      if (som) out.push({ id: `som:${L.id}`, he: L.letter, pt: som, tipo: 'som', letterId: L.id, som: L.sound });
    }
    if (tipos.includes('silaba')) {
      for (const s of L.syllables) {
        if (!s.translit) continue;
        out.push({ id: `sil:${L.id}:${s.vowel}`, he: s.he, pt: s.translit, tipo: 'silaba', letterId: L.id });
      }
    }
    if (tipos.includes('palavra')) {
      for (const w of L.wordsToRead) {
        out.push({ id: `pal:${L.id}:${w.he}`, he: w.he, pt: w.pt, tipo: 'palavra', letterId: L.id });
      }
    }
  }
  return out;
}

/* ── montagem do baralho ────────────────────────────────────────────────── */

export type OpcoesBaralho = {
  /** Quantos pares. O Match trabalha bem com 5 ou 6; o Blast com 10 a 15. */
  quantos: number;
  semente: string;
  /** Pesar as letras que andaram custando. Recebe o id e devolve um peso. */
  peso?: (letterId: string) => number;
};

/**
 * Escolhe os pares do baralho.
 *
 * Dois cuidados que não são óbvios:
 *
 * 1. NÃO REPETIR O LADO LATINO. Duas letras mudas devolvem "mudo" nas duas,
 *    e um Match com dois cartões iguais do lado direito não tem resposta
 *    certa - tem duas, e uma delas conta como erro. O mesmo vale para o
 *    Blast, onde a alternativa certa apareceria duas vezes.
 * 2. UMA ENTRADA POR LETRA, quando dá. Um baralho de seis pares tirados da
 *    mesma letra é um baralho de uma letra só.
 */
export function montarBaralho(fontes: readonly Fonte[], o: OpcoesBaralho): Par[] {
  const rand = rng(o.semente);
  const peso = o.peso ?? (() => 1);

  /* Ordena por peso (o que precisa de trabalho primeiro), com o desempate
     embaralhado para o baralho não sair igual todo dia. */
  const ordenadas = shuffled(fontes, rand)
    .map(f => ({ f, w: peso(f.letterId) + rand() * 0.5 }))
    .sort((a, b) => b.w - a.w)
    .map(x => x.f);

  const vistos = new Set<string>();
  const porLetra = new Set<string>();
  const escolhidos: Fonte[] = [];

  for (const passada of [1, 2]) {
    for (const f of ordenadas) {
      if (escolhidos.length >= o.quantos) break;
      const chaves = chavesDe(f);
      if (chaves.some(k => vistos.has(k))) continue;
      if (passada === 1 && porLetra.has(f.letterId)) continue;
      for (const k of chaves) vistos.add(k);
      porLetra.add(f.letterId);
      escolhidos.push(f);
    }
  }

  return escolhidos.map(f => ({ ...f }));
}

/* ── perguntas de escolha, para o Blast e para o Teste ──────────────────── */

export type Pergunta = {
  id: string;
  /** `he` mostra o hebraico e pede o latino; `pt` faz o contrário. */
  sentido: 'he' | 'pt';
  enunciadoPt: string;
  /** O que aparece grande no alto. Hebraico quando `sentido` é 'he'. */
  alvo: string;
  opcoes: string[];
  resposta: number;
  tipo: TipoPar;
  letterId: string;
};

/**
 * Uma pergunta por par, com três distratores tirados do PRÓPRIO baralho.
 *
 * Os distratores saem de `fontes` e não de uma lista à parte porque assim
 * eles são, por construção, coisas que a pessoa já viu - e porque errar
 * entre dois itens plausíveis ensina, enquanto errar entre a resposta e três
 * absurdos só mede paciência.
 */
export function perguntasDe(
  baralho: readonly Par[],
  fontes: readonly Fonte[],
  o: { semente: string; alternativas?: number; sentido?: 'he' | 'pt' | 'misto' }
): Pergunta[] {
  const rand = rng(o.semente);
  const n = Math.max(2, o.alternativas ?? 4);
  const modo = o.sentido ?? 'he';

  return baralho.map((par, i) => {
    const sentido: 'he' | 'pt' = modo === 'misto' ? (rand() < 0.5 ? 'he' : 'pt') : modo;
    const mesmoTipo = fontes.filter(f => f.tipo === par.tipo && f.letterId !== par.letterId);
    const campo = (f: Fonte | Par) => (sentido === 'he' ? f.pt : f.he);

    const usados = new Set([campo(par).trim().toLowerCase()]);
    /* O que a resposta certa "diz": um distrator que diz o mesmo seria uma
       segunda resposta certa, nos dois sentidos (CONT-005). */
    const daCerta = new Set(chavesDe(par));
    const distratores: string[] = [];
    for (const f of shuffled(mesmoTipo, rand)) {
      if (distratores.length >= n - 1) break;
      if (chavesDe(f).some(k => daCerta.has(k))) continue;
      const v = campo(f);
      const chave = v.trim().toLowerCase();
      if (usados.has(chave)) continue;
      usados.add(chave);
      distratores.push(v);
    }
    /* Baralho pequeno demais para quatro alternativas: reduz em vez de
       inventar. Uma alternativa repetida é uma questão sem resposta. */
    const opcoes = shuffled([campo(par), ...distratores], rand);

    return {
      id: `${par.id}:${sentido}`,
      sentido,
      enunciadoPt: enunciado(par.tipo, sentido),
      alvo: sentido === 'he' ? par.he : par.pt,
      opcoes,
      resposta: opcoes.indexOf(campo(par)),
      tipo: par.tipo,
      letterId: par.letterId
    };
  }).filter(q => q.opcoes.length >= 2 && q.resposta >= 0)
    .map((q, i) => ({ ...q, id: `${q.id}:${i}` }));
}

function enunciado(tipo: TipoPar, sentido: 'he' | 'pt'): string {
  if (sentido === 'he') {
    return tipo === 'nome' ? tx.heNome
      : tipo === 'som' ? tx.heSom
      : tipo === 'silaba' ? tx.heSilaba
      : tx.hePalavra;
  }
  return tipo === 'nome' ? tx.ptNome
    : tipo === 'som' ? tx.ptSom
    : tipo === 'silaba' ? tx.ptSilaba
    : tx.ptPalavra;
}

/** Embaralhar os dois lados de um baralho, para o tabuleiro do Match. */
export function cartasDoMatch(baralho: readonly Par[], semente: string): {
  lado: 'he' | 'pt'; parId: string; texto: string; tipo: TipoPar;
}[] {
  const rand: Rand = rng(semente);
  const cartas = baralho.flatMap(p => ([
    { lado: 'he' as const, parId: p.id, texto: p.he, tipo: p.tipo },
    { lado: 'pt' as const, parId: p.id, texto: p.pt, tipo: p.tipo }
  ]));
  return shuffled(cartas, rand);
}

/** Um atalho honesto para quem monta baralho de letras: tipos por modo. */
export const TIPOS_POR_JOGO: Record<'match' | 'blast' | 'teste', TipoPar[]> = {
  match: ['nome', 'som', 'palavra'],
  /* O canhão (05/11/2026, pedido do dono): letras, vogais e palavras como alvos. */
  blast: ['nome', 'som', 'silaba', 'palavra'],
  teste: ['nome', 'som', 'silaba', 'palavra']
};

export { take };

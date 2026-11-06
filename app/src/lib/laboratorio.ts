/* O Laboratório de Leitura: o banco de palavras e a decomposição de uma
 * palavra em letras e vogais (11/10/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * O banco NÃO é uma lista nova escrita à mão. É o vocabulário que o curso já
 * ensina para LER (`wordsToRead` de letters.json; ver `vocabularioDeLeitura`), com os
 * campos que a leitura guiada precisa calculados a partir dele. Assim uma
 * palavra corrigida na lição sai corrigida aqui, e nenhuma palavra entra no
 * laboratório sem ter passado pela validação do curso (V1: só letras já
 * ensinadas; V3: transliteração).
 *
 * ── sem nikud ────────────────────────────────────────────────────────────
 * No nível "Sem ajuda" a palavra aparece sem os pontos (06/11/2026, pedido
 * do dono). `semNikud` guarda a forma da lista do módulo 6 (data/extras.json
 * → unpointed) quando a palavra está lá; as outras perdem os pontos na tela.
 * Sem os pontos, שֵׁם e שָׁם são o mesmo desenho: por isso a forma com os
 * pontos volta na hora de conferir.
 *
 * ── a decomposição só aparece quando é confiável ──────────────────────────
 * Dizer "este sinal é um A" parece simples e não é: o kamats às vezes soa O,
 * o pátach do fim se lê antes da consoante (תַּפּוּחַ), o shva às vezes some.
 * Em vez de uma tabela de exceções, a função confere o que calculou contra a
 * transliteração que o curso já aprovou: se a sequência de vogais dos sinais
 * não bate com a das letras latinas, a palavra mostra as letras sem afirmar
 * o som de cada vogal. Ver `vogaisConferem`.
 */

import type { Letter } from '@/lib/content';
import { FINAL_TO_BASE, clean, clusters, stripNikud } from '@/lib/hebrew';
import { letrasDaGrafia, consegueLer, type PalavraDoCurso } from '@/lib/engine/palavras';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/motor-laboratorio';
import { translit as grafia } from '@/i18n/translit';

export type NivelDeApoio = 'guiada' | 'menos-ajuda' | 'independente';

/* `curtoPt`: o rótulo do seletor de uma linha (27/10/2026, rodada 2 da
   experiência): os três cartões empurravam a palavra para baixo da dobra no
   celular. */
export const NIVEIS: readonly { id: NivelDeApoio; tituloPt: string; curtoPt: string; resumoPt: string }[] = [
  { id: 'guiada', tituloPt: tx.guiadaTitulo, curtoPt: tx.guiadaCurto,
    resumoPt: tx.guiadaResumo },
  { id: 'menos-ajuda', tituloPt: tx.menosAjudaTitulo, curtoPt: tx.menosAjudaCurto,
    resumoPt: tx.menosAjudaResumo },
  { id: 'independente', tituloPt: tx.independenteTitulo, curtoPt: tx.independenteCurto,
    resumoPt: tx.independenteResumo }
];

/** Uma vogal como o curso a ensina, pelo SOM. */
export type Vogal = 'a' | 'e' | 'i' | 'o' | 'u';

export type PapelDaLetra = 'consoante' | 'vogal' | 'apoio';

export type PedacoDaPalavra = {
  /** A letra com os sinais que estão nela, como aparece na palavra. */
  grafia: string;
  /** A letra base (a final vira a de meio), para achar o nome. */
  letra: string;
  /** O nome da letra no curso ("Mem"), ou da forma final ("Mem final"). */
  nomePt: string;
  /** O som da letra como o curso o escreve ("/m/"), já resolvido para
   *  בּ/ב, כּ/כ, פּ/פ e שׁ/שׂ. Vazio quando a letra é só apoio de vogal. */
  somPt: string;
  /** A vogal que os sinais desta letra marcam, quando marcam uma. */
  vogal: Vogal | null;
  /** Os nomes dos sinais de vogal desta letra ("pátach"). */
  sinaisPt: string[];
  /** Esta letra é só apoio de vogal: o ו de וֹ e de וּ. */
  apoioDeVogal: boolean;
  /** O que a letra faz NESTA palavra: soa como consoante, é a própria vogal
   *  (וֹ, וּ, o Álef com vogal) ou só apoia a vogal sem som (o י de מִי). */
  papel: PapelDaLetra;
  /** Uma observação curta, quando a letra tem uma particularidade aqui. */
  notaPt: string | null;
};

export type PalavraDoBanco = {
  /** Estável: o id do áudio, que é o hash da palavra. */
  id: string;
  he: string;
  /** A grafia sem pontos, só quando o curso a considera legível assim. */
  semNikud: string | null;
  translit: string;
  pt: string;
  letras: string[];
  /** Os sinais de vogal que a palavra usa, pelo nome do curso. */
  sinais: string[];
  dificuldade: 1 | 2 | 3;
  audioId: string;
  /** A lição de som que a palavra pede (a do Vet, a do Sin...), quando pede:
   *  sem ela concluída a palavra não entra, mesmo com as letras todas feitas. */
  som: string | null;
  /** A ordem da letra em cuja lição a palavra aparece. */
  desde: number;
  pedacos: PedacoDaPalavra[];
  /** A decomposição confere com a transliteração: pode dizer o som das vogais. */
  vogaisConferem: boolean;
};

/* Os sinais, pelo ponto de código. Os nomes são os de data/nikud.json. */
const SINAIS: Record<string, { nome: string; vogal: Vogal | null }> = {
  'ַ': { nome: grafia('pátach'), vogal: 'a' }, // i18n-ok: nome do sinal (transliteração, etapa 3)
  'ָ': { nome: 'kamats', vogal: 'a' },
  'ֲ': { nome: grafia('chataf pátach'), vogal: 'a' }, // i18n-ok: nome do sinal (transliteração, etapa 3)
  'ֶ': { nome: 'segol', vogal: 'e' },
  'ֵ': { nome: 'tsere', vogal: 'e' },
  'ֱ': { nome: 'chataf segol', vogal: 'e' },
  'ִ': { nome: 'chirik', vogal: 'i' },
  'ֹ': { nome: 'cholam', vogal: 'o' },
  'ֺ': { nome: 'cholam', vogal: 'o' },
  'ֳ': { nome: 'chataf kamats', vogal: 'o' },
  'ֻ': { nome: 'kubuts', vogal: 'u' },
  'ְ': { nome: 'shva', vogal: null }
};
const DAGESH = 'ּ';
const PONTO_SHIN = 'ׁ';
const PONTO_SIN = 'ׂ';

/** Os dois sons de "/b/ ou /v/": o primeiro com daguesh, o segundo sem. */
function somResolvido(som: string, comDaguesh: boolean): string {
  const m = som.match(/^(\/[^/]+\/) ou (\/[^/]+\/)$/);
  return m ? (comDaguesh ? m[1]! : m[2]!) : som;
}

/**
 * A palavra em letras, cada uma com o papel que ela tem NESTA palavra.
 * ─────────────────────────────────────────────────────────────────────────
 * Nenhuma regra aqui é dita como regra geral do hebraico: toda nota fala da
 * palavra que está na tela ("aqui", "nesta palavra"). O Álef e o Áyin têm
 * som em outras pronúncias e contextos; o He tem som no começo e no meio; o
 * Yud depois de E às vezes é ditongo, às vezes não. A tela diz o que vale
 * nesta palavra, e a transliteração aprovada é quem confirma (12/10/2026).
 */
export function pedacosDe(he: string, letras: readonly Letter[], translit = ''): PedacoDaPalavra[] {
  const porGlifo = new Map(letras.map(l => [l.letter, l]));
  const cl = clusters(clean(he));
  const tl = translit.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return cl.map((g, i): PedacoDaPalavra => {
    const base = g[0] ?? '';
    const letra = FINAL_TO_BASE[base] ?? base;
    const L = porGlifo.get(letra);
    const marcas = [...g.slice(1)];
    const sinais = marcas.map(m => SINAIS[m]).filter((s): s is { nome: string; vogal: Vogal | null } => !!s);
    const vogal = sinais.find(s => s.vogal)?.vogal ?? null;
    const daguesh = marcas.includes(DAGESH);
    const final = base !== letra;
    const ultima = i === cl.length - 1;
    /* A vogal da letra de antes, contando a do ו que é vogal (וּ = U). */
    const prev = i > 0 ? cl[i - 1] ?? '' : '';
    const anterior = !prev ? null
      : /^\u05D5\u05BC$/.test(prev) ? 'u'
      : [...prev].map(m => SINAIS[m]?.vogal).find(Boolean) ?? null;

    /* O ו que é vogal: וֹ (cholam malê) depois de uma consoante, e וּ
       (shuruk) sem outra vogal. Um ו com daguesh E vogal própria é o V. */
    const cholamMale = letra === 'ו' && i > 0 && marcas.length === 1 && (marcas[0] === '\u05B9' || marcas[0] === '\u05BA');
    const shuruk = letra === 'ו' && i > 0 && marcas.length === 1 && marcas[0] === DAGESH;
    if (cholamMale || shuruk) {
      return {
        grafia: g, letra, nomePt: L?.namePt ?? 'Vav', somPt: '',
        vogal: cholamMale ? 'o' : 'u', sinaisPt: [cholamMale ? grafia('cholam malê') : 'shuruk'], // i18n-ok: nome do sinal (transliteração, etapa 3)
        apoioDeVogal: true, papel: 'vogal',
        notaPt: cholamMale ? tx.vavO : tx.vavU
      };
    }

    let nomePt = L?.namePt ?? letra;
    let somPt = L ? somResolvido(L.sound, daguesh) : '';
    let notaPt: string | null = null;
    let papel: PapelDaLetra = 'consoante';
    if (letra === 'ש' && marcas.includes(PONTO_SIN)) { nomePt = 'Sin'; somPt = '/s/'; }
    else if (letra === 'ש' && marcas.includes(PONTO_SHIN)) { somPt = '/ʃ/'; }
    if (final) nomePt = fmt(tx.nomeFinal, { nome: nomePt });

    /* Álef e Áyin: na pronúncia israelense mais comum, nenhum dos dois soa
       como consoante NESTA palavra. Com vogal, quem soa é a vogal; sem vogal,
       a letra não soa. */
    if (letra === 'א') {
      somPt = '';
      papel = vogal ? 'vogal' : 'apoio';
      notaPt = vogal ? fmt(tx.alefComVogal, { vogal: vogal.toUpperCase() })
                     : tx.alefSemVogal;
    }
    if (letra === 'ע') {
      somPt = '';
      papel = vogal ? 'vogal' : 'apoio';
      notaPt = tx.ayin;
    }
    /* O ה no fim, sem vogal própria e depois de uma vogal: apoio da vogal
       final (תוֹדָה). Não vale para o He com som. */
    if (letra === 'ה' && ultima && !vogal && anterior) {
      somPt = ''; papel = 'apoio';
      notaPt = tx.heFinal;
    }
    /* O pátach do fim que se lê ANTES da consoante: só em ח ou ע finais,
       depois de uma vogal que não é A (רוּחַ, תַפּוּחַ). */
    if ((letra === 'ח' || letra === 'ע') && ultima && marcas.includes('\u05B7') && anterior && anterior !== 'a') {
      notaPt = tx.patachFurtivo;
    }
    /* O י sem sinal depois de uma vogal é apoio, não o som /j/: מִי é "mi".
       Depois de E, ditongo só quando a transliteração aprovada diz "ei". */
    if (letra === 'י' && !marcas.length && anterior) {
      somPt = ''; papel = 'apoio';
      notaPt = anterior === 'i' ? tx.yudI
        : anterior === 'e' ? (tl.includes('ei')
            ? tx.yudEi
            : tx.yudE)
        : tx.yudMudo;
    }

    return {
      grafia: g, letra, nomePt, somPt, vogal,
      sinaisPt: sinais.map(s => s.nome), apoioDeVogal: false, papel, notaPt
    };
  });
}

/* As vogais da transliteração, na ordem, sem acento. "ei" conta como um E
   (o tsere antes do י), e o "ss" não interessa aqui. */
function vogaisDaTranslit(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/ei/g, 'e')
    .replace(/[^aeiou]/g, '');
}

/**
 * A sequência de vogais dos sinais bate com a da transliteração aprovada?
 * O shva não entra (às vezes some, às vezes é um E): por isso a conferência
 * aceita que a transliteração tenha um E a mais onde há shva.
 */
export function vogaisConferem(pedacos: readonly PedacoDaPalavra[], translit: string): boolean {
  const alvo = vogaisDaTranslit(translit);
  /* Cada letra dá uma vogal certa, nenhuma, ou (o shva) um E opcional. */
  const passos = pedacos.flatMap(p => p.vogal ? [{ v: p.vogal, opcional: false }]
    : p.sinaisPt.includes('shva') ? [{ v: 'e' as Vogal, opcional: true }] : []);
  const casa = (k: number, i: number): boolean => {
    if (k === passos.length) return i === alvo.length;
    const { v, opcional } = passos[k]!;
    if (alvo[i] === v && casa(k + 1, i + 1)) return true;
    return opcional && casa(k + 1, i);
  };
  return casa(0, 0);
}

function dificuldadeDe(letras: readonly string[], sinais: readonly string[]): 1 | 2 | 3 {
  const n = letras.length + (sinais.includes('shva') ? 1 : 0);
  return n <= 3 ? 1 : n <= 5 ? 2 : 3;
}

/** As palavras que o curso considera legíveis sem os pontos (módulo 6). */
export type ListaSemPontos = readonly { pointed: string; bare: string }[];

/**
 * O vocabulário que entra no laboratório: só as palavras de LEITURA de cada
 * lição (`wordsToRead`), nunca as de reconhecimento (`wordsToRecognize`).
 *
 * É a escolha conservadora (12/10/2026). Ter todas as letras de uma palavra
 * não garante saber lê-la: ela pode pedir um sinal de vogal ou uma regra de
 * leitura que ainda não apareceu. As palavras de leitura de uma lição foram
 * escolhidas pelo curso para serem lidas NAQUELA lição, com as letras, os
 * sinais e as regras ensinados até ali; as de reconhecimento, não. O curso
 * não guarda em que lição cada sinal de vogal é ensinado, e por isso a régua
 * é a da lição que pôs a palavra para ser lida.
 */
export function vocabularioDeLeitura(letras: readonly Letter[]): (PalavraDoCurso & { som?: string | null })[] {
  const visto = new Map<string, PalavraDoCurso & { som?: string | null }>();
  for (const L of [...letras].sort((a, b) => a.order - b.order)) {
    for (const w of L.wordsToRead) {
      const k = clean(w.he);
      if (!visto.has(k)) visto.set(k, { ...w, desde: L.order });
    }
  }
  return [...visto.values()];
}

export function bancoDePalavras(
  letras: readonly Letter[],
  semPontos: ListaSemPontos = [],
  vocab: readonly (PalavraDoCurso & { som?: string | null })[] = vocabularioDeLeitura(letras)
): PalavraDoBanco[] {
  const nua = new Map(semPontos.map(w => [clean(w.pointed), w.bare]));
  return vocab.map(w => {
    const pedacos = pedacosDe(w.he, letras, w.translit);
    const sinais = [...new Set(pedacos.flatMap(p => p.sinaisPt))];
    const letrasDaPalavra = letrasDaGrafia(w.he);
    return {
      id: w.audioId || `w-${stripNikud(w.he)}`,
      he: w.he,
      semNikud: nua.get(clean(w.he)) ?? null,
      translit: w.translit,
      pt: w.pt,
      letras: letrasDaPalavra,
      sinais,
      dificuldade: dificuldadeDe(letrasDaPalavra, sinais),
      audioId: w.audioId,
      som: w.som ?? null,
      desde: w.desde,
      pedacos,
      vogaisConferem: vogaisConferem(pedacos, w.translit)
    };
  });
}

/**
 * As palavras para uma rodada: só as que o aluno lê com as letras que já
 * concluiu, e em ordem de dificuldade para o nível pedido. A guiada começa
 * pelas fáceis; a independente prefere as que ele viu há mais tempo (o
 * reconhecimento já teve tempo de assentar).
 */
/** A palavra está ao alcance do aluno: letras concluídas, a lição de som que
 *  ela pede concluída, e duas letras ou mais. */
export const aoAlcance = (w: PalavraDoBanco, alfabeto: readonly string[], sonsFeitos: ReadonlySet<string>): boolean =>
  w.letras.length >= 2 && consegueLer(w.he, alfabeto) && (!w.som || sonsFeitos.has(w.som));

export function palavrasDaRodada(
  banco: readonly PalavraDoBanco[], alfabeto: readonly string[], nivel: NivelDeApoio,
  rand: () => number, n = 5, sonsFeitos: ReadonlySet<string> = new Set()
): PalavraDoBanco[] {
  const legiveis = banco.filter(w => aoAlcance(w, alfabeto, sonsFeitos));
  if (!legiveis.length) return [];
  const ultima = Math.max(...legiveis.map(w => w.desde));
  /* Uma palavra cuja vogal foge do comum (o kamats que soa O) só entra com
     apoio: na guiada e na com menos ajuda, com o aviso. Na independente não. */
  const pool = nivel === 'guiada'
    ? legiveis.filter(w => w.dificuldade <= 2)
    : nivel === 'menos-ajuda'
      ? legiveis
      : legiveis.filter(w => w.vogaisConferem && (w.desde < ultima || legiveis.length < 8));
  const base = pool.length >= n ? pool : legiveis;
  const embaralhadas = [...base].map(w => ({ w, r: rand() })).sort((a, b) => a.r - b.r).map(x => x.w);
  return embaralhadas.slice(0, n);
}

/** O id do momento "Minha Primeira Leitura" de um módulo, em `firsts`. */
export { primeiraLeituraId } from '@/lib/engine/textos';

/**
 * As palavras da Primeira Leitura de um módulo: as das letras DESTE módulo
 * que o aluno lê com tudo o que já concluiu, até cinco, das mais curtas para
 * as mais longas. Sem sorteio: é um marco, e todo aluno lê as mesmas.
 */
export function palavrasDaPrimeiraLeitura(
  banco: readonly PalavraDoBanco[], letrasDoModulo: readonly Letter[], alfabeto: readonly string[], n = 5,
  sonsFeitos: ReadonlySet<string> = new Set()
): PalavraDoBanco[] {
  const ordens = new Set(letrasDoModulo.map(l => l.order));
  return banco
    .filter(w => ordens.has(w.desde) && aoAlcance(w, alfabeto, sonsFeitos) && w.vogaisConferem)
    .sort((a, b) => a.letras.length - b.letras.length || a.desde - b.desde)
    .slice(0, n);
}

/* ── os textos que dependem de um número ou de uma condição ──────────────
   Aqui, e não na tela, para os testes conferirem singular e plural e o que
   cada frase promete (tests/laboratorio.test.ts). */

/** "1 palavra", "5 palavras". */
export const nPalavras = (n: number): string => tx.nPalavras(n);

/** A instrução de cada nível. Só promete o áudio quando a palavra tem. */
export function instrucao(nivel: NivelDeApoio, temAudio: boolean): string {
  if (nivel === 'guiada') {
    return temAudio ? tx.guiadaAudio : tx.guiadaSemAudio;
  }
  if (nivel === 'menos-ajuda') return tx.menosAjuda;
  return tx.independente;
}

/** O que a letra faz nesta palavra, em poucas palavras. */
export function descricao(p: PedacoDaPalavra, comVogal: boolean): string {
  const V = comVogal && p.vogal ? p.vogal.toUpperCase() : null;
  if (p.papel === 'vogal') return V ? fmt(tx.vogalCom, { vogal: V }) : tx.vogal;
  if (p.papel === 'apoio') {
    return p.letra === 'א' || p.letra === 'ע' ? tx.semConsoante : tx.apoioDaVogal;
  }
  return V ? `${p.somPt} + ${V}` : p.somPt;
}

/** O resultado da Primeira Leitura, honesto sobre o que aconteceu: só diz
 *  "sem ouvir a pronúncia antes" quando foi assim. */
export function mensagemDaPrimeiraLeitura(total: number, certas: number, ouviuAlguma: boolean): string {
  const marcou = certas === 0
    ? tx.nenhumaCerta
    : tx.marcou(certas);
  return ouviuAlguma
    ? tx.praticouOuvindo(nPalavras(total), marcou)
    : tx.praticouSemOuvir(nPalavras(total), marcou)
      + (certas > 0 ? tx.grandePasso : '');
}


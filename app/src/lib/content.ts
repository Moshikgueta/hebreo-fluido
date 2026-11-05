/* O conteúdo PAGO do curso, no navegador - e ele não viaja no pacote.
 * ─────────────────────────────────────────────────────────────────────────
 * Até 20/09/2026 este arquivo importava os seis JSONs do curso, e por isso
 * eles iam para dentro do JavaScript que QUALQUER visitante baixa. A
 * auditoria mediu o estrago: 48 de 60 amostras de `letters.json` num pedaço
 * que a home carrega. Um `curl` naquele endereço levava a matéria-prima do
 * produto, sem conta e sem pagar.
 *
 * Agora o conteúdo chega por `GET /api/content`, que o Worker só responde a
 * quem tem cookie de sessão E direito de acesso ao curso.
 *
 * ── por que a API continua SÍNCRONA ──────────────────────────────────────
 * `getLetter(id)` é chamado de dentro da renderização, em vinte lugares, e o
 * motor de exercícios depende disso. Trocar tudo por `await` seria reescrever
 * o curso inteiro para resolver um problema de empacotamento.
 *
 * Então o dado vira um DEPÓSITO que se enche uma vez, antes de qualquer tela
 * de aluno existir: `CourseGate` é o ponto único por onde toda rota paga
 * passa, e ele já sabia esperar - esperava a sessão, agora espera também o
 * conteúdo. Quem lê daqui, lê depois.
 *
 * Ler antes de hidratar é erro de programação, não um estado possível em
 * produção. Por isso as funções gritam (`naoHidratado`) em vez de devolver
 * `undefined`: um `undefined` silencioso vira uma lição em branco três telas
 * adiante, com o rastro já perdido.
 *
 * ── e a build de demonstração ────────────────────────────────────────────
 * Ela não tem Worker para responder, e é ela que a varredura e o teste de
 * CSP abrem. Nela, e só nela, o conteúdo é importado direto. O `if` é
 * resolvido pelo empacotador na hora da build: na de produção esse ramo não
 * existe no arquivo final - e é `tests/conteudo.test.ts` que prova isso,
 * lendo o que foi publicado em vez de acreditar.
 */

import { course, getModule, letterIds } from './content-publico';
import { textosPublicados } from './engine/textos';
import { leiturasPublicadas, type GuiaNikud, type LeituraBonus } from './engine/bonus';
import type {
  Checkpoint, Course, CourseModule, CultureCard, EraPair, Letter, LetterSkel,
  NikudIntro, NikudSign, NikudSound, Scene, Sentence, SentenceWord, Stroke, StrokeSet,
  Syllable, Word
} from './content-publico';

/* Reexportados para os consumidores de sempre. O que mudou não é o nome, é
   de onde a PÁGINA PÚBLICA tem de importar: ela importa de
   `content-publico`, nunca daqui - importar daqui traz o curso junto. */
export { course, getModule, letterIds };
export type {
  Checkpoint, Course, CourseModule, CultureCard, EraPair, Letter, LetterSkel,
  NikudIntro, NikudSign, NikudSound, Scene, Sentence, SentenceWord, Stroke, StrokeSet,
  Syllable, Word
};

/** A forma exata do que `/api/content` devolve. O mesmo contrato do modo
 *  local (ver `content-servidor.ts`), para que os dois não divirjam. */
export type ConteudoPago = {
  letters: Letter[];
  nikud: { intro: NikudIntro; dagesh: { title?: string; body?: string } | null; sounds: NikudSound[] };
  extras: import('./engine/extras').Extras;
  scenes: Scene[];
  sentences: Sentence[];
  eras: EraPair[];
  strokes: Record<string, StrokeSet>;
  culture: CultureCard[];
  missoes: import('./engine/missao').Missao[];
  /** O Hebraico na rua: as placas aprovadas (lib/engine/rua.ts). Vêm no missoes.json. */
  rua: import('./engine/rua').PlacaDaRua[];
  /** Ler cardápios (05/11/2026, lib/engine/cardapio.ts). Vêm no missoes.json. */
  cardapios: import('./engine/cardapio').Cardapio[];
  /** Um dia em Israel (05/11/2026, lib/engine/um-dia.ts). Vem no missoes.json. */
  umDia: import('./engine/um-dia').DadosDoDia;
  textos: import('./engine/textos').Texto[];
  bonus: LeituraBonus[];
  guiaNikud: GuiaNikud | null;
  /** O aviso de uso pessoal com o número da cópia desta conta
   *  (worker/src/lib/marca.js). Só no que vem de /api/content. */
  _licenca?: string;
};

/* ── o depósito ─────────────────────────────────────────────────────────── */

let DADOS: ConteudoPago | null = null;
let LETTERS: Letter[] = [];
let BY_ID = new Map<string, Letter>();

/** O número da cópia desta conta, para a marca d'água das aulas. */
export const numeroDaCopia = (): string | null =>
  DADOS?._licenca?.match(/Cópia ([0-9A-F]{8})\./)?.[1] ?? null;

/** Já dá para ler? É o que `CourseGate` pergunta antes de renderizar. */
export const conteudoPronto = (): boolean => DADOS !== null;

/** Enche o depósito. Idempotente: duas telas montando juntas não custam
 *  duas buscas. */
export function hidratarConteudo(d: ConteudoPago): void {
  DADOS = d;
  LETTERS = (d.letters || []).slice().sort((a, b) => a.order - b.order);
  BY_ID = new Map(LETTERS.map(l => [l.id, l]));
}

function naoHidratado(oQue: string): never {
  throw new Error(
    `conteúdo do curso lido antes de carregar (${oQue}). ` // i18n-ok: erro de desenvolvedor
    + 'Toda tela de aluno renderiza dentro de CourseGate, que espera; ' // i18n-ok: erro de desenvolvedor
    + 'se este erro apareceu, alguma coisa renderizou fora dele.' // i18n-ok: erro de desenvolvedor
  );
}

const dados = (): ConteudoPago => DADOS ?? naoHidratado('dados');

/* ── as letras ──────────────────────────────────────────────────────────── */

export const allLetters = (): Letter[] => (DADOS ? LETTERS : naoHidratado('allLetters'));
export const getLetter = (id: string): Letter | undefined =>
  DADOS ? BY_ID.get(id) : naoHidratado('getLetter');
export const lettersOfModule = (n: number): Letter[] =>
  DADOS ? LETTERS.filter(l => l.module === n) : naoHidratado('lettersOfModule');

/** A lição seguinte, para o "continuar". */
export function nextLetter(id: string): Letter | undefined {
  const l = getLetter(id);
  if (!l) return undefined;
  return LETTERS.find(x => x.order === l.order + 1);
}

/* ── o resto do material ────────────────────────────────────────────────── */

/* `nikud` e `extras` eram constantes e viraram funções. É a única mudança de
   forma que este arquivo impõe aos consumidores, e ela é inevitável: uma
   constante é lida no momento em que o módulo carrega, que é justamente
   antes de o conteúdo existir. */
export const nikud = (): ConteudoPago['nikud'] => dados().nikud;

/** Módulos 6 e 7, iguais aos da apostila impressa. */
export const extras = (): ConteudoPago['extras'] => dados().extras;

/** Todos os mini-textos que o aluno pode ver (os revisados). */
export const textosDoCurso = (): ConteudoPago['textos'] => textosPublicados(dados().textos);

/** O mini-texto do módulo `n`, só se já foi revisado. Ver lib/engine/textos.ts. */
export const textoDoModulo = (n: number): ConteudoPago['textos'][number] | undefined =>
  textosPublicados(dados().textos).find(t => t.modulo === n && !t.revisao && !t.n);

/** O segundo texto do módulo `n` (28/10/2026), se houver e estiver revisado. */
export const segundoTextoDoModulo = (n: number): ConteudoPago['textos'][number] | undefined =>
  textosPublicados(dados().textos).find(t => t.modulo === n && !t.revisao && t.n === 2);

/** A leitura de revisão do módulo `n`: só palavras já acumuladas. */
export const revisaoDoModulo = (n: number): ConteudoPago['textos'][number] | undefined =>
  textosPublicados(dados().textos).find(t => t.modulo === n && t.revisao);

/** As leituras bônus revisadas (textos e versículos bíblicos; ver engine/bonus.ts).
 *  `?? []`: um Worker publicado antes delas responde sem o campo. */
export const leiturasBonus = (): LeituraBonus[] => leiturasPublicadas(dados().bonus ?? []);

/** O guia «O nikud da Bíblia», se já revisado. */
export const guiaNikud = (): GuiaNikud | null => {
  const g = dados().guiaNikud;
  return g?.revisado ? g : null;
};

/** As placas do Hebraico na rua (lib/engine/rua.ts). Estados antigos do
 *  depósito, sem a chave, valem como nenhuma. */
export const placasDaRua = (): ConteudoPago['rua'] => dados().rua ?? [];
export const cardapiosDoCurso = (): ConteudoPago['cardapios'] => dados().cardapios ?? [];
export const umDiaEmIsrael = (): ConteudoPago['umDia'] => dados().umDia ?? { placas: [] };

/** A missão que fecha o módulo `n`, se houver. */
export const missaoDoModulo = (n: number): ConteudoPago['missoes'][number] | undefined =>
  dados().missoes.find(m => m.modulo === n);

/** As cenas que o aluno JÁ consegue decifrar, da mais nova para a mais
 *  velha. Uma placa que ele não sabe ler não é recompensa. */
export const scenesUpTo = (order: number): Scene[] =>
  dados().scenes.filter(s => s.fromOrder <= order).sort((a, b) => b.fromOrder - a.fromOrder);

/** As cenas que uma letra destrava. A maioria não destrava nenhuma. */
export const scenesForOrder = (order: number): Scene[] =>
  dados().scenes.filter(s => s.fromOrder === order);

/** `letterId`, ou `${letterId}-final` para a forma final. */
export const strokesFor = (id: string): StrokeSet | null => dados().strokes[id] ?? null;

/* ── as frases ──────────────────────────────────────────────────────────
   Uma frase só aparece depois de TODAS as suas letras, como as cenas. A
   diferença é que a frase é o objetivo declarado do curso - "ler hebraico" -
   e mostrá-la cedo demais não frustra um pouco: frustra na coisa pela qual a
   pessoa pagou. */

/* ── o som sem o ponto (Vet, Chaf, Fe) ──────────────────────────────────
   Cada um é ensinado na lição de som logo DEPOIS da letra (sons.ts). Uma
   frase ou cena liberada pela ordem das letras pode trazer esse som antes da
   hora: na lição do Kaf, «מָה שְׁלוֹמְךָ» termina em Chaf (auditoria de
   28/09, PED-025). As listas abaixo continuam iguais - o exame e a galeria
   usam tudo -, e é a lição da letra que filtra com `semOSomDe`. */

const SEM_PONTO: Record<string, string> = { 'ב': 'bet', 'כ': 'kaf', 'ך': 'kaf', 'פ': 'pe', 'ף': 'pe' };

/** As letras (bet, kaf, pe) que aparecem SEM daguesh neste hebraico
 *  pontuado - isto é, com o som de Vet, Chaf ou Fe. */
export function sonsSemPonto(he: string): Set<string> {
  const out = new Set<string>();
  for (const m of he.matchAll(/([\u05D1\u05DB\u05DA\u05E4\u05E3])([\u0591-\u05C7]*)/g)) {
    if (!m[2]!.includes('\u05BC')) out.add(SEM_PONTO[m[1]!]!);
  }
  return out;
}

/** Filtro da lição da letra: fica fora o que usa o som dela ainda não ensinado. */
export const semOSomDe = (letterId: string) => (x: { he: string }): boolean =>
  !sonsSemPonto(x.he).has(letterId);

/** Tudo o que este aluno já consegue ler, da mais simples para a mais tardia. */
export const sentencesUpTo = (order: number): Sentence[] =>
  dados().sentences.filter(s => s.after <= order).sort((a, b) => a.after - b.after);

/** As frases que ESTA letra acabou de destravar. É o momento de dizer
 *  "você já consegue ler isto", que vale mais do que dizer "letra concluída". */
export const sentencesForOrder = (order: number): Sentence[] =>
  dados().sentences.filter(s => s.after === order);

/** Só o hebraico de hoje, ou só o texto antigo - para a leitura paralela do
 *  fim do curso, onde o ponto é justamente o contraste. */
export const sentencesByEra = (era: Sentence['era']): Sentence[] =>
  dados().sentences.filter(s => s.era === era).sort((a, b) => a.after - b.after);

export const getSentence = (id: string): Sentence | undefined =>
  dados().sentences.find(s => s.id === id);

/* ── as duas eras ───────────────────────────────────────────────────────
   Um par só faz sentido quando o aluno consegue ler AS DUAS linhas. Abrir a
   antiga com a moderna ainda fechada transforma o lado a lado num teaser, e
   o lado a lado existe justamente para ele reconhecer as letras nas duas.
   Quem decide, portanto, é a frase mais tardia do par. */
export const eraPairs = (): EraPair[] => dados().eras;

/** A partir de que ordem este par abre. `null` quando aponta para uma frase
 *  que não existe - o que a V21 impede, e que a tela ignora em vez de quebrar. */
export const eraPairOpensAt = (p: EraPair): number | null => {
  const a = getSentence(p.antigo), m = getSentence(p.moderno);
  return a && m ? Math.max(a.after, m.after) : null;
};

export const eraPairsUpTo = (order: number): EraPair[] =>
  dados().eras.filter(p => {
    const abre = eraPairOpensAt(p);
    return abre !== null && abre <= order;
  });

export const cultureCards = (): CultureCard[] => dados().culture;

/** As cartas que este aluno ganhou, da mais recente para a mais antiga. */
export const cultureUnlocked = (mastered: number): CultureCard[] =>
  dados().culture.filter(c => c.unlockAt <= mastered).sort((a, b) => b.unlockAt - a.unlockAt);

/** A carta destravada exatamente ao cruzar esta contagem, se houver. */
export const cultureAt = (mastered: number): CultureCard | undefined =>
  dados().culture.find(c => c.unlockAt === mastered);

/* ── o mapa do curso ────────────────────────────────────────────────────── */

export type MapNode =
  | { kind: 'intro' }
  | { kind: 'module'; module: CourseModule }
  | { kind: 'letter'; letter: Letter }
  | { kind: 'checkpoint'; checkpoint: Checkpoint; module: CourseModule }
  | { kind: 'final' };

export function courseMap(): MapNode[] {
  if (!DADOS) naoHidratado('courseMap');
  const nodes: MapNode[] = [{ kind: 'intro' }];
  for (const m of course.modules) {
    nodes.push({ kind: 'module', module: m });
    for (const id of m.letterIds) {
      const l = BY_ID.get(id);
      if (l) nodes.push({ kind: 'letter', letter: l });
    }
    if (m.checkpoint) nodes.push({ kind: 'checkpoint', checkpoint: m.checkpoint, module: m });
  }
  nodes.push({ kind: 'final' });
  return nodes;
}

/* ── de onde o conteúdo vem ─────────────────────────────────────────────── */

/** `true` na build que vai para produção, onde o conteúdo é do servidor. */
export const CONTEUDO_DO_SERVIDOR = process.env.NEXT_PUBLIC_PLATFORM_API === 'worker';

/**
 * Carrega o conteúdo pago. Chamado uma vez, pelo `CourseGate`.
 *
 * Em produção é uma busca em `/api/content`, que exige cookie e direito de
 * acesso: quem decide é o servidor, e é por isso que isto resolve o que um
 * portão de tela nunca resolveu.
 *
 * Na build de demonstração o `if` é falso em tempo de build, e o empacotador
 * apaga o ramo inteiro com os `import()` dentro dele - é o que mantém os
 * JSONs fora do pacote de produção e, ao mesmo tempo, deixa a varredura
 * abrir as telas de aluno sem um Worker por perto.
 */
export function carregarConteudo(): Promise<void> {
  if (DADOS) return Promise.resolve();
  /* Um pedido só por vez (auditoria de 01/10/2026, PERF-004): o CourseGate
     dispara a busca já na montagem, em paralelo com /api/me, e de novo
     quando a sessão confirma o acesso - a segunda chamada pega a mesma
     promessa em vez de baixar o curso duas vezes. Falhou, esquece: a
     próxima chamada tenta de novo. */
  if (!emAndamento) {
    emAndamento = buscarConteudo().catch(e => { emAndamento = null; throw e; });
  }
  return emAndamento;
}
let emAndamento: Promise<void> | null = null;

async function buscarConteudo(): Promise<void> {
  if (DADOS) return;

  /* Escrito com o `process.env` inteiro dentro do `if`, e não com a constante
     acima: é ESTA forma literal que o Next troca pelo valor na hora da build
     (`'worker' !== 'worker'`), e é isso que faz o empacotador apagar o bloco
     com os `import()` dentro. A constante exportada é para quem lê; o ramo
     tem de ser podado, e quem poda não segue exportação. */
  if (process.env.NEXT_PUBLIC_PLATFORM_API !== 'worker') {
    const [letters, nikudJson, extrasJson, realWorld, sentencesJson, erasJson, strokeJson, cultureJson, missoesJson, textosJson, bonusJson] = await Promise.all([
      import('@content/letters.json'),
      import('@content/nikud.json'),
      import('@content/extras.json'),
      import('@content/real-world.json'),
      import('@content/sentences.json'),
      import('@content/eras.json'),
      import('@content/stroke-paths.json'),
      import('@content/culture.json'),
      import('@content/missoes.json'),
      import('@content/textos.json'),
      import('@content/bonus.json')
    ]);
    const bruto = <T,>(m: unknown): T =>
      ((m as { default?: unknown }).default ?? m) as T;
    hidratarConteudo({
      letters: bruto<Letter[]>(letters),
      nikud: bruto<ConteudoPago['nikud']>(nikudJson),
      extras: bruto<ConteudoPago['extras']>(extrasJson),
      scenes: bruto<{ scenes: Scene[] }>(realWorld).scenes,
      sentences: bruto<{ sentences: Sentence[] }>(sentencesJson).sentences,
      eras: bruto<{ pairs: EraPair[] }>(erasJson).pairs,
      strokes: bruto<{ box: number; letters: Record<string, StrokeSet> }>(strokeJson).letters,
      culture: bruto<{ cards: CultureCard[] }>(cultureJson).cards,
      missoes: bruto<{ missoes: ConteudoPago['missoes'] }>(missoesJson).missoes,
      rua: bruto<{ rua?: ConteudoPago['rua'] }>(missoesJson).rua ?? [],
      cardapios: bruto<{ cardapios?: ConteudoPago['cardapios'] }>(missoesJson).cardapios ?? [],
      umDia: bruto<{ umDia?: ConteudoPago['umDia'] }>(missoesJson).umDia ?? { placas: [] },
      textos: bruto<{ textos: ConteudoPago['textos'] }>(textosJson).textos,
      bonus: bruto<{ leituras: LeituraBonus[] }>(bonusJson).leituras,
      guiaNikud: bruto<{ guia?: GuiaNikud }>(bonusJson).guia ?? null
    });
    return;
  }

  const r = await fetch('/api/content', { credentials: 'same-origin' });
  if (!r.ok) throw new Error(`conteudo ${r.status}`);
  hidratarConteudo(await r.json() as ConteudoPago);
}

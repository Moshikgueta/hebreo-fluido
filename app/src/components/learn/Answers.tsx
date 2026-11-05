'use client';

/* The answer surfaces: one per gesture.
 * ─────────────────────────────────────────────────────────────────────────
 * Each of these is how a learner ANSWERS, and they are deliberately different
 * physical actions - tapping one of four, assembling a syllable, ordering
 * tiles right to left, pairing two columns, typing. A course whose every
 * question is answered the same way stops being read after the third lesson;
 * the eye learns the layout and the brain follows the shape of the options.
 *
 * Three rules hold across all of them, and they are all mobile rules:
 *
 *   · nothing is ONLY dragged. Drag-and-drop on a phone is a precision task
 *     done with the blunt end of a finger; tap-one-then-tap-the-other works at
 *     any size, and is also the only version that works from a keyboard. The
 *     two "monte a palavra" surfaces accept a drag as well (28/10/2026, at the
 *     owner's request; `useArrastarPecas`), on top of the taps, never instead;
 *   · every target is at least 44px on its shortest side;
 *   · nothing is undoable only by getting it right. There is always a way back
 *     - remove a tile, clear the build, change the pairing.
 */

import { Yael } from '@/components/aventura/Yael';
import { tx } from '@/i18n/telas/licao-answers';
import { useEffect, useRef, useState } from 'react';
import { He } from '@/components/hebrew/He';
import { Prose } from '@/components/hebrew/Prose';
import { Button } from '@/components/ui/Button';
import { AudioButton, hasAudio } from './AudioButton';
import { clean, joinSyllable, onCarrier } from '@/lib/hebrew';
import { typedIsCorrect } from '@/lib/engine/types';
import { stripNikud } from '@/lib/hebrew';
import { hebraicoDigitadoCerto, pareceTecladoLatino } from '@/lib/engine/palavras';
import { rng, shuffled } from '@/lib/engine/rng';
import { TecladoHebraico } from './TecladoHebraico';
import { allLetters } from '@/lib/content';
import { useArrastarPecas } from './useArrastarPecas';
import type { Selecao } from '@/lib/teclado-hebraico';

/* ── build a syllable ───────────────────────────────────────────────────
   The consonant is on screen. Tapping a vowel puts it ON the consonant, in
   place, at full size - so the learner watches the sign attach instead of
   being told that it does. That is the whole lesson of nikud in one gesture. */
export function BuildSyllable({
  consonant, vowels, answer, sound, settled, onAnswer
}: {
  consonant: string; vowels: string[]; answer: number; sound: string;
  settled: boolean; onAnswer: (correct: boolean, chosen: string) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked == null ? consonant : joinSyllable(consonant, vowels[picked]!);

  return (
    <div className="grid gap-5">
      <div className="rounded-[var(--r-lg)] bg-surface-2 py-8 grid place-items-center gap-2">
        <He size="display">{shown}</He>
        <p className="font-ui text-[13px] text-ink-muted">
          {picked == null ? tx.toqueNumSinal : tx.deveSoar(sound)}
        </p>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {vowels.map((v, i) => (
          <li key={v}>
            <button
              type="button"
              disabled={settled}
              onClick={() => { setPicked(i); onAnswer(i === answer, v); }}
              aria-label={tx.sinal(i + 1)}
              className={`w-full min-h-[76px] rounded-[var(--r-md)] border-2 grid place-items-center
                transition-colors disabled:cursor-default
                ${settled && i === answer ? 'border-[var(--green)] bg-mint'
                  : settled && i === picked ? 'border-[var(--amber)] bg-[var(--amber-wash)]'
                  : settled ? 'border-line bg-surface opacity-55'
                  : 'border-line bg-surface hover:border-[var(--accent-soft)] hover:bg-[var(--accent-wash)]'}`}
            >
              <He size="lg">{onCarrier(v)}</He>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── a caça à letra (03/11/2026) ────────────────────────────────────────
   A grade de `letter-hunt`. Cada toque na letra certa a marca (teal, com ✓);
   um toque errado pisca em gold com ✕ e volta. A questão fecha quando as
   certas foram todas achadas, e conta como acerto com no máximo UM toque
   errado: num telefone, um dedo que escorrega não é não saber a letra. */
export const CACA_ERROS_PERDOADOS = 1;

export function LetterHunt({
  letter, grade, settled, onAnswer
}: {
  letter: string; grade: string[]; settled: boolean;
  onAnswer: (correct: boolean, erros: number) => void;
}) {
  const total = grade.filter(g => g === letter).length;
  const [achadas, setAchadas] = useState<number[]>([]);
  const [erros, setErros] = useState(0);
  const [piscando, setPiscando] = useState<number | null>(null);
  const nome = (g: string, k: number) =>
    allLetters().find(l => l.letter === g)?.namePt ?? allLetters().find(l => l.finalForm === g)?.namePt ?? tx.cacaCelula(k + 1);

  const tocar = (k: number) => {
    if (settled || achadas.includes(k)) return;
    if (grade[k] === letter) {
      const novas = [...achadas, k];
      setAchadas(novas);
      if (novas.length === total) onAnswer(erros <= CACA_ERROS_PERDOADOS, erros);
    } else {
      setErros(e => e + 1);
      setPiscando(k);
      window.setTimeout(() => setPiscando(p => (p === k ? null : p)), 650);
    }
  };

  return (
    <div className="grid gap-3">
      <ul dir="rtl" className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {grade.map((g, k) => {
          const achada = achadas.includes(k) || (settled && g === letter);
          const errada = piscando === k;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => tocar(k)}
                aria-disabled={settled || achada}
                aria-pressed={achada}
                aria-label={nome(g, k)}
                className={`relative w-full min-h-[64px] rounded-[var(--r-md)] border-2 grid place-items-center
                  transition-colors aria-disabled:cursor-default
                  ${achada ? 'border-[var(--teal)] bg-[var(--teal-soft)]'
                    : errada ? 'border-[var(--gold)] bg-[var(--gold-soft)]'
                    : 'border-line bg-surface hover:border-[var(--accent-soft)] hover:bg-[var(--accent-wash)]'}`}
              >
                <He size="lg">{g}</He>
                {achada && <span aria-hidden className="absolute top-1 right-1.5 text-[12px] text-[var(--teal-ink)]">✓</span>}
                {errada && <span aria-hidden className="absolute top-1 right-1.5 text-[12px] text-[var(--gold-ink)]">✕</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="m-0 font-ui text-[13.5px] text-ink-muted text-center">
        {tx.cacaAchou(achadas.length, total)}
      </p>
    </div>
  );
}

/* ── build a word ───────────────────────────────────────────────────────
   Right to left is not decoration here. A learner who assembles שָׁלוֹם from the
   left has not read it, so the tray builds into an RTL row: the first tile
   tapped lands on the RIGHT, where the first letter of a Hebrew word goes.

   The tiles are CLUSTERS - a consonant with its own marks - because anything
   smaller would put a vowel sign on the table with nothing to sit on. */
export function BuildWord({
  tiles, target, hintPt, settled, onAnswer
}: {
  tiles: string[]; target: string; hintPt: string;
  settled: boolean; onAnswer: (correct: boolean) => void;
}) {
  const [built, setBuilt] = useState<number[]>([]);
  const used = new Set(built);
  const done = built.length === tiles.length;
  const arraste = useArrastarPecas({
    montada: built, setMontada: setBuilt, podePor: () => true, desligado: settled,
    peca: i => <He size="word">{tiles[i]!}</He>
  });

  const check = () => {
    const word = built.map(i => tiles[i]!).join('');
    onAnswer(clean(word) === clean(target));
  };

  return (
    <div className="grid gap-4">
      <div
        ref={arraste.bandeja}
        className={`he-seq min-h-[96px] rounded-[var(--r-lg)] border-2 border-dashed
                   px-4 py-3 justify-center transition-colors
                   ${arraste.sobre ? 'border-[var(--teal)] bg-[var(--teal-soft)]' : 'border-line bg-surface-2'}`}
        aria-label={tx.palavraEmConstrucao}
      >
        {built.length === 0 ? (
          <span className="font-ui text-[13px] text-ink-muted">
            {tx.toqueNasPecas}
          </span>
        ) : built.map((t, pos) => (
          <button
            key={`${t}-${pos}`}
            type="button"
            data-posta
            disabled={settled}
            onClick={() => setBuilt(b => b.filter((_, k) => k !== pos))}
            {...arraste.handlers(t, 'palavra')}
            aria-label={tx.tirarPeca(pos + 1)}
            className={`min-h-[56px] min-w-[52px] px-2 rounded-[var(--r-md)] bg-surface touch-none
                       border border-line grid place-items-center disabled:cursor-default
                       ${arraste.arrastando === t ? 'opacity-35' : ''}`}
          >
            <He size="word">{tiles[t]!}</He>
          </button>
        ))}
      </div>

      <ul className="flex flex-wrap gap-2.5 justify-center">
        {tiles.map((t, i) => (
          <li key={`${t}-${i}`}>
            <button
              type="button"
              disabled={settled || used.has(i)}
              onClick={() => setBuilt(b => [...b, i])}
              {...arraste.handlers(i, 'mesa')}
              className={`min-h-[64px] min-w-[60px] px-3 rounded-[var(--r-md)] border-2 touch-none
                grid place-items-center transition-colors
                ${arraste.arrastando === i ? 'opacity-35 ' : ''}${used.has(i)
                  ? 'border-line-soft bg-surface-2 opacity-35'
                  : 'border-line bg-surface hover:border-[var(--accent-soft)] hover:bg-[var(--accent-wash)]'}`}
            >
              <He size="word" dim={used.has(i)}>{t}</He>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={check} disabled={!done || settled} size="md">{tx.conferir}</Button>
        {built.length > 0 && !settled && (
          <Button variant="ghost" size="sm" onClick={() => setBuilt([])}>{tx.recomecar}</Button>
        )}
        {/* Sem leitura para mostrar (a frase de um texto, 05/11/2026), sem rótulo vazio. */}
        {hintPt && <span className="font-ui text-[13px] text-ink-muted ml-auto">{tx.soa(hintPt)}</span>}
      </div>
      {arraste.flutuante}
    </div>
  );
}

/* ── montar a palavra letra por letra ───────────────────────────────────
   O mesmo gesto do `BuildWord` - tocar para pôr, tocar na peça posta para
   tirar -, com três diferenças que são o exercício:

   · há letras na mesa que NÃO são da palavra (nos níveis de cima), então a
     palavra está pronta quando tem o número certo de letras, e não quando a
     mesa acaba;
   · o erro NÃO entrega a resposta. Ele diz em que posição a primeira letra
     errada está, qual letra deveria estar lá, e devolve à mesa tudo dali
     para a frente - o aluno reconstrói a partir do erro. Só na terceira
     tentativa aparece "mostrar a resposta";
   · a nota é a da PRIMEIRA tentativa, e a troca registrada é a primeira
     letra errada: é essa que diz o que o aluno confunde. Refazer ensina,
     mas não apaga o erro do registro. */
export type ErroDeConstrucao = { posicao: number; esperada: string; posta: string };

export function BuildLetters({
  tiles, letras, pt, cursiva, settled, onAnswer
}: {
  tiles: string[]; letras: string[]; pt: string | null; cursiva: boolean;
  settled: boolean;
  /** `correct` é a primeira tentativa; `erro` é o primeiro erro, se houve. */
  onAnswer: (correct: boolean, erro: ErroDeConstrucao | null) => void;
}) {
  const [built, setBuilt] = useState<number[]>([]);
  const [tentativa, setTentativa] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const primeiroErro = useRef<ErroDeConstrucao | null>(null);
  const used = new Set(built);
  const cheia = built.length === letras.length;
  const arraste = useArrastarPecas({
    montada: built, setMontada: setBuilt, podePor: () => built.length < letras.length, desligado: settled,
    peca: i => <He size="word" cursive={cursiva}>{tiles[i]!}</He>
  });

  const conferir = () => {
    const postas = built.map(i => tiles[i]!);
    const p = postas.findIndex((g, k) => g !== letras[k]);
    if (p < 0) {
      onAnswer(tentativa === 0, primeiroErro.current);
      setAviso(null);
      return;
    }
    const erro = { posicao: p, esperada: letras[p]!, posta: postas[p]! };
    if (!primeiroErro.current) primeiroErro.current = erro;
    setTentativa(t => t + 1);
    /* Fica o que estava certo antes do erro; o resto volta para a mesa. */
    setBuilt(b => b.slice(0, p));
    setAviso(tx.avisoDeErro(p + 1, letras[p]!, postas[p]!));
  };

  const desistir = () => {
    /* A resposta montada com as peças da mesa, para o aluno VER a palavra
       feita com as mesmas letras que ele tinha. Uma peça por posição: אמא
       usa os dois א, e não o mesmo duas vezes. */
    setBuilt(letras.reduce<number[]>(
      (acc, g) => [...acc, tiles.findIndex((t, j) => t === g && !acc.includes(j))], []));
    onAnswer(false, primeiroErro.current);
  };

  return (
    <div className="grid gap-4">
      {/* O som já está no enunciado; aqui só o que ajuda além dele. No nível
          avançado não há significado, e a linha some se não houver nada. */}
      {(pt || cursiva) && (
        <p className="font-ui text-[14px] text-ink-muted m-0">
          {pt ? tx.querDizer(<strong className="text-ink">{pt}</strong>) : null}
          {pt && cursiva ? ' · ' : null}
          {cursiva ? (pt ? tx.aMaoCurto : tx.aMao) : null}
        </p>
      )}
      <div
        ref={arraste.bandeja}
        className={`he-seq min-h-[96px] rounded-[var(--r-lg)] border-2 border-dashed
                   px-4 py-3 justify-center transition-colors
                   ${arraste.sobre ? 'border-[var(--teal)] bg-[var(--teal-soft)]' : 'border-line bg-surface-2'}`}
        aria-label={tx.emConstrucao(built.length, letras.length)}
      >
        {built.length === 0 ? (
          <span className="font-ui text-[13px] text-ink-muted" dir="ltr">
            {tx.toqueNasLetras}
          </span>
        ) : built.map((t, pos) => (
          <button
            key={`${t}-${pos}`}
            type="button"
            data-posta
            disabled={settled}
            onClick={() => setBuilt(b => b.filter((_, k) => k !== pos))}
            {...arraste.handlers(t, 'palavra')}
            aria-label={tx.tirarLetra(pos + 1)}
            className={`min-h-[56px] min-w-[48px] px-2 rounded-[var(--r-md)] bg-surface touch-none
                       border border-line grid place-items-center disabled:cursor-default
                       ${arraste.arrastando === t ? 'opacity-35' : ''}`}
          >
            <He size="word" cursive={cursiva}>{tiles[t]!}</He>
          </button>
        ))}
      </div>

      {aviso && !settled && (
        <p role="status" className="rounded-[var(--r-md)] bg-[var(--amber-wash)] text-[var(--amber)]
                                    px-4 py-3 font-ui text-[14px] leading-relaxed m-0">
          {aviso}
        </p>
      )}

      <ul className="flex flex-wrap gap-2.5 justify-center list-none p-0 m-0" dir="rtl"
          aria-label={tx.letrasParaMontar}>
        {tiles.map((t, i) => (
          <li key={`${t}-${i}`}>
            <button
              type="button"
              disabled={settled || used.has(i) || cheia}
              onClick={() => setBuilt(b => (b.length < letras.length ? [...b, i] : b))}
              {...arraste.handlers(i, 'mesa')}
              aria-label={tx.letra(t)}
              className={`min-h-[64px] min-w-[60px] px-3 rounded-[var(--r-md)] border-2 touch-none
                grid place-items-center transition-colors
                ${arraste.arrastando === i ? 'opacity-35 ' : ''}${used.has(i)
                  ? 'border-line-soft bg-surface-2 opacity-35'
                  : 'border-line bg-surface hover:border-[var(--accent-soft)] hover:bg-[var(--accent-wash)]'}`}
            >
              <He size="word" cursive={cursiva} dim={used.has(i)}>{t}</He>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={conferir} disabled={!cheia || settled} size="md">{tx.conferir}</Button>
        {built.length > 0 && !settled && (
          <Button variant="ghost" size="sm" onClick={() => setBuilt([])}>{tx.recomecar}</Button>
        )}
        {tentativa >= 2 && !settled && (
          <Button variant="ghost" size="sm" onClick={desistir}>{tx.mostrarResposta}</Button>
        )}
      </div>
      {arraste.flutuante}
    </div>
  );
}

/* ── digitar em hebraico ────────────────────────────────────────────────
   A caixa do `TypeAnswer`, com três ajustes: ela é RTL e hebraica; aceita a
   letra de meio no lugar da final e ignora vogais (ver `hebraicoDigitadoCerto`);
   e percebe quando o que chegou é alfabeto latino - o teclado não trocou -,
   que é um tropeço de aparelho e não de hebraico, e por isso não conta como
   resposta: a caixa só avisa. */
export function TypeHebrew({
  accept, settled, correct, onAnswer
}: {
  accept: string[]; settled: boolean; correct: boolean | null;
  onAnswer: (correct: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const [latino, setLatino] = useState(false);
  /* O campo e onde está o cursor nele: o teclado da tela escreve ali. */
  const campo = useRef<HTMLInputElement | null>(null);
  const selecao = useRef<Selecao>({ ini: 0, fim: 0 });
  const lembrar = () => {
    const el = campo.current;
    if (el) selecao.current = { ini: el.selectionStart ?? el.value.length, fim: el.selectionEnd ?? el.value.length };
  };

  const submit = () => {
    if (settled || !value.trim()) return;
    if (pareceTecladoLatino(value)) { setLatino(true); return; }
    setLatino(false);
    onAnswer(hebraicoDigitadoCerto(value, accept));
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={campo}
          value={value}
          onChange={e => { setValue(e.target.value); if (latino) setLatino(false); lembrar(); }}
          onSelect={lembrar}
          onKeyUp={lembrar}
          onClick={lembrar}
          onBlur={lembrar}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); }
          }}
          disabled={settled}
          dir="rtl"
          lang="he"
          autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          aria-label={tx.respostaEmHebraico}
          /* Em português: um exemplo em hebraico usaria letras que o aluno
             ainda não aprendeu - a digitação abre na lição do Mem. */
          placeholder={tx.digiteAqui}
          className={`flex-1 min-w-[180px] min-h-[56px] px-4 rounded-[var(--r-md)] border-2
            bg-surface he text-[24px] text-ink placeholder:text-ink-muted placeholder:text-[16px]
            ${settled && correct === true ? 'border-[var(--green)]'
              : settled && correct === false ? 'border-[var(--amber)]'
              : 'border-line focus:border-[var(--accent-soft)]'}`}
        />
        <Button onClick={submit} disabled={settled || !value.trim()} size="md">{tx.conferir}</Button>
      </div>
      {!settled && (
        <TecladoHebraico campo={campo} valor={value} selecao={selecao} desligado={settled}
                         aoEditar={e => { setValue(e.valor); if (latino) setLatino(false); }} />
      )}
      {latino && (
        <p role="status" className="font-ui text-[14px] text-[var(--amber)] m-0">
          {tx.latino}
        </p>
      )}
      {settled && correct === false && (
        <p className="font-ui text-[14px] text-ink-body m-0">
          {tx.oCertoEra(<He size="word">{accept[0]!}</He>)}
        </p>
      )}
    </div>
  );
}

/* ── match ──────────────────────────────────────────────────────────────
   Tap one, tap its pair. A wrong pairing is not a failure state: it flashes,
   it is remembered for the score, and the exercise carries on - the learner is
   here to finish the pairing, not to be stopped by it. */
export function MatchPairs({
  pairs, leftKind, rightKind, labelLeft, labelRight, settled, seed, onAnswer
}: {
  pairs: { left: string; right: string }[];
  leftKind: 'glyph' | 'reading' | 'text';
  rightKind: 'glyph' | 'reading' | 'text';
  labelLeft: string; labelRight: string;
  settled: boolean;
  /** The exercise id. The right column is shuffled FROM it, not from
   *  Math.random(), so a learner who leaves and comes back finds the same
   *  board - the same rule the generators follow. */
  seed: string;
  onAnswer: (correct: boolean, misses: [string, string][]) => void;
}) {
  const [order] = useState(() => shuffled(pairs.map((_, i) => i), rng(seed)));
  /* Either column may be tapped first. Forcing left-then-right is one more
     rule to discover, and a learner reading the Hebrew column naturally starts
     from the side they can read. */
  const [picked, setPicked] = useState<{ side: 'left' | 'right'; i: number } | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);
  const missesRef = useRef<[string, string][]>([]);
  const reported = useRef(false);
  /* O que o leitor de tela ouve a cada toque (VIS-005, o mesmo padrão do
     Match da Academia): escolha, par certo, par errado. */
  const [anuncio, setAnuncio] = useState('');

  useEffect(() => {
    if (matched.length === pairs.length && !reported.current) {
      reported.current = true;
      onAnswer(missesRef.current.length === 0, missesRef.current);
    }
  }, [matched, pairs.length, onAnswer]);

  const valor = (side: 'left' | 'right', i: number) => side === 'left' ? pairs[i]!.left : pairs[i]!.right;

  const tap = (side: 'left' | 'right', i: number) => {
    if (settled || matched.includes(i)) return;
    if (!picked || picked.side === side) {            // first tap, or changed their mind
      setPicked({ side, i });
      setAnuncio(tx.escolhido(valor(side, i)));
      return;
    }

    const l = side === 'right' ? picked.i : i;
    const r = side === 'right' ? i : picked.i;
    if (l === r) {
      setMatched(m => [...m, l]);
      setWrong(null);
      const faltam = pairs.length - matched.length - 1;
      setAnuncio(tx.parCerto(pairs[l]!.left, pairs[r]!.right, faltam));
    } else {
      missesRef.current.push([pairs[l]!.left, pairs[r]!.right]);
      setWrong({ l, r });
      setAnuncio(tx.naoCombinam(pairs[l]!.left, pairs[r]!.right));
      setTimeout(() => setWrong(null), 550);
    }
    setPicked(null);
  };

  const Side = ({ kind, value }: { kind: typeof leftKind; value: string }) =>
    kind === 'text'
      ? <span className="font-ui text-[15px] text-ink">{value}</span>
      : <He size={kind === 'glyph' ? 'lg' : 'word'}>{value}</He>;

  return (
    <div className="grid gap-2">
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {([['left', labelLeft], ['right', labelRight]] as const).map(([side, label]) => (
        <div key={side} className="grid gap-2 content-start">
          <p className="font-ui text-[11px] uppercase tracking-[.07em] text-ink-muted px-1">
            {label}
          </p>
          <ul className="grid gap-2">
            {(side === 'left' ? pairs.map((_, i) => i) : order).map(i => {
              const isMatched = matched.includes(i);
              const isPicked = picked?.side === side && picked.i === i;
              const isWrong = wrong && (side === 'left' ? wrong.l === i : wrong.r === i);
              const doOutroLado = side === 'left' ? pairs[i]!.right : pairs[i]!.left;
              return (
                <li key={`${side}-${i}`}>
                  <button
                    type="button"
                    /* `aria-disabled` e não `disabled`: o botão desligado
                       perdia o foco para o <body> a cada par formado
                       (VIS-005). O clique num par já feito é ignorado em `tap`. */
                    aria-disabled={settled || isMatched}
                    aria-pressed={isPicked}
                    aria-label={isMatched
                      ? tx.ligadoA(valor(side, i), doOutroLado)
                      : undefined}
                    onClick={() => tap(side, i)}
                    /* A fixed row height on BOTH sides, so row 3 on the left
                       sits beside row 3 on the right. Hebrew at word size is
                       taller than a line of Portuguese, and letting the rows
                       find their own heights made the two columns drift apart
                       down the screen. */
                    className={`w-full h-[72px] px-3 rounded-[var(--r-md)] border-2
                      grid place-items-center transition-colors aria-disabled:cursor-default
                      ${isMatched ? 'border-[var(--green)] bg-mint'
                        : isWrong ? 'border-[var(--amber)] bg-[var(--amber-wash)]'
                        : isPicked ? 'border-[var(--accent-soft)] bg-[var(--accent-wash)]'
                        : 'border-line bg-surface hover:border-[var(--accent-soft)]'}`}
                  >
                    <Side
                      kind={side === 'left' ? leftKind : rightKind}
                      value={side === 'left' ? pairs[i]!.left : pairs[i]!.right}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
    <p role="status" aria-live="polite" className="sr-only">{anuncio}</p>
    </div>
  );
}

/* ── type it ────────────────────────────────────────────────────────────
   Retrieval, not recognition, and much harder - so the answer is short, the
   matching is forgiving (accents are a stress hint in this course, not part of
   the answer), and the field scrolls itself into view, because a phone keyboard
   covers the bottom half of the screen and an input the learner cannot see is
   an exercise they cannot do. */
export function TypeAnswer({
  he, accept, placeholder, settled, correct, onAnswer
}: {
  he?: string; accept: string[]; placeholder: string;
  settled: boolean; correct: boolean | null;
  onAnswer: (correct: boolean, typed: string) => void;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (settled || !value.trim()) return;
    onAnswer(typedIsCorrect(value, accept), value);
  };

  return (
    <div className="grid gap-4">
      {he && (
        <div className="rounded-[var(--r-lg)] bg-surface-2 py-7 grid place-items-center">
          <He size="display">{he}</He>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          /* `stopPropagation` não é detalhe. O player tem um atalho na
             janela - Enter segue para a próxima pergunta depois de corrigir
             - e este Enter, depois de corrigir, continuava subindo até ele.
             O mesmo toque corrigia e pulava: o aluno nunca via se tinha
             acertado, nem a resposta certa. Pego pela varredura
             `exercicios.mjs` quando o item digitado entrou nas lições. */
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); }
          }}
          onFocus={() => setTimeout(
            () => ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250
          )}
          disabled={settled}
          placeholder={placeholder}
          /* The transliteration is Latin text in a left-to-right box, inside a
             page whose subject is right-to-left. Saying so explicitly stops the
             caret jumping when the learner types next to Hebrew. Desde
             04/10/2026 a caixa também aceita a resposta em hebraico (o
             exercício de ouvir), e "auto" a escreve da direita para a
             esquerda quando a pessoa digita em hebraico. */
          dir="auto"
          lang={tx.campoLang}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-label={tx.suaResposta}
          className={`flex-1 min-w-[180px] min-h-[52px] px-4 rounded-[var(--r-md)] border-2
            bg-surface font-ui text-[17px] text-ink placeholder:text-ink-muted
            ${settled && correct === true ? 'border-[var(--green)]'
              : settled && correct === false ? 'border-[var(--amber)]'
              : 'border-line focus:border-[var(--accent-soft)]'}`}
        />
        <Button onClick={submit} disabled={settled || !value.trim()} size="md">{tx.conferir}</Button>
      </div>
      {settled && correct === false && (
        <p className="font-ui text-[14px] text-ink-body">
          {tx.voceEscreveu(<strong>{value}</strong>, <strong>{accept[0]}</strong>,
            accept.slice(1).some(a => /[\u05D0-\u05EA]/.test(a)) && (
              /* Sem nikud: é como a palavra se digita no teclado do celular
                 (04/10/2026, pedido do dono). A forma com nikud aparece no
                 retorno logo abaixo, que é onde se ensina a ler. */
              <> (<He size="inline">{stripNikud(accept.slice(1).find(a => /[\u05D0-\u05EA]/.test(a))!)}</He>)</>
            ))}
        </p>
      )}
    </div>
  );
}

/* ── the hint ladder ────────────────────────────────────────────────────
   Hints cost nothing and are never the answer. The first is a nudge, the
   second is concrete, and after that the learner is invited to answer and be
   told why - which teaches more than a third hint would. */
export function Hints({ hints, audioId }: { hints?: string[]; audioId?: string | null }) {
  const [shown, setShown] = useState(0);
  const available = hints?.length ?? 0;
  /* Depois da última dica o botão "Mais uma dica" some, e o foco caía no
     <body> (VIS-008). Quem pediu a dica pelo teclado vai para a dica nova. */
  const ultimaRef = useRef<HTMLLIElement>(null);
  const pediuPeloBotao = useRef(false);
  useEffect(() => {
    if (!pediuPeloBotao.current) return;
    pediuPeloBotao.current = false;
    if (shown >= available) ultimaRef.current?.focus({ preventScroll: true });
  }, [shown, available]);
  /* Sem gravação e sem dica, a linha inteira some: não há o que mostrar, e um
     controle desligado entre o aluno e a resposta não é informação. A regra
     valia só aqui, porque as lições diziam "áudio em breve"; hoje elas também
     não dizem nada - ver a nota no AudioButton. */
  const playable = hasAudio(audioId);
  if (!available && !playable) return null;

  return (
    <div className="grid gap-2">
      {shown > 0 && (
        <div className="flex items-start gap-2">
        {/* A Yael pensa junto com o aluno enquanto ele lê a dica (28/10/2026). */}
        <Yael humor="pensando" className="w-[44px] shrink-0 -mt-1" />
        <ul className="grid gap-1.5 flex-1 min-w-0" aria-live="polite">
          {hints?.slice(0, shown).map((h, i) => (
            <li key={i} ref={i === shown - 1 ? ultimaRef : undefined} tabIndex={-1}
                className="outline-none font-ui text-[13.5px] leading-relaxed text-ink-muted
                                   border-l-2 border-[var(--accent)] pl-3">
              <Prose text={h} />
            </li>
          ))}
        </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {shown < available && (
          <button
            type="button"
            onClick={() => { pediuPeloBotao.current = true; setShown(s => s + 1); }}
            className="min-h-[44px] font-ui text-[13px] text-[var(--accent)] hover:underline"
          >
            {shown === 0 ? tx.precisaDica : tx.maisUmaDica}
          </button>
        )}
        {playable && <AudioButton audioId={audioId!} label={tx.ouvir} size="sm" slow />}
      </div>
    </div>
  );
}

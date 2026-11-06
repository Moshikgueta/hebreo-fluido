'use client';

/* O Laboratório de Leitura e a Minha Primeira Leitura (11/10/2026; revisto
 * em 12/10/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Uma palavra por vez, no centro da tela, e o aluno LÊ antes de ver qualquer
 * resposta: a transliteração e o áudio só aparecem depois de ele dizer que
 * tentou (na leitura guiada o áudio fica à mão desde o começo, que é o que
 * "guiada" quer dizer). Três níveis de apoio, de lib/laboratorio.ts.
 *
 * ── três coisas diferentes, e a tela não mistura ──────────────────────────
 *   · TERMINAR uma atividade (a Primeira Leitura de um módulo): `firsts`.
 *   · DIZER que leu certo ("Sim, consegui!"): `leituraAutoavaliada`, à parte.
 *   · PROVAR que sabe: só os exercícios corrigidos pelo curso, que alimentam
 *     `skills` e o domínio das letras. Nada desta tela entra lá.
 *
 * `?primeira=N` abre a Primeira Leitura do módulo N: as mesmas palavras para
 * todo aluno, lidas sozinhas, e um marco em `firsts` quando termina.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { He } from '@/components/hebrew/He';
import { Card } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { AudioButton, hasAudio, useRegistroDeAudio } from '@/components/learn/AudioButton';
import { GravacaoDoProfessor } from '@/components/learn/GravacaoDoProfessor';
import { Cenario, type IdDoCenario } from '@/components/aventura/Cenarios';
import { EscadaDeLeitura, MarcoDeLeitura, lidasNoNivel, marcoAlcancado } from '@/components/aventura/EscadaDeLeitura';
import { allLetters, course, extras, getModule } from '@/lib/content';
import { useProgress } from '@/lib/state/store';
import { aula0Feita, isLessonComplete, letraAtual } from '@/lib/state/rules';
import type { LearnerState } from '@/lib/state/types';
import { useLeitura } from '@/lib/vocabulario';
import { stripNikud } from '@/lib/hebrew';
import { idDoSom, ordemDeEnsino, portasDosModulos, rotaDaLicao } from '@/lib/sons';
import { rng } from '@/lib/engine/rng';
import {
  NIVEIS, bancoDePalavras, descricao, instrucao, mensagemDaPrimeiraLeitura, nPalavras,
  palavrasDaPrimeiraLeitura, palavrasDaRodada, primeiraLeituraId,
  type NivelDeApoio, type PalavraDoBanco
} from '@/lib/laboratorio';
import { tx } from '@/i18n/telas/academia-leitura-client';

const CHAVE_NIVEL = 'hf-leitura-nivel';
const POR_RODADA = 5;

function nivelGuardado(): NivelDeApoio {
  try {
    const v = localStorage.getItem(CHAVE_NIVEL);
    if (v === 'guiada' || v === 'menos-ajuda' || v === 'independente') return v;
  } catch { /* navegação privada: fica a guiada */ }
  return 'guiada';
}

function useBanco(): PalavraDoBanco[] {
  return useMemo(() => bancoDePalavras(
    allLetters(), extras().unpointed.groups.flatMap(g => g.words)
  ), []);
}

/** As lições de som concluídas ("vet", "sin"...): uma palavra que pede o som
 *  só entra depois da lição dele. */
function sonsConcluidos(state: LearnerState): Set<string> {
  return new Set(course.modules.flatMap(m => m.lessons)
    .filter(l => l.som && isLessonComplete(state, idDoSom(l.som)))
    .map(l => l.som!));
}

export function LeituraClient() {
  const busca = useSearchParams();
  const primeira = busca.get('primeira');
  return primeira !== null ? <PrimeiraLeitura n={Number(primeira)} /> : <Laboratorio />;
}

/* ── o laboratório ─────────────────────────────────────────────────────── */

function Laboratorio() {
  const p = useProgress();
  const leitura = useLeitura();
  const banco = useBanco();
  const [nivel, setNivel] = useState<NivelDeApoio>('guiada');
  const [rodada, setRodada] = useState(0);
  const [i, setI] = useState(0);
  const [certas, setCertas] = useState(0);
  const [marco, setMarco] = useState<string | null>(null);
  useEffect(() => { setNivel(nivelGuardado()); }, []);

  /* O lugar do aluno: o módulo da última letra começada. */
  const lugar = useMemo(() => {
    const comecadas = allLetters().filter(l => (p.state.lessons[l.id]?.stagesDone.length ?? 0) > 0);
    return Math.min(7, Math.max(1, ...comecadas.map(l => l.module), 1)) as IdDoCenario;
  }, [p.state.lessons]);

  const sons = useMemo(() => sonsConcluidos(p.state), [p.state]);

  const palavras = useMemo(
    () => palavrasDaRodada(banco, leitura.alfabeto, nivel,
      rng(`leitura-${nivel}-${rodada}-${leitura.letras.length}`), POR_RODADA, sons),
    [banco, leitura.alfabeto, leitura.letras.length, nivel, rodada, sons]
  );

  /* O "Ir para o curso" do estado vazio leva à lição que o aluno tem de
     fazer AGORA: a Aula 0, ou a lição atual do caminho. */
  const destinoDoCurso = useMemo(() => {
    if (!aula0Feita(p.state)) return '/inicio';
    const ordem = ordemDeEnsino(allLetters(), course.modules);
    const atual = letraAtual(p.state, ordem, portasDosModulos(ordem, course.modules));
    return atual ? rotaDaLicao(atual) : '/mapa';
  }, [p.state]);

  const escolher = (n: NivelDeApoio) => {
    setNivel(n);
    try { localStorage.setItem(CHAVE_NIVEL, n); } catch { /* ok */ }
    setRodada(r => r + 1); setI(0); setCertas(0);
  };
  const outra = () => { setRodada(r => r + 1); setI(0); setCertas(0); };

  const palavra = palavras[i];
  const acabou = palavras.length > 0 && i >= palavras.length;

  return (
    <div className="grid gap-6 py-2 max-w-[44rem]">
      <header className="grid gap-2">
        {/* O lugar onde o aluno está na aventura (28/10/2026, Laboratório
            2.0): a leitura acontece ali. Decorativo. */}
        <div aria-hidden className="h-[64px] sm:h-[120px] overflow-hidden rounded-[var(--r-lg)] border border-line mb-1 il-entra">
          <Cenario n={lugar} vivo />
        </div>
        <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted m-0">{tx.laboratorio}</p>
        <h1 className="text-[28px] font-bold m-0 text-balance">{tx.titulo}</h1>
        <p className="font-ui text-[15px] leading-relaxed text-ink-body m-0">
          {tx.intro}
        </p>
        <GravacaoDoProfessor id="reading-lab-how-to"
          textoPt={tx.gravacaoComoLer} />
      </header>

      {!palavras.length ? (
        <Card className="p-5 grid gap-3">
          <p className="font-ui text-[15px] text-ink-body m-0">
            {tx.vazio}
          </p>
          <LinkButton href={destinoDoCurso} variant="secondary" className="justify-self-start">{tx.irCurso}</LinkButton>
        </Card>
      ) : (
        <>
          <fieldset className="grid gap-2 border-0 p-0 m-0">
            <legend className="font-ui text-[14px] font-semibold text-ink mb-2">{tx.quantaAjuda}</legend>
            {/* Um seletor de uma linha, e só a descrição do nível escolhido: os
                três cartões empurravam a palavra para baixo da dobra no celular. */}
            <div className="grid grid-cols-3 gap-1 rounded-[var(--r-md)] border border-line bg-surface-2 p-1">
              {NIVEIS.map(n => (
                <label key={n.id}
                       className={`grid place-items-center rounded-[calc(var(--r-md)-4px)] min-h-[44px] px-1.5 cursor-pointer
                         font-ui text-[14px] font-semibold text-center leading-tight
                         transition-[background-color,color,box-shadow] duration-[var(--dur-toque)]
                         has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent)]
                         ${nivel === n.id ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-ink-muted hover:text-ink'}`}>
                  <input type="radio" name="nivel" value={n.id} checked={nivel === n.id}
                         onChange={() => escolher(n.id)} className="sr-only" />
                  {n.curtoPt}
                </label>
              ))}
            </div>
            <p className="font-ui text-[13.5px] leading-snug text-ink-muted m-0" aria-live="polite">
              <span className="font-semibold text-ink-body">{NIVEIS.find(n => n.id === nivel)?.tituloPt}.</span>{' '}
              {NIVEIS.find(n => n.id === nivel)?.resumoPt}
            </p>
          </fieldset>

          {acabou ? (
            <Card className="p-6 grid gap-4" tone="wash">
              <h2 className="text-[22px] font-semibold m-0">{tx.rodadaConcluida}</h2>
              <p className="font-ui text-[15.5px] leading-relaxed text-ink-body m-0">
                {tx.voceMarcou(certas, nPalavras(palavras.length))}
              </p>
              <p className="font-ui text-[13.5px] leading-relaxed text-ink-muted m-0">
                {tx.autoavaliacao}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={outra}>{tx.maisCinco}</Button>
                <LinkButton href="/meu-hebraico" variant="ghost">{tx.voltarPainel}</LinkButton>
              </div>
            </Card>
          ) : palavra ? (
            <>
            {/* Onde a rodada está: um ponto por palavra. */}
            <div aria-hidden className="flex gap-1.5">
              {palavras.map((w, k) => (
                <span key={w.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-[var(--dur)]
                  ${k < i ? 'bg-[var(--teal)]' : k === i ? 'bg-[var(--teal-lite)]' : 'bg-[var(--line)]'}`} />
              ))}
            </div>
            <LerPalavra
              key={`${rodada}-${i}-${palavra.id}`}
              palavra={palavra}
              nivel={nivel}
              semPontos={nivel === 'independente'}
              posicao={tx.posicao(i + 1, palavras.length)}
              onFim={leuCerto => {
                if (leuCerto) setMarco(marcoAlcancado(lidasNoNivel(p.state, nivel), nivel));
                p.registrarLeitura(`laboratorio-${nivel}`, leuCerto);
                if (leuCerto) setCertas(c => c + 1);
                setI(n => n + 1);
              }}
            />
            </>
          ) : null}

          {/* Embaixo da palavra: no celular a palavra fica na primeira tela, e o
              marco aparece logo abaixo dela, onde o olho já está. */}
          {marco && <MarcoDeLeitura texto={marco} onFechar={() => setMarco(null)} />}
          <EscadaDeLeitura state={p.state} nivel={nivel} />
        </>
      )}
    </div>
  );
}

/* ── uma palavra ───────────────────────────────────────────────────────── */

export function LerPalavra({ palavra, nivel, semPontos, posicao, onFim }: {
  palavra: PalavraDoBanco;
  nivel: NivelDeApoio;
  semPontos: boolean;
  posicao: string;
  /** `ouviuAntes`: ele tocou o áudio ANTES de dizer que leu. */
  onFim: (leuCerto: boolean, ouviuAntes: boolean) => void;
}) {
  useRegistroDeAudio();
  const [fase, setFase] = useState<'ler' | 'conferir'>('ler');
  const [verLetras, setVerLetras] = useState(false);
  const [pedaco, setPedaco] = useState<number | null>(null);
  const [sentido, setSentido] = useState(false);
  const [translit, setTranslit] = useState(false);
  const [ouviuAntes, setOuviuAntes] = useState(false);
  const temAudio = hasAudio(palavra.audioId);
  /* Sem ajuda é sem nikud (06/11/2026, pedido do dono): a palavra aparece só
     com as letras, e os pontos voltam na hora de conferir. */
  const escrita = semPontos ? (palavra.semNikud ?? stripNikud(palavra.he)) : palavra.he;
  const mostraTranslit = temAudio || translit;

  return (
    <Card className="p-5 sm:p-7 grid gap-5">
      <p className="font-ui text-[13px] text-ink-muted tabular-nums m-0">{tx.palavra(posicao)}</p>

      <div className="grid place-items-center rounded-[var(--r-md)] bg-surface-2 py-8 px-3" aria-live="polite">
        <He size="display" pedaco={pedaco}>{escrita}</He>
        {semPontos && fase === 'ler' && (
          <p className="font-ui text-[13px] text-ink-muted mt-2 m-0">{tx.semNikudPlacas}</p>
        )}
      </div>

      {fase === 'ler' ? (
        <>
          <p className="font-ui text-[15px] leading-relaxed text-ink-body m-0">{instrucao(nivel, temAudio)}</p>
          {nivel === 'guiada' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setVerLetras(v => !v)}>
                {verLetras ? tx.esconderLetras : tx.verLetras}
              </Button>
              {temAudio && (
                <span onClickCapture={() => setOuviuAntes(true)}>
                  <AudioButton audioId={palavra.audioId} label={tx.ouvir} ariaLabel={tx.ouvirPalavra} />
                </span>
              )}
            </div>
          )}
          {nivel === 'menos-ajuda' && !verLetras && (
            <Button variant="ghost" onClick={() => setVerLetras(true)}>{tx.precisoAjuda}</Button>
          )}
          {verLetras && nivel !== 'independente' && (
            <LetrasDaPalavra palavra={palavra} ativo={pedaco} onAtivo={setPedaco} />
          )}
          <Button size="lg" full onClick={() => { setPedaco(null); setFase('conferir'); }}>
            {tx.jaLi}
          </Button>
        </>
      ) : (
        <>
          <div className="grid gap-2 text-center">
            {semPontos && <He size="lg">{palavra.he}</He>}
            {mostraTranslit ? (
              <p className="font-ui text-[22px] font-semibold text-ink m-0" dir="ltr">{palavra.translit}</p>
            ) : (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => setTranslit(true)}>{tx.conferirTranslit}</Button>
              </div>
            )}
            {temAudio ? (
              <div className="flex justify-center">
                <AudioButton audioId={palavra.audioId} label={tx.ouvirComparar} ariaLabel={tx.ouvirTranslit(palavra.translit)} />
              </div>
            ) : translit ? (
              <p className="font-ui text-[13.5px] leading-snug text-ink-muted m-0">
                {tx.confiraPronuncia}
              </p>
            ) : null}
            {sentido
              ? <p className="font-ui text-[16px] text-ink-body m-0">{tx.querDizer}<strong className="font-semibold">{palavra.pt}</strong></p>
              : <div className="flex justify-center"><Button variant="ghost" onClick={() => setSentido(true)}>{tx.verSignificado}</Button></div>}
          </div>
          <div className="grid gap-2">
            <p className="font-ui text-[15px] font-semibold text-ink m-0">{tx.conseguiu}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <Button onClick={() => onFim(true, ouviuAntes)}>{tx.simConsegui}</Button>
              <Button variant="secondary" onClick={() => onFim(false, ouviuAntes)}>{tx.precisoPraticar}</Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

/* ── as letras da palavra, na ordem de leitura ─────────────────────────── */

function LetrasDaPalavra({ palavra, ativo, onAtivo }: {
  palavra: PalavraDoBanco; ativo: number | null; onAtivo: (i: number | null) => void;
}) {
  const n = palavra.pedacos.length;
  const ok = palavra.vogaisConferem;
  return (
    <div className="grid gap-3 rounded-[var(--r-md)] border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary"
                onClick={() => onAtivo(ativo === null || ativo >= n - 1 ? 0 : ativo + 1)}>
          {ativo === null ? tx.explorar : ativo >= n - 1 ? tx.comecarDeNovo : tx.proximaLetra}
        </Button>
        <span className="font-ui text-[13.5px] text-ink-muted">{tx.primeiraDireita}</span>
      </div>
      {!ok && (
        <p className="font-ui text-[13.5px] leading-snug text-[var(--gold-ink)] m-0">
          {tx.vogalAtencao}
        </p>
      )}
      <ol dir="rtl" className="flex flex-wrap gap-2 list-none p-0 m-0" aria-label={tx.letrasNaOrdem}>
        {palavra.pedacos.map((p, k) => (
          <li key={k}>
            <button type="button" onClick={() => onAtivo(k)} aria-pressed={ativo === k}
                    className={`grid gap-1 justify-items-center min-w-[88px] min-h-[44px] rounded-[var(--r-sm)] border px-2 py-2
                      ${ativo === k ? 'border-[var(--accent)] bg-[var(--accent-wash)]' : 'border-line bg-surface hover:bg-surface-2'}`}>
              <He size="lg">{p.grafia}</He>
              <span dir="ltr" className="font-ui text-[13.5px] font-semibold text-ink">{p.nomePt}</span>
              {(descricao(p, ok) || null) && (
                <span dir="ltr" className="font-ui text-[13px] text-ink-muted">{descricao(p, ok)}</span>
              )}
            </button>
          </li>
        ))}
      </ol>
      {ativo !== null && palavra.pedacos[ativo] && (
        <p className="font-ui text-[14px] leading-relaxed text-ink-body m-0" role="status">
          <strong className="font-semibold">{palavra.pedacos[ativo]!.nomePt}</strong>
          {ok && palavra.pedacos[ativo]!.sinaisPt.length > 0 && tx.sinal(palavra.pedacos[ativo]!.sinaisPt.join(', '))}
          {ok && palavra.pedacos[ativo]!.notaPt ? `. ${palavra.pedacos[ativo]!.notaPt}` : ''}
        </p>
      )}
    </div>
  );
}

/* ── Minha Primeira Leitura ────────────────────────────────────────────── */

function PrimeiraLeitura({ n }: { n: number }) {
  const p = useProgress();
  const leitura = useLeitura();
  const banco = useBanco();
  const mod = Number.isInteger(n) ? getModule(n) : undefined;
  const deLetras = mod?.kind === 'letters' && mod.letterIds.length > 0;
  const letrasDoModulo = useMemo(
    () => (deLetras ? allLetters().filter(l => l.module === mod!.n) : []),
    [deLetras, mod]
  );
  /* Todas as lições do módulo: as letras E as lições de som dele. */
  const concluiu = !!mod && deLetras && mod.lessons.every(ls =>
    (ls.letters ?? []).every(id => isLessonComplete(p.state, id))
    && (!ls.som || isLessonComplete(p.state, idDoSom(ls.som))));
  const sons = useMemo(() => sonsConcluidos(p.state), [p.state]);
  const palavras = useMemo(
    () => palavrasDaPrimeiraLeitura(banco, letrasDoModulo, leitura.alfabeto, 5, sons),
    [banco, letrasDoModulo, leitura.alfabeto, sons]
  );
  const [i, setI] = useState(-1);
  const [certas, setCertas] = useState(0);
  const [ouviuAlguma, setOuviuAlguma] = useState(false);
  const acabou = palavras.length > 0 && i >= palavras.length;
  useEffect(() => {
    if (acabou && !p.state.firsts[primeiraLeituraId(n)]) p.markFirst(primeiraLeituraId(n));
  }, [acabou]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Endereço que não aponta para um módulo: é um erro de caminho, e não uma
     atividade trancada. */
  if (!mod) {
    return (
      <Card className="p-5 my-4 grid gap-3">
        <p className="font-ui text-[15px] text-ink-body m-0">
          {tx.naoEncontrada}
        </p>
        <LinkButton href="/meu-hebraico" variant="secondary" className="justify-self-start">{tx.voltarPainel}</LinkButton>
      </Card>
    );
  }
  /* Os módulos 6 e 7 não ensinam letra nova: a Primeira Leitura deles não existe. */
  if (!deLetras) {
    return (
      <Card className="p-5 my-4 grid gap-3">
        <p className="font-ui text-[15px] text-ink-body m-0">{tx.indisponivel}</p>
        <LinkButton href="/leitura" variant="secondary" className="justify-self-start">{tx.irLaboratorio}</LinkButton>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 py-2 max-w-[44rem]">
      <header className="grid gap-2">
        <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted m-0">
          {tx.primeiraModulo(mod.n)}
        </p>
        <h1 className="text-[28px] font-bold m-0 text-balance">{mod.titlePt}</h1>
      </header>

      {!concluiu ? (
        <Card className="p-5 grid gap-3">
          <p className="font-ui text-[15px] leading-relaxed text-ink-body m-0">
            {tx.liberadaQuando(mod.n)}
          </p>
          <LinkButton href="/mapa" variant="secondary" className="justify-self-start">{tx.verCurso}</LinkButton>
        </Card>
      ) : !palavras.length ? (
        /* Módulo concluído e nenhuma palavra: é um problema de dados, não uma trava. */
        <Card className="p-5 grid gap-3">
          <p className="font-ui text-[15px] text-ink-body m-0">
            {tx.semPalavras}
          </p>
          <LinkButton href="/leitura" variant="secondary" className="justify-self-start">{tx.irLaboratorio}</LinkButton>
        </Card>
      ) : i < 0 ? (
        <Card tone="wash" className="p-6 grid gap-4">
          <p className="font-ui text-[16px] leading-relaxed text-ink-body m-0">
            {tx.introPrimeira(nPalavras(palavras.length))}
          </p>
          <Button size="lg" onClick={() => setI(0)}>{tx.comecarLeitura}</Button>
        </Card>
      ) : acabou ? (
        <Card tone="wash" className="p-6 grid gap-4">
          <h2 className="text-[22px] font-semibold m-0">{tx.primeiraConcluida}</h2>
          <p className="font-ui text-[15.5px] leading-relaxed text-ink-body m-0">
            {mensagemDaPrimeiraLeitura(palavras.length, certas, ouviuAlguma)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setI(0); setCertas(0); setOuviuAlguma(false); }}>{tx.lerDeNovo}</Button>
            <LinkButton href="/leitura" size="lg">{tx.continuarLaboratorio}</LinkButton>
            <LinkButton href="/meu-hebraico" variant="ghost">{tx.voltarPainel}</LinkButton>
          </div>
        </Card>
      ) : (
        <LerPalavra
          key={`${palavras[i]!.id}-${certas}-${i}`}
          palavra={palavras[i]!}
          nivel="menos-ajuda"
          semPontos={false}
          posicao={tx.posicao(i + 1, palavras.length)}
          onFim={(leuCerto, ouviu) => {
            p.registrarLeitura(primeiraLeituraId(mod.n), leuCerto);
            if (leuCerto) setCertas(c => c + 1);
            if (ouviu) setOuviuAlguma(true);
            setI(k => k + 1);
          }}
        />
      )}
    </div>
  );
}

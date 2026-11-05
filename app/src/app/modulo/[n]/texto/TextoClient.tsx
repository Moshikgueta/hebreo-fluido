'use client';

/* O mini-texto do módulo: ler um bilhete, uma mensagem, um cartão inteiro.
 * ─────────────────────────────────────────────────────────────────────────
 * O texto e as ajudas de leitura moram em components/learn/LinhasDeLeitura
 * (as mesmas das leituras bônus).
 *
 * Depois, perguntas de compreensão em português, no mesmo componente das
 * checagens da lição: não vale nota, não tranca nada, e o motivo aparece
 * sempre. O motor e a regra da revisão estão em lib/engine/textos.ts. */

import { tx } from '@/i18n/telas/licao-texto-client';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { He } from '@/components/hebrew/He';
import { Prose } from '@/components/learn/Blocks';
import { Compreensao } from '@/components/learn/Compreensao';
import { GravarLeitura } from '@/components/learn/GravarLeitura';
import { AudioButton, hasAudio, useRegistroDeAudio } from '@/components/learn/AudioButton';
import { LinhasDeLeitura } from '@/components/learn/LinhasDeLeitura';
import { revisaoDoModulo, segundoTextoDoModulo, textoDoModulo, type CourseModule } from '@/lib/content';
import { useProgress } from '@/lib/state/store';
import { palavrasDoTexto, textoLidoId } from '@/lib/engine/textos';
import { exerciciosDoTexto } from '@/lib/engine/exercicios-do-texto';
import { praticaDoTexto } from '@/lib/engine/pratica-do-texto';
import { ExercisePlayer } from '@/components/learn/ExercisePlayer';
import { tx as txPratica } from '@/i18n/telas/texto-pratica';
import { useState } from 'react';

/* `revisao` (05/10/2026): a mesma página serve à leitura de revisão do
   módulo, que só usa palavras que o aluno já acumulou (/modulo/N/revisao). */
/* `segundo` (28/10/2026): o segundo texto do módulo, em /modulo/N/texto-2. */
export function TextoClient({ module: mod, revisao = false, segundo = false }: { module: CourseModule; revisao?: boolean; segundo?: boolean }) {
  const texto = revisao ? revisaoDoModulo(mod.n) : segundo ? segundoTextoDoModulo(mod.n) : textoDoModulo(mod.n);
  const lidoId = textoLidoId(mod.n, revisao, segundo ? 2 : 1);
  const p = useProgress();
  /* A lista de palavras novas pergunta `hasAudio`: sem assinar, ela não
     redesenha quando o registro das gravações chega. */
  useRegistroDeAudio();
  /* A prática interativa (05/11/2026): `praticando` é o "Praticar de novo". */
  const [praticando, setPraticando] = useState(false);
  if (!texto) {
    return (
      <div className="focus-col grid gap-5">
        <p className="text-[16px] text-ink-body m-0">
          {revisao ? tx.semRevisao : tx.semTexto}
        </p>
        <LinkButton href={`/modulo/${mod.n}`} variant="secondary" className="justify-self-start">
          {tx.voltarAoModulo}
        </LinkButton>
      </div>
    );
  }

  /* A letra em que um erro da prática entra na revisão: a primeira do módulo
     (nos módulos 6 e 7, que não têm letra, o id do módulo, como os
     exercícios deles). */
  const letraDoModulo = mod.lessons.find(l => l.letters?.length)?.letters?.[0] ?? mod.id;
  const pratica = praticaDoTexto(texto, lidoId, letraDoModulo, hasAudio);
  const praticaId = `pratica-${lidoId}`;
  const praticaFeita = pratica.length === 0 || !!p.state.firsts[lidoId] || !!p.state.firsts[praticaId];

  return (
    <div className="focus-col grid gap-6">
      <header className="grid gap-3">
        <Link href={`/modulo/${mod.n}`}
              className="inline-flex items-center min-h-[44px] pr-3 font-ui text-[13px] text-ink-muted hover:text-ink-body">
          {tx.modulo(mod.n)}
        </Link>
        <Badge tone="accent">{revisao ? tx.leituraDeRevisao(mod.n) : segundo ? tx.segundaLeitura(mod.n) : tx.leituraDoModulo(mod.n)}</Badge>
        <h1 className="text-[27px] sm:text-[33px] font-bold leading-tight m-0">{texto.tituloPt}</h1>
        <p className="text-[16px] leading-relaxed text-ink-body m-0"><Prose text={texto.introPt} /></p>
      </header>

      <LinhasDeLeitura linhas={texto.linhas} rotulo={texto.tipoPt} semPontos={!!texto.semPontos} />

      {/* Ler o texto inteiro em voz alta é a leitura corrida de verdade: sem
          parar em cada palavra. Gravar e se ouvir mostra onde a voz travou. */}
      <GravarLeitura
        titulo={tx.leiaEmVozAlta}
        instrucao={tx.leiaInstrucao}
      />

      {texto.novas.length > 0 && (
        <Card tone="wash" className="p-5 grid gap-3">
          <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted m-0">
            {revisao ? tx.nomesEPartes : tx.palavrasNovas}
          </p>
          <ul className="grid gap-2 list-none p-0 m-0">
            {texto.novas.map(w => (
              <li key={w.he} className="flex items-baseline gap-3 flex-wrap">
                <He size="word">{w.he}</He>
                {hasAudio(w.audioId) && <AudioButton audioId={w.audioId!} ariaLabel={tx.ouvir(w.translit)} size="sm" />}
                <span className="font-ui text-[14px] text-ink">
                  <span className="font-semibold">{w.translit}</span>
                  <span className="text-ink-muted"> · {w.pt}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* A prática interativa (05/11/2026): montar frases, ligar palavras e,
          com gravação, ouvir. Vem antes das perguntas; quem já leu o texto
          antes dela não precisa refazer. */}
      {pratica.length > 0 && (
        <section className="grid gap-3" aria-labelledby="pratica-do-texto">
          <div className="grid gap-1">
            <h2 id="pratica-do-texto" className="text-[21px] font-bold">{txPratica.titulo}</h2>
            <p className="font-ui text-[14px] leading-relaxed text-ink-muted max-w-[54ch]">{txPratica.intro}</p>
          </div>
          {praticaFeita && !praticando ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-ui text-[14px] text-[var(--teal-ink)] m-0">✓ {txPratica.feita}</p>
              <button type="button" onClick={() => setPraticando(true)}
                      className="min-h-[44px] px-2 font-ui text-[14px] text-[var(--accent)] underline">
                {txPratica.deNovo}
              </button>
            </div>
          ) : (
            <ExercisePlayer
              exercises={pratica}
              title={txPratica.titulo}
              compact
              onDone={() => { p.markFirst(praticaId); setPraticando(false); }}
            />
          )}
        </section>
      )}

      {!praticaFeita && (
        <p className="font-ui text-[14px] text-ink-muted m-0">{txPratica.perguntasDepois}</p>
      )}

      {praticaFeita && <Compreensao
        id={revisao ? `revisao-texto-${mod.n}` : segundo ? `texto-${mod.n}-2` : `texto-${mod.n}`}
        titulo={tx.entendeu}
        intro={tx.responda}
        /* As perguntas escritas à mão e, depois, as que saem das frases do
           próprio texto (05/11/2026, lib/engine/exercicios-do-texto.ts). */
        perguntas={[...texto.perguntas, ...exerciciosDoTexto(texto, lidoId)]}
        fecho={{
          bom: tx.fechoBom,
          parcial: tx.fechoParcial
        }}
        /* Respondidas as perguntas, o texto conta como lido, e as palavras
           novas dele passam a fazer parte do vocabulário do aluno. */
        aoCompletar={() => p.markFirst(lidoId)}
      />}
      {p.state.firsts[lidoId] && palavrasDoTexto(texto).length > 0 && (
        <p className="font-ui text-[14px] text-[var(--teal-ink)] m-0">
          {tx.entraram}
        </p>
      )}

      <LinkButton href={`/modulo/${mod.n}`} variant="secondary" className="justify-self-start">
        {tx.voltarAoModulo}
      </LinkButton>
    </div>
  );
}

'use client';

/* A marca d'água das aulas (29/09/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Nenhum site impede a gravação de tela ou um print. O que dá para fazer é
 * que a gravação carregue o nome de quem gravou: uma linha discreta, em pé
 * na margem esquerda, com o e-mail do aluno parcialmente escondido e o
 * número da cópia dele (o mesmo da marca invisível, worker/src/lib/marca.js,
 * que o painel /admin/marca reconhece). Num print compartilhado não vai o
 * e-mail inteiro; vai o número, que só o dono do curso liga à conta.
 *
 * Fica na margem para não cobrir texto nem botão (a barra de respostas dos
 * exercícios mora no rodapé), não recebe clique e não é lida pelo leitor de
 * tela: é uma marca para imagem, não conteúdo. Sai também na impressão.
 */

import Link from 'next/link';
import { useAccount } from '@/lib/account/store';
import { numeroDaCopia } from '@/lib/content';
import { mascararEmail } from '@/lib/marca-dagua';
import { tx } from '@/i18n/telas/conta-shell-pecas';

export function MarcaDagua() {
  const account = useAccount();
  const email = account.session?.account.email;
  const copia = numeroDaCopia();
  if (!email && !copia) return null;
  const texto = [email ? tx.licenciadoPara(mascararEmail(email)) : null, copia ? tx.copia(copia) : null]
    .filter(Boolean).join(' · ');
  return (
    <div aria-hidden
         className="fixed left-0 top-[75%] z-10 pointer-events-none select-none
                    origin-top-left -rotate-90 whitespace-nowrap
                    pl-1 font-ui text-[10.5px] tracking-[.04em] text-ink-muted opacity-60 print:opacity-100">
      {texto}
    </div>
  );
}

/* O aviso de direitos no pé de cada página de aula: curto, com a lei, e com
   o link para o artigo dos Termos que diz o resto. Visível para todos, lido
   pelo leitor de tela, e não é marca d'água: é texto da página. */
export function AvisoDeDireitos() {
  return (
    <p className="hf-aviso-direitos mx-auto max-w-[720px] px-4 pt-8 pb-4 text-center font-ui text-[12px] leading-relaxed text-ink-muted">
      {tx.avisoDeDireitos}{' '}
      <Link href="/termos" className="underline underline-offset-2">{tx.termosArtigo5}</Link>.
    </p>
  );
}

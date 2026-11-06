/* Os jogos de prática na página de venda (06/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Os mesmos cartões ilustrados da Academia (CenaDoJogo), com o nome e a
 * descrição de lá: nada desenhado só para vender. As letras das cenas são
 * fixas aqui (quem visita ainda não aprendeu nenhuma) e só de palavras que a
 * capa já mostra. Seis jogos, os que mais mostram o curso; a lista inteira
 * fica na Academia. */

import { CenaDoJogo, type JogoIlustrado } from '@/components/ilustra/CenaDoJogo';
import { tx as txJogos } from '@/i18n/telas/academia-academia-client';
import { tx } from '@/i18n/telas/venda-jogos';
import { Container, H2, Lead, Rubrica } from './base';

const LETRAS = ['ש', 'ל', 'ו', 'ם', 'מ', 'ת'];

const JOGOS: readonly { id: JogoIlustrado; t: string; d: string }[] = [
  { id: 'pomar', t: txJogos.jogoPomarTitulo, d: txJogos.jogoPomarDesc },
  { id: 'ouvir', t: txJogos.jogoOuvirTitulo, d: txJogos.jogoOuvirDesc },
  { id: 'montar', t: txJogos.jogoMontarTitulo, d: txJogos.jogoMontarDesc },
  { id: 'blast', t: txJogos.jogoBlastTitulo, d: txJogos.jogoBlastDesc },
  { id: 'batalha', t: txJogos.jogoBatalhaTitulo, d: txJogos.jogoBatalhaDesc },
  { id: 'caca', t: txJogos.jogoCacaTitulo, d: txJogos.jogoCacaDesc }
];

export function JogosNaCapa() {
  return (
    <section id="jogos" aria-labelledby="jogos-titulo">
      <Container className="pt-20 sm:pt-28">
        <Rubrica className="mb-5">{tx.rubrica}</Rubrica>
        <H2 id="jogos-titulo" className="max-w-[22ch] mb-3">{tx.titulo}</H2>
        <Lead className="m-0 mb-9">{tx.lead}</Lead>
        <ul aria-label={tx.jogos}
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory
                       list-none m-0 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-px-4 pb-3 sm:pb-0 [scrollbar-width:thin]">
          {JOGOS.map(j => (
            <li key={j.id} className="snap-start shrink-0 w-[78%] sm:w-auto">
              <div className="hf-cartao h-full">
                <CenaDoJogo jogo={j.id} letras={LETRAS} />
                <span className="grid gap-1.5 content-start p-4 pt-3.5">
                  <span className="font-display text-[18px] font-semibold tracking-[-0.018em] text-ink">{j.t}</span>
                  <span className="font-ui text-[14px] leading-[1.5] text-ink-muted">{j.d}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

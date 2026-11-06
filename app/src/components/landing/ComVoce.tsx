/* "Você não estuda sozinho" na página de venda (06/11/2026, pedido do dono).
 * ─────────────────────────────────────────────────────────────────────────
 * Logo depois do professor: o que ele oferece além da plataforma. O Fale
 * comigo (app/fale-comigo, worker/src/api/mensagens.js) com o prazo de
 * resposta que o site promete em todo lugar (empresa.atendimento), e o
 * WhatsApp para quem ainda não comprou. Nada de número inventado. */

import { prazoResposta, whatsappUrl } from '@/lib/empresa';
import { tx } from '@/i18n/telas/venda-com-voce';
import { Container, H2, Lead, Rubrica } from './base';
import { IconeWhatsapp } from './Hero';

function Icone({ d }: { d: string }) {
  return (
    <span aria-hidden className="grid place-items-center shrink-0 w-11 h-11 rounded-[12px] bg-[var(--teal-soft)] text-[var(--teal-ink)]">
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </span>
  );
}

export function ComVoce() {
  const zap = whatsappUrl();
  const itens = [
    { t: tx.item1T, d: tx.item1D(prazoResposta()), icone: 'M4 5h16v11H8l-4 4zM8 10h8M8 13h5' },
    { t: tx.item2T, d: tx.item2D, icone: 'M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5' },
    /* Só onde o site tem WhatsApp (o inglês não tem): prometer um canal que
       não existe seria pior do que não dizer nada. */
    ...(zap ? [{ t: tx.item3T, d: tx.item3D, icone: 'M12 21a9 9 0 1 0-8-4.9L3 21l4.9-1A9 9 0 0 0 12 21z' }] : [])
  ];
  return (
    <section id="com-voce" aria-labelledby="com-voce-titulo">
      <Container className="pt-20 sm:pt-24">
        <div className="rounded-[22px] bg-[var(--sand)] p-6 sm:p-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-14 lg:items-center">
          <div>
            <Rubrica className="mb-5">{tx.rubrica}</Rubrica>
            <H2 id="com-voce-titulo" className="mb-3">{tx.titulo}</H2>
            <Lead className="m-0">{tx.lead}</Lead>
            {zap && (
              <a href={zap} target="_blank" rel="noopener noreferrer"
                 className="mt-7 inline-flex items-center justify-center gap-2 rounded-[12px] min-h-[52px] px-5
                            bg-[var(--card)] text-ink font-ui font-semibold text-[15.5px]
                            shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(27,33,31,.05)] active:scale-[.98]">
                <IconeWhatsapp />
                {tx.whatsapp}
                <span className="sr-only">{tx.abreWhatsapp}</span>
              </a>
            )}
          </div>
          <ul className="list-none m-0 p-0 grid gap-3">
            {itens.map(i => (
              <li key={i.t} className="flex gap-4 items-start rounded-[16px] bg-[var(--card)] p-4 sm:p-5 shadow-[0_0_0_1px_var(--line)]">
                <Icone d={i.icone} />
                <span className="grid gap-1">
                  <span className="font-ui text-[16px] font-semibold text-ink">{i.t}</span>
                  <span className="font-ui text-[14.5px] leading-[1.55] text-ink-muted">{i.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

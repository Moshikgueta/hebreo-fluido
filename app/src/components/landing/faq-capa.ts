/* As perguntas da FAQ da capa, fora do componente.
 * ─────────────────────────────────────────────────────────────────────────
 * Moram num módulo sem 'use client' porque são lidas em dois lugares: a FAQ
 * da capa (`Faq`, Fecho.tsx) e o JSON-LD `FAQPage` que a página de servidor
 * escreve (lib/jsonld.ts, auditoria de 01/10, SEO-001). O dado estruturado
 * tem de dizer exatamente o que a página mostra - o Google pede isso, e uma
 * cópia à parte seria a primeira a ficar velha.
 */

import { flagship } from '@/lib/catalog';
import { tempoDoCursoPt } from '@/lib/content-publico';
import { empresa, prazoResposta, whatsappUrl } from '@/lib/empresa';
import { TEM_AUDIO } from './copy';
import { tx } from '@/i18n/telas/venda-faq-capa';

export function perguntasDaCapa(): readonly (readonly [string, string])[] {
  const c = flagship();
  return [
    [tx.p1,
     tx.r1],
    [tx.p2,
     tx.r2],
    [tx.p3,
     tx.r3(tempoDoCursoPt())],
    [tx.p4,
     tx.r4],
    [tx.p5,
     TEM_AUDIO
       ? tx.r5Audio
       : tx.r5SemAudio],
    [tx.p6,
     tx.r6(c.accessMonths)],
    /* No lugar de "Posso estudar no meu ritmo?", que "Quanto tempo leva?" já
       respondia. O prazo e o meio batem com /reembolso: contado da liberação
       do acesso (a política conta "da compra ou da liberação, o que for mais
       favorável"), estorno pelo mesmo meio (PIX volta para a chave de origem,
       cartão é estornado na fatura). */
    [tx.p7,
     tx.r7(empresa.politicas.arrependimentoDias)],
    /* 06/11/2026: o Fale comigo, com o prazo que o site promete em todo lugar. */
    [tx.p9,
     whatsappUrl() ? `${tx.r9(prazoResposta())} ${tx.r9Zap}` : tx.r9(prazoResposta())],
    [tx.p8,
     tx.r8]
  ];
}

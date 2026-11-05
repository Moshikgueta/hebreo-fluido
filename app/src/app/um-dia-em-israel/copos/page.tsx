import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/nomes-no-copo';
import { CoposClient } from './CoposClient';

/* Um dia em Israel, a parada das 10h30: o nome no copo (05/11/2026). */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/copos',
  title: `${tx.titulo} - ${txDia.titulo}`,
  description: tx.intro
});

export default function CoposPage() {
  return <CoposClient />;
}

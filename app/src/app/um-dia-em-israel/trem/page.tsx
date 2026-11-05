import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/estacao-de-trem';
import { TremClient } from './TremClient';

/* Um dia em Israel, a parada das 9h: a estação de trem (05/11/2026). */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/trem',
  title: `${tx.titulo} - ${txDia.titulo}`,
  description: tx.intro
});

export default function TremPage() {
  return <TremClient />;
}

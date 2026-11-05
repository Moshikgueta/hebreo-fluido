import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/shuk';
import { ShukClient } from './ShukClient';

/* Um dia em Israel, a parada das 12h: o shuk (05/11/2026). */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/shuk',
  title: `${tx.titulo} - ${txDia.titulo}`,
  description: tx.intro
});

export default function ShukPage() {
  return <ShukClient />;
}

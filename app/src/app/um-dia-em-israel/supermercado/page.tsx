import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/supermercado';
import { SupermercadoClient } from './SupermercadoClient';

/* Um dia em Israel, a parada das 15h: o supermercado (05/11/2026). */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/supermercado',
  title: `${tx.titulo} - ${txDia.titulo}`,
  description: tx.intro
});

export default function SupermercadoPage() {
  return <SupermercadoClient />;
}

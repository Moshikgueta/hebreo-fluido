import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/cartoes-de-festa';
import { CartoesClient } from './CartoesClient';

/* Um dia em Israel, a última parada: os cartões de festa (05/11/2026). */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/cartoes',
  title: `${tx.titulo} - ${txDia.titulo}`,
  description: tx.intro
});

export default function CartoesPage() {
  return <CartoesClient />;
}

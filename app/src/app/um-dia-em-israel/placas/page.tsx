import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx } from '@/i18n/telas/academia-um-dia';
import { PlacasClient } from './PlacasClient';

/* Um dia em Israel, a primeira parada: as placas da rua (05/11/2026). */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/placas',
  title: `${tx.placasTitulo} - ${tx.titulo}`,
  description: tx.placasIntro
});

export default function PlacasPage() {
  return <PlacasClient />;
}

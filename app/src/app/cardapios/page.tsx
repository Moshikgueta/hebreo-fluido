import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx } from '@/i18n/telas/academia-cardapios';
import { CardapiosClient } from './CardapiosClient';

/* Ler cardápios (05/11/2026). Atrás do portão (GATED em worker/src/gate.js e
   PAGAS em lib/seo.ts), como o Hebraico na rua. */
export const metadata: Metadata = meta({
  rota: '/cardapios',
  title: tx.metaTitulo,
  description: tx.metaDescricao
});

export default function CardapiosPage() {
  return <CardapiosClient />;
}

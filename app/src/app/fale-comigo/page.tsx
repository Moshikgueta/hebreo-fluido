import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx } from '@/i18n/telas/fale-comigo';
import { FaleComigoClient } from './FaleComigoClient';

/* Fale comigo (06/11/2026, pedido do dono): dúvidas, comentários e o
   depoimento. Atrás do portão, como o curso. */
export const metadata: Metadata = meta({
  rota: '/fale-comigo',
  title: tx.metaTitulo,
  description: tx.metaDescricao
});

export default function FaleComigoPage() { return <FaleComigoClient />; }

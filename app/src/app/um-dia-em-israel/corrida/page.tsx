import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx } from '@/i18n/telas/corrida-das-palavras';
import { CorridaClient } from './CorridaClient';

/* A corrida das palavras (05/11/2026): a revisão rápida de Um dia em Israel. */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/corrida',
  title: tx.titulo,
  description: tx.intro
});

export default function CorridaPage() {
  return <CorridaClient />;
}

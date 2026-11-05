import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx as txDia } from '@/i18n/telas/academia-um-dia';
import { tx } from '@/i18n/telas/mensagens-do-dani';
import { MensagensClient } from './MensagensClient';

/* Um dia em Israel, a parada das 18h: as mensagens do Dani (05/11/2026). */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel/mensagens',
  title: `${tx.titulo} - ${txDia.titulo}`,
  description: tx.intro
});

export default function MensagensPage() {
  return <MensagensClient />;
}

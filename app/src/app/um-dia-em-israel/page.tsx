import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx } from '@/i18n/telas/academia-um-dia';
import { MapaDoDiaClient } from './MapaDoDiaClient';

/* Um dia em Israel (05/11/2026): o mapa das paradas. Atrás do portão (GATED
   em worker/src/gate.js e PAGAS em lib/seo.ts), como as outras leituras. */
export const metadata: Metadata = meta({
  rota: '/um-dia-em-israel',
  title: tx.metaTitulo,
  description: tx.metaDescricao
});

export default function UmDiaEmIsraelPage() {
  return <MapaDoDiaClient />;
}

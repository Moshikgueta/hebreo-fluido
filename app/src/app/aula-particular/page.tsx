import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { meta } from '@/lib/seo';
import { AULA_PARTICULAR, tx } from '@/i18n/telas/aula-particular';
import { AulaParticularClient } from './AulaParticularClient';

/* A aula particular com o Moshik (06/11/2026, pedido do dono). Atrás do
   portão, como o curso: é um pedido de aluno. Só no site brasileiro. */
export const metadata: Metadata = meta({
  rota: '/aula-particular',
  title: tx.metaTitulo,
  description: tx.metaDescricao
});

export default function AulaParticularPage() {
  if (!AULA_PARTICULAR) notFound();
  return <AulaParticularClient />;
}

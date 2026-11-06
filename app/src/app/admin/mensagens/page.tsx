import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { MensagensClient } from './MensagensClient';

/* As dúvidas e os comentários dos alunos (Fale comigo), para o dono ler.
   Fora de busca como todo /admin; nada no HTML: a lista vem de
   /api/admin/mensagens, que confere a conta. */
export const metadata: Metadata = meta({
  rota: '/admin/mensagens',
  title: 'Mensagens dos alunos - Hebraico Fluente',
  description: 'Painel do dono do curso para ler as dúvidas e os comentários dos alunos.'
});

export default function MensagensPage() { return <MensagensClient />; }

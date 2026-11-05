import type { Metadata } from 'next';
import { meta } from '@/lib/seo';
import { tx } from '@/i18n/telas/cartoes-de-festa';
import { CartaoRecebidoClient } from './CartaoRecebidoClient';

/* O cartão de festa que um amigo mandou (05/11/2026): a página que quem
   recebe abre, sem conta. Fora da busca e do sitemap (NAO_LISTADAS): cada
   link leva nomes de pessoas. O cartão e os nomes chegam assinados pelo
   servidor (worker/src/api/cartao.js). */
export const metadata: Metadata = meta({
  rota: '/cartao-de-festa',
  title: tx.metaTitulo,
  description: tx.metaDescricao
});

export default function CartaoDeFestaPage() {
  return <CartaoRecebidoClient />;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { meta } from '@/lib/seo';
import { RefundEn } from '@/components/legal/en/RefundEn';
import { RefundEs } from '@/components/legal/es/RefundEs';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { Card } from '@/components/ui/Card';
import { estaAVenda, flagship, getCourse } from '@/lib/catalog';
import { confirmacaoDaDesistencia, empresa, INICIO_DO_ACESSO, temCartao, temPix } from '@/lib/empresa';

export const metadata: Metadata = meta({
  rota: '/reembolso',
  title: process.env.NEXT_PUBLIC_LOCALE === 'en' ? 'Refund and Cancellation Policy - Hebraico Fluente'
    : process.env.NEXT_PUBLIC_LOCALE === 'es' ? 'Reembolso y Cancelación - Hebreo Fluido' : 'Reembolso e Cancelamento - Hebraico Fluente',
  description: process.env.NEXT_PUBLIC_LOCALE === 'en'
    ? `${empresa.politicas.arrependimentoDias} days to cancel, no reason needed, with your money back. How to ask, when the money comes back, and what happens to your access.`
    : process.env.NEXT_PUBLIC_LOCALE === 'es'
    ? `${empresa.politicas.arrependimentoDias} días para desistir, sin dar motivos, con tu dinero de vuelta. Cómo pedirlo, cuándo vuelve el dinero y qué pasa con tu acceso.`
    : 'Sete dias para desistir, sem justificativa, com o dinheiro de volta. Como pedir, ' +
    'em quanto tempo o valor retorna, e o que acontece com o acesso.'
});

/* Reembolso e cancelamento.
 * ─────────────────────────────────────────────────────────────────────────
 * O art. 49 do CDC dá sete dias de arrependimento em compra fora do
 * estabelecimento - o que inclui compra pela internet - e NÃO admite condição
 * ("só se você não tiver assistido"). Esta página não inventa condição
 * nenhuma, e diz isso em voz alta: uma política de reembolso cheia de
 * exceções é o que faz alguém abrir chamado no Procon em vez de escrever um
 * e-mail.
 *
 * O prazo de devolução e o de resposta saem de data/empresa.json, para que a
 * promessa desta página e a do rodapé não divirjam.
 */
export default function Page() {
  /* O site em inglês tem o próprio documento (PLANO-INGLES.md, etapa 6). */
  if (process.env.NEXT_PUBLIC_LOCALE === 'en') return <RefundEn />;
  if (process.env.NEXT_PUBLIC_LOCALE === 'es') return <RefundEs />;
  const c = flagship();
  const { politicas, contato } = empresa;

  return (
    <LegalPage
      documento="reembolso"
      titulo="Reembolso e Cancelamento"
      resumo={
        `Você tem ${politicas.arrependimentoDias} dias para desistir da compra e ` +
        'receber tudo de volta, sem precisar explicar por quê.'
      }
    >
      <Card tone="mint" className="p-5 sm:p-6 grid gap-2">
        <p className="font-display text-[18px] font-bold text-ink">
          O resumo, para quem não quer ler o resto
        </p>
        <p className="font-ui text-[15.5px] leading-relaxed text-ink-body">
          Comprou e se arrependeu? Em{' '}
          <Link href="/perfil" className="text-[var(--accent)] hover:underline">Sua conta</Link>,
          use <strong>Desistir da compra</strong>, ou escreva para{' '}
          <a href={`mailto:${contato.emailSuporte}?subject=${encodeURIComponent('Pedido de reembolso')}`}
             className="font-semibold text-[var(--accent)] hover:underline break-all">
            {contato.emailSuporte}
          </a>{' '}
          em até {politicas.arrependimentoDias} dias. Devolvemos{' '}
          <strong>100% do valor</strong>, sem taxa e sem perguntas. Não importa
          quantas aulas você abriu.
        </p>
      </Card>

      <Artigo n={1} titulo="O direito de arrependimento">
        <p>
          Toda compra feita pela internet dá ao consumidor{' '}
          <strong>{politicas.arrependimentoDias} dias corridos</strong> para desistir. Aqui
          eles são {INICIO_DO_ACESSO}, o dia em que o curso abre para você. É o art. 49 do Código de Defesa do Consumidor, e ele não
          admite condição.
        </p>
        <p>
          Isso significa, em particular, que <strong>não exigimos justificativa</strong>,
          não perguntamos o motivo, não pedimos que você prove nada e{' '}
          <strong>não cobramos taxa</strong> de cancelamento. Ter assistido às aulas
          não tira o seu direito.
        </p>
      </Artigo>

      {/* Pelo site primeiro (Decreto 7.962/2013, art. 5º, § 1º: "pela mesma
          ferramenta utilizada para a contratação"), com a confirmação na hora
          (§ 4º). O e-mail continua valendo, como caminho a mais. */}
      <Artigo n={2} titulo="Como pedir">
        <p>
          <strong>Pelo site, em um minuto:</strong> entre em{' '}
          <Link href="/perfil" className="text-[var(--accent)] hover:underline">Sua conta</Link>,
          encontre a compra em <em>Compras</em> e use <strong>Desistir da compra</strong>.
          O pedido fica registrado na hora, com data e horário, e a confirmação chega
          no seu e-mail no mesmo instante. Você não precisa fazer mais nada.
        </p>
        <p>Se preferir, por e-mail:</p>
        <Lista itens={[
          <>Escreva para <a href={`mailto:${contato.emailSuporte}`} className="text-[var(--accent)] hover:underline break-all">{contato.emailSuporte}</a>, do <strong>mesmo e-mail</strong> usado na compra.</>,
          <>Escreva <em>Pedido de reembolso</em> no assunto. Não precisa de mais nada - nem número de pedido, nós encontramos pelo seu e-mail.</>
        ]} />
        {/* Um texto só para os dois canais, o mesmo dos Termos, da FAQ e do
            /suporte (auditoria de 01/10/2026, LEGAL-109). */}
        <p>{confirmacaoDaDesistencia()}</p>
        <p>
          Pedir do e-mail da compra é a única exigência, e ela existe para proteger
          você: é assim que confirmamos que quem pede o estorno é quem pagou.
        </p>
      </Artigo>

      <Artigo n={3} titulo="Quando o dinheiro volta">
        {/* As formas de devolução acompanham as formas de cobrança: enquanto
            só entra PIX, só sai PIX, e descrever um estorno de cartão que
            ninguém vai pedir só faz o documento parecer genérico. */}
        <Lista itens={[
          ...(temPix() ? [
            <><strong>PIX</strong>: devolvemos para a mesma chave ou conta de origem, em até {politicas.prazoReembolsoUteis} dias úteis a partir da confirmação.</>
          ] : []),
          ...(!temCartao() ? [] : [
            <><strong>Cartão de crédito</strong>: o estorno é solicitado na hora, e aparece na fatura conforme o prazo da operadora - em geral na fatura seguinte, às vezes na outra. Esse tempo é do banco, não nosso.</>,
            <><strong>Parcelado</strong>: o estorno é do valor total. A administradora pode lançar as parcelas restantes e estornar em seguida; o saldo final é zero.</>
          ])
        ]} />
      </Artigo>

      <Artigo n={4} titulo="O que acontece com o acesso">
        <p>
          O acesso ao curso é encerrado quando o reembolso é processado - é a
          contrapartida de receber o valor de volta. O seu progresso de estudo{' '}
          <strong>não é apagado</strong>: se um dia você comprar de novo, ele estará lá.
        </p>
        {/* TEXTO PARA APROVAÇÃO (21/10/2026): o e-book, vendido à parte. Só
            aparece quando ele está à venda (`aVenda` em data/courses.json). */}
        {estaAVenda(getCourse('israel-alem-do-roteiro')) && <p>
          No <strong>e-book Israel Além do Óbvio</strong>, o direito de desistir é o
          mesmo, e a versão interativa fecha quando o reembolso é processado. No pacote, o
          reembolso devolve o valor inteiro e fecha o curso e o e-book.
        </p>}
      </Artigo>

      <Artigo n={5} titulo="Depois dos sete dias">
        <p>
          Passado o prazo de arrependimento, a compra dá direito aos{' '}
          {c.accessMonths} meses de acesso contratados e não é, em regra, reembolsável.
        </p>
        <p>
          Mas há duas situações em que devolvemos de qualquer forma, e elas não têm
          prazo: <strong>problema técnico</strong> que impeça você de usar o curso e que
          não consigamos resolver, e <strong>cobrança indevida</strong> - duplicada, de
          valor diferente do anunciado, ou de compra que você não fez. Em ambos os
          casos, escreva. Resolvemos.
        </p>
      </Artigo>

      <Artigo n={6} titulo="Cancelar não é o mesmo que reembolsar">
        <p>
          Não há assinatura nem cobrança recorrente aqui: você paga uma vez pelo
          período contratado, e nada é cobrado de novo automaticamente. Não existe,
          portanto, o que cancelar para "parar de ser cobrado".
        </p>
        <p>
          Se você quiser apenas encerrar a conta e sair, isso você faz sozinho, na{' '}
          <Link href="/perfil" className="font-semibold text-[var(--accent)] hover:underline">
            página da sua conta
          </Link>
          , a qualquer momento. É definitivo, e leva junto o seu progresso e o seu
          acesso ao curso - <strong>sem reembolso</strong>. Se ainda estiver dentro
          dos {politicas.arrependimentoDias} dias e quiser o valor de volta, use antes{' '}
          <strong>Desistir da compra</strong>.
        </p>
      </Artigo>
    </LegalPage>
  );
}

/* The Refund and Cancellation Policy of the English site (PLANO-INGLES.md, etapa 6).
 * ─────────────────────────────────────────────────────────────────────────
 * A mesma política do site brasileiro (app/src/app/reembolso/page.tsx): um
 * prazo sem condição nenhuma, pedido pelo site ou por e-mail, e o acesso
 * fechando quando o estorno sai. O que muda: 14 dias (DIAS_PADDLE em
 * worker/src/api/pay.js), o estorno pedido ao Paddle na hora, e a regra do
 * CDC virou a regra da casa, sem tirar direito maior da lei de quem compra.
 *
 * RASCUNHO PARA O ADVOGADO: nada aqui vai ao ar antes da leitura dele. */

import Link from 'next/link';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { Card } from '@/components/ui/Card';
import { flagship } from '@/lib/catalog';
import { confirmacaoDaDesistencia, empresa, INICIO_DO_ACESSO, pagaPeloStripe } from '@/lib/empresa';

const link = 'text-[var(--accent)] hover:underline';

export function RefundEn() {
  const c = flagship();
  const { politicas, contato } = empresa;
  const dias = politicas.arrependimentoDias;

  return (
    <LegalPage
      documento="reembolso"
      titulo="Refund and Cancellation Policy"
      resumo={`You have ${dias} days to cancel your purchase and get everything back, without having to explain why.`}
    >
      <Card tone="mint" className="p-5 sm:p-6 grid gap-2">
        <p className="font-display text-[18px] font-bold text-ink">The short version</p>
        <p className="font-ui text-[15.5px] leading-relaxed text-ink-body">
          Bought it and changed your mind? On <Link href="/perfil" className={link}>Your account</Link>,
          use <strong>Cancel the purchase</strong>, or write to{' '}
          <a href={`mailto:${contato.emailSuporte}?subject=${encodeURIComponent('Refund request')}`}
             className="font-semibold text-[var(--accent)] hover:underline break-all">
            {contato.emailSuporte}
          </a>{' '}
          within {dias} days. We refund <strong>100% of the amount</strong>, with no fee and no questions.
          It does not matter how many lessons you opened.
        </p>
      </Card>

      <Artigo n={1} titulo="Your right to cancel">
        <p>
          Every purchase gives you <strong>{dias} calendar days</strong> to cancel, {INICIO_DO_ACESSO} -
          the day the course opens for you. The right has no conditions.
        </p>
        <p>
          In particular, <strong>we do not ask for a reason</strong>, we do not ask you to prove anything
          and <strong>we do not charge a cancellation fee</strong>. Having watched lessons does not take the
          right away. If the consumer law of your country gives you more than this, that applies too.
        </p>
      </Artigo>

      <Artigo n={2} titulo="How to ask">
        <p>
          <strong>On the site, in a minute:</strong> go to{' '}
          <Link href="/perfil" className={link}>Your account</Link>, find the purchase under{' '}
          <em>Purchases</em> and use <strong>Cancel the purchase</strong>. The request is recorded right away,
          with the date and time, and the confirmation reaches your email at the same moment. You do not
          need to do anything else.
        </p>
        <p>If you prefer, by email:</p>
        <Lista itens={[
          <>Write to <a href={`mailto:${contato.emailSuporte}`} className={`${link} break-all`}>{contato.emailSuporte}</a> from the <strong>same email</strong> you used to buy.</>,
          <>Put <em>Refund request</em> in the subject. Nothing else is needed - not even an order number; we find it from your email.</>
        ]} />
        <p>{confirmacaoDaDesistencia()}</p>
        <p>
          Asking from the email you used to buy is the only requirement, and it exists to protect you: it is
          how we confirm that the person asking for the refund is the person who paid.
        </p>
      </Artigo>

      <Artigo n={3} titulo="When the money comes back">
        <p>
          {pagaPeloStripe() ? (
            <>We request the refund from <strong>Stripe</strong>, our payment processor, right away. It goes
            back to the payment method you used (card, Apple Pay or Google Pay), for the full amount.</>
          ) : (
            <>The refund is requested from <strong>Paddle</strong>, our reseller and the Merchant of Record of
            the purchase, right away. It goes back to the payment method you used (card, PayPal, Apple Pay or
            Google Pay), for the full amount.</>
          )} When it shows up on your statement depends on your bank or card
          issuer, not on us.
        </p>
      </Artigo>

      <Artigo n={4} titulo="What happens to your access">
        <p>
          Access to the course ends when the refund is processed - that is the counterpart of getting your
          money back. Your study progress <strong>is not erased</strong>: if you buy again one day, it will
          be there.
        </p>
      </Artigo>

      <Artigo n={5} titulo={`After the ${dias} days`}>
        <p>
          After the cancellation period, the purchase gives you the {c.accessMonths} months of access you
          bought and, as a rule, is not refundable.
        </p>
        <p>
          There are two situations in which we refund anyway, with no time limit: a{' '}
          <strong>technical problem</strong> that keeps you from using the course and that we cannot solve,
          and an <strong>incorrect charge</strong> - a duplicate, an amount different from the one shown,
          or a purchase you did not make. In both cases, write to us. We will sort it out.
        </p>
      </Artigo>

      <Artigo n={6} titulo="Cancelling is not the same as getting a refund">
        <p>
          There is no subscription and no recurring charge here: you pay once for the period you bought,
          and nothing is charged again automatically. So there is nothing to cancel to &ldquo;stop being
          charged&rdquo;.
        </p>
        <p>
          If you only want to close your account and leave, you do that yourself, on the{' '}
          <Link href="/perfil" className="font-semibold text-[var(--accent)] hover:underline">Your account</Link>{' '}
          page, at any time. It is permanent, and it takes your progress and your access to the course with
          it - <strong>with no refund</strong>. If you are still within the {dias} days and want your money
          back, use <strong>Cancel the purchase</strong> first.
        </p>
      </Artigo>
    </LegalPage>
  );
}

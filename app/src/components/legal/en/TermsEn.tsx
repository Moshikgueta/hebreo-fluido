/* The Terms of Use of the English site (PLANO-INGLES.md, etapa 6).
 * ─────────────────────────────────────────────────────────────────────────
 * Escritos a partir dos Termos brasileiros (app/src/app/termos/page.tsx) e
 * do que o site em inglês faz de verdade: cobra pelo Paddle, em dólar, com
 * 14 dias para desistir. O que é lei brasileira (CDC, Lei 9.610, Código
 * Penal) virou a regra geral, e a lei que rege o contrato continua sendo a do
 * Brasil, onde a empresa está, sem tirar a proteção ao consumidor do país de
 * quem compra.
 *
 * RASCUNHO PARA O ADVOGADO: nada aqui vai ao ar antes da leitura dele. O
 * parágrafo do Paddle segue o que o Paddle pede aos vendedores (ser
 * "Merchant of Record", as Buyer Terms dele valendo junto).
 *
 * Preço, prazo de acesso e dias para desistir saem do catálogo e de
 * data/empresa.json, como nos Termos brasileiros: nenhum número à mão. */

import Link from 'next/link';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { brl, flagship } from '@/lib/catalog';
import { confirmacaoDaDesistencia, empresa, INICIO_DO_ACESSO, pagaPeloStripe, renovacaoTexto } from '@/lib/empresa';

const link = 'text-[var(--accent)] hover:underline';

export function TermsEn() {
  const c = flagship();
  const nome = c.titlePt;
  const { politicas, contato } = empresa;
  /* Stripe ou Paddle (`pagamento.exterior` em data/empresa.json, 05/11/2026). */
  const STRIPE = pagaPeloStripe();

  return (
    <LegalPage
      documento="termos"
      titulo="Terms of Use"
      resumo={
        'These terms apply between you and Hebrew Unlocked. They describe what you buy, ' +
        'how access works and what happens if you want to leave.'
      }
    >
      <Artigo n={1} titulo="What you are buying">
        <p>
          Hebrew Unlocked{empresa.razaoSocial ? `, operated by ${empresa.razaoSocial} (Brazil),` : ''} offers{' '}
          <strong>online Hebrew courses</strong>. What you buy is <strong>access to a course</strong> for
          the period shown, studied on the platform in your web browser. The course is self-paced: you
          study at your own rhythm, and the platform checks every exercise right away.
        </p>
        <p>What is <strong>not</strong> included, unless the page of the course you bought says otherwise:</p>
        <Lista itens={[
          'live classes, in a group or one-on-one;',
          'exercise correction or study follow-up by a teacher: support by email and WhatsApp is for problems with access, payment and your account, and for occasional questions about the content;',
          'the other courses on the platform, sold separately when they are released;',
          'an app to install - the platform runs in the browser, on your phone and on your computer;',
          'an official certificate: the certificate of completion records that you finished the course and passed the final exam, and it is not recognized by any educational institution;',
          'physical materials.'
        ]} />
        <p>
          {nome} costs <strong>{brl(c.price.brl)}</strong>, {STRIPE ? 'a one-time payment' : 'a one-time payment with taxes included'}, and
          gives you <strong>{c.accessMonths} months of access</strong> {INICIO_DO_ACESSO}. The price that
          applies is always the one shown on the course page and at checkout at the time of purchase.
        </p>
        <p>
          <strong>Renewal.</strong> {renovacaoTexto(c.accessMonths)} If you cancel a renewal within the
          period in article 9, its months are removed and your access goes back to ending on the earlier date.
        </p>
      </Artigo>

      {STRIPE ? (
      <Artigo n={2} titulo="Payment through Stripe">
        <p>
          The seller of the course is{' '}
          {empresa.razaoSocial ? <strong>{empresa.razaoSocial}</strong> : 'the company that operates Hebrew Unlocked'},
          in Brazil. Payments are processed by <strong>Stripe</strong>, our payment processor, on a secure
          Stripe page: Stripe receives your card details directly, and we never see or store them.
        </p>
        <p>
          The price is charged in US dollars, in a single payment, with no subscription and no automatic
          renewal. Your bank may add its own fees for international purchases. Refunds are processed through
          Stripe, as described in the Refund Policy.
        </p>
      </Artigo>
      ) : (
      <Artigo n={2} titulo="Payment through Paddle">
        <p>
          Our order process is conducted by our online reseller <strong>Paddle.com</strong>. Paddle.com is
          the <strong>Merchant of Record</strong> for all our orders: it processes the payment, issues the
          invoice, collects the sales tax that applies in your country and processes refunds. That is why
          the charge on your statement shows Paddle.
        </p>
        <p>
          Paddle&apos;s{' '}
          <a href="https://www.paddle.com/legal/checkout-buyer-terms" className={link} rel="noopener noreferrer">
            Buyer Terms
          </a>{' '}
          also apply to your purchase. These terms cover the course and your access to it.
        </p>
      </Artigo>
      )}

      <Artigo n={3} titulo="How access is granted">
        <Lista itens={[
          <>Access opens as soon as {STRIPE ? 'Stripe' : 'Paddle'} confirms the payment, usually within minutes.</>,
          <>Access is tied to the <strong>account</strong> created with your email, not to a device: you can sign in on your phone and on your computer with the same login.</>,
          <>Your account can stay signed in on up to <strong>3 devices</strong> at the same time. When you sign in on a fourth, the device you signed in on longest ago is signed out and asks for your login again; your progress is not lost.</>,
          <>Your progress is saved in your account and follows you across devices.</>
        ]} />
        <p>
          If the payment was confirmed and your access did not show up, write to{' '}
          <a href={`mailto:${contato.emailSuporte}`} className={`${link} break-all`}>{contato.emailSuporte}</a>{' '}
          from the email you used to buy. That is our fault, and we fix it at no cost.
        </p>
      </Artigo>

      <Artigo n={4} titulo="Who can buy">
        <p>
          Purchases are made by <strong>people aged 18 or over</strong>. People under 18 may only use the
          platform with the permission and supervision of a parent or legal guardian, who makes the purchase
          and is responsible for it. By accepting these terms when you sign up, and by buying, you declare
          that you are 18 or over, or the legal guardian of the person who will study.
        </p>
      </Artigo>

      <Artigo n={5} titulo="Your account">
        <p>
          Your account is <strong>personal and non-transferable</strong>. You are responsible for your
          password, and the access you buy is for one person.
        </p>
        <p>
          The only reason for suspension is <strong>sharing access</strong> with other people (for example,
          passing your login on or publishing it). If there is a sign of this (such as a number of sign-ins
          far above normal on the same day, or a copy of the content carrying your account&apos;s mark), we
          tell you by email what we observed, and you have <strong>5 business days</strong> to reply. The
          account is only suspended if the sharing is confirmed, and the suspension is communicated by
          email, with the reason. If it turns out to be unjustified, access comes back and the time it was
          suspended is added to your access period.
        </p>
        <p>
          You can erase all your progress whenever you want, inside the platform, and you can{' '}
          <strong>delete your account</strong> yourself, at any time, on the{' '}
          <Link href="/perfil" className={link}>Your account</Link> page. Deleting the account also ends
          your access to the courses you bought, and it <strong>does not give a refund</strong>: to get your
          money back within the cancellation period, use the option in article 9 first. What happens to your
          data is in the <Link href="/privacidade" className={link}>Privacy Policy</Link>.
        </p>
      </Artigo>

      <Artigo n={6} titulo="The content is ours, the learning is yours">
        <p>
          Texts, exercises, audio, images and the software itself are protected by copyright. You may use
          them to study, print them for your own use and take as many notes as you like. You may not
          redistribute, resell, publish or host them elsewhere, or use them to teach others, without
          written permission.
        </p>
        <p>
          To protect the course, the content each account receives carries an invisible mark that does not
          appear on screen or get in the way of studying, and that identifies which account a copy
          published without permission came from. For the same reason, lesson pages show in the margin, in
          small print, the beginning of your email and the number of your copy.
        </p>
        <p>
          <strong>Copying, distributing or selling the course without permission infringes copyright</strong>{' '}
          and may lead to civil liability, including compensation for damages, and to criminal liability.
          Accessing or trying to access data of the platform or of other students without permission may
          also be a crime. When we identify an unauthorized copy or access, the account it came from may be
          suspended as described in article 5, and the appropriate legal steps may be taken.
        </p>
      </Artigo>

      <Artigo n={7} titulo="What we promise - and what we do not">
        <p>
          We promise that the course stays available for the whole period you bought, that the content
          described on the sales page is what is inside, and that errors reported to us are fixed.
        </p>
        <p>
          We do not promise a learning result: how much someone learns depends on how much they study. We
          also do not guarantee uninterrupted operation - maintenance, provider failures and internet
          problems happen. A prolonged interruption caused by us extends your access period by the same
          amount of time.
        </p>
      </Artigo>

      <Artigo n={8} titulo="If the platform shuts down">
        <p>
          If Hebrew Unlocked stops operating before your access period ends, we tell you by email at least{' '}
          <strong>30 days</strong> in advance, and access continues as normal until then. After it shuts
          down, we refund the amount proportional to the access time you had left, through the original
          payment method.
        </p>
      </Artigo>

      <Artigo n={9} titulo="Cancellation and refunds">
        <p>
          You have <strong>{politicas.arrependimentoDias} days</strong>, {INICIO_DO_ACESSO}, to cancel the
          purchase and get your money back, no reason needed. You cancel on the site itself - on{' '}
          <Link href="/perfil" className={link}>Your account</Link>, under the purchase, use{' '}
          <strong>Cancel the purchase</strong> - or by email. {confirmacaoDaDesistencia()} The conditions, the
          steps and the timelines are in the{' '}
          <Link href="/reembolso" className={link}>Refund and Cancellation Policy</Link>. Nothing in these
          terms limits the rights that the consumer law of your country gives you.
        </p>
      </Artigo>

      <Artigo n={10} titulo="Changes to these terms">
        <p>
          These terms may change - to correct, clarify or keep up with changes in the service. The date of
          the last update is at the top of this page. Each version has a code and is kept, unchanged, at its
          own address; the email for each purchase links to the version that applied to it. A change that
          affects access you already bought does not apply backwards: what was written on the day of your
          purchase is what counts.
        </p>
      </Artigo>

      <Artigo n={11} titulo="Governing law">
        <p>
          These terms are governed by the laws of Brazil, where the company is based. If you buy as a
          consumer, this does not take away the protection that the mandatory consumer laws of the country
          where you live give you, and you may go to the courts of that country. Before any dispute, write to{' '}
          <a href={`mailto:${contato.emailSuporte}`} className={`${link} break-all`}>{contato.emailSuporte}</a>:
          almost everything is solved by email.
        </p>
      </Artigo>
    </LegalPage>
  );
}

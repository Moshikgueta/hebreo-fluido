/* The Privacy Policy of the English site (PLANO-INGLES.md, etapa 6).
 * ─────────────────────────────────────────────────────────────────────────
 * Escrita a partir da Política brasileira (app/src/app/privacidade/page.tsx),
 * que descreve o que o sistema REALMENTE guarda, linha por linha. O que muda
 * no site em inglês: o pagamento é do Paddle (que recebe os dados de
 * pagamento como controlador independente, por ser o "Merchant of Record"),
 * as bases legais e os direitos são os do GDPR, e há uma linha para quem mora
 * na Califórnia. O que a empresa guarda por obrigação da lei brasileira (o
 * registro de acesso do Marco Civil) continua dito, porque continua sendo
 * feito.
 *
 * Fora daqui, de propósito, o que o site em inglês não tem: PIX, Mercado
 * Pago, CPF, o teste A/B de 2026 e a prévia do e-book.
 *
 * RASCUNHO PARA O ADVOGADO: nada aqui vai ao ar antes da leitura dele. */

import Link from 'next/link';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { Card } from '@/components/ui/Card';
import { empresa, pagaPeloStripe } from '@/lib/empresa';

const link = 'font-semibold text-[var(--accent)] hover:underline';

export function PrivacyEn() {
  const { contato, privacidade, nomeFantasia } = empresa;
  /* Stripe ou Paddle (`pagamento.exterior` em data/empresa.json, 05/11/2026). */
  const STRIPE = pagaPeloStripe();
  const PROC = STRIPE ? 'Stripe' : 'Paddle';

  const DADOS: [string, string, string][] = [
    ['Name and email', 'create and identify your account, and talk to you about your purchase', 'while the account exists'],
    ['Password', 'sign in to the platform - stored as a PBKDF2 hash, never in plain text', 'while the account exists'],
    ['Acceptance of the Terms of Use, which includes the age statement in article 4 (18 or over, or legal guardian): the date and the version of the Terms you accepted when you signed up',
     'prove the contract between you and the course', 'while the account exists'],
    ['Study progress', 'show where you stopped, choose your next review and issue the certificate', 'while the account exists, or until you erase it'],
    ['Order details', 'record the purchase, grant access and meet tax and accounting obligations', 'for the period the law requires for sales records'],
    ['Payment result', `confirm the purchase, grant access and handle refunds - what ${PROC} tells us about the transaction: status, amount, currency, its id and our order reference. No card details`, 'for the period the law requires for sales records'],
    ['Email confirmation', 'prove that the account address is yours (the link we send when you sign up)', 'while the account exists'],
    ['Request to be told when the next course opens (only if you tick it on Your account)',
     'send one email when the next course opens - legal basis: your consent, which you can withdraw at any time', 'until you untick it, leave through the link in the email or delete your account'],
    ['Access log: IP address, date and time of each sign-in to the account',
     'meet a legal obligation of the company under Brazilian law (the Brazilian Internet Act, Law 12.965/2014, art. 15). It is kept confidential and only handed over by court order',
     'six months, then deleted - even if you delete the account sooner'],
    ['Cancellation request: date, time and IP address of when you asked', 'prove that you cancelled within the period, and process the refund', 'the date and time, with the purchase record; the IP address, six months'],
    ['Reason for cancelling, if you pick one (it is optional)', 'understand why people cancel and improve the course', 'goes in the cancellation notice to the support inbox; on the site only a daily total remains, without your name, deleted after a year'],
    ['Account activity trail: what happened and when (purchase, access granted, refund, password change, and the day the course content was opened), without your email',
     'security, support and proof of what was done on your account', 'six months, then deleted - even if you delete the account sooner'],
    ['Signed-in devices: a random code and the date of each sign-in, without device model, browser or IP',
     'keep the account signed in on at most three devices, and notice when one login is shared among several people', 'while the device stays signed in; removed when you sign out, when a fourth device signs in or when the account is deleted'],
    ['Mark of your copy of the course: a random number, unrelated to your name or email, embedded invisibly in the content you receive',
     'protect the course against copying: identify which account a copy published without permission came from', 'while the account exists'],
    ['Testimonial (only if you write one): the text, how you choose to sign it (name and city, initials or no name) and your two choices, publishing and being contacted',
     'hear your opinion of the course and, only with your permission, publish it on the site and in promotional materials - legal basis: your consent, which you can withdraw at any time on the same page',
     'until you withdraw the testimonial or delete your account; if it is published, it comes down within 7 days'],
    ['Email of someone who receives a course as a gift', 'grant the course when the person who received it creates an account', 'until the gift is used or cancelled'],
    ['IP address (attempt limiter)', 'security: limit sign-in attempts and spot abuse', 'two days, in a technical log']
  ];

  return (
    <LegalPage
      documento="privacidade"
      cta={false}
      titulo="Privacy Policy"
      resumo={
        `What data ${nomeFantasia} collects, what it is for, who it is shared with and how you ` +
        'exercise your rights. In plain English.'
      }
    >
      <Artigo n={1} titulo="Who is responsible for your data">
        <p>
          The controller of your data is the company identified at the end of this page, based in Brazil.
          Any request about personal data can be made by email, at the address in section 6.
          {privacidade.encarregadoNome
            ? ` The person in charge of data protection is ${privacidade.encarregadoNome}.`
            : ` That address is the contact point for everything about your data, and it is answered within ${privacidade.prazoLgpdDias} days.`}
        </p>
      </Artigo>

      <Artigo n={2} titulo="What we collect, and why">
        <p>
          Only what is needed for the course to work and for the purchase to exist. We do not collect
          sensitive data and we do not build profiles for advertising. We do not ask for any ID document
          on any of our screens.
        </p>
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse font-ui text-[14px]">
            <thead>
              <tr className="text-left">
                {['Data', 'What for', 'How long'].map(h => (
                  <th key={h} className="px-4 py-2.5 border-b border-[color:var(--line-soft)]
                                         font-ui text-[12px] uppercase tracking-[.06em] text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DADOS.map(([dado, fim, prazo]) => (
                <tr key={dado} className="align-top">
                  <td className="px-4 py-2.5 border-b border-[color:var(--line-soft)] text-ink font-medium">{dado}</td>
                  <td className="px-4 py-2.5 border-b border-[color:var(--line-soft)] text-ink-body">{fim}</td>
                  <td className="px-4 py-2.5 border-b border-[color:var(--line-soft)] text-ink-muted">{prazo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p>
          The legal bases are: the <strong>performance of the contract</strong> you made with us
          (art. 6(1)(b) GDPR) for everything about your access and progress; <strong>legal
          obligations</strong> for the tax data of the order and for the access log; our{' '}
          <strong>legitimate interests</strong> (art. 6(1)(f)) in keeping the service secure, protecting
          the course against copying and keeping backups; and your <strong>consent</strong> (art. 6(1)(a))
          where the table says so.
        </p>
        <p>
          <strong>Backups.</strong> Once a day we make a copy of the database, stored privately at
          Cloudflare and, encrypted (unreadable without our password), also on Google Drive, to restore the
          service if something goes wrong. Each copy is deleted automatically after <strong>90 days</strong>.
          If you delete your account, your data leaves the system at once and leaves the backups when they
          expire; until then, backups are only used to restore the service, never for anything else.
        </p>
        <p>
          <strong>Recording your voice.</strong> In the lessons, in the reading texts and in the
          demonstration on the home page (even without an account) you can record yourself reading, to hear
          yourself. The browser asks for permission to use the microphone, and the recording stays on your
          device only: it disappears when you leave the page and is never sent to us or anyone else.
        </p>
        <p>
          <strong>Pronunciation check.</strong> If you use &ldquo;Speak and get feedback&rdquo;, in the
          lessons or in the demonstration on the home page, your speech is transcribed by your
          browser&apos;s speech recognition service - Google&apos;s, in Chrome and on Android, or
          Apple&apos;s, in Safari and on the iPhone - under the privacy rules of whoever made the browser.
          The course does not receive your audio: it receives only the transcribed text, compares it with
          the word on screen and does not keep it. If you prefer your voice not to leave your device, use
          only &ldquo;Record mine&rdquo;.
        </p>
      </Artigo>

      <Artigo n={3} titulo="Who we share it with">
        <p>
          As little as possible, and never to sell data - we do not sell, rent or give away personal data
          to anyone.
        </p>
        <Lista itens={[
          STRIPE ? <><strong>Stripe</strong>: our payment processor. When you pay, we pass your <strong>email</strong> and the order to Stripe&apos;s secure payment page, and Stripe collects what it needs for the payment (such as your card details, country and postal code) directly, under its own{' '}<a href="https://stripe.com/privacy" className="text-[var(--accent)] hover:underline" rel="noopener noreferrer">privacy policy</a>. We never receive or store your card details.</> : <><strong>Paddle</strong>: our online reseller and the Merchant of Record of every purchase. When you pay, we pass your <strong>email</strong> to Paddle&apos;s checkout, and Paddle collects what it needs for the payment and for tax (such as your card or PayPal details, country and postal code) directly. Paddle processes that data as an independent controller, under its own{' '}<a href="https://www.paddle.com/legal/privacy" className="text-[var(--accent)] hover:underline" rel="noopener noreferrer">privacy policy</a>. We never receive or store your card details.</>,
          <><strong>Resend</strong>: delivers our emails (password reset, purchase receipt, up to three reminders to start the course in the first days after buying, and notices about your account). For that it receives <strong>your email address and the name on your account</strong>. Promotional emails only go to people who asked for them, and each one carries a link to leave the list.</>,
          <><strong>Infrastructure</strong>: the platform runs on Cloudflare, which hosts the site, the database and the backups. A second, encrypted backup is kept on Google Drive; Google stores the file but cannot read it.</>,
          <><strong>GitHub</strong>: stores the site&apos;s code and our operations tools. When we look up or change an account&apos;s access (for example, to grant a course or fix an email), the operation runs there, and its record shows the email partly hidden.</>,
          <><strong>Support</strong>: if you write to us, the message stays in the support inbox (Gmail, from Google) or on WhatsApp (from Meta). Purchase and cancellation notices reach the same inbox, with your email.</>,
          <><strong>Authorities</strong>, when there is a legal order to do so.</>
        ]} />
        <p>
          The company is in Brazil, and {PROC}, Resend, Cloudflare, GitHub, Google and Meta are companies
          based in other countries, so part of the processing happens on servers outside the country where
          you live, including the United States. These transfers are necessary to perform the contract you
          made with us - they are what lets the site respond, the payment happen, the email arrive and
          support answer.
        </p>
      </Artigo>

      <Artigo n={4} titulo="Cookies and measurement">
        <p>
          We use one <strong>session cookie</strong>, needed to keep you signed in. It is signed, short-lived
          and cannot be used to track your browsing elsewhere.
        </p>
        <p>
          Your browser also keeps your progress locally, so the course works offline, and some of your
          preferences (such as the accessibility settings). That stays on your device only. We use no
          advertising cookies, no ad network and no third-party script to measure audience. The {PROC}
          payment page, which only opens when you pay, is {PROC}&apos;s and follows {PROC}&apos;s
          privacy policy.
        </p>
        <p>
          To improve the lessons, people signed in to the course also send, in batches, learning counts
          only: what type of exercise, from which lesson, whether the answer was right or wrong, and which
          step of which lesson was completed for the first time, with the time range it took (for example,
          &ldquo;between 2 and 4 minutes&rdquo;, counting only the time the page was visible and in use;
          never the exact time). The server adds these numbers up by day and does not keep name, email,
          account, IP address, time of day or what you typed. The totals are deleted after a year.
        </p>
        <p>
          In the free demo on the course page, the browser sends only the name of each step you reached,
          once per visit, so we know where people stop. On the first page you open, the browser notes where
          you came from, in a closed list of categories (such as &ldquo;search&rdquo;, &ldquo;email&rdquo;
          or &ldquo;ad&rdquo;) and, if the link has one, the campaign name; that note stays on your device
          for 30 days, without a cookie, and reaches the server only as a daily total and, if you buy, on
          the order, so we know which channels bring students. The server keeps no name, email, account, IP
          address, time of day or exact site you came from for any of these counts. The totals are deleted
          after a year.
        </p>
        <p>
          At the end of the demo you can ask for the second letter by email. If you do not tick the box
          for the next letters, the address you type is used only to send that email and is not kept or
          added to any list. So as not to send twice on the same day, the server keeps for up to 48 hours a
          code calculated from the address, which cannot be turned back into it.
        </p>
        <p>
          <strong>The interest list.</strong> If you tick the box for the next letters at the end of the
          demo, or ask to be told when a course opens, we keep your email, what you asked for, the category
          you came from and the dates of sign-up. The legal basis is your consent. Your sign-up only counts
          after you confirm it through the link in the first email; without confirmation nothing else is
          sent and the address is deleted in 7 days. Every email on the list carries a link to leave, which
          works without signing in; when you leave, your email is deleted from the list and we send nothing
          more.
        </p>
      </Artigo>

      <Artigo n={5} titulo="Security">
        <Lista itens={[
          'Passwords stored as a salted hash (PBKDF2), never in readable form.',
          'All traffic over HTTPS.',
          'HttpOnly session cookie - the page\'s JavaScript cannot read it.',
          'Attempt limiter on sign-in, against automated password guessing.',
          'Database access restricted to the application.',
          'Daily private backup, with restoration tested.'
        ]} />
        <p>
          No system is perfect. If a security incident creates a relevant risk to your data, we will tell
          you and the competent authorities, as the law requires.
        </p>
      </Artigo>

      <Artigo n={6} titulo="Your rights, and how to use them">
        <p>Depending on where you live (in the European Union and the United Kingdom, under the GDPR), you have the right to:</p>
        <Lista itens={[
          'know whether we process your data, and access it;',
          'correct data that is incomplete, inaccurate or out of date;',
          'have your data deleted;',
          'restrict how your data is processed;',
          'receive your data in a portable format;',
          'object to processing based on our legitimate interests;',
          'withdraw your consent at any time, where processing is based on it;',
          'complain to the data protection authority of the country where you live.'
        ]} />
        <p>
          <strong>California residents:</strong> we do not sell or share your personal information for
          cross-context behavioral advertising, and you have the rights to know, delete and correct it, and
          not to be treated differently for using them.
        </p>
        <Card tone="mint" className="p-5 grid gap-2">
          <p className="font-display text-[16px] font-bold text-ink">Where to send requests about personal data</p>
          <p>
            Write to{' '}
            <a href={`mailto:${contato.emailPrivacidade}?subject=${encodeURIComponent('Data protection request')}`}
               className={`${link} break-all`}>
              {contato.emailPrivacidade}
            </a>{' '}
            with the subject <em>Data protection request</em>, from the email on your account. We reply within{' '}
            <strong>{privacidade.prazoLgpdDias} days</strong>.
          </p>
          <p className="font-ui text-[13.5px] text-ink-muted">
            We ask that the request come from the account&apos;s email because that is how we confirm you
            are you - acting on a deletion request from someone else would be exactly the problem this
            policy exists to prevent.
          </p>
        </Card>
        <p>
          <strong>You can download a copy of your data yourself</strong>, on{' '}
          <Link href="/perfil" className={link}>your account page</Link>, under <em>Download my data</em>:
          you get a file with your sign-up details, purchases, acceptances, access logs and progress. For
          security, the password and the session and device identifiers are not in the file.
        </p>
        <p>
          <strong>You can delete your account yourself</strong>, at any time, on{' '}
          <Link href="/perfil" className={link}>your account page</Link>. We ask for your password at that
          moment - that is what makes sure the person deleting is you - and the deletion takes effect
          immediately, without waiting for anyone. Erasing only your progress, keeping the account, is also
          up to you, on the achievements page.
        </p>
        <p>
          What deletion removes: email, name, password, progress and access to the course. What it does not
          remove, because the law does not allow it: the record of your purchases, which stays without your
          name and without your email, because keeping sales records is an obligation of the seller. What
          remains is the amount, date and status of the payment, and it does not point to you. For the same
          reason the <strong>access logs</strong> from the last six months stay until they reach the period
          the law sets, and are then deleted.
        </p>
        <p>
          The email address above still works for everything else - access, correction, portability - and
          also if you prefer us to do the deletion for you.
        </p>
      </Artigo>

      <Artigo n={7} titulo="Children and teenagers">
        <p>
          The platform is made for adults. We do not direct content to people under 18 or knowingly collect
          their data. If we find an account created by a minor without their parents&apos; or guardians&apos;
          consent, it will be removed.
        </p>
      </Artigo>

      <Artigo n={8} titulo="Changes to this policy">
        <p>
          When this policy changes, the date at the top changes with it. A relevant change in how we
          process your data is announced by email before it takes effect.
        </p>
      </Artigo>
    </LegalPage>
  );
}

/* La Política de Reembolso y Cancelación del sitio en español (PLANO-ESPANHOL.md).
 * ─────────────────────────────────────────────────────────────────────────
 * PRIMERA VERSIÓN TRADUCIDA del texto en inglés (components/legal/en/RefundEn.tsx),
 * que es el escrito para el sitio de fuera: 14 días (DIAS_PADDLE en
 * worker/src/api/pay.js), el reembolso pedido a Paddle al momento, y la regla
 * del CDC convertida en regla de la casa, sin quitar un derecho mayor de la ley
 * de quien compra. No se tradujo del portugués de Brasil.
 *
 * BORRADOR PARA EL ABOGADO: nada de esto sale al aire antes de su lectura.
 * Terminología jurídica neutra de América Latina. */

import Link from 'next/link';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { Card } from '@/components/ui/Card';
import { flagship } from '@/lib/catalog';
import { confirmacaoDaDesistencia, empresa, INICIO_DO_ACESSO, pagaPeloStripe } from '@/lib/empresa';

const link = 'text-[var(--accent)] hover:underline';

export function RefundEs() {
  const c = flagship();
  const { politicas, contato } = empresa;
  const dias = politicas.arrependimentoDias;

  return (
    <LegalPage
      documento="reembolso"
      titulo="Política de Reembolso y Cancelación"
      resumo={`Tienes ${dias} días para cancelar tu compra y recibir todo de vuelta, sin tener que explicar por qué.`}
    >
      <Card tone="mint" className="p-5 sm:p-6 grid gap-2">
        <p className="font-display text-[18px] font-bold text-ink">En pocas palabras</p>
        <p className="font-ui text-[15.5px] leading-relaxed text-ink-body">
          ¿Compraste y cambiaste de opinión? En <Link href="/perfil" className={link}>Tu cuenta</Link>,
          usa <strong>Cancelar la compra</strong>, o escribe a{' '}
          <a href={`mailto:${contato.emailSuporte}?subject=${encodeURIComponent('Solicitud de reembolso')}`}
             className="font-semibold text-[var(--accent)] hover:underline break-all">
            {contato.emailSuporte}
          </a>{' '}
          dentro de los {dias} días. Devolvemos <strong>el 100% del monto</strong>, sin cargos y sin preguntas.
          No importa cuántas lecciones hayas abierto.
        </p>
      </Card>

      <Artigo n={1} titulo="Tu derecho a cancelar">
        <p>
          Toda compra te da <strong>{dias} días corridos</strong> para cancelar, {INICIO_DO_ACESSO}, es decir,
          el día en que el curso se abre para ti. El derecho no tiene condiciones.
        </p>
        <p>
          En particular, <strong>no pedimos un motivo</strong>, no te pedimos que demuestres nada y{' '}
          <strong>no cobramos un cargo por cancelación</strong>. Haber visto lecciones no te quita el derecho.
          Si la ley de protección al consumidor de tu país te da más que esto, eso también se aplica.
        </p>
      </Artigo>

      <Artigo n={2} titulo="Cómo pedirlo">
        <p>
          <strong>En el sitio, en un minuto:</strong> ve a{' '}
          <Link href="/perfil" className={link}>Tu cuenta</Link>, busca la compra en{' '}
          <em>Compras</em> y usa <strong>Cancelar la compra</strong>. La solicitud queda registrada al instante,
          con la fecha y la hora, y la confirmación llega a tu correo en ese mismo momento. No necesitas hacer
          nada más.
        </p>
        <p>Si lo prefieres, por correo:</p>
        <Lista itens={[
          <>Escribe a <a href={`mailto:${contato.emailSuporte}`} className={`${link} break-all`}>{contato.emailSuporte}</a> desde el <strong>mismo correo</strong> que usaste para comprar.</>,
          <>Pon <em>Solicitud de reembolso</em> en el asunto. No hace falta nada más, ni siquiera un número de pedido: lo encontramos con tu correo.</>
        ]} />
        <p>{confirmacaoDaDesistencia()}</p>
        <p>
          Pedirlo desde el correo con el que compraste es el único requisito, y existe para protegerte: es así
          como confirmamos que quien pide el reembolso es quien pagó.
        </p>
      </Artigo>

      <Artigo n={3} titulo="Cuándo vuelve el dinero">
        <p>
          {pagaPeloStripe() ? (
            <>Le pedimos el reembolso de inmediato a <strong>Stripe</strong>, nuestro procesador de pagos.
            Vuelve al medio de pago que usaste (tarjeta, Apple Pay o Google Pay), por el monto total.</>
          ) : (
            <>El reembolso se le pide de inmediato a <strong>Paddle</strong>, nuestro revendedor y el comerciante
            registrado (Merchant of Record) de la compra. Vuelve al medio de pago que usaste (tarjeta, PayPal,
            Apple Pay o Google Pay), por el monto total.</>
          )} Cuándo aparece en tu estado de cuenta depende de tu banco
          o del emisor de tu tarjeta, no de nosotros.
        </p>
      </Artigo>

      <Artigo n={4} titulo="Qué pasa con tu acceso">
        <p>
          El acceso al curso termina cuando se procesa el reembolso: es la contrapartida de recibir tu dinero de
          vuelta. Tu progreso de estudio <strong>no se borra</strong>: si algún día vuelves a comprar, estará
          ahí.
        </p>
      </Artigo>

      <Artigo n={5} titulo={`Después de los ${dias} días`}>
        <p>
          Pasado el plazo de cancelación, la compra te da los {c.accessMonths} meses de acceso que compraste y,
          por regla general, no es reembolsable.
        </p>
        <p>
          Hay dos situaciones en las que reembolsamos de todos modos, sin límite de tiempo: un{' '}
          <strong>problema técnico</strong> que te impide usar el curso y que no podemos resolver, y un{' '}
          <strong>cobro incorrecto</strong>: un cobro duplicado, un monto distinto del que se mostraba o una
          compra que no hiciste. En los dos casos, escríbenos. Lo vamos a resolver.
        </p>
      </Artigo>

      <Artigo n={6} titulo="Cerrar la cuenta no es lo mismo que pedir un reembolso">
        <p>
          Aquí no hay suscripción ni cobro recurrente: pagas una sola vez por el período que compraste, y no se
          vuelve a cobrar nada automáticamente. Por eso no hay nada que cancelar para &ldquo;dejar de
          pagar&rdquo;.
        </p>
        <p>
          Si solo quieres cerrar tu cuenta e irte, lo haces tú mismo, en la página{' '}
          <Link href="/perfil" className="font-semibold text-[var(--accent)] hover:underline">Tu cuenta</Link>,
          en cualquier momento. Es definitivo, y se lleva tu progreso y tu acceso al curso,{' '}
          <strong>sin reembolso</strong>. Si todavía estás dentro de los {dias} días y quieres tu dinero de
          vuelta, usa primero <strong>Cancelar la compra</strong>.
        </p>
      </Artigo>
    </LegalPage>
  );
}

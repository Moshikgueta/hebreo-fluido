/* Los Términos de Uso del sitio en español (PLANO-ESPANHOL.md).
 * ─────────────────────────────────────────────────────────────────────────
 * PRIMERA VERSIÓN TRADUCIDA del texto en inglés (components/legal/en/TermsEn.tsx),
 * que es el escrito para el sitio de fuera: cobro por Paddle, en dólares, con
 * 14 días para cancelar. No se tradujo del portugués de Brasil.
 *
 * BORRADOR PARA EL ABOGADO: nada de esto sale al aire antes de su lectura.
 * Terminología jurídica neutra de América Latina.
 *
 * Precio, plazo de acceso y días para cancelar salen del catálogo y de
 * data/empresa.json, como en los Términos brasileños: ningún número a mano. */

import Link from 'next/link';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { brl, flagship } from '@/lib/catalog';
import { confirmacaoDaDesistencia, empresa, INICIO_DO_ACESSO, pagaPeloStripe, renovacaoTexto } from '@/lib/empresa';

const link = 'text-[var(--accent)] hover:underline';

export function TermsEs() {
  const c = flagship();
  const nome = c.titlePt;
  /* Stripe o Paddle (`pagamento.exterior` en data/empresa.json, 05/11/2026). */
  const STRIPE = pagaPeloStripe();
  const { politicas, contato } = empresa;

  return (
    <LegalPage
      documento="termos"
      titulo="Términos de Uso"
      resumo={
        'Estos términos rigen entre tú y Hebraico Fluente. Describen qué compras, ' +
        'cómo funciona el acceso y qué pasa si quieres desistir.'
      }
    >
      <Artigo n={1} titulo="Qué compras">
        <p>
          Hebraico Fluente{empresa.razaoSocial ? `, operado por ${empresa.razaoSocial} (Brasil),` : ''} ofrece{' '}
          <strong>cursos de hebreo en línea</strong>. Lo que compras es <strong>el acceso a un curso</strong> por
          el período indicado, que se estudia en la plataforma desde tu navegador. El curso es autodirigido:
          estudias a tu propio ritmo, y la plataforma corrige cada ejercicio al instante.
        </p>
        <p>Lo que <strong>no</strong> está incluido, salvo que la página del curso que compraste diga otra cosa:</p>
        <Lista itens={[
          'clases en vivo, en grupo o individuales;',
          'corrección de ejercicios o seguimiento del estudio por parte de un profesor: la atención por correo electrónico y WhatsApp es para problemas de acceso, pago y cuenta, y para dudas puntuales sobre el contenido;',
          'los demás cursos de la plataforma, que se venden por separado cuando se lanzan;',
          'una aplicación para instalar: la plataforma funciona en el navegador, en el celular y en la computadora;',
          'un certificado oficial: el certificado de conclusión registra que terminaste el curso y aprobaste el examen final, y no está reconocido por ninguna institución educativa;',
          'materiales físicos.'
        ]} />
        <p>
          {nome} cuesta <strong>{brl(c.price.brl)}</strong>, {STRIPE ? 'en un solo pago' : 'en un solo pago con impuestos incluidos'}, y te
          da <strong>{c.accessMonths} meses de acceso</strong> {INICIO_DO_ACESSO}. El precio que se aplica es
          siempre el que se muestra en la página del curso y en el pago al momento de la compra.
        </p>
        <p>
          <strong>Renovación.</strong> {renovacaoTexto(c.accessMonths)} Si cancelas una renovación dentro del
          plazo del artículo 9, se quitan sus meses y tu acceso vuelve a terminar en la fecha anterior.
        </p>
      </Artigo>

      {STRIPE ? (
      <Artigo n={2} titulo="El pago a través de Stripe">
        <p>
          El vendedor del curso es{' '}
          {empresa.razaoSocial ? <strong>{empresa.razaoSocial}</strong> : 'la empresa que opera el sitio'},
          con sede en Brasil. Los pagos los procesa <strong>Stripe</strong>, nuestro procesador de pagos, en
          una página segura de Stripe: Stripe recibe directamente los datos de tu tarjeta, y nosotros nunca
          los vemos ni los guardamos.
        </p>
        <p>
          El precio se cobra en dólares estadounidenses, en un solo pago, sin suscripción ni renovación
          automática. Tu banco puede cobrar sus propias comisiones por compras internacionales. Los reembolsos
          se procesan a través de Stripe, como se describe en la Política de Reembolso.
        </p>
      </Artigo>
      ) : (
      <Artigo n={2} titulo="El pago a través de Paddle">
        <p>
          Nuestro proceso de pedidos lo lleva a cabo nuestro revendedor en línea <strong>Paddle.com</strong>.
          Paddle.com es el <strong>comerciante registrado</strong> (Merchant of Record) de todos nuestros
          pedidos: procesa el pago, emite la factura, cobra el impuesto sobre las ventas que corresponda en tu
          país y procesa los reembolsos. Por eso el cargo en tu estado de cuenta aparece como Paddle.
        </p>
        <p>
          Los{' '}
          <a href="https://www.paddle.com/legal/checkout-buyer-terms" className={link} rel="noopener noreferrer">
            Términos para Compradores
          </a>{' '}
          de Paddle también se aplican a tu compra. Estos términos se refieren al curso y a tu acceso a él.
        </p>
      </Artigo>
      )}

      <Artigo n={3} titulo="Cómo se otorga el acceso">
        <Lista itens={[
          <>El acceso se abre en cuanto {STRIPE ? 'Stripe' : 'Paddle'} confirma el pago, por lo general en pocos minutos.</>,
          <>El acceso está vinculado a la <strong>cuenta</strong> creada con tu correo, no a un dispositivo: puedes iniciar sesión en el celular y en la computadora con los mismos datos.</>,
          <>Tu cuenta puede mantener la sesión abierta en hasta <strong>3 dispositivos</strong> al mismo tiempo. Si inicias sesión en un cuarto, el dispositivo en el que iniciaste sesión hace más tiempo se desconecta y vuelve a pedir tus datos; tu progreso no se pierde.</>,
          <>Tu progreso se guarda en tu cuenta y te acompaña de un dispositivo a otro.</>
        ]} />
        <p>
          Si el pago se confirmó y tu acceso no apareció, escribe a{' '}
          <a href={`mailto:${contato.emailSuporte}`} className={`${link} break-all`}>{contato.emailSuporte}</a>{' '}
          desde el correo que usaste para comprar. Es un error nuestro, y lo solucionamos sin costo.
        </p>
      </Artigo>

      <Artigo n={4} titulo="Quién puede comprar">
        <p>
          Las compras las realizan <strong>personas de 18 años o más</strong>. Las personas menores de 18 años
          solo pueden usar la plataforma con la autorización y la supervisión de su padre, madre o tutor legal,
          quien realiza la compra y es responsable de ella. Al aceptar estos términos en el registro, y al
          comprar, declaras que tienes 18 años o más, o que eres el tutor legal de la persona que va a estudiar.
        </p>
      </Artigo>

      <Artigo n={5} titulo="Tu cuenta">
        <p>
          Tu cuenta es <strong>personal e intransferible</strong>. Eres responsable de tu contraseña, y el
          acceso que compras es para una sola persona.
        </p>
        <p>
          El único motivo de suspensión es <strong>compartir el acceso</strong> con otras personas (por ejemplo,
          pasar tus datos de inicio de sesión o publicarlos). Si hay un indicio de ello (como un número de
          inicios de sesión muy por encima de lo normal en un mismo día, o una copia del contenido con la marca
          de tu cuenta), te informamos por correo lo que observamos, y tienes <strong>5 días hábiles</strong>{' '}
          para responder. La cuenta solo se suspende si se confirma que se compartió, y la suspensión se
          comunica por correo, con el motivo. Si resulta injustificada, el acceso vuelve y el tiempo que estuvo
          suspendido se suma a tu período de acceso.
        </p>
        <p>
          Puedes borrar todo tu progreso cuando quieras, dentro de la plataforma, y puedes{' '}
          <strong>eliminar tu cuenta</strong> tú mismo, en cualquier momento, en la página{' '}
          <Link href="/perfil" className={link}>Tu cuenta</Link>. Eliminar la cuenta también termina tu acceso
          a los cursos que compraste y <strong>no da derecho a reembolso</strong>: para recuperar tu dinero
          dentro del plazo de cancelación, usa primero la opción del artículo 9. Lo que pasa con tus datos está
          en la <Link href="/privacidade" className={link}>Política de Privacidad</Link>.
        </p>
      </Artigo>

      <Artigo n={6} titulo="El contenido es nuestro, el aprendizaje es tuyo">
        <p>
          Los textos, ejercicios, audios, imágenes y el propio software están protegidos por derechos de autor.
          Puedes usarlos para estudiar, imprimirlos para tu uso personal y tomar todas las notas que quieras. No
          puedes redistribuirlos, revenderlos, publicarlos ni alojarlos en otro lugar, ni usarlos para enseñar a
          otras personas, sin autorización por escrito.
        </p>
        <p>
          Para proteger el curso, el contenido que recibe cada cuenta lleva una marca invisible que no aparece
          en pantalla ni estorba el estudio, y que identifica de qué cuenta salió una copia publicada sin
          autorización. Por el mismo motivo, las páginas de las lecciones muestran en el margen, en letra
          pequeña, el comienzo de tu correo y el número de tu copia.
        </p>
        <p>
          <strong>Copiar, distribuir o vender el curso sin autorización infringe los derechos de autor</strong>{' '}
          y puede dar lugar a responsabilidad civil, incluida la indemnización por daños y perjuicios, y a
          responsabilidad penal. Acceder o intentar acceder sin autorización a datos de la plataforma o de otros
          estudiantes también puede constituir un delito. Cuando identificamos una copia o un acceso no
          autorizado, la cuenta de la que salió puede ser suspendida como se describe en el artículo 5, y pueden
          tomarse las medidas legales que correspondan.
        </p>
      </Artigo>

      <Artigo n={7} titulo="Lo que prometemos, y lo que no">
        <p>
          Prometemos que el curso estará disponible durante todo el período que compraste, que el contenido
          descrito en la página de venta es el que está adentro, y que los errores que se nos informen se
          corrigen.
        </p>
        <p>
          No prometemos un resultado de aprendizaje: cuánto aprende alguien depende de cuánto estudia. Tampoco
          garantizamos un funcionamiento sin interrupciones: el mantenimiento, las fallas de proveedores y los
          problemas de internet ocurren. Una interrupción prolongada causada por nosotros extiende tu período de
          acceso por el mismo tiempo.
        </p>
      </Artigo>

      <Artigo n={8} titulo="Si la plataforma cierra">
        <p>
          Si Hebraico Fluente deja de operar antes de que termine tu período de acceso, te avisamos por correo
          con al menos <strong>30 días</strong> de anticipación, y el acceso sigue con normalidad hasta entonces.
          Después del cierre, reembolsamos el monto proporcional al tiempo de acceso que te quedaba, por el mismo
          medio de pago original.
        </p>
      </Artigo>

      <Artigo n={9} titulo="Cancelación y reembolsos">
        <p>
          Tienes <strong>{politicas.arrependimentoDias} días</strong>, {INICIO_DO_ACESSO}, para cancelar la
          compra y recibir tu dinero de vuelta, sin dar explicaciones. Cancelas en el propio sitio (en{' '}
          <Link href="/perfil" className={link}>Tu cuenta</Link>, debajo de la compra, usa{' '}
          <strong>Cancelar la compra</strong>) o por correo. {confirmacaoDaDesistencia()} Las condiciones, los
          pasos y los plazos están en la{' '}
          <Link href="/reembolso" className={link}>Política de Reembolso y Cancelación</Link>. Nada en estos
          términos limita los derechos que te otorga la ley de protección al consumidor de tu país.
        </p>
      </Artigo>

      <Artigo n={10} titulo="Cambios en estos términos">
        <p>
          Estos términos pueden cambiar, para corregir, aclarar o acompañar cambios en el servicio. La fecha de
          la última actualización está al principio de esta página. Cada versión tiene un código y se conserva,
          sin cambios, en su propia dirección; el correo de cada compra enlaza la versión que se aplicó a ella.
          Un cambio que afecte un acceso que ya compraste no tiene efecto retroactivo: lo que estaba escrito el
          día de tu compra es lo que vale.
        </p>
      </Artigo>

      <Artigo n={11} titulo="Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de Brasil, donde tiene su sede la empresa. Si compras como
          consumidor, esto no te quita la protección que te otorgan las leyes imperativas de protección al
          consumidor del país donde vives, y puedes acudir a los tribunales de ese país. Antes de cualquier
          controversia, escribe a{' '}
          <a href={`mailto:${contato.emailSuporte}`} className={`${link} break-all`}>{contato.emailSuporte}</a>:
          casi todo se resuelve por correo.
        </p>
      </Artigo>
    </LegalPage>
  );
}

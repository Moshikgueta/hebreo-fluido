/* La Política de Privacidad del sitio en español (PLANO-ESPANHOL.md).
 * ─────────────────────────────────────────────────────────────────────────
 * PRIMERA VERSIÓN TRADUCIDA del texto en inglés (components/legal/en/PrivacyEn.tsx),
 * que es el escrito para el sitio de fuera: el pago es de Paddle (que recibe
 * los datos de pago como responsable independiente, por ser el "Merchant of
 * Record"), las bases legales y los derechos son los del RGPD, y hay una línea
 * para quien vive en California. Lo que la empresa guarda por obligación de la
 * ley brasileña (el registro de acceso del Marco Civil) sigue dicho, porque se
 * sigue haciendo. No se tradujo del portugués de Brasil.
 *
 * BORRADOR PARA EL ABOGADO: nada de esto sale al aire antes de su lectura.
 * Terminología jurídica neutra de América Latina. Falta ver si conviene citar
 * las leyes de datos de los países de habla hispana (México, Argentina,
 * Colombia, Chile y otros), además del RGPD. */

import Link from 'next/link';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { Card } from '@/components/ui/Card';
import { empresa, pagaPeloStripe } from '@/lib/empresa';

const link = 'font-semibold text-[var(--accent)] hover:underline';

export function PrivacyEs() {
  /* Stripe o Paddle (`pagamento.exterior` en data/empresa.json, 05/11/2026). */
  const STRIPE = pagaPeloStripe();
  const PROC = STRIPE ? 'Stripe' : 'Paddle';
  const { contato, privacidade, nomeFantasia } = empresa;

  const DADOS: [string, string, string][] = [
    ['Nombre y correo electrónico', 'crear e identificar tu cuenta, y comunicarnos contigo sobre tu compra', 'mientras exista la cuenta'],
    ['Contraseña', 'iniciar sesión en la plataforma; se guarda como hash PBKDF2, nunca en texto plano', 'mientras exista la cuenta'],
    ['Aceptación de los Términos de Uso, que incluye la declaración de edad del artículo 4 (18 años o más, o tutor legal): la fecha y la versión de los Términos que aceptaste al registrarte',
     'acreditar el contrato entre tú y el curso', 'mientras exista la cuenta'],
    ['Progreso de estudio', 'mostrar dónde te quedaste, elegir tu próximo repaso y emitir el certificado', 'mientras exista la cuenta, o hasta que lo borres'],
    ['Datos del pedido', 'registrar la compra, otorgar el acceso y cumplir obligaciones fiscales y contables', 'durante el plazo que la ley exige para los registros de ventas'],
    ['Resultado del pago', `confirmar la compra, otorgar el acceso y gestionar reembolsos: lo que ${PROC} nos informa sobre la transacción (estado, monto, moneda, su identificador y nuestra referencia del pedido). Ningún dato de tarjeta`, 'durante el plazo que la ley exige para los registros de ventas'],
    ['Confirmación del correo', 'acreditar que la dirección de la cuenta es tuya (el enlace que enviamos al registrarte)', 'mientras exista la cuenta'],
    ['Pedido de aviso cuando abra el próximo curso (solo si lo marcas en Tu cuenta)',
     'enviar un correo cuando abra el próximo curso; base legal: tu consentimiento, que puedes retirar en cualquier momento', 'hasta que lo desmarques, salgas por el enlace del correo o elimines tu cuenta'],
    ['Registro de acceso: dirección IP, fecha y hora de cada inicio de sesión en la cuenta',
     'cumplir una obligación legal de la empresa según la ley brasileña (el Marco Civil de Internet, Ley 12.965/2014, art. 15). Se guarda con confidencialidad y solo se entrega por orden judicial',
     'seis meses, y después se borra, aunque elimines la cuenta antes'],
    ['Solicitud de cancelación: fecha, hora y dirección IP de cuando la pediste', 'acreditar que cancelaste dentro del plazo, y procesar el reembolso', 'la fecha y la hora, con el registro de la compra; la dirección IP, seis meses'],
    ['Motivo de la cancelación, si eliges uno (es opcional)', 'entender por qué las personas cancelan y mejorar el curso', 'va en el aviso de cancelación al buzón de atención; en el sitio solo queda un total diario, sin tu nombre, que se borra después de un año'],
    ['Historial de actividad de la cuenta: qué pasó y cuándo (compra, acceso otorgado, reembolso, cambio de contraseña y el día en que se abrió el contenido del curso), sin tu correo',
     'seguridad, atención y prueba de lo que se hizo en tu cuenta', 'seis meses, y después se borra, aunque elimines la cuenta antes'],
    ['Dispositivos con sesión iniciada: un código aleatorio y la fecha de cada inicio de sesión, sin modelo del dispositivo, navegador ni IP',
     'mantener la sesión de la cuenta en un máximo de tres dispositivos, y notar cuando un mismo acceso se comparte entre varias personas', 'mientras el dispositivo siga con la sesión iniciada; se quita cuando cierras sesión, cuando un cuarto dispositivo inicia sesión o cuando se elimina la cuenta'],
    ['Marca de tu copia del curso: un número aleatorio, sin relación con tu nombre ni tu correo, incrustado de forma invisible en el contenido que recibes',
     'proteger el curso contra copias: identificar de qué cuenta salió una copia publicada sin autorización', 'mientras exista la cuenta'],
    ['Testimonio (solo si escribes uno): el texto, cómo eliges firmarlo (nombre y ciudad, iniciales o sin nombre) y tus dos elecciones, publicarlo y ser contactado',
     'conocer tu opinión sobre el curso y, solo con tu permiso, publicarla en el sitio y en materiales promocionales; base legal: tu consentimiento, que puedes retirar en cualquier momento en la misma página',
     'hasta que retires el testimonio o elimines tu cuenta; si está publicado, se retira en un plazo de 7 días'],
    ['Dudas y comentarios que mandes en Habla conmigo: el texto, si es una duda o un comentario, el módulo de donde vino y la fecha',
     'responderte y mejorar el curso. El mensaje le llega al profesor por correo, y la respuesta va al correo de tu cuenta',
     'hasta que elimines tu cuenta'],
    ['Correo de quien recibe un curso de regalo', 'otorgar el curso cuando la persona que lo recibió cree una cuenta', 'hasta que el regalo se use o se cancele'],
    ['Dirección IP (limitador de intentos)', 'seguridad: limitar los intentos de inicio de sesión y detectar abusos', 'dos días, en un registro técnico']
  ];

  return (
    <LegalPage
      documento="privacidade"
      cta={false}
      titulo="Política de Privacidad"
      resumo={
        `Qué datos recopila ${nomeFantasia}, para qué sirven, con quién se comparten y cómo ` +
        'ejerces tus derechos. En palabras simples.'
      }
    >
      <Artigo n={1} titulo="Quién es responsable de tus datos">
        <p>
          El responsable de tus datos es la empresa identificada al final de esta página, con sede en Brasil.
          Cualquier solicitud sobre datos personales puede hacerse por correo, a la dirección de la sección 6.
          {privacidade.encarregadoNome
            ? ` La persona a cargo de la protección de datos es ${privacidade.encarregadoNome}.`
            : ` Esa dirección es el punto de contacto para todo lo relacionado con tus datos, y se responde en un plazo de ${privacidade.prazoLgpdDias} días.`}
        </p>
      </Artigo>

      <Artigo n={2} titulo="Qué recopilamos, y por qué">
        <p>
          Solo lo necesario para que el curso funcione y para que la compra exista. No recopilamos datos
          sensibles ni elaboramos perfiles con fines publicitarios. No pedimos ningún documento de identidad en
          ninguna de nuestras pantallas.
        </p>
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse font-ui text-[14px]">
            <thead>
              <tr className="text-left">
                {['Dato', 'Para qué', 'Por cuánto tiempo'].map(h => (
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
          Las bases legales son: la <strong>ejecución del contrato</strong> que celebraste con nosotros
          (art. 6(1)(b) del RGPD) para todo lo relacionado con tu acceso y tu progreso; las{' '}
          <strong>obligaciones legales</strong> para los datos fiscales del pedido y para el registro de acceso;
          nuestro <strong>interés legítimo</strong> (art. 6(1)(f)) en mantener la seguridad del servicio,
          proteger el curso contra copias y conservar copias de seguridad; y tu <strong>consentimiento</strong>{' '}
          (art. 6(1)(a)) donde la tabla lo indica.
        </p>
        <p>
          <strong>Copias de seguridad.</strong> Una vez al día hacemos una copia de la base de datos, guardada de
          forma privada en Cloudflare y, cifrada (ilegible sin nuestra contraseña), también en Google Drive, para
          restaurar el servicio si algo sale mal. Cada copia se borra automáticamente después de{' '}
          <strong>90 días</strong>. Si eliminas tu cuenta, tus datos salen del sistema de inmediato y salen de
          las copias cuando estas vencen; hasta entonces, las copias solo se usan para restaurar el servicio,
          nunca para otra cosa.
        </p>
        <p>
          <strong>La grabación de tu voz.</strong> En las lecciones, en los textos de lectura y en la
          demostración de la página de inicio (incluso sin cuenta) puedes grabarte leyendo, para escucharte. El
          navegador pide permiso para usar el micrófono, y la grabación queda solo en tu dispositivo: desaparece
          cuando sales de la página y nunca se nos envía a nosotros ni a nadie.
        </p>
        <p>
          <strong>La revisión de la pronunciación.</strong> Si usas &ldquo;Habla y recibe la corrección&rdquo;,
          en las lecciones o en la demostración de la página de inicio, tu voz la transcribe el servicio de
          reconocimiento de voz de tu navegador (el de Google, en Chrome y en Android, o el de Apple, en Safari y
          en el iPhone), según las reglas de privacidad de quien hizo el navegador. El curso no recibe tu audio:
          recibe solo el texto transcrito, lo compara con la palabra en pantalla y no lo guarda. Si prefieres que
          tu voz no salga de tu dispositivo, usa solo &ldquo;Grabar la mía&rdquo;.
        </p>
      </Artigo>

      <Artigo n={3} titulo="Con quién los compartimos">
        <p>
          Lo menos posible, y nunca para vender datos: no vendemos, alquilamos ni cedemos datos personales a
          nadie.
        </p>
        <Lista itens={[
          STRIPE ? <><strong>Stripe</strong>: nuestro procesador de pagos. Cuando pagas, pasamos tu <strong>correo</strong> y el pedido a la página de pago segura de Stripe, y Stripe recopila directamente lo que necesita para el pago (como los datos de tu tarjeta, el país y el código postal), según su propia{' '}<a href="https://stripe.com/privacy" className="text-[var(--accent)] hover:underline" rel="noopener noreferrer">política de privacidad</a>. Nunca recibimos ni guardamos los datos de tu tarjeta.</> : <><strong>Paddle</strong>: nuestro revendedor en línea y el comerciante registrado (Merchant of Record) de cada compra. Cuando pagas, pasamos tu <strong>correo</strong> al pago de Paddle, y Paddle recopila directamente lo que necesita para el pago y los impuestos (como los datos de tu tarjeta o de PayPal, el país y el código postal). Paddle trata esos datos como responsable independiente, según su propia{' '}<a href="https://www.paddle.com/legal/privacy" className="text-[var(--accent)] hover:underline" rel="noopener noreferrer">política de privacidad</a>. Nunca recibimos ni guardamos los datos de tu tarjeta.</>,
          <><strong>Resend</strong>: entrega nuestros correos (restablecimiento de contraseña, comprobante de compra, hasta tres recordatorios para empezar el curso en los primeros días después de la compra, y avisos sobre tu cuenta). Para eso recibe <strong>tu dirección de correo y el nombre de tu cuenta</strong> y, cuando mandas un mensaje en Habla conmigo, su texto, en el aviso que va al profesor. Los correos promocionales solo van a quienes los pidieron, y cada uno lleva un enlace para salir de la lista.</>,
          <><strong>Infraestructura</strong>: la plataforma funciona en Cloudflare, que aloja el sitio, la base de datos y las copias de seguridad. Una segunda copia, cifrada, se guarda en Google Drive; Google almacena el archivo pero no puede leerlo.</>,
          <><strong>GitHub</strong>: guarda el código del sitio y nuestras herramientas de operación. Cuando consultamos o cambiamos el acceso de una cuenta (por ejemplo, para otorgar un curso o corregir un correo), la operación se ejecuta allí, y su registro muestra el correo parcialmente oculto.</>,
          <><strong>Atención</strong>: si nos escribes, el mensaje queda en el buzón de atención (Gmail, de Google) o en WhatsApp (de Meta). Los avisos de compra y de cancelación llegan al mismo buzón, con tu correo.</>,
          <><strong>Autoridades</strong>, cuando haya una orden legal para hacerlo.</>
        ]} />
        <p>
          La empresa está en Brasil, y {PROC}, Resend, Cloudflare, GitHub, Google y Meta son empresas con sede
          en otros países, por lo que parte del tratamiento ocurre en servidores fuera del país donde vives,
          incluidos los Estados Unidos. Estas transferencias son necesarias para ejecutar el contrato que
          celebraste con nosotros: son las que permiten que el sitio responda, que el pago se realice, que el
          correo llegue y que la atención responda.
        </p>
      </Artigo>

      <Artigo n={4} titulo="Cookies y medición">
        <p>
          Usamos una <strong>cookie de sesión</strong>, necesaria para mantener tu sesión iniciada. Está
          firmada, dura poco y no puede usarse para seguir tu navegación en otros sitios.
        </p>
        <p>
          Tu navegador también guarda tu progreso de forma local, para que el curso funcione sin conexión, y
          algunas de tus preferencias (como los ajustes de accesibilidad). Eso queda solo en tu dispositivo. No
          usamos cookies publicitarias, ni redes de anuncios, ni scripts de terceros para medir la audiencia. La
          página de pago de {PROC}, que solo se abre cuando pagas, es de {PROC} y sigue la política de
          privacidad de {PROC}.
        </p>
        <p>
          Para mejorar las lecciones, las personas con sesión iniciada en el curso también envían, en lotes,
          solo conteos de aprendizaje: qué tipo de ejercicio, de qué lección, si la respuesta fue correcta o
          incorrecta, y qué paso de qué lección se completó por primera vez, con el rango de tiempo que tomó
          (por ejemplo, &ldquo;entre 2 y 4 minutos&rdquo;, contando solo el tiempo en que la página estuvo
          visible y en uso; nunca el tiempo exacto). El servidor suma estos números por día y no guarda nombre,
          correo, cuenta, dirección IP, hora del día ni lo que escribiste. Los totales se borran después de un
          año.
        </p>
        <p>
          En la prueba gratis de la página del curso, el navegador envía solo el nombre de cada paso al que
          llegaste, una vez por visita, para que sepamos dónde se detienen las personas. En la primera página
          que abres, el navegador anota de dónde llegaste, en una lista cerrada de categorías (como
          &ldquo;búsqueda&rdquo;, &ldquo;correo&rdquo; o &ldquo;anuncio&rdquo;) y, si el enlace lo tiene, el
          nombre de la campaña; esa nota queda en tu dispositivo durante 30 días, sin cookie, y llega al
          servidor solo como un total diario y, si compras, en el pedido, para que sepamos qué canales traen
          estudiantes. El servidor no guarda nombre, correo, cuenta, dirección IP, hora del día ni el sitio
          exacto del que llegaste para ninguno de estos conteos. Los totales se borran después de un año.
        </p>
        <p>
          Al final de la prueba puedes pedir la segunda letra por correo. Si no marcas la casilla de las
          próximas letras, la dirección que escribes se usa solo para enviar ese correo y no se guarda ni se
          agrega a ninguna lista. Para no enviarlo dos veces el mismo día, el servidor guarda hasta por 48 horas
          un código calculado a partir de la dirección, que no puede convertirse de nuevo en ella.
        </p>
        <p>
          <strong>La lista de interesados.</strong> Si marcas la casilla de las próximas letras al final de la
          prueba, o pides que te avisemos cuando abra un curso, guardamos tu correo, lo que pediste, la categoría
          de la que llegaste y las fechas de inscripción. La base legal es tu consentimiento. Tu inscripción solo
          cuenta después de que la confirmes con el enlace del primer correo; sin confirmación no se envía nada
          más y la dirección se borra en 7 días. Cada correo de la lista lleva un enlace para salir, que
          funciona sin iniciar sesión; cuando sales, tu correo se borra de la lista y no enviamos nada más.
        </p>
      </Artigo>

      <Artigo n={5} titulo="Seguridad">
        <Lista itens={[
          'Contraseñas guardadas como hash con sal (PBKDF2), nunca en forma legible.',
          'Todo el tráfico por HTTPS.',
          'Cookie de sesión HttpOnly: el JavaScript de la página no puede leerla.',
          'Limitador de intentos en el inicio de sesión, contra la adivinación automatizada de contraseñas.',
          'Acceso a la base de datos restringido a la aplicación.',
          'Copia de seguridad privada diaria, con la restauración probada.'
        ]} />
        <p>
          Ningún sistema es perfecto. Si un incidente de seguridad genera un riesgo relevante para tus datos, te
          lo informaremos a ti y a las autoridades competentes, como exige la ley.
        </p>
      </Artigo>

      <Artigo n={6} titulo="Tus derechos, y cómo ejercerlos">
        <p>Según dónde vivas (en la Unión Europea y el Reino Unido, conforme al RGPD), tienes derecho a:</p>
        <Lista itens={[
          'saber si tratamos tus datos, y acceder a ellos;',
          'corregir datos incompletos, inexactos o desactualizados;',
          'que se eliminen tus datos;',
          'limitar el tratamiento de tus datos;',
          'recibir tus datos en un formato portable;',
          'oponerte al tratamiento basado en nuestro interés legítimo;',
          'retirar tu consentimiento en cualquier momento, cuando el tratamiento se base en él;',
          'presentar una reclamación ante la autoridad de protección de datos del país donde vives.'
        ]} />
        <p>
          <strong>Residentes de California:</strong> no vendemos ni compartimos tu información personal para
          publicidad conductual entre contextos, y tienes derecho a conocerla, eliminarla y corregirla, y a no
          recibir un trato distinto por ejercer esos derechos.
        </p>
        <Card tone="mint" className="p-5 grid gap-2">
          <p className="font-display text-[16px] font-bold text-ink">Dónde enviar las solicitudes sobre datos personales</p>
          <p>
            Escribe a{' '}
            <a href={`mailto:${contato.emailPrivacidade}?subject=${encodeURIComponent('Solicitud de protección de datos')}`}
               className={`${link} break-all`}>
              {contato.emailPrivacidade}
            </a>{' '}
            con el asunto <em>Solicitud de protección de datos</em>, desde el correo de tu cuenta. Respondemos en
            un plazo de <strong>{privacidade.prazoLgpdDias} días</strong>.
          </p>
          <p className="font-ui text-[13.5px] text-ink-muted">
            Pedimos que la solicitud llegue desde el correo de la cuenta porque así confirmamos que eres tú:
            atender una solicitud de eliminación de otra persona sería justamente el problema que esta política
            existe para evitar.
          </p>
        </Card>
        <p>
          <strong>Puedes descargar tú mismo una copia de tus datos</strong>, en{' '}
          <Link href="/perfil" className={link}>la página de tu cuenta</Link>, en <em>Descargar mis datos</em>:
          recibes un archivo con tus datos de registro, compras, aceptaciones, registros de acceso y progreso.
          Por seguridad, la contraseña y los identificadores de sesión y de dispositivo no están en el archivo.
        </p>
        <p>
          <strong>Puedes eliminar tu cuenta tú mismo</strong>, en cualquier momento, en{' '}
          <Link href="/perfil" className={link}>la página de tu cuenta</Link>. En ese momento te pedimos la
          contraseña (es lo que asegura que quien elimina eres tú) y la eliminación tiene efecto inmediato, sin
          esperar a nadie. Borrar solo tu progreso, conservando la cuenta, también depende de ti, en la página de
          logros.
        </p>
        <p>
          Lo que la eliminación quita: correo, nombre, contraseña, progreso y acceso al curso. Lo que no quita,
          porque la ley no lo permite: el registro de tus compras, que queda sin tu nombre y sin tu correo,
          porque conservar los registros de ventas es una obligación del vendedor. Lo que queda es el monto, la
          fecha y el estado del pago, y no te identifica. Por el mismo motivo, los{' '}
          <strong>registros de acceso</strong> de los últimos seis meses se conservan hasta cumplir el plazo
          que fija la ley, y después se borran.
        </p>
        <p>
          La dirección de correo de arriba sigue sirviendo para todo lo demás (acceso, corrección,
          portabilidad), y también si prefieres que hagamos la eliminación por ti.
        </p>
      </Artigo>

      <Artigo n={7} titulo="Niños, niñas y adolescentes">
        <p>
          La plataforma está hecha para personas adultas. No dirigimos contenido a menores de 18 años ni
          recopilamos sus datos a sabiendas. Si encontramos una cuenta creada por una persona menor de edad sin
          el consentimiento de sus padres o tutores, será eliminada.
        </p>
      </Artigo>

      <Artigo n={8} titulo="Cambios en esta política">
        <p>
          Cuando esta política cambia, la fecha del principio cambia con ella. Un cambio relevante en la forma
          en que tratamos tus datos se avisa por correo antes de que entre en vigor.
        </p>
      </Artigo>
    </LegalPage>
  );
}

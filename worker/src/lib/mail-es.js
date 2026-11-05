/* Os e-mails ao aluno, em espanhol (site em espanhol, PLANO-ESPANHOL.md).
 * ─────────────────────────────────────────────────────────────────────────
 * O espelho de lib/mail-en.js para as contas do site em espanhol: mesmas
 * funções, mesmos parâmetros, mesma forma de saída ({ subject, text, html }),
 * as mesmas regras (texto curto, sem imagem, nome só quando é nome, HTML
 * escapado). O site em espanhol é um site de fora, como o inglês: Paddle,
 * dólar, 14 dias para desistir. Por isso o texto segue o SENTIDO do inglês
 * onde o inglês foi adaptado, e a voz do português no resto.
 *
 * Espanhol neutro da América Latina, com "tú". A transliteração dentro do
 * texto sai de tools/translit-es.mjs, aplicada à do português.
 *
 * PRIMEIRA VERSÃO escrita pelo Claude; precisa da revisão de um nativo.
 */

import { nomeSeguro } from './nome.js';
import { escapar } from './mail.js';
import empresa from '../../../data/empresa.json';

/* Stripe o Paddle en los sitios de fuera (`pagamento.exterior`, 05/11/2026). */
const PELO_STRIPE = (empresa.pagamento && empresa.pagamento.exterior) === 'stripe';
import { translitEs } from '../../../tools/translit-es.mjs';

function saudacao(nome) {
  const n = nomeSeguro(nome);
  return n ? `Hola, ${n}:` : 'Hola:';
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * A data em espanhol ("4 de noviembre de 2026"), no mesmo fuso de `dataBR`:
 * o prazo do acesso é contado em Brasília, para todas as contas, e as datas
 * têm de ser o mesmo dia.
 */
export function dataES(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return '';
  const d = new Date(Number(ms) - 3 * 60 * 60 * 1000);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

const contato = suporte => (suporte ? `¿Tienes alguna duda? Responde a este correo o escribe a ${suporte}.` : null);

export function mensagemDeRecuperacao({ nome, link, minutos, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';

  const text = [
    ola,
    '',
    `Alguien pidió restablecer la contraseña de tu cuenta en ${assinatura}.`,
    'Si fuiste tú, usa el enlace de abajo:',
    '',
    link,
    '',
    `El enlace vale por ${minutos} minutos y funciona una sola vez.`,
    '',
    'Si no fuiste tú, puedes ignorar este mensaje. Tu contraseña sigue igual,',
    'y nadie puede cambiarla sin este enlace.',
    '',
    contato(suporte) ?? '',
    '',
    assinatura
  ].join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>Alguien pidió restablecer la contraseña de tu cuenta en ${escapar(assinatura)}.`,
    ' Si fuiste tú, usa el enlace de abajo:</p>',
    `<p><a href="${escapar(link)}">Elegir una contraseña nueva</a></p>`,
    `<p>El enlace vale por ${minutos} minutos y funciona una sola vez.</p>`,
    '<p>Si no fuiste tú, puedes ignorar este mensaje. Tu contraseña sigue',
    ' igual, y nadie puede cambiarla sin este enlace.</p>',
    suporte ? `<p>¿Tienes alguna duda? Escribe a ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Restablece tu contraseña - ${assinatura}`, text, html };
}

/* O parágrafo do fim é o que importa, como no português: este e-mail chega à
   dona do endereço mesmo quando não foi ela quem criou a conta. */
export function mensagemDeConfirmacao({ nome, link, dias, esqueci, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';

  const text = [
    ola,
    '',
    `Se creó una cuenta en ${assinatura} con esta dirección de correo.`,
    'Para confirmar que es tuya, abre el enlace de abajo:',
    '',
    link,
    '',
    `El enlace vale por ${dias} días. Si te pide iniciar sesión, usa el correo`,
    'y la contraseña que elegiste al registrarte.',
    '',
    '¿No creaste esta cuenta? Entonces alguien usó tu dirección.',
    `Puedes recuperarla en ${esqueci}. El enlace de la contraseña nueva llega`,
    'solo a ti, y cambiar la contraseña cierra la sesión de quien creó la cuenta.',
    '',
    contato(suporte) ?? '',
    '',
    assinatura
  ].join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>Se creó una cuenta en ${escapar(assinatura)} con esta dirección de correo.`,
    ' Para confirmar que es tuya, abre el enlace de abajo:</p>',
    `<p><a href="${escapar(link)}">Confirmar mi correo</a></p>`,
    `<p>El enlace vale por ${dias} días. Si te pide iniciar sesión, usa el correo`,
    ' y la contraseña que elegiste al registrarte.</p>',
    '<p><strong>¿No creaste esta cuenta?</strong> Entonces alguien usó tu',
    ` dirección. Puedes recuperarla en <a href="${escapar(esqueci)}">${escapar(esqueci)}</a>.`,
    ' El enlace de la contraseña nueva llega solo a ti, y cambiar la contraseña cierra',
    ' la sesión de quien creó la cuenta.</p>',
    suporte ? `<p>¿Tienes alguna duda? Escribe a ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Confirma tu correo - ${assinatura}`, text, html };
}

export function mensagemDeEstorno({
  nome, curso, valor, pedido, cartao, contestacao = false, restaAte = '', marca, suporte
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const abertura = contestacao
    ? `Tu compra del curso ${curso} fue impugnada ante tu banco o el emisor de tu tarjeta, y el monto fue devuelto.`
    : `El reembolso de tu compra del curso ${curso} está completo.`;
  const acesso = restaAte
    ? `Los meses de esta compra se quitaron de tu acceso, que sigue vigente hasta el ${restaAte}.`
    : 'Tu acceso al curso terminó.';
  const dinheiro = cartao
    ? 'Con tarjeta, el monto aparece en tu estado de cuenta según los plazos del emisor de tu tarjeta.'
    : 'El monto vuelve por el mismo medio de pago.';
  const progresso = 'Tu progreso de estudio queda guardado en tu cuenta, por si algún día vuelves.';

  const text = [
    ola,
    '',
    abertura,
    acesso,
    '',
    '---',
    `Curso: ${curso}`,
    `Monto: ${valor}`,
    `Pedido: ${pedido}`,
    '---',
    '',
    dinheiro,
    progresso,
    '',
    contato(suporte),
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>${escapar(abertura)}</strong> ${escapar(acesso)}</p>`,
    '<hr>',
    `<p>Curso: ${escapar(curso)}<br>`,
    `Monto: ${escapar(valor)}<br>`,
    `Pedido: ${escapar(pedido)}</p>`,
    '<hr>',
    `<p>${escapar(dinheiro)} ${escapar(progresso)}</p>`,
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return {
    subject: contestacao ? `Compra impugnada - ${curso}` : `Reembolso completo - ${curso}`,
    text,
    html
  };
}

/* `marco`: 'd30' | 'd7' | 'fim', como no português. */
export function mensagemDeVencimento({
  nome, curso, quando, dias, marco, meses, renovar, marca, suporte
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const fim = marco === 'fim';
  const faltam = Number(dias) === 1 ? 'mañana' : `en ${dias} días`;
  const abertura = fim
    ? `Tu acceso al curso ${curso} terminó el ${quando}.`
    : `Tu acceso al curso ${curso} termina el ${quando} (${faltam}).`;
  const como = fim
    ? `Para volver a estudiar, renueva por ${meses} meses más: ${renovar}`
    : `Para seguir estudiando, renueva por ${meses} meses más: ${renovar}`;
  const soma = fim
    ? 'Tu progreso queda guardado en tu cuenta y vuelve completo cuando renuevas.'
    : `Renovar antes no te hace perder ni un día: los ${meses} meses se suman al tiempo que te queda.`;
  const semAutomatico = 'No hay renovación automática: no se cobra nada si tú no lo pides.';

  const text = [
    ola,
    '',
    abertura,
    '',
    como,
    soma,
    '',
    semAutomatico,
    '',
    contato(suporte),
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>${escapar(abertura)}</strong></p>`,
    `<p><a href="${escapar(renovar)}">Renovar por ${escapar(meses)} meses más</a></p>`,
    `<p>${escapar(soma)}</p>`,
    `<p>${escapar(semAutomatico)}</p>`,
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  const subject = fim
    ? `Tu acceso terminó - ${curso}`
    : `Tu acceso termina en ${dias} ${Number(dias) === 1 ? 'día' : 'días'} - ${curso}`;
  return { subject, text, html };
}

/* Os três lembretes dos primeiros dias depois da compra (ver ativacao.js). */
export function mensagemDeAtivacao({ nome, curso, marco, concluidas, inicio, primeira, painel, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const feitas = Number(concluidas) || 0;
  const fecho = 'Son solo tres recordatorios como este, en los primeros días después de tu compra.';
  const ajuda = suporte
    ? `Si algo te frenó (entrar en otro dispositivo, por dónde empezar), responde a este mensaje o escribe a ${suporte}.`
    : 'Si algo te frenó (entrar en otro dispositivo, por dónde empezar), responde a este mensaje.';

  let subject; let corpo; let link; let rotulo;
  if (marco === 'd1') {
    subject = 'Tu primera letra toma diez minutos';
    corpo = [
      `Tu acceso al curso ${curso} está listo.`,
      'La forma más fácil de empezar es la Clase 0, que muestra cómo funciona la escritura hebrea, y después la primera letra, Álef, que toma unos diez minutos.'
    ];
    link = inicio; rotulo = 'Empezar por la Clase 0';
  } else if (marco === 'd3') {
    subject = '¿Algo te impide empezar?';
    corpo = [
      `Tu curso ${curso} todavía no tiene ninguna lección terminada.`,
      'A veces lo que frena es algo pequeño. La primera letra es Álef, y con la siguiente, Mem, ya lees tu primera palabra.',
      ajuda
    ];
    link = primeira; rotulo = 'Abrir la primera letra';
  } else {
    subject = feitas > 0 ? 'Sigue donde te quedaste' : '¿Una letra hoy?';
    corpo = feitas > 0
      ? [
          `Terminaste ${feitas} ${feitas === 1 ? 'lección' : 'lecciones'} del curso ${curso}.`,
          'El curso recuerda dónde te quedaste, en este dispositivo y en cualquier otro donde inicies sesión.'
        ]
      : [
          `Ya pasó una semana desde que tu acceso al curso ${curso} quedó listo.`,
          'Una letra a la vez: cada una toma unos diez minutos.',
          ajuda
        ];
    link = feitas > 0 ? painel : primeira; rotulo = feitas > 0 ? 'Continuar el curso' : 'Abrir la primera letra';
  }

  const text = [ola, '', ...corpo.flatMap(l => [l, '']), `${rotulo}: ${link}`, '', fecho, '', assinatura].join('\n');
  const html = [
    `<p>${escapar(ola)}</p>`,
    ...corpo.map(l => `<p>${escapar(l)}</p>`),
    `<p><a href="${escapar(link)}">${escapar(rotulo)}</a></p>`,
    `<p><small>${escapar(fecho)}</small></p>`,
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject, text, html };
}

/* O recibo de compra, com o Paddle. Os mesmos parâmetros de
   `mensagemDeCompra` em lib/mail.js; o site em espanhol, como o inglês, só
   vende o curso. Os 14 dias são os do Paddle (DIAS_PADDLE em api/pay.js). */
export function mensagemDeCompra({
  nome, curso, valor, pedido, expiraEm, link, aula0, marca, suporte, arrependimentoDias, renovacao,
  termos, reembolso, versao, desistir
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const abertura = renovacao
    ? `Tu acceso al curso ${curso} fue renovado.`
    : `Tu acceso al curso ${curso} ya está abierto.`;
  const primeiroPasso = !renovacao && aula0;
  const AULA0 = 'Toma unos diez minutos y no hay nada que memorizar: muestra cómo funciona la ' +
    'escritura hebrea, y después cada letra es mucho más simple.';
  const desistencia = arrependimentoDias
    ? `Tienes ${arrependimentoDias} días desde hoy para cancelar y recibir el 100% de vuelta, sin dar explicaciones.`
    : null;
  const comoDesistir = arrependimentoDias && desistir
    ? `Para cancelar, abre ${desistir} y usa "Cancelar la compra", o responde a este correo.`
    : null;
  const vendedor = PELO_STRIPE
    ? 'El pago lo procesó Stripe, nuestro procesador de pagos.'
    : 'El pago lo procesó Paddle, nuestro revendedor autorizado, por eso el cargo en ' +
      'tu estado de cuenta aparece como Paddle. Paddle también te envía la factura por correo.';

  const text = [
    ola,
    '',
    abertura,
    '',
    primeiroPasso ? 'Tu primer paso: la Clase 0.' : null,
    primeiroPasso ? AULA0 : null,
    primeiroPasso ? '' : null,
    `Empieza aquí: ${primeiroPasso ? aula0 : link}`,
    primeiroPasso ? `Después, todo el curso está en tu panel: ${link}` : null,
    '',
    'Inicia sesión con este mismo correo y la contraseña que elegiste al pagar.',
    'Tu progreso se guarda en tu cuenta, así puedes estudiar en el celular y',
    'seguir en la computadora donde te quedaste.',
    '',
    '---',
    `Curso: ${curso}`,
    `Monto: ${valor}`,
    expiraEm ? `Acceso hasta: ${expiraEm}` : null,
    `Pedido: ${pedido}`,
    '---',
    '',
    vendedor,
    '',
    desistencia,
    comoDesistir,
    desistencia ? '' : null,
    termos ? `Este correo es el comprobante de tu compra. Las condiciones son las de los Términos de Uso y la Política de Reembolso, versión del ${versao || 'día de hoy'}:` : null,
    termos ? `· Términos de Uso: ${termos}` : null,
    reembolso ? `· Política de Reembolso: ${reembolso}` : null,
    termos ? '' : null,
    contato(suporte),
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>${escapar(abertura)}</strong></p>`,
    primeiroPasso
      ? `<p><strong>Tu primer paso: la Clase 0.</strong> ${escapar(AULA0)}</p>` +
        `<p><a href="${escapar(aula0)}">Empezar por la Clase 0</a></p>` +
        `<p>Después, todo el curso está en <a href="${escapar(link)}">tu panel</a>.</p>`
      : `<p><a href="${escapar(link)}">Empieza aquí</a></p>`,
    '<p>Inicia sesión con este mismo correo y la contraseña que elegiste al pagar.',
    ' Tu progreso se guarda en tu cuenta, así puedes estudiar en el celular y seguir en',
    ' la computadora donde te quedaste.</p>',
    '<hr>',
    `<p>Curso: ${escapar(curso)}<br>`,
    `Monto: ${escapar(valor)}<br>`,
    expiraEm ? `Acceso hasta: ${escapar(expiraEm)}<br>` : '',
    `Pedido: ${escapar(pedido)}</p>`,
    '<hr>',
    `<p>${escapar(vendedor)}</p>`,
    desistencia ? `<p>${escapar(desistencia)}${comoDesistir ? ' ' + escapar(comoDesistir) : ''}</p>` : '',
    termos
      ? `<p>Este correo es el comprobante de tu compra. Las condiciones son las de los ` +
        `<a href="${escapar(termos)}">Términos de Uso</a>` +
        (reembolso ? ` y la <a href="${escapar(reembolso)}">Política de Reembolso</a>` : '') +
        `, versión del ${escapar(versao || 'día de hoy')}.</p>`
      : '',
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return {
    subject: renovacao ? `Acceso renovado - ${curso}` : `Tu acceso está abierto - ${curso}`,
    text,
    html
  };
}

/* A confirmação do pedido de desistência, com os mesmos parâmetros de
   `mensagemDeArrependimento` em lib/mail.js. No Paddle o estorno sai
   sozinho; `estornoPedido` diz que ele já foi pedido. */
export function mensagemDeArrependimento({
  nome, curso, valor, pedido, pedidoEm, marca, suporte, estornoPedido = false
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const devolucao = (estornoPedido ? `El reembolso ya se le pidió a ${PELO_STRIPE ? 'Stripe' : 'Paddle'}. ` : '') +
    'Vuelve por el medio de pago que usaste, según los plazos de tu banco o del emisor de tu tarjeta.';
  const fim = 'Tu acceso al curso termina cuando se procesa el reembolso; tu progreso de estudio ' +
    'queda guardado, por si algún día vuelves.';

  const text = [
    ola,
    '',
    `Recibimos tu pedido para cancelar la compra del curso ${curso}, el ${pedidoEm}.`,
    'No necesitas hacer nada más.',
    '',
    '---',
    `Curso: ${curso}`,
    `Monto: ${valor}`,
    `Pedido: ${pedido}`,
    `Cancelación pedida el: ${pedidoEm}`,
    '---',
    '',
    `Devolvemos el 100% del monto. ${devolucao}`,
    fim,
    '',
    contato(suporte),
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>Recibimos tu pedido para cancelar la compra del curso ${escapar(curso)},`,
    ` el ${escapar(pedidoEm)}.</strong> No necesitas hacer nada más.</p>`,
    '<hr>',
    `<p>Curso: ${escapar(curso)}<br>`,
    `Monto: ${escapar(valor)}<br>`,
    `Pedido: ${escapar(pedido)}<br>`,
    `Cancelación pedida el: ${escapar(pedidoEm)}</p>`,
    '<hr>',
    `<p>Devolvemos el 100% del monto. ${escapar(devolucao)} ${escapar(fim)}</p>`,
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Cancelación recibida - ${curso}`, text, html };
}

/* ── a segunda letra e a lista de interessados ─────────────────────────
 * O espelho de mensagemDaSegundaLetra, mensagemDeConfirmacaoDaLista e
 * mensagemDaSequencia, para quem faz o teste grátis do site em espanhol. O
 * data/es/letters.json ainda não tem o Mem e o Tav traduzidos: as frases
 * abaixo são traduzidas à mão da lição em português, seguindo o inglês onde
 * ele foi adaptado (a comparação com o M e o T). Quando a lição em espanhol
 * existir, estas frases têm de bater com ela, palavra por palavra.
 * A transliteração é a do curso, convertida por translitEs.
 */
export const SEGUNDA_LETRA = {
  letra: 'מ', nome: 'Mem', final: 'ם',
  som: 'Igual a la M del español, en "mamá", "mesa", "música". No hay nada nuevo que aprender en el sonido, solo en la forma.',
  silabas: [['מַ', 'ma'], ['מֶ', 'me'], ['מִ', 'mi'], ['מוֹ', 'mo'], ['מוּ', 'mu']].map(([he, t]) => [he, translitEs(t)]),
  palavras: [['מַיִם', 'máyim', 'agua'], ['אִמָא', 'íma', 'mamá']].map(([he, t, es]) => [he, translitEs(t), es]),
  cuidado: 'Lee אֵם con una vocal clara, como la e de "mesa", y cierra de verdad los labios en la M final.',
  fim: 'hace /m/ y se convierte en ם cuando termina la palabra. Misma letra, mismo sonido, otro dibujo.',
  sabia: 'El nombre Mem viene de una palabra semítica muy antigua que quería decir "agua". Es de la misma familia que מַיִם (máyim), la palabra que todavía hoy quiere decir "agua" en hebreo.'
};

export function mensagemDaSegundaLetra({ site, suporte, marca, confirmar }) {
  const L = SEGUNDA_LETRA;
  const assinatura = marca || 'Hebraico Fluente';
  const rodapeTexto = confirmar
    ? ['También pediste recibir las próximas letras y novedades por correo. Para confirmar, abre este enlace y toca "Confirmar":',
       confirmar,
       'Sin la confirmación no enviamos nada más, y la dirección se borra en 7 días. ¿No fuiste tú? Solo ignora este mensaje.']
    : ['Recibiste este correo porque alguien pidió la segunda letra con esta dirección en nuestro sitio. ¿No fuiste tú? Solo ignóralo: no enviaremos nada más, y la dirección no se guarda.'];
  const curso = `${site}/curso-de-hebraico/`;
  const silabas = L.silabas.map(([he, t]) => `${he} ${t}`).join(' · ');
  const palavras = L.palavras.map(([he, t, es]) => `${he} (${t}), "${es}"`).join(' · ');

  const text = [
    'Hola:',
    '',
    'Terminaste la prueba del Álef en nuestro sitio y pediste la segunda letra. Aquí está.',
    '',
    `${L.letra}  ${L.nome}`,
    '',
    `El sonido: ${L.som}`,
    '',
    `Las sílabas: ${silabas}`,
    'Fíjate: las vocales son las mismas que viste con el Álef.',
    '',
    `Dos palabras: ${palavras}`,
    '',
    `Cuidado: ${L.cuidado}`,
    '',
    `Al final de la palabra: ${L.letra} ${L.fim}`,
    '',
    `¿Sabías que...? ${L.sabia}`,
    '',
    'Faltan 20 letras. En el curso, cada una viene así: la voz del profesor, la escritura con el dedo y la corrección al instante.',
    curso,
    '',
    ...rodapeTexto,
    suporte ? `Dudas: ${suporte}` : '',
    '',
    assinatura
  ].join('\n');

  const he = t => `<span dir="rtl" lang="he" style="font-size:1.25em">${escapar(t)}</span>`;
  /* O hebraico no meio de uma frase em espanhol ganha o mesmo span do resto. */
  const comHe = t => escapar(t).replace(/[֐-׿]+/g, m => `<span dir="rtl" lang="he" style="font-size:1.25em">${m}</span>`);
  const html = [
    '<p>Hola:</p>',
    '<p>Terminaste la prueba del Álef en nuestro sitio y pediste la segunda letra. Aquí está.</p>',
    `<p style="font-size:44px;margin:16px 0 4px;text-align:left"><span dir="rtl" lang="he">${escapar(L.letra)}</span></p>`,
    `<p style="margin:0 0 16px"><strong>${escapar(L.nome)}</strong></p>`,
    `<p><strong>El sonido:</strong> ${escapar(L.som)}</p>`,
    `<p><strong>Las sílabas:</strong> ${L.silabas.map(([h, t]) => `${he(h)} ${escapar(t)}`).join(' · ')}<br>`,
    'Fíjate: las vocales son las mismas que viste con el Álef.</p>',
    `<p><strong>Dos palabras:</strong> ${L.palavras.map(([h, t, es]) => `${he(h)} (${escapar(t)}), "${escapar(es)}"`).join(' · ')}</p>`,
    `<p><strong>Cuidado:</strong> ${comHe(L.cuidado)}</p>`,
    `<p><strong>Al final de la palabra:</strong> ${he(L.letra)} ${comHe(L.fim)}</p>`,
    `<p><strong>¿Sabías que...?</strong> ${comHe(L.sabia)}</p>`,
    '<p>Faltan 20 letras. En el curso, cada una viene así: la voz del profesor, la escritura con el dedo y la corrección al instante.</p>',
    `<p><a href="${escapar(curso)}">Ver el curso completo</a></p>`,
    confirmar
      ? '<p>También pediste recibir las próximas letras y novedades por correo.</p>' +
        `<p><a href="${escapar(confirmar)}"><strong>Confirmar tu suscripción</strong></a></p>` +
        '<p style="color:#666;font-size:13px">Sin la confirmación no enviamos nada más, y la dirección se borra en 7 días. ¿No fuiste tú? Solo ignora este mensaje.'
      : '<p style="color:#666;font-size:13px">Recibiste este correo porque alguien pidió la segunda letra con esta dirección en nuestro sitio.' +
        ' ¿No fuiste tú? Solo ignóralo: no enviaremos nada más, y la dirección no se guarda.',
    suporte ? ` Dudas: ${escapar(suporte)}` : '',
    '</p>',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `La segunda letra: ${L.nome} (${L.letra}) - ${assinatura}`, text, html };
}

/** O que cada interesse quer receber. O site em espanhol só tem o curso. */
export const INTERESSE_ES = {
  curso: 'las próximas letras del alfabeto y novedades del curso'
};

export function mensagemDeConfirmacaoDaLista({ interesses, confirmar, suporte, marca }) {
  const assinatura = marca || 'Hebraico Fluente';
  const oQue = (interesses || []).map(i => INTERESSE_ES[i]).filter(Boolean).join('; ') || 'nuestras novedades';
  const text = [
    'Hola:',
    '',
    `Alguien pidió, en el sitio de ${assinatura}, recibir en esta dirección: ${oQue}.`,
    '',
    'Para confirmar, abre este enlace y toca "Confirmar":',
    confirmar,
    '',
    'Sin la confirmación no enviamos nada más, y la dirección se borra en 7 días. ¿No fuiste tú? Solo ignora este mensaje.',
    suporte ? `Dudas: ${suporte}` : '',
    '',
    assinatura
  ].join('\n');
  const html = [
    '<p>Hola:</p>',
    `<p>Alguien pidió, en el sitio de ${escapar(assinatura)}, recibir en esta dirección: ${escapar(oQue)}.</p>`,
    `<p><a href="${escapar(confirmar)}"><strong>Confirmar tu suscripción</strong></a></p>`,
    '<p style="color:#666;font-size:13px">Sin la confirmación no enviamos nada más, y la dirección se borra en 7 días. ¿No fuiste tú? Solo ignora este mensaje.',
    suporte ? ` Dudas: ${escapar(suporte)}` : '',
    '</p>',
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject: `Confirma tu suscripción - ${assinatura}`, text, html };
}

/* A sequência: os cinco e-mails depois do Mem. O preço sai do catálogo
   (price.usd), e o prazo de desistência é o do Paddle. */
export const TERCEIRA_LETRA = {
  letra: 'ת', nome: 'Tav',
  som: 'Como la T de "tomate": siempre seca, nunca con sonido de CH.',
  silabas: [['תַ', 'ta'], ['תֶ', 'te'], ['תִ', 'ti'], ['תוֹ', 'to'], ['תוּ', 'tu']].map(([he, t]) => [he, translitEs(t)]),
  palavra: ['אֶמֶת', translitEs('émet'), 'verdad']
};

export const ASSUNTOS_DA_SEQUENCIA = [
  'La tercera letra: Tav (ת)',
  'Por qué una letra a la vez',
  '¿Puedo leer la Biblia después del curso?',
  'Cómo es una lección por dentro',
  'Si quieres seguir: el curso completo'
];

export function mensagemDaSequencia({ passo, site, sair, preco, suporte, marca }) {
  const assinatura = marca || 'Hebraico Fluente';
  const curso = `${site}/curso-de-hebraico/`;
  const T = TERCEIRA_LETRA;
  const he = t => `<span dir="rtl" lang="he" style="font-size:1.25em">${escapar(t)}</span>`;
  let blocos;
  if (passo === 1) {
    blocos = [
      ['La tercera letra del curso es la Tav.', null],
      [`${T.letra}  ${T.nome}`, `<p style="font-size:44px;margin:16px 0 4px"><span dir="rtl" lang="he">${escapar(T.letra)}</span></p><p style="margin:0 0 16px"><strong>${escapar(T.nome)}</strong></p>`],
      [`El sonido: ${T.som}`, null],
      [`Las sílabas: ${T.silabas.map(([h, t]) => `${h} ${t}`).join(' · ')}`,
       `<p><strong>Las sílabas:</strong> ${T.silabas.map(([h, t]) => `${he(h)} ${escapar(t)}`).join(' · ')}</p>`],
      [`Con Álef, Mem y Tav ya puedes leer: ${T.palavra[0]} (${T.palavra[1]}), "${T.palavra[2]}".`,
       `<p>Con Álef, Mem y Tav ya puedes leer: ${he(T.palavra[0])} (${escapar(T.palavra[1])}), "${escapar(T.palavra[2])}".</p>`],
      ['¿Sabías que...? La Tav es la última letra del alfabeto. Por eso, en hebreo, la forma de decir "de la A a la Z" es "de Álef a Tav".', null],
      [`En el curso, la siguiente es la Nun. Una letra a la vez: ${curso}`,
       `<p>En el curso, la siguiente es la Nun. Una letra a la vez: <a href="${escapar(curso)}">ver el curso</a>.</p>`]
    ];
  } else if (passo === 2) {
    blocos = [
      ['En el curso conoces una letra, practicas con ella y solo entonces sigues. Todo el alfabeto en pantalla el primer día no enseña: asusta.', null],
      ['La transliteración ayuda al principio, pero el objetivo nunca fue que dependas de ella. Va disminuyendo a medida que avanzas, hasta que lees directo del hebreo.', null],
      ['El orden en que entran las letras sigue el método Ba Li Ivrit, del Dr. Damián Dzienciarsky. Los ejercicios, las explicaciones y la escritura cursiva son del propio profesor.', null],
      [`Cómo se pensó el curso: ${site}/metodo/`, `<p><a href="${escapar(`${site}/metodo/`)}">Cómo se pensó el curso</a></p>`]
    ];
  } else if (passo === 3) {
    blocos = [
      ['Es la pregunta que más recibimos. La respuesta corta: sí a leer, no a entender.', null],
      ['Leer: el texto hebreo de la Biblia que se usa hoy viene con los signos de vocal, el nikud. Son exactamente las 22 letras y los signos que enseña el curso. Con ellos puedes leer en voz alta cualquier versículo, sin transliteración.', null],
      ['Entender: eso pide vocabulario y gramática, y el hebreo bíblico tiene construcciones que el hebreo moderno no usa. Este es un curso de lectura: te da la puerta, no la casa.', null],
      [`La respuesta completa, con las primeras siete palabras de la Biblia para que las escuches: ${site}/biblia/`,
       `<p><a href="${escapar(`${site}/biblia/`)}">La respuesta completa, con las primeras siete palabras de la Biblia</a></p>`]
    ];
  } else if (passo === 4) {
    const etapas = [
      ['Conocer', 'la forma, el nombre y el sonido de la letra, con el audio del profesor y una explicación en español.'],
      ['Palabras', 'palabras reales para leer, hechas solo con letras que ya aprendiste.'],
      ['Escribir', 'la letra en cursiva, trazada con el dedo en el orden correcto de los trazos.'],
      ['Reforzar', 'escuchar, mirar y recordar la letra, con apoyo en cada paso y sin nota.'],
      ['Ejercicios', 'ejercicios variados, con nota y corregidos al momento. Lo que fallas vuelve después, en el repaso.']
    ];
    blocos = [
      ['Cada letra del curso tiene una lección en cinco pasos:', null],
      ...etapas.map(([n, d]) => [`${n}: ${d}`, `<p><strong>${escapar(n)}:</strong> ${escapar(d)}</p>`]),
      [`Para ver una por dentro, la prueba gratis del Álef sigue los mismos pasos: ${curso}#experimente`,
       `<p>Para ver una por dentro, <a href="${escapar(`${curso}#experimente`)}">la prueba gratis del Álef</a> sigue los mismos pasos.</p>`]
    ];
  } else {
    const p = preco || {};
    const linhas = [
      p.usd ? `El curso cuesta US$ ${p.usd}, en un solo pago, sin suscripción.` : null,
      `Tienes ${p.meses || 12} meses de acceso, y ${p.desistir || 14} días para cancelar y recibir el 100% de vuelta, sin preguntas.`
    ].filter(Boolean);
    blocos = [
      ['Este es el último correo de esta serie. Si las letras que viste aquí tuvieron sentido, el curso sigue igual: una letra a la vez, hasta las 22 y los signos de vocal.', null],
      ...linhas.map(l => [l, null]),
      [`Empieza: ${curso}`, `<p><a href="${escapar(curso)}"><strong>Ver el curso y empezar</strong></a></p>`],
      ['Después de este, solo escribimos cuando hay una novedad de verdad, como un curso nuevo.', null]
    ];
  }
  const rodape = `Recibes este correo porque pediste las próximas letras en el sitio de ${assinatura}. Para salir de la lista: ${sair}`;
  const text = ['Hola:', '', ...blocos.flatMap(([t]) => [t, '']), suporte ? `¿Dudas? Responde a este correo o escribe a ${suporte}.` : '', '', assinatura, '', rodape].join('\n');
  const html = [
    '<p>Hola:</p>',
    ...blocos.map(([t, h]) => h || `<p>${escapar(t)}</p>`),
    suporte ? `<p>¿Dudas? Responde a este correo o escribe a ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`,
    `<p style="color:#666;font-size:13px">Recibes este correo porque pediste las próximas letras en el sitio de ${escapar(assinatura)}. <a href="${escapar(sair)}">Salir de la lista</a>.</p>`
  ].join('');
  return { subject: ASSUNTOS_DA_SEQUENCIA[passo - 1] || ASSUNTOS_DA_SEQUENCIA[0], text, html };
}

/** O lembrete para estudar (worker/src/lembrete.js); ver a versão em português. */
export function mensagemDeLembrete({ nome, painel, praticar, sair, marca }) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const subject = '¿Diez minutos de hebreo hoy?';
  const corpo = [
    'Hoy todavía no hubo hebreo. Una letra toma unos diez minutos, y el curso guarda dónde te quedaste.',
    `Si el día está corto, una ronda en Practicar también cuenta: ${praticar}`
  ];
  const rotulo = 'Seguir donde me quedé';
  const fecho = 'Recibes este correo porque pediste el recordatorio en Tu cuenta. Después de tres recordatorios sin estudio, se detienen solos hasta que vuelvas.';
  const saida = `Para dejar de recibirlo: ${sair}`;
  const text = [ola, '', ...corpo.flatMap(l => [l, '']), `${rotulo}: ${painel}`, '', fecho, saida, '', assinatura].join('\n');
  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>${escapar(corpo[0])}</p>`,
    `<p>Si el día está corto, <a href="${escapar(praticar)}">una ronda en Practicar</a> también cuenta.</p>`,
    `<p><a href="${escapar(painel)}">${escapar(rotulo)}</a></p>`,
    `<p><small>${escapar(fecho)} <a href="${escapar(sair)}">Detener el recordatorio</a>.</small></p>`,
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject, text, html };
}

/* O mesmo objeto com o nome do inglês, para quem escolhe pelo nome
   (lib/mensagens.js e os testes que comparam os dois arquivos). */
export { INTERESSE_ES as INTERESSE_EN };

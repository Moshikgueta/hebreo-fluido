/* Os e-mails ao aluno, em inglês (site em inglês, PLANO-INGLES.md).
 * ─────────────────────────────────────────────────────────────────────────
 * O espelho de lib/mail.js para as contas do site em inglês: mesmas funções,
 * mesmos parâmetros, mesma forma de saída ({ subject, text, html }), as mesmas
 * regras de lá (texto curto, sem imagem, nome só quando é nome, HTML
 * escapado). Quem escolhe entre os dois é lib/mensagens.js.
 *
 * O recibo de compra e a confirmação da desistência entraram com o Paddle
 * (etapa 5), no fim do arquivo. Ficam de fora os e-mails de propaganda
 * (etapa 7).
 *
 * Primeira versão escrita pelo Claude; a revisão por nativos é a etapa 4.
 */

import { MARCA } from './idioma.js';
import { nomeSeguro } from './nome.js';
import { escapar } from './mail.js';

function saudacao(nome) {
  const n = nomeSeguro(nome);
  return n ? `Hi ${n},` : 'Hi,';
}

const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/**
 * A data em inglês ("October 28, 2026"), no mesmo fuso de `dataBR`: o prazo
 * do acesso é contado em Brasília, para as duas contas, e as duas datas têm
 * de ser o mesmo dia.
 */
export function dataEN(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return '';
  const d = new Date(Number(ms) - 3 * 60 * 60 * 1000);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const contato = suporte => (suporte ? `Any questions? Just reply to this email or write to ${suporte}.` : null);

export function mensagemDeRecuperacao({ nome, link, minutos, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || MARCA.en;

  const text = [
    ola,
    '',
    `Someone asked to reset the password for your ${assinatura} account.`,
    'If that was you, use the link below:',
    '',
    link,
    '',
    `The link is valid for ${minutos} minutes and works only once.`,
    '',
    'If it was not you, you can ignore this message. Your password stays the same,',
    'and no one can change it without this link.',
    '',
    contato(suporte) ?? '',
    '',
    assinatura
  ].join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>Someone asked to reset the password for your ${escapar(assinatura)} account.`,
    ' If that was you, use the link below:</p>',
    `<p><a href="${escapar(link)}">Choose a new password</a></p>`,
    `<p>The link is valid for ${minutos} minutes and works only once.</p>`,
    '<p>If it was not you, you can ignore this message. Your password stays the',
    ' same, and no one can change it without this link.</p>',
    suporte ? `<p>Any questions? Write to ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Reset your password - ${assinatura}`, text, html };
}

/* O parágrafo do fim é o que importa, como no português: este e-mail chega à
   dona do endereço mesmo quando não foi ela quem criou a conta. */
export function mensagemDeConfirmacao({ nome, link, dias, esqueci, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || MARCA.en;

  const text = [
    ola,
    '',
    `A ${assinatura} account was created with this email address.`,
    'To confirm that it is yours, open the link below:',
    '',
    link,
    '',
    `The link is valid for ${dias} days. If it asks you to sign in, use the email`,
    'and password you chose when you signed up.',
    '',
    'Did not create this account? Then someone used your address.',
    `You can take it back at ${esqueci}. The new-password link goes only`,
    'to you, and changing the password signs out whoever created the account.',
    '',
    contato(suporte) ?? '',
    '',
    assinatura
  ].join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>A ${escapar(assinatura)} account was created with this email address.`,
    ' To confirm that it is yours, open the link below:</p>',
    `<p><a href="${escapar(link)}">Confirm my email</a></p>`,
    `<p>The link is valid for ${dias} days. If it asks you to sign in, use the email`,
    ' and password you chose when you signed up.</p>',
    '<p><strong>Did not create this account?</strong> Then someone used your',
    ` address. You can take it back at <a href="${escapar(esqueci)}">${escapar(esqueci)}</a>.`,
    ' The new-password link goes only to you, and changing the password signs out',
    ' whoever created the account.</p>',
    suporte ? `<p>Any questions? Write to ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Confirm your email - ${assinatura}`, text, html };
}

export function mensagemDeEstorno({
  nome, curso, valor, pedido, cartao, contestacao = false, restaAte = '', marca, suporte
}) {
  const ola = saudacao(nome);
  const assinatura = marca || MARCA.en;
  const abertura = contestacao
    ? `Your purchase of the course ${curso} was disputed with your bank or card issuer, and the amount has been returned.`
    : `The refund for your purchase of the course ${curso} is complete.`;
  const acesso = restaAte
    ? `The months from this purchase are removed from your access, which stays valid until ${restaAte}.`
    : 'Your access to the course has ended.';
  const dinheiro = cartao
    ? 'On a card, the amount shows up on your statement according to your card issuer\'s timeline.'
    : 'The amount goes back through the same payment method.';
  const progresso = 'Your study progress stays saved in your account, in case you come back one day.';

  const text = [
    ola,
    '',
    abertura,
    acesso,
    '',
    '---',
    `Course: ${curso}`,
    `Amount: ${valor}`,
    `Order: ${pedido}`,
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
    `<p>Course: ${escapar(curso)}<br>`,
    `Amount: ${escapar(valor)}<br>`,
    `Order: ${escapar(pedido)}</p>`,
    '<hr>',
    `<p>${escapar(dinheiro)} ${escapar(progresso)}</p>`,
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return {
    subject: contestacao ? `Purchase disputed - ${curso}` : `Refund complete - ${curso}`,
    text,
    html
  };
}

/* `marco`: 'd30' | 'd7' | 'fim', como no português. */
export function mensagemDeVencimento({
  nome, curso, quando, dias, marco, meses, renovar, marca, suporte
}) {
  const ola = saudacao(nome);
  const assinatura = marca || MARCA.en;
  const fim = marco === 'fim';
  const faltam = Number(dias) === 1 ? 'tomorrow' : `in ${dias} days`;
  const abertura = fim
    ? `Your access to the course ${curso} ended on ${quando}.`
    : `Your access to the course ${curso} ends on ${quando} (${faltam}).`;
  const como = fim
    ? `To start studying again, renew for ${meses} more months: ${renovar}`
    : `To keep studying, renew for ${meses} more months: ${renovar}`;
  const soma = fim
    ? 'Your progress stays saved in your account and comes back in full when you renew.'
    : `Renewing early does not lose a single day: the ${meses} months are added to the time you have left.`;
  const semAutomatico = 'There is no automatic renewal: nothing is charged unless you ask for it.';

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
    `<p><a href="${escapar(renovar)}">Renew for ${escapar(meses)} more months</a></p>`,
    `<p>${escapar(soma)}</p>`,
    `<p>${escapar(semAutomatico)}</p>`,
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  const subject = fim
    ? `Your access has ended - ${curso}`
    : `Your access ends in ${dias} ${Number(dias) === 1 ? 'day' : 'days'} - ${curso}`;
  return { subject, text, html };
}

/* Os três lembretes dos primeiros dias depois da compra (ver ativacao.js). */
export function mensagemDeAtivacao({ nome, curso, marco, concluidas, inicio, primeira, painel, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || MARCA.en;
  const feitas = Number(concluidas) || 0;
  const fecho = 'There are only three of these reminders, in the first days after your purchase.';
  const ajuda = suporte
    ? `If something got in the way (signing in on another device, where to start), reply to this message or write to ${suporte}.`
    : 'If something got in the way (signing in on another device, where to start), reply to this message.';

  let subject; let corpo; let link; let rotulo;
  if (marco === 'd1') {
    subject = 'Your first letter takes ten minutes';
    corpo = [
      `Your access to the course ${curso} is ready.`,
      'The easiest way to start is Lesson 0, which shows how Hebrew writing works, and then the first letter, Alef, which takes about ten minutes.'
    ];
    link = inicio; rotulo = 'Start with Lesson 0';
  } else if (marco === 'd3') {
    subject = 'Anything holding you back from starting?';
    corpo = [
      `Your course ${curso} does not have a finished lesson yet.`,
      'Sometimes what holds us back is something small. The first letter is Alef, and with the next one, Mem, you already read your first word.',
      ajuda
    ];
    link = primeira; rotulo = 'Open the first letter';
  } else {
    subject = feitas > 0 ? 'Pick up where you left off' : 'One letter today?';
    corpo = feitas > 0
      ? [
          `You have finished ${feitas} ${feitas === 1 ? 'lesson' : 'lessons'} of the course ${curso}.`,
          'The course remembers where you stopped, on this device and on any other device where you sign in.'
        ]
      : [
          `It has been a week since your access to the course ${curso} was ready.`,
          'One letter at a time: each one takes about ten minutes.',
          ajuda
        ];
    link = feitas > 0 ? painel : primeira; rotulo = feitas > 0 ? 'Continue the course' : 'Open the first letter';
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

/* O recibo de compra (etapa 5, com o Paddle). Os mesmos parâmetros de
   `mensagemDeCompra` em lib/mail.js; o site em inglês só vende o curso, então
   o e-book e o pacote ficam de fora. Os 14 dias são os do Paddle (DIAS_PADDLE
   em api/pay.js); o texto da política em inglês é a etapa 6. */
export function mensagemDeCompra({
  nome, curso, valor, pedido, expiraEm, link, aula0, marca, suporte, arrependimentoDias, renovacao,
  termos, reembolso, versao, desistir
}) {
  const ola = saudacao(nome);
  const assinatura = marca || MARCA.en;
  const abertura = renovacao
    ? `Your access to the course ${curso} has been renewed.`
    : `Your access to the course ${curso} is now open.`;
  const primeiroPasso = !renovacao && aula0;
  const AULA0 = 'It takes about ten minutes, with nothing to memorize: it shows how Hebrew ' +
    'writing works, and after that every letter is much simpler.';
  const desistencia = arrependimentoDias
    ? `You have ${arrependimentoDias} days from today to cancel and get 100% back, no reason needed.`
    : null;
  const comoDesistir = arrependimentoDias && desistir
    ? `To cancel, open ${desistir} and use "Cancel the purchase", or reply to this email.`
    : null;
  const vendedor = 'The payment was processed by Paddle, our authorized reseller, so the charge on ' +
    'your statement shows Paddle. Paddle also emails you the invoice.';

  const text = [
    ola,
    '',
    abertura,
    '',
    primeiroPasso ? 'Your first step: Lesson 0.' : null,
    primeiroPasso ? AULA0 : null,
    primeiroPasso ? '' : null,
    `Start here: ${primeiroPasso ? aula0 : link}`,
    primeiroPasso ? `After that, the whole course is on your dashboard: ${link}` : null,
    '',
    'Sign in with this same email address and the password you chose at checkout.',
    'Your progress is saved in your account, so you can study on your phone and',
    'pick up on your computer where you left off.',
    '',
    '---',
    `Course: ${curso}`,
    `Amount: ${valor}`,
    expiraEm ? `Access until: ${expiraEm}` : null,
    `Order: ${pedido}`,
    '---',
    '',
    vendedor,
    '',
    desistencia,
    comoDesistir,
    desistencia ? '' : null,
    termos ? `This email is your purchase receipt. The terms for it are the Terms of Use and the Refund Policy, version of ${versao || 'today'}:` : null,
    termos ? `· Terms of Use: ${termos}` : null,
    reembolso ? `· Refund Policy: ${reembolso}` : null,
    termos ? '' : null,
    contato(suporte),
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>${escapar(abertura)}</strong></p>`,
    primeiroPasso
      ? `<p><strong>Your first step: Lesson 0.</strong> ${escapar(AULA0)}</p>` +
        `<p><a href="${escapar(aula0)}">Start with Lesson 0</a></p>` +
        `<p>After that, the whole course is on <a href="${escapar(link)}">your dashboard</a>.</p>`
      : `<p><a href="${escapar(link)}">Start here</a></p>`,
    '<p>Sign in with this same email address and the password you chose at checkout.',
    ' Your progress is saved in your account, so you can study on your phone and pick up on',
    ' your computer where you left off.</p>',
    '<hr>',
    `<p>Course: ${escapar(curso)}<br>`,
    `Amount: ${escapar(valor)}<br>`,
    expiraEm ? `Access until: ${escapar(expiraEm)}<br>` : '',
    `Order: ${escapar(pedido)}</p>`,
    '<hr>',
    `<p>${escapar(vendedor)}</p>`,
    desistencia ? `<p>${escapar(desistencia)}${comoDesistir ? ' ' + escapar(comoDesistir) : ''}</p>` : '',
    termos
      ? `<p>This email is your purchase receipt. The terms for it are the ` +
        `<a href="${escapar(termos)}">Terms of Use</a>` +
        (reembolso ? ` and the <a href="${escapar(reembolso)}">Refund Policy</a>` : '') +
        `, version of ${escapar(versao || 'today')}.</p>`
      : '',
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return {
    subject: renovacao ? `Access renewed - ${curso}` : `Your access is open - ${curso}`,
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
  const assinatura = marca || MARCA.en;
  const devolucao = (estornoPedido ? 'The refund has already been requested from Paddle. ' : '') +
    'It goes back through the payment method you used, on your bank\'s or card issuer\'s timeline.';
  const fim = 'Your access to the course ends when the refund is processed; your study progress ' +
    'stays saved, in case you come back one day.';

  const text = [
    ola,
    '',
    `We received your request to cancel your purchase of the course ${curso}, on ${pedidoEm}.`,
    'You do not need to do anything else.',
    '',
    '---',
    `Course: ${curso}`,
    `Amount: ${valor}`,
    `Order: ${pedido}`,
    `Cancellation requested on: ${pedidoEm}`,
    '---',
    '',
    `We refund 100% of the amount. ${devolucao}`,
    fim,
    '',
    contato(suporte),
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>We received your request to cancel your purchase of the course ${escapar(curso)},`,
    ` on ${escapar(pedidoEm)}.</strong> You do not need to do anything else.</p>`,
    '<hr>',
    `<p>Course: ${escapar(curso)}<br>`,
    `Amount: ${escapar(valor)}<br>`,
    `Order: ${escapar(pedido)}<br>`,
    `Cancellation requested on: ${escapar(pedidoEm)}</p>`,
    '<hr>',
    `<p>We refund 100% of the amount. ${escapar(devolucao)} ${escapar(fim)}</p>`,
    suporte ? `<p>${escapar(contato(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Cancellation received - ${curso}`, text, html };
}

/* ── a segunda letra e a lista de interessados (etapa 7) ───────────────
 * O espelho de mensagemDaSegundaLetra, mensagemDeConfirmacaoDaLista e
 * mensagemDaSequencia (lib/mail.js), para quem faz o teste grátis do site em
 * inglês. Antes daqui, quem pedia a segunda letra no site em inglês recebia o
 * Mem explicado para brasileiros. O conteúdo sai da lição em inglês
 * (data/en/letters.json, `mem` e `tav`), e tests/segunda-letra.test.ts confere
 * cada frase contra ela. A transliteração é a do site em inglês (sem acento).
 */
export const SEGUNDA_LETRA = {
  letra: 'מ', nome: 'Mem', final: 'ם',
  som: 'Just like the English M, in "mother", "map", "music". There is nothing new to learn about the sound - only the shape.',
  silabas: [['מַ', 'ma'], ['מֶ', 'me'], ['מִ', 'mi'], ['מוֹ', 'mo'], ['מוּ', 'mu']],
  palavras: [['מַיִם', 'mayim', 'water'], ['אִמָא', 'ima', 'mother']],
  cuidado: 'Read אֵם with a clear vowel, like the e in "bed", and really close your lips on the final M.',
  fim: 'makes /m/ and becomes ם when it ends the word. Same letter, same sound, different shape.',
  sabia: 'The name Mem comes from a very old Semitic word that meant "water". It belongs to the same family as מַיִם (mayim), the word that still means "water" in Hebrew today.'
};

export function mensagemDaSegundaLetra({ site, suporte, marca, confirmar }) {
  const L = SEGUNDA_LETRA;
  const assinatura = marca || MARCA.en;
  const rodapeTexto = confirmar
    ? ['You also asked to receive the next letters and news by email. To confirm, open this link and tap "Confirm":',
       confirmar,
       'Without confirmation we send nothing else, and the address is deleted in 7 days. Not you? Just ignore this.']
    : ['You received this email because someone asked for the second letter with this address on our site. Not you? Just ignore it: we will not send anything else, and the address is not kept.'];
  const curso = `${site}/curso-de-hebraico/`;
  const silabas = L.silabas.map(([he, t]) => `${he} ${t}`).join(' · ');
  const palavras = L.palavras.map(([he, t, en]) => `${he} (${t}), "${en}"`).join(' · ');

  const text = [
    'Hi,',
    '',
    'You finished the Alef test on our site and asked for the second letter. Here it is.',
    '',
    `${L.letra}  ${L.nome}`,
    '',
    `The sound: ${L.som}`,
    '',
    `The syllables: ${silabas}`,
    'Notice: the vowels are the same ones you saw with Alef.',
    '',
    `Two words: ${palavras}`,
    '',
    `Watch out: ${L.cuidado}`,
    '',
    `At the end of a word: ${L.letra} ${L.fim}`,
    '',
    `Did you know? ${L.sabia}`,
    '',
    '20 letters to go. In the course, each one comes like this: the teacher\'s voice, writing with your finger and instant feedback.',
    curso,
    '',
    ...rodapeTexto,
    suporte ? `Questions: ${suporte}` : '',
    '',
    assinatura
  ].join('\n');

  const he = t => `<span dir="rtl" lang="he" style="font-size:1.25em">${escapar(t)}</span>`;
  /* O hebraico no meio de uma frase em inglês ganha o mesmo span do resto. */
  const comHe = t => escapar(t).replace(/[֐-׿]+/g, m => `<span dir="rtl" lang="he" style="font-size:1.25em">${m}</span>`);
  const html = [
    '<p>Hi,</p>',
    '<p>You finished the Alef test on our site and asked for the second letter. Here it is.</p>',
    `<p style="font-size:44px;margin:16px 0 4px;text-align:left"><span dir="rtl" lang="he">${escapar(L.letra)}</span></p>`,
    `<p style="margin:0 0 16px"><strong>${escapar(L.nome)}</strong></p>`,
    `<p><strong>The sound:</strong> ${escapar(L.som)}</p>`,
    `<p><strong>The syllables:</strong> ${L.silabas.map(([h, t]) => `${he(h)} ${escapar(t)}`).join(' · ')}<br>`,
    'Notice: the vowels are the same ones you saw with Alef.</p>',
    `<p><strong>Two words:</strong> ${L.palavras.map(([h, t, en]) => `${he(h)} (${escapar(t)}), "${escapar(en)}"`).join(' · ')}</p>`,
    `<p><strong>Watch out:</strong> ${comHe(L.cuidado)}</p>`,
    `<p><strong>At the end of a word:</strong> ${he(L.letra)} ${comHe(L.fim)}</p>`,
    `<p><strong>Did you know?</strong> ${comHe(L.sabia)}</p>`,
    '<p>20 letters to go. In the course, each one comes like this: the teacher\'s voice, writing with your finger and instant feedback.</p>',
    `<p><a href="${escapar(curso)}">See the full course</a></p>`,
    confirmar
      ? '<p>You also asked to receive the next letters and news by email.</p>' +
        `<p><a href="${escapar(confirmar)}"><strong>Confirm your subscription</strong></a></p>` +
        '<p style="color:#666;font-size:13px">Without confirmation we send nothing else, and the address is deleted in 7 days. Not you? Just ignore this.'
      : '<p style="color:#666;font-size:13px">You received this email because someone asked for the second letter with this address on our site.' +
        ' Not you? Just ignore it: we will not send anything else, and the address is not kept.',
    suporte ? ` Questions: ${escapar(suporte)}` : '',
    '</p>',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `The second letter: ${L.nome} (${L.letra}) - ${assinatura}`, text, html };
}

/** O que cada interesse quer receber. O site em inglês só tem o curso. */
export const INTERESSE_EN = {
  curso: 'the next letters of the alphabet and news about the course'
};

export function mensagemDeConfirmacaoDaLista({ interesses, confirmar, suporte, marca }) {
  const assinatura = marca || MARCA.en;
  const oQue = (interesses || []).map(i => INTERESSE_EN[i]).filter(Boolean).join('; ') || 'our news';
  const text = [
    'Hi,',
    '',
    `Someone asked, on the ${assinatura} site, to receive at this address: ${oQue}.`,
    '',
    'To confirm, open this link and tap "Confirm":',
    confirmar,
    '',
    'Without confirmation we send nothing else, and the address is deleted in 7 days. Not you? Just ignore this.',
    suporte ? `Questions: ${suporte}` : '',
    '',
    assinatura
  ].join('\n');
  const html = [
    '<p>Hi,</p>',
    `<p>Someone asked, on the ${escapar(assinatura)} site, to receive at this address: ${escapar(oQue)}.</p>`,
    `<p><a href="${escapar(confirmar)}"><strong>Confirm your subscription</strong></a></p>`,
    '<p style="color:#666;font-size:13px">Without confirmation we send nothing else, and the address is deleted in 7 days. Not you? Just ignore this.',
    suporte ? ` Questions: ${escapar(suporte)}` : '',
    '</p>',
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject: `Confirm your subscription - ${assinatura}`, text, html };
}

/* A sequência: os cinco e-mails depois do Mem. O Tav e a palavra saem da
   lição em inglês; o preço, do catálogo (price.usd), e o prazo de
   desistência é o do Paddle. */
export const TERCEIRA_LETRA = {
  letra: 'ת', nome: 'Tav',
  som: 'Like the T in "stop" - always crisp, never with a CH sound.',
  silabas: [['תַ', 'ta'], ['תֶ', 'te'], ['תִ', 'ti'], ['תוֹ', 'to'], ['תוּ', 'tu']],
  palavra: ['אֶמֶת', 'emet', 'truth']
};

export const ASSUNTOS_DA_SEQUENCIA = [
  'The third letter: Tav (ת)',
  'Why one letter at a time',
  'Can I read the Bible after the course?',
  'What a lesson looks like inside',
  'If you want to keep going: the full course'
];

export function mensagemDaSequencia({ passo, site, sair, preco, suporte, marca }) {
  const assinatura = marca || MARCA.en;
  const curso = `${site}/curso-de-hebraico/`;
  const T = TERCEIRA_LETRA;
  const he = t => `<span dir="rtl" lang="he" style="font-size:1.25em">${escapar(t)}</span>`;
  let blocos;
  if (passo === 1) {
    blocos = [
      ['The third letter in the course is Tav.', null],
      [`${T.letra}  ${T.nome}`, `<p style="font-size:44px;margin:16px 0 4px"><span dir="rtl" lang="he">${escapar(T.letra)}</span></p><p style="margin:0 0 16px"><strong>${escapar(T.nome)}</strong></p>`],
      [`The sound: ${T.som}`, null],
      [`The syllables: ${T.silabas.map(([h, t]) => `${h} ${t}`).join(' · ')}`,
       `<p><strong>The syllables:</strong> ${T.silabas.map(([h, t]) => `${he(h)} ${escapar(t)}`).join(' · ')}</p>`],
      [`With Alef, Mem and Tav you can already read: ${T.palavra[0]} (${T.palavra[1]}), "${T.palavra[2]}".`,
       `<p>With Alef, Mem and Tav you can already read: ${he(T.palavra[0])} (${escapar(T.palavra[1])}), "${escapar(T.palavra[2])}".</p>`],
      ['Did you know? Tav is the last letter of the alphabet. That is why the Hebrew way to say "from A to Z" is "from Alef to Tav".', null],
      [`In the course, the next one is Nun. One letter at a time: ${curso}`,
       `<p>In the course, the next one is Nun. One letter at a time: <a href="${escapar(curso)}">see the course</a>.</p>`]
    ];
  } else if (passo === 2) {
    blocos = [
      ['In the course, you meet a letter, practice with it and only then move on. The whole alphabet on screen on day one does not teach: it scares.', null],
      ['Transliteration helps at the start, but the goal was never for you to depend on it. It fades as you progress, until you read straight from the Hebrew.', null],
      ['The order in which the letters come in follows the Ba Li Ivrit method by Dr. Damián Dzienciarsky. The exercises, the explanations and the cursive writing are the teacher\'s own.', null],
      [`How the course was designed: ${site}/metodo/`, `<p><a href="${escapar(`${site}/metodo/`)}">How the course was designed</a></p>`]
    ];
  } else if (passo === 3) {
    blocos = [
      ['It is the question we get most. The short answer: yes to reading, no to understanding.', null],
      ['Reading: the Hebrew Bible text used today comes with the vowel signs, the nikud. They are exactly the 22 letters and the signs the course teaches. With them you can read any verse aloud, without transliteration.', null],
      ['Understanding: that takes vocabulary and grammar, and biblical Hebrew has constructions that modern Hebrew does not use. This is a reading course: it gives you the door, not the house.', null],
      [`The full answer, with the first seven words of the Bible for you to play: ${site}/biblia/`,
       `<p><a href="${escapar(`${site}/biblia/`)}">The full answer, with the first seven words of the Bible</a></p>`]
    ];
  } else if (passo === 4) {
    const etapas = [
      ['Meet', 'the shape, name and sound of the letter, with the teacher\'s audio and an explanation in English.'],
      ['Words', 'real words to read, built only from letters you have already learned.'],
      ['Write', 'the letter in cursive, traced with your finger in the right stroke order.'],
      ['Reinforce', 'listen, look and remember the letter, with support at every step and no score.'],
      ['Exercises', 'varied, scored exercises, corrected on the spot. Whatever you get wrong comes back later, in review.']
    ];
    blocos = [
      ['Each letter in the course has a lesson in five steps:', null],
      ...etapas.map(([n, d]) => [`${n}: ${d}`, `<p><strong>${escapar(n)}:</strong> ${escapar(d)}</p>`]),
      [`To see one from the inside, the free Alef test follows the same steps: ${curso}#experimente`,
       `<p>To see one from the inside, <a href="${escapar(`${curso}#experimente`)}">the free Alef test</a> follows the same steps.</p>`]
    ];
  } else {
    const p = preco || {};
    const linhas = [
      p.usd ? `The course costs $${p.usd}, a one-time payment, with no subscription.` : null,
      `You get ${p.meses || 12} months of access, and ${p.desistir || 14} days to cancel and get 100% back, no questions asked.`
    ].filter(Boolean);
    blocos = [
      ['This is the last email in this series. If the letters you saw here made sense, the course goes on the same way: one letter at a time, up to all 22 and the vowel signs.', null],
      ...linhas.map(l => [l, null]),
      [`Start: ${curso}`, `<p><a href="${escapar(curso)}"><strong>See the course and start</strong></a></p>`],
      ['After this one, we only write when there is real news, like a new course.', null]
    ];
  }
  const rodape = `You get this email because you asked for the next letters on the ${assinatura} site. To leave the list: ${sair}`;
  const text = ['Hi,', '', ...blocos.flatMap(([t]) => [t, '']), suporte ? `Questions? Reply to this email or write to ${suporte}.` : '', '', assinatura, '', rodape].join('\n');
  const html = [
    '<p>Hi,</p>',
    ...blocos.map(([t, h]) => h || `<p>${escapar(t)}</p>`),
    suporte ? `<p>Questions? Reply to this email or write to ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`,
    `<p style="color:#666;font-size:13px">You get this email because you asked for the next letters on the ${escapar(assinatura)} site. <a href="${escapar(sair)}">Leave the list</a>.</p>`
  ].join('');
  return { subject: ASSUNTOS_DA_SEQUENCIA[passo - 1] || ASSUNTOS_DA_SEQUENCIA[0], text, html };
}

/** The study reminder (worker/src/lembrete.js); see the Portuguese version. */
export function mensagemDeLembrete({ nome, painel, praticar, sair, marca }) {
  const ola = saudacao(nome);
  const assinatura = marca || MARCA.en;
  const subject = 'Ten minutes of Hebrew today?';
  const corpo = [
    'No Hebrew yet today. A letter takes about ten minutes, and the course keeps your place.',
    `If the day is short, a round in Practice counts too: ${praticar}`
  ];
  const rotulo = 'Pick up where I left off';
  const fecho = 'You get this email because you asked for the reminder in Your account. After three reminders without study, they stop on their own until you come back.';
  const saida = `To stop receiving it: ${sair}`;
  const text = [ola, '', ...corpo.flatMap(l => [l, '']), `${rotulo}: ${painel}`, '', fecho, saida, '', assinatura].join('\n');
  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>${escapar(corpo[0])}</p>`,
    `<p>If the day is short, <a href="${escapar(praticar)}">a round in Practice</a> counts too.</p>`,
    `<p><a href="${escapar(painel)}">${escapar(rotulo)}</a></p>`,
    `<p><small>${escapar(fecho)} <a href="${escapar(sair)}">Stop the reminder</a>.</small></p>`,
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject, text, html };
}

/* Mandar um e-mail.
 * ─────────────────────────────────────────────────────────────────────────
 * Existe por um motivo só, e por enquanto tem um cliente só: a recuperação
 * de senha. Um aluno que perde a senha e não tem como recuperá-la sozinho
 * perde o curso que pagou - e escreve para o suporte, que é onde o dono da
 * plataforma descobre que virou o serviço de recuperação de senha.
 *
 * O provedor é a Resend, escolhida por caber inteira numa chamada de fetch:
 * o Worker não tem SMTP, não tem processo em segundo plano e não tem fila.
 * Trocar de provedor é trocar `entregar()`.
 *
 * ── três regras que valem contra o instinto ──────────────────────────────
 *
 * 1. FALHA ABERTA, E RUIDOSA. Um e-mail que não sai nunca derruba a
 *    requisição que o pediu. A pessoa que clicou em "esqueci minha senha"
 *    recebe a mesma resposta de sempre, e o problema vai para o log do
 *    Worker e para `/api/health`. O contrário - um 500 na cara de quem já
 *    está com dificuldade - não faz o e-mail chegar e ainda sugere que a
 *    conta dela não existe.
 *
 * 2. SEM CHAVE, NÃO FINGE QUE MANDOU. `mailReady()` é público e
 *    `/api/health` reporta. Um envio que retorna "ok" sem provedor
 *    configurado é como uma plataforma fica semanas sem recuperar a senha de
 *    ninguém, com todas as telas dizendo "enviamos, confira sua caixa".
 *
 * 3. O TEXTO É CURTO E SEM IMAGEM. E-mail de senha é lido em três segundos,
 *    muitas vezes num filtro de spam que gosta de HTML pesado. Vai `text` e
 *    `html` mínimo, o mesmo conteúdo nos dois.
 */

import { nomeSeguro } from './nome.js';
import empresa from '../../../data/empresa.json';

/**
 * O remetente. Fica em [vars] do wrangler.toml, não é segredo, e precisa ser
 * de um domínio verificado na Resend - senão ela recusa a entrega com 403.
 */
export const mailFrom = env =>
  String((env && env.EMAIL_FROM) || '').trim();

/**
 * Para onde vai a resposta de quem recebe. É a caixa de suporte do site
 * (SUPPORT_EMAIL); vazio quando ela não está configurada, e então a resposta
 * segue para o remetente, como antes.
 */
export const mailReplyTo = env =>
  String((env && env.SUPPORT_EMAIL) || '').trim();

/** Dá para mandar e-mail nesta implantação? É o que /api/health reporta. */
export const mailReady = env => !!(env && env.RESEND_API_KEY && mailFrom(env));

/* A base da API. Existe para o `npm test` apontar para um servidor de
   mentira; não pertence nem ao painel nem ao wrangler.toml. */
const base = env => String((env && env.RESEND_BASE) || 'https://api.resend.com');

/* O prazo de resposta do atendimento, o mesmo do site (data/empresa.json,
   `atendimento.prazoRespostaUteis`, lido pela página via `prazoResposta()`
   em app/src/lib/empresa.ts). Auditoria de 01/10/2026, LEGAL-109: os e-mails
   diziam "responda" sem dizer em quanto tempo alguém lê a resposta. */
const PRAZO_UTEIS = Number(empresa.atendimento && empresa.atendimento.prazoRespostaUteis) || 2;
const PRAZO = `em até ${PRAZO_UTEIS} ${PRAZO_UTEIS === 1 ? 'dia útil' : 'dias úteis'}`;
/** "Qualquer dúvida..." com o prazo, nos e-mails de compra e de desistência. */
const duvida = suporte => `Qualquer dúvida, responda esta mensagem ou escreva para ${suporte}. Respondemos ${PRAZO}.`;

/**
 * Manda, e diz o que aconteceu.
 *
 * Nunca lança: quem chama está no meio de um fluxo de conta, e a decisão de
 * o que fazer com a falha é de lá. Devolve
 *   { ok: true }                         entregue à Resend
 *   { ok: false, motivo: 'sem-provedor' } falta RESEND_API_KEY ou EMAIL_FROM
 *   { ok: false, motivo: 'recusado', detalhe, status }
 *   { ok: false, motivo: 'rede', detalhe }
 */
export async function sendMail(env, { to, subject, text, html, headers, replyTo }) {
  if (!mailReady(env)) return { ok: false, motivo: 'sem-provedor' };

  /* Para onde vai a RESPOSTA. Os textos dizem "responda este e-mail", e sem
     `reply_to` a resposta iria para o remetente (`contato@`), que é um
     endereço de envio, verificado na Resend, e não necessariamente uma caixa
     que alguém lê. Com `reply_to` ela cai na caixa de suporte declarada no
     site (SUPPORT_EMAIL, wrangler.toml [vars]). Um pedido de desistência
     feito por resposta ao recibo é o direito do art. 49 do CDC sendo
     exercido; ele não pode sumir num endereço sem leitor (auditoria de
     01/10/2026, LEGAL-101). */
  const suporte = mailReplyTo(env);
  const corpo = {
    from: mailFrom(env),
    to: [String(to)],
    subject: String(subject),
    text: String(text),
    ...(html ? { html: String(html) } : {}),
    /* `replyTo` (06/11/2026): no aviso de uma mensagem de aluno, a resposta
       do dono vai direto para o aluno. */
    ...(replyTo ? { reply_to: String(replyTo) } : suporte ? { reply_to: suporte } : {}),
    /* Cabeçalhos extras: hoje só o List-Unsubscribe da lista de interessados. */
    ...(headers && Object.keys(headers).length ? { headers } : {})
  };

  let r;
  try {
    r = await fetch(`${base(env)}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(corpo)
    });
  } catch (e) {
    return { ok: false, motivo: 'rede', detalhe: String((e && e.message) || e) };
  }

  if (!r.ok) {
    /* O corpo do erro da Resend diz o que está errado ("domain is not
       verified", "invalid from") - e é justamente isso que alguém vai
       procurar no log às onze da noite. Cabe em 300 caracteres. */
    let detalhe = '';
    try { detalhe = (await r.text()).slice(0, 300); } catch { /* sem corpo */ }
    return { ok: false, motivo: 'recusado', status: r.status, detalhe };
  }

  /* O corpo da resposta (um id de mensagem) não serve a ninguém aqui, mas
     precisa ser consumido: uma resposta de fetch cujo corpo não é lido nem
     cancelado fica pendurada. */
  try { await r.text(); } catch { /* já consumido */ }
  return { ok: true };
}

/* ── a mensagem de recuperação ─────────────────────────────────────────── */

/**
 * O e-mail de "esqueci minha senha", montado num lugar só.
 *
 * Separado do envio de propósito: assim o teste lê o texto e confere que o
 * link está inteiro sem precisar de provedor nenhum, e o texto que o aluno
 * recebe é revisável sem abrir a lógica de HTTP.
 *
 * `minutos` entra no texto porque "o link expira" sem prazo não ajuda
 * ninguém a decidir se clica agora ou depois do jantar.
 */
export function mensagemDeRecuperacao({ nome, link, minutos, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';

  const text = [
    ola,
    '',
    `Alguém pediu para redefinir a senha da sua conta no ${assinatura}.`,
    'Se foi você, use o link abaixo:',
    '',
    link,
    '',
    `O link vale por ${minutos} minutos e funciona uma vez só.`,
    '',
    'Se não foi você, pode ignorar esta mensagem - sua senha continua a mesma,',
    'e ninguém consegue trocá-la sem este link.',
    '',
    suporte ? `Qualquer dúvida, é só responder ou escrever para ${suporte}.` : '',
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  /* HTML mínimo e sem CSS externo: cliente de e-mail não tem folha de
     estilo, e um <style> no topo é descartado por metade deles. */
  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>Alguém pediu para redefinir a senha da sua conta no ${escapar(assinatura)}.`,
    ' Se foi você, use o link abaixo:</p>',
    `<p><a href="${escapar(link)}">Escolher uma senha nova</a></p>`,
    `<p>O link vale por ${minutos} minutos e funciona uma vez só.</p>`,
    '<p>Se não foi você, pode ignorar esta mensagem - sua senha continua a',
    ' mesma, e ninguém consegue trocá-la sem este link.</p>',
    suporte ? `<p>Qualquer dúvida, escreva para ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Redefinir sua senha - ${assinatura}`, text, html };
}

/* ── a mensagem de confirmação de e-mail ───────────────────────────────── */

/**
 * "Confirme seu e-mail", mandado no cadastro e quando a pessoa pede de novo.
 *
 * O parágrafo que importa é o do fim. Este e-mail chega à DONA do endereço
 * mesmo quando não foi ela quem criou a conta - e é a única chance de ela
 * saber disso. Então ele diz o que fazer: pedir uma senha nova, que só chega
 * a ela e derruba a sessão de quem criou.
 *
 * E ele NÃO diz "clique para confirmar e pronto": o link só confirma com a
 * conta aberta no navegador. Quem não criou a conta e clica por reflexo não
 * confirma nada - a tela pede login, e ela não tem a senha.
 */
export function mensagemDeConfirmacao({ nome, link, dias, esqueci, marca, suporte }) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';

  const text = [
    ola,
    '',
    `Sua conta no ${assinatura} foi criada com este endereço de e-mail.`,
    'Para confirmar que ele é seu, abra o link abaixo:',
    '',
    link,
    '',
    `O link vale por ${dias} dias. Se ele pedir para entrar, use o e-mail e a`,
    'senha que você escolheu no cadastro.',
    '',
    'Não foi você que criou esta conta? Então alguém usou o seu endereço.',
    `Você pode tomá-la de volta em ${esqueci} - o link de senha nova chega`,
    'só a você, e trocar a senha desconecta quem criou a conta.',
    '',
    suporte ? `Qualquer dúvida, é só responder ou escrever para ${suporte}.` : '',
    '',
    assinatura
  ].join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>Sua conta no ${escapar(assinatura)} foi criada com este endereço de e-mail.`,
    ' Para confirmar que ele é seu, abra o link abaixo:</p>',
    `<p><a href="${escapar(link)}">Confirmar meu e-mail</a></p>`,
    `<p>O link vale por ${dias} dias. Se ele pedir para entrar, use o e-mail e a`,
    ' senha que você escolheu no cadastro.</p>',
    '<p><strong>Não foi você que criou esta conta?</strong> Então alguém usou o seu',
    ` endereço. Você pode tomá-la de volta em <a href="${escapar(esqueci)}">${escapar(esqueci)}</a>`,
    ' - o link de senha nova chega só a você, e trocar a senha desconecta quem',
    ' criou a conta.</p>',
    suporte ? `<p>Qualquer dúvida, escreva para ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Confirme seu e-mail - ${assinatura}`, text, html };
}

/* ── a segunda letra (03/10/2026) ───────────────────────────────────────── */

/**
 * O e-mail de quem terminou o teste grátis da capa e pediu a segunda letra
 * (api/segunda-letra.js). No curso, a segunda letra é o Mem.
 *
 * Todo o conteúdo da letra sai da lição 2 (data/letters.json, `mem`), e o
 * teste segunda-letra.test.ts confere que cada frase daqui ainda está lá: se
 * a lição mudar, este e-mail não fica ensinando outra coisa.
 *
 * Um e-mail só, e o endereço não entra em lista nenhuma. Sem preço: ele muda,
 * e um e-mail antigo não pode prometer o valor de outro dia.
 */
export const SEGUNDA_LETRA = {
  letra: 'מ', nome: 'Mem', final: 'ם',
  som: 'Igual ao M do português, em mãe, mesa, música. Não há nada novo a aprender no som - só na forma.',
  silabas: [['מַ', 'ma'], ['מֶ', 'me'], ['מִ', 'mi'], ['מוֹ', 'mo'], ['מוּ', 'mu']],
  palavras: [['מַיִם', 'máyim', 'água'], ['אִמָא', 'íma', 'mãe']],
  cuidado: 'Em português o M no fim da sílaba nasaliza a vogal antes dele - "mim", "bom", "sim". Em hebraico isso não acontece: o M é sempre pronunciado como consoante inteira, e a vogal continua oral.',
  fim: 'faz /m/ e vira ם quando termina a palavra. Mesma letra, mesmo som, outro desenho.',
  sabia: 'O nome Mem vem de uma palavra semítica muito antiga que queria dizer "água". Ela é da mesma família de מַיִם (máyim), a palavra que ainda hoje quer dizer "água" em hebraico.'
};

export function mensagemDaSegundaLetra({ site, suporte, marca, confirmar }) {
  const L = SEGUNDA_LETRA;
  const assinatura = marca || 'Hebraico Fluente';
  /* Com `confirmar` (23/10/2026), a pessoa marcou a caixa de receber as
     próximas letras: o rodapé pede a confirmação em vez de dizer que o
     endereço não fica guardado. Ver api/interessados.js. */
  const rodapeTexto = confirmar
    ? ['Você também pediu para receber as próximas letras e novidades por e-mail. Para confirmar, abra este link e toque em "Confirmar":',
       confirmar,
       'Sem a confirmação, não mandamos mais nada, e o endereço é apagado em 7 dias. Não foi você que pediu? É só ignorar.']
    : ['Você recebeu este e-mail porque alguém pediu a segunda letra com este endereço no site. Não foi você? É só ignorar: não mandamos mais nada, e o endereço não fica guardado.'];
  const curso = `${site}/curso-de-hebraico/`;
  const silabas = L.silabas.map(([he, t]) => `${he} ${t}`).join(' · ');
  const palavras = L.palavras.map(([he, t, pt]) => `${he} (${t}), «${pt}»`).join(' · ');

  const text = [
    'Oi.',
    '',
    'Você terminou o teste do Álef no nosso site e pediu a segunda letra. Aqui está ela.',
    '',
    `${L.letra}  ${L.nome}`,
    '',
    `O som: ${L.som}`,
    '',
    `As sílabas: ${silabas}`,
    'Repare: as vogais são as mesmas que você viu com o Álef.',
    '',
    `Duas palavras: ${palavras}`,
    '',
    `Cuidado, brasileiro: ${L.cuidado}`,
    '',
    `No fim da palavra: ${L.letra} ${L.fim}`,
    '',
    `Você sabia? ${L.sabia}`,
    '',
    'Faltam 20 letras. No curso, cada uma vem assim: a voz do professor, a escrita com o dedo e a correção na hora.',
    curso,
    '',
    ...rodapeTexto,
    suporte ? `Dúvidas: ${suporte}` : '',
    '',
    assinatura
  ].join('\n');

  const he = t => `<span dir="rtl" lang="he" style="font-size:1.25em">${escapar(t)}</span>`;
  const [antesDaFinal, depoisDaFinal = ''] = L.fim.split(L.final);
  const html = [
    '<p>Oi.</p>',
    '<p>Você terminou o teste do Álef no nosso site e pediu a segunda letra. Aqui está ela.</p>',
    `<p style="font-size:44px;margin:16px 0 4px;text-align:left"><span dir="rtl" lang="he">${escapar(L.letra)}</span></p>`,
    `<p style="margin:0 0 16px"><strong>${escapar(L.nome)}</strong></p>`,
    `<p><strong>O som:</strong> ${escapar(L.som)}</p>`,
    `<p><strong>As sílabas:</strong> ${L.silabas.map(([h, t]) => `${he(h)} ${escapar(t)}`).join(' · ')}<br>`,
    'Repare: as vogais são as mesmas que você viu com o Álef.</p>',
    `<p><strong>Duas palavras:</strong> ${L.palavras.map(([h, t, pt]) => `${he(h)} (${escapar(t)}), «${escapar(pt)}»`).join(' · ')}</p>`,
    `<p><strong>Cuidado, brasileiro:</strong> ${escapar(L.cuidado)}</p>`,
    `<p><strong>No fim da palavra:</strong> ${he(L.letra)} ${escapar(antesDaFinal)}${he(L.final)}${escapar(depoisDaFinal)}</p>`,
    `<p><strong>Você sabia?</strong> ${escapar(L.sabia)}</p>`,
    '<p>Faltam 20 letras. No curso, cada uma vem assim: a voz do professor, a escrita com o dedo e a correção na hora.</p>',
    `<p><a href="${escapar(curso)}">Conhecer o curso completo</a></p>`,
    confirmar
      ? '<p>Você também pediu para receber as próximas letras e novidades por e-mail.</p>' +
        `<p><a href="${escapar(confirmar)}"><strong>Confirmar a inscrição</strong></a></p>` +
        '<p style="color:#666;font-size:13px">Sem a confirmação, não mandamos mais nada, e o endereço é apagado em 7 dias. Não foi você que pediu? É só ignorar.'
      : '<p style="color:#666;font-size:13px">Você recebeu este e-mail porque alguém pediu a segunda letra com este endereço no site.' +
        ' Não foi você? É só ignorar: não mandamos mais nada, e o endereço não fica guardado.',
    suporte ? ` Dúvidas: ${escapar(suporte)}` : '',
    '</p>',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `A segunda letra: ${L.nome} (${L.letra}) - ${assinatura}`, text, html };
}

/* ── a lista de interessados (api/interessados.js, sequencia.js) ────────── */

/** O que cada interesse quer receber, para os e-mails dizerem com clareza. */
export const INTERESSE_PT = {
  curso: 'as próximas letras do alfabeto e as novidades do curso',
  israel: 'o aviso de quando Israel Além do Óbvio abrir',
  raizes: 'o aviso de quando Raízes Sefarditas abrir',
  a1: 'o aviso de quando o curso Hebraico A1 abrir'
};

/** O e-mail que pede a confirmação da inscrição (quem não pediu, ignora). */
export function mensagemDeConfirmacaoDaLista({ interesses, confirmar, suporte, marca }) {
  const assinatura = marca || 'Hebraico Fluente';
  const oQue = (interesses || []).map(i => INTERESSE_PT[i]).filter(Boolean).join('; ') || 'as novidades';
  const text = [
    'Oi.',
    '',
    `Alguém pediu, no site do ${assinatura}, para receber neste endereço: ${oQue}.`,
    '',
    'Para confirmar, abra este link e toque em "Confirmar":',
    confirmar,
    '',
    'Sem a confirmação, não mandamos mais nada, e o endereço é apagado em 7 dias. Não foi você? É só ignorar.',
    suporte ? `Dúvidas: ${suporte}` : '',
    '',
    assinatura
  ].join('\n');
  const html = [
    '<p>Oi.</p>',
    `<p>Alguém pediu, no site do ${escapar(assinatura)}, para receber neste endereço: ${escapar(oQue)}.</p>`,
    `<p><a href="${escapar(confirmar)}"><strong>Confirmar a inscrição</strong></a></p>`,
    '<p style="color:#666;font-size:13px">Sem a confirmação, não mandamos mais nada, e o endereço é apagado em 7 dias. Não foi você? É só ignorar.',
    suporte ? ` Dúvidas: ${escapar(suporte)}` : '',
    '</p>',
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject: `Confirme sua inscrição - ${assinatura}`, text, html };
}

/**
 * A sequência de quem pediu as próximas letras: o Mem já foi no e-mail da
 * segunda letra; estes são os cinco seguintes, em DIAS_DA_SEQUENCIA
 * (api/interessados.js). Uma tarefa por e-mail; o preço só no último, e o do
 * catálogo. Todo hebraico é do curso: tests/interessados.test.ts confere
 * TERCEIRA_LETRA contra data/letters.json.
 */
export const TERCEIRA_LETRA = {
  letra: 'ת', nome: 'Tav',
  silabas: [['תַ', 'ta'], ['תֶ', 'te'], ['תִ', 'ti'], ['תוֹ', 'to'], ['תוּ', 'tu']],
  palavra: ['אֶמֶת', 'émet', 'verdade']
};

export const ASSUNTOS_DA_SEQUENCIA = [
  'A terceira letra: Tav (ת)',
  'Por que uma letra de cada vez',
  'Dá para ler a Bíblia depois do curso?',
  'Como é uma lição por dentro',
  'Se quiser continuar: o curso completo'
];

export function mensagemDaSequencia({ passo, site, sair, preco, suporte, marca }) {
  const assinatura = marca || 'Hebraico Fluente';
  const curso = `${site}/curso-de-hebraico/`;
  const T = TERCEIRA_LETRA;
  const he = t => `<span dir="rtl" lang="he" style="font-size:1.25em">${escapar(t)}</span>`;
  /* Cada parágrafo é [texto puro, html]; o html só difere quando há hebraico ou link. */
  let blocos;
  if (passo === 1) {
    blocos = [
      ['A terceira letra do curso é o Tav.', null],
      [`${T.letra}  ${T.nome}`, `<p style="font-size:44px;margin:16px 0 4px"><span dir="rtl" lang="he">${escapar(T.letra)}</span></p><p style="margin:0 0 16px"><strong>${escapar(T.nome)}</strong></p>`],
      ['O som: como o T de "tatu", sempre seco. Nunca com som de TCH, nem antes de I e E.', null],
      [`As sílabas: ${T.silabas.map(([h, t]) => `${h} ${t}`).join(' · ')}`,
       `<p><strong>As sílabas:</strong> ${T.silabas.map(([h, t]) => `${he(h)} ${escapar(t)}`).join(' · ')}</p>`],
      [`Com Álef, Mem e Tav você já lê: ${T.palavra[0]} (${T.palavra[1]}), «${T.palavra[2]}».`,
       `<p>Com Álef, Mem e Tav você já lê: ${he(T.palavra[0])} (${escapar(T.palavra[1])}), «${escapar(T.palavra[2])}».</p>`],
      ['Você sabia? O Tav é a última letra do alfabeto. Por isso, em hebraico, "do A ao Z" é "de Álef a Tav".', null],
      [`No curso, a próxima é o Nun. Uma letra por vez: ${curso}`,
       `<p>No curso, a próxima é o Nun. Uma letra por vez: <a href="${escapar(curso)}">conhecer o curso</a>.</p>`]
    ];
  } else if (passo === 2) {
    blocos = [
      ['No curso, você conhece a letra, pratica com ela e só então avança. O alfabeto inteiro na tela no primeiro dia não ensina: assusta.', null],
      ['A transliteração ajuda no começo, mas o objetivo nunca foi você depender dela. Ela vai diminuindo junto com o seu progresso, até você ler direto do hebraico.', null],
      ['A ordem em que as letras entram vem do método Ba Li Ivrit, do Dr. Damián Dzienciarsky. A adaptação para o aluno brasileiro é do professor: os exercícios, as explicações pensadas para quem fala português e a escrita cursiva.', null],
      [`Como o curso foi pensado: ${site}/metodo/`, `<p><a href="${escapar(`${site}/metodo/`)}">Como o curso foi pensado</a></p>`]
    ];
  } else if (passo === 3) {
    blocos = [
      ['É a pergunta que mais chega. A resposta curta: sim para ler, não para entender.', null],
      ['Ler: o texto hebraico da Bíblia usado hoje vem com os sinais de vogal, o nikud. São exatamente as 22 letras e os sinais que o curso ensina. Com eles você lê em voz alta qualquer versículo, sem transliteração.', null],
      ['Entender: pede vocabulário e gramática, e o hebraico da Bíblia tem construções que o hebraico de hoje não usa. O curso é de alfabetização: ele dá a porta, não a casa.', null],
      [`A resposta inteira, com as sete primeiras palavras da Bíblia para você tocar: ${site}/biblia/`,
       `<p><a href="${escapar(`${site}/biblia/`)}">A resposta inteira, com as sete primeiras palavras da Bíblia</a></p>`]
    ];
  } else if (passo === 4) {
    const etapas = [
      ['Conhecer', 'a forma, o nome e o som da letra, com o áudio do professor e a explicação em português.'],
      ['Palavras', 'palavras reais para ler, montadas só com letras que você já aprendeu.'],
      ['Escrever', 'a letra em cursiva, traçada com o dedo na ordem certa dos traços.'],
      ['Fixação', 'ouvir, observar e lembrar a letra, com apoio a cada passo e sem nota.'],
      ['Exercícios', 'exercícios variados com nota, corrigidos na hora. O que você errar volta depois, na revisão.']
    ];
    blocos = [
      ['Cada letra do curso tem uma lição em cinco etapas:', null],
      ...etapas.map(([n, d]) => [`${n}: ${d}`, `<p><strong>${escapar(n)}:</strong> ${escapar(d)}</p>`]),
      [`Para ver uma por dentro, o teste grátis do Álef segue as mesmas etapas: ${curso}#experimente`,
       `<p>Para ver uma por dentro, <a href="${escapar(`${curso}#experimente`)}">o teste grátis do Álef</a> segue as mesmas etapas.</p>`]
    ];
  } else {
    const p = preco || {};
    const linhas = [
      p.brl ? `O curso custa R$ ${p.brl}, em pagamento único, sem mensalidade.${p.listBrl ? ` É o preço de pré-lançamento; depois, R$ ${p.listBrl}.` : ''}` : null,
      p.pixPct ? `No PIX, ${p.pixPct}% de desconto. No cartão, em até ${p.parcelas || 12}x (com os juros da Mercado Pago).` : null,
      `São ${p.meses || 12} meses de acesso, e ${p.desistir || 7} dias para desistir e receber 100% de volta, sem justificar.`
    ].filter(Boolean);
    blocos = [
      ['Este é o último e-mail desta série. Se as letras que você viu por aqui fizeram sentido, o curso continua do mesmo jeito: uma letra por vez, até as 22 e os sinais de vogal.', null],
      ...linhas.map(l => [l, null]),
      [`Começar: ${curso}`, `<p><a href="${escapar(curso)}"><strong>Conhecer o curso e começar</strong></a></p>`],
      ['Depois deste, só escrevemos quando houver novidade de verdade, como um curso novo.', null]
    ];
  }
  const rodape = `Você recebe este e-mail porque pediu as próximas letras no site do ${assinatura}. Para sair da lista: ${sair}`;
  const text = ['Oi.', '', ...blocos.flatMap(([t]) => [t, '']), suporte ? `Dúvidas: responda esta mensagem ou escreva para ${suporte}.` : '', '', assinatura, '', rodape].join('\n');
  const html = [
    '<p>Oi.</p>',
    ...blocos.map(([t, h]) => h || `<p>${escapar(t)}</p>`),
    suporte ? `<p>Dúvidas: responda esta mensagem ou escreva para ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`,
    `<p style="color:#666;font-size:13px">Você recebe este e-mail porque pediu as próximas letras no site do ${escapar(assinatura)}. <a href="${escapar(sair)}">Sair da lista</a>.</p>`
  ].join('');
  return { subject: ASSUNTOS_DA_SEQUENCIA[passo - 1] || ASSUNTOS_DA_SEQUENCIA[0], text, html };
}

/* ── o aviso de presente aguardando ────────────────────────────────────── */

/**
 * Vai para o DONO, não para o aluno.
 *
 * Alguém acabou de criar conta com um endereço que tem presente reservado
 * (`liberar` sem conta existente). Antes isso virava acesso sozinho, e era o
 * furo F-18: bastava saber o endereço presenteado para chegar antes. Agora o
 * dono confere e libera - ele é quem sabe para quem deu.
 *
 * O e-mail do aluno APARECE aqui de propósito: quem lê é o dono, e sem o
 * endereço o aviso não serve para nada. É o único e-mail nosso que carrega
 * endereço de cliente, e vai para um destinatário só.
 */
export function mensagemDeConvitePendente({ email, nome: cru, cursos, marca, painel }) {
  /* Mesmo indo ao dono, o nome passa pelo filtro: é texto escolhido por
     quem se cadastrou, dentro de um e-mail do nosso domínio. */
  const nome = nomeSeguro(cru);
  const assinatura = marca || 'Hebraico Fluente';
  const lista = (cursos || []).join(', ');

  const text = [
    'Alguém se cadastrou com um endereço que tem presente reservado.',
    '',
    `Endereço: ${email}`,
    nome ? `Nome no cadastro: ${nome}` : '',
    `Presente aguardando: ${lista}`,
    '',
    'O acesso NÃO foi liberado sozinho, de propósito: quem sabe para quem',
    'você deu o presente é você. Se for a pessoa certa, libere em',
    '',
    painel || 'GitHub → Actions → Acesso → liberar',
    '',
    'Se não for, não faça nada - o convite continua esperando.',
    '',
    assinatura
  ].filter(l => l !== '').join('\n');

  const html = [
    '<p>Alguém se cadastrou com um endereço que tem presente reservado.</p>',
    `<p>Endereço: <strong>${escapar(email)}</strong><br>`,
    nome ? `Nome no cadastro: ${escapar(nome)}<br>` : '',
    `Presente aguardando: ${escapar(lista)}</p>`,
    '<p>O acesso <strong>não</strong> foi liberado sozinho, de propósito: quem',
    ' sabe para quem você deu o presente é você. Se for a pessoa certa, libere',
    ` em ${escapar(painel || 'GitHub → Actions → Acesso → liberar')}.</p>`,
    '<p>Se não for, não faça nada - o convite continua esperando.</p>',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Presente aguardando confirmação - ${assinatura}`, text, html };
}

/* ── a confirmação de compra ───────────────────────────────────────────── */

/**
 * Vai para o ALUNO, quando o pagamento é aprovado.
 *
 * Havia um buraco aqui que ninguém tinha visto: a pessoa pagava, o acesso
 * abria na tela, e a caixa de entrada dela ficava vazia. Sem recibo, sem link
 * para voltar, sem nada. Quem fechasse a aba precisava lembrar o nome do
 * site; quem quisesse conferir o que comprou não tinha onde.
 *
 * Com uma venda por semana isso não aparece. Com trinta, vira fila de suporte
 * com "paguei e não recebi nada" - e quem escreve isso não está enganado.
 *
 * ── o que esta mensagem carrega, e por quê ──────────────────────────────
 *
 *   O QUE ABRIU       o curso pelo nome e o link para começar. É a única
 *                     coisa que a pessoa quer nos primeiros dez segundos;
 *   COM QUE ENTRAR    o endereço desta mensagem. É a dúvida número um do
 *                     suporte de qualquer plataforma com conta;
 *   ATÉ QUANDO        a data, escrita. "12 meses" obriga a pessoa a fazer
 *                     conta a partir de um dia que ela já não lembra;
 *   QUANTO            o valor e o número do pedido. É o recibo, e o número é
 *                     o que torna uma dúvida respondível pelo suporte;
 *   O ARREPENDIMENTO  os sete dias do Código de Defesa do Consumidor. Não
 *                     está aqui por obrigação e sim porque dizer isso em voz
 *                     alta, por escrito, na hora da compra, é o que separa um
 *                     curso de um golpe aos olhos de quem acabou de pagar.
 *                     Quem confia pede menos reembolso, não mais.
 *
 * Sem anexo e sem imagem: a primeira mensagem de um remetente novo é a mais
 * provável de cair no spam, e HTML pesado com imagem remota é o que faz cair.
 *
 * O PRIMEIRO PASSO (05/10/2026, pedido do dono): na primeira compra, o link
 * de começar leva à Aula 0 (`aula0`) e diz o que ela é, com o tempo que a
 * própria página promete ("dez minutos de leitura"). Quem não começa nos
 * primeiros dias é quem mais desiste; um primeiro passo pequeno e com nome
 * é mais fácil de dar do que "o curso". O painel continua no e-mail, logo
 * abaixo, para quem volta a ele depois. Na renovação, quem já estuda volta
 * para o painel, como antes.
 */
export function mensagemDeCompra({
  nome, curso, valor, pedido, expiraEm, link, aula0, marca, suporte, arrependimentoDias, renovacao,
  termos, reembolso, versao, desistir, tipo = 'curso', ebook = null
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  /* "ao CURSO X", e não "ao X": o título vem do catálogo e pode começar com
     palavra de qualquer gênero - "ao Alfabetização em Hebraico" não é
     português. O substantivo no meio resolve para qualquer título futuro.
     O e-book (21/10/2026) diz "e-book", e o pacote, os dois produtos. */
  const livro = tipo === 'livro';
  const abertura = livro
    ? (renovacao ? `Seu acesso ao ${curso} foi renovado.` : `Seu acesso ao ${curso} está liberado.`)
    : tipo === 'pacote'
      ? `Seu acesso ao curso Alfabetização em Hebraico e ao Israel Além do Óbvio está liberado, no mesmo login.`
      : renovacao
        ? `Seu acesso ao curso ${curso} foi renovado.`
        : `Seu acesso ao curso ${curso} está liberado.`;
  const primeiroPasso = !livro && !renovacao && aula0;
  const rotulo = livro ? 'Experiência interativa' : tipo === 'pacote' ? 'Combo' : 'Curso';
  const COMO_ENTRAR = livro
    ? ['Entre com este mesmo endereço de e-mail e a senha que você escolheu na',
       'compra. O Israel Além do Óbvio abre no navegador, no celular ou no computador.']
    : ['Entre com este mesmo endereço de e-mail e a senha que você escolheu na',
       'compra. Seu progresso fica na conta, então dá para estudar no celular e',
       'continuar no computador de onde parou.'];
  const AULA0 = 'São uns dez minutos de leitura, sem nada para decorar: ela mostra como a ' +
    'escrita hebraica funciona, e depois cada letra fica muito mais simples.';

  const text = [
    ola,
    '',
    abertura,
    '',
    primeiroPasso ? 'Seu primeiro passo: a Aula 0.' : null,
    primeiroPasso ? AULA0 : null,
    primeiroPasso ? '' : null,
    `${livro ? 'Abra o Israel Além do Óbvio' : 'Comece por aqui'}: ${primeiroPasso ? aula0 : link}`,
    primeiroPasso ? `Depois, o curso inteiro fica no seu painel: ${link}` : null,
    ebook ? `O Israel Além do Óbvio: ${ebook}` : null,
    '',
    ...COMO_ENTRAR,
    '',
    '---',
    `${rotulo}: ${curso}`,
    `Valor: ${valor}`,
    expiraEm ? `Acesso até: ${expiraEm}` : null,
    `Pedido: ${pedido}`,
    '---',
    '',
    arrependimentoDias
      ? `Você tem ${arrependimentoDias} dias para desistir, contados da liberação do acesso (hoje), sem ` +
        'precisar justificar. É o Código de Defesa do Consumidor, e basta pedir: o valor volta integral.'
      : null,
    arrependimentoDias && desistir
      ? `Para desistir, abra ${desistir} e use "Desistir da compra", ou responda este e-mail. ` +
        `Pelo site, a confirmação chega na hora; por e-mail, respondemos confirmando o recebimento ${PRAZO}, ` +
        'e vale a data em que você escreveu.'
      : null,
    '',
    /* O contrato, num meio que a pessoa guarda (Decreto 7.962/2013, art. 4º,
       IV): este e-mail é o comprovante, e diz QUAL versão dos termos valeu. */
    termos ? 'Este e-mail é o comprovante da sua compra. As condições que valem para ela são' : null,
    termos ? `as dos Termos de Uso e da Política de Reembolso, na versão de ${versao || 'hoje'}:` : null,
    termos ? `· Termos de Uso: ${termos}` : null,
    reembolso ? `· Política de Reembolso: ${reembolso}` : null,
    termos ? '' : null,
    suporte ? duvida(suporte) : null,
    '',
    assinatura
  /* `null` para a linha que não sai, `''` para a linha em branco que fica.
     Filtrar por `''` comia as duas e a mensagem chegava num bloco só. */
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>${escapar(abertura)}</strong></p>`,
    primeiroPasso
      ? `<p><strong>Seu primeiro passo: a Aula 0.</strong> ${escapar(AULA0)}</p>` +
        `<p><a href="${escapar(aula0)}">Começar pela Aula 0</a></p>` +
        `<p>Depois, o curso inteiro fica no <a href="${escapar(link)}">seu painel</a>.</p>`
      : `<p><a href="${escapar(link)}">${livro ? 'Abrir o Israel Além do Óbvio' : 'Começar o curso'}</a></p>`,
    ebook ? `<p>E também: <a href="${escapar(ebook)}">Israel Além do Óbvio</a>.</p>` : '',
    `<p>${escapar(COMO_ENTRAR.join(' '))}</p>`,
    '<hr>',
    `<p>${rotulo}: ${escapar(curso)}<br>`,
    `Valor: ${escapar(valor)}<br>`,
    expiraEm ? `Acesso até: ${escapar(expiraEm)}<br>` : '',
    `Pedido: ${escapar(pedido)}</p>`,
    '<hr>',
    arrependimentoDias
      ? `<p>Você tem ${arrependimentoDias} dias para desistir, contados da liberação do acesso (hoje),` +
        ' sem precisar justificar. É o Código de Defesa do Consumidor, e basta pedir:' +
        ' o valor volta integral.' +
        (desistir
          ? ` Para desistir, abra <a href="${escapar(desistir)}">Sua conta</a> e use` +
            ' "Desistir da compra", ou responda este e-mail. Pelo site, a confirmação chega na hora;' +
            ` por e-mail, respondemos confirmando o recebimento ${PRAZO}, e vale a data em que você escreveu.`
          : '') +
        '</p>'
      : '',
    termos
      ? '<p>Este e-mail é o comprovante da sua compra. As condições que valem para ela são' +
        ` as dos <a href="${escapar(termos)}">Termos de Uso</a>` +
        (reembolso ? ` e da <a href="${escapar(reembolso)}">Política de Reembolso</a>` : '') +
        `, na versão de ${escapar(versao || 'hoje')}.</p>`
      : '',
    suporte
      ? `<p>${escapar(duvida(suporte))}</p>`
      : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return {
    subject: renovacao ? `Acesso renovado - ${curso}` : `Seu acesso está liberado - ${curso}`,
    text,
    html
  };
}

/* ── a desistência da compra ───────────────────────────────────────────── */

/**
 * "Recebemos o seu pedido de desistência" - para quem pediu, NA HORA.
 *
 * O Decreto 7.962/2013 (art. 5º, § 4º) manda confirmar imediatamente o
 * recebimento do pedido de arrependimento. Este é o e-mail: diz quando o
 * pedido chegou (é o que prova que foi dentro do prazo), o que acontece com
 * o dinheiro e com o acesso, e que a pessoa não precisa fazer mais nada.
 */
export function mensagemDeArrependimento({
  nome, curso, valor, pedido, pedidoEm, prazoUteis, cartao, marca, suporte, estornoPedido = false
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  /* `estornoPedido`: o site já pediu a devolução à Mercado Pago, e a
     Mercado Pago aceitou. Só então o e-mail pode dizer isso. */
  const jaPedido = estornoPedido ? 'O estorno já foi pedido à Mercado Pago. ' : '';
  const devolucao = jaPedido + (cartao
    ? 'No cartão, ele aparece na fatura conforme o prazo da operadora.'
    : `O valor volta pela mesma forma de pagamento, em até ${prazoUteis} dias úteis.`);

  const text = [
    ola,
    '',
    `Recebemos o seu pedido de desistência da compra do curso ${curso}, em ${pedidoEm}.`,
    'Você não precisa fazer mais nada.',
    '',
    '---',
    `Curso: ${curso}`,
    `Valor: ${valor}`,
    `Pedido: ${pedido}`,
    `Desistência pedida em: ${pedidoEm}`,
    '---',
    '',
    `Devolvemos 100% do valor. ${devolucao}`,
    'O acesso ao curso é encerrado quando o reembolso for processado; o seu progresso',
    'de estudo fica guardado, caso um dia você volte.',
    '',
    suporte ? duvida(suporte) : null,
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>Recebemos o seu pedido de desistência da compra do curso ${escapar(curso)},`,
    ` em ${escapar(pedidoEm)}.</strong> Você não precisa fazer mais nada.</p>`,
    '<hr>',
    `<p>Curso: ${escapar(curso)}<br>`,
    `Valor: ${escapar(valor)}<br>`,
    `Pedido: ${escapar(pedido)}<br>`,
    `Desistência pedida em: ${escapar(pedidoEm)}</p>`,
    '<hr>',
    `<p>Devolvemos 100% do valor. ${escapar(devolucao)}</p>`,
    '<p>O acesso ao curso é encerrado quando o reembolso for processado; o seu progresso',
    ' de estudo fica guardado, caso um dia você volte.</p>',
    suporte ? `<p>${escapar(duvida(suporte))}</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return { subject: `Recebemos seu pedido de desistência - ${curso}`, text, html };
}

/**
 * O aviso ao DONO: alguém pediu desistência, e o estorno é com ele.
 *
 * Como o aviso de convite pendente, este carrega o e-mail do aluno de
 * propósito - quem lê é o dono, e sem o endereço não há o que fazer.
 */
/* Quanto do curso já saiu para quem desiste (SEC-A-010). Só para o dono:
   não muda o direito de desistir, e o e-mail diz isso. */
function linhasDoConteudo(conteudo) {
  if (!conteudo) return [];
  if (!conteudo.dias) return ['Conteúdo do curso: não foi aberto desde a compra.'];
  return [
    `Conteúdo do curso aberto em ${conteudo.dias} dia(s) desde a compra (o primeiro em ${conteudo.primeiro}).`,
    'Isso não muda o direito de desistir (CDC, art. 49): é só para você saber.'
  ];
}

export function mensagemDeArrependimentoDono({
  email, curso, valor, pedido, pedidoEm, prazoUteis, pixDireto, marca, estado = null, conteudo = null, motivo = null
}) {
  const assinatura = marca || 'Hebraico Fluente';
  const manual = pixDireto
    ? 'Devolva o PIX pelo banco e depois rode Actions -> Acesso -> revogar para este e-mail.'
    : 'Devolva pelo painel da Mercado Pago (Atividade -> o pagamento -> Devolver dinheiro). ' +
      'Quando a Mercado Pago avisar o estorno, o acesso fecha sozinho.';
  /* O que o site já fez sozinho decide o que o dono tem de fazer. */
  const como = estado === 'pedido' || estado === 'concluido'
    ? 'O ESTORNO JÁ FOI PEDIDO AUTOMATICAMENTE à Mercado Pago. Você não precisa fazer nada: ' +
      'quando ela confirmar, o acesso fecha sozinho.'
    : estado === 'pendente'
      ? 'A primeira tentativa de estorno automático não passou. O site tenta de novo sozinho; ' +
        'se não conseguir, você recebe um alerta. Se preferir não esperar: ' + manual
      : 'ESTE ESTORNO É COM VOCÊ (não dá para fazer sozinho neste pedido). ' + manual +
        ' Até resolver, você recebe um lembrete por dia.';
  const text = [
    'Pedido de desistência recebido pelo site (CDC, art. 49).',
    '',
    `E-mail: ${email}`,
    `Curso: ${curso}`,
    `Valor: ${valor}`,
    `Pedido: ${pedido}`,
    `Pedido de desistência em: ${pedidoEm}`,
    `Motivo: ${motivo || 'não informado (é opcional)'}`,
    ...linhasDoConteudo(conteudo),
    '',
    `Prazo prometido na Política de Reembolso: ${prazoUteis} dias úteis.`,
    como,
    '',
    assinatura
  ].join('\n');
  const html = [
    '<p><strong>Pedido de desistência recebido pelo site</strong> (CDC, art. 49).</p>',
    `<p>E-mail: <strong>${escapar(email)}</strong><br>`,
    `Curso: ${escapar(curso)}<br>`,
    `Valor: ${escapar(valor)}<br>`,
    `Pedido: ${escapar(pedido)}<br>`,
    `Pedido de desistência em: ${escapar(pedidoEm)}<br>`,
    `Motivo: ${escapar(motivo || 'não informado (é opcional)')}</p>`,
    ...linhasDoConteudo(conteudo).map(l => `<p>${escapar(l)}</p>`),
    `<p>Prazo prometido na Política de Reembolso: ${prazoUteis} dias úteis.</p>`,
    `<p>${escapar(como)}</p>`,
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject: `Desistência: ${pedido} (${valor})`, text, html };
}

/* ── o estorno concluído (auditoria de 01/10/2026, PAY-B-006) ──────────── */

/**
 * "O estorno está concluído e o acesso está encerrado" - para o aluno, uma
 * vez, quando o pedido vira `refunded`: desistência estornada sozinha,
 * devolução marcada pelo dono em /admin/estornos, ou contestação no banco.
 * O e-mail da desistência promete "o acesso é encerrado quando o reembolso
 * for processado"; até aqui ninguém avisava quando foi.
 *
 * `restaAte`: quando o estorno é de uma renovação, os meses DELA saem e o
 * acesso anterior continua - a mensagem diz até quando, em vez de dizer que
 * o curso acabou.
 */
export function mensagemDeEstorno({
  nome, curso, valor, pedido, cartao, contestacao = false, restaAte = '', marca, suporte
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const abertura = contestacao
    ? `A compra do curso ${curso} está contestada junto ao banco ou à operadora, e o valor está devolvido.`
    : `O estorno da sua compra do curso ${curso} está concluído.`;
  const acesso = restaAte
    ? `Os meses desta compra saem do seu acesso, que continua valendo até ${restaAte}.`
    : 'O acesso ao curso está encerrado.';
  const dinheiro = cartao
    ? 'No cartão, o valor aparece na fatura conforme o prazo da operadora.'
    : 'O valor volta pela mesma forma de pagamento.';

  const text = [
    ola,
    '',
    abertura,
    acesso,
    '',
    '---',
    `Curso: ${curso}`,
    `Valor: ${valor}`,
    `Pedido: ${pedido}`,
    '---',
    '',
    dinheiro,
    'Seu progresso de estudo fica guardado na conta, caso um dia você volte.',
    '',
    suporte ? `Qualquer dúvida, responda esta mensagem ou escreva para ${suporte}.` : null,
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>${escapar(abertura)}</strong> ${escapar(acesso)}</p>`,
    '<hr>',
    `<p>Curso: ${escapar(curso)}<br>`,
    `Valor: ${escapar(valor)}<br>`,
    `Pedido: ${escapar(pedido)}</p>`,
    '<hr>',
    `<p>${escapar(dinheiro)} Seu progresso de estudo fica guardado na conta, caso um dia você volte.</p>`,
    suporte ? `<p>Qualquer dúvida, responda esta mensagem ou escreva para ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  return {
    subject: contestacao ? `Compra contestada - ${curso}` : `Estorno concluído - ${curso}`,
    text,
    html
  };
}

/* ── o fim do acesso (auditoria de 01/10/2026, PAY-B-004) ──────────────── */

/**
 * O aviso de fim de acesso: 30 dias antes, 7 dias antes e no dia do fim
 * (worker/src/vencimento.js). Não é propaganda: é a informação de que um
 * serviço contratado está acabando, para quem o contratou, e por isso não
 * depende da lista de novidades. Diz a data, diz que nada é cobrado sozinho,
 * e diz como renovar - que é uma compra nova, feita pela pessoa.
 *
 * `marco`: 'd30' | 'd7' | 'fim'. `dias`: quantos faltam (nos dois primeiros).
 */
export function mensagemDeVencimento({
  nome, curso, quando, dias, marco, meses, renovar, marca, suporte
}) {
  const ola = saudacao(nome);
  const assinatura = marca || 'Hebraico Fluente';
  const fim = marco === 'fim';
  const faltam = Number(dias) === 1 ? 'amanhã' : `daqui a ${dias} dias`;
  const abertura = fim
    ? `Seu acesso ao curso ${curso} está encerrado desde ${quando}.`
    : `Seu acesso ao curso ${curso} termina em ${quando} (${faltam}).`;
  const como = fim
    ? `Para voltar a estudar, renove por mais ${meses} meses: ${renovar}`
    : `Para continuar estudando, renove por mais ${meses} meses: ${renovar}`;
  const soma = fim
    ? 'Seu progresso fica guardado na conta e volta inteiro quando você renovar.'
    : `Renovar antes não perde nenhum dia: os ${meses} meses são somados ao prazo que ainda resta.`;

  const text = [
    ola,
    '',
    abertura,
    '',
    como,
    soma,
    '',
    'Não há renovação automática: nada é cobrado sem o seu pedido.',
    '',
    suporte ? `Qualquer dúvida, responda esta mensagem ou escreva para ${suporte}.` : null,
    '',
    assinatura
  ].filter(l => l !== null).join('\n');

  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p><strong>${escapar(abertura)}</strong></p>`,
    `<p><a href="${escapar(renovar)}">Renovar por mais ${escapar(meses)} meses</a></p>`,
    `<p>${escapar(soma)}</p>`,
    '<p>Não há renovação automática: nada é cobrado sem o seu pedido.</p>',
    suporte ? `<p>Qualquer dúvida, responda esta mensagem ou escreva para ${escapar(suporte)}.</p>` : '',
    `<p>${escapar(assinatura)}</p>`
  ].join('');

  const subject = fim
    ? `Seu acesso terminou - ${curso}`
    : `Seu acesso termina em ${dias} ${Number(dias) === 1 ? 'dia' : 'dias'} - ${curso}`;
  return { subject, text, html };
}

/**
 * Os lembretes dos primeiros dias depois da compra (23/10/2026, plano de
 * marketing, oportunidade 0; ver worker/src/ativacao.js). Aviso de serviço
 * contratado, como o de fim de acesso: não é propaganda, não fala de preço nem
 * oferece outro produto. Três marcos, cada um uma vez por compra:
 *   d1  um dia depois, se nenhuma lição foi concluída;
 *   d3  três dias depois, se ainda nenhuma;
 *   d7  uma semana depois, se a pessoa não estuda há mais de 3 dias.
 * Textos aprovados pelo dono no PR que os criou.
 */
export function mensagemDeAtivacao({ nome: cru, curso, marco, concluidas, inicio, primeira, painel, marca, suporte }) {
  const nome = nomeSeguro(cru);
  const ola = nome ? `Oi, ${nome}.` : 'Oi.';
  const assinatura = marca || 'Hebraico Fluente';
  const feitas = Number(concluidas) || 0;
  const fecho = 'Estes lembretes são só três, nos primeiros dias depois da compra.';
  const ajuda = suporte
    ? `Se algo travou (a entrada em outro aparelho, por onde começar), responda esta mensagem ou escreva para ${suporte}.`
    : 'Se algo travou (a entrada em outro aparelho, por onde começar), responda esta mensagem.';

  let subject; let corpo; let link; let rotulo;
  if (marco === 'd1') {
    subject = 'Sua primeira letra leva dez minutos';
    corpo = [
      `Seu acesso ao curso ${curso} está liberado.`,
      'O jeito mais simples de começar é a Aula 0, que mostra como o hebraico funciona, e depois a primeira letra, o Álef, que leva cerca de dez minutos.'
    ];
    link = inicio; rotulo = 'Começar pela Aula 0';
  } else if (marco === 'd3') {
    subject = 'Ficou alguma dúvida para começar?';
    corpo = [
      `O seu curso ${curso} ainda não tem nenhuma lição concluída.`,
      'Às vezes o que segura é uma coisa pequena. A primeira letra é o Álef, e com a letra seguinte, o Mem, você já lê a primeira palavra.',
      ajuda
    ];
    link = primeira; rotulo = 'Abrir a primeira letra';
  } else {
    subject = feitas > 0 ? 'Continue de onde você parou' : 'Uma letra hoje?';
    corpo = feitas > 0
      ? [
          `Você já concluiu ${feitas} ${feitas === 1 ? 'lição' : 'lições'} do curso ${curso}.`,
          'O curso guarda onde você parou, neste e em qualquer outro aparelho em que você entrar.'
        ]
      : [
          `Faz uma semana que o seu acesso ao curso ${curso} foi liberado.`,
          'Uma letra por vez: cada uma leva cerca de dez minutos.',
          ajuda
        ];
    link = feitas > 0 ? painel : primeira; rotulo = feitas > 0 ? 'Continuar o curso' : 'Abrir a primeira letra';
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

/**
 * O lembrete para estudar (worker/src/lembrete.js): só para quem pediu em Sua
 * conta, no máximo um por dia, e nunca mais de três seguidos sem estudo. O
 * texto não cobra, não fala em sequência perdida nem em prazo: diz que hoje
 * ainda não teve hebraico, oferece o caminho curto e explica como parar.
 */
export function mensagemDeLembrete({ nome: cru, painel, praticar, sair, marca }) {
  const nome = nomeSeguro(cru);
  const ola = nome ? `Oi, ${nome}.` : 'Oi.';
  const assinatura = marca || 'Hebraico Fluente';
  const subject = 'Dez minutos de hebraico hoje?';
  const corpo = [
    'Hoje ainda não teve hebraico por aqui. Uma letra leva cerca de dez minutos, e o curso guarda onde você parou.',
    `Se o dia está curto, uma rodada em Praticar também conta: ${praticar}`
  ];
  const rotulo = 'Continuar de onde parei';
  const fecho = 'Você recebe este e-mail porque pediu o lembrete em Sua conta. Depois de três lembretes sem estudo, eles param sozinhos até você voltar.';
  const saida = `Para não receber mais: ${sair}`;
  const text = [ola, '', ...corpo.flatMap(l => [l, '']), `${rotulo}: ${painel}`, '', fecho, saida, '', assinatura].join('\n');
  const html = [
    `<p>${escapar(ola)}</p>`,
    `<p>${escapar(corpo[0])}</p>`,
    `<p>Se o dia está curto, <a href="${escapar(praticar)}">uma rodada em Praticar</a> também conta.</p>`,
    `<p><a href="${escapar(painel)}">${escapar(rotulo)}</a></p>`,
    `<p><small>${escapar(fecho)} <a href="${escapar(sair)}">Não quero mais o lembrete</a>.</small></p>`,
    `<p>${escapar(assinatura)}</p>`
  ].join('');
  return { subject, text, html };
}

/**
 * Um alerta operacional para o dono (worker/src/alertas.js e o estorno que
 * travou). Texto puro, curto, sem dado de aluno além do que o dono precisa
 * para agir. `linhas` é uma lista; string vazia vira parágrafo.
 */
export function mensagemDeAlerta({ assunto, linhas }) {
  const text = [...linhas, '', 'Hebraico Fluente - alerta automático'].join('\n');
  const html = linhas.filter(l => l !== '').map(l => `<p>${escapar(l)}</p>`).join('')
    + '<p><small>Hebraico Fluente - alerta automático</small></p>';
  return { subject: `[Hebraico Fluente] ${assunto}`, text, html };
}

/**
 * A data em português, no fuso de quem compra.
 *
 * `toLocaleDateString` não é usado de propósito: o Worker roda em UTC, e um
 * acesso que vence às 23h de uma terça em São Paulo sairia escrito como
 * quarta - um dia a mais numa data que a pessoa vai cobrar. O Brasil não tem
 * horário de verão desde 2019, então o deslocamento fixo de três horas é
 * exato, e não uma aproximação.
 */
export function dataBR(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return '';
  const d = new Date(Number(ms) - 3 * 60 * 60 * 1000);
  const dois = n => String(n).padStart(2, '0');
  return `${dois(d.getUTCDate())}/${dois(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Data e hora, no mesmo fuso de `dataBR` - para o pedido de desistência,
 *  em que a HORA é o que prova que foi dentro do prazo. */
export function dataHoraBR(ms) {
  const dia = dataBR(ms);
  if (!dia) return '';
  const d = new Date(Number(ms) - 3 * 60 * 60 * 1000);
  const dois = n => String(n).padStart(2, '0');
  return `${dia} às ${dois(d.getUTCHours())}:${dois(d.getUTCMinutes())} (horário de Brasília)`;
}

/** Centavos em reais, como o site escreve. */
export function reaisBR(centavos, moeda = 'BRL') {
  const v = Number(centavos || 0) / 100;
  /* O site em inglês cobra em dólar (Paddle): "$47.00", no formato de lá. */
  if (moeda === 'USD') return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const n = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moeda === 'BRL' ? `R$ ${n}` : `${n} ${moeda}`;
}

/* "Oi, Ana." só com um nome que é nome (lib/nome.js, SEC-A-003); qualquer
   outra coisa vira "Oi." - o campo é escrito por quem cria a conta, e o
   e-mail sai assinado pelo nosso domínio. */
function saudacao(nome) {
  const n = nomeSeguro(nome);
  return n ? `Oi, ${n}.` : 'Oi.';
}

/** O nome do aluno entra no HTML. Um nome com `<` não pode virar marcação. */
export function escapar(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

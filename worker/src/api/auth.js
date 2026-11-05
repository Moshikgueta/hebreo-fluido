/* Entrar, criar conta, sair, e quem sou eu.
 * ─────────────────────────────────────────────────────────────────────────
 * O que merece atenção aqui não é o caminho feliz.
 *
 * · Criar conta e entrar demoram O MESMO TEMPO quando o e-mail não existe.
 *   `fakeVerify` queima exatamente as mesmas iterações do caminho real. Sem
 *   isso, a diferença de tempo de resposta responde "esse endereço é
 *   cliente?" - e a mensagem de erro genérica, que existe justamente para não
 *   responder, vira decoração.
 *
 * · O freio conta por IP E por e-mail. Só por IP, uma rede grande inteira
 *   apanha junto; só por e-mail, um ataque distribuído passa por baixo.
 *
 * · Criar conta com um e-mail que já existe responde 'email-taken', e isso é
 *   uma escolha consciente: ela ENTREGA que o endereço tem conta. A
 *   alternativa (mandar um e-mail dizendo "alguém tentou criar conta com o
 *   seu endereço") exige uma fila de mensagens que esta plataforma ainda não
 *   tem, e a versão silenciosa - fingir que criou - deixaria o comprador numa
 *   conta que não é dele, no meio de um pagamento. Entre vazar a existência
 *   do endereço e perder uma compra, escolhemos o primeiro, e está escrito.
 */

import { fail, json, notSignedIn, readJson } from '../lib/http.js';
import {
  b64url, fakeVerify, hashPassword, itersFor, sha256hex, timingSafeEqual, verifyPassword
} from '../lib/crypto.js';
import {
  clearSessionCookie, makeSessionCookie, readSession
} from '../lib/session.js';
import { isSandbox, tokenFormato, vendedorFormato } from '../lib/mercadopago.js';
import { ehSandbox, paddlePronto, tokenDoCliente } from '../lib/paddle.js';
import { ehTeste as stripeDeTeste, stripePronto } from '../lib/stripe.js';
import { nomeSeguro } from '../lib/nome.js';
import { exigirAdmin, isAdmin } from '../lib/admin.js';
import { avisarRetirada } from './depoimentos.js';
import { versaoAtual } from '../lib/versoes.js';
import { novoAparelho, aparelhoValido, esquecerAparelhos } from '../lib/aparelhos.js';
import empresa from '../../../data/empresa.json';
import { mailReady, mensagemDeConvitePendente, sendMail } from '../lib/mail.js';
import { mensagens } from '../lib/mensagens.js';
import { lembreteLigado } from './lembrete.js';
import { idiomaDoWorker, marcaDoIdioma } from '../lib/idioma.js';
import {
  activeEntitlements, bumpSessionVersion, lembreteQuer, novidadesQuer, changePassword, createAccount, deleteAccount,
  emailVerified, estourou, findAccountByEmail, findAccountById, invitesPendentes, log,
  normalizeEmail, registrarAcesso, reservarVaga, resetCreate, resetFind, resetUse, setPasswordHash, throttled,
  ultimoEnvioDeSenha, verifyConfirm, verifyCreate, verifyFromReset, ultimoBatimento
} from '../lib/db.js';

const MIN_PASSWORD = 8;

/**
 * Um e-mail plausível, dentro de limites.
 *
 * O formato é o de sempre. Os limites são o que faltava: 254 caracteres é o
 * teto do próprio padrão, e um endereço de oito mil caracteres virava chave
 * de freio e linha de trilha; um caractere de controle no meio criava uma
 * segunda conta que se lê exatamente como a primeira em toda tela do sistema.
 */
export const emailOk = s => {
  const v = String(s || '').trim();
  return v.length >= 6 && v.length <= 254
    && !/[\u0000-\u001f\u007f]/.test(v)
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
};

/**
 * De onde a requisição veio, para as chaves de freio.
 *
 * Só `CF-Connecting-IP`: a Cloudflare o escreve na borda e ele não é
 * forjável por quem chama. `X-Forwarded-For` era o reserva e é exatamente o
 * cabeçalho que quem chama controla - um reserva que só entraria quando a
 * borda não estivesse lá, e aí seria uma porta.
 *
 * IPv6 é contado pelo /64, que é o bloco que um único cliente costuma ter
 * inteiro para si: contar por endereço dava a quem tem um bloco desses um
 * suprimento infinito de chaves novas.
 */
export const ip = request => {
  const raw = (request.headers.get('CF-Connecting-IP') || '').trim();
  if (!raw) return 'unknown';
  if (!raw.includes(':')) return raw;
  /* IPv4 embutido em IPv6 (`::ffff:203.0.113.5`) é o IPv4. */
  const v4 = raw.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) return v4[1];
  /* A Cloudflare manda a forma comprimida (`2001:db8::1`). Expande o `::`
     antes de cortar, senão um endereço com um grupo zero no prefixo
     entregava menos de quatro hextetos e a chave ficava diferente para
     vizinhos do mesmo /64 - que era o que se queria juntar. */
  const [cabeca, cauda = ''] = raw.split('::');
  const h = cabeca ? cabeca.split(':') : [];
  const t = cauda ? cauda.split(':') : [];
  const zeros = Math.max(0, 8 - h.length - t.length);
  const cheio = [...h, ...Array(zeros).fill('0'), ...t]
    .map(x => x.toLowerCase().padStart(4, '0'));
  return cheio.slice(0, 4).join(':') + '::/64';
};

/**
 * O IP inteiro, como a Cloudflare o entrega - para o registro de acesso do
 * Marco Civil, que precisa identificar a conexão, e não para os freios, que
 * agrupam IPv6 por /64 (ver `ip` acima). Mesma fonte, a única que quem chama
 * não escolhe.
 */
export const ipCompleto = request =>
  (request.headers.get('CF-Connecting-IP') || '').trim() || 'desconhecido';

/* Uma hora. Curto o bastante para que um link esquecido numa caixa de entrada
   compartilhada não seja uma chave permanente, e longo o bastante para
   atravessar um almoço - a pessoa pede, sai, e volta. Quinze minutos parece
   mais seguro e só produz um segundo pedido. */
export const RESET_TTL_MIN = 60;

/* ── o teto da hora ────────────────────────────────────────────────────────
 * Auditoria de 24/09/2026. O plano gratuito do D1 aceita 100.000 linhas
 * escritas por dia, e os freios por minuto sozinhos deixavam uma máquina só
 * gastar umas 290 linhas por minuto em pedidos anônimos, todos dentro do
 * limite - login errado, cadastro, esqueci a senha, saúde. Medido contra o D1
 * local: a cota do dia acabava em seis horas, e daí até 00:00 UTC toda
 * escrita falhava - login, cadastro, pagamento.
 *
 * Os tetos por hora abaixo seguram isso sem mexer em quem usa o site de
 * verdade: ninguém cria vinte contas, erra vinte senhas ou pede dez links de
 * senha nova por hora de uma mesma casa. Cada um é conferido ANTES do freio do
 * minuto, porque um pedido barrado pelo teto da hora não pode custar a
 * escrita do freio do minuto. E `throttled` lê antes de gravar: estourado, o
 * teto também não grava nada.
 */
const HORA = 3_600_000;

/**
 * As rotas de manutenção da conta - trocar a senha, apagar, confirmar o
 * e-mail, pedir o link de novo - exigem sessão, e sessão é de graça: criar
 * conta não custa nada. Então os freios por CONTA não bastam, porque quem
 * quer gastar a cota cria mais contas. Este é o teto por ENDEREÇO, somado
 * entre as quatro rotas: vinte por hora é muito mais do que alguém faz na
 * própria conta numa tarde.
 */
const freioDaConta = async (env, request) =>
  throttled(env, `conta-ip-h:${ip(request)}`, 20, HORA);
const RESET_TTL = RESET_TTL_MIN * 60_000;

/**
 * O endereço do site, para montar o link que vai no e-mail.
 *
 * Sai de `SITE_ORIGIN`, e não do Host da requisição, por um motivo específico:
 * o Host é um cabeçalho que quem chama escolhe. Montar um link de recuperação
 * a partir dele é o clássico "host header poisoning" - um pedido forjado com
 * `Host: site-do-atacante` faz A NOSSA plataforma mandar, para o endereço
 * certo do dono da conta, um e-mail legítimo cujo link entrega o token a
 * outra pessoa.
 *
 * A volta para o Host só acontece se SITE_ORIGIN não existir, e aí é melhor
 * do que um link quebrado.
 */
const siteOrigin = (env, request) =>
  String((env && env.SITE_ORIGIN) || '').replace(/\/+$/, '') || new URL(request.url).origin;

/** O que o app recebe como sessão. Os direitos vêm do BANCO, sempre - o
 *  cookie não os carrega, justamente para que um estorno feche na hora.
 *
 *  `emailVerified` é `null` quando não dá para saber (a tabela de
 *  confirmação ainda não foi criada): a tela só pede confirmação diante de um
 *  `false` de verdade. */
async function sessionBody(env, account) {
  return {
    account: {
      id: String(account.id),
      name: account.name || '',
      email: account.email,
      createdAt: new Date(account.created_at).toISOString(),
      emailVerified: await emailVerified(env, account.id, account.email),
      /* Pediu o e-mail do próximo curso? Ver api/novidades.js. */
      novidades: await novidadesQuer(env, account.id),
      /* Pediu o lembrete para estudar? Só existe com ele ligado (api/lembrete.js). */
      ...(lembreteLigado(env) ? { lembrete: await lembreteQuer(env, account.id) } : {}),
      /* Conta de ADMIN_EMAILS: o app abre todos os módulos de Raízes para
         revisar (moduloAberto em lib/raizes.ts). Não dá acesso a nada: o
         portão continua exigindo o direito do produto no banco. */
      ...(isAdmin(account, env) ? { revisor: true } : {})
    },
    entitlements: await activeEntitlements(env, account.id)
  };
}

/* ── um presente esperando por este endereço ───────────────────────────────
 * Avisa o DONO, e não libera nada.
 *
 * Antes, um convite pendente virava acesso no cadastro. O furo (F-18 da
 * auditoria) é que o convite é endereçado a um e-mail que ainda NÃO tem
 * conta, e a única coisa exigida para resgatá-lo era digitar esse e-mail num
 * formulário de cadastro - então quem soubesse do presente chegava primeiro
 * e o levava.
 *
 * Quem sabe para quem o presente foi dado é o dono, e ele já roda `liberar`
 * em todo presente. Então o cadastro avisa, ele confere, e o `liberar`
 * seguinte concede direto, porque a conta agora existe. Um presente legítimo
 * custa uma mensagem a mais; um roubado custa o curso.
 *
 * Nunca derruba o cadastro nem o login: o que falha aqui é um aviso.
 */
async function avisarConvitePendente(env, ctx, account, email) {
  const pendentes = await invitesPendentes(env, email);
  if (!pendentes.length) return;

  /* Um aviso por dia por endereço. Sem isto, quem tem convite pendente e
     entra dez vezes manda dez e-mails iguais para o dono - e o décimo é o
     que ele deixa de ler. */
  if (await throttled(env, `convite-aviso:${email}`, 1, 24 * 3_600_000)) return;

  const cursos = pendentes.map(p => p.course_slug);
  /* A trilha guarda o id da conta e os cursos, nunca o endereço: ela é lida
     num resumo do Actions, que num repositório público é público. O endereço
     vai só no e-mail, que tem um destinatário só. */
  await log(env, account.id, 'convite-aguardando', cursos.join(' '));

  const destino = String((env && env.SUPPORT_EMAIL) || '').trim();
  if (!mailReady(env) || !destino) {
    /* Sem provedor de e-mail o aviso fica na trilha e o presente espera.
       Falha fechada: ninguém ganha acesso porque um e-mail não saiu.
       `Actions → Acesso → consultar` mostra o convite pendente. */
    console.error('convite', 'sem e-mail para avisar o dono', cursos.join(' '));
    return;
  }

  const msg = mensagemDeConvitePendente({
    email: account.email,
    nome: account.name || '',
    cursos,
    marca: marcaDoIdioma(idiomaDoWorker(env)),
    painel: 'GitHub → Actions → Acesso → liberar'
  });

  const entregar = async () => {
    const r = await sendMail(env, { to: destino, ...msg });
    if (!r.ok) console.error('mail', 'convite', r.motivo, r.detalhe || '');
  };
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(entregar());
  else await entregar();
}

/* ── confirmar o e-mail ─────────────────────────────────────────────────────
 * Sete dias de prazo, e não uma hora como a senha: este link só funciona com
 * a conta aberta no navegador (ver `verify`), então um link vazado não
 * confirma nada para quem não tem a senha. O prazo longo é para quem abre o
 * e-mail no fim de semana.
 */
export const VERIFY_TTL_DIAS = 7;
const VERIFY_TTL = VERIFY_TTL_DIAS * 86_400_000;

/* A prova do aceite: quando e qual versão dos Termos (desde 01/10/2026, o
   código do texto publicado, de data/politicas-versoes/atual.json; antes, a
   data `politicas.atualizadoEm`). Tabela à parte, `aceites`, que o schema.sql cria. Uma
   falha aqui não impede o cadastro: a pessoa aceitou na tela, e perder a
   conta por um erro do banco seria pior - o erro vai para o log. */
async function registrarAceite(env, accountId) {
  try {
    /* O código da versão do texto (LEGAL-104), com a cópia fixa em
       /termos/v/<versao>/; sem ele, a data, como antes. */
    const versao = versaoAtual('termos', env) || String(empresa.politicas?.atualizadoEm || ''), agora = Date.now();
    const inserir = documento => env.DB.prepare(
      'INSERT INTO aceites (account_id, documento, versao, aceito_em) VALUES (?, ?, ?, ?)'
    ).bind(accountId, documento, versao, agora);
    /* `idade`: a declaração "18 anos ou mais, ou responsável". */
    await env.DB.batch([inserir('termos'), inserir('idade')]);
  } catch (e) {
    console.error('aceite dos termos', e && e.stack || e);
  }
}

/**
 * Manda o link de confirmação. Nunca lança: quem chama está no meio de um
 * cadastro, e um e-mail que não saiu não pode derrubar a conta que acabou de
 * nascer. Devolve se o link foi GRAVADO (o envio sai por `waitUntil`).
 *
 * `.invalid` é pulado: é um domínio reservado que nunca recebe nada (RFC
 * 2606), e é o das contas de teste da publicação. Mandar para lá é só uma
 * devolução a mais na reputação do remetente.
 */
async function enviarConfirmacao(env, ctx, request, account) {
  if (!mailReady(env) || /\.invalid$/i.test(account.email)) return false;

  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  try {
    await verifyCreate(env, {
      accountId: account.id, email: account.email,
      tokenHash: await sha256hex(token), ttlMs: VERIFY_TTL
    });
  } catch (e) {
    /* A tabela ainda não existe. O cadastro segue; `/api/health` mostra. */
    console.error('verificacao', e && e.message || e);
    return false;
  }

  const site = siteOrigin(env, request);
  const msg = mensagens(idiomaDoWorker(env)).confirmacao({
    /* Sem nome, sempre: este e-mail vai a um endereço que ainda não provou
       ser de quem criou a conta, e o nome é escrito por quem a criou
       (SEC-A-003, lib/nome.js). */
    nome: '',
    link: `${site}/confirmar-email/?token=${encodeURIComponent(token)}`,
    dias: VERIFY_TTL_DIAS,
    esqueci: `${site}/esqueci-senha/`,
    marca: marcaDoIdioma(idiomaDoWorker(env)),
    suporte: env.SUPPORT_EMAIL || ''
  });

  const entregar = async () => {
    const r = await sendMail(env, { to: account.email, ...msg });
    await log(env, account.id, r.ok ? 'confirmacao-enviada' : 'confirmacao-falhou',
      r.ok ? '' : `${r.motivo}${r.detalhe ? ': ' + r.detalhe : ''}`);
    if (!r.ok) console.error('mail', 'confirmacao', r.motivo, r.detalhe || '');
  };
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(entregar());
  else await entregar();
  return true;
}

export async function signup({ request, env, ctx }) {
  /* O freio por IP antes de ler o corpo: quem já estourou não ganha nem a
     leitura. */
  /* Dez por hora por endereço. Era dez por MINUTO, e o teto da hora o
     tornou redundante - e cada freio que passa é uma linha escrita. */
  if (await throttled(env, `signup-h:${ip(request)}`, 10, HORA)) return fail('rate-limited-hora', 429);

  const body = await readJson(request);
  if (!body || typeof body !== 'object') return fail('server');
  if (typeof body.email !== 'string' || typeof body.password !== 'string') return fail('invalid-email');

  const email = normalizeEmail(body.email);
  const password = body.password;
  /* Um nome que não é nome (link, domínio, dígitos, um parágrafo) não é
     recusado: a conta nasce sem nome, e a tela mostra o e-mail. Recusar
     poria um erro na frente de quem só quer estudar; guardar poria o texto
     num e-mail do nosso domínio (SEC-A-003, lib/nome.js). */
  const name = nomeSeguro(body.name);

  if (!emailOk(email)) return fail('invalid-email');
  if (password.length < MIN_PASSWORD || password.length > 1024) return fail('weak-password');
  /* O aceite dos Termos de Uso (30/09/2026, pedido do dono): uma caixa de
     marcar no formulário, e não mais uma frase embaixo do botão. O servidor
     confere também - quem chama a API direto não cria conta sem aceitar. */
  if (body.aceitouTermos !== true) return fail('termos');
  /* A declaração de idade (30/09/2026): a compra é de maiores de 18 anos ou
     do responsável por quem vai estudar (Termos, artigo 3; Código Civil,
     arts. 3º a 5º). Estava só como frase no checkout; o cadastro, que já
     coleta nome e e-mail, não pedia nada. */
  if (body.declarouIdade !== true) return fail('idade');

  const existing = await findAccountByEmail(env, email);
  if (existing) {
    await fakeVerify(password, itersFor(env));   // mesmo custo do caminho que cria
    return fail('email-taken', 409);
  }

  const { hash, salt, iterations } = await hashPassword(password, null, itersFor(env));
  const account = await createAccount(env, { email, name, hash, salt, iterations, idioma: idiomaDoWorker(env) });
  /* O id já identifica a conta. O e-mail não vai para a trilha: a trilha é
     lida por operadores num resumo do Actions, e é o que sobra depois de a
     conta ser apagada. */
  await log(env, account.id, 'signup');
  await registrarAceite(env, account.id);
  await registrarAcesso(env, { accountId: account.id, evento: 'cadastro', ip: ipCompleto(request) });

  /* Um presente esperando por este endereço avisa o dono. Não libera nada:
     ver a nota em `avisarConvitePendente`. A pessoa não é informada, e isso
     é deliberado - "há um presente reservado para este endereço" é a
     confirmação que um impostor usaria para saber que acertou o alvo. */
  await avisarConvitePendente(env, ctx, account, email);

  /* O link de confirmação. Não bloqueia nada - a conta funciona inteira sem
     ele, inclusive a compra (decisão do dono, 24/09/2026). O que ele faz é
     chegar à dona do endereço, que fica sabendo se foi outra pessoa. */
  await enviarConfirmacao(env, ctx, request, account);

  return json(await sessionBody(env, account), 200,
    { 'Set-Cookie': await makeSessionCookie(env, account, await novoAparelho(env, account.id)) });
}

/**
 * POST /api/auth/verify/send - "não chegou, manda de novo".
 *
 * Exige sessão: é a conta pedindo para confirmar o PRÓPRIO endereço, e sem
 * sessão isto viraria um jeito anônimo de encher a caixa de entrada de
 * alguém. O freio é por conta, no minuto e na hora.
 */
export async function verifySend({ request, env, ctx }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();

  if (await emailVerified(env, account.id, account.email)) return json({ ok: true, jaConfirmado: true });

  if (await freioDaConta(env, request)) return fail('rate-limited-hora', 429);
  if (await throttled(env, `verif-h:${account.id}`, 5, HORA)) return fail('rate-limited-hora', 429);
  if (await throttled(env, `verif:${account.id}`, 2)) return fail('rate-limited', 429);

  if (!await enviarConfirmacao(env, ctx, request, account)) return fail('server', 503);
  return json({ ok: true });
}

/**
 * POST /api/auth/verify - o link do e-mail, aberto.
 *
 * Exige SESSÃO, e da mesma conta que pediu o link. É o que impede o golpe que
 * a confirmação existe para fechar de virar outro: se o link confirmasse
 * sozinho, a dona de um endereço usado por outra pessoa clicaria por reflexo
 * e CONFIRMARIA a conta do impostor. Sem a senha dele, ela não tem a sessão, e
 * o clique não faz nada - a tela pede login.
 *
 * Link errado, vencido, de outra conta ou já usado respondem igual, `bad-token`.
 * Um segundo clique no mesmo link, com o e-mail já confirmado, responde com a
 * sessão: para quem clicou duas vezes, deu certo.
 */
export async function verify({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();

  if (await freioDaConta(env, request)) return fail('rate-limited-hora', 429);
  if (await throttled(env, `verif-ok-h:${account.id}`, 10, HORA)) return fail('rate-limited-hora', 429);

  const body = await readJson(request);
  if (!body) return fail('server');
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token || token.length > 200) return fail('bad-token', 400);

  let ok = false;
  try {
    ok = await verifyConfirm(env, {
      tokenHash: await sha256hex(token), accountId: account.id, email: account.email
    });
  } catch {
    return fail('server', 503);
  }

  if (ok) await log(env, account.id, 'email-confirmado');
  else if (!await emailVerified(env, account.id, account.email)) return fail('bad-token', 400);

  return json(await sessionBody(env, account));
}

export async function login({ request, env, ctx }) {
  /* O freio por IP antes de ler o corpo, como no cadastro: quem já estourou
     não ganha nem a leitura. */
  const origem = ip(request);
  /* Vinte ERROS por hora por endereço, e sessenta tentativas por hora,
     certas ou erradas. Sem o segundo, entrar e sair em laço com a própria
     senha escrevia cinco linhas por volta sem nunca errar; quem tenta senhas
     para antes, no teto de erros, que é mais apertado.

     A primeira linha só LÊ, para poupar a escrita de quem já estourou (um
     freio que grava a cada tentativa barrada é o próprio amplificador). Ela
     pode negar, nunca autorizar: quem autoriza é a reserva atômica mais
     abaixo (SEC-A-002, auditoria de 01/10/2026). */
  if (await estourou(env, `login-falhas-h:${origem}`, 20, HORA)) return fail('rate-limited-hora', 429);
  if (await throttled(env, `login-h:${origem}`, 60, HORA)) return fail('rate-limited-hora', 429);

  /* Os freios de ERRO, e o que cada um conta importa.
     · por IP: 20 erros por hora - uma máquina tentando senhas.
     · por e-mail E IP: 5 erros por minuto - a mesma máquina contra uma
       conta específica.
     · por e-mail, de qualquer lugar: 30 erros por minuto - o teto para quem
       troca de endereço a cada tentativa.
     Cada um RESERVA a vaga antes de verificar a senha (`reservarVaga`: a
     escrita atômica decide, então quarenta tentativas em paralelo não são
     quarenta avaliações - antes eram, e o teto de 5 por minuto não existia
     para uma rajada). Quem acerta a senha DEVOLVE as vagas: o teto continua
     contando só as falhas. Uma versão anterior contava tudo, com teto de 8, e nove
     pedidos por minuto de um estranho trancavam a dona da conta para fora com
     a senha certa na mão. Agora o estranho tranca a si mesmo. */
  const vagas = [];
  const devolverVagas = () => Promise.all(vagas.map(v => v.devolver()));
  const reservar = async (chave, teto, janela) => {
    const v = await reservarVaga(env, chave, teto, janela);
    vagas.push(v);
    return !v.negado;
  };

  if (!await reservar(`login-falhas-h:${origem}`, 20, HORA)) {
    await devolverVagas();
    return fail('rate-limited-hora', 429);
  }

  const body = await readJson(request);
  if (!body) {
    await devolverVagas();
    return fail('server');
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    /* Não chegou a tentar senha nenhuma: não conta como erro. */
    await devolverVagas();
    return fail('bad-credentials', 401);
  }
  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!await reservar(`login:${email}:${origem}`, 5) || !await reservar(`login:${email}`, 30)) {
    await devolverVagas();
    return fail('rate-limited', 429);
  }

  const account = await findAccountByEmail(env, email);
  const ok = account
    ? await verifyPassword(password, account.pass_salt, account.pass_hash, account.pass_iter)
    : await fakeVerify(password, itersFor(env));

  if (!account || !ok) {
    /* As vagas reservadas ficam: este é o erro que elas contam. */
    /* Na trilha, só a falha contra uma conta que EXISTE - essa é a que diz
       alguma coisa ("alguém está tentando a senha da fulana"). Um e-mail
       inventado não tem de quem ser, e registrá-lo eram três linhas escritas
       (a linha, o índice e o contador do AUTOINCREMENT) por tentativa. */
    if (account) await log(env, account.id, 'login-failed');
    return fail('bad-credentials', 401);
  }

  /* Acertou: as vagas voltam, e o teto de erros não sabe desta entrada. */
  await devolverVagas();

  /* Subiu o custo do hash? Esta conta se atualiza sozinha, agora, com a senha
     que acabou de ser digitada - o único instante em que ela existe em claro.
     Sem isto, elevar PBKDF2_ITERATIONS só protegeria quem se cadastrasse
     depois, e as contas antigas ficariam para trás para sempre.

     Só quando o alvo é MAIOR: nunca enfraquece um hash existente. E é feito
     depois de responder ao aluno estar garantido - se falhar, ele entra do
     mesmo jeito e a próxima vez tenta de novo. */
  const target = itersFor(env);
  if (Number(account.pass_iter) < target) {
    try {
      const next = await hashPassword(password, null, target);
      await setPasswordHash(env, account.id, next);
      await log(env, account.id, 'rehash', `${account.pass_iter} → ${target}`);
    } catch {
      /* Custo de CPU estourado, ou o banco fora. O login não pode cair por
         causa de uma melhoria opcional. */
    }
  }

  /* O registro de acesso do Marco Civil (art. 15): quem entrou, de onde e
     quando. Ver a tabela em worker/schema.sql. */
  await registrarAcesso(env, { accountId: account.id, evento: 'entrada', ip: ipCompleto(request) });

  /* Rede de segurança para um convite que ficou pendente: hoje `liberar`
     concede direto quando a conta existe, então isto cobre linhas antigas e
     o caso de alguém ter criado o convite à mão. Avisa o dono, não libera. */
  await avisarConvitePendente(env, ctx, account, email);

  return json(await sessionBody(env, account), 200,
    { 'Set-Cookie': await makeSessionCookie(env, account, await novoAparelho(env, account.id)) });
}

export async function logout({ request, env }) {
  /* Sair de verdade: além de limpar o cookie do navegador, invalida o valor
     dele no servidor. Antes só o navegador esquecia; o cookie continuava
     valendo por sete dias para quem o tivesse copiado - de um computador
     compartilhado, de uma captura de tela, de um log. */
  const account = request && env ? await requireAccount(request, env) : null;
  if (account) {
    await bumpSessionVersion(env, account.id);
    await esquecerAparelhos(env, account.id);
    await log(env, account.id, 'logout');
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie });
}

/* ── esqueci minha senha ──────────────────────────────────────────────────
 *
 * Esta rota responde `{ ok: true }` para TUDO: e-mail que existe, e-mail que
 * não existe, e-mail mal escrito. É a decisão central aqui, e ela custa uma
 * tela menos precisa em troca de não transformar o formulário de recuperação
 * numa lista de quem é cliente - que é exatamente o que um "esse e-mail não
 * está cadastrado" entrega, a qualquer pessoa, sem senha nenhuma.
 *
 * O envio sai por `ctx.waitUntil`, fora do caminho da resposta, e isso
 * também não é detalhe de desempenho: mandar um e-mail leva algumas centenas
 * de milissegundos, e não mandar leva zero. Se a resposta esperasse pelo
 * envio, o RELÓGIO responderia a pergunta que o texto se recusa a responder.
 */
export async function forgot({ request, env, ctx }) {
  /* Freio por IP antes de ler o corpo. */
  if (await throttled(env, `forgot-ip-h:${ip(request)}`, 10, HORA)) return fail('rate-limited-hora', 429);

  const body = await readJson(request);
  if (!body) return fail('server');

  const email = normalizeEmail(body.email);

  /* Freio por e-mail: é o que impede usar esta rota para encher a caixa de
     entrada de alguém - o pedido é anônimo, e sem ele bastaria um laço. */
  if (await throttled(env, `forgot:${email}`, 3)) return fail('rate-limited', 429);

  const sempre = json({ ok: true, enviado: true });
  if (!emailOk(email)) return sempre;

  /* O teto da hora. Três por minuto são cento e oitenta por hora numa caixa
     de entrada, cada um assinado pelo nosso domínio - o bastante para a
     vítima marcar tudo como spam e a reputação do remetente ir junto. Cinco
     por hora, e a resposta continua IGUAL: um 429 aqui diria que o endereço
     existe, e é justamente o que esta rota se recusa a dizer. */
  if (await throttled(env, `forgot-h:${email}`, 5, 3_600_000)) return sempre;

  const account = await findAccountByEmail(env, email);
  if (!account) {
    /* Nada que identifique: quem digitou um endereço errado aqui não é
       cliente e não deu o endereço para guardar. */
    await log(env, null, 'forgot-sem-conta');
    return sempre;
  }

  /* 32 bytes de aleatoriedade do sistema. Vai em claro na URL do e-mail; o
     banco guarda só o sha256 dele (ver worker/schema.sql). */
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256hex(token);
  await resetCreate(env, {
    accountId: account.id, tokenHash, ttlMs: RESET_TTL, ip: ip(request)
  });

  const link = `${siteOrigin(env, request)}/nova-senha/?token=${encodeURIComponent(token)}`;
  const entregar = async () => {
    const msg = mensagens(idiomaDoWorker(env)).recuperacao({
      /* O nome só com o e-mail já confirmado: antes disso, quem o escreveu
         pode não ser a dona do endereço que recebe (SEC-A-003). A consulta
         fica aqui dentro, fora do caminho da resposta, para o relógio não
         ganhar uma consulta a mais só quando a conta existe. */
      nome: await emailVerified(env, account.id, account.email) === true ? account.name || '' : '',
      link,
      minutos: RESET_TTL_MIN,
      marca: marcaDoIdioma(idiomaDoWorker(env)),
      suporte: env.SUPPORT_EMAIL || ''
    });
    const r = await sendMail(env, { to: account.email, ...msg });
    /* O resultado vai para a trilha nos dois casos. "A pessoa diz que não
       recebeu" é a pergunta mais comum deste fluxo, e sem este registro a
       resposta é um palpite. */
    /* No sucesso, nada: o id já diz para quem. Na falha, o motivo que a
       Resend devolveu - que é o que diz o que consertar, e não cita o
       destinatário. */
    await log(env, account.id, r.ok ? 'forgot-enviado' : 'forgot-falhou',
      r.ok ? '' : `${r.motivo}${r.detalhe ? ': ' + r.detalhe : ''}`);
    if (!r.ok) console.error('mail', r.motivo, r.status || '', r.detalhe || '');
  };

  /* `waitUntil` quando existe; sem ele (teste, runtime diferente) espera - o
     envio não pode simplesmente não acontecer porque o ambiente é outro. */
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(entregar());
  else await entregar();

  return sempre;
}

/* ── escolher a senha nova ─────────────────────────────────────────────── */

/**
 * Troca a senha a partir do token do e-mail, e já entra.
 *
 * Entrar na hora é deliberado: quem chegou aqui provou ter acesso à caixa de
 * entrada da conta e acabou de digitar uma senha. Mandar essa pessoa para a
 * tela de login para digitar tudo de novo é o passo em que ela desiste - e
 * não protege de nada, porque quem tem o token tem a conta.
 *
 * `bad-token` é a resposta para token errado, vencido, já usado e inexistente,
 * todos juntos. Separar os casos contaria ao visitante qual dos quatro é, o
 * que só ajuda quem está tentando adivinhar.
 */
export async function reset({ request, env }) {
  /* O token tem 32 bytes: adivinhar não é o risco, gastar a cota é. */
  if (await throttled(env, `reset-h:${ip(request)}`, 20, HORA)) return fail('rate-limited-hora', 429);

  const body = await readJson(request);
  if (!body) return fail('server');

  const token = String(body.token || '');
  const password = String(body.password || '');
  if (!token) return fail('bad-token', 400);
  if (password.length < MIN_PASSWORD) return fail('weak-password');

  const tokenHash = await sha256hex(token);
  const pedido = await resetFind(env, tokenHash);
  if (!pedido) return fail('bad-token', 400);

  /* Consome ANTES de trocar a senha. O `used_at IS NULL` dentro do UPDATE faz
     desta linha a corrida inteira: dois cliques simultâneos no mesmo link,
     um ganha. Trocar primeiro e marcar depois deixaria os dois passarem. */
  if (!(await resetUse(env, tokenHash))) return fail('bad-token', 400);

  const account = await findAccountById(env, pedido.account_id);
  if (!account) return fail('bad-token', 400);

  const novo = await hashPassword(password, null, itersFor(env));
  const atualizada = await changePassword(env, account.id, novo);
  await log(env, account.id, 'senha-redefinida');
  /* Redefinir já entra na conta (a resposta traz o cookie): é um acesso. */
  await registrarAcesso(env, { accountId: account.id, evento: 'senha-redefinida', ip: ipCompleto(request) });

  /* Quem chegou aqui abriu o link que foi para a caixa de entrada da conta:
     isso confirma o e-mail. É também o caminho da dona de um endereço usado
     por outra pessoa - e a troca de senha acima já derrubou a sessão de quem
     criou a conta. */
  await verifyFromReset(env, { accountId: account.id, email: account.email, resetHash: tokenHash });

  /* `changePassword` subiu a `session_version`, então todo cookie anterior
     morreu - inclusive o de quem eventualmente estivesse dentro da conta sem
     ser o dono. O cookie novo desta resposta é o único que vale. */
  return json(await sessionBody(env, atualizada), 200,
    { 'Set-Cookie': await makeSessionCookie(env, atualizada, await novoAparelho(env, atualizada.id)) });
}

/* ── trocar a senha já estando dentro ──────────────────────────────────── */

/**
 * Exige a senha atual, e não só a sessão.
 *
 * O motivo é um celular emprestado ou esquecido aberto: com a sessão
 * bastando, qualquer pessoa em frente a uma tela destrancada troca a senha e
 * fica com a conta. Com a senha atual, ela precisa saber o que já sabia.
 */
export async function password({ request, env }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();

  const body = await readJson(request);
  if (!body) return fail('server');

  const atual = String(body.current || '');
  const nova = String(body.password || '');

  if (await freioDaConta(env, request)) return fail('rate-limited-hora', 429);
  if (await throttled(env, `senha-h:${account.id}`, 10, HORA)) return fail('rate-limited-hora', 429);
  if (nova.length < MIN_PASSWORD) return fail('weak-password');

  const ok = await verifyPassword(atual, account.pass_salt, account.pass_hash, account.pass_iter);
  if (!ok) {
    await log(env, account.id, 'senha-atual-errada');
    return fail('bad-credentials', 401);
  }

  const novo = await hashPassword(nova, null, itersFor(env));
  const atualizada = await changePassword(env, account.id, novo);
  await log(env, account.id, 'senha-trocada');

  /* Um cookie novo na mesma resposta. Sem ele, quem acabou de trocar a senha
     com sucesso seria deslogado pela própria troca - a `session_version`
     subiu e o cookie do navegador é o da versão anterior. */
  /* O mesmo aparelho continua: trocar a senha derruba os OUTROS. */
  const sess = await readSession(request, env);
  return json(await sessionBody(env, atualizada), 200,
    { 'Set-Cookie': await makeSessionCookie(env, atualizada, sess?.ap || null) });
}

/**
 * POST /api/auth/delete - o titular apaga a própria conta.
 * ─────────────────────────────────────────────────────────────────────────
 * O direito de exclusão da LGPD (art. 18, VI) atendido pela própria pessoa.
 * Até aqui ele existia no papel - a página de reembolso mandava escrever um
 * e-mail -, e um direito que depende de alguém do outro lado responder é um
 * direito com horário de atendimento.
 *
 * Exige SESSÃO E SENHA ATUAL, como a troca de senha. O motivo é o mesmo e
 * vale mais aqui: um cookie roubado, um notebook emprestado ou um celular
 * esquecido aberto num café não podem apagar a conta de ninguém. A senha é o
 * que prova que quem está apagando é o dono, e não quem pegou a cadeira.
 *
 * O que some e o que fica está em `deleteAccount`, em lib/db.js, junto com o
 * porquê de cada um. Resumo: some a pessoa, ficam os pedidos - anônimos -,
 * porque a nota fiscal não é minha para apagar.
 *
 * Responde com o cookie limpo. A sessão já estava morta de qualquer forma
 * (`session_version` subiu dentro do apagamento), mas mandar a limpeza junto
 * é a diferença entre a pessoa ver a tela de "conta apagada" e ver um erro.
 */
export async function apagar({ request, env, ctx }) {
  const account = await requireAccount(request, env);
  if (!account) return notSignedIn();

  const body = await readJson(request);
  if (!body) return fail('server');

  /* Mais apertado que o freio da troca de senha: adivinhar a senha aqui custa
     a conta inteira, e ninguém apaga a própria conta cinco vezes. */
  if (await freioDaConta(env, request)) return fail('rate-limited-hora', 429);
  if (await throttled(env, `apagar-h:${account.id}`, 5, HORA)) return fail('rate-limited-hora', 429);

  const ok = await verifyPassword(
    String(body.password || ''), account.pass_salt, account.pass_hash, account.pass_iter);
  if (!ok) {
    await log(env, account.id, 'apagar-senha-errada');
    return fail('bad-credentials', 401);
  }

  /* Depoimento APROVADO sai do site em até 7 dias também quando a conta é
     apagada: o dono é avisado antes de a linha sumir (LEGAL-106). */
  await avisarRetirada(env, account.id, 'conta-apagada', ctx);
  const r = await deleteAccount(env, account.id);
  if (!r.ok) return fail('server', 500);

  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie });
}

/* ── visitante não é erro (auditoria de 01/10/2026, PERF-007/UXQA-018) ────
 * Todo visitante, em toda página pública, levava um 401 de /api/me: um erro
 * vermelho no console a cada página vista, que esconde o erro de verdade no
 * meio do ruído. Para o app de agora a resposta sem sessão é 200
 * `{ signedIn: false }`.
 *
 * Só para quem PEDE assim (`X-HF-Sessao: opcional`, que lib/account/
 * worker-api.ts manda). O app de antes trata qualquer 200 desta rota como
 * uma sessão, e uma aba aberta antes da publicação, com o pacote antigo,
 * leria `{ signedIn: false }` como conta e quebraria a tela. Sem o
 * cabeçalho (o pacote antigo, o curl do e2e) continua o 401 de sempre. As
 * rotas que exigem sessão continuam respondendo 401. */
const semSessao = (request, limparCookie = false) => {
  const extra = limparCookie ? { 'Set-Cookie': clearSessionCookie } : {};
  if ((request.headers.get('X-HF-Sessao') || '').toLowerCase() === 'opcional') {
    return json({ signedIn: false }, 200, extra);
  }
  return limparCookie ? json({ error: 'not-signed-in' }, 401, extra) : notSignedIn();
};

export async function me({ request, env }) {
  const sess = await readSession(request, env);
  if (!sess) return semSessao(request);

  const account = await findAccountById(env, sess.uid);
  /* A conta sumiu, ou a versão de sessão foi subida (troca de senha, suspeita
     de vazamento). O cookie ainda tem assinatura válida e mesmo assim não
     vale mais - é para isto que `sv` existe. */
  if (!account || (Number(account.session_version) || 0) !== (Number(sess.sv) || 0)) {
    return semSessao(request, true);
  }

  /* O aparelho deste navegador saiu das três vagas: outro entrou depois. */
  if (!await aparelhoValido(env, sess)) return semSessao(request, true);

  /* Um cookie de antes do limite de aparelhos (29/09/2026): ganha o seu
     aparelho aqui, na primeira página que o app abrir. */
  if (!sess.ap) {
    const ap = await novoAparelho(env, account.id);
    if (ap) {
      return json(await sessionBody(env, account), 200,
        { 'Set-Cookie': await makeSessionCookie(env, account, ap) });
    }
  }

  return json(await sessionBody(env, account));
}

/**
 * GET /api/health - o que está configurado, sem dizer o quê.
 * ─────────────────────────────────────────────────────────────────────────
 * Existe porque "500" não é diagnóstico. Quando a publicação vai ao ar com um
 * pedaço faltando - a ligação com o banco, a tabela, o segredo da sessão -
 * toda rota de conta responde igual, e descobrir qual dos três é o problema
 * exige acesso ao painel que quem está depurando muitas vezes não tem à mão.
 *
 * ── duas respostas (auditoria de 01/10/2026, SEC-A-007) ──────────────────
 * PÚBLICA: só `{ ok, monitor }`, que é o que o monitor externo precisa
 * (palavra-chave `"monitor":true`, ver INCIDENTES.md). Antes a rota pública
 * dizia também o modo da cobrança, de quem é a credencial, se o último
 * e-mail de senha saiu e há quantos minutos a varredura rodou: um mapa de
 * QUANDO a recuperação de senha ou a cobrança estão quebradas, que é a
 * janela boa para um golpe de "suporte".
 *
 * DETALHADA: com `Authorization: Bearer <ADMIN_TOKEN>` (o segredo que a
 * publicação gera e entrega à conferência, scripts/cloudflare-setup.sh) ou
 * com a sessão de um administrador com o segundo fator em dia. Responde só
 * BOOLEANOS e vereditos: nenhum valor, nenhum nome de variável, nenhuma
 * mensagem de erro do banco.
 */
async function podeVerDetalhes(request, env) {
  if (!request) return false;
  const token = String(env.ADMIN_TOKEN || '');
  const pedido = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  /* Um token curto seria adivinhável; abaixo de 32 caracteres ele não abre
     nada, nem configurado. */
  if (token.length >= 32 && pedido && timingSafeEqual(pedido, token)) return true;
  /* Sem cookie, nem consulta: é o caso do monitor e de qualquer curioso. */
  if (!request.headers.get('Cookie')) return false;
  try {
    const { account } = await exigirAdmin(request, env);
    return !!account;
  } catch {
    return false;
  }
}

export async function health({ request, env }) {
  /* Trinta por HORA por endereço. Cada consulta permitida é uma escrita de
     freio, e dez por minuto eram seiscentas por hora de uma máquina só; uma
     publicação consulta meia dúzia de vezes, e o monitor externo, de 5 em 5
     minutos, doze. */
  if (request && env.DB && await throttled(env, `health-h:${ip(request)}`, 30, HORA)) {
    return fail('rate-limited', 429);
  }
  const detalhes = await podeVerDetalhes(request, env);
  /* O site em inglês cobra pelo Paddle (lib/paddle.js): os campos da
     cobrança respondem por ele, e os que só existem na Mercado Pago (que
     credencial foi colada, de quem é a conta) ficam `null`. */
  /* E o em espanhol, igual (04/11/2026). */
  const emIngles = env.LOCALE === 'en' || env.LOCALE === 'es';
  /* Ou pelo Stripe, desde 05/11/2026: `pagamento.exterior` em data/empresa.json. */
  const peloStripe = emIngles && (empresa.pagamento && empresa.pagamento.exterior) === 'stripe';
  const paddleLigado = emIngles && (peloStripe ? stripePronto(env) : paddlePronto(env) && !!tokenDoCliente(env));

  const out = {
    /* A ligação com o D1 existe no Worker? `false` = binding ausente ou
       database_id errado no wrangler.toml. */
    db: false,
    /* As tabelas foram criadas? `false` = falta rodar worker/schema.sql. */
    schema: false,
    /* A tabela de progresso existe? Ela entrou depois das outras, e a falta
       dela é SILENCIOSA: nada quebra, o app só volta a guardar progresso no
       aparelho para sempre. É o tipo de migração esquecida que ninguém nota
       até um aluno trocar de celular - então ela se reporta aqui, em vez de
       ficar implícita no `schema`. */
    progresso: false,
    /* A tabela de recuperação de senha existe? Mesma história da de
       progresso: a falta dela não derruba nada, só faz "esqueci minha senha"
       falhar para todo mundo, em silêncio, até alguém reclamar. */
    recuperacao: false,
    /* A tabela de confirmação de e-mail existe? Mesma história: ela entrou
       depois (24/09/2026) e a publicação não aplica o schema.sql. Sem ela o
       cadastro funciona igual e ninguém confirma nada. */
    verificacao: false,
    /* O cookie de sessão tem como ser assinado? `false` = SESSION_SECRET
       não foi definido, e aí NENHUM login funciona. */
    session: !!env.SESSION_SECRET,
    /* Dá para mandar e-mail? `false` = falta RESEND_API_KEY ou EMAIL_FROM, e
       aí o link de recuperação nunca chega a ninguém. O site continua
       funcionando inteiro, e por isso isto fica fora do `ok` - mas um `false`
       aqui significa que todo aluno que esquecer a senha vira um e-mail para
       o suporte. */
    email: mailReady(env),
    /* E o último que TENTOU sair, saiu? `null` = ninguém pediu link ainda.
       A diferença entre este campo e o de cima é a armadilha inteira: a
       Resend recusa com 403 enquanto o domínio do remetente não estiver
       verificado, e aí `email` diz `true`, a tela diz "o link está a
       caminho", e ninguém recebe nada. Ver ultimoEnvioDeSenha em lib/db.js. */
    emailEntregue: null,
    /* Cobrança ligada? `false` é um estado legítimo - ver o checkout. */
    payments: emIngles ? paddleLigado : !!env.MP_ACCESS_TOKEN,
    /* Webhook verificável? `false` faz /api/pay/webhook recusar tudo. */
    webhook: emIngles ? !!(peloStripe ? env.STRIPE_WEBHOOK_SECRET : env.PADDLE_WEBHOOK_SECRET) : !!env.MP_WEBHOOK_SECRET,
    /* "teste" cobra nada; "producao" cobra de verdade. Deriva do prefixo do
       token, então esta linha é a confirmação de qual credencial está no ar -
       a pergunta que, errada, custa semanas de venda em silêncio. */
    modo: emIngles
      ? (paddleLigado ? ((peloStripe ? stripeDeTeste(env) : ehSandbox(env)) ? 'teste' : 'producao') : 'desligado')
      : (env.MP_ACCESS_TOKEN ? (isSandbox(env) ? 'teste' : 'producao') : 'desligado'),
    /* Como ESTA publicação cobra: `mercadopago` ou `pix-direto`. É o valor
       que o deploy escreveu em data/empresa.json depois de testar o token -
       `pix-direto` aqui, com o arquivo do repositório dizendo mercadopago,
       quer dizer que a Mercado Pago recusou a credencial e o cartão está
       desligado (auditoria de 28/09, PAY-009). */
    cobranca: emIngles ? (peloStripe ? 'stripe' : 'paddle') : ((empresa.pagamento && empresa.pagamento.modo) || 'mercadopago'),
    /* QUE credencial foi colada - `access-token`, `chave-publica`,
       `formato-desconhecido` ou `ausente`. Nunca um pedaço do valor.

       Existe porque a Mercado Pago entrega dois valores por aplicação e os
       dois começam com `APP_USR-`: a Public Key e o Access Token. Só o
       segundo serve para a API do servidor, e colar o primeiro devolve um
       401 dizendo "authorization value not present" - uma frase que manda
       conferir chave PIX, webhook e conta bancária antes de desconfiar do
       campo que foi copiado. Ver tokenFormato em lib/mercadopago.js. */
    tokenFormato: emIngles ? null : tokenFormato(env),
    /* DE QUEM é a credencial - `real`, `usuario-de-teste`, `outro-pais`,
       `recusado`, `indisponivel` ou `desligado`. Só o veredicto: nunca o
       apelido, o e-mail ou o id da conta.

       O campo acima diz que credencial foi colada; este diz se a conta dona
       dela consegue receber dinheiro de verdade. São perguntas diferentes, e
       a segunda não tem como ser respondida daqui: os usuários de teste da
       Mercado Pago também têm credenciais `APP_USR-`, então `modo` diz
       "producao", o comprador é mandado ao checkout real, e lá encontra "uma
       das partes é de teste" sem que nada deste lado pareça errado.
       Ver vendedorFormato em lib/mercadopago.js. */
    vendedor: detalhes && !emIngles ? await vendedorFormato(env) : null,
    /* Há quantos minutos a varredura de 5 em 5 min rodou (null = nunca).
       Ela confere pagamentos cujo aviso não chegou, refaz estornos e manda
       os alertas ao dono - parada, tudo isso para em silêncio. */
    varredura: null
  };

  if (env.DB) {
    out.db = true;
    try {
      await env.DB.prepare('SELECT 1 FROM accounts LIMIT 1').first();
      out.schema = true;
    } catch {
      /* A tabela não existe. É a resposta, não uma falha. */
    }
    try {
      await env.DB.prepare('SELECT 1 FROM progress LIMIT 1').first();
      out.progresso = true;
    } catch {
      /* idem */
    }
    try {
      await env.DB.prepare('SELECT 1 FROM password_resets LIMIT 1').first();
      out.recuperacao = true;
    } catch {
      /* idem */
    }
    try {
      await env.DB.prepare('SELECT 1 FROM email_verifications LIMIT 1').first();
      out.verificacao = true;
    } catch {
      /* idem */
    }
    out.emailEntregue = await ultimoEnvioDeSenha(env);
    const bateu = await ultimoBatimento(env, 'varredura');
    out.varredura = bateu === null ? null : Math.floor((Date.now() - bateu) / 60_000);
  }

  /* `progresso`, `recuperacao` e `email` ficam FORA do `ok` de propósito: sem
     eles o curso funciona inteiro - um não sincroniza entre aparelhos, os
     outros dois fecham a porta de quem esqueceu a senha. São degradações, e
     derrubar a saúde por elas apagaria a diferença entre "o site caiu" e "o
     site está no ar com um pedaço a menos".

     `vendedor` fica de fora pelo mesmo motivo e por mais um: ele depende de
     uma resposta da Mercado Pago, e um servidor de terceiro fora do ar não
     torna este site doente. */
  out.ok = out.db && out.schema && out.session;
  /* O que o MONITOR EXTERNO olha (UptimeRobot ou parecido, palavra-chave
     `"monitor":true`): o site no ar E a varredura viva. Fica separado do `ok`
     porque a publicação confere o `ok` logo depois de subir, antes de a
     varredura ter tido tempo de rodar. Auditoria de 28/09, INFRA-002. */
  out.monitor = out.ok && out.varredura !== null && out.varredura <= 15;
  /* Para quem não é administrador, só as duas respostas que o monitor
     precisa. O resto foi calculado à toa, e é barato: são as mesmas
     consultas que `ok` e `monitor` já pedem, menos a da Mercado Pago, que só
     roda com `detalhes`. */
  if (!detalhes) return json({ ok: out.ok, monitor: out.monitor });
  return json(out);
}


/** A conta desta requisição, ou null. Usado por tudo que exige sessão. */
export async function requireAccount(request, env) {
  const sess = await readSession(request, env);
  if (!sess) return null;
  const account = await findAccountById(env, sess.uid);
  if (!account || (Number(account.session_version) || 0) !== (Number(sess.sv) || 0)) return null;
  if (!await aparelhoValido(env, sess)) return null;
  return account;
}

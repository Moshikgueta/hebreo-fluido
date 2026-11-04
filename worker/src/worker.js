/* A entrada do Worker.
 * ─────────────────────────────────────────────────────────────────────────
 * Roda ANTES dos arquivos estáticos (`run_worker_first` no wrangler.toml), o
 * que dá três trabalhos a este arquivo, nesta ordem:
 *
 *   1. /api/*   → responder;
 *   2. rota paga → portão, que decide se o HTML sai;
 *   3. o resto  → entregar o export do Next, que é o site inteiro.
 *
 * Com uma exceção, desde 01/10/2026: o que é público E imutável (os chunks
 * com hash de /_next/static, as fontes, as imagens da capa e os dois
 * traçados de amostra) é servido pelo servidor de ativos SEM passar por
 * aqui, pela lista de exclusões do `run_worker_first`. Esses pedidos não
 * contam na cota do plano, e os cabeçalhos deles vêm de app/public/_headers,
 * não de `blindar`. Os clipes de /amostra-audio ficam aqui por causa do
 * Range (ver abaixo). Tudo o que é pago (/audio, /stroke-order, as rotas do
 * curso) continua entrando por esta porta.
 *
 * O site é `output: 'export'` com `trailingSlash: true`, então cada rota é uma
 * pasta com index.html. Os ativos cuidam disso sozinhos - o que este arquivo
 * garante é que uma rota desconhecida caia no 404 do próprio site, e não num
 * 404 sem estilo do servidor.
 */

import { receberEmail } from './email.js';
import { json } from './lib/http.js';
import { comRange } from './lib/range.js';
import { gate, isGatedPath, canonical } from './gate.js';
import { runReconcile } from './reconcile.js';
import { contar5xx } from './lib/db.js';
import * as auth from './api/auth.js';
import * as pay from './api/pay.js';
import * as progress from './api/progress.js';
import { content } from './api/content.js';
import { contentA1 } from './api/content-a1.js';
import { contentRaizes } from './api/content-raizes.js';
import { licenca as licencaDoLivro, pdfMarcado, CAMINHO_DO_PDF } from './api/livro.js';
import * as exameA1 from './api/exame-a1.js';
import * as certificadoAlfa from './api/certificado-alfa.js';
import * as audio from './api/audio.js';
import * as novidades from './api/novidades.js';
import * as lembrete from './api/lembrete.js';
import * as meusDados from './api/meus-dados.js';
import * as csp from './api/csp.js';
import * as marca from './api/marca.js';
import * as depoimentos from './api/depoimentos.js';
import * as avaliacoes from './api/avaliacoes.js';
import * as estatisticas from './api/estatisticas.js';
import { campanhaValida } from './lib/origem.js';
import { idiomaDoWorker, FORA_DO_SITE_EN } from './lib/idioma.js';
import * as adminCodigo from './api/admin-codigo.js';
import * as estornosAdmin from './api/estornos-admin.js';
import * as vendasAdmin from './api/vendas-admin.js';
import * as segundaLetra from './api/segunda-letra.js';
import * as desafio from './api/desafio.js';
import * as interessados from './api/interessados.js';

/* A página de venda do curso de alfabetização. Foi a capa até 23/10/2026. */
const PAGINA_DE_VENDA = '/curso-de-hebraico/';
const ROUTES = {
  'POST /api/auth/signup': auth.signup,
  'POST /api/auth/login': auth.login,
  'POST /api/auth/logout': auth.logout,
  /* Recuperar a senha são duas rotas porque são dois momentos: uma pede o
     e-mail, a outra recebe o token que foi nele. Nenhuma das duas exige
     sessão - quem esqueceu a senha não tem como ter uma. */
  'POST /api/auth/forgot': auth.forgot,
  'POST /api/auth/reset': auth.reset,
  /* Estas duas, sim, exigem sessão E a senha atual. Ver as notas em
     api/auth.js. A segunda apaga a conta do próprio titular, que é o direito
     de exclusão da LGPD sem passar por um pedido de suporte. */
  /* Confirmar o e-mail: pedir o link de novo, e usar o link. As duas exigem
     sessão - ver as notas em api/auth.js. */
  'POST /api/auth/verify/send': auth.verifySend,
  'POST /api/auth/verify': auth.verify,
  'POST /api/auth/password': auth.password,
  'POST /api/auth/delete': auth.apagar,
  /* "Baixar meus dados" (LGPD art. 18; auditoria de 01/10/2026, LEGAL-122). */
  'GET /api/account/dados': meusDados.exportar,
  /* A lista do aviso do próximo curso: entrar e sair (api/novidades.js). */
  'PUT /api/novidades': novidades.marcar,
  'POST /api/novidades/sair': novidades.sair,
  /* O lembrete para estudar (api/lembrete.js): 404 enquanto desligado. */
  'PUT /api/lembrete': lembrete.marcar,
  'POST /api/lembrete/sair': lembrete.sair,
  'GET /api/me': auth.me,
  'GET /api/health': auth.health,

  'POST /api/pay/create': pay.create,
  'GET /api/pay/verify': pay.verify,
  /* A Mercado Pago manda o aviso como POST, mas alguns testes do painel dela
     disparam um GET na mesma URL. Os dois caem no mesmo lugar - e a validação
     de assinatura recusa o que não for legítimo, seja qual for o verbo. */
  'POST /api/pay/webhook': pay.webhook,
  'GET /api/pay/webhook': pay.webhook,
  /* O aviso do Paddle (site em inglês). Assinatura própria, ver lib/paddle.js. */
  'POST /api/pay/paddle': pay.webhookPaddle,

  'GET /api/orders': pay.orders,
  /* O PIX ainda pagável do próprio pedido, para o checkout e o /perfil
     reabrirem o mesmo código em vez de gerar outro. Ver api/pay.js. */
  'GET /api/pay/pix': pay.pixAberto,
  /* A desistência da compra pelo próprio site (CDC, art. 49; Decreto
     7.962/2013, art. 5º). Ver api/pay.js. */
  'POST /api/pay/desistir': pay.desistir,

  /* O curso em si. É a metade do controle de acesso que faltava: o portão
     recusa as ROTAS pagas, e esta rota recusa o MATERIAL - que até 20/09/2026
     viajava dentro do pacote que qualquer visitante baixava. Ver
     api/content.js. */
  'GET /api/content': content,
  /* O curso Hebraico A1 (06/10/2026): outro curso, outro direito. Ver
     api/content-a1.js. */
  'GET /api/content/a1': contentA1,
  /* Raízes Sefarditas (21/10/2026): outro produto, outro direito. Ver
     api/content-raizes.js. */
  'GET /api/content/raizes': contentRaizes,
  /* A marca d'água do e-book (/israel/): e-mail escondido e número da cópia.
     Ver api/livro.js. */
  'GET /api/livro/licenca': licencaDoLivro,
  /* O exame final do A1, corrigido aqui, e o certificado que só ele libera. */
  'POST /api/a1/exame/iniciar': exameA1.iniciar,
  'POST /api/a1/exame/entregar': exameA1.entregar,
  'GET /api/a1/certificado': exameA1.meuCertificado,
  'POST /api/a1/certificado': exameA1.emitirCertificado,
  'POST /api/a1/certificado/publico': exameA1.trocarPublico,
  'GET /api/certificado': exameA1.verificar,
  'GET /api/certificado/alfabetizacao': certificadoAlfa.meu,
  'POST /api/certificado/alfabetizacao': certificadoAlfa.emitir,

  /* O que a CSP estrita bloqueou. Ver api/csp.js. */
  'POST /api/csp-report': csp.relatorio,

  /* O progresso do aluno. `rev` na escrita é o que impede o celular e o
     notebook de se apagarem - ver api/progress.js. */
  'GET /api/progress': progress.read,
  'PUT /api/progress': progress.write,
  'DELETE /api/progress': progress.drop,

  /* O áudio gravado pelo painel do dono do curso (/admin/gravar). O
     manifesto é público - só ids -, o resto exige conta de administrador.
     Ver api/audio.js. */
  'GET /api/audio/manifest': audio.manifesto,
  'GET /api/admin/audio': audio.lista,
  'PUT /api/admin/audio': audio.salvar,
  'DELETE /api/admin/audio': audio.apagar,
  'POST /api/admin/audio/pendente': audio.pendente,
  'GET /api/admin/audio/arquivo': audio.arquivo,

  /* De qual conta saiu uma cópia do curso: lê a marca invisível de um
     trecho colado. Só administrador. Ver api/marca.js. */
  'POST /api/admin/marca': marca.identificar,

  /* Os depoimentos: o aluno escreve, autoriza (ou não) e retira o dele; o
     dono lê e aprova. Ver api/depoimentos.js. */
  'GET /api/depoimento': depoimentos.ler,
  'PUT /api/depoimento': depoimentos.salvar,
  'DELETE /api/depoimento': depoimentos.retirar,
  'GET /api/admin/depoimentos': depoimentos.listar,
  'PUT /api/admin/depoimentos': depoimentos.julgar,
  /* "Como foi esta lição?": o aluno avalia, anônimo; o dono lê o resumo.
     Ver api/avaliacoes.js. */
  'POST /api/avaliacao': avaliacoes.avaliar,
  'GET /api/admin/avaliacoes': avaliacoes.listar,

  /* Onde os alunos erram e onde param: só contadores, sem identificar
     ninguém. Ver api/estatisticas.js. */
  'POST /api/estatisticas': estatisticas.registrar,
  'GET /api/admin/estatisticas': estatisticas.ler,
  /* Até onde os visitantes chegam no teste grátis da capa. Sem sessão. */
  'POST /api/demo': estatisticas.contarDemo,
  /* O portal da capa (23/10/2026): jornadas e produtos abertos. Ver api/estatisticas.js. */
  'POST /api/portal': estatisticas.contarPortal,
  /* A segunda letra por e-mail, no fim do teste. Ver api/segunda-letra.js. */
  'POST /api/segunda-letra': segundaLetra.pedir,
  /* O desafio com um amigo (28/10/2026): o aluno assina cinco palavras do
     curso, e a página pública confere a assinatura. Nada é gravado. Ver
     api/desafio.js. */
  'POST /api/desafio': desafio.criar,
  'GET /api/desafio': desafio.abrir,
  /* A lista de interessados (23/10/2026): entrar, confirmar e sair. Ver api/interessados.js. */
  'POST /api/interessados': interessados.entrar,
  'POST /api/interessados/confirmar': interessados.confirmar,
  'POST /api/interessados/sair': interessados.sair,

  /* O segundo fator do administrador: o código por e-mail. Ver
     lib/admin.js e api/admin-codigo.js. */
  'POST /api/admin/codigo': adminCodigo.enviar,
  'POST /api/admin/codigo/conferir': adminCodigo.conferir,
  /* Os estornos que dependem do dono (PIX direto, recusados): listar e
     marcar "já devolvi". Ver api/estornos-admin.js. */
  'GET /api/admin/estornos': estornosAdmin.listar,
  'POST /api/admin/estornos/feito': estornosAdmin.feito,
  /* Quem comprou, e por qual link. Só leitura. Ver api/vendas-admin.js. */
  'GET /api/admin/vendas': vendasAdmin.listar
};

export default {
  /* Toda resposta - página, API, redirect, recusa do portão - sai pelo
     `blindar`. A primeira versão só blindava as páginas, e o HSTS faltava
     justamente onde mais importa: no 301 do www e nas rotas que carregam
     senha. */
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    const res = await responder(request, env, ctx);
    /* Toda resposta 5xx vira um contador por hora no D1, que o alerta
       diário soma (alertas.js, auditoria de 01/10/2026, SEC-A-005). Fora do
       caminho da resposta: quem já recebeu um erro não espera pela conta. */
    if (res.status >= 500) {
      const contar = contar5xx(env);
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(contar);
      else await contar;
    }
    return blindar(res, path, await hashesDaPagina(request, env, res, path));
  },

  /* O cron (ver [triggers] no wrangler.toml). Esperado, e não solto com
     waitUntil: a varredura É o trabalho desta execução, e reportá-la como
     terminada com as chamadas ainda no ar mascararia toda falha dela. */
  async scheduled(event, env) {
    return runReconcile(env);
  },

  /* O que chega em contato@ (Email Routing → "Send to a Worker"):
     encaminha ao dono e confirma na hora os pedidos de desistência.
     Ver email.js. */
  async email(message, env) {
    return receberEmail(message, env);
  }
};

async function responder(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    /* ── um endereço só ─────────────────────────────────────────────────
       O www redireciona para o endereço sem www, e isso acontece ANTES de
       qualquer outra coisa - antes da API, antes do portão.

       A ordem é o ponto. `origin` das URLs de retorno da Mercado Pago sai da
       REQUISIÇÃO (worker/src/api/pay.js), então uma compra iniciada em
       www.hebraicofluente.com.br mandaria o comprador de volta para o www
       depois de pagar - e o cookie de sessão dele, emitido para o host sem
       www, não viajaria junto. O sintoma seria "paguei e caí deslogado", no
       pior momento possível.

       301 e não 302: é permanente, e é o que faz o navegador e o buscador
       pararem de perguntar. */
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    /* ── o que o site em inglês não tem ─────────────────────────────────
       Os produtos só em português e os painéis do dono existem no export em
       inglês (é o mesmo código), mas não fazem parte dele: 404, com a página
       de erro do próprio site (lib/idioma.js, PLANO-INGLES.md). */
    if (idiomaDoWorker(env) !== 'pt' && FORA_DO_SITE_EN.test(path)) {
      if (path.startsWith('/api/')) return json({ error: 'not-found' }, 404);
      const pagina = env.ASSETS ? await env.ASSETS.fetch(new Request(new URL('/404.html', url))) : null;
      return new Response(pagina && pagina.ok ? pagina.body : 'Not found', {
        status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    /* ── links de campanha ───────────────────────────────────────────
       /sefarad (parceria com a associação sefardita, 02/10/2026) e, desde
       04/10/2026, /bio, /stories e /dm (Instagram): cada um soma uma
       visita do dia e leva ao teste grátis da capa. 302, e não 301: o
       navegador não pode guardar o desvio, senão a segunda visita da mesma
       pessoa nem passa por aqui. Ver api/estatisticas.js. A bio vai para a
       página "Comece aqui" (24/10/2026), que deixa a pessoa escolher entre
       ler hebraico e conhecer Israel, com a mesma parceria no endereço. */
    const campanha = estatisticas.LINKS_DE_CAMPANHA.get(path.toLowerCase());
    if (campanha && (request.method === 'GET' || request.method === 'HEAD')) {
      const conta = estatisticas.contarCampanha(env, campanha, request);
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(conta); else await conta;
      /* O nome da campanha do post (`/bio?utm_campaign=p01`) segue junto
         (growth, 23/10/2026): sem ele, o desvio jogava fora a única marca
         que liga uma compra a uma peça. Só esse parâmetro, e só no formato
         que lib/origem aceita; o resto da consulta fica para trás. */
      const peca = campanhaValida(String(url.searchParams.get('utm_campaign') || '').trim().toLowerCase().replace(/\s+/g, '-'));
      const comPeca = peca ? `&utm_campaign=${peca}` : '';
      const destino = estatisticas.PARA_O_COMECE_AQUI.has(campanha)
        ? `/comece-aqui/?parceria=${campanha}${comPeca}`
        : `${PAGINA_DE_VENDA}?parceria=${campanha}${comPeca}#experimente`;
      return new Response(null, { status: 302, headers: { Location: `${url.origin}${destino}`, 'Cache-Control': 'no-store' } });
    }
    /* O link de parceria antigo (`/?parceria=sefarad`), de antes de a capa
       virar o portal (23/10/2026): segue para a página de venda, com a
       parceria, para o preço do link não se perder num post já publicado. */
    if (path === '/' && url.searchParams.has('parceria') && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(null, { status: 302, headers: { Location: `${url.origin}${PAGINA_DE_VENDA}${url.search}#experimente`, 'Cache-Control': 'no-store' } });
    }
    /* Uma página de venda só (23/10/2026, decisão do dono): a do curso de
       alfabetização mora em /curso-de-hebraico, e o endereço antigo do
       catálogo leva para lá com a consulta junto (`?sem-acesso=1` do portão,
       `?parceria=` de algum link velho). O payload RSC do mesmo endereço
       também, para a navegação do Next não montar a página antiga. */
    if (/^\/cursos\/alfabetizacao(\/(index\.(html|txt))?)?$/i.test(path) && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(null, { status: 301, headers: { Location: `${url.origin}${PAGINA_DE_VENDA}${url.search}` } });
    }
    /* Endereços do portal que já têm casa (23/10/2026): o contato é o
       /suporte (o mesmo e-mail e WhatsApp), e "minha conta" é o painel. */
    /* O livro mudou de nome (23/10/2026): Israel Além do Óbvio. A página do
       portal foi junto, e o endereço antigo leva para a nova. O slug do
       catálogo, o direito de acesso e /israel/ continuam os mesmos. */
    const ATALHOS = { '/contato': '/suporte/', '/minha-conta': '/meu-hebraico/', '/israel-alem-do-roteiro': '/' };
    /* Só o curso de alfabetização no site (27/10/2026, decisão do dono): as
       páginas das jornadas, das duas experiências "Em breve" e o "Comece
       aqui" levam à capa, que é a página do curso. A consulta vai junto
       (`?parceria=` de um link da bio já publicado). As páginas continuam no
       build, para voltarem sem reescrever nada: é só tirar esta linha. */
    if (/^\/(aprender-hebraico|descobrir-israel|israel-alem-do-obvio|raizes-sefarditas|comece-aqui)(\/(index\.(html|txt))?)?$/i.test(path)
        && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(null, { status: 301, headers: { Location: `${url.origin}/${url.search}` } });
    }
    if (ATALHOS[path.toLowerCase()] && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(null, { status: 301, headers: { Location: `${url.origin}${ATALHOS[path.toLowerCase()]}` } });
    }

    /* ── a API ──────────────────────────────────────────────────────── */
    if (path.startsWith('/api/')) {
      /* Escrita só da nossa própria origem.
         ──────────────────────────────────────────────────────────────
         O cookie é SameSite=Lax, e isso já segura a maior parte do CSRF -
         mas "a maior parte" inclui uma janela de dois minutos depois do
         login em que o Chrome ainda manda o cookie num POST de topo vindo
         de outro site, e não segura nada no dia em que alguém relaxar o
         cookie para None por causa de um redirect do meio de pagamento.
         Uma segunda trava, independente: um navegador declara de onde a
         requisição veio (`Origin`, `Sec-Fetch-Site`), e uma escrita que
         se declara de outro lugar é recusada. Quem não declara nada - o
         curl do e2e, um script de operação - passa: a defesa é contra o
         navegador da vítima, não contra ferramentas.
         Os webhooks ficam de fora porque a Mercado Pago e o Paddle são,
         legitimamente, outra origem; a assinatura HMAC é a trava dele. O relato de CSP
         também: quem o manda é o próprio navegador, que nem sempre declara a
         origem do mesmo jeito, e ele não escreve nada além de uma linha de
         trilha com freio. */
      if (request.method !== 'GET' && request.method !== 'HEAD'
          && path !== '/api/pay/webhook' && path !== '/api/pay/paddle' && path !== '/api/csp-report') {
        const site = request.headers.get('Sec-Fetch-Site');
        const origin = request.headers.get('Origin');
        const cruzada = site === 'cross-site' || site === 'same-site'
          || (origin && origin !== url.origin);
        if (cruzada) return json({ error: 'server' }, 403);
      }

      const handler = ROUTES[`${request.method} ${path}`];
      if (handler) {
        try {
          return await handler({ request, env, ctx });
        } catch (e) {
          /* O detalhe fica no log do Worker; o cliente recebe um código. Uma
             mensagem de exceção devolvida na resposta entrega nome de tabela,
             caminho de arquivo e às vezes o próprio SQL. */
          console.error('api', path, e && e.stack || e);
          return json({ error: 'server' }, 500);
        }
      }
      return json({ error: 'server' }, 404);
    }

    /* ── o portão ───────────────────────────────────────────────────── */
    const blocked = await gate(request, env).catch(e => {
      /* Um erro aqui não pode virar porta aberta. Se o banco está fora, a
         resposta certa é mandar para o login - nunca entregar a aula. */
      console.error('gate', path, e && e.stack || e);
      return new Response(null, {
        status: 302,
        headers: { Location: new URL('/entrar/', url.origin).toString(), 'Cache-Control': 'no-store' }
      });
    });
    if (blocked) return blocked;

    /* ── o áudio gravado pelo painel ────────────────────────────────────
       Depois do portão: `/audio` é rota paga. Com gravação do painel para
       esse id, ela sai do banco; sem, segue para o arquivo do git, como
       sempre. Um banco fora do ar também segue para o arquivo - o curso
       perde a gravação nova por um instante, nunca o som que já tinha. */
    const clipe = path.match(/^\/audio\/(he-[0-9a-f]{8})\.mp3$/);
    if (clipe && (request.method === 'GET' || request.method === 'HEAD')) {
      const doPainel = await audio.servir(request, env, clipe[1]).catch(e => {
        console.error('audio', path, e && e.stack || e);
        return null;
      });
      if (doPainel) return doPainel;
      /* O mp3 do git, pelo servidor de ativos. O Safari pede `bytes=0-1`
         antes de tocar e exige 206; em produção o servidor de ativos já
         responde assim, mas o `wrangler dev` devolve 200 inteiro e ignora o
         Range. Se vier 200 com Range no pedido, a fatia é feita aqui
         (lib/range.js); um 206 pronto passa como veio. */
      return comRange(request, await env.ASSETS.fetch(request));
    }

    /* ── os vídeos do professor (Me explica, Moshik) ────────────────────
       Depois do portão, como o áudio, e pelo mesmo motivo do Range: o
       Safari não toca vídeo sem 206. */
    if (/^\/video\/[a-z-]+\.(mp4|vtt)$/.test(path) && (request.method === 'GET' || request.method === 'HEAD')) {
      return comRange(request, await env.ASSETS.fetch(request));
    }

    /* ── o PDF do e-book, com a marca da conta ─────────────────────────
       Depois do portão, que já conferiu o direito. Sem como marcar, segue
       para o arquivo como está (api/livro.js). */
    if (canonical(path) === CAMINHO_DO_PDF && (request.method === 'GET' || request.method === 'HEAD')) {
      const marcado = await pdfMarcado(request, env, ctx).catch(e => {
        console.error('pdf-marca', e && e.stack || e);
        return null;
      });
      if (marcado) return marcado;
    }

    /* ── o site ─────────────────────────────────────────────────────── */
    /* A lista de hashes da CSP é do Worker, não do visitante. */
    if (path === '/' + ARQUIVO_HASHES) return new Response('Not found', { status: 404 });
    /* Os clipes da capa: públicos, mas o Safari só toca o que responde 206
       a `Range` (auditoria de 01/10/2026, PERF-002). Por isso continuam no
       Worker, e não na lista de exceções do `run_worker_first`. */
    if (/^\/amostra-audio\/[^/]+\.mp3$/.test(path) && (request.method === 'GET' || request.method === 'HEAD')) {
      return comRange(request, await env.ASSETS.fetch(request));
    }
    return permanente(await env.ASSETS.fetch(request));
}

/* ── o redirecionamento da barra final é permanente ──────────────────────
 * O servidor de ativos (html_handling padrão, "auto-trailing-slash") manda
 * `/cursos` para `/cursos/` e `/index.html` para `/` com 307, que é
 * TEMPORÁRIO: um link externo sem a barra passa autoridade por um desvio
 * que o buscador não guarda (auditoria de 01/10/2026, SEO-002). O wrangler
 * não tem opção para mudar o código, então a troca é aqui: o mesmo destino,
 * com 308 (permanente, e que, como o 307, preserva método e corpo). Só os
 * redirecionamentos do servidor de ativos passam por esta função; os 302 do
 * portão e o 301 do www nascem antes e não mudam. */
function permanente(res) {
  if (res.status !== 307) return res;
  const destino = res.headers.get('Location');
  if (!destino) return res;
  return new Response(null, { status: 308, headers: { Location: destino } });
}

/* ── os cabeçalhos do site ─────────────────────────────────────────────────
 * O export do Next sai do servidor de ativos sem nenhum cabeçalho de
 * segurança, e este é o único lugar por onde toda resposta passa.
 *
 * A CSP é apertada porque o site permite: nenhum script de terceiro, nenhuma
 * fonte externa, nenhuma analítica. `'unsafe-inline'` em script fica porque o
 * export estático do Next injeta o próprio bootstrap em <script> inline e um
 * export não tem como carimbar nonce por requisição; o que a diretiva ainda
 * garante é que nada saia do próprio domínio - `connect-src 'self'` é o que
 * impede um script injetado de mandar uma senha para fora, e
 * `frame-ancestors 'none'` é o que impede o checkout e o login de serem
 * emoldurados por outro site.
 *
 * Esta é a política de reserva: as páginas do build saem com `cspEstrita`
 * (abaixo), sem `'unsafe-inline'`. Esta vale só no HTML sem lista de hashes.
 *
 * Uma página paga que passou pelo portão sai `private, no-store`: o servidor
 * de ativos a marca `public`, e um cache compartilhado no caminho poderia
 * entregar a aula de quem pagou para quem não pagou.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'"
].join('; ');

/* A CSP estrita (auditoria, SEC-003), em vigor desde 01/10/2026.
 * ─────────────────────────────────────────────────────────────────────────
 * A mesma política, com uma diferença: em vez de `'unsafe-inline'`, o hash
 * de cada script inline QUE AQUELA PÁGINA TRAZ, calculado no build por
 * tools/csp-hashes.mjs. Ficou em `Report-Only` de 29/09 a 01/10/2026; agora
 * é a `Content-Security-Policy` que vale, e continua relatando em
 * /api/csp-report o que bloqueia (api/csp.js; Actions → Acesso → csp).
 *
 * A lista é lida uma vez por isolate, do próprio servidor de ativos: ela
 * muda a cada publicação, e cada publicação sobe isolates novos. Sem a lista
 * (build antiga, arquivo fora do ar), a página sai só com a política de
 * sempre - a observação nunca pode custar uma página.
 */
const ARQUIVO_HASHES = '_csp-hashes.json';
let mapaHashes = null;

async function carregarHashes(request, env) {
  if (mapaHashes) return mapaHashes;
  try {
    const r = await env.ASSETS.fetch(new Request(new URL('/' + ARQUIVO_HASHES, request.url)));
    if (!r.ok) return {};
    mapaHashes = await r.json();
    return mapaHashes;
  } catch {
    return {};
  }
}

/** A rota como tools/csp-hashes.mjs a grava: `/faq`, `/`, ou "404". */
function rotaDaPagina(path, status) {
  if (status === 404) return '404';
  const p = path.replace(/\/index\.html$/i, '').replace(/\.html$/i, '');
  return p || '/';
}

async function hashesDaPagina(request, env, res, path) {
  if (!(res.headers.get('Content-Type') || '').startsWith('text/html')) return null;
  const mapa = await carregarHashes(request, env);
  const hs = mapa[rotaDaPagina(path, res.status)];
  return Array.isArray(hs) ? hs : null;
}

/* O nonce é para o script que a PRÓPRIA Cloudflare injeta no HTML (a
   detecção de robôs, "JavaScript detections"). Ele muda a cada resposta e
   não tem hash fixo; a Cloudflare lê o nonce do cabeçalho de CSP e o
   carimba no script que injeta. Foi o único relato das primeiras horas de
   observação (29/09/2026), em todas as páginas. Um valor novo por resposta,
   e só nesta política: posto na que vale, ao lado de `'unsafe-inline'`, ele
   DESLIGARIA o `'unsafe-inline'` nos navegadores e quebraria o site. */
function novoNonce() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b));
}

function cspEstrita(hashes, nonce = novoNonce()) {
  const scripts = ["'self'", "'report-sample'", `'nonce-${nonce}'`, ...hashes.map(h => `'${h}'`)].join(' ');
  return CSP.replace("script-src 'self' 'unsafe-inline'", `script-src ${scripts}`)
    + '; report-uri /api/csp-report';
}

/* O checkout do Paddle (PLANO-INGLES.md, etapa 5): o Paddle.js vem de
   cdn.paddle.com e abre o pagamento num iframe de buy.paddle.com (ou
   sandbox-buy, no ambiente de teste). Liberado SÓ nas páginas de /checkout:
   o resto do site continua sem nenhum script de terceiro. Apple Pay e Google
   Pay, dentro do iframe, pedem a permissão `payment` para a origem dele. */
const naCompra = path => /^\/checkout\//i.test(path);
const PADDLE_FRAMES = 'https://buy.paddle.com https://sandbox-buy.paddle.com';
const comPaddle = csp => csp
  .replace(/script-src ([^;]*)/, "script-src $1 https://cdn.paddle.com")
  .replace(/style-src ([^;]*)/, "style-src $1 https://cdn.paddle.com")
  .replace(/img-src ([^;]*)/, "img-src $1 https://*.paddle.com")
  .replace(/connect-src ([^;]*)/, "connect-src $1 https://*.paddle.com")
  .replace("frame-ancestors 'none'", `frame-src ${PADDLE_FRAMES}; frame-ancestors 'none'`);

/* O painel do dono do curso. Também libera o microfone: é onde as
   pronúncias do curso são gravadas (app/src/app/admin/gravar). */
const isAdminPath = path => /^\/admin(\/|$)/i.test(path);

function blindar(res, path, hashes = null) {
  /* Uma resposta sem corpo (304, 302, 403) é reconstruída sem corpo: passar
     um `body` nulo com esses status é permitido; passar um corpo em 304 não. */
  const out = new Response(res.body, res);
  const h = out.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  /* `preload` (auditoria de 28/09, INFRA-015): o domínio já cumpre os
     requisitos da lista de pré-carga dos navegadores (um ano, subdomínios
     inclusos, HTTPS em tudo). O cabeçalho só declara que aceita; entrar na
     lista é um pedido à parte, em hstspreload.org, e difícil de desfazer -
     fica para o dono decidir. */
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  /* O microfone: bloqueado no site público, liberado SÓ para o próprio site
     nas páginas do curso, onde o aluno grava a própria leitura
     (components/learn/GravarLeitura.tsx - a gravação não sai do aparelho).
     Nenhum terceiro, nem num iframe, ganha o microfone em lugar nenhum. */
  /* 28/09/2026: e na CAPA, só nela. A landing ganhou "Ouça e fale"
     (components/landing/OuvirEFalar.tsx): o visitante se grava falando
     שָׁלוֹם e é corrigido, antes de comprar - a pedido do dono do curso. As
     outras páginas públicas e a API continuam fechadas. 23/10/2026: a página
     de venda saiu da capa para /curso-de-hebraico (a capa virou o portal das
     jornadas, que não grava ninguém), e o microfone foi junto. */
  /* 27/10/2026: a capa voltou a ser a página do curso, e o microfone com ela. */
  const naVenda = path === '/' || path === '/index.html'
    || path === '/curso-de-hebraico' || path === '/curso-de-hebraico/index.html';
  const mic = isGatedPath(path) || isAdminPath(path) || naVenda ? 'microphone=(self)' : 'microphone=()';
  const pagar = naCompra(path) ? `payment=(self "https://buy.paddle.com" "https://sandbox-buy.paddle.com")` : 'payment=()';
  h.set('Permissions-Policy', `camera=(), ${mic}, geolocation=(), ${pagar}`);
  const tipo = h.get('Content-Type') || '';
  if (tipo.startsWith('text/html')) {
    /* A estrita VALE desde 01/10/2026 (decisão do dono, depois de dias de
       observação sem relato de script do próprio site; o que sobrou, wasm de
       extensões e o script que o navegador do Instagram injeta, a política
       de sempre já bloqueava). Página sem lista de hashes (HTML gerado pelo
       próprio Worker, build antiga) sai com a de sempre. */
    const politica = hashes ? cspEstrita(hashes) : CSP;
    h.set('Content-Security-Policy', naCompra(path) ? comPaddle(politica) : politica);
    h.set('X-Frame-Options', 'DENY');
  }
  /* O painel do dono do curso: fora de busca e fora de cache. A página em
     si não tem nada secreto (os dados vêm de /api/admin/*, que confere a
     conta), mas não tem por que existir num índice. */
  if (isAdminPath(path)) {
    h.set('Cache-Control', 'private, no-store');
    h.set('X-Robots-Tag', 'noindex, nofollow');
  }
  /* Os arquivos de /_next/static têm o hash do conteúdo no nome: mudar o
     conteúdo muda o nome, então o navegador pode guardá-los por um ano sem
     perguntar (`immutable`). O servidor de ativos os marca `max-age=0,
     must-revalidate`, e cada "posso usar o que tenho?" era uma ida à rede e
     uma invocação do Worker (auditoria de 01/10/2026, PERF-001). Em
     produção esses pedidos nem chegam aqui (lista do `run_worker_first`) e o
     cabeçalho vem de app/public/_headers; esta linha é a mesma regra para o
     `wrangler dev` e para o dia em que a lista mudar. Nunca em rota paga:
     a regra do portão, abaixo, vem depois e vence. */
  if (path.startsWith('/_next/static/')) {
    h.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  /* Os `.txt` do export são o payload RSC de cada página (`/faq/index.txt`),
     servidos como text/plain: um rastreador que os descubra ao renderizar
     pode indexar o texto cru como se fosse página (auditoria de 01/10/2026,
     SEO-003). robots.txt e llms.txt são feitos para serem lidos e ficam de
     fora. */
  if (/\.txt$/i.test(path) && path !== '/robots.txt' && path !== '/llms.txt') {
    h.set('X-Robots-Tag', 'noindex');
  }
  /* A prévia grátis do e-book (23/10/2026): pública e sem conta, mas só para
     quem recebe o link no direct. Fora da busca pelo cabeçalho, além da meta
     que o HTML dela já traz (tools/web.mjs do editorial, --previa). */
  if (path === '/previa' || path.startsWith('/previa/')) {
    h.set('X-Robots-Tag', 'noindex, nofollow');
  }
  if (!path.startsWith('/api/') && isGatedPath(path)) {
    /* O clipe de áudio que o portão deixou passar: um dia no aparelho do
       aluno, nunca em cache compartilhado (PERF-008, api/audio.js). */
    if (audio.clipeComCache(canonical(path), out.status)) {
      h.set('Cache-Control', audio.CACHE_DO_CLIPE);
      h.set('Vary', 'Cookie');
    } else {
      h.set('Cache-Control', 'private, no-store');
    }
    /* E não entra em buscador. Isto é cinto e suspensório, de propósito: um
       rastreador já leva 302 do portão e nunca vê o HTML da aula. Mas o
       portão JÁ teve uma brecha - a exceção de `Sec-Fetch-Dest`, contada em
       gate.js -, e num dia em que ele volte a deixar passar, o endereço não
       pode virar resultado de busca. Sai daqui, e não de um `metadata` por
       página: assim uma rota nova do curso nasce fora do índice pelo mesmo
       motivo que nasce atrás do login, sem depender de alguém lembrar. */
    h.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return out;
}

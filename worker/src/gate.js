/* O portão de rota, do lado do servidor.
 * ─────────────────────────────────────────────────────────────────────────
 * A lista abaixo é de prefixos de rota que exigem o curso pago. Sem cookie
 * válido, ou com cookie sem o direito de acesso, a resposta é um 302 para a
 * página de vendas - o HTML da aula não sai do servidor.
 *
 * ESTE É METADE DO CONTROLE DE ACESSO. A outra está em api/content.js.
 *
 * Este arquivo fecha o ENDEREÇO: ninguém abre /licao/alef/ com um link e lê a
 * lição. Sozinho, ele nunca protegeu o MATERIAL - o curso é um app estático, e
 * até 20/09/2026 as palavras, as lições e os exercícios viajavam dentro dos
 * pacotes JavaScript de /_next/, servidos livremente e que têm de ser, porque
 * a página pública os carrega. Um `curl` naquele endereço levava o conteúdo
 * inteiro sem conta e sem pagar, e esta nota dizia exatamente isso.
 *
 * A metade que faltava foi escrita: o conteúdo saiu do pacote e agora é
 * buscado em /api/content, atrás deste mesmo cookie E do direito de acesso
 * lido do banco a cada pedido (worker/src/api/content.js; ARCHITECTURE.md
 * §11.4). Quem garante que ele não volta para o pacote é `app/pacote.mjs`, que
 * roda no deploy contra o export publicado.
 *
 * Então o que este arquivo é: o portão sem o qual o HTML já renderizado da
 * aula - que traz o material, porque é gerado no servidor - sairia para
 * qualquer um que soubesse o endereço.
 *
 * ── A lição da auditoria ──────────────────────────────────────────────────
 * Este portão já teve uma exceção: "se `Sec-Fetch-Dest` não for `document`,
 * deixa passar", para não redirecionar um sub-recurso para HTML. Só que o
 * cabeçalho é escolhido por quem chama. Fora de um navegador ele é uma linha
 * de curl, e `curl -H 'Sec-Fetch-Dest: empty' /licao/alef/` recebia a aula
 * inteira, sem cookie, antes de a sessão ser sequer lida. Uma decisão de
 * acesso não pode depender de um dado que o cliente escreve.
 *
 * Agora TODA requisição a uma rota paga passa pela sessão. O cabeçalho só
 * decide a FORMA da recusa: um documento é redirecionado para o login; um
 * sub-recurso (o `index.txt` que o Next busca ao navegar sem recarregar)
 * recebe um 403 seco - o app trata um RSC recusado como navegação de página
 * inteira, e ela cai no 302 como qualquer link.
 */

import { readSession } from './lib/session.js';
import { aparelhoValido } from './lib/aparelhos.js';
import { hasEntitlement, activeEntitlements, findAccountById } from './lib/db.js';

/* As rotas do curso pago. Uma lista de prefixos, e não uma de rotas livres:
   uma rota nova nasce protegida, e o erro possível é pedir login onde não
   precisava - nunca o contrário. */
const GATED = [
  '/licao', '/modulo', '/checkpoint', '/extra', '/revisao', '/academia',
  '/mapa', '/desafio-final', '/certificado', '/concluido', '/conquistas',
  '/historia', '/inicio', '/onboarding', '/meu-hebraico',
  /* 23/09/2026: o vocabulário, o nome em hebraico e o guia do teclado - as
     três telas das atividades de produção. */
  '/vocabulario', '/meu-nome', '/teclado-hebraico',
  /* 11/10/2026: o Laboratório de Leitura e a Minha Primeira Leitura. */
  '/leitura',
  /* 28/10/2026: as leituras todas num lugar só (app/leituras). */
  '/leituras',
  '/hebraico-na-rua',
  /* 05/11/2026: ler cardápios. */
  '/cardapios',
  /* 05/11/2026: Um dia em Israel (o mapa e as paradas). */
  '/um-dia-em-israel',
  /* Os clipes de áudio ainda não existem; quando chegarem, nascem atrás do
     portão em vez de serem descobertos públicos depois. Atenção: o
     AudioButton também aparece em página livre (a landing, `Fecho.tsx`), e
     um clipe pedido de lá vai receber 403. No dia em que houver clipes, os
     das páginas livres saem por outro prefixo, ou esta linha vira uma
     decisão por lição. */
  '/audio',
  /* 24/09/2026: os diagramas de ordem dos traços das 27 letras. A lição os
     carrega daqui como <img>, e o navegador manda o cookie junto; quem não
     comprou recebe 403. A landing mostra dois (Álef e Shin), e esses dois
     saem por /tracado-amostra/, que é público - ver
     tools/export-content.mjs. */
  '/stroke-order',
  /* 28/10/2026: os vídeos do professor no "Me explica, Moshik" (video/ na raiz). */
  '/video',
  /* 26/09/2026: as lições de som (Vet, Chaf, Fe, Tch, Dj, J). */
  '/som',
  /* 27/09/2026: as recompensas (trocar XP) e as leituras bônus que elas abrem. */
  '/loja', '/bonus',
  /* O guia opcional «O nikud da Bíblia». */
  '/nikud-biblico',
  /* 29/09/2026: o depoimento do aluno. Só quem tem o curso escreve. */
  '/depoimento',
  /* 06/10/2026: o curso Hebraico A1. É de OUTRO curso: ver `cursoDaRota`. */
  '/a1',
  /* 21/10/2026: o e-book Israel Além do Óbvio (versão interativa e PDF).
     É de outro PRODUTO: ver `cursoDaRota`. */
  '/israel',
  /* 21/10/2026: Raízes Sefarditas, outro produto (ver `cursoDaRota`). */
  '/raizes'
];

/* O curso de cada rota (06/10/2026, com o A1). O padrão é o alfabeto; o A1
   tem o prefixo dele; e os clipes de áudio servem aos dois cursos, porque
   uma gravação pode estar nos dois (a mesma palavra, o mesmo id) - para
   eles basta ter algum curso válido. `null` = qualquer curso. */
const COURSE = 'alfabetizacao';
const PREFIXO_A1 = '/a1';
const PREFIXO_RAIZES = '/raizes';
const QUALQUER_CURSO = ['/audio'];
/* O e-book: quem comprou só ele lê /israel/ e mais nada. E o "qualquer
   curso" de /audio conta só CURSOS: o e-book não abre os áudios das lições. */
const PREFIXO_LIVRO = '/israel';
export const LIVRO = 'israel-alem-do-roteiro';
/* Os direitos de acesso que NÃO são de curso. Escrito aqui, e não lido do
   catálogo, porque app/seo.mjs e app/pacote.mjs importam este arquivo no
   Node puro, que não importa JSON sem atributo. tests/ebook-produto.test.ts
   confere esta lista contra data/courses.json. */
export const NAO_CURSOS = new Set([LIVRO]);
/* Produtos sem página de venda: fora do catálogo (Raízes) ou com `aVenda:
   false` em data/courses.json (o e-book, 22/10/2026). Lista fixa porque este
   arquivo não pode importar o catálogo: o seo.mjs da publicação o carrega no
   Node puro, que recusa JSON sem atributo de importação. tests/ebook-produto
   confere a lista contra o catálogo: abrir a venda pede tirar o slug daqui. */
export const SEM_PAGINA_DE_VENDA = new Set(['raizes-sefarditas', LIVRO]);
const ehCurso = slug => !NAO_CURSOS.has(slug);

export function cursoDaRota(path) {
  const p = canonical(path);
  if (p === null) return COURSE;
  const em = prefix => p === prefix || p.startsWith(prefix + '/');
  if (em(PREFIXO_A1)) return 'hebraico-a1';
  if (em(PREFIXO_LIVRO)) return LIVRO;
  if (em(PREFIXO_RAIZES)) return 'raizes-sefarditas';
  if (QUALQUER_CURSO.some(em)) return null;
  return COURSE;
}

/**
 * O caminho, canonizado antes de comparar.
 *
 * Decodifica o percent-encoding, colapsa barras repetidas, ignora
 * maiúsculas. O servidor de ativos da Cloudflare já normaliza essas formas
 * antes de resolver o arquivo (`//licao/alef/` vira `/licao/alef/`), e é
 * exatamente por isso que a comparação aqui tem de ver a mesma coisa que ele
 * vê - senão o portão julga uma grafia e o ativo é servido por outra. Um
 * caminho que não decodifica é tratado como pago: na dúvida, o portão fecha.
 */
export function canonical(path) {
  let p = String(path || '/');
  try { p = decodeURIComponent(p); } catch { return null; }
  p = p.toLowerCase().replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return p || '/';
}

export function isGatedPath(path) {
  const p = canonical(path);
  if (p === null) return true;
  return GATED.some(prefix => p === prefix || p.startsWith(prefix + '/'));
}

/** `null` quando pode passar; uma Response de recusa quando não. */
export async function gate(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!isGatedPath(path)) return null;

  const dest = request.headers.get('Sec-Fetch-Dest');
  const documento = !dest || dest === 'document';

  const sess = await readSession(request, env);
  if (!sess) return recusa(url, documento, `/entrar/?next=${encodeURIComponent(path)}`);

  const account = await findAccountById(env, sess.uid);
  if (!account || (Number(account.session_version) || 0) !== (Number(sess.sv) || 0)) {
    return recusa(url, documento, `/entrar/?next=${encodeURIComponent(path)}`);
  }
  /* O aparelho saiu das três vagas (lib/aparelhos.js): o login diz por quê
     (auditoria de 01/10/2026, UXQA-006). Sem o motivo, quem foi derrubado
     caía num "Bem-vindo de volta" e achava que a conta tinha sido invadida. */
  if (!await aparelhoValido(env, sess)) {
    return recusa(url, documento, `/entrar/?next=${encodeURIComponent(path)}&motivo=aparelhos`);
  }

  const curso = cursoDaRota(path);
  const pode = curso === null
    ? (await activeEntitlements(env, account.id)).some(e => ehCurso(e.courseSlug))
    : await hasEntitlement(env, account.id, curso);
  if (!pode) {
    /* Produto sem página de venda - fora do catálogo (Raízes Sefarditas) ou
       com `aVenda: false` (o e-book, 22/10/2026): quem não tem o direito vai
       para a lista de cursos, e não para um 404. */
    /* O curso de alfabetização vende em /curso-de-hebraico (23/10/2026); ir
       direto para lá poupa o 301 do endereço antigo. */
    const pagina = SEM_PAGINA_DE_VENDA.has(curso) ? '/cursos/'
      : (curso || COURSE) === COURSE ? '/curso-de-hebraico/' : `/cursos/${curso}/`;
    return recusa(url, documento, pagina);
  }

  return null;
}

function recusa(url, documento, to) {
  if (!documento) {
    /* Um sub-recurso recusado não ganha HTML de login no lugar do que pediu:
       ganha um código, e o app decide o que fazer com ele. */
    return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(to, url.origin).toString(),
      /* Sem cache. Um 302 guardado pelo navegador continuaria mandando o
         aluno para a tela de vendas depois de ele ter comprado. */
      'Cache-Control': 'no-store'
    }
  });
}

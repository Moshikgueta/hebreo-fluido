/* Qual casca envolve cada rota: a pública ou a do aluno. Mora aqui, fora do
   componente, para ser testada sem montar a interface (tests/rotas-shell.test.ts).
   A história está em components/shell/Chrome.tsx. */

import { ehPaga } from '@/lib/seo';

/** Prefixos públicos. `/` é tratado à parte, senão casaria com tudo. */
const PUBLIC_PREFIXES = [
  '/metodo', '/cursos', '/sobre', '/faq', '/biblia',
  /* As páginas do alfabeto para a busca (23/10/2026, lib/alfabeto-publico.ts). */
  '/alfabeto-hebraico',
  /* O blog (29/10/2026): conteúdo aberto, para a busca. */
  '/blog',
  /* As telas de conta, incluindo as duas de recuperação de senha. Elas são
     públicas pela definição do problema: quem não consegue entrar não pode
     ter de entrar para voltar a entrar. (`/recuperar` estava nesta lista e
     nunca existiu como página - virou estas duas.) */
  '/entrar', '/criar-conta', '/esqueci-senha', '/nova-senha', '/sair-da-lista',
  /* A confirmação da lista de interessados (23/10/2026): quem clica não tem conta. */
  '/confirmar-lista',
  /* O link de confirmação de e-mail. Pública porque quem clica pode estar
     sem sessão - e aí a própria página pede o login, com o caminho de volta. */
  '/confirmar-email',
  /* O checkout é público de propósito: quem chega por um link de venda
     precisa ver o preço antes de ter conta. Quem paga tem de estar logado, e
     essa exigência é da própria tela, não do portão. */
  '/checkout',
  /* As páginas de confiança são públicas por definição: uma Política de
     Privacidade que exige login não informa o visitante, informa o cliente -
     e é justamente o visitante que precisa dela para decidir comprar. O
     mesmo vale para o atendimento: quem não consegue entrar é exatamente
     quem mais precisa escrever. */
  '/termos', '/privacidade', '/reembolso', '/suporte', '/acessibilidade',
  /* A confirmação de que a conta foi apagada.
     ──────────────────────────────────────────────────────────────────────
     Pública por necessidade, e não por conveniência: quem chega nela acabou
     de deixar de ter conta. A primeira versão mostrava a confirmação dentro
     do próprio /perfil, e ela nunca aparecia - o CourseGate via a sessão
     sumir e mandava a pessoa para /entrar no mesmo instante. O sintoma era o
     pior possível justamente nesta operação: a tela pulava para a página de
     vendas sem dizer nada, e a pessoa ficava sem saber se a conta dela tinha
     sido apagada ou não. Encontrado no navegador, e não nos testes, porque
     no teste a exclusão é uma chamada - na tela ela é uma chamada seguida de
     um portão. */
  '/conta-apagada'
] as const;

/** Rotas de conta: exigem login, não compra. */
const CONTA = ['/perfil'];

/**
 * Esta rota é do aluno (casca do curso + portão)?
 *
 * Até 28/09/2026 a regra era "tudo que não é público é do aluno", e um
 * endereço que não existe caía no portão: o visitante via a tela de login
 * no lugar de "Esta página não existe" (auditoria, QA-001). Agora a rota de
 * aluno é a que está na lista de rotas PAGAS - a mesma do portão do
 * servidor (worker/src/gate.js, espelhada em lib/seo.ts e conferida por
 * teste) - ou uma rota de conta. O resto, inclusive o endereço inexistente,
 * recebe a casca pública e a página 404.
 *
 * Isto não abre porta nenhuma: quem decide o acesso é o Worker, que recusa
 * as rotas pagas sem sessão e só entrega o conteúdo por /api/content a quem
 * comprou. PUBLIC_PREFIXES continua acima como a lista do que é público de
 * propósito, e `isPublicRoute` a respeita.
 */
export function isAppRoute(pathname: string | null): boolean {
  const p = (pathname ?? '/').replace(/\/+$/, '') || '/';
  if (p === '/' || PUBLIC_PREFIXES.some(prefix => p === prefix || p.startsWith(`${prefix}/`))) return false;
  return ehPaga(p) || CONTA.some(c => p === c || p.startsWith(`${c}/`));
}

export function isPublicRoute(pathname: string | null): boolean {
  return !isAppRoute(pathname);
}

/* As páginas que não usam o progresso do aluno (23/10/2026, velocidade no
   celular). Nelas o ProgressProvider (o estado, as regras, a loja, a
   sincronização) não monta, e o JavaScript dele não é baixado: era o que
   segurava a primeira pintura da capa no celular. Só entra aqui página cuja
   árvore de imports não chega a lib/state/store.tsx; tests/rotas-leves.test.ts
   confere isso arquivo por arquivo. Na dúvida, fica fora: o custo é velocidade,
   nunca o curso. */
export const ROTAS_LEVES = [
  '/', '/aprender-hebraico', '/descobrir-israel', '/israel-alem-do-obvio', '/raizes-sefarditas',
  '/curso-de-hebraico', '/metodo', '/sobre', '/faq', '/biblia', '/alfabeto-hebraico', '/blog',
  '/termos', '/privacidade', '/reembolso', '/suporte', '/acessibilidade',
  '/entrar', '/criar-conta', '/esqueci-senha', '/nova-senha',
  /* A porta do link da bio do Instagram (24/10/2026): quem chega é de celular. */
  '/comece-aqui',
  /* O desafio com um amigo (28/10/2026): quem abre não tem conta. */
  '/desafio-amigo',
  /* O cartão de festa de um amigo (05/11/2026): quem abre não tem conta. */
  '/cartao-de-festa'
] as const;

export function rotaLeve(pathname: string | null): boolean {
  const p = (pathname ?? '/').replace(/\/+$/, '') || '/';
  return (ROTAS_LEVES as readonly string[]).includes(p);
}

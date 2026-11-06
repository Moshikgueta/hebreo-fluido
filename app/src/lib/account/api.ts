/* A porta única entre o app e a plataforma.
 * ─────────────────────────────────────────────────────────────────────────
 * Duas implementações, uma interface:
 *
 *   · `worker`  - fala com /api/* (Cloudflare Worker + D1 + Mercado Pago).
 *                 É o que roda em produção.
 *   · `local`   - guarda tudo no localStorage do próprio navegador. É o que
 *                 roda em `npm run dev` e no export estático do GitHub Pages,
 *                 onde não existe /api nenhum.
 *
 * O adaptador local NÃO é um servidor de mentira que finge ser o de verdade
 * em silêncio. `mode` é público, a interface toda devolve ele, e a UI mostra
 * uma tarja dizendo que nada ali é cobrança real. Um checkout que parece ter
 * funcionado e não cobrou nada é a pior forma de bug que um produto pago pode
 * ter - vale mais um aviso feio.
 *
 * Qual dos dois entra é decidido em tempo de build por NEXT_PUBLIC_PLATFORM_API
 * (o padrão é 'local', porque é o que um clone recém-baixado consegue rodar).
 * Uma sonda em runtime seria mais esperta e daria um piscar de tela em toda
 * primeira carga, e escondereria uma implantação mal configurada em vez de
 * escancará-la.
 */

import type { Compras, CreatedOrder, Order, PaymentMethod, Session } from './types';
import type { Origem } from '@/lib/origem';

export type ApiMode = 'worker' | 'local';

export interface PlatformApi {
  readonly mode: ApiMode;

  /** A sessão atual, ou null. Nunca lança por falta de sessão. */
  me(): Promise<Session | null>;

  signUp(input: { name: string; email: string; password: string; aceitouTermos: boolean; declarouIdade: boolean }): Promise<Session>;
  signIn(input: { email: string; password: string }): Promise<Session>;
  signOut(): Promise<void>;

  /* ── senha ──────────────────────────────────────────────────────────────
     Três métodos para um assunto só, porque são três momentos diferentes da
     vida de uma conta. */

  /**
   * Pede o link de recuperação.
   *
   * **Nunca diz se a conta existe**, e a assinatura reflete isso: devolve
   * `void`, não um booleano. Um `Promise<boolean>` aqui seria um convite para
   * a tela mostrar "não achamos esse e-mail" - que é justamente transformar o
   * formulário numa lista de quem é cliente.
   *
   * No adaptador local devolve o link na mão, porque não há e-mail para
   * mandar; ver a nota lá.
   */
  requestPasswordReset(email: string): Promise<{ demoLink?: string }>;

  /** Troca a senha com o token do e-mail e já entra. */
  resetPassword(input: { token: string; password: string }): Promise<Session>;

  /** Troca a senha de quem já está dentro. Exige a senha atual: uma tela
   *  destrancada não pode bastar para tomar a conta. */
  changePassword(input: { current: string; password: string }): Promise<Session>;

  /* ── e-mail ─────────────────────────────────────────────────────────────
     Confirmar o endereço. As duas exigem sessão: o link só confirma a conta
     que está aberta, para que a dona de um endereço usado por outra pessoa
     não confirme, com um clique, a conta de quem o usou. */

  /** Manda o link de confirmação de novo. No adaptador local, devolve o link
   *  na mão, como na recuperação de senha. */
  requestEmailVerification(): Promise<{ demoLink?: string }>;

  /** Usa o link do e-mail. Devolve a sessão já com `emailVerified: true`. */
  confirmEmail(token: string): Promise<Session>;

  /** Apaga a conta do próprio titular, e desloga.
   *
   *  Exige a senha atual pelo mesmo motivo da troca de senha, que aqui pesa
   *  mais: um cookie roubado, um notebook emprestado ou um celular esquecido
   *  aberto não podem apagar a conta de ninguém.
   *
   *  Some a PESSOA - e-mail, nome, senha, progresso, acesso. Ficam os
   *  pedidos, sem dono identificável: registro de venda é obrigação fiscal, e
   *  a própria LGPD prevê a guarda (art. 16, I). */
  deleteAccount(input: { password: string }): Promise<void>;

  /** Entra ou sai da lista do aviso do próximo curso (a caixa do perfil).
   *  Só a pessoa põe o próprio nome nela; começa sempre fora. */
  setNovidades(quero: boolean): Promise<void>;

  /** Liga ou desliga o lembrete para estudar (a caixa do perfil). Começa
   *  sempre desligado. */
  setLembrete(quero: boolean): Promise<void>;

  /** Começa um pedido. Para PIX volta com o copia-e-cola; para cartão, com a
   *  URL do checkout da Mercado Pago em `redirectUrl`. */
  startOrder(input: { courseSlug: string; method: PaymentMethod; installments?: number; parceria?: string; origem?: Origem; nomeCompleto?: string; cpf?: string }):
    Promise<CreatedOrder>;

  /** O estado de um pedido, do servidor - nunca dos parâmetros de redirect.
   *  É esta chamada, e só ela, que diz se o acesso foi liberado. */
  orderStatus(orderId: string): Promise<Order>;

  /** Pedidos da conta, mais recente primeiro. Para a página de perfil. */
  orders(): Promise<Order[]>;

  /** Os pedidos e os acessos vencidos, com a data do fim. É o que deixa o
   *  /perfil e a página do curso dizerem "seu acesso terminou em ..." em vez
   *  de tratar quem pagou como visitante (a sessão só carrega os que valem). */
  compras(): Promise<Compras>;

  /** O PIX ainda pagável deste curso, se houver: o checkout reabre o MESMO
   *  código ao voltar do aplicativo do banco, em vez de gerar outro. */
  pixPendente(courseSlug: string): Promise<Order | null>;

  /** Desiste de uma compra dentro dos sete dias (CDC, art. 49), pelo próprio
   *  site, como o Decreto 7.962/2013 exige. Devolve quando o pedido ficou
   *  registrado; pedir de novo devolve o mesmo momento. */
  requestWithdrawal(orderId: string, motivo?: string | null): Promise<{ pedidoEm: string }>;
}

const MODE: ApiMode =
  (process.env.NEXT_PUBLIC_PLATFORM_API as ApiMode | undefined) === 'worker'
    ? 'worker' : 'local';

let instance: PlatformApi | null = null;

/** O adaptador desta build. Criado uma vez, tarde - nada de tocar em
 *  localStorage no topo do módulo, que quebraria o prerender. */
export async function api(): Promise<PlatformApi> {
  if (instance) return instance;
  instance = MODE === 'worker'
    ? new (await import('./worker-api')).WorkerApi()
    : new (await import('./local-api')).LocalApi();
  return instance;
}

export const apiMode = (): ApiMode => MODE;

/** Verdadeiro quando nenhuma cobrança desta build é real. A UI usa isto para
 *  a tarja de demonstração, e o checkout para não prometer nada. */
export const isDemo = (): boolean => MODE === 'local';

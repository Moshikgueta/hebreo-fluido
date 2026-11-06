/* O adaptador de produção: /api/*, servido pelo Cloudflare Worker.
 * ─────────────────────────────────────────────────────────────────────────
 * Três decisões que aparecem em cada método:
 *
 *   1. `credentials: 'same-origin'`. A sessão é um cookie assinado, HttpOnly -
 *      o JavaScript desta página não consegue lê-lo, e é exatamente por isso
 *      que ele é seguro. Não há token em localStorage; um XSS aqui não leva
 *      sessão nenhuma embora.
 *
 *   2. Erro é um código, não um texto. O servidor devolve
 *      `{ error: 'bad-credentials' }` e a frase em português sai de
 *      types.ts - um só lugar para reescrever o que o aluno lê.
 *
 *   3. Nada de confiar em parâmetro de redirect. `orderStatus` sempre pergunta
 *      ao servidor, que por sua vez reconfere com a Mercado Pago. É a regra
 *      que o projeto irmão em espanhol aprendeu da pior maneira, e está
 *      escrita no IMPLEMENTATION.md dele: acesso nunca é liberado a partir
 *      do que volta na URL do navegador.
 */

import type { PlatformApi } from './api';
import type { Origem } from '@/lib/origem';
import { AuthError, type AuthErrorCode, type Compras, type CreatedOrder, type Order, type PaymentMethod, type Session } from './types';

/* Sempre a própria origem. Isto já foi `process.env.NEXT_PUBLIC_API_BASE`, e
   como a variável nunca era definida no build o empacotador não a congelava:
   ficava uma leitura em tempo de execução de `globalThis.process`, que
   qualquer script rodando antes do nosso podia definir - e aí o login inteiro,
   senha incluída, ia para o endereço que esse script escolhesse. Um valor que
   nunca mudou não precisa de variável. */
const BASE = '';

const CODES: readonly string[] = [
  'bad-credentials', 'email-taken', 'weak-password', 'invalid-email',
  'not-signed-in', 'offline', 'server', 'rate-limited', 'rate-limited-hora', 'payments-off',
  'bad-token', 'payment-failed', 'card-off', 'pix-off', 'already-owned',
  'fora-do-prazo', 'nao-pago', 'dados-fiscais'
];

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }
    });
  } catch {
    /* Rede caiu, DNS falhou, o usuário está no metrô. Não é erro de servidor
       e não adianta pedir para "tentar de novo mais tarde" com outra palavra. */
    throw new AuthError('offline');
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try { body = await res.json(); } catch { /* resposta vazia ou HTML de erro */ }

  if (!res.ok) {
    const code = (body as { error?: string } | null)?.error;
    throw new AuthError(
      code && CODES.includes(code) ? (code as AuthErrorCode)
        : res.status === 401 ? 'not-signed-in'
        : res.status === 429 ? 'rate-limited'
        : 'server'
    );
  }
  return body as T;
}

export class WorkerApi implements PlatformApi {
  readonly mode = 'worker' as const;

  /** A pergunta "há sessão?" em voo, compartilhada. O AccountProvider e o
   *  progresso (lib/state/worker.ts) perguntam juntos ao abrir cada página;
   *  uma ida à rede responde aos dois. Só enquanto está em voo: resposta
   *  guardada depois envelheceria (uma compra, um login em outra aba). */
  #meEmVoo: Promise<Session | null> | null = null;

  me(): Promise<Session | null> {
    if (this.#meEmVoo) return this.#meEmVoo;
    const p = this.#buscarMe().finally(() => { this.#meEmVoo = null; });
    this.#meEmVoo = p;
    return p;
  }

  async #buscarMe(): Promise<Session | null> {
    try {
      /* `X-HF-Sessao: opcional`: sem sessão, o servidor responde 200
         `{ signedIn: false }` em vez de 401, e o console do visitante não
         ganha um erro vermelho por página (auditoria de 01/10/2026,
         PERF-007). Ver `semSessao` em worker/src/api/auth.js. */
      const s = await call<Session | { signedIn: false }>('/me', { headers: { 'X-HF-Sessao': 'opcional' } });
      return s && typeof s === 'object' && 'account' in s && s.account ? s : null;
    } catch (e) {
      /* Sem sessão é uma resposta, não uma falha: é o estado de todo visitante
         que ainda não entrou. O 401 continua possível (um Worker anterior a
         esta mudança, depois de um rollback). Só relança o que for realmente
         um problema. */
      if (e instanceof AuthError && e.code === 'not-signed-in') return null;
      throw e;
    }
  }

  signUp(input: { name: string; email: string; password: string; aceitouTermos: boolean; declarouIdade: boolean }): Promise<Session> {
    return call<Session>('/auth/signup', { method: 'POST', body: JSON.stringify(input) });
  }

  signIn(input: { email: string; password: string }): Promise<Session> {
    return call<Session>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  }

  signOut(): Promise<void> {
    return call<void>('/auth/logout', { method: 'POST' });
  }

  async requestPasswordReset(email: string): Promise<{ demoLink?: string }> {
    /* O servidor responde `{ ok: true }` para e-mail que existe e para e-mail
       que não existe, de propósito. O retorno é descartado aqui para que
       nenhuma tela seja tentada a olhar dentro dele. */
    await call<{ ok: true }>('/auth/forgot', {
      method: 'POST', body: JSON.stringify({ email })
    });
    return {};
  }

  resetPassword(input: { token: string; password: string }): Promise<Session> {
    return call<Session>('/auth/reset', { method: 'POST', body: JSON.stringify(input) });
  }

  changePassword(input: { current: string; password: string }): Promise<Session> {
    return call<Session>('/auth/password', { method: 'POST', body: JSON.stringify(input) });
  }

  async requestEmailVerification(): Promise<{ demoLink?: string }> {
    await call<{ ok: true }>('/auth/verify/send', { method: 'POST' });
    return {};
  }

  confirmEmail(token: string): Promise<Session> {
    return call<Session>('/auth/verify', { method: 'POST', body: JSON.stringify({ token }) });
  }

  async deleteAccount(input: { password: string }): Promise<void> {
    await call<{ ok: true }>('/auth/delete', { method: 'POST', body: JSON.stringify(input) });
  }

  async setNovidades(quero: boolean): Promise<void> {
    await call<{ ok: true }>('/novidades', { method: 'PUT', body: JSON.stringify({ quero }) });
  }

  async setLembrete(quero: boolean): Promise<void> {
    await call<{ ok: true }>('/lembrete', { method: 'PUT', body: JSON.stringify({ quero }) });
  }

  startOrder(input: { courseSlug: string; method: PaymentMethod; installments?: number; parceria?: string; origem?: Origem; nomeCompleto?: string; cpf?: string }) {
    return call<CreatedOrder>('/pay/create', {
      method: 'POST', body: JSON.stringify(input)
    });
  }

  orderStatus(orderId: string): Promise<Order> {
    return call<Order>(`/pay/verify?order=${encodeURIComponent(orderId)}`);
  }

  orders(): Promise<Order[]> {
    return call<{ orders: Order[] }>('/orders').then(r => r.orders);
  }

  compras(): Promise<Compras> {
    return call<{ orders: Order[]; vencidos?: Compras['vencidos'] }>('/orders')
      .then(r => ({ orders: r.orders, vencidos: r.vencidos ?? [] }));
  }

  pixPendente(courseSlug: string): Promise<Order | null> {
    return call<{ order: Order | null }>(`/pay/pix?curso=${encodeURIComponent(courseSlug)}`)
      .then(r => r.order);
  }

  requestWithdrawal(orderId: string, motivo?: string | null): Promise<{ pedidoEm: string }> {
    return call<{ pedidoEm: string }>('/pay/desistir', {
      method: 'POST', body: JSON.stringify({ order: orderId, ...(motivo ? { motivo } : {}) })
    });
  }
}

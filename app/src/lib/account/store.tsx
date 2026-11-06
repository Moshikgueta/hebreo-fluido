'use client';

/* A sessão, no React.
 * ─────────────────────────────────────────────────────────────────────────
 * Um provider acima de tudo, um hook em todo lugar. O que vale a pena
 * explicar é o estado `ready`.
 *
 * Saber se existe sessão custa uma viagem de rede (o cookie é HttpOnly; esta
 * página não consegue ler o cookie e concluir sozinha). Durante essa viagem a
 * resposta certa não é "não está logado" - é "ainda não sei". Tratar as duas
 * como a mesma coisa produz o pior bug de plataforma que existe: o aluno que
 * já pagou recarrega a página e é mandado para a tela de vendas por um
 * instante. Por isso `ready` é separado de `session`, e todo portão espera.
 *
 * O progresso (lib/state) continua sendo do APARELHO, não da conta. Isso é
 * uma escolha, não um esquecimento: o curso funciona sem conta nenhuma desde
 * o primeiro dia, e sincronizar progresso exige decidir o que fazer quando
 * dois aparelhos discordam - um problema de fusão, não de armazenamento.
 * Ver ARCHITECTURE.md §11.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode
} from 'react';
import { api, apiMode, isDemo, type ApiMode } from './api';
import { hasAccess, type CreatedOrder, type Order, type PaymentMethod, type Session } from './types';
import type { Origem } from '@/lib/origem';

type AccountValue = {
  /** A sessão já foi consultada? Antes disso, nada de decidir nada. */
  ready: boolean;
  session: Session | null;
  signedIn: boolean;
  mode: ApiMode;
  /** Nenhuma cobrança desta build é real. */
  demo: boolean;

  signUp(i: { name: string; email: string; password: string; aceitouTermos: boolean; declarouIdade: boolean }): Promise<void>;
  signIn(i: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
  /** Recarrega a sessão do servidor - depois de um pagamento, por exemplo. */
  refresh(): Promise<Session | null>;

  /** Pede o link de recuperação. Nunca diz se a conta existe. No modo
   *  demonstração volta com `demoLink`, porque não há e-mail para mandar. */
  requestPasswordReset(email: string): Promise<{ demoLink?: string }>;
  /** Escolhe a senha nova pelo link do e-mail, e já entra. */
  resetPassword(i: { token: string; password: string }): Promise<void>;
  /** Troca a senha de quem já está dentro. Exige a senha atual. */
  changePassword(i: { current: string; password: string }): Promise<void>;
  /** Apaga a conta do próprio titular, e sai. Exige a senha atual. */
  deleteAccount(i: { password: string }): Promise<void>;

  requestEmailVerification(): Promise<{ demoLink?: string }>;
  confirmEmail(token: string): Promise<void>;
  /** A caixa do perfil do aviso do próximo curso. */
  setNovidades(quero: boolean): Promise<void>;
  /** A caixa do perfil do lembrete para estudar. */
  setLembrete(quero: boolean): Promise<void>;

  startOrder(i: { courseSlug: string; method: PaymentMethod; installments?: number; parceria?: string; origem?: Origem; nomeCompleto?: string; cpf?: string }):
    Promise<CreatedOrder>;
  orderStatus(id: string): Promise<Order>;
  requestWithdrawal(orderId: string, motivo?: string | null): Promise<{ pedidoEm: string }>;

  /** Este aluno pode abrir este curso agora? */
  can(courseSlug: string): boolean;
};

const Ctx = createContext<AccountValue | null>(null);

/** O nome do evento que diz "a sessão mudou de dono". */
export const SESSAO_MUDOU = 'hf-sessao';

/* Entrar e sair mudam DE QUEM é o progresso, e o provider de progresso não
   conhece este módulo (nem deve: o curso funciona sem conta nenhuma). Um
   evento no `window` é o acoplamento mais fino que resolve isso - quem se
   importa escuta, quem não se importa nem sabe que existe. */
/* `saiu` separa as duas trocas de dono, que pedem coisas opostas do provider
   de progresso: quem ENTRA quer que o aparelho funda com a conta; quem SAI
   quer que o aparelho esqueça. Sem a distinção, sair recarregava o estado e o
   deixava no navegador - o estudo de quem saiu, legível para quem sentar
   depois num computador compartilhado. */
const avisar = (saiu = false) => {
  try {
    window.dispatchEvent(new CustomEvent(SESSAO_MUDOU, { detail: { saiu } }));
  } catch { /* SSR */ }
};

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  /* Evita gravar estado depois de o provider sair - acontece de verdade
     quando alguém troca de rota no meio do /api/me. */
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = useCallback(async () => {
    const s = await (await api()).me().catch(() => null);
    if (alive.current) { setSession(s); setReady(true); }
    return s;
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<AccountValue>(() => ({
    ready,
    session,
    signedIn: session !== null,
    mode: apiMode(),
    demo: isDemo(),

    async signUp(i) { setSession(await (await api()).signUp(i)); setReady(true); avisar(); },
    async signIn(i) { setSession(await (await api()).signIn(i)); setReady(true); avisar(); },
    async signOut() { await (await api()).signOut(); setSession(null); avisar(true); },
    refresh,

    requestPasswordReset: async email => (await api()).requestPasswordReset(email),

    /* Redefinir já entra - o servidor manda o cookie novo na mesma resposta.
       `avisar()` porque isso É uma troca de dono do progresso: quem redefine
       a senha muitas vezes está num aparelho onde nunca esteve logado. */
    async resetPassword(i) {
      setSession(await (await api()).resetPassword(i));
      setReady(true);
      avisar();
    },

    /* Trocar a senha estando dentro NÃO troca o dono - é a mesma pessoa, na
       mesma conta. Por isso não avisa: um `avisar()` aqui faria o provider de
       progresso recarregar o estado do zero no meio da sessão, à toa. */
    async changePassword(i) { setSession(await (await api()).changePassword(i)); },

    /* Apagar a conta termina como SAIR, e não como trocar a senha: `avisar
       (true)` é o que faz o aparelho esquecer o estudo em vez de recarregá-lo.
       Sem isso, o progresso de quem acabou de apagar a conta continuaria no
       localStorage, legível para a próxima pessoa que sentasse no mesmo
       computador - e uma exclusão que deixa rastro no aparelho não é uma
       exclusão. */
    async deleteAccount(i) {
      await (await api()).deleteAccount(i);
      setSession(null);
      avisar(true);
    },

    requestEmailVerification: async () => (await api()).requestEmailVerification(),
    /* A mesma conta, só com o e-mail confirmado: sem `avisar()`, pelo mesmo
       motivo da troca de senha. */
    async confirmEmail(token) { setSession(await (await api()).confirmEmail(token)); },
    async setNovidades(quero) {
      await (await api()).setNovidades(quero);
      setSession(s => s && { ...s, account: { ...s.account, novidades: quero } });
    },
    async setLembrete(quero) {
      await (await api()).setLembrete(quero);
      setSession(s => s && { ...s, account: { ...s.account, lembrete: quero } });
    },

    startOrder: async i => (await api()).startOrder(i),
    orderStatus: async id => (await api()).orderStatus(id),
    requestWithdrawal: async (id, motivo) => (await api()).requestWithdrawal(id, motivo),

    can: slug => hasAccess(session, slug)
  }), [ready, session, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAccount fora de <AccountProvider>'); // i18n-ok: erro de desenvolvedor
  return v;
}

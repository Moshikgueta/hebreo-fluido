/* Um D1 de mentira, sobre um SQLite de verdade.
 * ─────────────────────────────────────────────────────────────────────────
 * O fluxo de senha é quase todo SQL: um UPDATE com `used_at IS NULL` dentro
 * que precisa ser a corrida inteira, um índice parcial, uma coluna que sobe
 * sozinha. Um mock de banco - um objeto que devolve o que o teste mandou
 * devolver - concordaria com qualquer consulta, inclusive com as erradas, e
 * o teste passaria provando nada.
 *
 * Então aqui o banco é o SQLite embutido do Node (`node:sqlite`), carregado
 * com o `worker/schema.sql` que vai para produção. O que este arquivo faz é
 * só traduzir a forma da API: o D1 fala
 * `prepare(sql).bind(...).first()/run()/all()`, o node:sqlite fala
 * `prepare(sql).get(...)/run(...)/all(...)`.
 *
 * O que ele NÃO cobre, e é honesto dizer: o D1 não é SQLite em rede, é
 * SQLite de verdade, mas com limites próprios (tamanho de resultado, tempo)
 * e sem transações interativas. Nada disso aparece aqui. O que aparece é se
 * o SQL está certo - que é onde moram os erros deste fluxo.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

type Linha = Record<string, unknown> | null;

class Preparada {
  #stmt: ReturnType<DatabaseSync['prepare']>;
  #args: unknown[] = [];

  constructor(db: DatabaseSync, sql: string) {
    this.#stmt = db.prepare(sql);
  }

  bind(...args: unknown[]): this {
    /* O D1 aceita undefined e trata como NULL; o node:sqlite recusa. */
    this.#args = args.map(a => (a === undefined ? null : a));
    return this;
  }

  async first(): Promise<Linha> {
    const r = this.#stmt.get(...(this.#args as never[]));
    /* O node:sqlite devolve objeto sem protótipo; o resto do código trata
       como objeto comum, e um `{...r}` evita surpresa em qualquer helper que
       espere `Object.prototype`. */
    return r ? { ...(r as object) } as Record<string, unknown> : null;
  }

  async all(): Promise<{ results: Record<string, unknown>[] }> {
    const rows = this.#stmt.all(...(this.#args as never[])) as object[];
    return { results: rows.map(r => ({ ...r }) as Record<string, unknown>) };
  }

  async run(): Promise<{ meta: { changes: number; last_row_id: number } }> {
    const r = this.#stmt.run(...(this.#args as never[]));
    return {
      meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) }
    };
  }
}

export type D1Falso = {
  prepare(sql: string): Preparada;
  batch(stmts: Preparada[]): Promise<{ meta: { changes: number; last_row_id: number } }[]>;
  /** Para o teste espiar o banco sem passar pela API. */
  bruto: DatabaseSync;
};

/** Um banco novo, com o esquema de produção aplicado. */
export function bancoDeTeste(): D1Falso {
  const db = new DatabaseSync(':memory:');
  const schema = readFileSync(new URL('../../../worker/schema.sql', import.meta.url), 'utf8');
  db.exec(schema);
  /* E as migrações, em ordem, como a publicação faz (scripts/cloudflare-setup.sh,
     passo 3b): uma coluna nova só existe nelas. */
  const migr = new URL('../../../worker/migrations/', import.meta.url);
  for (const nome of readdirSync(migr).filter(n => /^\d{4}-[a-z0-9.-]+\.sql$/.test(n)).sort()) {
    db.exec(readFileSync(new URL(nome, migr), 'utf8'));
  }
  return {
    prepare: (sql: string) => new Preparada(db, sql),

    /* `batch` do D1: a lista roda como UMA transação, e um erro no meio
       desfaz tudo. Apagar uma conta depende disso - metade apagada é uma
       conta sem acesso e sem progresso, ainda com o e-mail da pessoa dentro.
       Aqui é BEGIN/COMMIT do SQLite, que é a mesma garantia; o que o D1 tem a
       mais e isto não tem são os limites de tamanho e tempo dele. */
    async batch(stmts: Preparada[]) {
      db.exec('BEGIN');
      try {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },

    bruto: db
  };
}

/**
 * O `env` que os handlers do Worker recebem.
 *
 * `PBKDF2_ITERATIONS` em 10.000 (o mínimo que `itersFor` aceita) porque cada
 * teste faz vários hashes e o padrão de 25.000 transformaria a suíte inteira
 * numa espera. O número não muda o comportamento testado - ele é gravado na
 * linha da conta e lido de volta, que é justamente o que um dos testes
 * confere.
 */
export function envDeTeste(extra: Record<string, unknown> = {}) {
  return {
    DB: bancoDeTeste(),
    SESSION_SECRET: 'segredo-de-teste-nao-usado-em-lugar-nenhum',
    SITE_ORIGIN: 'https://hebraicofluente.com.br',
    PBKDF2_ITERATIONS: '10000',
    ADMIN_TOKEN: ADMIN_TOKEN_DE_TESTE,
    ...extra
  } as Record<string, unknown>;
}

/** O ADMIN_TOKEN dos testes: o que abre os detalhes de /api/health
 *  (SEC-A-007). Em produção quem o gera é scripts/cloudflare-setup.sh. */
export const ADMIN_TOKEN_DE_TESTE = 'token-de-administrador-so-dos-testes-0123456789';

/** GET /api/health com o token: a resposta DETALHADA, a da conferência. */
export const saudeDetalhada = (ip = '203.0.113.200') =>
  new Request('https://hebraicofluente.com.br/api/health', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN_DE_TESTE}`, 'CF-Connecting-IP': ip }
  });

/** Uma requisição JSON como o app faz. */
export const pedido = (url: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

/** O cookie de sessão que veio numa resposta, pronto para a próxima. */
export function cookieDe(r: Response): string {
  const set = r.headers.get('set-cookie') || '';
  return set.split(';')[0] || '';
}

/** O cookie de sessão de um administrador com o segundo fator já feito
 *  (lib/admin.js): o mesmo que o código por e-mail daria. Para os testes das
 *  rotas de administrador que não são sobre o código em si. */
export async function comoAdmin(env: Record<string, unknown>, cookie: string): Promise<string> {
  // @ts-expect-error - módulo JS do Worker, sem tipos
  const { readSession } = await import('../../../worker/src/lib/session.js');
  // @ts-expect-error - idem
  const { cookieDeAdmin } = await import('../../../worker/src/lib/admin.js');
  const sess = await readSession(new Request('https://x/', { headers: { cookie } }), env);
  if (!sess) throw new Error('comoAdmin: sessão inválida');
  const admin = String(await cookieDeAdmin(env, sess)).split(';')[0];
  return `${cookie}; ${admin}`;
}

/** O nome completo e o CPF da nota fiscal (06/11/2026): o site brasileiro não
 *  cria pedido sem eles. O CPF é um número de teste válido. */
export const DADOS_FISCAIS = { nomeCompleto: 'Maria da Silva', cpf: '529.982.247-25' } as const;

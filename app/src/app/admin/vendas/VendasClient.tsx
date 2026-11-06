'use client';

/* Quem comprou (02/10/2026). Ver worker/src/api/vendas-admin.js.
 *
 * As últimas compras pagas ou estornadas: nome, e-mail, valor, meio, data e,
 * quando houver, o link de campanha de onde o pedido veio. Só leitura.
 * Desde 23/10/2026, também a origem da visita (lib/origem.ts) e a campanha,
 * e as compras de contas de administrador (os testes do dono) vão à parte.
 * Desde 05/10/2026, também se a pessoa já começou o curso, e até onde foi.
 * Desde 03/11/2026, as desistências: quantos dias depois da compra, com
 * quantas letras concluídas e se já tinha passado no exame final. E o funil
 * (`funil`): de quem pagou, quantos começaram, quantos fecharam cada módulo
 * de letras e quantos fizeram o exame final - para ver se as travas de
 * 03/11/2026 (perguntas, revisão entre módulos, leituras) ajudam ou atrapalham.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { asset } from '@/lib/asset';
import { CodigoDoAdmin, pedeCodigo } from '@/components/platform/CodigoDoAdmin';
import { course, letterIds } from '@/lib/content-publico';
import { FONTES_PT } from '@/lib/painel-estatisticas';

type Venda = {
  orderId: string; curso: string; valorCentavos: number; liquidoCentavos?: number | null; metodo: string; parcelas: number;
  status: 'paid' | 'refunded'; pagoEm: number; parceria: string | null; origem?: string | null; campanha?: string | null;
  nome: string; email: string | null;
  nomeCompleto?: string | null; cpf?: string | null;
  estudouEm: number | null; concluidas: string[]; teste?: boolean;
  desistiuEm?: number | null; exameFeito?: boolean;
  diasDeEstudo?: number; minutosEstimados?: number;
  revisoes?: string[]; leituras?: string[];
};
type NaoPago = {
  orderId: string; curso: string; valorCentavos: number; metodo: string; status: string; criadoEm: number;
  origem: string | null; campanha: string | null; nome: string; email: string | null; comprouDepois: boolean;
};
type Estado = { tipo: 'carregando' } | { tipo: 'sem-sessao' } | { tipo: 'nao-admin' } | { tipo: 'codigo' } | { tipo: 'erro' }
  | { tipo: 'pronto'; vendas: Venda[]; naoPagos: NaoPago[] };

/* O endereço que o dono divulgou, para cada nome de parceria. */
const LINK: Record<string, string> = {
  sefarad: 'hebraicofluente.com.br/sefarad', bio: 'hebraicofluente.com.br/bio',
  stories: 'hebraicofluente.com.br/stories', dm: 'hebraicofluente.com.br/dm'
};

const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const LETRAS = new Set(letterIds());
const quando = (ms: number) => new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const letrasDe = (v: Venda) => v.concluidas.filter(id => LETRAS.has(id)).length;
/** "45 min", "2 h 10 min". */
const duracao = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`);
/** O funil, uma pessoa por e-mail (quem renovou conta uma vez). */
export function funil(pagas: readonly Venda[]) {
  const porPessoa = new Map<string, Venda>();
  for (const v of pagas) {
    const chave = v.email ?? v.orderId;
    const antes = porPessoa.get(chave);
    if (!antes || v.concluidas.length > antes.concluidas.length) porPessoa.set(chave, v);
  }
  const pessoas = [...porPessoa.values()];
  const modulos = course.modules.filter(m => m.letterIds.length > 0);
  return {
    total: pessoas.length,
    etapas: [
      { rotulo: 'Começaram o curso', n: pessoas.filter(v => v.estudouEm !== null).length },
      ...modulos.map(m => ({
        rotulo: `Fecharam o módulo ${m.n}`,
        n: pessoas.filter(v => m.letterIds.every(id => v.concluidas.includes(id))).length
      })),
      { rotulo: 'Fizeram o exame final', n: pessoas.filter(v => v.exameFeito).length }
    ]
  };
}

function Funil({ pagas }: { pagas: readonly Venda[] }) {
  const { total, etapas } = funil(pagas);
  if (!total) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  return (
    <section aria-labelledby="funil" className="grid gap-2 rounded-[var(--r-md)] border border-line p-4">
      <h2 id="funil" className="text-[18px] font-semibold m-0">Até onde os alunos chegam</h2>
      <p className="font-ui text-[14px] text-ink-muted m-0">
        De {total} {total === 1 ? 'pessoa que pagou' : 'pessoas que pagaram'} (uma vez por e-mail, sem estornos nem testes).
      </p>
      <ul className="grid gap-1.5 m-0 p-0 list-none">
        {etapas.map(e => (
          <li key={e.rotulo} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 font-ui text-[14px]">
            <span>{e.rotulo}</span>
            <span aria-hidden className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
              <span className="block h-full rounded-full bg-[var(--teal)]" style={{ width: `${pct(e.n)}%` }} />
            </span>
            <span className="tabular-nums text-right">{e.n} · {pct(e.n)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const diasAte = (v: Venda) => Math.max(0, Math.floor(((v.desistiuEm ?? v.pagoEm) - v.pagoEm) / 86_400_000));

export function VendasClient() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(asset('/api/admin/vendas'), { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) return setEstado({ tipo: 'sem-sessao' });
      if (await pedeCodigo(r)) return setEstado({ tipo: 'codigo' });
      if (r.status === 403) return setEstado({ tipo: 'nao-admin' });
      if (!r.ok) return setEstado({ tipo: 'erro' });
      const { vendas, naoPagos } = await r.json() as { vendas: Venda[]; naoPagos?: NaoPago[] };
      setEstado({ tipo: 'pronto', vendas, naoPagos: naoPagos ?? [] });
    } catch { setEstado({ tipo: 'erro' }); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const reaisDeAlunos = estado.tipo === 'pronto' ? estado.vendas.filter(v => !v.teste) : [];
  const testes = estado.tipo === 'pronto' ? estado.vendas.filter(v => v.teste) : [];
  const pagas = reaisDeAlunos.filter(v => v.status === 'paid');
  const doLink = pagas.filter(v => v.parceria).length;
  const desistencias = reaisDeAlunos.filter(v => v.desistiuEm);
  const mediaLetras = desistencias.length
    ? Math.round(desistencias.reduce((s, v) => s + letrasDe(v), 0) / desistencias.length) : 0;

  return (
    <main className="mx-auto max-w-[760px] px-4 py-10 grid gap-5">
      <header className="grid gap-2">
        <h1 className="text-[26px] font-bold m-0">Vendas</h1>
        <p className="font-ui text-[16px] text-ink-body m-0">
          As compras pagas, da mais recente para a mais antiga. Quando a pessoa chegou por um link de campanha,
          a compra mostra qual. Compras feitas antes de 02/10/2026 aparecem sem essa informação.
        </p>
      </header>

      <div role="status" aria-live="polite" className="font-ui text-[16px] grid gap-3">
        {estado.tipo === 'carregando' && <p className="m-0">Carregando…</p>}
        {estado.tipo === 'sem-sessao' && (
          <p className="m-0">
            Entre com a conta de administrador.{' '}
            <Link href="/entrar/?next=/admin/vendas/" className="text-[var(--accent)] underline">Entrar</Link>
          </p>
        )}
        {estado.tipo === 'nao-admin' && <p className="m-0">Esta conta não tem acesso a este painel.</p>}
        {estado.tipo === 'codigo' && <CodigoDoAdmin onPronto={() => void carregar()} />}
        {estado.tipo === 'erro' && <p className="m-0">Não consegui carregar agora. Confira a internet e tente de novo.</p>}
        {estado.tipo === 'pronto' && reaisDeAlunos.length === 0 && <p className="m-0">Nenhuma compra de aluno ainda.</p>}
        {estado.tipo === 'pronto' && pagas.length > 0 && (
          <p className="m-0">
            <strong>{pagas.length}</strong> {pagas.length === 1 ? 'compra paga' : 'compras pagas'}
            {' · '}{reais(pagas.reduce((s, v) => s + v.valorCentavos, 0))}
            {' · '}{doLink} pelo link de campanha
          </p>
        )}
        {estado.tipo === 'pronto' && desistencias.length > 0 && (
          <p className="m-0 text-[15px]">
            <strong>{desistencias.length}</strong> {desistencias.length === 1 ? 'desistência' : 'desistências'} pelo site
            {' · '}em média {mediaLetras} de {course.totalLetters} letras concluídas antes de desistir
            {' · '}{desistencias.filter(v => v.exameFeito).length} com o exame final feito
          </p>
        )}
        {estado.tipo === 'pronto' && pagas.some(v => v.liquidoCentavos != null) && (
          <p className="m-0 text-[15px]">
            Depois da taxa da Mercado Pago:{' '}
            <strong>{reais(pagas.reduce((s, v) => s + (v.liquidoCentavos ?? 0), 0))}</strong>
            {' '}nas {pagas.filter(v => v.liquidoCentavos != null).length} compras em que ela informou o valor. As anteriores
            a 26/10/2026, o PIX direto e a liberação à mão não têm esse número.
          </p>
        )}
      </div>

      {estado.tipo === 'pronto' && <Funil pagas={pagas} />}
      {estado.tipo === 'pronto' && <NaoPagos lista={estado.naoPagos} />}

      {reaisDeAlunos.map(v => <Cartao key={v.orderId} v={v} />)}

      {testes.length > 0 && (
        <details className="font-ui text-[15px]">
          <summary className="cursor-pointer">
            Testes do administrador ({testes.length}): compras de contas de ADMIN_EMAILS, fora dos totais
          </summary>
          <div className="grid gap-3 mt-3">
            {testes.map(v => <Cartao key={v.orderId} v={v} />)}
          </div>
        </details>
      )}
    </main>
  );
}

/* ── em que módulo a pessoa está, e o que falta para fechá-lo (04/11/2026) ──
   O módulo atual é o primeiro de letras com alguma letra por concluir. Os
   anteriores aparecem como "fechados" quando têm a revisão (checkpoint) e as
   leituras obrigatórias (a Primeira Leitura e, onde existe, o texto
   principal) - a mesma porta de lib/sons.ts, `portasDosModulos`. */
export function ondeEsta(v: Pick<Venda, 'concluidas' | 'revisoes' | 'leituras'>) {
  const feitas = new Set(v.concluidas);
  const revisoes = new Set(v.revisoes ?? []);
  const leituras = new Set(v.leituras ?? []);
  const modulos = course.modules.filter(m => m.letterIds.length > 0);
  const atual = modulos.find(m => !m.letterIds.every(id => feitas.has(id))) ?? null;
  const fechamento = modulos
    .filter(m => m.letterIds.every(id => feitas.has(id)))
    .map(m => {
      const faltam: string[] = [];
      if (m.checkpoint && !revisoes.has(m.checkpoint.id)) faltam.push('a revisão');
      if (!leituras.has(`primeira-leitura-m${m.n}`)) faltam.push('a Primeira Leitura');
      if (m.textoPrincipal && !leituras.has(`texto-${m.n}`)) faltam.push('o texto principal');
      return { n: m.n, faltam };
    });
  return {
    atual: atual ? { n: atual.n, titulo: atual.titlePt, feitas: atual.letterIds.filter(id => feitas.has(id)).length, total: atual.letterIds.length } : null,
    fechados: fechamento.filter(f => !f.faltam.length).map(f => f.n),
    abertos: fechamento.filter(f => f.faltam.length)
  };
}

const lista = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;

function OndeEsta({ v }: { v: Venda }) {
  const o = ondeEsta(v);
  return (
    <div className="font-ui text-[14px] m-0 grid gap-0.5">
      <p className="m-0">
        {o.atual
          ? <>Está no <strong>módulo {o.atual.n}</strong> ({o.atual.titulo}) · {o.atual.feitas} de {o.atual.total} letras dele</>
          : <>Concluiu as letras dos módulos 1 a 5</>}
        {o.fechados.length > 0 && <> · fechou {o.fechados.length === 1 ? 'o módulo' : 'os módulos'} {lista(o.fechados.map(String))}</>}
      </p>
      {o.abertos.map(f => (
        <p key={f.n} className="m-0 text-ink-muted">
          Módulo {f.n}: letras feitas, falta {lista(f.faltam)}
        </p>
      ))}
    </div>
  );
}

/* ── os pedidos que não foram pagos (04/11/2026) ───────────────────────── */
const SITUACAO: Record<string, string> = {
  pending: 'aguardando pagamento', expired: 'PIX vencido', failed: 'pagamento recusado', cancelled: 'cancelado'
};
/* "Vencido" só é PIX vencido no PIX: no cartão, o pedido vence quando o
   pagamento não é concluído (04/11/2026, o painel dizia "PIX vencido" num
   pedido de cartão). */
export const situacaoDoPedido = (x: Pick<NaoPago, 'status' | 'metodo'>) =>
  x.status === 'expired' && x.metodo !== 'pix' ? 'pagamento não concluído' : SITUACAO[x.status] ?? x.status;

function NaoPagos({ lista: itens }: { lista: readonly NaoPago[] }) {
  if (!itens.length) return null;
  const depois = itens.filter(x => x.comprouDepois).length;
  return (
    <details className="rounded-[var(--r-md)] border border-line p-4 font-ui text-[15px]">
      <summary className="cursor-pointer">
        <strong>Pedidos que não foram pagos ({itens.length})</strong>
        {depois > 0 && <> · {depois} {depois === 1 ? 'dessas pessoas comprou' : 'dessas pessoas compraram'} depois</>}
      </summary>
      <p className="text-[14px] text-ink-muted mt-2 mb-3">
        Quem chegou a gerar um PIX ou tentar o cartão e não concluiu. Só para você ver: o site não manda nada a essas pessoas.
      </p>
      <ul className="grid gap-2 m-0 p-0 list-none">
        {itens.map(x => (
          <li key={x.orderId} className="rounded-lg border border-[var(--line)] bg-surface p-3 grid gap-0.5">
            <p className="m-0 break-words">
              <strong>{x.nome || 'Sem nome'}</strong>{' · '}<span className="break-all">{x.email ?? 'conta apagada'}</span>
            </p>
            <p className="m-0 text-[14px] text-ink-body break-all">
              {reais(x.valorCentavos)} · {x.metodo === 'pix' ? 'PIX' : 'cartão'} · {quando(x.criadoEm)}
              {' · '}{situacaoDoPedido(x)} · pedido {x.orderId}
            </p>
            {(x.origem || x.comprouDepois) && (
              <p className="m-0 text-[14px]">
                {x.origem && <>Origem: {FONTES_PT[x.origem] ?? x.origem}{x.campanha ? ` · campanha ${x.campanha}` : ''}</>}
                {x.origem && x.comprouDepois && ' · '}
                {x.comprouDepois && <strong>comprou depois</strong>}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Cartao({ v }: { v: Venda }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-surface p-4 grid gap-1">
      <p className="font-ui text-[16px] m-0 break-words">
        <strong>{v.nome || 'Sem nome'}</strong>
        {' · '}<span className="break-all">{v.email ?? 'conta apagada'}</span>
      </p>
      <p className="font-ui text-[14px] text-ink-body m-0 break-all">
        {reais(v.valorCentavos)}
        {v.liquidoCentavos != null && <> (você recebe {reais(v.liquidoCentavos)})</>}
        {' · '}{v.metodo === 'pix' ? 'PIX' : v.parcelas > 1 ? `cartão em ${v.parcelas}x` : 'cartão'}
        {' · '}{quando(v.pagoEm)} · pedido {v.orderId}
      </p>
      {/* Os dados da nota fiscal (06/11/2026): pedidos no checkout desde então. */}
      {v.cpf && (
        <p className="font-ui text-[14px] text-ink-body m-0 break-words">
          Nota fiscal: <strong>{v.nomeCompleto}</strong> · CPF {v.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')}
        </p>
      )}
      {v.parceria && (
        <p className="font-ui text-[14px] m-0"><strong>Veio pelo link {LINK[v.parceria] ?? v.parceria}</strong></p>
      )}
      {v.origem && (
        <p className="font-ui text-[14px] m-0">
          Origem: {FONTES_PT[v.origem] ?? v.origem}{v.campanha ? ` · campanha ${v.campanha}` : ''}
        </p>
      )}
      {v.status === 'paid' && (
        <p className="font-ui text-[14px] m-0">
          {v.estudouEm === null
            ? 'Ainda não começou o curso.'
            : <>Estudou pela última vez em {quando(v.estudouEm)} · {v.concluidas.filter(id => LETRAS.has(id)).length} de {course.totalLetters} letras concluídas</>}
        </p>
      )}
      {v.status === 'paid' && v.estudouEm !== null && <OndeEsta v={v} />}
      {v.status === 'paid' && v.estudouEm !== null && v.diasDeEstudo != null && (
        <p className="font-ui text-[14px] m-0">
          Estudou em {v.diasDeEstudo} {v.diasDeEstudo === 1 ? 'dia' : 'dias'} · cerca de {duracao(v.minutosEstimados ?? 0)} de prática (estimativa)
        </p>
      )}
      {v.desistiuEm != null && (
        <p className="font-ui text-[14px] m-0">
          <strong>Desistiu {diasAte(v) === 0 ? 'no mesmo dia' : `${diasAte(v)} ${diasAte(v) === 1 ? 'dia' : 'dias'} depois da compra`}</strong>
          {' · '}{letrasDe(v)} de {course.totalLetters} letras concluídas
          {v.exameFeito ? ' · já tinha passado no exame final' : ''}
        </p>
      )}
      {v.status === 'refunded' && <p className="font-ui text-[14px] text-ink-muted m-0">Estornada</p>}
    </article>
  );
}

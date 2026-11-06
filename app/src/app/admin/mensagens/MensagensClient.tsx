'use client';

/* As dúvidas e os comentários dos alunos (06/11/2026, Fale comigo).
 * ─────────────────────────────────────────────────────────────────────────
 * As não respondidas primeiro. O botão "Responder por e-mail" abre o e-mail
 * já endereçado ao aluno; depois o dono marca como respondida. Cada mensagem
 * nova também chega por e-mail na hora (api/mensagens.js). */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { asset } from '@/lib/asset';
import { CodigoDoAdmin, pedeCodigo } from '@/components/platform/CodigoDoAdmin';

type Item = {
  id: number; tipo: 'duvida' | 'comentario'; texto: string; contexto: string | null;
  enviadaEm: number; respondidaEm: number | null; email: string; nome: string;
};
type Estado = { tipo: 'carregando' } | { tipo: 'sem-sessao' } | { tipo: 'nao-admin' } | { tipo: 'codigo' } | { tipo: 'erro' }
  | { tipo: 'pronto'; itens: Item[] };

const quando = (ms: number) => new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function MensagensClient() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(asset('/api/admin/mensagens'), { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) return setEstado({ tipo: 'sem-sessao' });
      if (await pedeCodigo(r)) return setEstado({ tipo: 'codigo' });
      if (r.status === 403) return setEstado({ tipo: 'nao-admin' });
      if (!r.ok) return setEstado({ tipo: 'erro' });
      const { mensagens } = await r.json() as { mensagens: Item[] };
      setEstado({ tipo: 'pronto', itens: mensagens });
    } catch { setEstado({ tipo: 'erro' }); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const marcar = async (id: number, respondida: boolean) => {
    setAviso(null);
    const r = await fetch(asset('/api/admin/mensagens'), {
      method: 'PUT', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, respondida })
    }).catch(() => null);
    if (!r || !r.ok) { setAviso('Não consegui salvar agora. Tente de novo.'); return; }
    await carregar();
  };

  const abertas = estado.tipo === 'pronto' ? estado.itens.filter(m => !m.respondidaEm).length : 0;

  return (
    <main className="mx-auto max-w-[760px] px-4 py-10 grid gap-5">
      <header className="grid gap-2">
        <h1 className="text-[26px] font-bold m-0">Mensagens dos alunos</h1>
        <p className="font-ui text-[16px] text-ink-body m-0">
          As dúvidas e os comentários mandados em Fale comigo, as não respondidas primeiro. Cada uma também chega
          no seu e-mail na hora: responder aquele e-mail responde direto ao aluno. Depois, marque aqui como respondida.
        </p>
      </header>

      <div role="status" aria-live="polite" className="font-ui text-[16px] grid gap-3">
        {estado.tipo === 'carregando' && <p className="m-0">Carregando…</p>}
        {estado.tipo === 'sem-sessao' && (
          <p className="m-0">
            Entre com a conta de administrador.{' '}
            <Link href="/entrar/?next=/admin/mensagens/" className="text-[var(--accent)] underline">Entrar</Link>
          </p>
        )}
        {estado.tipo === 'nao-admin' && <p className="m-0">Esta conta não tem acesso a este painel.</p>}
        {estado.tipo === 'codigo' && <CodigoDoAdmin onPronto={() => void carregar()} />}
        {estado.tipo === 'erro' && <p className="m-0">Não consegui carregar agora. Confira a internet e tente de novo.</p>}
        {estado.tipo === 'pronto' && (
          <p className="m-0">{estado.itens.length === 0 ? 'Nenhuma mensagem ainda.' : `${abertas} sem resposta, de ${estado.itens.length}.`}</p>
        )}
        {aviso && <p className="m-0 text-[var(--ember)]">{aviso}</p>}
      </div>

      {estado.tipo === 'pronto' && estado.itens.map(m => (
        <article key={m.id} className={`rounded-lg border p-4 grid gap-3 ${m.respondidaEm ? 'border-[var(--line)] bg-surface' : 'border-[var(--teal)] bg-[var(--card)]'}`}>
          <p className="font-ui text-[13px] text-ink-muted m-0 break-all">
            <strong className="text-ink">{m.tipo === 'duvida' ? 'Dúvida' : 'Comentário'}</strong>
            {m.contexto ? ` · no fim do módulo ${m.contexto.replace('modulo-', '')}` : ''} · {quando(m.enviadaEm)} · {m.nome ? `${m.nome} · ` : ''}{m.email}
          </p>
          <p className="m-0 text-[16px] leading-relaxed whitespace-pre-line">{m.texto}</p>
          <div className="flex flex-wrap gap-2 items-center">
            <a href={`mailto:${m.email}?subject=${encodeURIComponent(m.tipo === 'duvida' ? 'Sua dúvida no Hebraico Fluente' : 'Seu comentário no Hebraico Fluente')}`}
               className="inline-flex items-center min-h-[44px] px-4 rounded-[12px] border-2 border-[var(--teal)] font-ui text-[15px] font-semibold text-[var(--teal-ink)]">
              Responder por e-mail
            </a>
            {m.respondidaEm
              ? <Button variant="secondary" onClick={() => marcar(m.id, false)}>Marcar como não respondida</Button>
              : <Button onClick={() => marcar(m.id, true)}>Marcar como respondida</Button>}
            {m.respondidaEm && <span className="font-ui text-[13px] text-ink-muted">Respondida em {quando(m.respondidaEm)}</span>}
          </div>
        </article>
      ))}
    </main>
  );
}

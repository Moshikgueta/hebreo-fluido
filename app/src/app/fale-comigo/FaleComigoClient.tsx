'use client';

/* Fale comigo (06/11/2026, pedido do dono: "um lugar para depoimento dentro
 * do curso, e também para comentários e perguntas").
 * ─────────────────────────────────────────────────────────────────────────
 * Em cima, o formulário: dúvida ou comentário, e o texto. A mensagem fica
 * guardada (worker/src/api/mensagens.js) e chega ao dono por e-mail na hora;
 * ele responde no e-mail da conta. Vindo do fim de um módulo
 * (`?modulo=N`), a mensagem leva o módulo junto. Embaixo, as mensagens que o
 * aluno já mandou, e o cartão do depoimento, que tem página própria. */

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { asset } from '@/lib/asset';
import { prazoResposta } from '@/lib/empresa';
import { tx } from '@/i18n/telas/fale-comigo';

type Mensagem = { id: number; tipo: 'duvida' | 'comentario'; texto: string; contexto: string | null; enviadaEm: number; respondidaEm: number | null };
const ERROS: Record<string, string> = { 'texto-curto': tx.curta, 'texto-longo': tx.longa, 'rate-limited': tx.limite };
const TEXTO_MAX = 2000;

export function FaleComigoClient() {
  const [tipo, setTipo] = useState<'duvida' | 'comentario'>('duvida');
  const [texto, setTexto] = useState('');
  const [modulo, setModulo] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [minhas, setMinhas] = useState<Mensagem[]>([]);

  const carregar = async () => {
    try {
      const r = await fetch(asset('/api/mensagens'), { credentials: 'same-origin', cache: 'no-store' });
      if (r.ok) setMinhas(((await r.json()) as { mensagens: Mensagem[] }).mensagens);
    } catch { /* sem rede: a lista espera */ }
  };
  useEffect(() => {
    /* De onde veio: o fim de um módulo manda ?modulo=N (e aí é comentário). */
    const n = Number(new URLSearchParams(window.location.search).get('modulo'));
    if (Number.isInteger(n) && n >= 1 && n <= 9) { setModulo(n); setTipo('comentario'); }
    void carregar();
  }, []);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null); setOk(false);
    if ([...texto.trim()].length < 5) { setErro(tx.curta); return; }
    setEnviando(true);
    try {
      const r = await fetch(asset('/api/mensagens'), {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, texto, ...(modulo ? { contexto: `modulo-${modulo}` } : {}) })
      });
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({})) as { error?: string };
        setErro(ERROS[error ?? ''] ?? tx.erro);
        return;
      }
      setTexto(''); setOk(true);
      await carregar();
    } catch { setErro(tx.erro); }
    finally { setEnviando(false); }
  };

  const data = (ms: number) => new Date(ms).toLocaleDateString();

  return (
    <div className="grid gap-6 py-2 max-w-[42rem]">
      <header className="grid gap-2">
        <p className="font-ui text-[13px] uppercase tracking-[.07em] text-ink-muted m-0">{tx.kicker}</p>
        <h1 className="text-[28px] font-bold m-0 text-balance">{tx.titulo}</h1>
        <p className="font-ui text-[15.5px] leading-relaxed text-ink-body m-0">{tx.intro}</p>
      </header>

      <Card className="p-5 sm:p-6">
        <form onSubmit={enviar} className="grid gap-4">
          {modulo && <p className="m-0 font-ui text-[13.5px] font-semibold text-[var(--teal-ink)]">{tx.sobreModulo(modulo)}</p>}
          <fieldset className="grid gap-2 border-0 p-0 m-0">
            <legend className="font-ui text-[15px] font-semibold text-ink mb-2">{tx.tipoLegenda}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['duvida', 'comentario'] as const).map(t => (
                <label key={t} className={`grid place-items-center text-center min-h-[48px] px-3 rounded-[var(--r-md)] border-2 cursor-pointer font-ui text-[14.5px] font-semibold
                  has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent)]
                  ${tipo === t ? 'border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-ink)]' : 'border-line text-ink-body'}`}>
                  <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                  {t === 'duvida' ? tx.duvida : tx.comentario}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1.5">
            <span className="font-ui text-[14px] font-semibold text-ink-body">{tx.rotuloTexto}</span>
            <textarea value={texto} onChange={e => { setTexto(e.target.value); setOk(false); }} rows={6} maxLength={TEXTO_MAX}
                      aria-describedby="fale-dica"
                      className="w-full rounded-[var(--r-md)] border border-line bg-surface px-4 py-3 font-ui text-[16px] text-ink leading-relaxed
                                 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <span id="fale-dica" className="font-ui text-[13px] text-ink-muted">{tipo === 'duvida' ? tx.dicaDuvida : ''}</span>
          </label>
          <div aria-live="polite">
            {erro && <p role="alert" className="m-0 font-ui text-[14px] text-[var(--ember)]">{erro}</p>}
            {ok && <p className="m-0 font-ui text-[14.5px] font-semibold text-[var(--teal-ink)]">{tx.enviada(prazoResposta())}</p>}
          </div>
          <Button type="submit" size="lg" disabled={enviando}>{enviando ? tx.enviando : tx.enviar}</Button>
        </form>
      </Card>

      {minhas.length > 0 && (
        <section aria-labelledby="suas" className="grid gap-2.5">
          <h2 id="suas" className="m-0 font-display text-[19px] font-semibold text-ink">{tx.suas}</h2>
          <ul className="grid gap-2 list-none p-0 m-0">
            {minhas.map(m => (
              <li key={m.id} className="rounded-[var(--r-md)] border border-line bg-[var(--card)] px-4 py-3 grid gap-1">
                <p className="m-0 font-ui text-[12.5px] text-ink-muted">
                  {m.tipo === 'duvida' ? tx.duvida : tx.comentario} · {tx.enviadaEm(data(m.enviadaEm))}
                  {m.respondidaEm ? <> · <strong className="text-[var(--teal-ink)]">{tx.respondida}</strong></> : null}
                </p>
                <p className="m-0 font-ui text-[14.5px] leading-relaxed text-ink-body whitespace-pre-line">{m.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card tone="wash" className="p-5 sm:p-6 grid gap-2.5">
        <h2 className="m-0 font-display text-[19px] font-semibold text-ink">{tx.depoimentoTitulo}</h2>
        <p className="m-0 font-ui text-[15px] leading-relaxed text-ink-body">{tx.depoimentoTexto}</p>
        <Link href="/depoimento" className="justify-self-start inline-flex items-center gap-2 min-h-[46px] px-5 rounded-[14px] border-2 border-[var(--teal)]
                                            font-ui text-[15px] font-semibold text-[var(--teal-ink)] hover:bg-[var(--teal-soft)]">
          {tx.depoimentoBotao}<span aria-hidden>→</span>
        </Link>
      </Card>
    </div>
  );
}

'use client';

/* "Mandar a um amigo" (05/11/2026): o aluno escreve os nomes, o servidor
 * assina o cartão (worker/src/api/cartao.js) e o aluno leva o link ele mesmo:
 * pelo WhatsApp (abre o app com a mensagem pronta, e quem aperta enviar é
 * ele), pelo compartilhar do celular ou copiando. O site não manda nada, e
 * nada é gravado. Fora da build com servidor, o pedido falha e a tela diz. */

import { useState } from 'react';
import { asset } from '@/lib/asset';
import { NOME_MAX, limparNome, nomeValido, type CartaoDeFesta } from '@/lib/engine/cartoes';
import { tx } from '@/i18n/telas/cartoes-de-festa';

const campo = 'min-h-[44px] w-full min-w-0 rounded-[var(--r-md)] border border-line bg-surface px-3 font-ui text-[15px] text-ink';

export function MandarCartao({ cartao, onFechar }: { cartao: CartaoDeFesta; onFechar: () => void }) {
  const [para, setPara] = useState('');
  const [de, setDe] = useState('');
  const [estado, setEstado] = useState<'parado' | 'gerando' | 'pronto' | 'falhou'>('parado');
  const [link, setLink] = useState('');
  const [copiado, setCopiado] = useState(false);
  const paraOk = nomeValido(para);
  const deOk = nomeValido(de) && limparNome(de) !== '';

  async function gerar() {
    if (!paraOk || !deOk) return;
    setEstado('gerando'); setCopiado(false);
    try {
      const r = await fetch(asset('/api/cartao'), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartao: cartao.id, para: limparNome(para), de: limparNome(de) })
      });
      const d = r.ok ? await r.json() as { token?: string } : {};
      if (!d.token) { setEstado('falhou'); return; }
      setLink(`${window.location.origin}${asset(`/cartao-de-festa/?t=${encodeURIComponent(d.token)}`)}`);
      setEstado('pronto');
    } catch { setEstado('falhou'); }
  }

  async function compartilhar() {
    try { await navigator.share({ title: tx.metaTitulo, text: tx.textoDoConvite, url: link }); } catch { /* cancelado */ }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); } catch { setCopiado(false); }
  }
  const podeCompartilhar = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${tx.textoDoConvite} ${link}`)}`;

  return (
    <div role="group" aria-label={tx.mandarTitulo}
         className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-[var(--card)] p-4 text-start shadow-[var(--sh)]">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 font-ui text-[16px] font-semibold text-ink">{tx.mandarTitulo}</p>
        <button type="button" onClick={onFechar} className="min-h-[44px] px-2 font-ui text-[14px] text-[var(--teal-ink)] underline">{tx.fechar}</button>
      </div>
      <p className="m-0 font-ui text-[13.5px] leading-relaxed text-ink-muted">{tx.mandarNota}</p>

      {estado !== 'pronto' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 font-ui text-[14px] text-ink">
              {tx.campoPara}
              <input value={para} onChange={e => setPara(e.target.value)} maxLength={NOME_MAX + 8} autoComplete="off"
                     aria-invalid={!paraOk} className={campo} />
            </label>
            <label className="grid gap-1 font-ui text-[14px] text-ink">
              {tx.campoDe}
              <input value={de} onChange={e => setDe(e.target.value)} maxLength={NOME_MAX + 8} autoComplete="given-name"
                     aria-invalid={de !== '' && !deOk} className={campo} />
            </label>
          </div>
          {(!paraOk || (de !== '' && !deOk)) && <p role="alert" className="m-0 font-ui text-[13.5px] text-[var(--amber)]">{tx.nomeInvalido}</p>}
          <button type="button" onClick={gerar} disabled={estado === 'gerando' || !paraOk || !deOk}
                  className="justify-self-start min-h-[48px] rounded-[var(--r-md)] bg-[var(--accent-bg)] px-5 font-ui text-[15px] font-semibold text-white disabled:opacity-50">
            {estado === 'gerando' ? tx.gerando : tx.gerar}
          </button>
          {estado === 'falhou' && <p role="alert" className="m-0 font-ui text-[13.5px] text-[var(--amber)]">{tx.falhou}</p>}
        </>
      )}

      {estado === 'pronto' && (
        <div className="grid gap-2" aria-live="polite">
          <p className="m-0 font-ui text-[14px] text-ink">{tx.pronto}</p>
          <input readOnly value={link} aria-label={tx.pronto} onFocus={e => e.currentTarget.select()}
                 className="min-h-[44px] w-full min-w-0 rounded-[var(--r-md)] border border-line bg-surface px-3 font-ui text-[13px] text-ink" />
          <div className="flex flex-wrap gap-2">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center min-h-[44px] rounded-[var(--r-md)] bg-[var(--accent-bg)] px-4 font-ui text-[14px] font-semibold text-white">
              {tx.whatsapp}
            </a>
            {podeCompartilhar && (
              <button type="button" onClick={compartilhar}
                      className="min-h-[44px] rounded-[var(--r-md)] border border-line bg-surface px-4 font-ui text-[14px] font-semibold text-ink">
                {tx.compartilhar}
              </button>
            )}
            <button type="button" onClick={copiar}
                    className="min-h-[44px] rounded-[var(--r-md)] border border-line bg-surface px-4 font-ui text-[14px] font-semibold text-ink">
              {copiado ? tx.copiado : tx.copiar}
            </button>
            <button type="button" onClick={() => { setEstado('parado'); setLink(''); }}
                    className="min-h-[44px] px-2 font-ui text-[14px] text-[var(--teal-ink)] underline">
              {tx.outro}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

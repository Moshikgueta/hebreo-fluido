'use client';

/* O certificado.
 * ─────────────────────────────────────────────────────────────────────────
 * Earned by two facts and nothing else: every letter finished, and the final
 * exam passed. No payment, no e-mail, no account. A certificate issued for
 * anything less is worth nothing - including to the person holding it.
 *
 * It is drawn in the browser as a PNG, so it never leaves the device unless
 * the learner posts it. Web Share carries the FILE on a phone, which is the
 * one place this is actually shared from; everywhere else it downloads, which
 * is what a desktop expects anyway.
 *
 * Desde 03/11/2026 o certificado é EMITIDO pelo servidor
 * (worker/src/api/certificado-alfa.js): só depois do prazo de desistência e
 * com o exame aprovado no progresso do servidor, com um código conferível.
 * Antes da emissão a tela não desenha nada; depois, desenha com o código, e o
 * nome é o que foi emitido. Na build de demonstração, sem servidor, segue
 * desenhando como antes.
 *
 * The name is editable here even though onboarding asked for one - people put
 * "Mo" into an onboarding field and their full name on a certificate, and
 * making them re-run onboarding to fix it would be absurd.
 */

import { tx as geral } from '@/i18n/telas/geral';
import { EXAM_PARTS } from '@/lib/engine/exam';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Badge } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { He } from '@/components/hebrew/He';
import { useProgress } from '@/lib/state/store';
import { useAccount } from '@/lib/account/store';
import { allLetters, course } from '@/lib/content';
import { certificateReady, REGRA_DA_CONCLUSAO } from '@/lib/state/rules';
import { CompartilharCertificado } from '@/components/platform/CompartilharCertificado';
import { EXAM_PASS } from '@/lib/engine/exam';
import {
  canvasToBlob, certificateFileName, drawCertificate, formatDate, FORMATS, SHARE_TEXT,
  type CertificateFormat
} from '@/lib/certificate';
import { track } from '@/lib/analytics';
import { EditorDeNome } from '@/components/learn/MeuNome';
import { MEU_NOME_EM_HEBRAICO } from '@/lib/recursos';
import { sugerirNome } from '@/lib/nome-hebraico';
import { fmt } from '@/i18n';
import { AbreDepoisDoPrazo, useAbreEm } from '@/components/platform/AbreDepoisDoPrazo';
import { tx } from '@/i18n/telas/painel-certificado-client';
import {
  CERTIFICADO_NO_SERVIDOR, emitirCertificadoAlfa, situacaoDoCertificado, type SituacaoAlfa
} from '@/lib/certificado-alfa';

export function CertificadoClient() {
  const p = useProgress();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<CertificateFormat>('square');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  /* O nome em hebraico: opcional, e só entra no desenho depois de CONFERIDO.
     Vem preenchido com o que o aluno já confirmou na atividade do nome, ou
     com a primeira sugestão - e mesmo assim precisa da confirmação aqui,
     porque um certificado é o lugar em que um erro de grafia fica. */
  const [comHebraico, setComHebraico] = useState(false);
  const [grafiaHe, setGrafiaHe] = useState('');
  const [conferida, setConferida] = useState(false);
  const [emissao, setEmissao] = useState<SituacaoAlfa | { situacao: 'carregando' } | { situacao: 'erro' }>({ situacao: 'carregando' });
  const [emitindo, setEmitindo] = useState(false);
  const [erroEmissao, setErroEmissao] = useState<string | null>(null);

  const gate = certificateReady(p.state, course.totalLetters);
  const letters = allLetters().map(l => l.letter);
  const passedAt = p.state.finalChallenge.passedAt;
  const date = passedAt ? new Date(passedAt) : new Date();
  const score = p.state.finalChallenge.best;

  /* Preenchido uma vez, com o nome do onboarding ou, sem ele, o nome da
     conta (UXQA-008); depois o campo é do aluno - quem apagou quis apagar. */
  const account = useAccount();
  const abreEm = useAbreEm();
  const nomeDaConta = account.session?.account.name?.trim() ?? '';
  useEffect(() => {
    if (!touched && p.ready) setName(p.state.onboarding?.name?.trim() || nomeDaConta);
  }, [p.ready, p.state.onboarding?.name, nomeDaConta, touched]);
  /* Sem nome, o certificado não sai: baixava "certificado-...-aluno.png"
     em branco, sem aviso nenhum. */
  const semNome = !name.trim();

  /* A situação no servidor. Emitido, o nome é o do certificado. */
  const aplicar = useCallback((s: SituacaoAlfa | { erro: string }) => {
    if ('erro' in s) { setEmissao({ situacao: 'erro' }); return; }
    setEmissao(s);
    if (s.situacao === 'emitido') { setTouched(true); setName(s.certificado.nome); }
  }, []);
  const carregar = useCallback(async () => {
    setEmissao({ situacao: 'carregando' });
    aplicar(await situacaoDoCertificado());
  }, [aplicar]);
  useEffect(() => {
    if (CERTIFICADO_NO_SERVIDOR && p.ready && gate.ready && !abreEm) void carregar();
  }, [p.ready, gate.ready, abreEm, carregar]);
  const emitir = useCallback(async () => {
    setEmitindo(true); setErroEmissao(null);
    const r = await emitirCertificadoAlfa(name.trim());
    setEmitindo(false);
    if ('erro' in r) { setErroEmissao(r.erro === 'nome-invalido' ? tx.nomeInvalido : tx.erroEmitir); return; }
    aplicar(r);
  }, [name, aplicar]);
  const codigo = emissao.situacao === 'emitido' ? emissao.certificado.id : null;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gate.ready) return;
    if (CERTIFICADO_NO_SERVIDOR && !codigo) return;
    const nameHe = comHebraico && conferida ? grafiaHe : null;
    void drawCertificate(canvas, { name, date, letters, score, format, nameHe, codigo });
  }, [name, date, letters, score, format, gate.ready, comHebraico, conferida, grafiaHe, codigo]);

  useEffect(() => { redraw(); }, [redraw]);

  /* Devolve se o arquivo saiu mesmo. O botão de baixar não precisava saber,
     mas a seção de redes sim: ela promete "a imagem foi salva" na linha
     seguinte, e prometer isso quando o canvas falhou manda a pessoa procurar
     na pasta um arquivo que não existe. */
  const download = useCallback(async (): Promise<boolean> => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    if (!name.trim()) { setSaid(tx.escrevaParaBaixar); return false; }
    setBusy(true);
    const blob = await canvasToBlob(canvas);
    setBusy(false);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = certificateFileName(name);
    a.click();
    /* Revoked on the next tick rather than immediately: Safari has been known
       to cancel the download when the URL dies in the same frame. */
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    track('certificate_downloaded', { mode: format });
    setSaid(tx.imagemSalva);
    return true;
  }, [name, format]);

  const share = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!name.trim()) { setSaid(tx.escrevaParaCompartilhar); return; }
    setBusy(true);
    const blob = await canvasToBlob(canvas);
    setBusy(false);
    if (!blob) return;
    const file = new File([blob], certificateFileName(name), { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text: SHARE_TEXT, title: geral.marca });
        track('certificate_shared', { mode: format });
        return;
      } catch {
        /* The learner cancelled the sheet, or the platform refused. Falling
           through to a download is better than an error nobody can act on. */
      }
    }
    await download();
  }, [name, format, download]);

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SHARE_TEXT);
      setSaid(tx.textoCopiado);
    } catch {
      setSaid(tx.naoCopiou);
    }
  }, []);

  if (!p.ready) return null;

  /* ── o prazo de desistência (03/11/2026) ── */
  if (abreEm) return <div className="focus-col grid gap-5"><AbreDepoisDoPrazo o="certificado" em={abreEm} /></div>;

  /* ── not yet ──────────────────────────────────────────────────────── */
  if (!gate.ready) {
    return (
      <div className="focus-col grid gap-5">
        <header className="grid gap-3">
          <Badge tone="neutral">{tx.certificado}</Badge>
          <h1 className="text-[27px] sm:text-[33px] font-bold">{tx.faltaTitulo}</h1>
          <p className="font-ui text-[15px] leading-relaxed text-ink-muted">
            {tx.faltaTexto}
          </p>
        </header>

        <Card className="overflow-hidden">
          <ul className="divide-y divide-[color:var(--line-soft)]">
            <Requirement
              done={gate.lettersDone >= course.totalLetters}
              titlePt={fmt(tx.requisitoLicoes, { total: course.totalLetters })}
              detailPt={`${fmt(tx.requisitoLicoesDetalhe, { n: gate.lettersDone, total: course.totalLetters })} ${REGRA_DA_CONCLUSAO}`}
              href="/mapa"
              ctaPt={tx.irParaMapa}
            />
            <Requirement
              done={gate.examPassed}
              titlePt={tx.requisitoExame}
              detailPt={
                p.state.finalChallenge.best != null
                  ? fmt(tx.melhorResultado, {
                      nota: Math.round(p.state.finalChallenge.best * 100), minimo: Math.round(EXAM_PASS * 100)
                    })
                  : fmt(tx.aprovacaoAPartir, { minimo: Math.round(EXAM_PASS * 100) })
              }
              href="/desafio-final"
              ctaPt={tx.fazerExame}
            />
          </ul>
        </Card>

        <p className="font-ui text-[13px] leading-relaxed text-ink-muted">
          {tx.porParticipacao}
        </p>
      </div>
    );
  }

  /* ── aprovado, antes da emissão pelo servidor ─────────────────────── */
  if (CERTIFICADO_NO_SERVIDOR && emissao.situacao !== 'emitido') {
    if (emissao.situacao === 'prazo') {
      return <div className="focus-col grid gap-5"><AbreDepoisDoPrazo o="certificado" em={new Date(emissao.abreEm)} /></div>;
    }
    return (
      <div className="focus-col grid gap-5">
        <header className="grid gap-3">
          <Badge tone="mint">{fmt(tx.aprovadoEm, { data: formatDate(date) })}</Badge>
          <h1 className="text-[27px] sm:text-[33px] font-bold">{tx.emitirTitulo}</h1>
          <p className="font-ui text-[15px] leading-relaxed text-ink-muted">{tx.emitirTexto}</p>
        </header>
        <Card className="p-5 grid gap-4">
          {emissao.situacao === 'carregando' && <p role="status" className="m-0 font-ui text-[15px]">{tx.carregando}</p>}
          {(emissao.situacao === 'falta' || emissao.situacao === 'erro') && (
            <div className="grid gap-3">
              <p role="status" className="m-0 font-ui text-[15px] text-ink-body">
                {emissao.situacao === 'falta' ? tx.faltaServidor : tx.erroEmitir}
              </p>
              <Button variant="secondary" onClick={() => void carregar()} className="justify-self-start">{tx.tentarDeNovo}</Button>
            </div>
          )}
          {emissao.situacao === 'pode' && (
            <>
              <div className="grid gap-2">
                <label htmlFor="cert-name" className="font-ui text-[12px] uppercase tracking-[.07em] text-ink-muted">
                  {tx.nomeNoCertificado}
                </label>
                <input
                  id="cert-name" value={name}
                  onChange={e => { setTouched(true); setName(e.target.value.slice(0, 80)); }}
                  placeholder={tx.comoAparecer} autoComplete="name"
                  className="min-h-[52px] px-4 rounded-[var(--r-md)] border-2 border-line bg-surface
                             font-ui text-[17px] text-ink placeholder:text-ink-muted focus:border-[var(--accent-soft)]"
                />
              </div>
              <Button size="lg" onClick={() => void emitir()} disabled={emitindo || semNome} className="justify-self-start">
                {emitindo ? tx.emitindo : tx.emitir}
              </Button>
              {erroEmissao && <p role="alert" className="m-0 font-ui text-[14px] text-[var(--amber)]">{erroEmissao}</p>}
            </>
          )}
        </Card>
      </div>
    );
  }

  /* ── earned ───────────────────────────────────────────────────────── */
  return (
    <div className="grid gap-6">
      <header className="grid gap-3 reading">
        <Badge tone="mint">{fmt(tx.aprovadoEm, { data: formatDate(date) })}</Badge>
        <h1 className="text-[27px] sm:text-[33px] font-bold">{tx.seuCertificado}</h1>
        <p className="font-ui text-[15px] leading-relaxed text-ink-muted">
          {tx.geradoAqui}
        </p>
      </header>

      <Card className="p-4 sm:p-5 grid gap-4">
        {/* The preview. `max-w-full` plus the intrinsic canvas size keeps it
            sharp on a phone and never wider than the screen. */}
        <div className="rounded-[var(--r-md)] bg-surface-2 p-3 grid place-items-center">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-w-[520px] rounded-[var(--r-sm)] shadow-[var(--shadow-1)]"
            role="img"
            aria-label={fmt(tx.imagemAria, { nome: name || tx.alunoReserva, data: formatDate(date) })}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="cert-name" className="font-ui text-[12px] uppercase tracking-[.07em] text-ink-muted">
            {tx.nomeNoCertificado}
          </label>
          <input
            id="cert-name"
            value={name}
            readOnly={!!codigo}
            onChange={e => { setTouched(true); setName(e.target.value.slice(0, 48)); }}
            placeholder={tx.comoAparecer}
            autoComplete="name"
            aria-describedby={semNome ? 'cert-name-falta' : undefined}
            aria-invalid={semNome || undefined}
            className="min-h-[52px] px-4 rounded-[var(--r-md)] border-2 border-line bg-surface
                       font-ui text-[17px] text-ink placeholder:text-ink-muted
                       focus:border-[var(--accent-soft)]"
          />
          {semNome && (
            <p id="cert-name-falta" className="font-ui text-[13.5px] text-[var(--amber)]">
              {tx.semNome}
            </p>
          )}
          {codigo && (
            <p className="font-ui text-[13.5px] text-ink-muted m-0">
              {tx.nomeFixo} {tx.codigoPagina(codigo)}
            </p>
          )}
        </div>

        {MEU_NOME_EM_HEBRAICO && (
        <div className="grid gap-3 rounded-[var(--r-lg)] border border-line p-4">
          <label className="flex items-center gap-3 min-h-[44px] font-ui text-[15px] text-ink cursor-pointer">
            <input
              type="checkbox" checked={comHebraico}
              onChange={e => {
                const liga = e.target.checked;
                setComHebraico(liga);
                setConferida(false);
                if (liga && !grafiaHe) {
                  setGrafiaHe(p.state.nomeHebraico?.texto ?? sugerirNome(name)[0] ?? '');
                }
              }}
              className="w-5 h-5"
            />
            {tx.nomeEmHebraico}
          </label>
          {comHebraico && (
            <>
              <p className="font-ui text-[14px] leading-relaxed text-ink-body m-0">
                {tx.grafiaNota}
              </p>
              {sugerirNome(name).length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label={tx.grafiasSugeridas}>
                  {sugerirNome(name).map(g => (
                    <button key={g} type="button" aria-pressed={grafiaHe === g}
                            onClick={() => { setGrafiaHe(g); setConferida(false); }}
                            className={`min-h-[48px] px-3 rounded-[var(--r-md)] border-2
                              ${grafiaHe === g ? 'border-[var(--accent-soft)] bg-[var(--accent-wash)]' : 'border-line bg-surface'}`}>
                      <He size="word">{g}</He>
                    </button>
                  ))}
                </div>
              )}
              <EditorDeNome
                valor={grafiaHe}
                onChange={v => { setGrafiaHe(v); setConferida(false); }}
                letras={allLetters()}
              />
              <label className="flex items-center gap-3 min-h-[44px] font-ui text-[15px] text-ink cursor-pointer">
                <input
                  type="checkbox" checked={conferida} disabled={!grafiaHe.trim()}
                  onChange={e => {
                    setConferida(e.target.checked);
                    if (e.target.checked && grafiaHe.trim() !== p.state.nomeHebraico?.texto) {
                      p.setNomeHebraico(grafiaHe);
                    }
                  }}
                  className="w-5 h-5"
                />
                {tx.conferi}
              </label>
            </>
          )}
        </div>
        )}

        <fieldset className="grid gap-2">
          <legend className="font-ui text-[12px] uppercase tracking-[.07em] text-ink-muted mb-1">
            {tx.formato}
          </legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMATS) as CertificateFormat[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                aria-pressed={format === f}
                className={`min-h-[52px] px-4 rounded-[var(--r-md)] border-2 text-left
                  transition-colors grid
                  ${format === f
                    ? 'border-[var(--accent-soft)] bg-[var(--accent-wash)]'
                    : 'border-line bg-surface hover:border-[var(--accent-soft)]'}`}
              >
                <span className="font-ui text-[14px] font-medium text-ink">
                  {FORMATS[f].labelPt}
                </span>
                <span className="font-ui text-[12px] text-ink-muted">
                  {FORMATS[f].w}×{FORMATS[f].h} · {FORMATS[f].hintPt}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button size="lg" onClick={share} disabled={busy || semNome}>
            {busy ? tx.gerando : tx.compartilhar}
          </Button>
          <Button variant="secondary" onClick={download} disabled={busy || semNome}>
            {tx.baixarPng}
          </Button>
        </div>
        <p aria-live="polite" className="font-ui text-[13px] text-ink-muted min-h-[20px]">
          {said}
        </p>

        {/* Abaixo dos dois botões, e não no lugar deles: no celular a folha
            nativa continua sendo o melhor caminho, porque é a única que anexa
            a imagem sozinha. Estas quatro existem para o computador, onde
            aquela folha não existe. */}
        <div className="border-t border-line pt-4">
          <CompartilharCertificado texto={SHARE_TEXT} baixar={download} formato={format} />
        </div>
      </Card>

      <Card className="p-5 grid gap-3">
        <h2 className="font-display text-[16px] font-bold text-ink">{tx.textoDoPost}</h2>
        <p className="text-[15px] leading-relaxed text-ink-body">{SHARE_TEXT}</p>
        <Button variant="secondary" size="sm" onClick={copyText} className="justify-self-start">
          {tx.copiarTexto}
        </Button>
      </Card>

      <Card tone="wash" className="p-5 grid gap-2 reading">
        <p className="font-ui text-[13.5px] leading-relaxed text-ink-body">
          <strong>{tx.oQueERotulo}</strong>{' '}
          {fmt(tx.oQueETexto, { nota: score != null ? `${Math.round(score * 100)}%` : tx.notaDeAprovacao })}
        </p>
        <p className="font-ui text-[13.5px] leading-relaxed text-ink-body">
          <strong>{tx.verificouRotulo}</strong>{' '}
          {/* Só as partes que o exame cobrou (27/10/2026): "Sem os pontos" e
              "Os sons de fora" só entram para quem fez os módulos 6 e 7, e a
              lista fixa prometia as duas a todo mundo. `parts` é a última
              prova; sem ela (registro antigo), as partes de sempre. */}
          {(p.state.finalChallenge.parts
            ? EXAM_PARTS.filter(x => x.id in p.state.finalChallenge.parts!)
            : EXAM_PARTS.filter(x => x.id !== 'sempontos' && x.id !== 'gerech')
          ).map(x => x.titlePt.toLowerCase()).join(', ')}.
        </p>
        <p className="font-ui text-[13.5px] leading-relaxed text-ink-muted">
          <strong>{tx.naoERotulo}</strong>{' '}
          {tx.naoETexto}
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <LinkButton href="/concluido" variant="secondary">{tx.oQueConquistou}</LinkButton>
        <LinkButton href="/academia" variant="ghost">{tx.continuarPraticando}</LinkButton>
      </div>
    </div>
  );
}

function Requirement({
  done, titlePt, detailPt, href, ctaPt
}: { done: boolean; titlePt: string; detailPt: string; href: string; ctaPt: string }) {
  return (
    <li className="px-5 py-4 flex flex-wrap items-center gap-3">
      <span
        aria-hidden
        className={`w-7 h-7 rounded-full grid place-items-center text-[13px] shrink-0
          ${done ? 'bg-mint text-[var(--mint-ink)]' : 'bg-surface-2 text-ink-muted'}`}
      >
        {done ? '✓' : '○'}
      </span>
      <span className="grid gap-0.5 min-w-0 flex-1">
        <span className="font-ui text-[15px] font-medium text-ink">{titlePt}</span>
        <span className="font-ui text-[13px] text-ink-muted">{detailPt}</span>
      </span>
      {!done && (
        <LinkButton href={href} variant="secondary" size="sm">{ctaPt}</LinkButton>
      )}
    </li>
  );
}

/** The card the completion page shows once the certificate exists. */
export function CertificateCallout() {
  const p = useProgress();
  const abreEm = useAbreEm();
  const gate = certificateReady(p.state, course.totalLetters);
  if (!gate.ready || abreEm) return null;
  return (
    <Card tone="mint" className="p-6 grid gap-3">
      <Badge tone="mint">{tx.certificado}</Badge>
      <h2 className="font-display text-[20px] font-bold leading-snug">
        {tx.cartaoTitulo}
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-body">
        {tx.cartaoTexto(<He size="inline">א</He>)}
      </p>
      <LinkButton href="/certificado" className="justify-self-start">
        {tx.verCertificado}
      </LinkButton>
    </Card>
  );
}

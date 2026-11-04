'use client';

/* Gravar as pronúncias do curso pelo navegador - pensado para o iPhone.
 * ─────────────────────────────────────────────────────────────────────────
 * O fluxo que substitui "gravar no app Gravador, salvar em Arquivos, mandar":
 *
 *   escolher o item → Gravar → ler em voz alta → Parar → ouvir →
 *   Salvar (ou Apagar e gravar de novo) → o painel pula para o próximo sem áudio
 *
 * O som vai direto para o lugar certo: a gravação é guardada pelo id do item
 * no catálogo (data/audio.json), e todo botão "Ouvir" e exercício de escuta
 * do curso que usa esse id passa a tocá-la - ver worker/src/api/audio.js.
 *
 * O microfone é aberto UMA vez e fica aberto enquanto a página está aberta:
 * o Safari pergunta a permissão a cada `getUserMedia`, e perguntar a cada
 * palavra de 318 tornaria o painel inútil. "Desligar microfone" solta.
 *
 * O processamento da voz do navegador (cancelamento de eco, supressão de
 * ruído, ganho automático) é desligado: ele existe para chamada de vídeo, e
 * numa gravação de pronúncia ele come consoante e muda o timbre.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { He } from '@/components/hebrew/He';
import { asset } from '@/lib/asset';
import { CodigoDoAdmin, pedeCodigo } from '@/components/platform/CodigoDoAdmin';
import { AUDIO_MANIFEST } from '@/lib/audio-manifest';
import {
  MAX_SEGUNDOS, MIN_MS, acharVoz, barras, diagnosticar, escolherFormato, paraMono,
  precisaConverter, tipoBase, wavDoTrecho, type Corte, type Diagnostico
} from '@/lib/gravador';

type Item = {
  id: string; num: number; he: string; translit: string | null; gloss: string;
  kind: 'nome' | 'silaba' | 'palavra' | 'frase' | 'professor'; where: string[]; nome: string;
};
type Gravacao = {
  tipo: string; tamanho: number; inicio: number | null; fim: number | null;
  duracao: number | null; autor: string; em: number; arquivo: string;
  /** Marcada para regravar (migração 0005): o aluno ouve esta até a nova. */
  pendente?: boolean;
};
type Carga = 'carregando' | 'sem-sessao' | 'nao-admin' | 'codigo' | 'erro' | 'pronto';
type Mic = 'parado' | 'pedindo' | 'gravando' | 'analisando' | 'revisar' | 'salvando' | 'negado' | 'sem-suporte' | 'erro';
type Revisao = {
  blob: Blob; url: string; corte: Corte | null; corteVisual: Corte | null;
  duracao: number; diag: Diagnostico; ondas: number[]; convertido: boolean;
};
type Filtro = 'todos' | 'sem' | 'com' | 'pendentes';

const DO_ESTUDIO = new Set(AUDIO_MANIFEST);

const fmtTempo = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const fmtKB = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

/** Toca um trecho de um elemento de áudio e para no fim. */
function tocarTrecho(el: HTMLAudioElement, corte: Corte | null, aoTerminar: () => void) {
  el.currentTime = corte ? corte.inicio / 1000 : 0;
  el.ontimeupdate = corte ? () => { if (el.currentTime >= corte.fim / 1000) el.pause(); } : null;
  el.onpause = aoTerminar;
  el.onended = aoTerminar;
  void el.play().catch(aoTerminar);
}

export function GravarClient() {
  const [carga, setCarga] = useState<Carga>('carregando');
  const [catalogo, setCatalogo] = useState<Item[]>([]);
  const [gravacoes, setGravacoes] = useState<Record<string, Gravacao>>({});
  const [grupo, setGrupo] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('sem');
  const [atual, setAtual] = useState<string | null>(null);

  const [mic, setMic] = useState<Mic>('parado');
  const [ms, setMs] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tocando, setTocando] = useState<'nova' | 'atual' | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const quadro = useRef<number | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  /* ── o catálogo ───────────────────────────────────────────────────── */
  /* Sobe depois de o código do segundo fator ser aceito (lib/admin.js),
     para buscar o catálogo de novo. */
  const [carregamento, setCarregamento] = useState(0);
  useEffect(() => {
    fetch(asset('/api/admin/audio'), { credentials: 'same-origin', cache: 'no-store' })
      .then(async r => {
        if (r.status === 401) return setCarga('sem-sessao');
        if (await pedeCodigo(r)) return setCarga('codigo');
        if (r.status === 403) return setCarga('nao-admin');
        if (!r.ok) return setCarga('erro');
        const j = await r.json() as { catalogo: Item[]; gravacoes: Record<string, Gravacao> };
        setCatalogo(j.catalogo);
        setGravacoes(j.gravacoes);
        setCarga('pronto');
      })
      .catch(() => setCarga('erro'));
  }, [carregamento]);

  const status = useCallback((id: string): 'painel' | 'estudio' | 'nenhum' =>
    (gravacoes[id] ? 'painel' : DO_ESTUDIO.has(id) ? 'estudio' : 'nenhum'), [gravacoes]);

  const grupos = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catalogo) {
      const g = c.where[0] ?? 'outros';
      if (m.has(g)) continue;
      const letra = g.match(/^letra (\d+)$/);
      const nomeDaLetra = letra && catalogo.find(x => x.kind === 'nome' && x.where[0] === g)?.translit;
      m.set(g, letra ? `Letra ${letra[1]}${nomeDaLetra ? ` · ${nomeDaLetra}` : ''}` : g[0]!.toUpperCase() + g.slice(1));
    }
    return [...m];
  }, [catalogo]);

  const visiveis = useMemo(() => catalogo.filter(c =>
    (!grupo || c.where[0] === grupo)
    && (filtro === 'todos'
      || (filtro === 'pendentes' ? !!gravacoes[c.id]?.pendente : (filtro === 'sem') === (status(c.id) === 'nenhum')))
  ), [catalogo, grupo, filtro, status, gravacoes]);

  const pendentes = useMemo(() => Object.values(gravacoes).filter(x => x.pendente).length, [gravacoes]);

  const contagem = useMemo(() => {
    let painel = 0, estudio = 0;
    for (const c of catalogo) { const s = status(c.id); if (s === 'painel') painel++; else if (s === 'estudio') estudio++; }
    return { painel, estudio, total: catalogo.length };
  }, [catalogo, status]);

  const item = catalogo.find(c => c.id === atual) ?? null;

  /* ── o microfone ──────────────────────────────────────────────────── */
  const pararMedidor = () => {
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    quadro.current = null;
    setNivel(0);
  };

  const desligar = useCallback(() => {
    if (rec.current?.state === 'recording') rec.current.stop();
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null;
    if (relogio.current) clearInterval(relogio.current);
    pararMedidor();
    void ctx.current?.close().catch(() => {});
    ctx.current = null;
  }, []);

  useEffect(() => {
    const sair = () => desligar();
    window.addEventListener('pagehide', sair);
    return () => { window.removeEventListener('pagehide', sair); desligar(); };
  }, [desligar]);

  useEffect(() => () => { if (revisao) URL.revokeObjectURL(revisao.url); }, [revisao]);

  /* O gravador fica preso embaixo, onde mora o botão de acessibilidade: ele
     sobe para ficar logo acima do gravador (ver .hf-a11y em globals.css). */
  const barra = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = barra.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const raiz = document.documentElement;
    const ajusta = () => raiz.style.setProperty('--hf-a11y-acima', `${Math.ceil(el.getBoundingClientRect().height) + 12}px`);
    const ro = new ResizeObserver(ajusta);
    ro.observe(el);
    ajusta();
    return () => { ro.disconnect(); raiz.style.removeProperty('--hf-a11y-acima'); };
  }, [carga]);

  const descartar = () => {
    player.current?.pause();
    setRevisao(null);
    setAviso(null);
    setMic('parado');
  };

  const processar = async (bruto: Blob) => {
    setMic('analisando');
    try {
      const actx = ctx.current ?? new AudioContext();
      const dados = await bruto.arrayBuffer();
      /* A forma de callback, e não a promessa: o Safari antigo só tem ela. */
      const buf = await new Promise<AudioBuffer>((ok, falha) => actx.decodeAudioData(dados.slice(0), ok, falha));
      const mono = paraMono(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)));
      const duracao = Math.round(buf.duration * 1000);
      if (duracao < MIN_MS) { setAviso('A gravação ficou curta demais. Toque em Gravar e fale o item inteiro.'); setMic('parado'); return; }
      const corte = acharVoz(mono, buf.sampleRate);
      const diag = diagnosticar(mono, buf.sampleRate);
      const converter = precisaConverter(bruto.type);
      const blob = converter ? new Blob([wavDoTrecho(mono, buf.sampleRate, corte)], { type: 'audio/wav' }) : bruto;
      setRevisao({
        blob, url: URL.createObjectURL(blob), corte: converter ? null : corte, corteVisual: corte,
        duracao, diag, ondas: barras(mono), convertido: converter
      });
      setMic('revisar');
    } catch {
      /* Sem conseguir decodificar, ainda dá para guardar um MP4 inteiro -
         só sem o corte. Outro formato, não: ele não tocaria em todo lugar. */
      if (!precisaConverter(bruto.type)) {
        setRevisao({
          blob: bruto, url: URL.createObjectURL(bruto), corte: null, corteVisual: null, duracao: 0,
          diag: { nivel: 'ok', texto: 'Não consegui medir o volume desta gravação, mas ela pode ser salva.' },
          ondas: [], convertido: false
        });
        setMic('revisar');
      } else {
        setAviso('Não consegui ler a gravação neste navegador. Tente pelo Safari ou pelo Chrome.');
        setMic('erro');
      }
    }
  };

  const gravar = async () => {
    if (!item) return;
    setAviso(null);
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMic('sem-suporte');
      return;
    }
    try {
      /* O AudioContext nasce aqui, dentro do toque: o iOS só deixa um
         contexto de áudio tocar ou medir quando ele foi criado por um gesto. */
      if (!ctx.current) ctx.current = new AudioContext();
      void ctx.current.resume().catch(() => {});
      if (!stream.current) {
        setMic('pedindo');
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }
        });
      }
      const s = stream.current;
      const tipo = escolherFormato(t => MediaRecorder.isTypeSupported(t));
      const r = tipo ? new MediaRecorder(s, { mimeType: tipo }) : new MediaRecorder(s);
      pedacos.current = [];
      r.ondataavailable = e => { if (e.data.size) pedacos.current.push(e.data); };
      r.onstop = () => {
        if (relogio.current) clearInterval(relogio.current);
        pararMedidor();
        void processar(new Blob(pedacos.current, { type: r.mimeType || tipo || 'audio/mp4' }));
      };
      rec.current = r;

      /* O medidor: a barra que mostra que o microfone está ouvindo. */
      const analisador = ctx.current.createAnalyser();
      analisador.fftSize = 1024;
      ctx.current.createMediaStreamSource(s).connect(analisador);
      const amostras = new Float32Array(analisador.fftSize);
      const medir = () => {
        analisador.getFloatTimeDomainData(amostras);
        let p = 0;
        for (const a of amostras) p = Math.max(p, Math.abs(a));
        setNivel(p);
        quadro.current = requestAnimationFrame(medir);
      };
      medir();

      r.start();
      const comeco = Date.now();
      setMs(0);
      setMic('gravando');
      relogio.current = setInterval(() => {
        const t = Date.now() - comeco;
        setMs(t);
        if (t >= MAX_SEGUNDOS * 1000 && r.state === 'recording') r.stop();
      }, 100);
    } catch (e) {
      const nome = (e as { name?: string })?.name;
      setMic(nome === 'NotAllowedError' || nome === 'SecurityError' ? 'negado' : 'erro');
      if (nome !== 'NotAllowedError' && nome !== 'SecurityError') {
        setAviso('Não foi possível abrir o microfone. Confira se outro app não está usando ele.');
      }
    }
  };

  const parar = () => { if (rec.current?.state === 'recording') rec.current.stop(); };

  const proximoSemAudio = (depoisDe: string, gravs: Record<string, Gravacao>) => {
    const lista = catalogo.filter(c => !grupo || c.where[0] === grupo);
    const i = lista.findIndex(c => c.id === depoisDe);
    const semAudio = (c: Item) => !gravs[c.id] && !DO_ESTUDIO.has(c.id);
    return [...lista.slice(i + 1), ...lista.slice(0, i)].find(semAudio)?.id ?? null;
  };

  const salvar = async () => {
    if (!item || !revisao) return;
    setMic('salvando');
    const q = new URLSearchParams({ id: item.id });
    if (revisao.corte) { q.set('inicio', String(revisao.corte.inicio)); q.set('fim', String(revisao.corte.fim)); }
    if (revisao.duracao) q.set('duracao', String(revisao.duracao));
    try {
      const r = await fetch(asset(`/api/admin/audio?${q}`), {
        method: 'PUT', body: revisao.blob, credentials: 'same-origin',
        headers: { 'Content-Type': tipoBase(revisao.blob.type) || 'audio/mp4' }
      });
      if (!r.ok) {
        const erro = ((await r.json().catch(() => ({}))) as { error?: string }).error;
        setAviso(erro === 'too-large' ? 'O arquivo ficou grande demais. Grave um trecho mais curto.'
          : erro === 'not-admin' || r.status === 401 ? 'A sessão caiu. Entre de novo com a conta de administrador.'
          : erro === 'admin-codigo' ? 'As 12 horas do código venceram. Recarregue a página e confirme o código de novo - a gravação continua aqui até lá.'
          : 'Não consegui salvar. Confira a internet e tente de novo - a gravação continua aqui.');
        setMic('revisar');
        return;
      }
      const j = await r.json() as { tipo: string; tamanho: number; em: number; arquivo: string };
      const novas = {
        ...gravacoes,
        [item.id]: {
          tipo: j.tipo, tamanho: j.tamanho, inicio: revisao.corte?.inicio ?? null, fim: revisao.corte?.fim ?? null,
          duracao: revisao.duracao || null, autor: '', em: j.em, arquivo: j.arquivo
        }
      };
      setGravacoes(novas);
      setRevisao(null);
      setMic('parado');
      setAviso(`Salvo como ${j.arquivo}.`);
      const prox = proximoSemAudio(item.id, novas);
      if (prox) setAtual(prox);
    } catch {
      setAviso('Não consegui salvar. Confira a internet e tente de novo - a gravação continua aqui.');
      setMic('revisar');
    }
  };

  /* Marca para regravar, ou tira a marca. O som continua no ar até a nova. */
  const marcarPendente = async (marca: boolean) => {
    if (!item || !gravacoes[item.id]) return;
    const r = await fetch(asset('/api/admin/audio/pendente'), {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, pendente: marca })
    }).catch(() => null);
    if (!r || !r.ok) { setAviso('Não consegui marcar. Tente de novo.'); return; }
    setGravacoes({ ...gravacoes, [item.id]: { ...gravacoes[item.id]!, pendente: marca } });
    setAviso(marca ? 'Marcada como PENDENTE. Os alunos ouvem a gravação atual até você salvar a nova.' : 'Tirada de PENDENTE.');
  };

  const remover = async () => {
    if (!item || !gravacoes[item.id]) return;
    const volta = DO_ESTUDIO.has(item.id) ? ' O arquivo do estúdio volta a tocar.' : ' O item fica sem áudio.';
    if (!window.confirm(`Remover a gravação do painel de "${item.translit ?? item.gloss}"?${volta}`)) return;
    const r = await fetch(asset(`/api/admin/audio?id=${item.id}`), { method: 'DELETE', credentials: 'same-origin' });
    if (!r.ok) { setAviso('Não consegui remover. Tente de novo.'); return; }
    const { [item.id]: _, ...resto } = gravacoes;
    setGravacoes(resto);
    setAviso('Gravação removida.');
  };

  const ouvirNova = () => {
    if (!revisao) return;
    if (tocando) { player.current?.pause(); return; }
    const el = new Audio(revisao.url);
    player.current = el;
    setTocando('nova');
    tocarTrecho(el, revisao.corteVisual && !revisao.convertido ? revisao.corteVisual : null, () => setTocando(null));
  };

  const ouvirAtual = () => {
    if (!item) return;
    if (tocando) { player.current?.pause(); return; }
    const g = gravacoes[item.id];
    const el = new Audio(g
      ? asset(`/api/admin/audio/arquivo?id=${item.id}&v=${g.em}`)
      : asset(`/audio/${item.id}.mp3`));
    player.current = el;
    setTocando('atual');
    tocarTrecho(el, g && g.inicio !== null && g.fim !== null ? { inicio: g.inicio, fim: g.fim } : null, () => setTocando(null));
  };

  const escolher = (id: string) => {
    if (mic === 'gravando' || mic === 'salvando' || mic === 'analisando') return;
    player.current?.pause();
    setRevisao(null);
    setAviso(null);
    if (mic !== 'negado' && mic !== 'sem-suporte') setMic('parado');
    setAtual(id);
  };

  /* ── telas ────────────────────────────────────────────────────────── */
  if (carga !== 'pronto') {
    const texto = {
      carregando: 'Carregando o catálogo…',
      'sem-sessao': 'Entre com a conta de administrador para gravar.',
      'nao-admin': 'Esta conta não tem acesso ao painel de gravação.',
      codigo: 'Falta confirmar que é você.',
      erro: 'Não consegui carregar o catálogo. Confira a internet e recarregue a página.'
    }[carga];
    return (
      <main className="mx-auto max-w-[720px] px-4 py-10 grid gap-4">
        <h1 className="text-[26px] font-bold m-0">Gravar pronúncias</h1>
        <p className="font-ui text-[16px] text-ink-body m-0" role={carga === 'carregando' ? 'status' : 'alert'}>{texto}</p>
        {carga === 'sem-sessao' && (
          <Link href="/entrar/?next=/admin/gravar/" className="font-ui text-[16px] text-[var(--accent)] underline">Entrar</Link>
        )}
        {carga === 'codigo' && (
          <CodigoDoAdmin onPronto={() => { setCarga('carregando'); setCarregamento(n => n + 1); }} />
        )}
      </main>
    );
  }

  const comAudio = contagem.painel + contagem.estudio;
  const g = item ? gravacoes[item.id] : undefined;
  const st = item ? status(item.id) : 'nenhum';
  const ocupado = mic === 'gravando' || mic === 'analisando' || mic === 'salvando' || mic === 'pedindo';

  return (
    <main className="mx-auto max-w-[760px] px-4 pt-6 pb-[380px] grid gap-5">
      <header className="grid gap-2">
        <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight m-0">Gravar pronúncias</h1>
        <p className="font-ui text-[15px] text-ink-body m-0">
          <strong>{comAudio} de {contagem.total}</strong> itens com áudio
          · {contagem.painel} gravados aqui · {contagem.estudio} do estúdio
        </p>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
          <div className="h-full bg-[var(--teal)]" style={{ width: `${(100 * comAudio) / Math.max(1, contagem.total)}%` }} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
        <label className="grid gap-1 font-ui text-[13px] text-ink-muted">
          Grupo
          <select value={grupo} onChange={e => setGrupo(e.target.value)}
                  className="min-h-[44px] rounded-[var(--r-md)] border border-line bg-surface px-3 font-ui text-[16px] text-ink">
            <option value="">Todos os grupos</option>
            {grupos.map(([k, rotulo]) => <option key={k} value={k}>{rotulo}</option>)}
          </select>
        </label>
        <div className="flex gap-2 self-end" role="group" aria-label="Filtro">
          {([['sem', 'Sem áudio'], ['com', 'Com áudio'], ['pendentes', `Pendentes (${pendentes})`], ['todos', 'Todos']] as const).map(([k, r]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}
                    className={`min-h-[44px] px-3.5 rounded-full border font-ui text-[14px]
                      ${filtro === k ? 'bg-[var(--navy)] border-[var(--navy)] text-white' : 'border-line bg-surface text-ink-body'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="font-ui text-[15px] text-ink-muted m-0">
          {filtro === 'sem' ? 'Nenhum item sem áudio neste grupo. 🎉'
            : filtro === 'pendentes' ? 'Nenhuma gravação PENDENTE. 🎉' : 'Nenhum item aqui.'}
        </p>
      ) : (
        <ul className="list-none p-0 m-0 grid gap-1.5">
          {visiveis.map(c => {
            const s = status(c.id);
            const escolhido = c.id === atual;
            return (
              <li key={c.id}>
                <button type="button" onClick={() => escolher(c.id)} aria-current={escolhido || undefined}
                        className={`w-full min-h-[56px] grid grid-cols-[auto_1fr_auto] items-center gap-3 text-left
                          rounded-[var(--r-md)] border px-3 py-2
                          ${escolhido ? 'border-[var(--navy)] bg-[var(--accent-wash)]' : 'border-line bg-surface hover:bg-surface-2'}`}>
                  <span aria-hidden className={`w-2.5 h-2.5 rounded-full
                    ${s === 'painel' ? 'bg-[var(--teal)]' : s === 'estudio' ? 'bg-[var(--navy)]' : 'bg-line'}`} />
                  <span className="min-w-0">
                    <span className="font-ui text-[15px] text-ink">
                      <strong>{c.translit ?? c.gloss}</strong>
                      <span className="text-ink-muted"> · {c.gloss}</span>
                    </span>
                    <span className="block font-ui text-[12.5px] text-ink-muted">
                      {gravacoes[c.id]?.pendente && <strong className="text-[#B3261E]">PENDENTE · regravar · </strong>}
                      {s === 'painel' ? `gravado aqui · ${gravacoes[c.id]!.arquivo}`
                        : s === 'estudio' ? 'arquivo do estúdio' : 'sem áudio'} · nº {c.num}
                    </span>
                  </span>
                  {/* Uma frase não pode espremer o texto ao lado: fica com no
                      máximo metade da linha e quebra dentro dela. */}
                  <span className="max-w-[48vw] sm:max-w-[320px] text-right">
                    {c.kind === 'professor'
                      ? <span className="font-ui text-[13px] font-semibold text-[var(--accent)]">explicação do professor</span>
                      : <He size="word">{c.he}</He>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* O gravador fica preso embaixo: no celular, o polegar alcança, e a
          palavra a ler fica grande e visível enquanto se grava. */}
      <section ref={barra} aria-label="Gravador"
               className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--card)] shadow-[0_-8px_24px_rgba(0,0,0,.08)]
                          pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[760px] px-4 pt-3 grid gap-3">
          {!item ? (
            <p className="font-ui text-[15px] text-ink-body m-0 py-3">Toque num item da lista para gravar.</p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                {item.kind !== 'professor' && <He size="xl">{item.he}</He>}
                <div className="min-w-0 flex-1">
                  <p className="font-ui text-[16px] text-ink m-0"><strong>{item.translit ?? item.gloss}</strong></p>
                  {/* O roteiro da explicação precisa ser lido inteiro enquanto se grava. */}
                  <p className={`font-ui text-[13px] text-ink-muted m-0 ${item.kind === 'professor' ? '' : 'truncate'}`}>{item.gloss}</p>
                  <p className="font-ui text-[12.5px] text-ink-muted m-0">
                    arquivo: <code>{g ? g.arquivo : `${item.nome}.mp4`}</code>
                    {st === 'estudio' && !g && ' · tem arquivo do estúdio'}
                  </p>
                  {g?.pendente && (
                    <p className="font-ui text-[13px] font-semibold text-[#B3261E] m-0">PENDENTE: grave de novo. Salvar a nova tira a marca.</p>
                  )}
                </div>
              </div>

              {mic === 'gravando' && (
                <div role="status" className="grid gap-1.5">
                  <p className="flex items-center gap-2 font-ui text-[15px] font-semibold text-[#B3261E] m-0">
                    <span aria-hidden className="w-3 h-3 rounded-full bg-[#D93025] motion-safe:animate-pulse" />
                    Gravando · {fmtTempo(ms)}
                    <span className="font-normal text-ink-muted">(para sozinho em {MAX_SEGUNDOS} s)</span>
                  </p>
                  <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
                    <div className={`h-full transition-[width] duration-75 ${nivel > 0.95 ? 'bg-[#D93025]' : 'bg-[var(--teal)]'}`}
                         style={{ width: `${Math.min(100, Math.sqrt(nivel) * 100)}%` }} />
                  </div>
                </div>
              )}

              {mic === 'revisar' && revisao && (
                <div className="grid gap-2">
                  {revisao.ondas.length > 0 && (
                    <svg viewBox={`0 0 ${revisao.ondas.length * 4} 40`} className="w-full h-10" aria-hidden preserveAspectRatio="none">
                      {revisao.ondas.map((a, i) => {
                        const t = (i / revisao.ondas.length) * revisao.duracao;
                        const dentro = !revisao.corteVisual || (t >= revisao.corteVisual.inicio && t <= revisao.corteVisual.fim);
                        const h = Math.max(1.5, a * 38);
                        return <rect key={i} x={i * 4} y={20 - h / 2} width={2.6} height={h} rx={1}
                                     fill={dentro ? 'var(--navy)' : 'var(--line)'} />;
                      })}
                    </svg>
                  )}
                  <p className={`font-ui text-[14px] m-0 ${revisao.diag.nivel === 'ok' ? 'text-[var(--teal-ink)]' : 'text-[#B3261E]'}`}>
                    {revisao.diag.texto}
                    {revisao.corteVisual && ` O silêncio antes e depois (em cinza) fica de fora.`}
                  </p>
                  <p className="font-ui text-[12.5px] text-ink-muted m-0">
                    {revisao.convertido ? 'WAV (este navegador não grava MP4)' : 'MP4 / AAC'} · {fmtKB(revisao.blob.size)}
                  </p>
                </div>
              )}

              {mic === 'negado' && (
                <p role="alert" className="font-ui text-[14px] text-ink-body m-0">
                  O navegador não deixou usar o microfone. No iPhone: Ajustes › Safari › Microfone › Permitir,
                  ou toque em "aA" na barra de endereço › Ajustes do Site › Microfone. Depois recarregue a página.
                </p>
              )}
              {mic === 'sem-suporte' && (
                <p role="alert" className="font-ui text-[14px] text-ink-body m-0">
                  Este navegador não grava áudio. Use o Safari (iOS 14.3 ou mais novo), o Chrome, o Edge ou o Firefox atualizados.
                </p>
              )}
              {aviso && <p role="status" className="font-ui text-[14px] text-ink-body m-0">{aviso}</p>}

              <div className="flex flex-wrap items-center gap-2.5">
                {mic === 'gravando' ? (
                  <button type="button" onClick={parar}
                          className="min-h-[56px] px-7 rounded-full bg-[#D93025] text-white font-ui text-[17px] font-semibold">
                    ■ Parar
                  </button>
                ) : mic === 'revisar' || mic === 'salvando' ? (
                  <>
                    <Button size="lg" onClick={salvar} disabled={mic === 'salvando'}>
                      {mic === 'salvando' ? 'Salvando…' : g || st === 'estudio' ? 'Salvar e substituir' : 'Salvar'}
                    </Button>
                    <Button variant="secondary" size="md" onClick={ouvirNova}>
                      {tocando === 'nova' ? 'Pausar' : '▶ Ouvir'}
                    </Button>
                    <Button variant="ghost" size="md" onClick={descartar} disabled={mic === 'salvando'}>
                      Apagar e gravar de novo
                    </Button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={gravar} disabled={ocupado}
                            className="min-h-[56px] px-7 rounded-full bg-[#D93025] text-white font-ui text-[17px] font-semibold
                                       inline-flex items-center gap-2 disabled:opacity-60">
                      <span aria-hidden className="w-3.5 h-3.5 rounded-full bg-white" />
                      {mic === 'pedindo' ? 'Liberando o microfone…' : mic === 'analisando' ? 'Preparando…'
                        : st === 'nenhum' ? 'Gravar' : 'Gravar de novo (substituir)'}
                    </button>
                    {st !== 'nenhum' && (
                      <Button variant="secondary" size="md" onClick={ouvirAtual}>
                        {tocando === 'atual' ? 'Pausar' : '▶ Ouvir a atual'}
                      </Button>
                    )}
                    {g && (
                      <>
                        <a href={asset(`/api/admin/audio/arquivo?id=${item.id}&baixar=1`)}
                           className="min-h-[44px] inline-flex items-center px-3 font-ui text-[14px] text-[var(--accent)] underline">
                          Baixar {g.arquivo}
                        </a>
                        <Button variant="ghost" size="sm" onClick={() => marcarPendente(!g.pendente)}>
                          {g.pendente ? 'Tirar de PENDENTE' : 'Marcar como PENDENTE'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={remover}>Remover</Button>
                      </>
                    )}
                  </>
                )}
                {stream.current && mic !== 'gravando' && (
                  <button type="button" onClick={() => { desligar(); setMic('parado'); }}
                          className="ml-auto min-h-[44px] px-2 font-ui text-[13px] text-ink-muted underline">
                    Desligar microfone
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

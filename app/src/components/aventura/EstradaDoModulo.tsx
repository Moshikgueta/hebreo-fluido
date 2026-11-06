'use client';

/* A estrada do curso (05/11/2026, aprovada pelo dono no protótipo, "diferente
 * do Duolingo"; um caminho só, com a Yael, desde 06/11/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * As etapas em fila, cada uma um arco de janela de Jerusalém com o ícone do
 * seu tipo, ligadas por uma estrada de pedra entre ciprestes e oliveiras. Cada
 * módulo começa numa faixa com o desenho do lugar dele, que fica presa no
 * topo enquanto se rola por ele. No meio de cada módulo, o jarro de barro:
 * abre uma vez, com metade das lições feitas, e paga XP.jarro. No fim, o
 * portão do checkpoint com os carimbos de passaporte (1 até 69%, 2 até 89%, 3
 * com 90% ou mais).
 *
 * A Yael anda pela estrada. Ela lembra onde parou (`hf-yael-v1`): só anda
 * quando há progresso novo, da estação de antes até a de agora, parando em
 * cada uma; sem progresso, já está lá. Ela anda POR BAIXO das estações e dos
 * textos, e descansa num espaço reservado em cima da estação de agora: nunca
 * cobre um desenho nem um texto. Com `seguir` (Meu curso), a página rola com
 * ela e abre onde o aluno está.
 *
 * Tocar numa estação abre o cartão dela, com o que ela é, como está e o botão
 * para ir; a trancada diz o que falta. Com `janela` (o painel), só aparecem as
 * estações em volta da de agora. Com "menos movimento", nada anda. */

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { He } from '@/components/hebrew/He';
import { Yael } from '@/components/aventura/Yael';
import { Cenario, type IdDoCenario } from '@/components/aventura/Cenarios';
import { IconeCadeado } from '@/components/shell/NavIcons';
import { Prose } from '@/components/learn/Blocks';
import { tx } from '@/i18n/telas/painel-course-map-client';
import { tx as txE } from '@/i18n/telas/estrada-da-yael';

export type TipoDeParada = 'letra' | 'som' | 'leitura' | 'texto' | 'revisao' | 'jarro' | 'checkpoint';
export type ParadaDaEstrada = {
  chave: string; tipo: TipoDeParada; nome: string; sub: string;
  /** O módulo da estação (0 a Aula 0, 8 o desafio final). */
  n: number;
  he?: string; href?: string | null;
  estado: 'feita' | 'agora' | 'livre' | 'trancada';
  rotuloAcessivel: string;
  /** O que o cartão diz: como a estação está, ou o que falta para abrir. */
  detalhe?: string;
  /** O botão do cartão. */
  acao?: string;
  /** Só no checkpoint: 0 a 3. */
  carimbos?: number;
  /** Só no jarro. */
  modulo?: string; jarro?: 'fechado' | 'pronto' | 'aberto';
  /** A meta do módulo, no cartão da última estação dele. */
  meta?: { texto: string; alcancada: boolean };
};
export type FaixaDaEstrada = {
  chave: string; tipo: 'faixa'; n: number; titulo: string; etapa: string;
  lugar: { he: string; translit: string; pt: string } | null;
  estado: 'feito' | 'agora' | 'adiante'; pct: number; href: string; motivo: string;
};
export type ItemDaEstrada = ParadaDaEstrada | FaixaDaEstrada;
const ehFaixa = (i: ItemDaEstrada): i is FaixaDaEstrada => i.tipo === 'faixa';

/** Os carimbos de um checkpoint pela melhor nota (decisão do dono). */
export const carimbosDaNota = (best: number | null | undefined, aprovado: boolean) =>
  !aprovado || best == null ? 0 : best >= 0.9 ? 3 : best >= 0.7 ? 2 : 1;

const ICONE: Record<string, ReactNode> = {
  leitura: <path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6v14" />,
  texto: <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zM8 9h8M8 13h8M8 17h5" />,
  revisao: <path d="M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5" />,
  checkpoint: <path d="M6 20V4M6 5h11l-2.5 3.5L17 12H6" />,
  jarro: <path d="M9 4h6M8 7c-3 3-4 7-2 10 1.5 2 3.5 3 6 3s4.5-1 6-3c2-3 1-7-2-10z" />
};
const calmo = () => typeof window !== 'undefined' && (
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.dataset.a11yMovimento === 'reduzido');

/* Onde a Yael parou da última vez, por estrada. */
const MEMORIA = 'hf-yael-v1';
function ondeParou(estrada: string): string | null {
  try { return (JSON.parse(localStorage.getItem(MEMORIA) ?? '{}') as Record<string, string>)[estrada] ?? null; } catch { return null; }
}
function guardar(estrada: string, chave: string) {
  try {
    const m = JSON.parse(localStorage.getItem(MEMORIA) ?? '{}') as Record<string, string>;
    m[estrada] = chave; localStorage.setItem(MEMORIA, JSON.stringify(m));
  } catch { /* navegação privada: ela anda de novo, e tudo bem */ }
}

/* Uma letra cabe grande no arco; uma palavra (o lugar de cada módulo, na
   estrada do curso) encolhe para caber. */
const tamanhoNoArco = (he: string) => {
  const n = he.match(/[\u05D0-\u05EA]/g)?.length ?? 1;
  return n <= 2 ? '!text-[28px]' : n === 3 ? '!text-[21px]' : '!text-[17px]';
};

function Arco({ p }: { p: ParadaDaEstrada }) {
  const miolo = p.estado === 'trancada' ? <IconeCadeado size={24} />
    : p.he ? <He size="inline" className={`${tamanhoNoArco(p.he)} !leading-none !text-current`}>{p.he}</He>
    : <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONE[p.tipo]}</svg>;
  return (
    <span className={`hf-arco hf-arco-${p.estado}`} data-parada>
      {miolo}
      {p.estado === 'feita' && <span aria-hidden className="hf-arco-feito">✓</span>}
    </span>
  );
}

function Jarro({ estado }: { estado: 'fechado' | 'pronto' | 'aberto' }) {
  return (
    <svg viewBox="0 0 70 84" aria-hidden className={`hf-jarro hf-jarro-${estado}`} data-parada>
      <ellipse cx="35" cy="80" rx="22" ry="3" fill="rgba(0,0,0,.12)" />
      <path d="M22 24c-10 8-14 22-10 36 3 12 13 18 23 18s20-6 23-18c4-14 0-28-10-36z" fill="#C98B49" />
      <path d="M14 46c14 5 28 5 42 0" stroke="#8E5A3B" strokeWidth="2.5" fill="none" />
      <path d="M24 20h22v6H24z" fill="#B78A5A" />
      <g className="hf-jarro-moedas"><circle cx="30" cy="18" r="5" fill="#E7B65A" /><circle cx="40" cy="16" r="5" fill="#E7B65A" /><circle cx="35" cy="11" r="4.5" fill="#F3D58F" /></g>
      <g className="hf-jarro-tampa"><ellipse cx="35" cy="18" rx="13" ry="4" fill="#8E5A3B" /><rect x="32" y="10" width="6" height="7" rx="2" fill="#8E5A3B" /></g>
    </svg>
  );
}

function Portao() {
  return (
    <svg viewBox="0 0 86 80" aria-hidden className="hf-portao" data-parada>
      <rect x="4" y="18" width="20" height="58" fill="#DCC393" /><rect x="62" y="18" width="20" height="58" fill="#DCC393" />
      <path d="M4 18h4v-6h4v6h4v-6h4v6h4M62 18h4v-6h4v6h4v-6h4v6h4" fill="#DCC393" />
      <rect x="20" y="30" width="46" height="46" fill="#E8D5AB" />
      <path d="M30 76V52a13 13 0 0126 0v24z" fill="#5B4632" /><path d="M20 30h46" stroke="#C4A873" strokeWidth="3" />
    </svg>
  );
}


function Faixa({ f, presa, novo }: { f: FaixaDaEstrada; presa: boolean; novo: boolean }) {
  const adiante = f.estado === 'adiante';
  return (
    <div className={`hf-faixa ${presa ? 'hf-faixa-presa' : ''} hf-faixa-${f.estado}`}>
      <Link href={f.href} className="hf-faixa-link">
        {f.n >= 1 && f.n <= 7 && (
          <span aria-hidden className={`hf-faixa-cena ${novo ? 'hf-desbloqueio' : ''}`}>
            <Cenario n={f.n as IdDoCenario} vivo={f.estado === 'agora'} trancado={adiante} />
          </span>
        )}
        <span className="hf-faixa-txt">
          <small>
            {adiante && <IconeCadeado size={11} />}
            {txE.moduloN(f.n)}
            {f.lugar && <> · <He size="inline">{f.lugar.he}</He> {f.lugar.pt}</>}
          </small>
          <b>{f.titulo}</b>
          <span>{adiante ? f.motivo : f.etapa}</span>
          {!adiante && (
            <span className="hf-faixa-barra" aria-label={txE.feito(f.pct)} role="img">
              <span style={{ width: `${f.pct}%` }} />
            </span>
          )}
        </span>
        {novo && (
          <>
            <span className="hf-selo-novo hf-faixa-selo">{tx.lugarNovo}</span>
            <span className="sr-only" role="status">{tx.lugarNovoAberto(f.lugar?.pt ?? f.titulo)}</span>
          </>
        )}
      </Link>
    </div>
  );
}

/** O cartão de uma estação: o que ela é, como está e o botão para ir. */
function CartaoDaEstacao({ p, onFechar }: { p: ParadaDaEstrada; onFechar: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, [p.chave]);
  const mostraLetra = p.he && p.estado !== 'trancada';
  return (
    <div id="cartao-da-estacao" role="dialog" aria-labelledby="cartao-da-estacao-titulo" className={`hf-cartao-estacao hf-cartao-${p.estado}`}>
      <button type="button" onClick={onFechar} aria-label={txE.fechar} className="hf-cartao-fechar">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="flex items-center gap-3.5">
        <span aria-hidden className={`hf-cartao-icone hf-arco-${p.estado}`}>
          {p.estado === 'trancada' ? <IconeCadeado size={22} />
            : mostraLetra ? <He size="inline" className={`${tamanhoNoArco(p.he!)} !leading-none !text-current`}>{p.he!}</He>
            : <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{ICONE[p.tipo]}</svg>}
        </span>
        <div className="min-w-0">
          <p className="m-0 font-ui text-[12.5px] text-ink-muted">
            {p.n >= 1 && p.n <= 7 ? `${txE.moduloN(p.n)} · ` : ''}{p.sub}
          </p>
          <h3 ref={titulo} id="cartao-da-estacao-titulo" tabIndex={-1}
              className="m-0 font-display text-[19px] font-semibold tracking-[-0.015em] text-ink outline-none">{p.nome}</h3>
        </div>
      </div>
      {p.detalhe && <p className="m-0 mt-2.5 font-ui text-[14.5px] leading-snug text-ink-body">{p.detalhe}</p>}
      {p.meta && (
        <p className="m-0 mt-2 font-ui text-[13.5px] leading-snug text-ink-muted">
          <strong className="font-semibold text-ink">{p.meta.alcancada ? tx.metaAlcancada : tx.meta}</strong>
          <Prose text={p.meta.texto} />
        </p>
      )}
      {p.href && p.acao && (
        <Link href={p.href} className="hf-cartao-ir">{p.acao}<span aria-hidden>→</span></Link>
      )}
    </div>
  );
}

export function EstradaDoModulo({ itens, pronto, onAbrirJarro, seguir = false, janela, memoria = 'curso', novo = null }: {
  itens: ItemDaEstrada[];
  /** O progresso já carregou: antes disso a Yael não anda nem guarda nada. */
  pronto: boolean;
  /** Abre o jarro do módulo; devolve se pagou o XP. */
  onAbrirJarro: (moduloId: string) => boolean;
  /** A página acompanha a Yael e abre onde o aluno está (Meu curso). */
  seguir?: boolean;
  /** Só as estações a esta distância da de agora (o painel). */
  janela?: number;
  /** O nome da estrada, para lembrar onde a Yael parou. */
  memoria?: string;
  /** O módulo que acabou de abrir: a faixa dele se anuncia. */
  novo?: number | null;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const via = useRef<SVGPathElement>(null);
  const viajante = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; d: string; arv: { x: number; y: number; c: boolean }[] } | null>(null);
  const [ganhou, setGanhou] = useState<string | null>(null);
  const [foraDeVista, setForaDeVista] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [humor, setHumor] = useState<'parada' | 'feliz'>('parada');

  /* A estação de agora; sem nenhuma, a última feita. */
  const todas = itens.filter((i): i is ParadaDaEstrada => !ehFaixa(i));
  const iAgora = todas.findIndex(p => p.estado === 'agora');
  const aquiTotal = Math.max(0, iAgora >= 0 ? iAgora : todas.map(p => p.estado).lastIndexOf('feita'));
  /* Com `janela`, só um pedaço: as estações em volta da de agora e a faixa
     do módulo delas. */
  const de = janela != null ? Math.max(0, aquiTotal - janela) : 0;
  const ate = janela != null ? Math.min(todas.length - 1, aquiTotal + janela) : todas.length - 1;
  const visiveis: ItemDaEstrada[] = [];
  {
    let k = 0;
    itens.forEach((it, idx) => {
      if (ehFaixa(it)) {
        const prox = itens.slice(idx + 1).find(x => !ehFaixa(x));
        const kProx = prox ? todas.indexOf(prox as ParadaDaEstrada) : -1;
        if (kProx >= de && kProx <= ate) visiveis.push(it);
        return;
      }
      if (k >= de && k <= ate) visiveis.push(it);
      k++;
          });
        }
        const paradas = visiveis.filter((i): i is ParadaDaEstrada => !ehFaixa(i));
        const aqui = aquiTotal - de;
        const chaveDeAgora = todas[aquiTotal]?.chave ?? '';

        const formas = useCallback(() => [...(caixa.current?.querySelectorAll<HTMLElement>('[data-parada]') ?? [])], []);
        const centros = useCallback(() => {
          const el = caixa.current; if (!el) return [];
          const r = el.getBoundingClientRect();
          return formas().map(n => { const b = n.getBoundingClientRect(); return [b.left - r.left + b.width / 2, b.top - r.top + b.height / 2, b.top - r.top] as const; });
        }, [formas]);

        /* A estrada passa pelo centro de cada estação. Refeita quando o tamanho muda. */
        useLayoutEffect(() => {
          const el = caixa.current; if (!el) return;
          const medir = () => {
            const r = el.getBoundingClientRect(), pts = centros(); if (!pts.length) return;
            let d = `M${pts[0]![0]} ${pts[0]![2] - 40}L${pts[0]![0]} ${pts[0]![1]}`;
            for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1]!, [x, y] = pts[i]!; const my = (y0 + y) / 2; d += ` C${x0} ${my} ${x} ${my} ${x} ${y}`; }
            const arv = pts.map(([x, y], i) => ({ x: x > r.width / 2 ? x - r.width * 0.3 : x + r.width * 0.3, y, c: i % 2 === 1 }));
            setGeo({ w: r.width, h: r.height, d, arv });
          };
          medir();
          const ro = new ResizeObserver(medir); ro.observe(el);
          return () => ro.disconnect();
        }, [centros, paradas.length]);

        /* O ponto da estrada logo acima da estação i: onde a Yael pisa. */
        /* A estrada é amostrada uma vez (o caminho do curso inteiro tem milhares de
           pixels e dezenas de estações); cada estação procura nas amostras. */
        const amostras = useRef<{ d: string; pts: [number, number, number][] }>({ d: '', pts: [] });
        const comprimentoDe = useCallback((i: number) => {
          const path = via.current, c = centros()[i]; if (!path || !c) return 0;
          const d = path.getAttribute('d') ?? '';
          if (amostras.current.d !== d) {
            const L = path.getTotalLength(), pts: [number, number, number][] = [];
            for (let s = 0; s <= L; s += 4) { const q = path.getPointAtLength(s); pts.push([s, q.x, q.y]); }
            amostras.current = { d, pts };
          }
          const alvoY = c[2] - 2; let melhor = 0, dist = Infinity;
          for (const [s, x, y] of amostras.current.pts) { const dd = (x - c[0]) ** 2 + (y - alvoY) ** 2; if (dd < dist) { dist = dd; melhor = s; } }
          return melhor;
        }, [centros]);
        const poe = useCallback((l: number) => {
          const path = via.current, v = viajante.current; if (!path || !v) return;
          const q = path.getPointAtLength(l); v.style.transform = `translate(${q.x - 28}px, ${q.y - 66}px)`; v.style.opacity = '1';
        }, []);

        /* A Yael anda só quando há progresso novo: da estação onde parou da última
           vez até a de agora (na primeira visita, das seis anteriores), parando um
           instante em cada uma, que pula de leve quando ela chega. */
        useEffect(() => {
          if (!geo || !pronto) return;
          const paradasEl = formas();
          const fim = comprimentoDe(aqui);
          const antes = ondeParou(memoria);
          const iAntesTotal = antes ? todas.findIndex(p => p.chave === antes) : -1;
          guardar(memoria, chaveDeAgora);
          const inicio = iAntesTotal < 0 ? Math.max(0, aqui - 6) : Math.max(0, iAntesTotal - de);
          if (calmo() || inicio >= aqui) {
            poe(fim);
            if (seguir && aqui > 0) paradasEl[aqui]?.scrollIntoView({ block: 'center' });
            return;
          }
          const marcos = Array.from({ length: aqui + 1 }, (_, i) => (i < inicio ? 0 : comprimentoDe(i)));
          const v = viajante.current!;
          const trechos = aqui - inicio;
          /* Cada trecho entre 450 e 900 ms: no máximo uns seis segundos. */
          const porTrecho = Math.max(450, Math.min(900, 6000 / trechos)), pausa = 220;
          let raf = 0, trecho = inicio, t0 = 0, parado = false, solto = false;
          const largar = () => { solto = true; };
          const acompanhar = () => {
            if (!seguir || solto) return;
            const r = v.getBoundingClientRect(), alvo = window.innerHeight * 0.5;
            const dy = r.top + r.height / 2 - alvo;
            if (Math.abs(dy) > 24) window.scrollBy(0, dy * 0.12);
          };
          const chegou = (i: number) => {
            const el = paradasEl[i]; if (!el) return;
            el.classList.remove('hf-visita'); void el.getBoundingClientRect(); el.classList.add('hf-visita');
          };
          const passo = (t: number) => {
            if (!t0) t0 = t;
            const ini = marcos[trecho]!, alvoL = marcos[trecho + 1]!;
            if (parado) {
              if (t - t0 >= pausa) { parado = false; t0 = t; v.classList.add('hf-andando'); }
            } else {
              const k = Math.min(1, (t - t0) / porTrecho), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
              poe(ini + (alvoL - ini) * e);
              if (k >= 1) {
                trecho++; chegou(trecho); v.classList.remove('hf-andando');
                if (trecho >= aqui) {
                  setHumor('feliz');
                  if (seguir && !solto) paradasEl[aqui]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  return;
                }
                parado = true; t0 = t;
              }
            }
            acompanhar();
            raf = requestAnimationFrame(passo);
          };
          poe(marcos[inicio]!);
          if (seguir) paradasEl[inicio]?.scrollIntoView({ block: 'center' });
          window.addEventListener('wheel', largar, { passive: true });
          window.addEventListener('touchstart', largar, { passive: true });
          window.addEventListener('keydown', largar);
          const atraso = setTimeout(() => { v.classList.add('hf-andando'); raf = requestAnimationFrame(passo); }, 600);
          return () => {
            clearTimeout(atraso); cancelAnimationFrame(raf);
            window.removeEventListener('wheel', largar); window.removeEventListener('touchstart', largar); window.removeEventListener('keydown', largar);
          };
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [geo === null, pronto, aqui, chaveDeAgora]);

        /* O botão de voltar aparece quando a estação de agora sai da tela. */
        useEffect(() => {
          const alvo = formas()[aqui]; if (!alvo) return;
          const io = new IntersectionObserver(([e]) => setForaDeVista(!e!.isIntersecting && e!.boundingClientRect.top > -4000));
          io.observe(alvo); return () => io.disconnect();
        }, [aqui, geo, formas]);
        const voltar = () => formas()[aqui]?.scrollIntoView({ block: 'center', behavior: calmo() ? 'auto' : 'smooth' });

        /* O cartão fecha com Esc (e o foco volta à estação) ou tocando fora. */
        const cartao = aberto ? paradas.find(p => p.chave === aberto) ?? null : null;
        const fechar = useCallback(() => {
          const chave = aberto; setAberto(null);
          if (chave) caixa.current?.querySelector<HTMLElement>(`[data-chave="${chave}"]`)?.focus();
        }, [aberto]);
        useEffect(() => {
          if (!aberto) return;
          const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
          const fora = (e: PointerEvent) => {
            const alvo = e.target as HTMLElement;
            if (!alvo.closest('#cartao-da-estacao') && !alvo.closest('[data-chave]')) setAberto(null);
          };
          document.addEventListener('keydown', tecla); document.addEventListener('pointerdown', fora);
          return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('pointerdown', fora); };
        }, [aberto, fechar]);

        /* Cada módulo num bloco: a faixa dele fica presa no topo só enquanto se
           rola pelas estações DELE, e solta quando o próximo módulo chega. */
        const grupos: { faixa: FaixaDaEstrada | null; paradas: ParadaDaEstrada[] }[] = [];
        for (const it of visiveis) {
          if (ehFaixa(it)) grupos.push({ faixa: it, paradas: [] });
          else { if (!grupos.length) grupos.push({ faixa: null, paradas: [] }); grupos[grupos.length - 1]!.paradas.push(it); }
        }
        let k = -1;
        return (
          <div className="relative z-[1]">
            <div ref={caixa} className="hf-estrada">
              {geo && (
                <svg aria-hidden className="hf-estrada-svg" viewBox={`0 0 ${geo.w} ${geo.h}`} width={geo.w} height={geo.h}>
                  {geo.arv.map((a, i) => a.c
                    ? <path key={i} className="hf-arvore" style={{ animationDelay: `-${i * .7}s` }} d={`M${a.x} ${a.y + 24}l-7-32 7-14 7 14z`} fill="var(--il-cipreste)" opacity=".55" />
                    : <g key={i} className="hf-arvore" style={{ animationDelay: `-${i * .5}s` }}><circle cx={a.x} cy={a.y + 6} r="13" fill="var(--il-oliva)" opacity=".45" /><path d={`M${a.x} ${a.y + 18}v10`} stroke="var(--il-tronco)" strokeWidth="3" opacity=".55" /></g>)}
                  <path ref={via} className="hf-via" d={geo.d} fill="none" stroke="var(--il-pedra)" strokeWidth="24" strokeLinecap="round" />
                  <path className="hf-via-det" d={geo.d} fill="none" stroke="var(--il-pedra-2)" strokeWidth="24" strokeLinecap="round" strokeDasharray="1 9" opacity=".7" />
                  <path className="hf-via-det" d={geo.d} fill="none" stroke="#FBF9F5" strokeWidth="2" strokeDasharray="6 10" strokeLinecap="round" opacity=".8" />
                </svg>
              )}
              {/* Por baixo das estações e dos textos: ela nunca os cobre. */}
              <div ref={viajante} aria-hidden className="hf-viajante"><Yael key={humor} humor={humor} /></div>
              <ol className="hf-estrada-lista list-none m-0 p-0">
              {grupos.map(g => (
                <li key={g.faixa?.chave ?? 'inicio'} className="hf-modulo">
                  {g.faixa && <Faixa f={g.faixa} presa={janela == null} novo={novo === g.faixa.n} />}
                  <ol className="hf-modulo-lista list-none m-0 p-0">
                  {g.paradas.map(p => {
                    k++;
                const lado = k % 2 ? 'hf-esq' : 'hf-dir';
                const comYael = k === aqui ? 'hf-com-yael' : '';
                const texto = (
                  <span className="hf-estrada-txt">
                    {p.estado === 'agora' && <span className="hf-estrada-agora">{tx.jAgora}</span>}
                    <b>{p.nome}</b>
                    <span>{p.sub}</span>
                    {p.tipo === 'checkpoint' && (
                      <span className="hf-carimbos" aria-label={tx.jCarimbos(p.carimbos ?? 0)}>
                        {[0, 1, 2].map(c => <span key={c} aria-hidden className={`hf-carimbo ${c < (p.carimbos ?? 0) ? 'hf-carimbo-ok' : ''}`}>✓</span>)}
                      </span>
                    )}
                  </span>
                );
                if (p.tipo === 'jarro') {
                  const estado = ganhou === p.modulo ? 'aberto' : p.jarro ?? 'fechado';
                  return (
                    <li key={p.chave} className={`hf-estrada-parada ${lado} ${comYael}`}>
                      <button type="button" disabled={estado !== 'pronto'} aria-label={p.rotuloAcessivel}
                              onClick={() => { if (p.modulo && onAbrirJarro(p.modulo)) setGanhou(p.modulo); }}
                              className="relative bg-transparent border-0 p-0 disabled:cursor-default">
                        <Jarro estado={estado} />
                        {ganhou === p.modulo && <span aria-hidden className="hf-jarro-ganho">+20 XP</span>}
                      </button>
                      {texto}
                    </li>
                  );
                }
                const forma = p.tipo === 'checkpoint' ? <Portao /> : <Arco p={p} />;
                return (
                  <li key={p.chave} className={`hf-estrada-parada ${lado} ${comYael}`}>
                    <button type="button" data-chave={p.chave} aria-label={p.rotuloAcessivel} aria-haspopup="dialog"
                            aria-expanded={aberto === p.chave} aria-current={p.estado === 'agora' ? 'step' : undefined}
                            onClick={() => setAberto(a => (a === p.chave ? null : p.chave))}
                            className="hf-estacao-botao">{forma}</button>
                    {texto}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
        </ol>
      </div>
      {cartao && <CartaoDaEstacao p={cartao} onFechar={fechar} />}
      {foraDeVista && !cartao && (
        <button type="button" onClick={voltar} aria-label={tx.jVoltar} className="hf-estrada-voltar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      )}
    </div>
  );
}

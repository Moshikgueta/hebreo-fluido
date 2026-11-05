'use client';

/* A estrada do módulo atual, no mapa do curso (05/11/2026, aprovada pelo dono
 * no protótipo, "diferente do Duolingo"). As etapas do módulo em fila, cada
 * uma um arco de janela de Jerusalém com o ícone do seu tipo, ligadas por uma
 * estrada de pedra entre ciprestes e oliveiras. A viajante anda até a etapa
 * de agora. No meio, o jarro de barro: abre uma vez, quando metade das
 * lições do módulo está feita, e paga XP.jarro. No fim, o portão do
 * checkpoint com os carimbos de passaporte (1 até 69%, 2 até 89%, 3 com 90%
 * ou mais). Cada etapa leva à página dela; nada muda de ordem nem de trava.
 * Com "menos movimento", a estrada aparece pronta e a viajante não anda. */

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { He } from '@/components/hebrew/He';
import { IconeCadeado } from '@/components/shell/NavIcons';
import { tx } from '@/i18n/telas/painel-course-map-client';

export type TipoDeParada = 'letra' | 'som' | 'leitura' | 'texto' | 'revisao' | 'jarro' | 'checkpoint';
export type ParadaDaEstrada = {
  chave: string; tipo: TipoDeParada; nome: string; sub: string;
  he?: string; href?: string | null;
  estado: 'feita' | 'agora' | 'livre' | 'trancada';
  rotuloAcessivel: string;
  /** Só no checkpoint: 0 a 3. */
  carimbos?: number;
};

/** Os carimbos de um checkpoint pela melhor nota (decisão do dono). */
export const carimbosDaNota = (best: number | null | undefined, aprovado: boolean) =>
  !aprovado || best == null ? 0 : best >= 0.9 ? 3 : best >= 0.7 ? 2 : 1;

const ICONE: Record<string, ReactNode> = {
  leitura: <path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6v14" />,
  texto: <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zM8 9h8M8 13h8M8 17h5" />,
  revisao: <path d="M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5" />
};
const calmo = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Arco({ p }: { p: ParadaDaEstrada }) {
  const miolo = p.estado === 'trancada' ? <IconeCadeado size={24} />
    : p.he ? <He size="inline" className="!text-[28px] !leading-none !text-current">{p.he}</He>
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

const VIAJANTE = (
  <svg viewBox="0 0 38 48" aria-hidden>
    <ellipse cx="19" cy="46" rx="9" ry="2" fill="rgba(0,0,0,.18)" />
    <rect className="hf-perna1" x="13" y="31" width="4.5" height="13" rx="2" fill="#0E3B43" />
    <rect className="hf-perna2" x="20.5" y="31" width="4.5" height="13" rx="2" fill="#0E3B43" />
    <g className="hf-viajante-corpo">
      <rect x="22" y="15" width="10" height="13" rx="3" fill="#C9773F" />
      <rect x="10" y="14" width="18" height="19" rx="7" fill="#1F8A7D" />
      <circle cx="19" cy="8" r="7" fill="#E8C4A0" /><path d="M12 7c0-5 14-5 14 0z" fill="#E7B65A" />
      <path d="M10 7h18" stroke="#B8862F" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

export function EstradaDoModulo({ paradas, jarro, onAbrirJarro }: {
  paradas: ParadaDaEstrada[];
  jarro: 'fechado' | 'pronto' | 'aberto';
  /** Abre o jarro; devolve se pagou o XP. */
  onAbrirJarro: () => boolean;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const via = useRef<SVGPathElement>(null);
  const viajante = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; d: string; arv: { x: number; y: number; c: boolean }[] } | null>(null);
  const [ganhou, setGanhou] = useState(false);
  const [foraDeVista, setForaDeVista] = useState(false);
  const aqui = Math.max(0, paradas.findIndex(p => p.estado === 'agora') >= 0 ? paradas.findIndex(p => p.estado === 'agora')
    : paradas.map(p => p.estado).lastIndexOf('feita'));

  const centros = useCallback(() => {
    const el = caixa.current; if (!el) return [];
    const r = el.getBoundingClientRect();
    return [...el.querySelectorAll('[data-parada]')].map(n => { const b = n.getBoundingClientRect(); return [b.left - r.left + b.width / 2, b.top - r.top + b.height / 2] as const; });
  }, []);

  /* A estrada passa pelo centro de cada etapa. Refeita quando o tamanho muda. */
  useLayoutEffect(() => {
    const el = caixa.current; if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect(), pts = centros(); if (!pts.length) return;
      let d = `M${pts[0]![0]} ${pts[0]![1] - 36}L${pts[0]![0]} ${pts[0]![1]}`;
      for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1]!, [x, y] = pts[i]!; const my = (y0 + y) / 2; d += ` C${x0} ${my} ${x} ${my} ${x} ${y}`; }
      const arv = pts.map(([x, y], i) => ({ x: x > r.width / 2 ? x - r.width * 0.3 : x + r.width * 0.3, y, c: i % 2 === 1 }));
      setGeo({ w: r.width, h: r.height, d, arv });
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    return () => ro.disconnect();
  }, [centros, paradas.length]);

  /* Onde, ao longo da estrada, fica a etapa i (o ponto mais perto). */
  const comprimentoDe = useCallback((i: number) => {
    const path = via.current, c = centros()[i]; if (!path || !c) return 0;
    const L = path.getTotalLength(); let melhor = 0, dist = Infinity;
    for (let s = 0; s <= L; s += 4) { const q = path.getPointAtLength(s); const dd = (q.x - c[0]) ** 2 + (q.y - c[1]) ** 2; if (dd < dist) { dist = dd; melhor = s; } }
    return melhor;
  }, [centros]);
  const poe = useCallback((l: number) => {
    const path = via.current, v = viajante.current; if (!path || !v) return;
    const q = path.getPointAtLength(l); v.style.transform = `translate(${q.x - 19}px, ${q.y - 52}px)`;
  }, []);

  /* A viajante sai da etapa anterior e anda até a de agora. */
  useEffect(() => {
    if (!geo) return;
    const fim = comprimentoDe(aqui);
    if (calmo() || aqui === 0) { poe(fim); return; }
    const ini = comprimentoDe(aqui - 1), v = viajante.current!;
    let raf = 0; const t0 = performance.now(), dur = Math.min(2200, 600 + Math.abs(fim - ini) * 2);
    poe(ini); v.classList.add('hf-andando');
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      poe(ini + (fim - ini) * e);
      if (k < 1) raf = requestAnimationFrame(passo); else v.classList.remove('hf-andando');
    };
    const atraso = setTimeout(() => { raf = requestAnimationFrame(passo); }, 700);
    return () => { clearTimeout(atraso); cancelAnimationFrame(raf); };
  }, [geo, aqui, comprimentoDe, poe]);

  /* O botão de voltar aparece quando a etapa de agora sai da tela. */
  useEffect(() => {
    const alvo = caixa.current?.querySelectorAll('[data-parada]')[aqui]; if (!alvo) return;
    const io = new IntersectionObserver(([e]) => setForaDeVista(!e!.isIntersecting && e!.boundingClientRect.top > -4000));
    io.observe(alvo); return () => io.disconnect();
  }, [aqui, geo]);

  const voltar = () => caixa.current?.querySelectorAll('[data-parada]')[aqui]?.scrollIntoView({ block: 'center', behavior: calmo() ? 'auto' : 'smooth' });

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
        <div ref={viajante} aria-hidden className="hf-viajante">{VIAJANTE}</div>
        <ol className="hf-estrada-lista list-none m-0 p-0">
        {paradas.map((p, i) => {
          const lado = i === 0 ? 'hf-centro' : i % 2 ? 'hf-esq' : 'hf-dir';
          const texto = (
            <span className="hf-estrada-txt">
              {p.estado === 'agora' && <span className="hf-estrada-agora">{tx.jAgora}</span>}
              <b>{p.nome}</b>
              <span>{p.sub}</span>
              {p.tipo === 'checkpoint' && (
                <span className="hf-carimbos" aria-label={tx.jCarimbos(p.carimbos ?? 0)}>
                  {[0, 1, 2].map(k => <span key={k} aria-hidden className={`hf-carimbo ${k < (p.carimbos ?? 0) ? 'hf-carimbo-ok' : ''}`}>✓</span>)}
                </span>
              )}
            </span>
          );
          if (p.tipo === 'jarro') {
            const pronto = jarro === 'pronto';
            return (
              <li key={p.chave} className={`hf-estrada-parada ${lado}`}>
                <button type="button" disabled={!pronto} aria-label={p.rotuloAcessivel}
                        onClick={() => { if (onAbrirJarro()) setGanhou(true); }}
                        className="relative bg-transparent border-0 p-0 disabled:cursor-default">
                  <Jarro estado={ganhou ? 'aberto' : jarro} />
                  {ganhou && <span aria-hidden className="hf-jarro-ganho">+20 XP</span>}
                </button>
                {texto}
              </li>
            );
          }
          const forma = p.tipo === 'checkpoint' ? <Portao /> : <Arco p={p} />;
          return (
            <li key={p.chave} className={`hf-estrada-parada ${lado}`}>
              {p.href
                ? <Link href={p.href} aria-label={p.rotuloAcessivel} aria-current={p.estado === 'agora' ? 'step' : undefined} className="rounded-[28px]">{forma}</Link>
                : <span aria-label={p.rotuloAcessivel} role="img">{forma}</span>}
              {texto}
            </li>
          );
        })}
        </ol>
      </div>
      {foraDeVista && (
        <button type="button" onClick={voltar} aria-label={tx.jVoltar} className="hf-estrada-voltar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      )}
    </div>
  );
}

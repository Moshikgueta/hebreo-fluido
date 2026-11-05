/* Os desenhos dos cartões de festa (05/11/2026, do protótipo aprovado).
 * Um desenho por cartão, em SVG, sem fotos e sem letra nenhuma. O nome do
 * desenho vem de data/cartoes-de-festa.json, e tools/export-content.mjs só
 * aceita os nomes desta lista (DESENHOS_DE_CARTAO). As árvores balançam e as
 * chamas tremem (hf-festa-*); com "menos movimento", tudo fica parado. */

import type { ReactNode } from 'react';

const L = (d: string, c: string, w = 2.4) => (
  <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);
const F = (d: string, c: string) => <path d={d} fill={c} />;
const C = (x: number, y: number, r: number, c: string) => <circle cx={x} cy={y} r={r} fill={c} />;
const Vela = ({ x, y, h, c }: { x: number; y: number; h: number; c: string }) => (
  <>
    <rect x={x - 3} y={y} width={6} height={h} rx={1.5} fill={c} />
    <path className="hf-festa-chama" d={`M${x} ${y - 10}c3 4 3 7 0 8c-3-1-3-4 0-8z`} fill="#E7B65A" />
  </>
);
const Balanca = ({ children, atraso }: { children: ReactNode; atraso?: string }) => (
  <g className="hf-festa-balanca" style={atraso ? { animationDelay: atraso } : undefined}>{children}</g>
);

export const DESENHOS: Record<string, ReactNode> = {
  maca: (
    <>
      <Balanca>{F('M50 34c-14-8-30 2-28 20c2 18 16 30 28 26c12 4 26-8 28-26c2-18-14-28-28-20z', '#C9443A')}{L('M50 34v-10', '#7A5E43', 3)}{F('M52 26c6-8 16-8 18-4c-6 6-12 6-18 4z', '#3E6F5E')}</Balanca>
      {F('M68 70c0-8 16-8 16 0v10c0 4-16 4-16 0z', '#E7B65A')}{L('M70 66h12', '#8C5426')}
    </>
  ),
  festa: (
    <>
      <Balanca>{F('M30 30l20-14l20 14v40H30z', '#1F8A7D')}{F('M44 50h12v20H44z', '#E7B65A')}</Balanca>
      {C(22, 22, 3, '#E7B65A')}{C(80, 18, 3, '#C9577E')}{C(84, 44, 2.5, '#8FD6C8')}{C(16, 48, 2.5, '#E07B39')}
    </>
  ),
  taca: (
    <>
      <Balanca>{L('M34 20h18l-2 18c-1 8-13 8-14 0z', '#1F8A7D')}{L('M43 46v20M36 66h14', '#1F8A7D')}</Balanca>
      <Balanca atraso=".4s">{L('M54 20h18l-2 18c-1 8-13 8-14 0z', '#C9773F')}{L('M63 46v20M56 66h14', '#C9773F')}</Balanca>
      {C(52, 12, 2.5, '#E7B65A')}{C(44, 8, 2, '#C9577E')}{C(62, 8, 2, '#8FD6C8')}
    </>
  ),
  bolo: (
    <>
      {F('M22 50h56v26H22z', '#C9577E')}
      {F('M22 50h56v8c-6 4-10-4-14 0s-10-4-14 0s-10-4-14 0s-8-4-14 0z', '#FBF4E4')}
      <Vela x={36} y={34} h={16} c="#1F8A7D" /><Vela x={50} y={34} h={16} c="#E7B65A" /><Vela x={64} y={34} h={16} c="#3F9A9C" />
      {L('M16 78h68', '#7A5E43', 3)}
    </>
  ),
  shabat: (
    <>
      <Vela x={38} y={32} h={40} c="#FBF4E4" /><Vela x={62} y={32} h={40} c="#FBF4E4" />
      {L('M35 72h6M59 72h6', '#7A5E43', 3)}{F('M24 76c6-8 46-8 52 0z', '#C98B49')}
    </>
  ),
  pessach: (
    <>
      <Balanca>{F('M20 60c0-10 60-10 60 0v10H20z', '#E8D5AB')}{L('M26 58h48M26 64h48', '#B78A5A', 1.6)}</Balanca>
      {F('M40 28h20v8l-2 16H42l-2-16z', '#9E2B1E')}{L('M50 20v8', '#7A5E43', 3)}
    </>
  ),
  chanuca: (
    <>
      {L('M50 78V46M38 78h24', '#B8862F', 3)}
      {L('M18 46c0 16 64 16 64 0M26 46c0 11 48 11 48 0M34 46c0 6 32 6 32 0M42 46c0 2 16 2 16 0', '#B8862F', 2.4)}
      {[18, 26, 34, 42, 58, 66, 74, 82].map(x => <Vela key={x} x={x} y={34} h={12} c="#3F9A9C" />)}
      <Vela x={50} y={22} h={16} c="#E7B65A" />
    </>
  ),
  purim: (
    <>
      <Balanca>{F('M18 40c10-16 54-16 64 0c-6 18-20 22-32 10c-12 12-26 8-32-10z', '#C9577E')}{C(36, 40, 5, '#FFFDF8')}{C(64, 40, 5, '#FFFDF8')}{L('M82 40l8-14', '#E7B65A', 3)}</Balanca>
      {C(20, 72, 3, '#E7B65A')}{C(80, 74, 3, '#1F8A7D')}{C(50, 80, 2.5, '#E07B39')}
    </>
  ),
  saude: (
    <>
      <Balanca>{F('M50 76c-24-14-34-28-30-40c4-12 22-14 30 0c8-14 26-12 30 0c4 12-6 26-30 40z', '#C9443A')}</Balanca>
      {L('M18 50h18l6-10l8 22l6-12h26', '#FFFDF8', 2.6)}
    </>
  ),
  sorte: (
    <>
      <Balanca>{F('M50 14l9 20l22 3l-16 15l4 22l-19-11l-19 11l4-22l-16-15l22-3z', '#E7B65A')}</Balanca>
      {C(20, 24, 2.5, '#1F8A7D')}{C(82, 70, 2.5, '#C9577E')}
    </>
  ),
  bemvindo: (
    <>
      {F('M26 78V36l24-18l24 18v42z', '#1F8A7D')}{F('M42 78V54h16v24z', '#E7B65A')}{C(55, 66, 1.6, '#7A5E43')}
      <Balanca>{F('M30 24c-6 0-6-10 0-10c2-6 10-6 12 0c6 0 6 10 0 10z', '#C9577E')}</Balanca>
    </>
  )
};

/** O desenho de um cartão. Decorativo: o sentido está no texto ao lado. */
export function DesenhoDoCartao({ desenho, className }: { desenho: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 90" aria-hidden focusable="false" className={className} style={{ overflow: 'visible' }}>
      {DESENHOS[desenho] ?? null}
    </svg>
  );
}

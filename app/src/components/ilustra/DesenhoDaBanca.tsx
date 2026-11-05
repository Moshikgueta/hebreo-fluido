/* Os desenhos das bancas do shuk (05/11/2026, do protótipo aprovado). Um
 * caixote de madeira com a fruta ou o legume em cima, em SVG, sem letra
 * nenhuma. O nome do desenho vem de data/shuk.json, e tools/export-content.mjs
 * só aceita os nomes desta lista (DESENHOS_DE_BANCA). */

import type { ReactNode } from 'react';

const P = (d: string, c: string, cheio = false) => (
  <path d={d} fill={cheio ? c : 'none'} fillOpacity={cheio ? 0.85 : 1} stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
);
const O = (x: number, y: number, r: number, c: string) => (
  <circle cx={x} cy={y} r={r} fill={c} stroke="#1B211F" strokeOpacity={0.25} strokeWidth={1.2} />
);
const Caixote = () => <>{P('M8 34h84l-6 14H14z', '#B78A5A', true)}{P('M8 34h84', '#7A5E43')}</>;
const Pilha = ({ c, folha }: { c: string; folha?: boolean }) => (
  <>
    {O(30, 26, 9, c)}{O(50, 26, 9, c)}{O(70, 26, 9, c)}{O(40, 16, 9, c)}{O(60, 16, 9, c)}
    {folha && P('M40 7l3-4M60 7l3-4', '#3E6F5E')}
    <Caixote />
  </>
);
const bolinhas = (pts: [number, number][], r: number, cores: string[]) =>
  pts.map(([x, y], i) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={cores[i % cores.length]} stroke="#1B211F" strokeOpacity={0.25} strokeWidth={1.2} />);

export const DESENHOS_DE_BANCA: Record<string, ReactNode> = {
  tomate: <Pilha c="#C9443A" folha />,
  pepino: (
    <>
      {P('M14 30c10-10 30-10 40 0c-10 4-30 4-40 0z', '#3E6F5E', true)}
      {P('M46 24c10-10 30-10 40 0c-10 4-30 4-40 0z', '#6D8A4E', true)}
      {P('M30 16c10-10 30-10 40 0c-10 4-30 4-40 0z', '#3E6F5E', true)}
      <Caixote />
    </>
  ),
  maca: <><Pilha c="#C9443A" />{P('M50 10v-5', '#7A5E43')}</>,
  banana: (
    <>
      {P('M20 28c20 10 50 6 62-14c-4 20-36 30-62 22z', '#E3B83B', true)}
      {P('M24 20c20 8 46 4 56-14c-2 16-30 24-56 20z', '#E7B65A', true)}
      {P('M80 8l4-4', '#7A5E43')}
      <Caixote />
    </>
  ),
  laranja: <Pilha c="#E07B39" />,
  melancia: (
    <>
      {P('M18 32c0-22 64-22 64 0z', '#3E6F5E', true)}
      {P('M24 32c0-16 52-16 52 0z', '#C9443A', true)}
      {P('M40 26v.5M50 22v.5M60 26v.5', '#1B211F')}
      <Caixote />
    </>
  ),
  uva: (
    <>
      {bolinhas([[40, 10], [52, 10], [46, 19], [58, 19], [34, 19], [40, 28], [52, 28]], 6, ['#6E5A6A'])}
      {P('M46 4v-3', '#3E6F5E')}
      <Caixote />
    </>
  ),
  limao: <Pilha c="#E3B83B" />,
  roma: <><Pilha c="#9E2B1E" />{P('M48 6l2-3l2 3', '#9E2B1E')}</>,
  tamara: (
    <>
      {bolinhas([[30, 28], [42, 28], [54, 28], [66, 28]], 5, ['#8C5426'])}
      {bolinhas([[36, 20], [48, 20], [60, 20]], 5, ['#7A4420'])}
      <Caixote />
    </>
  ),
  azeitona: (
    <>
      {bolinhas([[30, 28], [40, 28], [50, 28], [60, 28], [70, 28], [35, 21], [45, 21], [55, 21], [65, 21]], 4.5, ['#6D8A4E', '#1B211F'])}
      <Caixote />
    </>
  ),
  batata: <Pilha c="#C98B49" />
};

/** O desenho de uma banca. Decorativo: o nome está no cartão de preço. */
export function DesenhoDaBanca({ desenho, className, style }: { desenho: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 50" aria-hidden focusable="false" className={className} style={style}>
      {DESENHOS_DE_BANCA[desenho] ?? null}
    </svg>
  );
}

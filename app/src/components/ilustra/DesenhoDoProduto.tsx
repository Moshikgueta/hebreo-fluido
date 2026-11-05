/* As embalagens do supermercado (05/11/2026, do protótipo aprovado). Cada
 * uma é uma forma (caixa, saco, pote...) com um desenho do que tem dentro,
 * em SVG, sem marca real e sem letra nenhuma: o nome vai no rótulo, por
 * cima, em components da parada. No jogo, a embalagem fica `lisa`: cinza e
 * sem desenho, para o aluno ler só o rótulo. A forma vem de
 * data/supermercado.json, e tools/export-content.mjs só aceita as desta
 * lista (FORMAS_DE_PRODUTO); o desenho é o do id do produto. */

import type { ReactNode } from 'react';

const F = (d: string, c: string) => <path d={d} fill={c} stroke="#1B211F" strokeWidth={2} strokeLinejoin="round" />;
const C = (x: number, y: number, r: number, c: string) => <circle cx={x} cy={y} r={r} fill={c} stroke="#1B211F" strokeWidth={1.5} />;

export const FORMAS_DE_PRODUTO: Record<string, (cor: string) => ReactNode> = {
  caixa_alta: c => <>{F('M22 30l10-14h36l10 14v96H22z', c)}{F('M22 30h56', 'none')}</>,
  saco: c => <>{F('M18 26c4-8 60-8 64 0l6 96c0 6-76 6-76 0z', c)}{F('M24 24c10-6 42-6 52 0', 'none')}</>,
  bloco: c => <>{F('M12 56l20-14h56v70H12z', c)}{F('M12 56h76M88 42v70', 'none')}</>,
  pote: c => <>{F('M20 56h60l-6 66H26z', c)}{F('M16 46h68v10H16z', '#F3F0E9')}</>,
  bandeja: c => F('M10 66h80v56H10z', c),
  vidro: c => <>{F('M28 22h44v14c8 4 10 10 10 18v68H18V54c0-8 2-14 10-18z', c)}{F('M26 12h48v12H26z', '#1B211F')}</>,
  barra: c => <>{F('M10 70h80v52H10z', c)}{F('M10 70l8-8h64l8 8', 'none')}</>,
  garrafa: c => <>{F('M42 10h16v20c12 6 16 16 16 26v66H26V56c0-10 4-20 16-26z', c)}{F('M40 4h20v8H40z', '#1B211F')}</>,
  saleiro: c => <>{F('M30 40h40v82H30z', c)}{F('M30 40c0-14 40-14 40 0', '#E4E0D6')}</>
};

export const DESENHOS_DE_PRODUTO: Record<string, ReactNode> = {
  leite: <>{C(50, 48, 4, '#fff')}{F('M36 60c6-8 22-8 28 0', '#fff')}</>,
  pao: <>{F('M30 50c0-10 40-10 40 0v14H30z', '#C98B49')}{F('M38 46v8M50 44v8M62 46v8', 'none')}</>,
  queijo: <>{F('M30 50l26-6v14l-26 6z', '#E3B83B')}{C(40, 54, 2, '#C9A64E')}{C(48, 52, 1.6, '#C9A64E')}</>,
  bamba: <>{F('M30 38c8-4 32-4 40 0', 'none')}{F('M34 46c4-4 8 4 12 0s8 4 12 0s8 4 12 0', 'none')}</>,
  homus: <>{F('M30 70c10-10 30-10 40 0c-10 6-30 6-40 0z', '#E7B65A')}{C(46, 68, 2, '#6D8A4E')}{C(56, 66, 2, '#6D8A4E')}</>,
  ovos: <>{C(26, 82, 7, '#FFF9EE')}{C(42, 82, 7, '#FFF9EE')}{C(58, 82, 7, '#FFF9EE')}{C(74, 82, 7, '#FFF9EE')}</>,
  cafe: <>{F('M38 56h24l-3 14H41z', '#fff')}{F('M42 50c-2-3 2-5 0-8M50 50c-2-3 2-5 0-8M58 50c-2-3 2-5 0-8', 'none')}</>,
  chocolate: F('M18 78h20v12H18zM40 78h20v12H40zM62 78h20v12H62z', '#7A4420'),
  arroz: F('M34 46l3 6M42 42l3 6M50 46l3 6M58 42l3 6M66 46l3 6', 'none'),
  acucar: F('M36 44h12v12H36zM52 44h12v12H52z', '#fff'),
  sal: <>{C(42, 32, 1.5, '#1B211F')}{C(50, 30, 1.5, '#1B211F')}{C(58, 32, 1.5, '#1B211F')}</>,
  oleo: F('M50 60c-8 10-8 18 0 18s8-8 0-18z', '#E7B65A')
};

/** A embalagem. Decorativa: o nome está no rótulo. */
export function DesenhoDoProduto({ id, forma, cor, liso }: { id: string; forma: string; cor: string; liso?: boolean }) {
  return (
    <svg viewBox="0 0 100 130" aria-hidden focusable="false">
      {FORMAS_DE_PRODUTO[forma]?.(liso ? '#E4E0D6' : cor) ?? null}
      {!liso && (DESENHOS_DE_PRODUTO[id] ?? null)}
    </svg>
  );
}

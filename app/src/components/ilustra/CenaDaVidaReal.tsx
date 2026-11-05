/* As cenas dos cartões de Hebraico na vida real (05/11/2026): o mapa do dia,
 * a placa de rua e o quadro do café. Sem letras: os cartões abrem para
 * qualquer aluno, e o que ele lê lá dentro segue a régua das letras. */

import type { ReactNode } from 'react';

export type CenaReal = 'dia' | 'rua' | 'cardapio' | 'corrida';

function cena(fundo: string, chao: string, y: number, conteudo: ReactNode) {
  return (
    <span aria-hidden className="hf-cena" style={{ background: fundo }}>
      <svg viewBox="0 0 240 118" preserveAspectRatio="xMidYMax meet">
        <rect x="-600" y={y} width="1440" height="60" fill={chao} />
        {conteudo}
      </svg>
    </span>
  );
}

export function CenaDaVidaReal({ tipo }: { tipo: CenaReal }) {
  if (tipo === 'dia') return cena('linear-gradient(var(--il-ceu), var(--il-ceu-2))', 'var(--il-colina-2)', 98, <>
    <circle cx="200" cy="28" r="14" fill="var(--il-sol)" />
    <path d="M30 96c30-30 60 10 90-20s60-10 90-30" stroke="#0E3B43" strokeWidth="3" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
    <g className="hf-flutua"><path d="M120 46a12 12 0 00-12 12c0 9 12 20 12 20s12-11 12-20a12 12 0 00-12-12z" fill="#C9443A" /><circle cx="120" cy="58" r="4.5" fill="#FBF9F5" /></g>
    <circle cx="30" cy="96" r="5" fill="#1F8A7D" /><circle cx="210" cy="46" r="5" fill="#1F8A7D" />
  </>);
  if (tipo === 'rua') return cena('linear-gradient(var(--il-ceu), var(--il-ceu-2))', 'var(--il-predio-2)', 100, <>
    <rect x="20" y="40" width="44" height="60" fill="var(--il-predio)" /><rect x="176" y="30" width="48" height="70" fill="var(--il-predio)" />
    <path d="M120 100V26" stroke="#3B4A4C" strokeWidth="4" />
    <g className="hf-flutua"><rect x="84" y="28" width="72" height="26" rx="5" fill="#1F5FA8" stroke="#fff" strokeWidth="2.5" />
      <path d="M96 41h40" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="92" y="60" width="56" height="22" rx="5" fill="#1F7A4D" stroke="#fff" strokeWidth="2.5" /><path d="M102 71h26M130 66l6 5-6 5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>
  </>);
  if (tipo === 'corrida') return cena('linear-gradient(#155059, #0E3B43)', '#0A2E34', 100, <>
    <path d="M-600 106h1440" stroke="#FBF9F5" strokeWidth="2" strokeDasharray="14 10" opacity=".5" />
    <g className="hf-flutua"><circle cx="120" cy="56" r="32" fill="none" stroke="rgba(251,249,245,.2)" strokeWidth="6" />
      <path d="M120 24a32 32 0 0128 47" fill="none" stroke="#E7B65A" strokeWidth="6" strokeLinecap="round" />
      <path d="M112 18h16M120 18v6M120 56l12-14" stroke="#FBF9F5" strokeWidth="3" strokeLinecap="round" /></g>
    <path d="M40 80h30M30 90h40M170 80h30M178 90h32" stroke="#8FD6C8" strokeWidth="3" strokeLinecap="round" opacity=".7" />
  </>);
  return cena('linear-gradient(#155059, #0E3B43)', '#0A2E34', 100, <>
    <g className="hf-flutua"><rect x="70" y="16" width="100" height="80" rx="6" fill="#8A5A36" /><rect x="76" y="22" width="88" height="68" rx="3" fill="#1D2925" />
      <path d="M86 36h30M86 50h40M86 64h26" stroke="#F1EDE2" strokeWidth="3" strokeLinecap="round" />
      <path d="M140 36h14M140 50h14M140 64h14" stroke="#E7B65A" strokeWidth="3" strokeLinecap="round" />
      <path d="M96 78c6 4 14 4 20 0" stroke="#F1EDE2" strokeWidth="2" fill="none" /></g>
    <path d="M190 70c0 8 16 8 16 0zM186 70h24" stroke="#FBF9F5" strokeWidth="2.5" fill="none" />
    <path d="M196 62c-3-4 3-6 0-10M202 62c-3-4 3-6 0-10" stroke="#FBF9F5" strokeWidth="2" fill="none" className="hf-flutua" />
  </>);
}

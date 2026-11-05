/* As cenas da loja de recompensas (05/11/2026, cartões ilustrados, parte 4).
 * O mesmo .hf-cena dos jogos: o dia de folga é a noite com a lua, a carta de
 * cultura é a carta lacrada sobre a pedra, o nome decorado é o quadro com o
 * brilho. Sem letras: nada aqui depende do que o aluno já aprendeu. */

import type { ReactNode } from 'react';

export type Recompensa = 'folga' | 'carta' | 'nome';

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

export function CenaDaRecompensa({ tipo }: { tipo: Recompensa }) {
  if (tipo === 'folga') return cena('linear-gradient(#2A4A50, #0E3B43)', '#155059', 96, <>
    <g fill="#FBF9F5" opacity=".7"><circle cx="30" cy="20" r="1.5" /><circle cx="80" cy="12" r="1" /><circle cx="110" cy="40" r="1" /><circle cx="210" cy="16" r="1" /></g>
    <g className="hf-flutua"><path d="M150 26a26 26 0 1020 40 22 22 0 01-20-40z" fill="#E7B65A" /></g>
    <path d="M0 90c40-14 80-14 120-4s80 8 120-2v28H0z" fill="#155059" />
    <path d="M56 90l-14-30h28z" fill="#3E5B3C" /><path d="M56 90v8" stroke="#7A5E43" strokeWidth="3" />
  </>);
  if (tipo === 'carta') return cena('linear-gradient(var(--il-ceu), var(--il-ceu-2))', 'var(--il-pedra-2)', 92, <>
    <path d="M0 88c40-10 80-10 120 0s80 6 120-2v30H0z" fill="var(--il-pedra-2)" />
    <g className="hf-flutua"><rect x="80" y="22" width="80" height="58" rx="6" fill="#FFFDF5" stroke="#B8862F" strokeWidth="2" />
      <path d="M92 38h56M92 50h40M92 62h48" stroke="#B8862F" strokeWidth="3" strokeLinecap="round" />
      <circle cx="148" cy="70" r="9" fill="#C9443A" /></g>
  </>);
  return cena('linear-gradient(var(--il-tarde), var(--il-tarde-2))', 'var(--il-montanha)', 98, <>
    <g className="hf-flutua"><rect x="84" y="18" width="72" height="74" rx="8" fill="#FBF9F5" stroke="#0E3B43" strokeWidth="3" />
      <rect x="94" y="28" width="52" height="54" rx="4" fill="none" stroke="#B8862F" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M108 55c6-12 18-12 24 0" stroke="#1F8A7D" strokeWidth="3" fill="none" strokeLinecap="round" /></g>
    <path d="M176 26l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM62 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FBF9F5" />
  </>);
}

/** O pergaminho das leituras bônus: dourado para o versículo, teal para o texto. */
export function PergaminhoBonus({ versiculo }: { versiculo: boolean }) {
  const cor = versiculo ? '#B8862F' : '#1F8A7D';
  return (
    <svg viewBox="0 0 46 52" aria-hidden className="hf-livro">
      <rect x="9" y="8" width="28" height="36" rx="3" fill="#FFFDF5" stroke={cor} strokeWidth="2" />
      <path d="M15 18h16M15 25h16M15 32h11" stroke={cor} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="5" y="4" width="36" height="7" rx="3.5" fill={cor} />
      <rect x="5" y="41" width="36" height="7" rx="3.5" fill={cor} />
    </svg>
  );
}

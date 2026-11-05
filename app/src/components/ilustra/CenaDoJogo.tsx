/* As cenas dos cartões de jogo (05/11/2026, cartões ilustrados aprovados pelo
 * dono). Uma cena por jogo, no estilo das ilustrações do site (céu, colinas,
 * mar, pedra; tokens --il-* de styles/tokens.css), com um elemento que flutua.
 *
 * As letras da cena saem de `letras`, as que o aluno JÁ aprendeu, nunca de
 * uma lista fixa: a regra do curso (nenhuma letra antes de ser ensinada) vale
 * também para o desenho. Com uma letra só, a cena repete a mesma. */

import type { ReactNode } from 'react';

export type JogoIlustrado = 'caca' | 'batalha' | 'cursiva' | 'match' | 'blast' | 'teste';

const HE = 'var(--font-he)';
const CURSIVA = 'var(--font-he-cursive)';

/* O símbolo hebraico de um assunto (os treinos por assunto da Academia) só
   com letras que o aluno já tem: o מַ de "Sílabas" vira a primeira letra dele,
   com a mesma vogal, enquanto o Mem não foi ensinado. */
export function simboloComLetrasDoAluno(simbolo: string, letras: readonly string[]): string {
  return simbolo.replace(/[\u05D0-\u05EA]/gu, c => (letras.includes(c) || !letras.length ? c : letras[0]!));
}

/** A letra `i` da lista, repetindo quando a lista é curta. */
const L = (letras: readonly string[], i: number) => letras[i % Math.max(letras.length, 1)] ?? 'א';

export function CenaDoJogo({ jogo, letras }: { jogo: JogoIlustrado; letras: readonly string[] }) {
  const a = L(letras, 0), b = L(letras, 1), c = L(letras, 2), d = L(letras, 3);
  const cena = (fundo: string, chao: { cor: string; y: number; opacity?: number }, conteudo: ReactNode) => (
    <span aria-hidden className="hf-cena" style={{ background: fundo }}>
      <svg viewBox="0 0 240 118" preserveAspectRatio="xMidYMax meet">
        <rect x="-600" y={chao.y} width="1440" height="60" fill={chao.cor} opacity={chao.opacity} />
        {conteudo}
      </svg>
    </span>
  );
  const ceu = 'linear-gradient(var(--il-ceu), var(--il-ceu-2))';

  switch (jogo) {
    case 'caca':
      return cena(ceu, { cor: 'var(--il-colina-2)', y: 100 }, <>
        <circle cx="200" cy="30" r="16" fill="var(--il-sol)" opacity=".85" />
        <path d="M0 92c40-18 80-18 120-6s80 10 120-4v36H0z" fill="var(--il-colina-2)" />
        <g fontFamily={HE} fontSize="22" fill="#0E3B43" opacity=".35">
          <text x="22" y="40">{b}</text><text x="60" y="66">{c}</text><text x="36" y="90">{d}</text><text x="150" y="82">{c}</text><text x="182" y="66">{b}</text>
        </g>
        <g className="hf-flutua">
          <text x="108" y="62" fontFamily={HE} fontSize="32" fill="#12665C" textAnchor="middle">{a}</text>
          <circle cx="108" cy="50" r="24" fill="none" stroke="#0E3B43" strokeWidth="5" />
          <path d="M125 67l18 18" stroke="#0E3B43" strokeWidth="7" strokeLinecap="round" />
        </g>
      </>);
    case 'batalha':
      return cena('linear-gradient(var(--il-tarde), var(--il-tarde-2))', { cor: 'var(--il-montanha)', y: 96 }, <>
        <g className="hf-flutua"><rect x="40" y="30" width="62" height="62" rx="14" fill="#FBF9F5" />
          <text x="71" y="76" fontFamily={HE} fontSize="38" fill="#0E3B43" textAnchor="middle">{a}</text></g>
        <g className="hf-flutua" style={{ animationDelay: '-2s' }}><rect x="138" y="30" width="62" height="62" rx="14" fill="#FBF9F5" />
          <text x="169" y="76" fontFamily={HE} fontSize="38" fill="#C9443A" textAnchor="middle">{b}</text></g>
        <path d="M112 50l8 10-8 10M128 50l-8 10 8 10" stroke="#0E3B43" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>);
    case 'cursiva':
      return cena('linear-gradient(var(--il-espuma), #CDE8E3)', { cor: 'var(--il-mar)', y: 98, opacity: 0.5 }, <>
        <g className="hf-flutua"><rect x="34" y="22" width="76" height="70" rx="10" fill="#FFFDF5" stroke="#E4E0D6" />
          <text x="72" y="72" fontFamily={HE} fontSize="38" fill="#0E3B43" textAnchor="middle">{a}</text></g>
        <g className="hf-flutua" style={{ animationDelay: '-1.5s' }}><rect x="130" y="22" width="76" height="70" rx="10" fill="#FFFDF5" stroke="#E4E0D6" />
          <text x="168" y="72" fontFamily={CURSIVA} fontSize="40" fill="#12665C" textAnchor="middle">{a}</text></g>
      </>);
    case 'match':
      return cena(ceu, { cor: 'var(--il-pedra-2)', y: 98 }, <>
        <g className="hf-flutua"><rect x="44" y="26" width="58" height="66" rx="10" fill="#FFFDF5" stroke="#B8862F" strokeWidth="2" />
          <text x="73" y="70" fontFamily={HE} fontSize="34" fill="#0E3B43" textAnchor="middle">{a}</text></g>
        <path d="M108 60c8-10 16-10 24 0" stroke="#1F8A7D" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="2 7" />
        <g className="hf-flutua" style={{ animationDelay: '-2s' }}><rect x="138" y="26" width="58" height="66" rx="10" fill="#FFFDF5" stroke="#B8862F" strokeWidth="2" />
          <path d="M152 60h4M160 50v20M166 44v32M172 52v16M178 58v4" stroke="#1F8A7D" strokeWidth="3.5" strokeLinecap="round" /></g>
      </>);
    case 'blast':
      return cena('linear-gradient(#2A4A50, #0E3B43)', { cor: '#155059', y: 98 }, <>
        <g fill="#FBF9F5" opacity=".6"><circle cx="30" cy="20" r="1.5" /><circle cx="70" cy="40" r="1" /><circle cx="190" cy="24" r="1.5" /><circle cx="214" cy="52" r="1" /></g>
        <g className="hf-flutua">
          <path d="M120 22v12M120 86v12M84 60h12M144 60h12M95 35l8 8M137 77l8 8M145 35l-8 8M103 77l-8 8" stroke="#E7B65A" strokeWidth="4" strokeLinecap="round" />
          <circle cx="120" cy="60" r="22" fill="#FBF9F5" />
          <text x="120" y="72" fontFamily={HE} fontSize="30" fill="#0E3B43" textAnchor="middle">{a}</text>
        </g>
      </>);
    case 'teste':
      return cena(ceu, { cor: 'var(--il-colina-1)', y: 98 }, <>
        <g className="hf-flutua"><rect x="84" y="16" width="72" height="84" rx="8" fill="#FFFDF5" stroke="#0E3B43" strokeWidth="2" />
          <rect x="106" y="10" width="28" height="12" rx="4" fill="#0E3B43" />
          <path d="M96 42l5 5 9-10M96 64l5 5 9-10M96 86l5 5 9-10" stroke="#1F8A7D" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M118 44h26M118 66h26M118 88h18" stroke="#B7A27C" strokeWidth="3" strokeLinecap="round" /></g>
      </>);
    default:
      return cena(ceu, { cor: 'var(--il-colina-2)', y: 100 }, null);
  }
}

/* As cenas dos cartões de jogo (05/11/2026, cartões ilustrados aprovados pelo
 * dono). Uma cena por jogo, no estilo das ilustrações do site (céu, colinas,
 * mar, pedra; tokens --il-* de styles/tokens.css), com um elemento que flutua.
 *
 * As letras da cena saem de `letras`, as que o aluno JÁ aprendeu, nunca de
 * uma lista fixa: a regra do curso (nenhuma letra antes de ser ensinada) vale
 * também para o desenho. Com uma letra só, a cena repete a mesma. */

import type { ReactNode } from 'react';

export type JogoIlustrado = 'caca' | 'batalha' | 'cursiva' | 'pomar' | 'montar' | 'ouvir' | 'match' | 'blast' | 'teste';

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
        {/* O Canhão de letras (05/11/2026): o canhão embaixo, mirando um alvo
            com uma letra do aluno; a bala a caminho. */}
        <g className="hf-flutua">
          <rect x="146" y="20" width="56" height="34" rx="17" fill="#FBF9F5" stroke="#E7B65A" strokeWidth="3" />
          <text x="174" y="46" fontFamily={HE} fontSize="24" fill="#0E3B43" textAnchor="middle">{a}</text>
        </g>
        <circle cx="146" cy="62" r="4" fill="#E7B65A" />
        <circle cx="134" cy="72" r="2.5" fill="#E7B65A" opacity=".6" />
        <g transform="rotate(38 112 96)"><rect x="104" y="58" width="16" height="40" rx="5" fill="#6B7B7D" /></g>
        <path d="M86 98a26 22 0 0152 0z" fill="#E7B65A" />
      </>);
    case 'teste':
      return cena(ceu, { cor: 'var(--il-colina-1)', y: 98 }, <>
        <g className="hf-flutua"><rect x="84" y="16" width="72" height="84" rx="8" fill="#FFFDF5" stroke="#0E3B43" strokeWidth="2" />
          <rect x="106" y="10" width="28" height="12" rx="4" fill="#0E3B43" />
          <path d="M96 42l5 5 9-10M96 64l5 5 9-10M96 86l5 5 9-10" stroke="#1F8A7D" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M118 44h26M118 66h26M118 88h18" stroke="#B7A27C" strokeWidth="3" strokeLinecap="round" /></g>
      </>);
    case 'pomar':
      return cena('linear-gradient(var(--il-tarde), var(--il-tarde-2))', { cor: 'var(--il-colina-2)', y: 98 }, <>
        <path d="M40 98V64M200 98V60" stroke="var(--il-tronco)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="40" cy="54" r="22" fill="var(--il-oliva)" /><circle cx="200" cy="50" r="24" fill="var(--il-oliva-2)" />
        <circle cx="32" cy="50" r="4" fill="#C9443A" /><circle cx="48" cy="60" r="4" fill="#E07B39" /><circle cx="194" cy="44" r="4" fill="#C9443A" /><circle cx="208" cy="56" r="4" fill="#E07B39" />
        <g className="hf-flutua">
          <circle cx="98" cy="62" r="13" fill="#C9443A" /><path d="M94 49l4-4 4 4z" fill="#9E2B1E" />
          <ellipse cx="122" cy="62" rx="9" ry="12" fill="#6D8A4E" />
          <circle cx="144" cy="62" r="12" fill="#E07B39" />
        </g>
      </>);
    case 'montar':
      /* Montar a palavra (06/11/2026): um muro de pedra de Jerusalém, e a
         última pedra, com uma letra do aluno, descendo para o lugar. */
      return cena(ceu, { cor: 'var(--il-colina-2)', y: 100 }, <>
        <g fill="#E8D5AB" stroke="#B78A5A" strokeWidth="2">
          <rect x="62" y="74" width="38" height="24" rx="3" /><rect x="100" y="74" width="38" height="24" rx="3" /><rect x="138" y="74" width="38" height="24" rx="3" />
          <rect x="81" y="50" width="38" height="24" rx="3" />
        </g>
        <g fontFamily={HE} fontSize="18" fill="#0E3B43" textAnchor="middle">
          <text x="157" y="92">{a}</text><text x="119" y="92">{b}</text><text x="81" y="92">{c}</text><text x="100" y="68">{d}</text>
        </g>
        <g className="hf-flutua"><rect x="122" y="18" width="38" height="24" rx="3" fill="#FBF9F5" stroke="#E7B65A" strokeWidth="2.5" />
          <text x="141" y="36" fontFamily={HE} fontSize="18" fill="#12665C" textAnchor="middle">{b}</text></g>
        <path d="M141 44v4" stroke="#E7B65A" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 3" />
      </>);
    case 'ouvir':
      /* Ouça e encontre (06/11/2026): um rádio antigo na janela, as ondas do
         som saindo, e uma letra do aluno escolhida entre as outras. */
      return cena('linear-gradient(var(--il-tarde), var(--il-tarde-2))', { cor: 'var(--il-colina-2)', y: 100 }, <>
        <rect x="26" y="54" width="62" height="44" rx="10" fill="#C98B49" />
        <circle cx="46" cy="76" r="12" fill="#8E5A3B" /><circle cx="46" cy="76" r="5" fill="#E8D5AB" />
        <rect x="64" y="66" width="16" height="4" rx="2" fill="#E8D5AB" /><rect x="64" y="76" width="16" height="4" rx="2" fill="#E8D5AB" />
        <path d="M70 54l10-14" stroke="#8E5A3B" strokeWidth="3" strokeLinecap="round" />
        <g className="hf-flutua" stroke="#FBF9F5" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".9">
          <path d="M98 64a12 12 0 010 20" /><path d="M108 56a24 24 0 010 36" />
        </g>
        <g fontFamily={HE} fontSize="22" textAnchor="middle">
          <rect x="132" y="32" width="40" height="34" rx="9" fill="#FBF9F5" opacity=".7" /><text x="152" y="57" fill="#0E3B43" opacity=".55">{b}</text>
          <rect x="180" y="32" width="40" height="34" rx="9" fill="#FBF9F5" opacity=".7" /><text x="200" y="57" fill="#0E3B43" opacity=".55">{c}</text>
          <rect x="180" y="70" width="40" height="28" rx="9" fill="#FBF9F5" opacity=".7" /><text x="200" y="91" fill="#0E3B43" opacity=".55">{d}</text>
        </g>
        <g className="hf-flutua" style={{ animationDelay: '-1.5s' }}>
          <rect x="132" y="70" width="40" height="28" rx="9" fill="#E4F1EE" stroke="#1F8A7D" strokeWidth="2.5" />
          <text x="152" y="91" fontFamily={HE} fontSize="22" fill="#12665C" textAnchor="middle">{a}</text>
        </g>
      </>);
    default:
      return cena(ceu, { cor: 'var(--il-colina-2)', y: 100 }, null);
  }
}

/* O livrinho das leituras (05/11/2026, cartões ilustrados, parte 3). Uma cor
 * por tipo de leitura, as mesmas nos dois temas: a Minha Primeira Leitura em
 * teal, o texto do módulo em dourado, a leitura de revisão em mar. Trancada,
 * o livro fica cinza. Decorativo: o título ao lado diz o que é. */

export type TipoDeLeitura = 'primeira' | 'texto' | 'revisao';

/** O tipo pelo id de lib/leituras-do-curso.ts (pl-, tx-, tx2-, rv-). */
export const tipoDaLeitura = (id: string): TipoDeLeitura =>
  id.startsWith('pl-') ? 'primeira' : id.startsWith('rv-') ? 'revisao' : 'texto';

const COR: Record<TipoDeLeitura, [string, string]> = {
  primeira: ['#1F8A7D', '#E4F1EE'],
  texto: ['#B8862F', '#F7EFDF'],
  revisao: ['#3F9A9C', '#EAF7F3']
};

export function LivroDaLeitura({ tipo, trancado = false }: { tipo: TipoDeLeitura; trancado?: boolean }) {
  const [capa, folha] = trancado ? ['#A8AFAB', '#F3F0E9'] : COR[tipo];
  return (
    <svg viewBox="0 0 46 56" aria-hidden className="hf-livro">
      <path d="M6 6h28a6 6 0 016 6v38H12a6 6 0 01-6-6z" fill={capa} />
      <path d="M6 44a6 6 0 016-6h28v12H12a6 6 0 01-6-6z" fill={folha} />
      {!trancado && tipo === 'primeira' && <path d="M15 18h16M15 25h12M15 32h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />}
      {!trancado && tipo === 'texto' && <path d="M14 18c6 4 12-4 18 0M14 26c6 4 12-4 18 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      {!trancado && tipo === 'revisao' && <path d="M17 26a7 7 0 1112 5M29 31l-1-4M29 31l-4 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {trancado && <path d="M19 23v-3a4 4 0 018 0v3M16 23h14v10H16z" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinejoin="round" />}
    </svg>
  );
}

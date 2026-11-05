/* Uma placa de rua desenhada (05/11/2026, Um dia em Israel; aprovada pelo
 * dono no protótipo). O estilo vem do `tipo` (globals.css, .hf-placa-*) e o
 * ícone pequeno da chave `icone`; o jogo esconde o ícone e deixa só o
 * hebraico. A placa pendura num poste e balança ao chegar. */

import type { PlacaDesenhada as Placa } from '@/lib/engine/um-dia';

const ICONE: Record<string, string> = {
  entrar: 'M10 4h8v16h-8M4 12h10M10 8l4 4-4 4',
  sair: 'M14 4H6v16h8M10 12h10M16 8l4 4-4 4',
  farmacia: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  banheiro: 'M7 3a2 2 0 110 4 2 2 0 010-4zM5 9h4l1 6H8v6M6 15v6M17 3a2 2 0 110 4 2 2 0 010-4zM14 9h6l-1 6h-4zM16 15v6M18 15v6',
  carro: 'M4 15l2-6h12l2 6v4H4zM4 15h16',
  onibus: 'M7 3h10a2 2 0 012 2v13H5V5a2 2 0 012-2zM5 11h14M8 18v3M16 18v3',
  praia: 'M3 18c3-2 6 2 9 0s6 2 9 0M12 4v10M5 9c2-4 12-4 14 0z',
  hospital: 'M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zM12 8v8M8 12h8',
  policia: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4',
  dinheiro: 'M5 7h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zM12 9.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z',
  elevador: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 9l3-3 3 3M9 15l3 3 3-3',
  carrinho: 'M3 4h3l3 11h10l2-8H7M10 19a1.5 1.5 0 100 .1M17 19a1.5 1.5 0 100 .1',
  aberto: 'M12 4a8 8 0 110 16 8 8 0 010-16zM8 12l3 3 5-6',
  fechado: 'M12 4a8 8 0 110 16 8 8 0 010-16zM9 9l6 6M15 9l-6 6',
  mao: 'M8 13V6a1.5 1.5 0 013 0v5V4.5a1.5 1.5 0 013 0V11V6a1.5 1.5 0 013 0v8c0 4-3 7-6 7s-5-2-6-4l-2-4a1.5 1.5 0 012.5-1.5z',
  cigarro: 'M12 3a9 9 0 110 18 9 9 0 010-18zM3 14h14v4H3zM5 5l14 14',
  atencao: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  rua: 'M4 20L9 4M20 20L15 4M12 6v2M12 11v2M12 16v2'
};

export const temIcone = (chave: string) => chave in ICONE;

export function PlacaDesenhada({ placa, texto, comIcone }: { placa: Placa; texto: string; comIcone: boolean }) {
  return (
    <span className={`hf-placa hf-placa-${placa.tipo}`}>
      {comIcone && ICONE[placa.icone] && (
        <svg viewBox="0 0 24 24" aria-hidden className="hf-placa-icone"><path d={ICONE[placa.icone]} /></svg>
      )}
      <span lang="he" dir="rtl" className="hf-placa-texto">{texto}</span>
    </span>
  );
}

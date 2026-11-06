'use client';

/* O Pomar com a escolha do que treinar (05/11/2026, pedido do dono): primeiro
 * o tema (letras, sons, palavras ou leitura), depois o jogo com as perguntas
 * dele. "Trocar o tema" volta à escolha. */

import { useState } from 'react';
import type { ResultadoJogo } from './Match';
import { EscolhaDeTema } from './EscolhaDeTema';
import { Pomar } from './Pomar';
import type { PerguntaDoPomar } from '@/lib/engine/pomar';
import { TEMAS, type Tema } from '@/lib/engine/temas';
import { stripNikud } from '@/lib/hebrew';
import { tx } from '@/i18n/telas/temas';

export function PomarComTemas({ temas, onFim }: { temas: Record<Tema, PerguntaDoPomar[]>; onFim: (r: ResultadoJogo) => void }) {
  const [tema, setTema] = useState<Tema | null>(null);
  if (!tema) {
    const simbolos: Partial<Record<Tema, string>> = {};
    for (const t of TEMAS) {
      const q = temas[t][0];
      if (q) simbolos[t] = q.comPontos ? q.he : stripNikud(q.he);
    }
    return <div className="hf-pomar"><EscolhaDeTema simbolos={simbolos} onEscolher={setTema} escuro /></div>;
  }
  return (
    <div className="grid gap-2">
      <button type="button" onClick={() => setTema(null)} className="justify-self-start min-h-[44px] font-ui text-[14px] font-semibold text-[var(--teal-ink)] underline">{tx.trocar}</button>
      <Pomar key={tema} perguntas={temas[tema]} tema={tema} onFim={onFim} />
    </div>
  );
}

'use client';

/* A escolha do que treinar (05/11/2026, pedido do dono), antes do Pomar das
 * palavras e da Corrida das palavras: letras, sons, palavras ou leitura. Um
 * tema sem perguntas bastantes aparece fechado, com o motivo. O símbolo de
 * cada tema é o hebraico da primeira pergunta dele, que o aluno já lê: nenhuma
 * letra aparece antes de ser ensinada, nem no enfeite. */

import { TEMAS, type Tema } from '@/lib/engine/temas';
import { textoDoTema, tx } from '@/i18n/telas/temas';

import { IconeCadeado } from '@/components/shell/NavIcons';

/** `simbolos`: o hebraico que representa cada tema aberto; o tema sem símbolo está fechado. */
export function EscolhaDeTema({ simbolos, onEscolher, escuro = false }: {
  simbolos: Partial<Record<Tema, string>>; onEscolher: (t: Tema) => void; escuro?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <p className={`m-0 font-display text-[19px] font-bold ${escuro ? 'text-[#FBF9F5]' : 'text-ink'}`}>{tx.escolha}</p>
      <ul className="grid gap-2.5 sm:grid-cols-2 list-none m-0 p-0">
        {TEMAS.map(t => {
          const { nome, desc } = textoDoTema(t);
          const simbolo = simbolos[t];
          const aberto = !!simbolo;
          return (
            <li key={t}>
              <button type="button" disabled={!aberto} onClick={() => onEscolher(t)}
                      className={`hf-tema ${escuro ? 'hf-tema-escuro' : ''}`}>
                <span lang="he" dir="rtl" aria-hidden className="hf-tema-simbolo">{simbolo ?? <IconeCadeado size={18} />}</span>
                <span className="grid gap-0.5 text-start">
                  <span className="font-display text-[17px] font-semibold">{nome}</span>
                  <span className="font-ui text-[13.5px] leading-snug opacity-80">{aberto ? desc : tx.fechado}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

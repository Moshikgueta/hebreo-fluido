import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* components/game/Blast.tsx: o Canhão de letras. */
const pt = {
  elogio3: '3 acertos seguidos!',
  elogio5: 'Você está pegando o jeito!',
  elogio8: '8 seguidos - isso é leitura automática.',
  elogio12: 'Doze. Pode parar quando quiser, você já provou.',
  seguidos: (n: number) => `${n} seguidos`,
  acertos: (n: number) => `${n} acertos`,
  perguntaDe: (n: number, total: number) => `Pergunta ${n} de ${total}`,
  boa: 'Boa!',
  mire: 'Toque no alvo certo para atirar.',
  alvo: (n: number, texto: string) => `Alvo ${n}: ${texto}`,
  quase: (resposta: ReactNode): ReactNode => <>Quase. A resposta era {resposta}.</>
} as const;

const en: Traducao<typeof pt> = {
  elogio3: '3 right in a row!',
  elogio5: 'You are getting the hang of it!',
  elogio8: '8 in a row - that is automatic reading.',
  elogio12: 'Twelve. Stop whenever you like, you have proved it.',
  seguidos: n => `${n} in a row`,
  acertos: n => `${n} right`,
  perguntaDe: (n, total) => `Question ${n} of ${total}`,
  boa: 'Nice!',
  mire: 'Tap the right target to fire.',
  alvo: (n, texto) => `Target ${n}: ${texto}`,
  quase: resposta => <>Almost. The answer was {resposta}.</>
};

const es: Traducao<typeof pt> = {
  elogio3: '¡3 aciertos seguidos!',
  elogio5: '¡Le estás agarrando la mano!',
  elogio8: '8 seguidos - eso es lectura automática.',
  elogio12: 'Doce. Puedes parar cuando quieras, ya lo demostraste.',
  seguidos: n => `${n} seguidos`,
  acertos: n => `${n} aciertos`,
  perguntaDe: (n, total) => `Pregunta ${n} de ${total}`,
  boa: '¡Bien!',
  mire: 'Toca el blanco correcto para disparar.',
  alvo: (n, texto) => `Blanco ${n}: ${texto}`,
  quase: resposta => <>Casi. La respuesta era {resposta}.</>
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

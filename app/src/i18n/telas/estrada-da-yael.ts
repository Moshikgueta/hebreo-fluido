import type { Traducao } from '..';

/* A estrada do curso (06/11/2026): o cartão de cada estação e as faixas dos
 * módulos. components/aventura/EstradaDoModulo.tsx e estrada-do-modulo.ts. */
const pt = {
  licaoFeita: 'Concluída. Pode revisar quando quiser.',
  licaoNova: 'Uma lição nova.',
  etapas: (n: number, total: number) => `${n} de ${total} etapas`,
  abreDepoisDe: (nome: string) => `Abre depois de ${nome}.`,
  comecar: 'Começar',
  continuar: 'Continuar',
  revisar: 'Revisar',
  abrir: 'Abrir',
  fazer: 'Fazer o checkpoint',
  refazer: 'Fazer de novo',
  lerDeNovo: 'Ler de novo',
  lida: 'Lida. Pode ler de novo quando quiser.',
  naPaginaDoModulo: 'Está na página do módulo.',
  aprovadoCom: (nota: number | null) => (nota != null ? `Aprovado com ${nota}%.` : 'Aprovado.'),
  checkpointPronto: 'As lições do módulo estão feitas: é a hora do checkpoint.',
  checkpointDepois: 'Melhor depois das lições do módulo.',
  fechar: 'Fechar',
  feito: (pct: number) => `${pct}% feito`,
  moduloN: (n: number) => `Módulo ${n}`
} as const;

const en: Traducao<typeof pt> = {
  licaoFeita: 'Done. You can review it whenever you like.',
  licaoNova: 'A new lesson.',
  etapas: (n, total) => `${n} of ${total} steps`,
  abreDepoisDe: nome => `Opens after ${nome}.`,
  comecar: 'Start',
  continuar: 'Continue',
  revisar: 'Review',
  abrir: 'Open',
  fazer: 'Take the checkpoint',
  refazer: 'Take it again',
  lerDeNovo: 'Read again',
  lida: 'Read. You can read it again whenever you like.',
  naPaginaDoModulo: 'It is on the module page.',
  aprovadoCom: nota => (nota != null ? `Passed with ${nota}%.` : 'Passed.'),
  checkpointPronto: 'The module lessons are done: time for the checkpoint.',
  checkpointDepois: 'Best after the module lessons.',
  fechar: 'Close',
  feito: pct => `${pct}% done`,
  moduloN: n => `Module ${n}`
};

const es: Traducao<typeof pt> = {
  licaoFeita: 'Completada. Puedes repasarla cuando quieras.',
  licaoNova: 'Una lección nueva.',
  etapas: (n, total) => `${n} de ${total} etapas`,
  abreDepoisDe: nome => `Se abre después de ${nome}.`,
  comecar: 'Empezar',
  continuar: 'Continuar',
  revisar: 'Repasar',
  abrir: 'Abrir',
  fazer: 'Hacer el checkpoint',
  refazer: 'Hacerlo de nuevo',
  lerDeNovo: 'Leer de nuevo',
  lida: 'Leída. Puedes leerla de nuevo cuando quieras.',
  naPaginaDoModulo: 'Está en la página del módulo.',
  aprovadoCom: nota => (nota != null ? `Aprobado con ${nota}%.` : 'Aprobado.'),
  checkpointPronto: 'Las lecciones del módulo están hechas: es la hora del checkpoint.',
  checkpointDepois: 'Mejor después de las lecciones del módulo.',
  fechar: 'Cerrar',
  feito: pct => `${pct}% hecho`,
  moduloN: n => `Módulo ${n}`
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

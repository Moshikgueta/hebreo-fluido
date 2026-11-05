import type { Traducao } from '..';

/* app/leituras/LeiturasClient.tsx e app/leituras/page.tsx */
const pt = {
  metaTitulo: 'Leituras - Hebraico Fluente',
  metaDescricao: 'Os exercícios de leitura do curso num lugar só: o laboratório, a Primeira Leitura, os mini-textos e as leituras de revisão.',

  titulo: 'Leituras',
  intro: 'Todos os exercícios de leitura do curso num lugar só, módulo por módulo. Cada um usa só as letras que você já aprendeu naquele ponto.',
  rua: 'Hebraico na rua',
  ruaDesc: 'Placas de verdade de Israel, com palavras que você já lê.',
  umDia: 'Um dia em Israel',
  umDiaDesc: 'Um mapa do dia, parada por parada: placas, trem, café, shuk e mais.',
  cardapios: 'Ler cardápios',
  cardapiosDesc: 'O quadro de um café em Israel: pratos, bebidas e nomes internacionais, sem nikud. Abre com as 22 letras.',
  laboratorio: 'Laboratório de leitura',
  laboratorioDesc: 'Uma palavra por vez, com a ajuda que você escolher.',
  abrir: 'Abrir',
  modulo: (n: number, titulo: string) => `Módulo ${n} · ${titulo}`,
  primeira: 'Minha Primeira Leitura',
  primeiraDesc: 'Palavras do módulo para você ler sozinho e depois conferir.',
  primeiraDepois: 'Abre quando você concluir as letras do módulo.',
  texto: (tipo: string) => `Mini-texto · ${tipo}`,
  revisao: 'Leitura de revisão',
  revisaoDesc: 'Um texto só com palavras que você já acumulou.',
  feito: 'Feito',
  depoisDoModulo: (n: number) => `Chega com o módulo ${n}.`,
  abreDepoisDeLer: (n: number) => `Abre aqui depois que você ler no módulo ${n}, no lugar dele no curso.`,
  nenhumaAinda: 'As leituras deste módulo aparecem quando os textos forem revisados.',
  bonus: 'Leituras bônus',
  bonusDesc: 'Textos bíblicos para trocar por XP em Recompensas.',
  feitas: (n: number, total: number) => `${n} de ${total} feitas`
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Readings - Hebrew Unlocked',
  metaDescricao: 'All the reading exercises of the course in one place: the lab, the First Reading, the short texts and the review readings.',

  titulo: 'Readings',
  intro: 'Every reading exercise of the course in one place, module by module. Each one uses only the letters you have already learned at that point.',
  rua: 'Hebrew on the street',
  ruaDesc: 'Real signs from Israel, with words you can already read.',
  umDia: 'A day in Israel',
  umDiaDesc: 'A map of the day, stop by stop: signs, train, coffee shop, market and more.',
  cardapios: 'Reading menus',
  cardapiosDesc: 'The board of a coffee shop in Israel: dishes, drinks and international names, without nikud. Opens with the 22 letters.',
  laboratorio: 'Reading lab',
  laboratorioDesc: 'One word at a time, with the help you choose.',
  abrir: 'Open',
  modulo: (n: number, titulo: string) => `Module ${n} · ${titulo}`,
  primeira: 'My First Reading',
  primeiraDesc: 'Words from the module for you to read on your own and then check.',
  primeiraDepois: 'Opens when you complete the letters of the module.',
  texto: (tipo: string) => `Short text · ${tipo}`,
  revisao: 'Review reading',
  revisaoDesc: 'A text made only of words you have already collected.',
  feito: 'Done',
  depoisDoModulo: (n: number) => `Comes with module ${n}.`,
  abreDepoisDeLer: (n: number) => `Opens here after you read it in module ${n}, at its place in the course.`,
  nenhumaAinda: 'The readings of this module appear once the texts are reviewed.',
  bonus: 'Bonus readings',
  bonusDesc: 'Biblical texts to trade for XP in Rewards.',
  feitas: (n: number, total: number) => `${n} of ${total} done`
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Lecturas - Hebraico Fluente',
  metaDescricao: 'Los ejercicios de lectura del curso en un solo lugar: el laboratorio, la Primera Lectura, los textos breves y las lecturas de repaso.',

  titulo: 'Lecturas',
  intro: 'Todos los ejercicios de lectura del curso en un solo lugar, módulo por módulo. Cada uno usa solo las letras que ya aprendiste hasta ese punto.',
  rua: 'Hebreo en la calle',
  ruaDesc: 'Carteles reales de Israel, con palabras que ya lees.',
  umDia: 'Un día en Israel',
  umDiaDesc: 'Un mapa del día, parada por parada: carteles, tren, café, shuk y más.',
  cardapios: 'Leer menús',
  cardapiosDesc: 'La pizarra de un café en Israel: platos, bebidas y nombres internacionales, sin nikud. Se abre con las 22 letras.',
  laboratorio: 'Laboratorio de lectura',
  laboratorioDesc: 'Una palabra a la vez, con la ayuda que elijas.',
  abrir: 'Abrir',
  modulo: (n: number, titulo: string) => `Módulo ${n} · ${titulo}`,
  primeira: 'Mi Primera Lectura',
  primeiraDesc: 'Palabras del módulo para que las leas por tu cuenta y después compruebes.',
  primeiraDepois: 'Se abre cuando termines las letras del módulo.',
  texto: (tipo: string) => `Texto breve · ${tipo}`,
  revisao: 'Lectura de repaso',
  revisaoDesc: 'Un texto hecho solo con palabras que ya acumulaste.',
  feito: 'Hecho',
  depoisDoModulo: (n: number) => `Llega con el módulo ${n}.`,
  abreDepoisDeLer: (n: number) => `Se abre aquí después de que lo leas en el módulo ${n}, en su lugar del curso.`,
  nenhumaAinda: 'Las lecturas de este módulo aparecen cuando los textos estén revisados.',
  bonus: 'Lecturas extra',
  bonusDesc: 'Textos bíblicos para canjear por XP en Recompensas.',
  feitas: (n: number, total: number) => `${n} de ${total} hechas`
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

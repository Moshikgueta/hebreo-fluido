import type { Traducao } from '..';

/* app/vocabulario/VocabularioClient.tsx e app/vocabulario/page.tsx */
const pt = {
  metaTitulo: 'Meu vocabulário - Hebraico Fluente',
  metaDescricao: 'As palavras em hebraico que você já consegue ler com as letras que aprendeu.',

  meuVocabulario: 'Meu vocabulário',
  intro: (letras: number, faltam: number) =>
    `São as palavras do curso escritas só com as ${letras} letras que você já concluiu.` +
    (faltam > 0 ? ` Mais ${faltam} chegam com as próximas letras.` : ' É o vocabulário inteiro do curso.'),
  praticarAMao: 'Praticar estas palavras à mão, em cursiva',
  praticarLeitura: 'Pratique a leitura destas palavras no Laboratório de Leitura.',
  procurar: 'Procurar',
  placeholder: 'em hebraico, transliteração ou português',
  achadas: (achadas: number, total: number) => `${achadas} de ${total}`,
  nPalavras: (n: number) => `${n} palavras`,
  vazio: 'Conclua a lição do Mem e a primeira palavra aparece aqui.',
  irCurso: 'Ir para o curso',
  palavras: 'Palavras',
  ouvir: (translit: string) => `Ouvir ${translit}`,
  letrasDaPalavra: 'As letras desta palavra',
  letras: 'Letras',
  aMao: 'À mão',
  porNoCaderno: (translit: string) => `Guardar ${translit} no meu caderno`,
  tirarDoCaderno: (translit: string) => `Tirar ${translit} do meu caderno`,
  soOCaderno: (n: number) => `Só o meu caderno (${n})`,
  treinarCaderno: 'Treinar as palavras do meu caderno',
  cadernoDica: 'Toque na estrela de uma palavra para guardar no seu caderno e treinar só as guardadas.',
  cadernoVazio: 'Nenhuma palavra guardada ainda. Toque na estrela de uma palavra para guardar.',
  nenhuma: (busca: string) =>
    `Nenhuma palavra que você já lê tem “${busca}”. A palavra pode usar uma letra que ainda vem pela frente.`
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'My vocabulary - Hebrew Unlocked',
  metaDescricao: 'The Hebrew words you can already read with the letters you have learned.',

  meuVocabulario: 'My vocabulary',
  intro: (letras, faltam) =>
    `These are the course words written only with the ${letras} letters you have already finished.` +
    (faltam > 0 ? ` ${faltam} more come with the next letters.` : ' This is the whole course vocabulary.'),
  praticarAMao: 'Practice these words by hand, in cursive',
  praticarLeitura: 'Practice reading these words in the Reading Lab.',
  procurar: 'Search',
  placeholder: 'in Hebrew, transliteration or English',
  achadas: (achadas, total) => `${achadas} of ${total}`,
  nPalavras: n => `${n} words`,
  vazio: 'Finish the Mem lesson and the first word shows up here.',
  irCurso: 'Go to the course',
  palavras: 'Words',
  ouvir: translit => `Listen to ${translit}`,
  letrasDaPalavra: 'The letters of this word',
  letras: 'Letters',
  aMao: 'By hand',
  porNoCaderno: translit => `Save ${translit} to my notebook`,
  tirarDoCaderno: translit => `Remove ${translit} from my notebook`,
  soOCaderno: n => `Only my notebook (${n})`,
  treinarCaderno: 'Practice the words in my notebook',
  cadernoDica: 'Tap the star on a word to save it to your notebook and practice only the saved ones.',
  cadernoVazio: 'No words saved yet. Tap the star on a word to save it.',
  nenhuma: busca =>
    `None of the words you can read has “${busca}”. The word may use a letter that is still ahead.`
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Mi vocabulario - Hebreo Fluido',
  metaDescricao: 'Las palabras en hebreo que ya puedes leer con las letras que aprendiste.',

  meuVocabulario: 'Mi vocabulario',
  intro: (letras, faltam) =>
    `Son las palabras del curso escritas solo con las ${letras} letras que ya terminaste.` +
    (faltam > 0 ? ` Llegan ${faltam} más con las próximas letras.` : ' Es el vocabulario entero del curso.'),
  praticarAMao: 'Practicar estas palabras a mano, en cursiva',
  praticarLeitura: 'Practica la lectura de estas palabras en el Laboratorio de Lectura.',
  procurar: 'Buscar',
  placeholder: 'en hebreo, transliteración o español',
  achadas: (achadas, total) => `${achadas} de ${total}`,
  nPalavras: n => `${n} palabras`,
  vazio: 'Termina la lección de la Mem y la primera palabra aparece aquí.',
  irCurso: 'Ir al curso',
  palavras: 'Palabras',
  ouvir: translit => `Escuchar ${translit}`,
  letrasDaPalavra: 'Las letras de esta palabra',
  letras: 'Letras',
  aMao: 'A mano',
  porNoCaderno: translit => `Guardar ${translit} en mi cuaderno`,
  tirarDoCaderno: translit => `Quitar ${translit} de mi cuaderno`,
  soOCaderno: n => `Solo mi cuaderno (${n})`,
  treinarCaderno: 'Entrenar las palabras de mi cuaderno',
  cadernoDica: 'Toca la estrella de una palabra para guardarla en tu cuaderno y entrenar solo las guardadas.',
  cadernoVazio: 'Todavía no hay palabras guardadas. Toca la estrella de una palabra para guardarla.',
  nenhuma: busca =>
    `Ninguna palabra que ya lees tiene “${busca}”. La palabra puede usar una letra que todavía está por venir.`
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

import type { Traducao } from '..';

/* O que treinar (05/11/2026): a escolha de tema do Pomar das palavras e da
 * Corrida das palavras (lib/engine/temas.ts, components/game/EscolhaDeTema.tsx). */
const pt = {
  escolha: 'O que você quer treinar?',
  letras: 'Letras',
  letrasDesc: 'A letra sozinha: qual é o nome dela?',
  sons: 'Sons',
  sonsDesc: 'A sílaba com os pontos: como ela soa?',
  palavras: 'Palavras',
  palavrasDesc: 'A palavra sem os pontos: o que quer dizer?',
  leitura: 'Leitura',
  leituraDesc: 'A palavra com os pontos: como se lê?',
  fechado: 'Abre com mais letras',
  perguntaLetras: 'Que letra é esta?',
  perguntaSons: 'Como soa?',
  perguntaPalavras: 'O que quer dizer?',
  perguntaLeitura: 'Como se lê?',
  trocar: 'Trocar o tema',
  itemN: (i: number, total: number) => `${i} de ${total}`
} as const;

const en: Traducao<typeof pt> = {
  escolha: 'What do you want to practice?',
  letras: 'Letters',
  letrasDesc: 'The letter on its own: what is its name?',
  sons: 'Sounds',
  sonsDesc: 'The syllable with the points: how does it sound?',
  palavras: 'Words',
  palavrasDesc: 'The word without the points: what does it mean?',
  leitura: 'Reading',
  leituraDesc: 'The word with the points: how is it read?',
  fechado: 'Opens with more letters',
  perguntaLetras: 'Which letter is this?',
  perguntaSons: 'How does it sound?',
  perguntaPalavras: 'What does it mean?',
  perguntaLeitura: 'How is it read?',
  trocar: 'Change the topic',
  itemN: (i, total) => `${i} of ${total}`
};

const es: Traducao<typeof pt> = {
  escolha: '¿Qué quieres practicar?',
  letras: 'Letras',
  letrasDesc: 'La letra sola: ¿cómo se llama?',
  sons: 'Sonidos',
  sonsDesc: 'La sílaba con los puntos: ¿cómo suena?',
  palavras: 'Palabras',
  palavrasDesc: 'La palabra sin los puntos: ¿qué significa?',
  leitura: 'Lectura',
  leituraDesc: 'La palabra con los puntos: ¿cómo se lee?',
  fechado: 'Se abre con más letras',
  perguntaLetras: '¿Qué letra es esta?',
  perguntaSons: '¿Cómo suena?',
  perguntaPalavras: '¿Qué significa?',
  perguntaLeitura: '¿Cómo se lee?',
  trocar: 'Cambiar el tema',
  itemN: (i, total) => `${i} de ${total}`
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

/** O nome, a frase e a pergunta de cada tema (chaves planas, por causa do Traducao). */
export const textoDoTema = (t: 'letras' | 'sons' | 'palavras' | 'leitura') => ({
  nome: tx[t],
  desc: tx[`${t}Desc` as const],
  pergunta: tx[`pergunta${t[0]!.toUpperCase()}${t.slice(1)}` as 'perguntaLetras']
});

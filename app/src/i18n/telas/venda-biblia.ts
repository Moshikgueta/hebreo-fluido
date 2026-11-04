import type { Traducao } from '..';

/* app/biblia/page.tsx */
const pt = {
  metaTitulo: 'Vou conseguir ler a Bíblia em hebraico? - Hebraico Fluente',
  metaDescricao:
    'Sim, você vai ler o texto em voz alta; não, não vai entender sem vocabulário e gramática. ' +
    'Gênesis 1:1, palavra por palavra, para você julgar.',
  trilha: 'Ler a Bíblia',
  eyebrow: 'A pergunta que mais chega',
  titulo: 'Vou conseguir ler a Bíblia em hebraico?',
  lead: 'A resposta tem duas metades, e as duas importam.',

  respostaEyebrow: 'A resposta curta',
  respostaTitulo: 'Sim para ler. Não para entender.',
  respostaLead: 'São duas habilidades diferentes, e confundir as duas é o que faz alguém comprar um curso de alfabetização achando que comprou um curso de língua.',
  sim: 'Sim.',
  simTitulo: 'Você vai ler em voz alta.',
  simTexto: 'O texto hebraico da Bíblia usado hoje vem com os sinais de vogal - o nikud que os massoretas de Tiberíades fixaram para registrar a pronúncia. São exatamente as 22 letras e os sinais que este curso ensina. Com eles você decodifica qualquer versículo, sem transliteração e sem ajuda.',
  nao: 'Não.',
  naoTitulo: 'Você não vai entender o que leu.',
  naoTexto: 'Entender pede vocabulário e gramática, e o hebraico da Bíblia tem construções que o hebraico de hoje não usa. Este é um curso de alfabetização: ele te dá a porta, não a casa. Quem promete a casa em oito semanas está vendendo outra coisa.',

  versiculoEyebrow: 'Veja por si',
  versiculoTitulo: 'As sete primeiras palavras da Bíblia hebraica.',
  versiculoLead: 'Toque em qualquer uma. Você vai ver as duas metades da resposta no mesmo lugar: como ela se lê, e o que ela quer dizer - que é a parte que alguém precisou trazer.',
  legivel: (letra: number, total: number, licao: number | null, licoes: number) =>
    `Todas as letras deste versículo são ensinadas até a letra ${letra} das ${total}${licao !== null ? ` (lição ${licao} das ${licoes})` : ''}. Ou seja: ele fica legível antes de o curso acabar, e não no fim dele.`,

  mudaEyebrow: 'Mesmo assim',
  mudaTitulo: 'O que muda quando você lê as letras.',
  mudaLead: 'Decodificar sem entender parece pouco escrito assim. Na prática é a diferença entre depender inteiramente de uma tradução e poder conferir.',
  originalT: 'Você acompanha o original',
  originalB: 'Uma Bíblia interlinear ou com o hebraico ao lado deixa de ser decoração na página. Você segue a linha em vez de pular para a coluna em português.',
  lexicoT: 'Você procura no léxico',
  lexicoB: 'Dicionários, léxicos e concordâncias de hebraico são organizados pelo alfabeto hebraico. Sem as letras você não acha a palavra; com elas, acha.',
  traducaoT: 'Você confere uma tradução',
  traducaoB: 'Quando duas versões discordam num versículo, a discordância está numa palavra. Saber ler é o que permite ir olhar essa palavra.',
  reconheceT: 'Você reconhece o que já conhece',
  reconheceB: 'Nomes, lugares e palavras que você ouve a vida inteira param de ser som e viram texto - a começar por esta, na terceira posição do versículo acima.',

  roloEyebrow: 'Uma coisa que ninguém avisa',
  roloTitulo: 'Num rolo de Torá não há um único ponto de vogal.',
  roloLead: 'Os sinais são uma invenção posterior, feita para registrar a pronúncia. O rolo lido na sinagoga não os tem, e a Israel de hoje escreve sem eles também.',
  comPontos: 'Com os pontos, numa Bíblia impressa',
  semPontos: 'Sem os pontos, como está no rolo',
  mesmaLinha: 'É a mesma linha. Por isso o curso não termina no nikud: o módulo 6 fecha com uma etapa inteira de leitura sem os pontos, que é a forma em que o hebraico existe na rua, no jornal e no rolo.',

  ctaTitulo: 'A porta primeiro.',
  ctaLinha: 'As 22 letras, sem transliteração no fim. A primeira leva dez minutos e responde melhor do que esta página.'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Will I be able to read the Bible in Hebrew? - Hebrew Unlocked',
  metaDescricao:
    'Yes, you will read the text aloud; no, you will not understand it without vocabulary and grammar. ' +
    'Genesis 1:1, word by word, so you can judge.',
  trilha: 'Reading the Bible',
  eyebrow: 'The question we get most',
  titulo: 'Will I be able to read the Bible in Hebrew?',
  lead: 'The answer has two halves, and both matter.',

  respostaEyebrow: 'The short answer',
  respostaTitulo: 'Yes to reading. No to understanding.',
  respostaLead: 'They are two different skills, and mixing them up is what makes someone buy a learn-to-read course thinking they bought a language course.',
  sim: 'Yes.',
  simTitulo: 'You will read aloud.',
  simTexto: 'The Hebrew text of the Bible used today comes with the vowel signs - the nikud that the Masoretes of Tiberias set down to record the pronunciation. They are exactly the 22 letters and the signs this course teaches. With them you can decode any verse, without transliteration and without help.',
  nao: 'No.',
  naoTitulo: 'You will not understand what you read.',
  naoTexto: 'Understanding takes vocabulary and grammar, and biblical Hebrew has constructions that today\'s Hebrew does not use. This is a learn-to-read course: it gives you the door, not the house. Anyone promising the house in eight weeks is selling something else.',

  versiculoEyebrow: 'See for yourself',
  versiculoTitulo: 'The first seven words of the Hebrew Bible.',
  versiculoLead: 'Tap any of them. You will see both halves of the answer in the same place: how it reads, and what it means - which is the part someone had to bring to you.',
  legivel: (letra: number, total: number, licao: number | null, licoes: number) =>
    `Every letter in this verse is taught by letter ${letra} of ${total}${licao !== null ? ` (lesson ${licao} of ${licoes})` : ''}. In other words: it becomes readable before the course ends, not at the end of it.`,

  mudaEyebrow: 'Even so',
  mudaTitulo: 'What changes when you can read the letters.',
  mudaLead: 'Decoding without understanding sounds like little when written like this. In practice it is the difference between depending entirely on a translation and being able to check it.',
  originalT: 'You follow the original',
  originalB: 'An interlinear Bible, or one with the Hebrew alongside, stops being decoration on the page. You follow the line instead of jumping to the English column.',
  lexicoT: 'You look things up in a lexicon',
  lexicoB: 'Hebrew dictionaries, lexicons and concordances are organized by the Hebrew alphabet. Without the letters you cannot find the word; with them, you can.',
  traducaoT: 'You check a translation',
  traducaoB: 'When two versions disagree on a verse, the disagreement is in a word. Knowing how to read is what lets you go look at that word.',
  reconheceT: 'You recognize what you already know',
  reconheceB: 'Names, places and words you have heard all your life stop being sounds and become text - starting with this one, in the third position of the verse above.',

  roloEyebrow: 'Something nobody tells you',
  roloTitulo: 'A Torah scroll has not a single vowel dot.',
  roloLead: 'The signs are a later invention, made to record the pronunciation. The scroll read in the synagogue does not have them, and today\'s Israel writes without them too.',
  comPontos: 'With the dots, in a printed Bible',
  semPontos: 'Without the dots, as in the scroll',
  mesmaLinha: 'It is the same line. That is why the course does not stop at nikud: module 6 closes with a whole stage of reading without the dots, which is how Hebrew exists on the street, in the newspaper and in the scroll.',

  ctaTitulo: 'The door first.',
  ctaLinha: 'The 22 letters, with no transliteration by the end. The first one takes ten minutes and answers better than this page does.'
};

const es: Traducao<typeof pt> = {
  metaTitulo: '¿Voy a poder leer la Biblia en hebreo? - Hebraico Fluente',
  metaDescricao:
    'Sí, vas a leer el texto en voz alta; no, no lo vas a entender sin vocabulario y gramática. ' +
    'Génesis 1:1, palabra por palabra, para que juzgues tú.',
  trilha: 'Leer la Biblia',
  eyebrow: 'La pregunta que más nos llega',
  titulo: '¿Voy a poder leer la Biblia en hebreo?',
  lead: 'La respuesta tiene dos mitades, y las dos importan.',

  respostaEyebrow: 'La respuesta corta',
  respostaTitulo: 'Sí para leer. No para entender.',
  respostaLead: 'Son dos habilidades distintas, y confundirlas es lo que hace que alguien compre un curso de lectura creyendo que compró un curso de idioma.',
  sim: 'Sí.',
  simTitulo: 'Vas a leer en voz alta.',
  simTexto: 'El texto hebreo de la Biblia que se usa hoy viene con los signos de vocal - el nikud que los masoretas de Tiberíades fijaron para registrar la pronunciación. Son exactamente las 22 letras y los signos que enseña este curso. Con ellos decodificas cualquier versículo, sin transliteración y sin ayuda.',
  nao: 'No.',
  naoTitulo: 'No vas a entender lo que leíste.',
  naoTexto: 'Entender pide vocabulario y gramática, y el hebreo de la Biblia tiene construcciones que el hebreo de hoy no usa. Este es un curso de lectura: te da la puerta, no la casa. Quien promete la casa en ocho semanas está vendiendo otra cosa.',

  versiculoEyebrow: 'Míralo tú',
  versiculoTitulo: 'Las siete primeras palabras de la Biblia hebrea.',
  versiculoLead: 'Toca cualquiera. Vas a ver las dos mitades de la respuesta en el mismo lugar: cómo se lee, y qué quiere decir - que es la parte que alguien tuvo que traer.',
  legivel: (letra: number, total: number, licao: number | null, licoes: number) =>
    `Todas las letras de este versículo se enseñan hasta la letra ${letra} de ${total}${licao !== null ? ` (lección ${licao} de ${licoes})` : ''}. O sea: se vuelve legible antes de que el curso termine, y no al final.`,

  mudaEyebrow: 'Aun así',
  mudaTitulo: 'Lo que cambia cuando lees las letras.',
  mudaLead: 'Decodificar sin entender parece poco dicho así. En la práctica es la diferencia entre depender por completo de una traducción y poder verificarla.',
  originalT: 'Sigues el original',
  originalB: 'Una Biblia interlineal o con el hebreo al lado deja de ser decoración en la página. Sigues la línea en lugar de saltar a la columna en español.',
  lexicoT: 'Buscas en el léxico',
  lexicoB: 'Los diccionarios, léxicos y concordancias de hebreo están organizados por el alfabeto hebreo. Sin las letras no encuentras la palabra; con ellas, sí.',
  traducaoT: 'Verificas una traducción',
  traducaoB: 'Cuando dos versiones no coinciden en un versículo, la diferencia está en una palabra. Saber leer es lo que te permite ir a mirar esa palabra.',
  reconheceT: 'Reconoces lo que ya conoces',
  reconheceB: 'Nombres, lugares y palabras que oyes toda la vida dejan de ser sonido y se vuelven texto - empezando por esta, en la tercera posición del versículo de arriba.',

  roloEyebrow: 'Algo que nadie te avisa',
  roloTitulo: 'En un rollo de Torá no hay ni un solo punto de vocal.',
  roloLead: 'Los signos son una invención posterior, hecha para registrar la pronunciación. El rollo que se lee en la sinagoga no los tiene, y el Israel de hoy también escribe sin ellos.',
  comPontos: 'Con los puntos, en una Biblia impresa',
  semPontos: 'Sin los puntos, como está en el rollo',
  mesmaLinha: 'Es la misma línea. Por eso el curso no termina en el nikud: el módulo 6 cierra con una etapa entera de lectura sin los puntos, que es la forma en que el hebreo existe en la calle, en el periódico y en el rollo.',

  ctaTitulo: 'La puerta primero.',
  ctaLinha: 'Las 22 letras, sin transliteración al final. La primera lleva diez minutos y responde mejor que esta página.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

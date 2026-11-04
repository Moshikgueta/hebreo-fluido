import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* app/acessibilidade/page.tsx: a Declaração de Acessibilidade. */
const pt = {
  metaTitulo: 'Declaração de Acessibilidade - Hebraico Fluente',
  metaDescricao:
    'O que a plataforma faz para ser usada por todas as pessoas, o que ainda não faz, ' +
    'como foi testada e como avisar de uma barreira.',
  titulo: 'Declaração de Acessibilidade',
  resumo: 'O que fazemos para que a plataforma possa ser usada por todas as pessoas, o que ainda falta, e como nos avisar de uma barreira.',

  compromissoTitulo: 'Nosso compromisso',
  compromisso: 'Queremos que qualquer pessoa consiga aprender a ler hebraico aqui, com ou sem deficiência. A referência que seguimos é a das Diretrizes de Acessibilidade para Conteúdo Web (WCAG 2.1, nível AA), e a obrigação é a da Lei Brasileira de Inclusão (Lei 13.146/2015, art. 63). Ainda não cumprimos tudo; o que falta está listado no item 4.',

  ofereceTitulo: 'O que a plataforma oferece',
  menu: (): ReactNode => (
    <><strong>Menu de acessibilidade</strong>, no botão redondo do canto da tela ou pelo atalho <strong>Alt + Shift + A</strong>, em qualquer página. Os ajustes ficam guardados no seu aparelho e valem em todas as páginas:</>
  ),
  menu1: 'tamanho do texto em 100%, 115%, 130% ou 150%;',
  menu2: 'tema claro, escuro ou o do seu aparelho;',
  menu3: 'alto contraste;',
  menu4: 'menos animação (também respeitamos o ajuste de "reduzir movimento" do seu sistema);',
  menu5: 'links sublinhados;',
  menu6: 'mais espaço entre letras e linhas nos textos em português.',
  teclado: 'Teclado e leitor de tela:',
  teclado1: 'um atalho "Pular para o conteúdo" no início de cada página, e o foco visível nos botões e links;',
  teclado2: 'nas lições, as teclas 1 a 4 escolhem a resposta e Enter avança;',
  teclado3: 'os textos em hebraico são marcados como hebraico, para o leitor de tela trocar de idioma;',
  teclado4: 'os botões de áudio dizem o que tocam, e, nos exercícios das lições, o resultado de cada resposta é anunciado (menos no de ligar pares: ver o item 4);',
  teclado5: 'nenhuma imagem importante fica sem descrição.',
  audio: 'Áudio, tempo e tela:',
  audio1: 'as letras, as sílabas, as palavras, as frases e os textos têm áudio gravado, com opção de ouvir mais devagar; nada toca sozinho;',
  audio2: 'nenhum exercício tem tempo limite; nos jogos, o cronômetro é opcional;',
  audio3: 'a plataforma funciona no celular e no computador, e continua utilizável com o zoom do navegador em até 400%.',
  escrever: (): ReactNode => (
    <><strong>Escrever à mão é opcional.</strong> A etapa em que você traça a letra com o dedo pode ser pulada sem bloquear o resto da lição.</>
  ),

  verificamosTitulo: 'Como verificamos',
  verificamos: 'A cada publicação do site, uma verificação automática abre as páginas num navegador de verdade e confere o menu de acessibilidade e o contraste. Outra, que entra com uma conta de aluno, confere em celulares de 360 e 390 pixels que as telas do curso cabem na tela também com o texto em 150% (rodada antes de cada mudança grande, ainda não a cada publicação). Nenhuma das duas substitui o teste feito à mão. Em 28/09/2026 fizemos uma revisão manual completa: navegação por teclado, foco, nomes dos botões, contraste medido, textos em hebraico e telas de 320 pixels de largura. As correções dessa revisão já estão no ar. Em 29/09/2026 testamos também em celulares de verdade, um iPhone e um Android.',

  faltaTitulo: 'O que ainda não está bom',
  falta1: 'os exercícios de escuta dependem de ouvir, e ainda não têm uma alternativa para pessoas surdas; o restante do curso não depende de áudio;',
  falta2: '"Fale e seja corrigido" depende do reconhecimento de voz do navegador, que não existe em todos (o Firefox, por exemplo, não tem); é um recurso opcional, e "Gravar a minha" funciona em todos;',
  falta3: 'o jogo "Caça à letra" treina o reconhecimento visual da forma das letras; com leitor de tela, ele anuncia o nome de cada letra, o que torna o jogo possível, mas muda o que ele treina;',
  falta4: 'o foco depois de responder foi corrigido nos exercícios e nos jogos que conhecemos (em 01/10/2026); se você encontrar uma tela em que ele volta para o início da página, avise pelo canal abaixo;',
  falta5: 'com leitor de tela real, testamos o VoiceOver no iPhone, pelo Safari (em 01/10/2026): entrar, abrir uma lição, ouvir o áudio, responder e seguir funcionaram; no Chrome do iPhone o VoiceOver não funcionou bem, e recomendamos o Safari; ainda não testamos com NVDA (computador) nem TalkBack (Android).',

  aviseTitulo: 'Encontrou uma barreira? Avise',
  assunto: 'Acessibilidade',
  avise: (email: ReactNode, assunto: string, prazo: string): ReactNode => (
    <>Escreva para{' '}{email}{' '}com o assunto <em>{assunto}</em>. Conte em que página você estava, o que tentou fazer e, se puder, qual aparelho, navegador e tecnologia assistiva usa. Respondemos {prazo}, e, se a barreira impedir você de estudar, buscamos uma forma de você continuar enquanto a correção não sai.</>
  )
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Accessibility Statement - Hebrew Unlocked',
  metaDescricao:
    'What the platform does so everyone can use it, what it does not do yet, ' +
    'how it was tested and how to report a barrier.',
  titulo: 'Accessibility Statement',
  resumo: 'What we do so the platform can be used by everyone, what is still missing, and how to tell us about a barrier.',

  compromissoTitulo: 'Our commitment',
  // etapa 6: escrito para o site de fora
  compromisso: 'We want anyone to be able to learn to read Hebrew here, with or without a disability. The standard we follow is the Web Content Accessibility Guidelines (WCAG 2.1, level AA). We do not meet everything yet; what is missing is listed in item 4.',

  ofereceTitulo: 'What the platform offers',
  menu: (): ReactNode => (
    <><strong>Accessibility menu</strong>, from the round button in the corner of the screen or with the shortcut <strong>Alt + Shift + A</strong>, on any page. Your settings are saved on your device and apply to every page:</>
  ),
  menu1: 'text size at 100%, 115%, 130% or 150%;',
  menu2: 'light theme, dark theme or your device\'s theme;',
  menu3: 'high contrast;',
  menu4: 'less animation (we also respect your system\'s "reduce motion" setting);',
  menu5: 'underlined links;',
  menu6: 'more spacing between letters and lines in English text.',
  teclado: 'Keyboard and screen reader:',
  teclado1: 'a "Skip to content" shortcut at the top of every page, and visible focus on buttons and links;',
  teclado2: 'in the lessons, keys 1 to 4 choose the answer and Enter moves on;',
  teclado3: 'Hebrew text is marked as Hebrew, so the screen reader switches language;',
  teclado4: 'audio buttons say what they play, and, in the lesson exercises, the result of each answer is announced (except in the matching pairs exercise: see item 4);',
  teclado5: 'no important image is left without a description.',
  audio: 'Audio, time and screen:',
  audio1: 'the letters, syllables, words, sentences and texts have recorded audio, with an option to listen more slowly; nothing plays on its own;',
  audio2: 'no exercise has a time limit; in the games, the timer is optional;',
  audio3: 'the platform works on phones and computers, and stays usable with browser zoom up to 400%.',
  escrever: (): ReactNode => (
    <><strong>Handwriting is optional.</strong> The step where you trace the letter with your finger can be skipped without blocking the rest of the lesson.</>
  ),

  verificamosTitulo: 'How we check',
  verificamos: 'With every release of the site, an automated check opens the pages in a real browser and checks the accessibility menu and contrast. Another one, which signs in with a student account, checks on 360 and 390 pixel phones that the course screens fit even with text at 150% (run before every major change, not yet with every release). Neither replaces testing by hand. On 09/28/2026 we did a full manual review: keyboard navigation, focus, button names, measured contrast, Hebrew text and screens 320 pixels wide. The fixes from that review are already live. On 09/29/2026 we also tested on real phones, an iPhone and an Android.',

  faltaTitulo: 'What is not good enough yet',
  falta1: 'the listening exercises depend on hearing, and do not yet have an alternative for deaf people; the rest of the course does not depend on audio;',
  falta2: '"Speak and get feedback" depends on the browser\'s speech recognition, which not every browser has (Firefox, for example, does not); it is an optional feature, and "Record mine" works everywhere;',
  falta3: 'the "Letter hunt" game trains visual recognition of letter shapes; with a screen reader, it announces the name of each letter, which makes the game possible but changes what it trains;',
  falta4: 'focus after answering has been fixed in the exercises and games we know of (on 10/01/2026); if you find a screen where it jumps back to the top of the page, let us know through the channel below;',
  falta5: 'with a real screen reader, we tested VoiceOver on iPhone, in Safari (on 10/01/2026): signing in, opening a lesson, listening to audio, answering and moving on all worked; in Chrome on iPhone VoiceOver did not work well, and we recommend Safari; we have not yet tested with NVDA (computer) or TalkBack (Android).',

  aviseTitulo: 'Found a barrier? Let us know',
  assunto: 'Accessibility',
  avise: (email: ReactNode, assunto: string, prazo: string): ReactNode => (
    <>Write to{' '}{email}{' '}with the subject <em>{assunto}</em>. Tell us which page you were on, what you tried to do and, if you can, which device, browser and assistive technology you use. We reply {prazo}, and, if the barrier keeps you from studying, we will find a way for you to keep going while the fix is on its way.</>
  )
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Declaración de Accesibilidad - Hebraico Fluente',
  metaDescricao:
    'Lo que hace la plataforma para que todas las personas puedan usarla, lo que todavía no hace, ' +
    'cómo se probó y cómo avisar de una barrera.',
  titulo: 'Declaración de Accesibilidad',
  resumo: 'Lo que hacemos para que todas las personas puedan usar la plataforma, lo que todavía falta, y cómo avisarnos de una barrera.',

  compromissoTitulo: 'Nuestro compromiso',
  // etapa 6: escrito para el sitio de fuera
  compromisso: 'Queremos que cualquier persona pueda aprender a leer hebreo aquí, con o sin discapacidad. La referencia que seguimos son las Pautas de Accesibilidad para el Contenido Web (WCAG 2.1, nivel AA). Todavía no cumplimos con todo; lo que falta está en el punto 4.',

  ofereceTitulo: 'Lo que ofrece la plataforma',
  menu: (): ReactNode => (
    <><strong>Menú de accesibilidad</strong>, en el botón redondo de la esquina de la pantalla o con el atajo <strong>Alt + Shift + A</strong>, en cualquier página. Los ajustes se guardan en tu dispositivo y valen en todas las páginas:</>
  ),
  menu1: 'tamaño del texto en 100%, 115%, 130% o 150%;',
  menu2: 'tema claro, oscuro o el de tu dispositivo;',
  menu3: 'alto contraste;',
  menu4: 'menos animación (también respetamos el ajuste de "reducir movimiento" de tu sistema);',
  menu5: 'enlaces subrayados;',
  menu6: 'más espacio entre letras y líneas en los textos en español.',
  teclado: 'Teclado y lector de pantalla:',
  teclado1: 'un atajo "Saltar al contenido" al inicio de cada página, y el foco visible en los botones y enlaces;',
  teclado2: 'en las lecciones, las teclas 1 a 4 eligen la respuesta y Enter avanza;',
  teclado3: 'los textos en hebreo están marcados como hebreo, para que el lector de pantalla cambie de idioma;',
  teclado4: 'los botones de audio dicen lo que reproducen, y, en los ejercicios de las lecciones, se anuncia el resultado de cada respuesta (menos en el de unir pares: ver el punto 4);',
  teclado5: 'ninguna imagen importante queda sin descripción.',
  audio: 'Audio, tiempo y pantalla:',
  audio1: 'las letras, las sílabas, las palabras, las frases y los textos tienen audio grabado, con la opción de escuchar más despacio; nada suena solo;',
  audio2: 'ningún ejercicio tiene límite de tiempo; en los juegos, el cronómetro es opcional;',
  audio3: 'la plataforma funciona en el celular y en la computadora, y sigue siendo usable con el zoom del navegador hasta 400%.',
  escrever: (): ReactNode => (
    <><strong>Escribir a mano es opcional.</strong> La etapa en la que trazas la letra con el dedo se puede saltar sin bloquear el resto de la lección.</>
  ),

  verificamosTitulo: 'Cómo lo verificamos',
  verificamos: 'En cada publicación del sitio, una verificación automática abre las páginas en un navegador de verdad y revisa el menú de accesibilidad y el contraste. Otra, que entra con una cuenta de alumno, revisa en celulares de 360 y 390 píxeles que las pantallas del curso quepan en la pantalla también con el texto en 150% (se corre antes de cada cambio grande, todavía no en cada publicación). Ninguna de las dos reemplaza la prueba hecha a mano. El 28/09/2026 hicimos una revisión manual completa: navegación por teclado, foco, nombres de los botones, contraste medido, textos en hebreo y pantallas de 320 píxeles de ancho. Las correcciones de esa revisión ya están publicadas. El 29/09/2026 también probamos en celulares de verdad, un iPhone y un Android.',

  faltaTitulo: 'Lo que todavía no está bien',
  falta1: 'los ejercicios de escucha dependen de oír, y todavía no tienen una alternativa para personas sordas; el resto del curso no depende del audio;',
  falta2: '"Habla y recibe corrección" depende del reconocimiento de voz del navegador, que no existe en todos (Firefox, por ejemplo, no lo tiene); es un recurso opcional, y "Grabar la mía" funciona en todos;',
  falta3: 'el juego "Caza de la letra" entrena el reconocimiento visual de la forma de las letras; con lector de pantalla, anuncia el nombre de cada letra, lo que hace posible el juego, pero cambia lo que entrena;',
  falta4: 'el foco después de responder se corrigió en los ejercicios y en los juegos que conocemos (el 01/10/2026); si encuentras una pantalla en la que vuelve al inicio de la página, avísanos por el canal de abajo;',
  falta5: 'con un lector de pantalla real, probamos VoiceOver en el iPhone, con Safari (el 01/10/2026): entrar, abrir una lección, escuchar el audio, responder y seguir funcionaron; en Chrome del iPhone VoiceOver no funcionó bien, y recomendamos Safari; todavía no probamos con NVDA (computadora) ni TalkBack (Android).',

  aviseTitulo: '¿Encontraste una barrera? Avísanos',
  assunto: 'Accesibilidad',
  avise: (email: ReactNode, assunto: string, prazo: string): ReactNode => (
    <>Escribe a{' '}{email}{' '}con el asunto <em>{assunto}</em>. Cuéntanos en qué página estabas, qué intentaste hacer y, si puedes, qué dispositivo, navegador y tecnología de asistencia usas. Respondemos {prazo}, y, si la barrera te impide estudiar, buscamos una forma de que sigas mientras sale la corrección.</>
  )
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

import type { Traducao } from '..';

/* Mensagens do Dani (05/11/2026): a parada das 18h de Um dia em Israel
 * (app/um-dia-em-israel/mensagens). */
const pt = {
  titulo: 'Mensagens do Dani',
  intro: 'O Dani é um amigo israelense e escreve como se escreve no celular: sem os pontos. Leia a conversa e descubra o que cada mensagem quer dizer.',
  modo: 'Modo',
  modoLer: 'Ler a conversa',
  modoJogo: 'Responder ao Dani',
  conversa: 'Conversa com o Dani',
  online: 'online',
  digitando: 'digitando...',
  daniDigitando: 'O Dani está digitando',
  dicaLer: 'Toque numa mensagem para ver como se lê e o que quer dizer.',
  dicaJogo: 'Leia sem os pontos. Se travar, mostre os pontos.',
  dicaEspera: 'O Dani está escrevendo...',
  quantasLe: (n: number, total: number) => `Você já lê ${n} de ${total} mensagens. As outras aparecem com as próximas letras.`,
  poucasAinda: 'Ainda são poucas mensagens com as letras que você já aprendeu. Siga o curso: elas aparecem aqui.',
  mensagemN: (i: number, total: number) => `Mensagem ${i} de ${total}`,
  pergunta: 'O que o Dani quis dizer?',
  naPrimeira: 'Isso, na primeira!',
  agoraSim: 'Agora sim.',
  proxima: 'Próxima mensagem',
  verResultado: 'Ver o resultado',
  fimTodas: 'Você entendeu tudo o que o Dani escreveu. Pode responder em hebraico.',
  fimMetade: 'Quase tudo. Leia a conversa com os pontos e tente de novo.',
  fimPoucas: 'Leia a conversa em voz alta, mensagem por mensagem, e tente de novo.',
  jogarDeNovo: 'Jogar de novo',
  inventada: 'Uma conversa inventada, com um amigo inventado.'
} as const;

const en: Traducao<typeof pt> = {
  titulo: "Dani's messages",
  intro: 'Dani is an Israeli friend who writes the way people text: without the points. Read the chat and work out what each message means.',
  modo: 'Mode',
  modoLer: 'Read the chat',
  modoJogo: 'Reply to Dani',
  conversa: 'Chat with Dani',
  online: 'online',
  digitando: 'typing...',
  daniDigitando: 'Dani is typing',
  dicaLer: 'Tap a message to see how it is read and what it means.',
  dicaJogo: 'Read without the points. If you get stuck, show the points.',
  dicaEspera: 'Dani is writing...',
  quantasLe: (n, total) => `You can already read ${n} of ${total} messages. The others appear with the next letters.`,
  poucasAinda: 'There are still few messages with the letters you have learned. Keep going with the course: they will appear here.',
  mensagemN: (i, total) => `Message ${i} of ${total}`,
  pergunta: 'What did Dani mean?',
  naPrimeira: 'Yes, first try!',
  agoraSim: 'Got it now.',
  proxima: 'Next message',
  verResultado: 'See the result',
  fimTodas: 'You understood everything Dani wrote. You can reply in Hebrew.',
  fimMetade: 'Almost everything. Read the chat with the points and try again.',
  fimPoucas: 'Read the chat aloud, message by message, and try again.',
  jogarDeNovo: 'Play again',
  inventada: 'A made-up chat with a made-up friend.'
};

const es: Traducao<typeof pt> = {
  titulo: 'Los mensajes de Dani',
  intro: 'Dani es un amigo israelí y escribe como se escribe en el celular: sin los puntos. Lee la conversación y descubre qué quiere decir cada mensaje.',
  modo: 'Modo',
  modoLer: 'Leer la conversación',
  modoJogo: 'Responderle a Dani',
  conversa: 'Conversación con Dani',
  online: 'en línea',
  digitando: 'escribiendo...',
  daniDigitando: 'Dani está escribiendo',
  dicaLer: 'Toca un mensaje para ver cómo se lee y qué significa.',
  dicaJogo: 'Lee sin los puntos. Si te trabas, muestra los puntos.',
  dicaEspera: 'Dani está escribiendo...',
  quantasLe: (n, total) => `Ya lees ${n} de ${total} mensajes. Los otros aparecen con las próximas letras.`,
  poucasAinda: 'Todavía hay pocos mensajes con las letras que ya aprendiste. Sigue el curso: aparecerán aquí.',
  mensagemN: (i, total) => `Mensaje ${i} de ${total}`,
  pergunta: '¿Qué quiso decir Dani?',
  naPrimeira: '¡Eso, a la primera!',
  agoraSim: 'Ahora sí.',
  proxima: 'Siguiente mensaje',
  verResultado: 'Ver el resultado',
  fimTodas: 'Entendiste todo lo que escribió Dani. Puedes responder en hebreo.',
  fimMetade: 'Casi todo. Lee la conversación con los puntos e inténtalo de nuevo.',
  fimPoucas: 'Lee la conversación en voz alta, mensaje por mensaje, e inténtalo de nuevo.',
  jogarDeNovo: 'Jugar de nuevo',
  inventada: 'Una conversación inventada, con un amigo inventado.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

import type { Traducao } from '..';

/* components/landing/ComVoce.tsx - "Você não estuda sozinho" (06/11/2026):
   o Fale comigo e o WhatsApp, na página de venda, logo depois do professor. */
const pt = {
  rubrica: 'Você não estuda sozinho',
  titulo: 'Travou? Pergunta para mim.',
  lead: 'Atrás da plataforma tem uma pessoa. Dentro do curso, em Fale comigo, você manda a dúvida e eu mesmo respondo.',
  item1T: 'Dúvidas direto com o professor',
  item1D: (prazo: string) => `Você escreve dentro do curso e eu respondo no e-mail da sua conta ${prazo}.`,
  item2T: 'A sua opinião muda o curso',
  item2D: 'Comentários e sugestões chegam para mim, e o curso continua recebendo atualizações.',
  item3T: 'Antes de comprar, também',
  item3D: 'Ficou alguma pergunta? O WhatsApp está aberto.',
  whatsapp: 'Falar no WhatsApp',
  abreWhatsapp: '(abre o WhatsApp)'
} as const;

// rever: texto do site em inglês
const en: Traducao<typeof pt> = {
  rubrica: 'You don’t study alone',
  titulo: 'Stuck? Ask me.',
  lead: 'There is a person behind the platform. Inside the course, in Talk to me, you send your question and I answer it myself.',
  item1T: 'Questions straight to the teacher',
  item1D: (prazo: string) => `You write inside the course and I reply to your account e-mail ${prazo}.`,
  item2T: 'Your opinion shapes the course',
  item2D: 'Comments and suggestions come to me, and the course keeps getting updates.',
  item3T: 'Before buying, too',
  item3D: 'Any questions left? WhatsApp is open.',
  whatsapp: 'Chat on WhatsApp',
  abreWhatsapp: '(opens WhatsApp)'
};

const es: Traducao<typeof pt> = {
  rubrica: 'No estudias solo',
  titulo: '¿Te trabaste? Pregúntame.',
  lead: 'Detrás de la plataforma hay una persona. Dentro del curso, en Habla conmigo, mandas tu duda y te respondo yo mismo.',
  item1T: 'Dudas directo con el profesor',
  item1D: (prazo: string) => `Escribes dentro del curso y te respondo en el correo de tu cuenta ${prazo}.`,
  item2T: 'Tu opinión cambia el curso',
  item2D: 'Los comentarios y las sugerencias me llegan, y el curso sigue recibiendo actualizaciones.',
  item3T: 'Antes de comprar, también',
  item3D: '¿Te quedó alguna pregunta? El WhatsApp está abierto.',
  whatsapp: 'Hablar por WhatsApp',
  abreWhatsapp: '(abre WhatsApp)'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

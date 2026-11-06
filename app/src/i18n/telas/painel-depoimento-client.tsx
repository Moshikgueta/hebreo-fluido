import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* app/depoimento/DepoimentoClient.tsx - o formulário do depoimento do aluno.
   A assinatura da prévia ("Aluno do curso", iniciais) sai de lib/depoimento.ts. */
type Link = (texto: string) => ReactNode;

const pt = {
  estadoNovo: 'Recebido. O dono do curso ainda vai ler.',
  estadoAprovado: 'Lido e aprovado para publicação.',
  estadoRecusado: 'Lido. Este texto não vai ser publicado, mas continua valendo como opinião para o curso.',
  erroEnviar: 'Não deu para enviar agora. Tente de novo em instantes.',
  obrigadoAutorizado: 'Obrigado! Recebemos o seu depoimento e a sua autorização.',
  obrigadoPrivado: 'Obrigado! Recebemos o seu depoimento. Ele fica só para o dono do curso ler.',
  erroInternet: 'Não deu para enviar agora. Confira a internet e tente de novo.',
  retirado: 'Pronto: o depoimento e a autorização foram apagados.',
  erroRetirar: 'Não deu para retirar agora. Tente de novo em instantes.',

  voltar: '← Meu hebraico',
  titulo: 'Conte como está sendo',
  intro: 'O seu depoimento ajuda o curso a melhorar e ajuda quem está pensando em começar. Escreva do seu jeito, com o que foi bom e com o que não foi.',
  seuDepoimento: 'Seu depoimento',
  oSeuDepoimento: 'O seu depoimento',
  dicas: 'Se ajudar, responda a uma destas: por que você quis aprender a ler hebraico? O que você já consegue ler hoje que não conseguia antes? O que mais ajudou, ou o que poderia ser melhor?',
  contagem: '{n} de {max} caracteres',
  minimo: ' (mínimo {min})',

  comoAssinar: 'Como assinar, se for publicado',
  formaNome: 'Com o meu nome (e a cidade, se eu quiser)',
  formaIniciais: 'Só com as iniciais do nome',
  formaAnonimo: 'Sem nome: "Aluno do curso"',
  nomeIniciais: 'Nome (só as iniciais aparecem)',
  nomeQueAparece: 'Nome que aparece',
  cidade: 'Cidade (opcional)',
  comoApareceria: 'Como apareceria',

  autorizo: 'Autorizo o Hebraico Fluente a publicar este depoimento, do jeito que está na prévia acima, no site e em materiais de divulgação do curso, sem pagamento. Posso retirar a autorização quando quiser, nesta mesma página.',
  aceitoEmail: 'Aceito receber um e-mail do dono do curso sobre este depoimento.',
  regras: (link: Link) => <>Sem a autorização, o texto fica só para o dono do curso ler. Publicamos o texto como você escreveu, sem trocar nenhuma palavra; se ele precisar ser encurtado, o corte aparece marcado com [...]. Se você retirar a autorização, o depoimento sai de onde estiver publicado em até 7 dias. Mais detalhes na {link('Política de Privacidade')}.</>,

  enviando: 'Enviando…',
  salvarMudancas: 'Salvar as mudanças',
  enviar: 'Enviar o depoimento',
  retirarTitulo: 'Retirar o depoimento',
  retirarTexto: 'Apaga o texto e a autorização. Se ele estiver publicado, sai em até 7 dias.',
  simRetirar: 'Sim, retirar',
  cancelar: 'Cancelar'
} as const;

const en: Traducao<typeof pt> = {
  estadoNovo: 'Received. The course author has not read it yet.',
  estadoAprovado: 'Read and approved for publication.',
  estadoRecusado: 'Read. This text will not be published, but it still counts as feedback for the course.',
  erroEnviar: 'Could not send right now. Please try again in a moment.',
  obrigadoAutorizado: 'Thank you! We received your testimonial and your permission.',
  obrigadoPrivado: 'Thank you! We received your testimonial. Only the course author will read it.',
  erroInternet: 'Could not send right now. Check your internet connection and try again.',
  retirado: 'Done: the testimonial and the permission were deleted.',
  erroRetirar: 'Could not withdraw it right now. Please try again in a moment.',

  voltar: '← My Hebrew',
  titulo: 'Tell us how it is going',
  intro: 'Your testimonial helps the course improve and helps people who are thinking about starting. Write it your own way, with what went well and what did not.',
  seuDepoimento: 'Your testimonial',
  oSeuDepoimento: 'Your testimonial',
  dicas: 'If it helps, answer one of these: why did you want to learn to read Hebrew? What can you read today that you could not before? What helped the most, or what could be better?',
  contagem: '{n} of {max} characters',
  minimo: ' (minimum {min})',

  comoAssinar: 'How to sign it, if it is published',
  formaNome: 'With my name (and my city, if I want)',
  formaIniciais: 'Only with my initials',
  formaAnonimo: 'No name: "Course student"',
  nomeIniciais: 'Name (only the initials appear)',
  nomeQueAparece: 'Name that appears',
  cidade: 'City (optional)',
  comoApareceria: 'How it would appear',

  autorizo: 'I authorize Hebrew Unlocked to publish this testimonial, exactly as shown in the preview above, on the website and in the course\'s promotional materials, without payment. I can withdraw this permission whenever I want, on this same page.',
  aceitoEmail: 'I agree to receive an email from the course author about this testimonial.',
  regras: (link: Link) => <>Without your permission, only the course author reads the text. We publish the text as you wrote it, without changing a single word; if it needs to be shortened, the cut is marked with [...]. If you withdraw your permission, the testimonial is removed from wherever it is published within 7 days. More details in the {link('Privacy Policy')}.</>,

  enviando: 'Sending…',
  salvarMudancas: 'Save changes',
  enviar: 'Send testimonial',
  retirarTitulo: 'Withdraw the testimonial',
  retirarTexto: 'This deletes the text and the permission. If it is published, it comes down within 7 days.',
  simRetirar: 'Yes, withdraw',
  cancelar: 'Cancel'
};

const es: Traducao<typeof pt> = {
  estadoNovo: 'Recibido. El autor del curso todavía no lo leyó.',
  estadoAprovado: 'Leído y aprobado para publicación.',
  estadoRecusado: 'Leído. Este texto no se va a publicar, pero sigue contando como opinión para el curso.',
  erroEnviar: 'No se pudo enviar ahora. Inténtalo de nuevo en unos instantes.',
  obrigadoAutorizado: '¡Gracias! Recibimos tu testimonio y tu autorización.',
  obrigadoPrivado: '¡Gracias! Recibimos tu testimonio. Solo lo va a leer el autor del curso.',
  erroInternet: 'No se pudo enviar ahora. Revisa tu conexión a internet e inténtalo de nuevo.',
  retirado: 'Listo: el testimonio y la autorización se borraron.',
  erroRetirar: 'No se pudo retirar ahora. Inténtalo de nuevo en unos instantes.',

  voltar: '← Mi hebreo',
  titulo: 'Cuéntanos cómo te va',
  intro: 'Tu testimonio ayuda a mejorar el curso y ayuda a quien está pensando en empezar. Escríbelo a tu manera, con lo que estuvo bien y con lo que no.',
  seuDepoimento: 'Tu testimonio',
  oSeuDepoimento: 'Tu testimonio',
  dicas: 'Si te ayuda, responde una de estas: ¿por qué quisiste aprender a leer hebreo? ¿Qué puedes leer hoy que antes no podías? ¿Qué te ayudó más, o qué podría ser mejor?',
  contagem: '{n} de {max} caracteres',
  minimo: ' (mínimo {min})',

  comoAssinar: 'Cómo firmarlo, si se publica',
  formaNome: 'Con mi nombre (y la ciudad, si quiero)',
  formaIniciais: 'Solo con las iniciales del nombre',
  formaAnonimo: 'Sin nombre: "Alumno del curso"',
  nomeIniciais: 'Nombre (solo aparecen las iniciales)',
  nomeQueAparece: 'Nombre que aparece',
  cidade: 'Ciudad (opcional)',
  comoApareceria: 'Cómo aparecería',

  autorizo: 'Autorizo a Hebreo Fluido a publicar este testimonio, tal como está en la vista previa de arriba, en el sitio y en materiales de divulgación del curso, sin pago. Puedo retirar la autorización cuando quiera, en esta misma página.',
  aceitoEmail: 'Acepto recibir un correo del autor del curso sobre este testimonio.',
  regras: (link: Link) => <>Sin la autorización, el texto queda solo para que lo lea el autor del curso. Publicamos el texto como lo escribiste, sin cambiar ninguna palabra; si hay que acortarlo, el corte aparece marcado con [...]. Si retiras la autorización, el testimonio se quita de donde esté publicado en un plazo de 7 días. Más detalles en la {link('Política de Privacidad')}.</>,

  enviando: 'Enviando…',
  salvarMudancas: 'Guardar los cambios',
  enviar: 'Enviar el testimonio',
  retirarTitulo: 'Retirar el testimonio',
  retirarTexto: 'Borra el texto y la autorización. Si está publicado, se quita en un plazo de 7 días.',
  simRetirar: 'Sí, retirar',
  cancelar: 'Cancelar'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

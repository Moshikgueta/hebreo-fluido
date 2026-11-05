import type { ReactNode } from 'react';
import type { Traducao } from '..';

/* app/suporte/page.tsx */
const pt = {
  metaTitulo: 'Suporte - Hebraico Fluente',
  metaDescricao:
    'Como falar com quem faz o curso: e-mail de atendimento, horário, prazo de ' +
    'resposta, e os atalhos para os problemas mais comuns.',

  pagueiTitulo: 'Paguei e o acesso não liberou',
  pagueiAMao: (prazo: string) =>
    `Depois do PIX, conferimos o pagamento e liberamos o acesso à mão, ${prazo}. Passou disso, escreva do e-mail que você usou na compra: resolvemos sem custo.`,
  pagueiPix: 'No PIX o acesso costuma sair em minutos.',
  pagueiCartao: 'No cartão, assim que a operadora aprova.',
  pagueiAutomatico: (frases: string) =>
    `${frases} Passou disso, é falha nossa e resolvemos sem custo - escreva do e-mail que você usou na compra.`,
  pagueiAssunto: 'Paguei e o acesso não liberou',
  pagueiAcao: 'Avisar sobre acesso não liberado →',

  reembolsoTitulo: 'Quero meu dinheiro de volta',
  reembolsoCorpo: (dias: number, conta: ReactNode, confirmacao: string, politica: ReactNode): ReactNode => (
    <>Você tem {dias} dias para desistir, sem precisar explicar por quê e sem taxa. O caminho mais rápido é em{' '}{conta}, na compra: <strong>Desistir da compra</strong>. {confirmacao} A{' '}{politica}{' '}diz em quanto tempo o valor retorna.</>
  ),
  suaConta: 'Sua conta',
  politicaCompleta: 'política completa',
  reembolsoAssunto: 'Pedido de reembolso',
  reembolsoAcao: 'Pedir reembolso →',

  dadosTitulo: 'Quero acessar, corrigir ou apagar meus dados',
  dadosCorpo: (dias: number, politica: ReactNode): ReactNode => (
    <>É um direito seu, e respondemos em até {dias} dias. O que cada pedido significa está na{' '}{politica}.</>
  ),
  politicaPrivacidade: 'Política de Privacidade',
  dadosAssunto: 'Pedido LGPD - titular de dados',
  dadosAcao: 'Fazer um pedido sobre meus dados →',

  rubrica: 'Atendimento',
  titulo: 'Fale com a gente',
  lead: (horario: string, prazo: string) =>
    `Um e-mail, respondido por quem faz o curso. ${horario}. Respondemos ${prazo}.`,
  emailAtendimento: 'E-mail de atendimento',
  telefone: (tel: string) => `Telefone: ${tel}`,
  whatsapp: 'WhatsApp:',
  antesTitulo: 'Antes de escrever, veja se é um destes',
  cursoTitulo: 'Dúvida sobre o curso em si',
  cursoTexto: (faq: ReactNode, duvidas: string): ReactNode => (
    <>As perguntas que aparecem antes da compra - preço, prazo, celular, áudio, certificado - estão respondidas nas{' '}{faq}. O que não estiver lá, escreva: a lista cresce com o que vocês perguntam. {duvidas}</>
  ),
  duvidasFrequentes: 'dúvidas frequentes',
  ctaTitulo: 'Ainda não é aluno?',
  ctaLinha: 'A primeira letra leva dez minutos, e você tem sete dias para desistir sem precisar explicar por quê.'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Support - Hebrew Unlocked',
  metaDescricao:
    'How to reach the people who make the course: support email, hours, response ' +
    'time, and shortcuts for the most common problems.',

  pagueiTitulo: 'I paid and my access was not granted',
  // etapa 5/6: Brasil, rever (PIX)
  pagueiAMao: (prazo: string) =>
    `After a PIX payment, we check the payment and grant access by hand, ${prazo}. If it takes longer than that, write from the email you used to buy: we will fix it at no cost.`,
  // etapa 5/6: Brasil, rever (PIX)
  pagueiPix: 'With PIX, access usually comes through in minutes.',
  pagueiCartao: 'With a card, as soon as the card company approves it.',
  pagueiAutomatico: (frases: string) =>
    `${frases} If it takes longer than that, it is our fault and we will fix it at no cost - write from the email you used to buy.`,
  pagueiAssunto: 'I paid and my access was not granted',
  pagueiAcao: 'Report access not granted →',

  reembolsoTitulo: 'I want my money back',
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  reembolsoCorpo: (dias: number, conta: ReactNode, confirmacao: string, politica: ReactNode): ReactNode => (
    <>You have {dias} days to cancel, without having to explain why and with no fee. The fastest way is in{' '}{conta}, under the purchase: <strong>Cancel the purchase</strong>. {confirmacao} The{' '}{politica}{' '}says how long it takes for the money to come back.</>
  ),
  suaConta: 'Your account',
  politicaCompleta: 'full policy',
  /* O Worker confirma na hora os assuntos com "cancel" (worker/src/email.js). */
  reembolsoAssunto: 'Cancellation and refund request',
  reembolsoAcao: 'Request a refund →',

  dadosTitulo: 'I want to access, correct or delete my data',
  // etapa 5/6: Brasil, rever (LGPD)
  dadosCorpo: (dias: number, politica: ReactNode): ReactNode => (
    <>It is your right, and we reply within {dias} days. What each request means is in the{' '}{politica}.</>
  ),
  politicaPrivacidade: 'Privacy Policy',
  // etapa 6: escrito para o site de fora
  dadosAssunto: 'Data protection request',
  dadosAcao: 'Make a request about my data →',

  rubrica: 'Support',
  titulo: 'Talk to us',
  lead: (horario: string, prazo: string) =>
    `One email address, answered by the people who make the course. ${horario}. We reply ${prazo}.`,
  emailAtendimento: 'Support email',
  telefone: (tel: string) => `Phone: ${tel}`,
  whatsapp: 'WhatsApp:',
  antesTitulo: 'Before you write, see if it is one of these',
  cursoTitulo: 'A question about the course itself',
  cursoTexto: (faq: ReactNode, duvidas: string): ReactNode => (
    <>The questions that come up before buying - price, timing, phone, audio, certificate - are answered in the{' '}{faq}. If yours is not there, write to us: the list grows with what you ask. {duvidas}</>
  ),
  duvidasFrequentes: 'frequently asked questions',
  ctaTitulo: 'Not a student yet?',
  // etapa 5: o site em inglês cobra pelo Paddle
  ctaLinha: 'The first letter takes ten minutes, and you have 7 days to cancel without having to explain why.'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Soporte - Hebraico Fluente',
  metaDescricao:
    'Cómo hablar con quienes hacen el curso: correo de atención, horario, plazo de ' +
    'respuesta y los atajos para los problemas más comunes.',

  pagueiTitulo: 'Pagué y el acceso no se habilitó',
  // etapa 5/6: Brasil, rever (PIX)
  pagueiAMao: (prazo: string) =>
    `Después del PIX, revisamos el pago y habilitamos el acceso a mano, ${prazo}. Si pasa ese plazo, escribe desde el correo que usaste en la compra: lo resolvemos sin costo.`,
  // etapa 5/6: Brasil, rever (PIX)
  pagueiPix: 'Por PIX, el acceso suele llegar en minutos.',
  pagueiCartao: 'Con tarjeta, en cuanto la emisora la aprueba.',
  pagueiAutomatico: (frases: string) =>
    `${frases} Si pasa ese plazo, es una falla nuestra y lo resolvemos sin costo - escribe desde el correo que usaste en la compra.`,
  pagueiAssunto: 'Pagué y el acceso no se habilitó',
  pagueiAcao: 'Avisar que el acceso no se habilitó →',

  reembolsoTitulo: 'Quiero que me devuelvan el dinero',
  // etapa 5/6: Brasil, rever (direito de arrependimento do CDC)
  reembolsoCorpo: (dias: number, conta: ReactNode, confirmacao: string, politica: ReactNode): ReactNode => (
    <>Tienes {dias} días para cancelar, sin tener que explicar por qué y sin cargo. El camino más rápido es en{' '}{conta}, en la compra: <strong>Cancelar la compra</strong>. {confirmacao} La{' '}{politica}{' '}dice en cuánto tiempo vuelve el dinero.</>
  ),
  suaConta: 'Tu cuenta',
  politicaCompleta: 'política completa',
  /* O Worker confirma na hora os assuntos com "cancel" e "reembols" (worker/src/email.js). */
  reembolsoAssunto: 'Solicitud de cancelación y reembolso',
  reembolsoAcao: 'Pedir reembolso →',

  dadosTitulo: 'Quiero acceder a mis datos, corregirlos o borrarlos',
  // etapa 5/6: Brasil, rever (LGPD)
  dadosCorpo: (dias: number, politica: ReactNode): ReactNode => (
    <>Es tu derecho, y respondemos en hasta {dias} días. Lo que significa cada solicitud está en la{' '}{politica}.</>
  ),
  politicaPrivacidade: 'Política de Privacidad',
  // etapa 6: escrito para o site de fora
  dadosAssunto: 'Solicitud de protección de datos',
  dadosAcao: 'Hacer una solicitud sobre mis datos →',

  rubrica: 'Atención',
  titulo: 'Habla con nosotros',
  lead: (horario: string, prazo: string) =>
    `Un correo, respondido por quienes hacen el curso. ${horario}. Respondemos ${prazo}.`,
  emailAtendimento: 'Correo de atención',
  telefone: (tel: string) => `Teléfono: ${tel}`,
  whatsapp: 'WhatsApp:',
  antesTitulo: 'Antes de escribir, fíjate si es uno de estos',
  cursoTitulo: 'Una duda sobre el curso en sí',
  cursoTexto: (faq: ReactNode, duvidas: string): ReactNode => (
    <>Las preguntas que aparecen antes de comprar - precio, plazo, celular, audio, certificado - están respondidas en las{' '}{faq}. Si la tuya no está, escríbenos: la lista crece con lo que ustedes preguntan. {duvidas}</>
  ),
  duvidasFrequentes: 'preguntas frecuentes',
  ctaTitulo: '¿Todavía no eres alumno?',
  // etapa 5: o site em espanhol cobra pelo Paddle
  ctaLinha: 'La primera letra toma diez minutos, y tienes 7 días para cancelar sin tener que explicar por qué.'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

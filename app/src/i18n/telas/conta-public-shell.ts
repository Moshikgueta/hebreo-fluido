import type { Traducao } from '..';

/* components/shell/PublicShell.tsx: o cabeçalho e o rodapé do site público */
const pt = {
  linkMetodo: 'O método',
  linkSobre: 'Sobre',
  linkDuvidas: 'Dúvidas',
  paginaInicial: 'Hebraico Fluente, página inicial',
  navegacao: 'Navegação do site',
  meuHebraico: 'Meu Hebraico',
  minhaConta: 'Minha conta',
  /* Abaixo de 360 px, ao lado do \"Quero começar\". */
  minhaContaCurta: 'Conta',
  comecar: 'Quero começar',
  /* Só no cabeçalho do celular com o texto ampliado (130% e 150%). */
  comecarCurto: 'Começar',
  comecarOCurso: 'Quero começar',
  entrar: 'Entrar',
  comecarAgora: 'Quero começar',
  fecharMenu: 'Fechar menu',
  abrirMenu: 'Abrir menu',

  rodapeTexto:
    'Hebraico para brasileiros, começando pelo alfabeto. Feito para adulto que estuda sozinho, ' +
    'no celular, sem professor do lado.',
  inspiradoEm: 'Método inspirado em',
  creditoDepois: (translit: string, autor: string) => `(${translit}), de ${autor}.`,
  contato: 'Contato',
  whatsapp: (numero: string) => `WhatsApp ${numero}`,
  horario: (horario: string, prazo: string) => `${horario}. Resposta ${prazo}.`,
  pagamentoSoPix: 'Pagamento por PIX. Acesso liberado depois de conferido o pagamento.',
  pagamentoPixECartao: (parcelas: string) =>
    `Pagamento por PIX ou cartão, ${parcelas}. Acesso liberado na hora.`,
  pagamentoCartao: (parcelas: string) =>
    `Pagamento por cartão de crédito, ${parcelas}. Acesso liberado na hora.`,
  pagamentoPixNaHora: 'Pagamento por PIX. Acesso liberado na hora.',

  aprender: 'Aprender',
  alfabetizacao: 'Alfabetização em Hebraico',
  osCursos: 'Os cursos',
  alfabetoHebraico: 'Alfabeto hebraico',
  lerABiblia: 'Ler a Bíblia?',
  blog: 'Blog',
  proximosCursos: 'Próximos cursos, à parte e ainda em produção:',
  e: ' e',
  ajuda: 'Ajuda',
  suporte: 'Suporte',
  sobreOMoshik: 'Sobre o Moshik',
  acessibilidade: 'Acessibilidade',
  legal: 'Legal',
  termosDeUso: 'Termos de Uso',
  politicaDePrivacidade: 'Política de Privacidade',
  reembolso: 'Reembolso e Cancelamento',
  cnpj: (numero: string) => `CNPJ ${numero}`,
  direitos: (ano: number, nome: string) => `© ${ano} ${nome}. Todos os direitos reservados.`
} as const;

const en: Traducao<typeof pt> = {
  linkMetodo: 'The method',
  linkSobre: 'About',
  linkDuvidas: 'FAQ',
  paginaInicial: 'Hebrew Unlocked, home page',
  navegacao: 'Site navigation',
  meuHebraico: 'My Hebrew',
  minhaConta: 'My account',
  minhaContaCurta: 'Account',
  comecar: 'I want to start',
  comecarCurto: 'Start',
  comecarOCurso: 'I want to start',
  entrar: 'Sign in',
  comecarAgora: 'I want to start',
  fecharMenu: 'Close menu',
  abrirMenu: 'Open menu',

  rodapeTexto:
    'Hebrew for English speakers, starting with the alphabet. Made for adults who study on their ' +
    'own, on their phone, with no teacher beside them.',
  inspiradoEm: 'Method inspired by',
  creditoDepois: (translit: string, autor: string) => `(${translit}), by ${autor}.`,
  contato: 'Contact',
  whatsapp: (numero: string) => `WhatsApp ${numero}`,
  horario: (horario: string, prazo: string) => `${horario}. Reply ${prazo}.`,
  // etapa 5/6: Brasil, rever
  pagamentoSoPix: 'Payment by PIX. Access unlocked once the payment is checked.',
  pagamentoPixECartao: (parcelas: string) =>
    `Payment by PIX or card, ${parcelas}. Access unlocked instantly.`,
  pagamentoCartao: () =>
    'Payment by card, Apple Pay or Google Pay through Stripe. Access unlocked instantly.',
  pagamentoPixNaHora: 'Payment by PIX. Access unlocked instantly.',

  aprender: 'Learn',
  alfabetizacao: 'Learn to Read Hebrew',
  osCursos: 'The courses',
  alfabetoHebraico: 'Hebrew alphabet',
  lerABiblia: 'Read the Bible?',
  blog: 'Blog',
  proximosCursos: 'Upcoming courses, sold separately and still in production:',
  e: ' and',
  ajuda: 'Help',
  suporte: 'Support',
  sobreOMoshik: 'About Moshik',
  acessibilidade: 'Accessibility',
  legal: 'Legal',
  termosDeUso: 'Terms of Use',
  politicaDePrivacidade: 'Privacy Policy',
  reembolso: 'Refunds and Cancellation',
  // etapa 6: escrito para o site de fora
  cnpj: (numero: string) => `Brazilian company number (CNPJ) ${numero}`,
  direitos: (ano: number, nome: string) => `© ${ano} ${nome}. All rights reserved.`
};

const es: Traducao<typeof pt> = {
  linkMetodo: 'El método',
  linkSobre: 'Sobre',
  linkDuvidas: 'Preguntas',
  paginaInicial: 'Hebraico Fluente, página de inicio',
  navegacao: 'Navegación del sitio',
  meuHebraico: 'Mi Hebreo',
  minhaConta: 'Mi cuenta',
  minhaContaCurta: 'Cuenta',
  comecar: 'Quiero empezar',
  comecarCurto: 'Empezar',
  comecarOCurso: 'Quiero empezar',
  entrar: 'Entrar',
  comecarAgora: 'Quiero empezar',
  fecharMenu: 'Cerrar menú',
  abrirMenu: 'Abrir menú',

  rodapeTexto:
    'Hebreo empezando por el alfabeto. Hecho para adultos que estudian solos, ' +
    'en el celular, sin un profesor al lado.',
  inspiradoEm: 'Método inspirado en',
  creditoDepois: (translit: string, autor: string) => `(${translit}), de ${autor}.`,
  contato: 'Contacto',
  whatsapp: (numero: string) => `WhatsApp ${numero}`,
  horario: (horario: string, prazo: string) => `${horario}. Respuesta ${prazo}.`,
  // etapa 5/6: Brasil, rever
  pagamentoSoPix: 'Pago por PIX. Acceso liberado después de revisar el pago.',
  pagamentoPixECartao: (parcelas: string) =>
    `Pago por PIX o tarjeta, ${parcelas}. Acceso liberado al instante.`,
  pagamentoCartao: () =>
    'Pago con tarjeta, Apple Pay o Google Pay a través de Stripe. Acceso liberado al instante.',
  pagamentoPixNaHora: 'Pago por PIX. Acceso liberado al instante.',

  aprender: 'Aprender',
  alfabetizacao: 'Aprende a leer hebreo',
  osCursos: 'Los cursos',
  alfabetoHebraico: 'Alfabeto hebreo',
  lerABiblia: '¿Leer la Biblia?',
  blog: 'Blog',
  proximosCursos: 'Próximos cursos, aparte y todavía en producción:',
  e: ' y',
  ajuda: 'Ayuda',
  suporte: 'Soporte',
  sobreOMoshik: 'Sobre Moshik',
  acessibilidade: 'Accesibilidad',
  legal: 'Legal',
  termosDeUso: 'Términos de Uso',
  politicaDePrivacidade: 'Política de Privacidad',
  reembolso: 'Reembolso y Cancelación',
  // etapa 6: escrito para o site de fora
  cnpj: (numero: string) => `Número de empresa brasileña (CNPJ) ${numero}`,
  direitos: (ano: number, nome: string) => `© ${ano} ${nome}. Todos los derechos reservados.`
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

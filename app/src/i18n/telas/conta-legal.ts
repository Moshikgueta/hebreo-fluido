import type { Traducao } from '..';

/* components/legal/Legal.tsx: as peças comuns às políticas */
const pt = {
  ultimaAtualizacao: (data: string) => `Última atualização: ${data}`,
  ctaTitulo: 'Tudo isso respondido? Então comece.',
  ctaLinha:
    'A primeira letra leva dez minutos, e você tem sete dias para desistir sem precisar explicar por quê.',
  termosDeUso: 'Termos de Uso',
  politicaDePrivacidade: 'Política de Privacidade',
  reembolso: 'Reembolso e Cancelamento',
  acessibilidade: 'Acessibilidade',
  duvidasFrequentes: 'Dúvidas frequentes',
  quemOferece: 'Quem oferece este serviço',
  fornecedor: 'Fornecedor',
  cnpj: 'CNPJ',
  endereco: 'Endereço',
  atendimento: 'Atendimento',
  telefone: 'Telefone',
  whatsapp: 'WhatsApp',
  horario: 'Horário',
  prazoDeResposta: 'Prazo de resposta',
  cnpjNumero: (numero: string) => `CNPJ ${numero}`,
  quemOfereceCurto: (partes: string) => `Quem oferece este serviço: ${partes}.`
} as const;

/* etapa 5/6: Brasil, rever - identificação do fornecedor (CNPJ) e o prazo de
   desistência do CDC; o site em inglês terá políticas próprias. */
const en: Traducao<typeof pt> = {
  ultimaAtualizacao: (data: string) => `Last updated: ${data}`,
  ctaTitulo: 'All of that answered? Then get started.',
  ctaLinha:
    'The first letter takes ten minutes, and you have 7 days to cancel without having to explain why.',
  termosDeUso: 'Terms of Use',
  politicaDePrivacidade: 'Privacy Policy',
  reembolso: 'Refunds and Cancellation',
  acessibilidade: 'Accessibility',
  duvidasFrequentes: 'FAQ',
  quemOferece: 'Who provides this service',
  fornecedor: 'Provider',
  cnpj: 'Company number (CNPJ, Brazil)',
  endereco: 'Address',
  atendimento: 'Support',
  telefone: 'Phone',
  whatsapp: 'WhatsApp',
  horario: 'Hours',
  prazoDeResposta: 'Response time',
  cnpjNumero: (numero: string) => `CNPJ ${numero}`,
  quemOfereceCurto: (partes: string) => `Who provides this service: ${partes}.`
};

/* etapa 5/6: Brasil, rever - identificação do fornecedor (CNPJ) e o prazo de
   desistência; o site em espanhol terá políticas próprias. */
const es: Traducao<typeof pt> = {
  ultimaAtualizacao: (data: string) => `Última actualización: ${data}`,
  ctaTitulo: '¿Todo eso respondido? Entonces empieza.',
  ctaLinha:
    'La primera letra lleva diez minutos, y tienes 7 días para cancelar sin tener que explicar por qué.',
  termosDeUso: 'Términos de Uso',
  politicaDePrivacidade: 'Política de Privacidad',
  reembolso: 'Reembolso y Cancelación',
  acessibilidade: 'Accesibilidad',
  duvidasFrequentes: 'Preguntas frecuentes',
  quemOferece: 'Quién ofrece este servicio',
  fornecedor: 'Proveedor',
  cnpj: 'Número de empresa (CNPJ, Brasil)',
  endereco: 'Dirección',
  atendimento: 'Atención',
  telefone: 'Teléfono',
  whatsapp: 'WhatsApp',
  horario: 'Horario',
  prazoDeResposta: 'Plazo de respuesta',
  cnpjNumero: (numero: string) => `CNPJ ${numero}`,
  quemOfereceCurto: (partes: string) => `Quién ofrece este servicio: ${partes}.`
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

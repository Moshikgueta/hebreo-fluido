import type { Traducao } from '..';

/* components/shell: MarcaDagua.tsx, RedesSociais.tsx, DemoNotice.tsx e Logo.tsx */
const pt = {
  licenciadoPara: (email: string) => `Licenciado para ${email}`,
  copia: (numero: string) => `cópia ${numero}`,
  avisoDeDireitos:
    'Conteúdo protegido por direito autoral (Lei 9.610/1998), licenciado para uso pessoal desta ' +
    'conta. Copiar, gravar para distribuir ou revender sem autorização pode gerar ' +
    'responsabilização civil e criminal.',
  termosArtigo5: 'Termos de Uso, artigo 5',

  instagram: 'Instagram',
  instagramSr: ' do Hebraico Fluente (abre em outra aba)',
  linkedin: 'LinkedIn',
  linkedinSr: ' do professor (abre em outra aba)',

  demoTitulo: 'Ambiente de demonstração.',
  demoTexto:
    'Esta versão não tem servidor: contas e pagamentos ficam só neste navegador, nada é cobrado ' +
    'e o acesso não vale em outro aparelho.',

  marca: 'Hebraico Fluente'
} as const;

const en: Traducao<typeof pt> = {
  licenciadoPara: (email: string) => `Licensed to ${email}`,
  copia: (numero: string) => `copy ${numero}`,
  // etapa 6: escrito para o site de fora
  avisoDeDireitos:
    'Content protected by copyright, licensed for the personal use of ' +
    'this account. Copying, recording for distribution or reselling without permission may lead ' +
    'to civil and criminal liability.',
  termosArtigo5: 'Terms of Use, article 5',

  instagram: 'Instagram',
  instagramSr: ' of Hebrew Unlocked (opens in a new tab)',
  linkedin: 'LinkedIn',
  linkedinSr: ' of the teacher (opens in a new tab)',

  demoTitulo: 'Demo environment.',
  demoTexto:
    'This version has no server: accounts and payments stay only in this browser, nothing is ' +
    'charged and access does not work on another device.',

  marca: 'Hebrew Unlocked'
};

const es: Traducao<typeof pt> = {
  licenciadoPara: (email: string) => `Licenciado para ${email}`,
  copia: (numero: string) => `copia ${numero}`,
  // etapa 6: escrito para el sitio de fuera (sigue la versión en inglés)
  avisoDeDireitos:
    'Contenido protegido por derechos de autor, licenciado para el uso personal de ' +
    'esta cuenta. Copiar, grabar para distribuir o revender sin autorización puede generar ' +
    'responsabilidad civil y penal.',
  termosArtigo5: 'Términos de Uso, artículo 5',

  instagram: 'Instagram',
  instagramSr: ' de Hebraico Fluente (se abre en otra pestaña)',
  linkedin: 'LinkedIn',
  linkedinSr: ' del profesor (se abre en otra pestaña)',

  demoTitulo: 'Entorno de demostración.',
  demoTexto:
    'Esta versión no tiene servidor: las cuentas y los pagos quedan solo en este navegador, no se ' +
    'cobra nada y el acceso no funciona en otro dispositivo.',

  marca: 'Hebraico Fluente'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

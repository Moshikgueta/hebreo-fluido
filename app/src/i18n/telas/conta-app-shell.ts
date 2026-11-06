import type { Traducao } from '..';

/* components/shell/AppShell.tsx: a casca do curso (cabeçalho, barra e sidebar) */
const pt = {
  navHoje: 'Hoje',
  navCurso: 'Curso',
  navPraticar: 'Praticar',
  navProgresso: 'Progresso',
  navRecompensas: 'Recompensas',
  navPerfil: 'Perfil',
  armazenamentoBloqueado:
    'O navegador está bloqueando o armazenamento local (janela anônima ou cookies desativados). ' +
    'Você pode estudar normalmente, mas o progresso não vai ser guardado ao fechar a aba.',
  naoSincronizado:
    'O que você acabou de fazer está salvo neste aparelho, mas ainda não chegou à sua conta. ' +
    'Assim que a conexão voltar, ele sobe sozinho. Se for trocar de aparelho agora, abra o curso ' +
    'uma vez com internet antes.',
  marca: 'Hebraico Fluente',
  xpAbrirRecompensas: (xp: number) => `${xp} XP. Abrir as recompensas`,
  ajudaEInformacoes: 'Ajuda e informações',
  precisaDeAjuda: 'Precisa de ajuda?',
  duvidasFrequentes: 'Dúvidas frequentes',
  reembolso: 'Reembolso e cancelamento',
  termos: 'Termos',
  privacidade: 'Privacidade',
  acessibilidade: 'Acessibilidade',
  navegacaoPrincipal: 'Navegação principal',
  nasLicoes: 'Nas lições, ',
  respondem: ' respondem e ',
  teclaEnter: 'Enter',
  avanca: ' avança.',
  suaConta: 'Sua conta',
  conquista: 'Conquista',
  conquistaDesbloqueada: 'Conquista desbloqueada',
  fechar: 'Fechar'
} as const;

const en: Traducao<typeof pt> = {
  navHoje: 'Today',
  navCurso: 'Course',
  navPraticar: 'Practice',
  navProgresso: 'Progress',
  navRecompensas: 'Rewards',
  navPerfil: 'Profile',
  armazenamentoBloqueado:
    'Your browser is blocking local storage (private window or cookies turned off). You can ' +
    'study normally, but your progress will not be saved when you close the tab.',
  naoSincronizado:
    'What you just did is saved on this device, but has not reached your account yet. As soon ' +
    'as the connection comes back, it uploads on its own. If you are switching devices now, open ' +
    'the course once with internet first.',
  marca: 'Hebrew Unlocked',
  xpAbrirRecompensas: (xp: number) => `${xp} XP. Open rewards`,
  ajudaEInformacoes: 'Help and information',
  precisaDeAjuda: 'Need help?',
  duvidasFrequentes: 'FAQ',
  // etapa 5/6: Brasil, rever
  reembolso: 'Refunds and cancellation',
  termos: 'Terms',
  privacidade: 'Privacy',
  acessibilidade: 'Accessibility',
  navegacaoPrincipal: 'Main navigation',
  nasLicoes: 'In lessons, ',
  respondem: ' answer and ',
  teclaEnter: 'Enter',
  avanca: ' moves on.',
  suaConta: 'Your account',
  conquista: 'Achievement',
  conquistaDesbloqueada: 'Achievement unlocked',
  fechar: 'Close'
};

const es: Traducao<typeof pt> = {
  navHoje: 'Hoy',
  navCurso: 'Curso',
  navPraticar: 'Practicar',
  navProgresso: 'Progreso',
  navRecompensas: 'Recompensas',
  navPerfil: 'Perfil',
  armazenamentoBloqueado:
    'El navegador está bloqueando el almacenamiento local (ventana de incógnito o cookies desactivadas). ' +
    'Puedes estudiar con normalidad, pero tu progreso no se va a guardar al cerrar la pestaña.',
  naoSincronizado:
    'Lo que acabas de hacer está guardado en este dispositivo, pero todavía no llegó a tu cuenta. ' +
    'En cuanto vuelva la conexión, se sube solo. Si vas a cambiar de dispositivo ahora, abre el curso ' +
    'una vez con internet antes.',
  marca: 'Hebreo Fluido',
  xpAbrirRecompensas: (xp: number) => `${xp} XP. Abrir las recompensas`,
  ajudaEInformacoes: 'Ayuda e información',
  precisaDeAjuda: '¿Necesitas ayuda?',
  duvidasFrequentes: 'Preguntas frecuentes',
  // etapa 5/6: Brasil, rever
  reembolso: 'Reembolsos y cancelación',
  termos: 'Términos',
  privacidade: 'Privacidad',
  acessibilidade: 'Accesibilidad',
  navegacaoPrincipal: 'Navegación principal',
  nasLicoes: 'En las lecciones, ',
  respondem: ' responden y ',
  teclaEnter: 'Enter',
  avanca: ' avanza.',
  suaConta: 'Tu cuenta',
  conquista: 'Logro',
  conquistaDesbloqueada: 'Logro desbloqueado',
  fechar: 'Cerrar'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

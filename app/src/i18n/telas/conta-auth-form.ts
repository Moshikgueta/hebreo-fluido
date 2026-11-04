import type { Traducao } from '..';

/* components/platform/AuthForm.tsx, app/entrar e app/criar-conta */
const pt = {
  metaEntrarTitulo: 'Entrar - Hebraico Fluente',
  metaEntrarDescricao: 'Entre na sua conta e continue de onde parou.',
  metaCriarTitulo: 'Criar conta - Hebraico Fluente',
  metaCriarDescricao: 'Crie sua conta no Hebraico Fluente.',
  motivoAparelhos:
    'Você entrou em outro aparelho e esta sessão foi encerrada. ' +
    'O limite é de 3 aparelhos ao mesmo tempo.',
  criarSuaConta: 'Criar sua conta',
  entrar: 'Entrar',
  subtituloCadastro: 'Seus cursos, seu progresso e seu certificado ficam todos aqui.',
  subtituloEntrar: 'Bem-vindo de volta. Vamos continuar seu hebraico?',
  comoQuerSerChamado: 'Como você quer ser chamado',
  exemploNome: 'ex.: Daniel',
  email: 'E-mail',
  exemploEmail: 'ex.: voce@exemplo.com.br',
  confiraEmail: 'Confira com cuidado: é para ele que vão o recibo da compra e o link de senha.',
  senha: 'Senha',
  peloMenos: (n: number) => `Pelo menos ${n} caracteres.`,
  liEAceito: 'Li e aceito os',
  termosDeUso: 'Termos de Uso',
  comoTratamos: 'Como tratamos os seus dados:',
  politicaDePrivacidade: 'Política de Privacidade',
  criando: 'Criando…',
  entrando: 'Entrando…',
  criarConta: 'Criar conta',
  esqueciSenha: 'Esqueci minha senha',
  jaTemConta: 'Já tem conta?',
  aindaNaoComprou: 'Ainda não comprou?',
  verOCurso: 'Ver o curso'
} as const;

const en: Traducao<typeof pt> = {
  metaEntrarTitulo: 'Sign in - Hebrew Unlocked',
  metaEntrarDescricao: 'Sign in to your account and pick up where you left off.',
  metaCriarTitulo: 'Create account - Hebrew Unlocked',
  metaCriarDescricao: 'Create your Hebrew Unlocked account.',
  motivoAparelhos:
    'You signed in on another device and this session was ended. ' +
    'The limit is 3 devices at the same time.',
  criarSuaConta: 'Create your account',
  entrar: 'Sign in',
  subtituloCadastro: 'Your courses, your progress and your certificate are all kept here.',
  subtituloEntrar: 'Welcome back. Shall we continue your Hebrew?',
  comoQuerSerChamado: 'What should we call you',
  exemploNome: 'e.g. Daniel',
  email: 'Email',
  exemploEmail: 'e.g. you@example.com',
  confiraEmail: 'Check it carefully: this is where your purchase receipt and password link go.',
  senha: 'Password',
  peloMenos: (n: number) => `At least ${n} characters.`,
  liEAceito: 'I have read and accept the',
  termosDeUso: 'Terms of Use',
  comoTratamos: 'How we handle your data:',
  politicaDePrivacidade: 'Privacy Policy',
  criando: 'Creating…',
  entrando: 'Signing in…',
  criarConta: 'Create account',
  esqueciSenha: 'I forgot my password',
  jaTemConta: 'Already have an account?',
  aindaNaoComprou: 'Have not bought it yet?',
  verOCurso: 'See the course'
};

const es: Traducao<typeof pt> = {
  metaEntrarTitulo: 'Entrar - Hebraico Fluente',
  metaEntrarDescricao: 'Entra en tu cuenta y sigue desde donde lo dejaste.',
  metaCriarTitulo: 'Crear cuenta - Hebraico Fluente',
  metaCriarDescricao: 'Crea tu cuenta en Hebraico Fluente.',
  motivoAparelhos:
    'Entraste en otro dispositivo y esta sesión se cerró. ' +
    'El límite es de 3 dispositivos al mismo tiempo.',
  criarSuaConta: 'Crea tu cuenta',
  entrar: 'Entrar',
  subtituloCadastro: 'Tus cursos, tu progreso y tu certificado quedan todos aquí.',
  subtituloEntrar: 'Qué bueno verte de nuevo. ¿Seguimos con tu hebreo?',
  comoQuerSerChamado: 'Cómo quieres que te llamemos',
  exemploNome: 'ej.: Daniel',
  email: 'Correo electrónico',
  exemploEmail: 'ej.: tu@ejemplo.com',
  confiraEmail: 'Revísalo con cuidado: ahí llegan el recibo de la compra y el enlace de la contraseña.',
  senha: 'Contraseña',
  peloMenos: (n: number) => `Al menos ${n} caracteres.`,
  liEAceito: 'Leí y acepto los',
  termosDeUso: 'Términos de Uso',
  comoTratamos: 'Cómo tratamos tus datos:',
  politicaDePrivacidade: 'Política de Privacidad',
  criando: 'Creando…',
  entrando: 'Entrando…',
  criarConta: 'Crear cuenta',
  esqueciSenha: 'Olvidé mi contraseña',
  jaTemConta: '¿Ya tienes cuenta?',
  aindaNaoComprou: '¿Todavía no lo compraste?',
  verOCurso: 'Ver el curso'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

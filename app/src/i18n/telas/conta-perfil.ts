import type { Traducao } from '..';

/* app/perfil: PerfilClient.tsx, page.tsx e compras.ts */
const pt = {
  metaTitulo: 'Sua conta - Hebraico Fluente',
  metaDescricao: 'Seus dados, seus cursos, seu progresso e suas compras.',
  fraseDeVencido: (data: string) => `Seu acesso terminou em ${data}.`,

  titulo: 'Sua conta',
  subtitulo: 'Seus dados, seus cursos e o que você já fez.',
  dados: 'Dados',
  nome: 'Nome',
  email: 'E-mail',
  contaCriadaEm: 'Conta criada em',
  trocarEmailAntes: 'Para trocar o e-mail, escreva para',
  trocarEmailDepois:
    '. O e-mail é o que identifica a conta e o que recebe o link de recuperação, então trocá-lo ' +
    'sozinho pela tela é o caminho mais curto para perder a conta por um erro de digitação.',

  seusCursos: 'Seus cursos',
  acessoAte: (data: string, dias: number | null) =>
    `Acesso até ${data}${dias !== null ? ` · ${dias} ${dias === 1 ? 'dia' : 'dias'}` : ''}`,
  acessoEncerrado: 'Acesso encerrado',
  aindaNaoLancado: 'Ainda não lançado',
  naoEstaNaConta: 'Não está na sua conta',
  ativo: 'Ativo',
  renovar: (meses: number) => `Renovar por mais ${meses} meses`,
  emBreve: 'Em breve',
  verOCurso: 'Ver o curso',
  abrirBiblioteca: 'Abrir a Minha Biblioteca',

  seuProgresso: 'Seu progresso',
  letras: 'Letras',
  curso: 'Curso',
  sequencia: 'Sequência',
  conquistas: 'Conquistas',
  dias: (n: number) => `${n} d`,
  progressoDemo:
    'Estes números são deste aparelho. Nesta versão o progresso é guardado no navegador e não ' +
    'viaja com a conta.',
  progressoSemCurso:
    'Estes números são deste aparelho. O progresso passa a viajar com a conta quando você tiver ' +
    'um curso - e o que estiver aqui vai junto.',
  progressoNaConta:
    'Seu progresso fica na sua conta e é sincronizado entre os aparelhos: o que você fizer no ' +
    'celular aparece no computador. Uma cópia continua neste aparelho: o que você fizer com a ' +
    'conexão caída fica guardado e sobe quando ela voltar. Funciona em qualquer conexão; precisa ' +
    'de internet para abrir cada aula.',
  verConquistas: 'Ver conquistas',
  meuCertificado: 'Meu certificado',

  compras: 'Compras',
  carregando: 'Carregando…',
  nenhumaCompra: 'Nenhuma compra registrada nesta conta.',
  pix: 'PIX',
  cartao: 'Cartão',
  statusPago: 'Pago',
  statusAguardando: 'Aguardando',
  statusNaoConcluido: 'Não concluído',
  statusEstornado: 'Estornado',
  statusExpirado: 'Expirado',

  sair: 'Sair',
  sairTodosAparelhos:
    'Isto desconecta a sua conta em todos os aparelhos: no celular, no tablet e em qualquer ' +
    'computador onde ela estiver aberta.',
  sairProgresso:
    'Você vai precisar do e-mail e da senha para voltar. Seu progresso fica guardado na sua conta ' +
    'e volta assim que você entrar de novo, aqui ou em qualquer outro aparelho. Ele sai deste ' +
    'navegador para que ninguém que use este computador depois de você veja o que você estudou.',
  sairMesmoAssim: 'Sair mesmo assim',
  cancelar: 'Cancelar',
  sairDaConta: 'Sair da conta',
  semCursoAtivo: 'Você está logado, mas ainda não tem nenhum curso ativo.',
  verOsCursos: 'Ver os cursos',

  meusDados: 'Meus dados',
  meusDadosTexto:
    'Uma cópia, em arquivo, de tudo o que guardamos sobre a sua conta: cadastro, compras, ' +
    'aceites, registros de acesso e progresso. Por segurança, a senha e os identificadores de ' +
    'sessão não vão no arquivo.',
  baixarMeusDados: 'Baixar meus dados',

  apagarTitulo: 'Apagar minha conta',
  /* A palavra que a pessoa escreve para confirmar. Só a tela confere. */
  palavraApagar: 'APAGAR',
  escrevaParaConfirmar: (palavra: string) => `Escreva ${palavra} no campo acima para confirmar.`,
  semVolta: 'Isto não tem volta.',
  semVoltaResto:
    ' Somem o seu e-mail, o seu nome, a sua senha, todo o seu progresso e o seu acesso ao curso.',
  suaSenha: 'Sua senha',
  escreva: (palavra: string) => `Escreva ${palavra}`,
  cliqueSemQuerer: 'Para ter certeza de que não foi um clique sem querer.',
  apagando: 'Apagando…',
  apagarParaSempre: 'Apagar minha conta para sempre',
  apagarExplicacaoAntes:
    'Você pode apagar a sua conta e todos os seus dados aqui mesmo, sem precisar pedir a ' +
    'ninguém. É definitivo, e encerra também o acesso aos cursos comprados, ',
  semReembolso: 'sem reembolso',
  apagarExplicacaoMeio:
    ' - para receber o valor de volta dentro do prazo de desistência, use antes',
  desistirDaCompra: 'Desistir da compra',
  apagarExplicacaoFim: ', em Compras.',

  avisoTitulo: 'Aviso do próximo curso',
  avisoQuero: (curso: string) => `Quero receber um e-mail quando o ${curso} abrir.`,
  avisoNota:
    'Um aviso só, quando o curso abrir, e nada mais. Você sai quando quiser, desmarcando aqui ou ' +
    'pelo link que vai no próprio e-mail.',
  avisoErro: 'Não consegui salvar agora. Tente de novo em instantes.',

  lembreteTitulo: 'Lembrete para estudar',
  lembreteQuero: 'Quero um e-mail às 19h nos dias em que eu ainda não tiver estudado.',
  lembreteNota:
    'No máximo um por dia. Depois de três lembretes sem estudo, eles param sozinhos até você voltar. ' +
    'Você desliga quando quiser, aqui ou pelo link do próprio e-mail.',

  senhaTitulo: 'Senha',
  senhasDiferentes: 'As duas senhas não são iguais.',
  senhaIgualAtual: 'A senha nova é igual à atual.',
  senhaAtualNaoConfere: 'A senha atual não confere.',
  senhaTrocada:
    'Senha trocada. Os outros aparelhos onde você estava logado foram desconectados - este continua.',
  senhaAtual: 'Senha atual',
  senhaNova: 'Senha nova',
  peloMenos: (n: number) => `Pelo menos ${n} caracteres.`,
  repitaSenhaNova: 'Repita a senha nova',
  trocando: 'Trocando…',
  trocarASenha: 'Trocar a senha',
  trocarSenhaExplicacao:
    'Trocar a senha desconecta os outros aparelhos. É o que você quer se achar que alguém entrou ' +
    'na sua conta.',

  emailNaoConfirmadoAntes: 'Seu e-mail ainda não foi confirmado. No cadastro mandamos um link para',
  emailNaoConfirmadoDepois:
    ' - abra esse e-mail com a conta aberta aqui, e pronto. Nada fica bloqueado enquanto isso.',
  linkEnviado: 'Link enviado. Ele vale por sete dias.',
  demonstracao: ' Demonstração: ',
  abrirOLink: 'abrir o link',
  enviando: 'Enviando…',
  mandarDeNovo: 'Mandar o link de novo',

  desistenciaPedidaEm: (quando: string) => `Desistência pedida em ${quando}.`,
  estornoAutomatico:
    'O estorno já foi pedido à Mercado Pago e o valor volta pela mesma forma de pagamento. O ' +
    'acesso fecha quando ela confirmar.',
  estornoManual: (dias: number) =>
    `O valor volta pela mesma forma de pagamento, em até ${dias} dias úteis.`,
  confirmaPorEmail: (email: string) =>
    `Vamos confirmar também por e-mail, em ${email}. Se a mensagem não chegar, esta linha, com a ` +
    'data e a hora, é o registro do seu pedido.',
  temCerteza: 'Tem certeza que quer desistir?',
  perdeAcesso: 'Ao desistir, você perde o acesso a:',
  perdeLicoes: (n: number) => `${n} lições, com o áudio do professor`,
  perdeExercicios: 'Os exercícios de escrita, leitura e revisão',
  perdeJogos: 'Os jogos de prática e o certificado de conclusão',
  jaDomina: (n: number, total: number) => `Até agora, você já domina ${n} de ${total} letras.`,
  motivoOpcional: 'Se quiser, conte o motivo: isso nos ajuda a melhorar o curso. É opcional.',
  prefiroNaoDizer: 'Prefiro não dizer',
  recebeAntes: 'Você recebe ',
  recebeForte: '100% do valor de volta',
  recebeDepois:
    ', sem precisar explicar o motivo, e o acesso ao curso é encerrado quando o reembolso for ' +
    'processado. Seu progresso fica guardado.',
  confirmarDesistencia: 'Confirmar desistência',
  voltar: 'Voltar',
  whatsappAntes:
    'Travou em alguma lição ou teve um problema técnico? Se preferir, fale antes com o professor',
  peloWhatsapp: 'pelo WhatsApp',
  whatsappDepois: '. Você pode desistir do mesmo jeito depois, dentro do prazo.',
  podeDesistirAte: (quando: string) => `Você pode desistir até ${quando}.`,

  verCodigoPix: 'Ver código PIX',
  pixValidoAte: (hora: string) =>
    `PIX copia e cola deste pedido, válido até as ${hora}. Se você já pagou, não pague de novo.`,
  copiado: 'Copiado ✓',
  copiarCodigo: 'Copiar código'
} as const;

const en: Traducao<typeof pt> = {
  metaTitulo: 'Your account - Hebrew Unlocked',
  metaDescricao: 'Your details, your courses, your progress and your purchases.',
  fraseDeVencido: (data: string) => `Your access ended on ${data}.`,

  titulo: 'Your account',
  subtitulo: 'Your details, your courses and what you have done so far.',
  dados: 'Details',
  nome: 'Name',
  email: 'Email',
  contaCriadaEm: 'Account created on',
  trocarEmailAntes: 'To change your email, write to',
  trocarEmailDepois:
    '. Your email is what identifies the account and what receives the recovery link, so ' +
    'changing it yourself on screen is the shortest path to losing the account over a typo.',

  seusCursos: 'Your courses',
  acessoAte: (data: string, dias: number | null) =>
    `Access until ${data}${dias !== null ? ` · ${dias} ${dias === 1 ? 'day' : 'days'}` : ''}`,
  acessoEncerrado: 'Access ended',
  aindaNaoLancado: 'Not launched yet',
  naoEstaNaConta: 'Not in your account',
  ativo: 'Active',
  renovar: (meses: number) => `Renew for another ${meses} months`,
  emBreve: 'Coming soon',
  verOCurso: 'See the course',
  abrirBiblioteca: 'Open My Library',

  seuProgresso: 'Your progress',
  letras: 'Letters',
  curso: 'Course',
  sequencia: 'Streak',
  conquistas: 'Achievements',
  dias: (n: number) => `${n} d`,
  progressoDemo:
    'These numbers are from this device. In this version your progress is stored in the browser ' +
    'and does not travel with the account.',
  progressoSemCurso:
    'These numbers are from this device. Your progress starts traveling with the account once ' +
    'you have a course - and whatever is here comes along.',
  progressoNaConta:
    'Your progress is kept in your account and synced across devices: what you do on your phone ' +
    'shows up on your computer. A copy stays on this device: what you do while offline is saved ' +
    'and uploaded when the connection comes back. It works on any connection; you need internet ' +
    'to open each lesson.',
  verConquistas: 'See achievements',
  meuCertificado: 'My certificate',

  compras: 'Purchases',
  carregando: 'Loading…',
  nenhumaCompra: 'No purchases recorded on this account.',
  // etapa 5/6: Brasil, rever
  pix: 'PIX',
  cartao: 'Card',
  statusPago: 'Paid',
  statusAguardando: 'Pending',
  statusNaoConcluido: 'Not completed',
  statusEstornado: 'Refunded',
  statusExpirado: 'Expired',

  sair: 'Sign out',
  sairTodosAparelhos:
    'This signs your account out on every device: your phone, your tablet and any computer ' +
    'where it is open.',
  sairProgresso:
    'You will need your email and password to come back. Your progress is kept in your account ' +
    'and returns as soon as you sign in again, here or on any other device. It is removed from ' +
    'this browser so that nobody who uses this computer after you can see what you studied.',
  sairMesmoAssim: 'Sign out anyway',
  cancelar: 'Cancel',
  sairDaConta: 'Sign out of the account',
  semCursoAtivo: 'You are signed in, but you do not have an active course yet.',
  verOsCursos: 'See the courses',

  meusDados: 'My data',
  meusDadosTexto:
    'A copy, as a file, of everything we keep about your account: sign-up details, purchases, ' +
    'acceptances, access records and progress. For security, your password and session ' +
    'identifiers are not included in the file.',
  baixarMeusDados: 'Download my data',

  apagarTitulo: 'Delete my account',
  palavraApagar: 'DELETE',
  escrevaParaConfirmar: (palavra: string) => `Type ${palavra} in the field above to confirm.`,
  semVolta: 'This cannot be undone.',
  semVoltaResto:
    ' Your email, your name, your password, all your progress and your access to the course ' +
    'will be gone.',
  suaSenha: 'Your password',
  escreva: (palavra: string) => `Type ${palavra}`,
  cliqueSemQuerer: 'To make sure it was not an accidental click.',
  apagando: 'Deleting…',
  apagarParaSempre: 'Delete my account forever',
  // etapa 5/6: Brasil, rever
  apagarExplicacaoAntes:
    'You can delete your account and all your data right here, without having to ask anyone. ' +
    'It is permanent, and it also ends your access to the courses you bought, ',
  semReembolso: 'with no refund',
  apagarExplicacaoMeio: ' - to get your money back within the withdrawal period, first use',
  desistirDaCompra: 'Cancel the purchase',
  apagarExplicacaoFim: ', under Purchases.',

  avisoTitulo: 'Next course notice',
  avisoQuero: (curso: string) => `I want to get an email when ${curso} opens.`,
  avisoNota:
    'A single notice, when the course opens, and nothing else. You can leave whenever you want, ' +
    'by unchecking here or through the link in the email itself.',
  avisoErro: 'I could not save that right now. Try again in a moment.',

  lembreteTitulo: 'Study reminder',
  lembreteQuero: 'I want an email at 7 pm Brazil time (UTC-3) on days when I have not studied yet.',
  lembreteNota:
    'At most one a day. After three reminders without study, they stop on their own until you come back. ' +
    'You can turn it off whenever you want, here or through the link in the email itself.',

  senhaTitulo: 'Password',
  senhasDiferentes: 'The two passwords do not match.',
  senhaIgualAtual: 'The new password is the same as the current one.',
  senhaAtualNaoConfere: 'The current password is incorrect.',
  senhaTrocada:
    'Password changed. The other devices where you were signed in have been signed out - this ' +
    'one stays.',
  senhaAtual: 'Current password',
  senhaNova: 'New password',
  peloMenos: (n: number) => `At least ${n} characters.`,
  repitaSenhaNova: 'Repeat the new password',
  trocando: 'Changing…',
  trocarASenha: 'Change password',
  trocarSenhaExplicacao:
    'Changing your password signs out your other devices. That is what you want if you think ' +
    'someone got into your account.',

  emailNaoConfirmadoAntes: 'Your email has not been confirmed yet. When you signed up we sent a link to',
  emailNaoConfirmadoDepois:
    ' - open that email while signed in here, and you are done. Nothing is blocked in the meantime.',
  linkEnviado: 'Link sent. It is valid for seven days.',
  demonstracao: ' Demo: ',
  abrirOLink: 'open the link',
  enviando: 'Sending…',
  mandarDeNovo: 'Send the link again',

  // etapa 5/6: Brasil, rever
  desistenciaPedidaEm: (quando: string) => `Cancellation requested on ${quando}.`,
  estornoAutomatico:
    'The refund has already been requested from Mercado Pago and the money goes back through ' +
    'the same payment method. Access closes once it confirms.',
  estornoManual: (dias: number) =>
    `The money goes back through the same payment method within ${dias} business days.`,
  confirmaPorEmail: (email: string) =>
    `We will also confirm by email, at ${email}. If the message does not arrive, this line, ` +
    'with the date and time, is the record of your request.',
  temCerteza: 'Are you sure you want to cancel?',
  perdeAcesso: 'If you cancel, you lose access to:',
  perdeLicoes: (n: number) => `${n} lessons, with the teacher's audio`,
  perdeExercicios: 'The writing, reading and review exercises',
  perdeJogos: 'The practice games and the certificate of completion',
  jaDomina: (n: number, total: number) => `So far, you have mastered ${n} of ${total} letters.`,
  motivoOpcional: 'If you like, tell us why: it helps us improve the course. It is optional.',
  prefiroNaoDizer: 'I prefer not to say',
  recebeAntes: 'You get ',
  recebeForte: '100% of your money back',
  recebeDepois:
    ', with no need to explain why, and your access to the course ends when the refund is ' +
    'processed. Your progress is kept.',
  confirmarDesistencia: 'Confirm cancellation',
  voltar: 'Back',
  whatsappAntes:
    'Stuck on a lesson or had a technical problem? If you prefer, talk to the teacher first',
  peloWhatsapp: 'on WhatsApp',
  whatsappDepois: '. You can still cancel afterwards, within the deadline.',
  podeDesistirAte: (quando: string) => `You can cancel until ${quando}.`,

  verCodigoPix: 'See PIX code',
  pixValidoAte: (hora: string) =>
    `PIX copy-and-paste code for this order, valid until ${hora}. If you already paid, do not pay again.`,
  copiado: 'Copied ✓',
  copiarCodigo: 'Copy code'
};

const es: Traducao<typeof pt> = {
  metaTitulo: 'Tu cuenta - Hebreo Fluido',
  metaDescricao: 'Tus datos, tus cursos, tu progreso y tus compras.',
  fraseDeVencido: (data: string) => `Tu acceso terminó el ${data}.`,

  titulo: 'Tu cuenta',
  subtitulo: 'Tus datos, tus cursos y lo que ya hiciste.',
  dados: 'Datos',
  nome: 'Nombre',
  email: 'Correo electrónico',
  contaCriadaEm: 'Cuenta creada el',
  trocarEmailAntes: 'Para cambiar el correo, escribe a',
  trocarEmailDepois:
    '. El correo es lo que identifica la cuenta y lo que recibe el enlace de recuperación, así que ' +
    'cambiarlo tú mismo en la pantalla es el camino más corto para perder la cuenta por un error al escribir.',

  seusCursos: 'Tus cursos',
  acessoAte: (data: string, dias: number | null) =>
    `Acceso hasta el ${data}${dias !== null ? ` · ${dias} ${dias === 1 ? 'día' : 'días'}` : ''}`,
  acessoEncerrado: 'Acceso terminado',
  aindaNaoLancado: 'Todavía no lanzado',
  naoEstaNaConta: 'No está en tu cuenta',
  ativo: 'Activo',
  renovar: (meses: number) => `Renovar por ${meses} meses más`,
  emBreve: 'Próximamente',
  verOCurso: 'Ver el curso',
  abrirBiblioteca: 'Abrir Mi Biblioteca',

  seuProgresso: 'Tu progreso',
  letras: 'Letras',
  curso: 'Curso',
  sequencia: 'Racha',
  conquistas: 'Logros',
  dias: (n: number) => `${n} d`,
  progressoDemo:
    'Estos números son de este dispositivo. En esta versión el progreso se guarda en el navegador y no ' +
    'viaja con la cuenta.',
  progressoSemCurso:
    'Estos números son de este dispositivo. El progreso empieza a viajar con la cuenta cuando tengas ' +
    'un curso - y lo que esté aquí se va con él.',
  progressoNaConta:
    'Tu progreso queda en tu cuenta y se sincroniza entre los dispositivos: lo que hagas en el ' +
    'celular aparece en la computadora. Una copia sigue en este dispositivo: lo que hagas sin ' +
    'conexión queda guardado y se sube cuando vuelva. Funciona con cualquier conexión; necesitas ' +
    'internet para abrir cada clase.',
  verConquistas: 'Ver logros',
  meuCertificado: 'Mi certificado',

  compras: 'Compras',
  carregando: 'Cargando…',
  nenhumaCompra: 'No hay compras registradas en esta cuenta.',
  // etapa 5/6: Brasil, rever
  pix: 'PIX',
  cartao: 'Tarjeta',
  statusPago: 'Pagado',
  statusAguardando: 'Pendiente',
  statusNaoConcluido: 'No completado',
  statusEstornado: 'Reembolsado',
  statusExpirado: 'Vencido',

  sair: 'Salir',
  sairTodosAparelhos:
    'Esto cierra la sesión de tu cuenta en todos los dispositivos: en el celular, en la tableta y en cualquier ' +
    'computadora donde esté abierta.',
  sairProgresso:
    'Vas a necesitar el correo y la contraseña para volver. Tu progreso queda guardado en tu cuenta ' +
    'y vuelve en cuanto entres de nuevo, aquí o en cualquier otro dispositivo. Se borra de este ' +
    'navegador para que nadie que use esta computadora después de ti vea lo que estudiaste.',
  sairMesmoAssim: 'Salir de todos modos',
  cancelar: 'Cancelar',
  sairDaConta: 'Salir de la cuenta',
  semCursoAtivo: 'Entraste en tu cuenta, pero todavía no tienes ningún curso activo.',
  verOsCursos: 'Ver los cursos',

  meusDados: 'Mis datos',
  meusDadosTexto:
    'Una copia, en un archivo, de todo lo que guardamos sobre tu cuenta: registro, compras, ' +
    'aceptaciones, registros de acceso y progreso. Por seguridad, la contraseña y los identificadores de ' +
    'sesión no van en el archivo.',
  baixarMeusDados: 'Descargar mis datos',

  apagarTitulo: 'Eliminar mi cuenta',
  /* A palavra que a pessoa escreve para confirmar. Só a tela confere. */
  palavraApagar: 'ELIMINAR',
  escrevaParaConfirmar: (palavra: string) => `Escribe ${palavra} en el campo de arriba para confirmar.`,
  semVolta: 'Esto no tiene vuelta atrás.',
  semVoltaResto:
    ' Desaparecen tu correo, tu nombre, tu contraseña, todo tu progreso y tu acceso al curso.',
  suaSenha: 'Tu contraseña',
  escreva: (palavra: string) => `Escribe ${palavra}`,
  cliqueSemQuerer: 'Para estar seguros de que no fue un clic sin querer.',
  apagando: 'Eliminando…',
  apagarParaSempre: 'Eliminar mi cuenta para siempre',
  // etapa 5/6: Brasil, rever
  apagarExplicacaoAntes:
    'Puedes eliminar tu cuenta y todos tus datos aquí mismo, sin tener que pedírselo a ' +
    'nadie. Es definitivo, y también termina el acceso a los cursos que compraste, ',
  semReembolso: 'sin reembolso',
  apagarExplicacaoMeio:
    ' - para recibir tu dinero de vuelta dentro del plazo para cancelar, usa antes',
  desistirDaCompra: 'Cancelar la compra',
  apagarExplicacaoFim: ', en Compras.',

  avisoTitulo: 'Aviso del próximo curso',
  avisoQuero: (curso: string) => `Quiero recibir un correo cuando abra ${curso}.`,
  avisoNota:
    'Un solo aviso, cuando abra el curso, y nada más. Sales cuando quieras, desmarcando aquí o ' +
    'con el enlace que viene en el propio correo.',
  avisoErro: 'No pude guardar ahora. Vuelve a intentarlo en un momento.',

  lembreteTitulo: 'Recordatorio para estudiar',
  lembreteQuero: 'Quiero un correo a las 19 h, hora de Brasil (UTC-3), los días en que todavía no haya estudiado.',
  lembreteNota:
    'Como máximo uno por día. Después de tres recordatorios sin estudio, se detienen solos hasta que vuelvas. ' +
    'Lo desactivas cuando quieras, aquí o con el enlace del propio correo.',

  senhaTitulo: 'Contraseña',
  senhasDiferentes: 'Las dos contraseñas no son iguales.',
  senhaIgualAtual: 'La contraseña nueva es igual a la actual.',
  senhaAtualNaoConfere: 'La contraseña actual no es correcta.',
  senhaTrocada:
    'Contraseña cambiada. Se cerró la sesión en los otros dispositivos donde habías entrado - este sigue.',
  senhaAtual: 'Contraseña actual',
  senhaNova: 'Contraseña nueva',
  peloMenos: (n: number) => `Al menos ${n} caracteres.`,
  repitaSenhaNova: 'Repite la contraseña nueva',
  trocando: 'Cambiando…',
  trocarASenha: 'Cambiar la contraseña',
  trocarSenhaExplicacao:
    'Cambiar la contraseña cierra la sesión en los otros dispositivos. Es lo que quieres si crees que alguien entró ' +
    'en tu cuenta.',

  emailNaoConfirmadoAntes: 'Tu correo todavía no está confirmado. Al registrarte enviamos un enlace a',
  emailNaoConfirmadoDepois:
    ' - abre ese correo con la cuenta abierta aquí, y listo. Mientras tanto no se bloquea nada.',
  linkEnviado: 'Enlace enviado. Vale por siete días.',
  demonstracao: ' Demostración: ',
  abrirOLink: 'abrir el enlace',
  enviando: 'Enviando…',
  mandarDeNovo: 'Enviar el enlace de nuevo',

  // etapa 5/6: Brasil, rever
  desistenciaPedidaEm: (quando: string) => `Cancelación pedida el ${quando}.`,
  estornoAutomatico:
    'El reembolso ya se pidió a Mercado Pago y el dinero vuelve por el mismo medio de pago. El ' +
    'acceso se cierra cuando lo confirme.',
  estornoManual: (dias: number) =>
    `El dinero vuelve por el mismo medio de pago, en hasta ${dias} días hábiles.`,
  confirmaPorEmail: (email: string) =>
    `También lo vamos a confirmar por correo, a ${email}. Si el mensaje no llega, esta línea, con la ` +
    'fecha y la hora, es el registro de tu pedido.',
  temCerteza: '¿Seguro que quieres cancelar?',
  perdeAcesso: 'Si cancelas, pierdes el acceso a:',
  perdeLicoes: (n: number) => `${n} lecciones, con el audio del profesor`,
  perdeExercicios: 'Los ejercicios de escritura, lectura y repaso',
  perdeJogos: 'Los juegos de práctica y el certificado de finalización',
  jaDomina: (n: number, total: number) => `Hasta ahora, ya dominas ${n} de ${total} letras.`,
  motivoOpcional: 'Si quieres, cuéntanos el motivo: nos ayuda a mejorar el curso. Es opcional.',
  prefiroNaoDizer: 'Prefiero no decirlo',
  recebeAntes: 'Recibes ',
  recebeForte: 'el 100% de tu dinero de vuelta',
  recebeDepois:
    ', sin tener que explicar el motivo, y el acceso al curso termina cuando se procese el ' +
    'reembolso. Tu progreso queda guardado.',
  confirmarDesistencia: 'Confirmar la cancelación',
  voltar: 'Volver',
  whatsappAntes:
    '¿Te trabaste en alguna lección o tuviste un problema técnico? Si prefieres, habla antes con el profesor',
  peloWhatsapp: 'por WhatsApp',
  whatsappDepois: '. Puedes cancelar igual después, dentro del plazo.',
  podeDesistirAte: (quando: string) => `Puedes cancelar hasta el ${quando}.`,

  verCodigoPix: 'Ver código PIX',
  pixValidoAte: (hora: string) =>
    `Código PIX copiar y pegar de este pedido, válido hasta las ${hora}. Si ya pagaste, no pagues de nuevo.`,
  copiado: 'Copiado ✓',
  copiarCodigo: 'Copiar código'
};

export const DICIONARIO = { pt, en, es };
export const tx = process.env.NEXT_PUBLIC_LOCALE === 'en' ? en : process.env.NEXT_PUBLIC_LOCALE === 'es' ? es : pt;

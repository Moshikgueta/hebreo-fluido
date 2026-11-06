import type { Metadata } from 'next';
import Link from 'next/link';
import { meta } from '@/lib/seo';
import { PrivacyEn } from '@/components/legal/en/PrivacyEn';
import { PrivacyEs } from '@/components/legal/es/PrivacyEs';
import { Artigo, LegalPage, Lista } from '@/components/legal/Legal';
import { Card } from '@/components/ui/Card';
import { empresa, lembreteLigado, soPix } from '@/lib/empresa';

export const metadata: Metadata = meta({
  rota: '/privacidade',
  title: process.env.NEXT_PUBLIC_LOCALE === 'en' ? 'Privacy Policy - Hebraico Fluente'
    : process.env.NEXT_PUBLIC_LOCALE === 'es' ? 'Política de Privacidad - Hebraico Fluente' : 'Política de Privacidade - Hebraico Fluente',
  description: process.env.NEXT_PUBLIC_LOCALE === 'en'
    ? 'What data is collected, what for, who it is shared with, how long it is kept, and how to use your data protection rights.'
    : process.env.NEXT_PUBLIC_LOCALE === 'es'
    ? 'Qué datos se recopilan, para qué, con quién se comparten, cuánto tiempo se guardan y cómo ejercer tus derechos sobre tus datos.'
    : 'Quais dados são coletados, para quê, com quem são compartilhados, por quanto ' +
    'tempo ficam guardados, e como exercer seus direitos de titular pela LGPD.'
});

/* A Política de Privacidade.
 * ─────────────────────────────────────────────────────────────────────────
 * Escrita a partir do que o sistema REALMENTE faz, e não de um modelo. Cada
 * linha da tabela de dados corresponde a algo que existe no código: as contas
 * em `accounts`, o progresso em `progress`, os pedidos em `orders`, os eventos
 * de analytics em lib/analytics.ts (que só saem do navegador como contagens
 * somadas por dia, sem identificar ninguém - lib/estatisticas.ts -, e isso
 * está dito). Uma política que descreve um produto genérico é pior do que
 * nenhuma: ela promete o que ninguém conferiu.
 */
export default function Page() {
  /* O site em inglês tem o próprio documento (PLANO-INGLES.md, etapa 6). */
  if (process.env.NEXT_PUBLIC_LOCALE === 'en') return <PrivacyEn />;
  if (process.env.NEXT_PUBLIC_LOCALE === 'es') return <PrivacyEs />;
  const { contato, privacidade, nomeFantasia } = empresa;

  const DADOS: [string, string, string][] = [
    ['Nome e e-mail', 'criar e identificar sua conta, e falar com você sobre a compra',
     'enquanto a conta existir'],
    ['Senha', 'entrar na plataforma - guardada como hash PBKDF2, nunca em texto puro',
     'enquanto a conta existir'],
    /* 30/09/2026: a caixa "Li e aceito os Termos de Uso" do cadastro
       (tabela aceites, worker/src/api/auth.js). */
    ['Aceite dos Termos de Uso, que inclui a declaração de idade do artigo 3 (18 anos ou mais, ou responsável legal): a data e a versão dos Termos que você aceitou ao criar a conta',
     'provar o contrato entre você e o curso',
     'enquanto a conta existir'],
    ['Progresso de estudo', 'mostrar onde você parou, escolher a próxima revisão e emitir o certificado',
     'enquanto a conta existir, ou até você apagar'],
    ['Dados do pedido', 'registrar a compra, liberar o acesso e cumprir obrigação fiscal',
     'pelo prazo legal de guarda fiscal'],
    /* 06/11/2026, pedido do dono depois de falar com o contador: o nome
       completo e o CPF no checkout, para a nota fiscal (worker/src/lib/cpf.js,
       colunas orders.nome_completo e orders.cpf). */
    ['Nome completo e CPF, pedidos no checkout',
     'emitir a nota fiscal da compra e cumprir obrigação fiscal. Não são enviados ao processador de pagamento',
     'numa compra paga, pelo prazo legal de guarda fiscal, mesmo se você apagar a conta; num pedido que não foi pago, até você apagar a conta'],
    /* O que o provedor nos devolve, e que fica gravado. A lista exata é
       GUARDAR, em worker/src/lib/db.js: tudo que não está nela é descartado
       antes de a linha existir - inclusive e-mail do pagador, CPF e os
       dígitos do cartão. Descrever isto aqui é o que permite dizer, na
       seção 3, que não guardamos dado de cartão sem estar exagerando. */
    ...(soPix() ? [] : [[
      'Resultado do pagamento',
      'confirmar a compra, liberar o acesso e tratar estorno - o que a Mercado Pago responde sobre o pagamento: situação, valor, moeda, forma e a referência do pedido. Sem dados do pagador e sem dados de cartão',
      'pelo prazo legal de guarda fiscal'
    ] as [string, string, string]]),
    ['Confirmação de e-mail', 'provar que o endereço da conta é seu (o link que mandamos no cadastro)',
     'enquanto a conta existir'],
    /* 28/09/2026 (auditoria, LEGAL-019): a lista do aviso do próximo curso,
       só com consentimento. Ver worker/src/api/novidades.js. */
    ['Pedido para receber o aviso do próximo curso (só se você marcar em Sua conta)',
     'mandar um e-mail quando o próximo curso abrir - base legal: o seu consentimento, que você retira quando quiser',
     'até você desmarcar, sair pelo link do e-mail ou apagar a conta'],
    /* Marco Civil da Internet, art. 15 (24/09/2026): o provedor de aplicação
       guarda os registros de acesso por seis meses, em sigilo. Ver a tabela
       registros_acesso em worker/schema.sql. */
    ['Registro de acesso: endereço IP, data e hora de cada entrada na conta',
     'cumprir o Marco Civil da Internet (Lei 12.965/2014, art. 15). Fica em sigilo e só é entregue por ordem judicial',
     'seis meses, e então é apagado - inclusive se você apagar a conta antes'],
    /* 28/09/2026 (auditoria, LEGAL-002): o IP do pedido de desistência não
       estava descrito e ficava para sempre. Agora sai em 190 dias
       (arrependimentosIpPurge em worker/src/lib/db.js). */
    ['Pedido de desistência da compra: data, hora e endereço IP de quando você pediu',
     'provar que você desistiu dentro do prazo do art. 49 do CDC, e fazer o estorno',
     'a data e a hora, junto com o registro da compra; o endereço IP, seis meses'],
    /* 04/10/2026: o motivo opcional (worker/src/lib/motivos.js). Vai só no
       aviso ao atendimento; no banco fica um contador por dia, sem conta. */
    ['Motivo da desistência, se você escolher um (é opcional)',
     'entender por que as pessoas desistem e melhorar o curso',
     'vai no aviso de desistência para a caixa do atendimento; no site fica só um total por dia, sem o seu nome, apagado em um ano'],
    /* access_log: 180 dias (logPurge), com o id da conta e sem e-mail. */
    ['Trilha de operações da conta: o que aconteceu e quando (compra, liberação, estorno, troca de senha, e o dia em que o conteúdo do curso foi aberto), sem o seu e-mail',
     'segurança, atendimento e prova do que foi feito na sua conta',
     'seis meses, e então é apagada - inclusive se você apagar a conta antes'],
    /* 29/09/2026: o limite de três aparelhos e a marca contra cópia
       (worker/src/lib/aparelhos.js e lib/marca.js). */
    ['Aparelhos conectados: um código aleatório e a data de cada entrada na conta, sem modelo do aparelho, navegador nem IP',
     'manter a conta conectada em no máximo três aparelhos, e perceber quando um mesmo login é dividido entre várias pessoas',
     'enquanto o aparelho estiver conectado; sai quando você sai da conta, quando um quarto aparelho entra ou quando a conta é apagada'],
    ['Marca da sua cópia do curso: um número aleatório, sem relação com o seu nome ou e-mail, gravado de forma invisível no conteúdo que você recebe',
     'proteger o curso contra cópia: identificar de qual conta saiu uma cópia publicada sem autorização',
     'enquanto a conta existir'],
    /* 29/09/2026: o depoimento (worker/src/api/depoimentos.js). */
    ['Depoimento (só se você escrever um em /depoimento): o texto, a forma de assinar que você escolher (nome e cidade, iniciais ou sem nome) e as suas duas escolhas, publicar e ser contatado',
     'ouvir a sua opinião sobre o curso e, só com a sua autorização, publicá-la no site e em materiais de divulgação - base legal: o seu consentimento, que você retira quando quiser na mesma página',
     'até você retirar o depoimento ou apagar a conta; se ele estiver publicado, sai em até 7 dias'],
    ['E-mail de quem recebe um curso de presente',
     'liberar o curso quando a pessoa presenteada criar a conta',
     'até o presente ser usado ou cancelado'],
    ['Endereço de IP (freio de tentativas)', 'segurança: limitar tentativas de login e identificar abuso',
     'dois dias, em registro técnico']
  ];

  const DIREITOS = [
    'confirmar que tratamos dados seus, e acessar esses dados',
    'corrigir dados incompletos, inexatos ou desatualizados',
    'pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade',
    'pedir a portabilidade dos seus dados',
    'ser informado sobre com quem compartilhamos seus dados',
    'revogar o consentimento, quando o tratamento se basear nele',
    'se opor a um tratamento, quando ele se basear em legítimo interesse'
  ];

  return (
    <LegalPage
      documento="privacidade"
      cta={false}
      titulo="Política de Privacidade"
      resumo={
        `Quais dados o ${nomeFantasia} coleta, para que servem, com quem são ` +
        'compartilhados e como você exerce os seus direitos. Em português, sem juridiquês.'
      }
    >
      <Artigo n={1} titulo="Quem trata os seus dados">
        <p>
          O controlador dos dados é o fornecedor identificado no fim desta página.
          Qualquer pedido sobre dados pessoais pode ser feito por e-mail, no endereço
          indicado no item 6.
          {privacidade.encarregadoNome
            ? ` O encarregado pelo tratamento de dados é ${privacidade.encarregadoNome}.`
            /* 01/10/2026: a empresa é ME (confirmado pelo contador). */
            : privacidade.agentePequenoPorte
              ? ' Por ser microempresa, o controlador é agente de tratamento de pequeno porte e está' +
                ' dispensado de indicar um encarregado (Resolução CD/ANPD nº 2/2022, art. 11). O canal' +
                ' de comunicação para tudo o que diz respeito aos seus dados é esse e-mail, e ele é' +
                ` respondido em até ${privacidade.prazoLgpdDias} dias.`
              : ''}
        </p>
      </Artigo>

      <Artigo n={2} titulo="O que coletamos, e por quê">
        <p>
          Só o necessário para o curso funcionar e para a compra existir. Não há
          coleta de dado sensível e não há perfilamento para publicidade.{' '}
          {soPix()
            ? 'No checkout pedimos o seu nome completo e o seu CPF, para a nota fiscal da compra. Não pedimos nenhum outro documento.'
            : <>No checkout pedimos o seu nome completo e o seu CPF, para a nota
                fiscal da compra. Não pedimos nenhum outro documento. A Mercado
                Pago pode pedir o seu CPF de novo na tela de pagamento dela, por
                exigência do meio de pagamento: esse que ela pede fica com ela.</>}
        </p>
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse font-ui text-[14px]">
            <thead>
              <tr className="text-left">
                {['Dado', 'Para quê', 'Por quanto tempo'].map(h => (
                  <th key={h} className="px-4 py-2.5 border-b border-[color:var(--line-soft)]
                                         font-ui text-[12px] uppercase tracking-[.06em] text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DADOS.map(([dado, fim, prazo]) => (
                <tr key={dado} className="align-top">
                  <td className="px-4 py-2.5 border-b border-[color:var(--line-soft)] text-ink font-medium">
                    {dado}
                  </td>
                  <td className="px-4 py-2.5 border-b border-[color:var(--line-soft)] text-ink-body">
                    {fim}
                  </td>
                  <td className="px-4 py-2.5 border-b border-[color:var(--line-soft)] text-ink-muted">
                    {prazo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p>
          A base legal é a <strong>execução do contrato</strong> que você fez conosco
          (art. 7º, V da LGPD) para tudo que diz respeito ao acesso e ao progresso, o{' '}
          <strong>cumprimento de obrigação legal</strong> (art. 7º, II) para os dados
          fiscais do pedido e para o registro de acesso exigido pelo Marco Civil da
          Internet, e o <strong>legítimo interesse</strong> para os registros de
          segurança e para as cópias de segurança.
        </p>
        {/* 28/09/2026: o backup diário (scripts/backup-nuvem.sh). A exclusão
            vale na hora no sistema, mas a cópia de ontem continua existindo
            até expirar - dizer isso é o que a auditoria pediu (LEGAL-007). */}
        <p>
          <strong>Cópias de segurança.</strong> Uma vez por dia fazemos uma cópia do
          banco de dados, guardada de forma privada na Cloudflare e, cifrada (ilegível
          sem a nossa senha), também no Google Drive, para recuperar o serviço se algo
          der errado. Cada cópia é apagada automaticamente depois de{' '}
          <strong>90 dias</strong>. Se você apagar a conta, os seus dados saem do
          sistema na hora e das cópias quando elas expiram; enquanto isso, as cópias só
          são usadas para restaurar o serviço, nunca para outro fim.
        </p>
        {/* 25/09/2026: o aluno pode gravar a própria leitura
            (components/learn/GravarLeitura.tsx). O microfone só abre nas
            páginas do curso, e o áudio nunca sai do aparelho - por isso ele
            não é dado que tratamos, e não entra na tabela acima. */}
        <p>
          <strong>Gravação da sua voz.</strong> Nas lições, nos textos de leitura e na
          demonstração da página inicial (mesmo sem conta) você pode gravar a própria
          leitura para se ouvir. O navegador pede permissão para
          usar o microfone, e a gravação fica só no seu aparelho: some quando você sai
          da página e nunca é enviada para nós nem para ninguém.
        </p>
        {/* 27/09/2026: "Fale e seja corrigido" (components/learn/FalarECorrigir.tsx,
            lib/fala.ts). A transcrição é do reconhecimento de fala do próprio
            navegador; o curso não recebe o áudio, só o texto transcrito, e
            não o guarda. */}
        <p>
          <strong>Correção da pronúncia.</strong> Se você usar &ldquo;Fale e seja
          corrigido&rdquo;, nas lições ou na demonstração da página inicial, a sua fala é transcrita pelo serviço de reconhecimento de
          voz do seu navegador - o do Google, no Chrome e no Android, ou o da Apple, no
          Safari e no iPhone -, sob as regras de privacidade de quem fez o navegador. O
          curso não recebe o seu áudio: recebe só o texto transcrito, compara com a
          palavra na tela e não o guarda. Se preferir que a sua voz não saia do
          aparelho, use só o &ldquo;Gravar a minha&rdquo;.
        </p>
      </Artigo>

      <Artigo n={3} titulo="Com quem compartilhamos">
        <p>
          Com o mínimo possível, e nunca para venda de dados - não vendemos, alugamos
          nem cedemos dados pessoais a ninguém.
        </p>
        {/* Quem recebe dado pessoal muda com o trilho de cobrança. No PIX
            direto não existe intermediário: o pagamento acontece entre o banco
            do comprador e o nosso, e nenhum dado dele sai daqui por causa da
            cobrança. Listar um processador que não recebe nada é descrever um
            compartilhamento que não existe, e uma política de privacidade só
            vale pelo que ela descreve com precisão. */}
        <Lista itens={[
          soPix()
            ? <><strong>Seu banco e o nosso</strong>: o PIX é pago dentro do aplicativo do seu banco. Nós só geramos o código de cobrança - <strong>nenhum dado seu é enviado a um processador de pagamento</strong>, e dados de cartão não são pedidos nem recebidos em lugar nenhum.</>
            /* A frase antiga dizia que os dados do cartão "nunca passam pelos
               nossos servidores". A resposta da Mercado Pago a uma consulta
               nossa PODE trazer os primeiros e os últimos dígitos e o nome
               impresso no cartão - eles são descartados antes de qualquer
               gravação (a lista GUARDAR em worker/src/lib/db.js), mas passam.
               "Não guardamos" é verdade e é verificável; "nunca passam" era
               uma promessa mais forte do que o código sustenta. */
            : <><strong>Mercado Pago</strong>: recebe o seu <strong>e-mail</strong> e o seu <strong>nome</strong> para emitir a cobrança, processa o pagamento e nos devolve o resultado. O número do cartão, a validade e o código de segurança são digitados no ambiente dela: nós não pedimos esses dados e <strong>não guardamos nenhum deles</strong> - o que a resposta dela traz é filtrado antes de ser gravado, e só ficam os campos listados na tabela acima.</>,
          /* A Resend estava fora desta lista, e é um operador como os outros:
             recebe endereço e nome de todo mundo que pede um link de
             senha. Omiti-la deixava a política descrevendo menos
             compartilhamento do que o sistema faz. */
          <><strong>Resend</strong>: entrega os nossos e-mails (recuperação de senha, confirmação da compra, até três lembretes para começar o curso nos primeiros dias depois da compra e avisos da sua conta). Para isso, recebe o <strong>seu endereço de e-mail e o nome da sua conta</strong>. E-mail de propaganda, só para quem pediu: o aviso de que o próximo curso abriu, para quem marcou esse pedido em Sua conta, e a lista de interessados descrita no artigo 4, para quem se inscreveu e confirmou. Cada um desses e-mails traz o link para sair da lista.</>,
          <><strong>Infraestrutura</strong>: a plataforma roda na Cloudflare, que hospeda o site, o banco de dados e as cópias de segurança. Uma segunda cópia de segurança, cifrada, fica no Google Drive; o Google guarda o arquivo, mas não consegue lê-lo.</>,
          /* 28/09/2026 (auditoria, LEGAL-003): o GitHub e o atendimento
             estavam fora da lista, e os dois recebem dado pessoal. */
          <><strong>GitHub</strong>: guarda o código do site e as ferramentas de operação. Quando consultamos ou mudamos o acesso de uma conta (por exemplo, para liberar um curso ou corrigir um e-mail), a operação roda lá, e o registro dela mostra o e-mail parcialmente escondido.</>,
          <><strong>Atendimento</strong>: se você nos escreve, a mensagem fica na caixa de e-mail do atendimento (Gmail, do Google) ou no WhatsApp (da Meta). Os avisos de compra e de desistência chegam a essa mesma caixa, com o seu e-mail.</>,
          <><strong>Autoridades</strong>, quando houver ordem legal para isso.</>
        ]} />
        {/* Transferência internacional (LGPD, art. 33). A Resend e a
            Cloudflare são empresas de fora, e a base é a execução do contrato
            - dizer isso em uma frase custa uma frase, e a ausência dela é
            achado de auditoria. */}
        <p>
          A Resend, a Cloudflare, o GitHub, o Google e a Meta são empresas sediadas
          fora do Brasil, e parte do tratamento acontece em servidores no exterior.
          A Mercado Pago, que processa o pagamento, também pode tratar dados fora do
          Brasil, conforme a política de privacidade dela. Essa transferência é
          necessária para a execução do contrato que você fez conosco - é o que
          permite o site responder, o pagamento acontecer, o e-mail chegar e o
          atendimento acontecer - e está amparada no art. 33 da LGPD.
        </p>
      </Artigo>

      <Artigo n={4} titulo="Cookies e medição">
        <p>
          Usamos um <strong>cookie de sessão</strong>, necessário para manter você
          logado. Ele é assinado, tem validade curta e não serve para rastrear
          navegação fora daqui.
        </p>
        <p>
          O navegador também guarda o seu progresso localmente, para o curso funcionar
          sem internet, e algumas preferências suas (como os ajustes de
          acessibilidade). Isso fica só no seu aparelho. Não usamos cookies de publicidade, nem rede de anúncio, nem
          script de terceiros para medir audiência.
        </p>
        <p>
          Entre 28/09 e 01/10/2026 testamos duas versões da página inicial. O teste acabou:
          o navegador não guarda mais qual versão você viu, e o que ficou no servidor são só
          totais por dia, sem nome, e-mail, conta nem endereço de IP.
        </p>
        {/* 30/09/2026: worker/src/api/estatisticas.js. A faixa de tempo entrou em 28/10/2026
            (app/src/lib/tempo-de-etapa.ts). */}
        <p>
          Para melhorar as aulas, quem está conectado ao curso manda também, em lote, só contagens de
          aprendizagem: que tipo de exercício, de qual lição, se a resposta foi certa ou errada, e que etapa de
          qual lição foi concluída pela primeira vez, com a faixa de tempo que ela levou (por exemplo, "entre 2
          e 4 minutos", contando só o tempo em que a página estava à vista e em uso; nunca o tempo exato). O
          servidor soma esses números por dia e não guarda nome, e-mail, conta, endereço de IP, horário nem o
          que você digitou. Os totais saem depois de um ano.
        </p>
        {/* 03/10/2026: worker/src/api/estatisticas.js, contarDemo. */}
        <p>
          No teste grátis da página do curso de hebraico, o navegador manda só o nome de cada etapa que você
          alcançou, uma vez por visita, para sabermos onde as pessoas param. O servidor soma esses números por dia e
          não guarda nome, e-mail, conta, endereço de IP, horário nem as suas respostas. Os totais saem depois de um ano.
        </p>
        {/* 23/10/2026: worker/src/api/estatisticas.js, contarPortal. 24/10/2026: e a /comece-aqui (eventos comece-*). */}
        <p>
          Na página inicial e na página &quot;Comece aqui&quot;, do mesmo jeito, o navegador manda só o nome do caminho ou do produto que você abriu (por
          exemplo, &quot;Descobrir Israel&quot;), uma vez por visita, para sabermos o que interessa a quem chega. O
          servidor soma por dia e não guarda nome, e-mail, conta, endereço de IP, horário nem cookie. Os totais saem
          depois de um ano.
        </p>
        {/* 23/10/2026: a origem da visita (app/src/lib/origem.ts, worker/src/lib/origem.js). */}
        <p>
          Na primeira página que você abre, o navegador anota de onde você veio, numa lista fechada de categorias
          (por exemplo, &quot;link da bio&quot;, &quot;busca&quot;, &quot;e-mail&quot; ou &quot;anúncio&quot;), e, se o
          link tiver, o nome da campanha. Essa anotação fica guardada no seu aparelho por 30 dias, sem cookie. Ela vai
          para o servidor só quando você abre a página de venda, começa ou termina o teste grátis, ou abre o checkout, somada por dia como as outras contagens,
          e no pedido, se você comprar, para sabermos quais canais trazem alunos. Não guardamos de qual site exato você
          veio nem o endereço de IP.
        </p>
        {/* 23/10/2026: a prévia do e-book em /previa (eventos previa-*, contarPortal). */}
        <p>
          Na prévia gratuita do e-book, que não pede conta, o contador é o mesmo: o navegador manda só o nome do que
          você fez (abrir a prévia, encher a mochila, montar um prato, abrir o diário, ir para o curso), uma vez por
          visita. O que você escreve no diário e marca nas atividades fica guardado só no seu aparelho e não é enviado.
        </p>
        {/* 03/10/2026: worker/src/api/segunda-letra.js. */}
        <p>
          No fim desse teste, você pode pedir a segunda letra por e-mail. Se você não marcar a caixa das próximas
          letras, o endereço que você digita é usado só para mandar esse e-mail e não é guardado nem entra em lista
          nenhuma. Para não mandar duas vezes no mesmo dia, o servidor guarda por até 48 horas um código calculado a
          partir do endereço, que não permite recuperá-lo.
        </p>
        {/* 23/10/2026: a lista de interessados (worker/src/api/interessados.js, sequencia.js). */}
        <p>
          <strong>A lista de interessados.</strong> Se você marcar a caixa das próximas letras no fim do teste, ou
          pedir o aviso de um curso ou livro que ainda não está à venda, guardamos o seu e-mail, o que você pediu, a
          categoria de onde você veio (como &quot;link da bio&quot; ou &quot;busca&quot;) e as datas da inscrição. A
          base legal é o seu consentimento (LGPD, art. 7º, I). A inscrição só vale depois que você confirma pelo link
          do primeiro e-mail; sem a confirmação, nada mais é mandado e o endereço é apagado em 7 dias. Quem pediu as
          próximas letras recebe cinco e-mails em cerca de duas semanas (o último fala do curso e do preço) e, depois
          deles, só novidades de verdade, como um curso novo. Quem pediu um aviso recebe só o aviso. Todo e-mail da
          lista traz o link para sair, que funciona sem login; ao sair, o seu e-mail é apagado da lista e não mandamos
          mais nada. Se você comprar o
          curso, os e-mails das próximas letras param. O e-mail é entregue pela Resend e não é vendido nem compartilhado com
          mais ninguém.
        </p>
        {/* 28/10/2026: o lembrete para estudar (worker/src/lembrete.js). Só
            aparece com a chave ligada em data/empresa.json, que é também o que
            liga a caixa do perfil e o envio: a política nunca descreve menos
            do que o site faz, nem mais. TEXTO PARA APROVAÇÃO do dono. */}
        {lembreteLigado() && (
          <p>
            <strong>O lembrete para estudar.</strong> Se você ligar o lembrete em Sua conta, mandamos um e-mail
            curto, no máximo um por dia e a partir das 19h (horário de Brasília), nos dias em que o seu progresso
            ainda não mostra estudo. Para isso o servidor lê o seu progresso, que já guardamos para sincronizar os
            aparelhos, e guarda a data em que você ligou o lembrete, o último dia em que ele foi conferido e quantos
            lembretes seguidos saíram sem estudo: no terceiro, eles param até você voltar. A base legal é o seu
            consentimento (LGPD, art. 7º, I). Você desliga em Sua conta ou pelo link de todo lembrete, que funciona
            sem login; ao desligar, ou ao apagar a conta, esses dados são apagados. O e-mail é entregue pela Resend.
          </p>
        )}
      </Artigo>

      <Artigo n={5} titulo="Segurança">
        <Lista itens={[
          'Senhas guardadas como hash com sal (PBKDF2), nunca em texto legível.',
          'Todo o tráfego em HTTPS.',
          'Cookie de sessão HttpOnly - o JavaScript da página não consegue lê-lo.',
          'Freio de tentativas no login, contra teste automatizado de senhas.',
          'Acesso ao banco restrito à aplicação.',
          'Cópia de segurança diária, privada, com a restauração testada.'
        ]} />
        <p>
          Nenhum sistema é perfeito. Se houver incidente de segurança com risco
          relevante aos seus dados, comunicaremos você e a ANPD, conforme o art. 48 da
          LGPD.
        </p>
      </Artigo>

      <Artigo n={6} titulo="Seus direitos, e como exercê-los">
        <p>Pela LGPD (art. 18), você tem direito a:</p>
        <Lista itens={DIREITOS} />
        <Card tone="mint" className="p-5 grid gap-2">
          <p className="font-display text-[16px] font-bold text-ink">
            Canal para pedidos sobre dados pessoais
          </p>
          <p>
            Escreva para{' '}
            <a href={`mailto:${contato.emailPrivacidade}?subject=${encodeURIComponent('Pedido LGPD - titular de dados')}`}
               className="font-semibold text-[var(--accent)] hover:underline break-all">
              {contato.emailPrivacidade}
            </a>{' '}
            com o assunto <em>Pedido LGPD</em>, a partir do e-mail cadastrado na sua
            conta. Respondemos em até <strong>{privacidade.prazoLgpdDias} dias</strong>.
          </p>
          <p className="font-ui text-[13.5px] text-ink-muted">
            Pedimos que o pedido venha do e-mail da conta porque é como confirmamos que
            você é você - atender um pedido de exclusão vindo de outra pessoa seria o
            problema que esta política existe para evitar.
          </p>
        </Card>
        {/* Desde 22/09/2026 a exclusão é self-service, e este parágrafo mudou
            junto. Ele dizia que apagar a conta passava pelo canal de e-mail -
            uma política que descreve um produto que não existe mais é pior do
            que não ter política, porque é a promessa escrita que vale. */}
        {/* 01/10/2026 (LEGAL-122): o acesso e a portabilidade também são
            self-service, pela rota /api/account/dados. */}
        <p>
          <strong>Baixar uma cópia dos seus dados você também faz sozinho</strong>, na{' '}
          <Link href="/perfil" className="font-semibold text-[var(--accent)] hover:underline">
            página da sua conta
          </Link>
          , em <em>Baixar meus dados</em>: sai um arquivo com o cadastro, as compras, os
          aceites, os registros de acesso e o progresso. Por segurança, a senha e os
          identificadores de sessão e de aparelho não vão no arquivo.
        </p>
        <p>
          <strong>Apagar a conta você faz sozinho</strong>, a qualquer momento, na{' '}
          <Link href="/perfil" className="font-semibold text-[var(--accent)] hover:underline">
            página da sua conta
          </Link>
          . Pedimos a sua senha na hora - é o que garante que quem está apagando é
          você - e a exclusão vale na mesma hora, sem esperar por ninguém. Apagar só
          o progresso, mantendo a conta, também é seu, na página de conquistas.
        </p>
        <p>
          O que a exclusão leva: e-mail, nome, senha, progresso e acesso ao curso. O
          que ela não leva, e a lei não deixa levar: o registro das compras, que fica
          sem o seu nome e sem o seu e-mail, porque guardar nota de venda é obrigação
          de quem vende e a própria LGPD prevê essa guarda (art. 16, I). O que sobra
          é valor, data e situação do pagamento, e não aponta para você. Pelo mesmo
          motivo ficam os <strong>registros de acesso</strong> dos últimos seis meses,
          que o Marco Civil da Internet obriga a guardar; eles são apagados quando
          completam o prazo.
        </p>
        <p>
          O canal de e-mail acima continua valendo para todo o resto - acesso,
          correção, portabilidade -, e também se você preferir que a exclusão seja
          feita por nós.
        </p>
      </Artigo>

      <Artigo n={7} titulo="Crianças e adolescentes">
        <p>
          A plataforma é feita para adultos. Não direcionamos conteúdo a menores de 18
          anos nem coletamos dados deles conscientemente. Se identificarmos uma conta
          criada por menor sem o consentimento dos responsáveis, ela será removida.
        </p>
      </Artigo>

      <Artigo n={8} titulo="Mudanças nesta política">
        <p>
          Quando esta política mudar, a data no topo muda junto. Alteração relevante
          no tratamento dos seus dados é avisada por e-mail antes de valer.
        </p>
      </Artigo>
    </LegalPage>
  );
}

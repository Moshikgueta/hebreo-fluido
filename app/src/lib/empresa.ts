/* Quem vende, e como falar com quem vende.
 * ─────────────────────────────────────────────────────────────────────────
 * O Código de Defesa do Consumidor e o Decreto 7.962/2013 (o "decreto do
 * e-commerce") pedem a mesma coisa em três lugares diferentes: quem está
 * vendendo, como encontrar essa pessoa, e quais são as condições antes de
 * pagar. Este módulo é a fonte única disso no app - o rodapé, os Termos, a
 * Política de Privacidade, a de Reembolso e o checkout leem todos daqui.
 *
 * A REGRA CENTRAL, e ela vale contra o instinto de "preencher depois":
 *
 *   um dado que não se sabe NÃO APARECE. Nunca vira travessão, nunca vira
 *   "a definir", nunca vira um CNPJ de exemplo.
 *
 * Identificação de fornecedor inventada não é um rascunho: é uma declaração
 * falsa num documento que existe justamente para ser confiável. Ausente é uma
 * pendência que `npm run check-legal` cobra; inventada é um problema que
 * ninguém mais vê, porque parece pronto.
 *
 * Por isso os campos opcionais são `string | null` e todo componente pergunta
 * antes de desenhar, e por isso `identificacaoCompleta()` existe: é o que
 * separa "dá para vender com isto" de "falta coisa".
 */

import empresaJson from '@content/empresa.json';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/motor-empresa';

export type Endereco = {
  logradouro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  pais: string;
};

export type Empresa = {
  nomeFantasia: string;
  /** A razão social. `null` enquanto não for informada - ver a nota acima. */
  razaoSocial: string | null;
  /** Já formatado como se lê, `00.000.000/0001-00`. */
  cnpj: string | null;
  endereco: Endereco;
  contato: {
    email: string;
    emailSuporte: string;
    emailPrivacidade: string;
    telefone: string | null;
    whatsapp: string | null;
  };
  atendimento: {
    horarioPt: string;
    /** Em dias úteis. É o prazo que o site promete, e que precisa ser real. */
    prazoRespostaUteis: number;
  };
  privacidade: {
    encarregadoNome: string | null;
    /** Microempresa (ME), confirmado pelo contador em 01/10/2026: agente de
     *  tratamento de pequeno porte, dispensado de indicar encarregado pela
     *  Resolução CD/ANPD nº 2/2022 (art. 11), desde que mantenha o canal. */
    agentePequenoPorte?: boolean;
    /** Prazo de resposta a pedido de titular. A LGPD usa 15 dias no art. 19. */
    prazoLgpdDias: number;
    /** O lembrete para estudar existe? Ver `lembreteLigado` abaixo. */
    lembreteDeEstudo?: boolean;
  };
  politicas: {
    /** Art. 49 do CDC: sete dias para compra fora do estabelecimento. */
    arrependimentoDias: number;
    /** A garantia que ESTE produto oferece por conta própria. */
    garantiaDias: number;
    prazoReembolsoUteis: number;
    /** ISO curto, `YYYY-MM-DD`. Sai no rodapé de cada política. */
    atualizadoEm: string;
  };
  pagamento: {
    /**
     * Qual trilho de cobrança está ligado.
     *
     * `pix-direto`  BR Code gerado por nós. Não depende de adquirente nem de
     *               aprovação de ninguém - e NÃO CONFIRMA SOZINHO: o acesso
     *               é liberado à mão depois de olhar o extrato.
     * `mercadopago` PIX e cartão, com confirmação automática.
     * `paddle`      o site em inglês: cartão, PayPal, Apple Pay e Google Pay
     *               no checkout do Paddle, em dólar, com confirmação
     *               automática. Escrito pelo exportador na build em inglês.
     * `stripe`      os sites de fora desde 05/11/2026: o Checkout hospedado
     *               do Stripe, em dólar, com confirmação automática. Escrito
     *               pelo exportador quando `exterior` é "stripe".
     */
    modo: 'pix-direto' | 'mercadopago' | 'paddle' | 'stripe';
    /**
     * Quem cobra nos sites de fora (inglês e espanhol): "stripe" ou "paddle".
     * O Worker lê o mesmo campo (api/pay.js), e o exportador o transforma no
     * `modo` da build de fora. Sem ele, Paddle.
     */
    exterior?: 'stripe' | 'paddle';
    /**
     * O que DÁ para oferecer nesta build.
     *
     * No arquivo do repositório os dois são `true` - é a intenção. A cada
     * publicação, `scripts/pagamento-ativo.mjs` pergunta à Mercado Pago quais
     * meios a credencial enxerga e reescreve isto para AQUELA build. Opcional
     * no tipo porque uma build antiga não tem o campo, e ausente significa
     * "oferece os dois", que era o comportamento de antes.
     */
    formas?: { pix: boolean; cartao: boolean };
    /** A chave do PIX direto. A build em inglês (Paddle) sai sem ela. */
    pix?: {
      /** Só os caracteres da chave: CNPJ vai sem ponto, barra nem traço. */
      chave: string;
      tipoChave: 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria';
      /** Vai DENTRO do código PIX e aparece no app do comprador. */
      titular: string;
      cidade: string;
    };
  };
};

export const empresa = empresaJson as Empresa;

/** A cidade e o estado, quando existirem. "Curitiba, PR" ou `null`. */
export function cidadeUf(): string | null {
  const { cidade, uf } = empresa.endereco;
  if (!cidade) return null;
  return uf ? `${cidade}, ${uf}` : cidade;
}

/**
 * O endereço em uma linha, com o que houver.
 *
 * Devolve `null` quando não há nada - e aí o bloco inteiro some da tela, em
 * vez de aparecer como um rótulo "Endereço:" seguido de nada.
 */
export function enderecoLinha(): string | null {
  const { logradouro, cep } = empresa.endereco;
  const partes = [logradouro, cidadeUf(), cep].filter(Boolean);
  return partes.length ? partes.join(' · ') : null;
}

/**
 * Como o fornecedor se chama num documento.
 *
 * A razão social quando ela existe, porque é o nome jurídico; o nome fantasia
 * quando não, porque é melhor do que nada e é verdade.
 */
export const nomeLegal = (): string => empresa.razaoSocial ?? empresa.nomeFantasia;

/**
 * O link que abre a conversa no WhatsApp, ou `null` se não houver número.
 *
 * O `wa.me` quer só dígitos, com o país na frente e sem sinal nem separador -
 * o número na tela fica legível para humano, e o link fica legível para o
 * WhatsApp. Escrever os dois à mão é como um deles fica desatualizado.
 */
export function whatsappUrl(): string | null {
  const n = empresa.contato.whatsapp;
  if (!n) return null;
  const digitos = n.replace(/\D/g, '');
  /* Doze ou treze dígitos com o 55 na frente (fixo ou celular com o nono).
     Menos do que isso é número local, e um link errado é pior do que texto. */
  if (digitos.length < 12 || digitos.length > 13) return null;
  return `https://wa.me/${digitos}`;
}

/** Os dois juntos, quando são diferentes: "Fulano LTDA (Hebraico Fluente)". */
export function nomeLegalCompleto(): string {
  if (!empresa.razaoSocial || empresa.razaoSocial === empresa.nomeFantasia) {
    return empresa.nomeFantasia;
  }
  return `${empresa.razaoSocial} (${empresa.nomeFantasia})`;
}

/* ── como o site cobra ──────────────────────────────────────────────────── */

/**
 * Só existe PIX nesta implantação?
 *
 * Quando sim, o checkout não oferece cartão - e isso não é uma limitação
 * escondida, é a única escolha honesta: o cartão depende da Mercado Pago, e
 * oferecer uma opção que falha é pior do que oferecer só a que funciona. Quem
 * escolhe cartão, recebe erro e conclui que o site está quebrado; não volta
 * para tentar o PIX.
 */
export const soPix = (): boolean => empresa.pagamento.modo === 'pix-direto';

/** O lembrete para estudar está ligado? A mesma chave liga a caixa do perfil,
 *  o parágrafo da Política de Privacidade e, no Worker, a rota e o envio
 *  (worker/src/api/lembrete.js). Ligar é decisão do dono, junto com o texto. */
export const lembreteLigado = (): boolean => empresa.privacidade.lembreteDeEstudo === true;

/* ── o que esta build consegue cobrar ──────────────────────────────────────
 * Diferente de `soPix()`, que é uma DECISÃO (o trilho escolhido), isto é um
 * FATO: o que a credencial da Mercado Pago respondeu que a conta aceita, na
 * hora da publicação. A distinção importa porque as duas coisas divergem, e
 * foi exatamente o que aconteceu: modo `mercadopago` (queremos PIX e cartão)
 * com uma conta que só tinha cartão habilitado. O checkout oferecia PIX, e
 * quem escolhesse PIX recebia erro.
 *
 * A regra é a mesma do `soPix`: oferecer uma forma que falha é pior do que
 * oferecer só a que funciona. Quem tenta e vê erro conclui que o site está
 * quebrado, e não volta para tentar a outra.
 */
const formas = () => empresa.pagamento.formas;

export const temPix = (): boolean =>
  soPix() ? true : (formas() ? formas()!.pix : true);

export const temCartao = (): boolean =>
  soPix() ? false : (formas() ? formas()!.cartao : true);

/** As formas que esta build oferece, na ordem em que aparecem na tela. */
export const formasAtivas = (): ('pix' | 'card')[] =>
  [...(temPix() ? ['pix' as const] : []), ...(temCartao() ? ['card' as const] : [])];

/**
 * O pagamento se confirma sozinho?
 *
 * `false` no PIX direto: o dinheiro cai na conta do recebedor sem avisar
 * ninguém, e alguém libera o acesso depois de ver o extrato. A tela PRECISA
 * dizer isso - prometer liberação instantânea e entregar em duas horas gera
 * mais suporte do que prometer "em algumas horas" e entregar em dez minutos.
 */
export const confirmaSozinho = (): boolean => empresa.pagamento.modo !== 'pix-direto';

/** O site em inglês: o pagamento é o checkout do Paddle (lib/paddle-checkout.ts). */
export const pagaPeloPaddle = (): boolean => empresa.pagamento.modo === 'paddle';

/** Os sites de fora desde 05/11/2026: o Checkout hospedado do Stripe. */
export const pagaPeloStripe = (): boolean => empresa.pagamento.modo === 'stripe';

/** Um botão só, de um provedor de fora (Paddle ou Stripe): sem PIX nem parcelas. */
export const pagaDeFora = (): boolean => pagaPeloPaddle() || pagaPeloStripe();

/* ── as frases que se repetem, num lugar só (auditoria de 01/10/2026) ──────
 * Cada uma destas aparecia escrita à mão em três a nove páginas, e cada
 * página dizia uma coisa um pouco diferente: "em até 12x" sem juros no
 * checkout e com juros nos Termos (LEGAL-102); "mesmo dia útil" na FAQ e
 * "até 2 dias úteis" no rodapé (CONV-013); confirmação da desistência "na
 * hora" nos Termos e "em até 2 dias úteis" no Reembolso (LEGAL-109). Agora
 * a página pergunta aqui, e o número sai de data/empresa.json.
 */

/**
 * O parcelamento, sempre com os juros dito junto.
 *
 * "Em até 12x" sozinho é lido no varejo brasileiro como "sem juros", e aqui
 * há juros: são da Mercado Pago, cobrados do comprador, e o total aparece na
 * tela dela antes de confirmar. `check-legal.mjs` falha se o export tiver um
 * "12x" sem "juros" no mesmo trecho.
 */
export const parcelasTexto = (n: number): string => fmt(tx.parcelas, { n });

/** A versão curta, para onde não cabe o nome da Mercado Pago (a barra fixa
 *  da capa, o cartão de curso): os juros continuam ditos. */
export const parcelasCurto = (n: number): string => fmt(tx.parcelasCurto, { n });

/** A segunda metade, para onde houver espaço: quem fecha o número é a Mercado Pago. */
export const PARCELAS_TOTAL = tx.parcelasTotal;

/** "em até 2 dias úteis": o prazo de resposta do atendimento, em todo lugar. */
export const prazoResposta = (): string => {
  const n = empresa.atendimento.prazoRespostaUteis;
  return tx.prazoResposta(n);
};

/**
 * Como a desistência é confirmada, dito igual nos Termos, no Reembolso, na
 * FAQ e no /suporte.
 *
 * Só o site confirma na hora: `POST /api/pay/desistir` grava o pedido e manda
 * o e-mail no mesmo instante. O e-mail chega a uma caixa lida por uma pessoa,
 * então a confirmação dele sai no prazo do atendimento, e o que vale é a data
 * em que a pessoa escreveu.
 */
export const confirmacaoDaDesistencia = (): string =>
  fmt(tx.confirmacaoDesistencia, { prazo: prazoResposta() });

/** Desde quando contam os meses de acesso e os dias para desistir. O código
 *  conta de `paid_at`, gravado na liberação (worker/src/api/pay.js). */
export const INICIO_DO_ACESSO = tx.inicioDoAcesso;

/** Os últimos dias de acesso em que a renovação abre. O mesmo número de
 *  `RENOVACAO_MS` em worker/src/api/pay.js e do checkout. */
export const JANELA_DE_RENOVACAO_DIAS = 45;

/** Como a renovação funciona, igual ao que `grantAccess` (worker/src/lib/db.js) faz. */
export const renovacaoTexto = (meses: number): string =>
  fmt(tx.renovacao, { dias: JANELA_DE_RENOVACAO_DIAS, meses });

/**
 * Se o atendimento responde dúvida sobre o conteúdo do curso.
 *
 * TEXTO PARA APROVAÇÃO DO DONO (UXQA-016): até 01/10/2026 a FAQ dizia que o
 * suporte era "para acesso, pagamento e conta" e o /suporte convidava a
 * escrever dúvidas do curso. Esta é a resposta sugerida; trocar aqui troca
 * nas duas páginas.
 */
export const DUVIDAS_DE_CONTEUDO = tx.duvidasDeConteudo;

/**
 * O que este curso ensina e o que fica para o próximo (UXQA-010).
 *
 * TEXTO PARA APROVAÇÃO DO DONO. Sai na página do curso e na FAQ.
 */
export const O_QUE_O_CURSO_ENSINA = tx.oQueOCursoEnsina;

/* ── o que ainda falta ──────────────────────────────────────────────────── */

export type Pendencia = { campo: string; porQue: string; bloqueia: boolean };

/**
 * O que está faltando para a identificação do fornecedor estar completa.
 *
 * `bloqueia` separa o que impede vender com segurança do que é só desejável.
 * O CNPJ bloqueia porque é o identificador do fornecedor; o telefone não,
 * porque um canal de atendimento por e-mail, respondido, já é um canal.
 *
 * Esta lista é lida por `npm run check-legal` e por mais ninguém: o site não
 * mostra pendência ao visitante, ele apenas omite o que não sabe.
 */
export function pendencias(): Pendencia[] {
  const faltando: Pendencia[] = [];
  const e = empresa;

  if (!e.cnpj) faltando.push({
    campo: 'cnpj',
    porQue: 'identificação do fornecedor - é o que diz QUEM está vendendo', // i18n-ok: só para npm run check-legal
    bloqueia: true
  });
  if (!e.razaoSocial) faltando.push({
    campo: 'razaoSocial',
    porQue: 'o nome jurídico de quem vende, que acompanha o CNPJ', // i18n-ok: só para npm run check-legal
    bloqueia: true
  });
  if (!e.endereco.cidade) faltando.push({
    campo: 'endereco.cidade',
    porQue: 'endereço do fornecedor, exigido na identificação', // i18n-ok: só para npm run check-legal
    bloqueia: true
  });
  if (!e.endereco.logradouro) faltando.push({
    campo: 'endereco.logradouro',
    porQue: 'endereço completo; cidade e estado sozinhos já identificam, mas o logradouro é o que se espera', // i18n-ok: só para npm run check-legal
    bloqueia: false
  });
  if (!e.endereco.cep) faltando.push({
    campo: 'endereco.cep',
    porQue: 'completa o endereço', // i18n-ok: só para npm run check-legal
    bloqueia: false
  });
  if (!e.contato.telefone && !e.contato.whatsapp) faltando.push({
    campo: 'contato.telefone ou contato.whatsapp', // i18n-ok: só para npm run check-legal
    porQue: 'um segundo canal de atendimento; o e-mail sozinho já atende, mas dois convertem melhor', // i18n-ok: só para npm run check-legal
    bloqueia: false
  });
  if (!e.privacidade.encarregadoNome && !e.privacidade.agentePequenoPorte) faltando.push({
    campo: 'privacidade.encarregadoNome',
    porQue: 'o encarregado de dados (LGPD art. 41); o canal de e-mail já atende o titular', // i18n-ok: só para npm run check-legal
    bloqueia: false
  });

  return faltando;
}

/** Dá para vender com esta identificação? */
export const identificacaoCompleta = (): boolean =>
  pendencias().every(p => !p.bloqueia);

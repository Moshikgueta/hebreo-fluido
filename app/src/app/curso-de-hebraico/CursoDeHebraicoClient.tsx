'use client';

/* A página de venda do curso de alfabetização.
 *
 * Foi a capa (`/`) até 23/10/2026, quando a capa virou o portal das jornadas
 * (decisão do dono, master prompt "Hebraico Fluente 2.0"). Mudou de endereço,
 * não de conteúdo: os links de campanha (/sefarad, /bio, /stories, /dm) e o
 * `/?parceria=` antigo vêm direto para cá (worker.js).
 *
 * 30/09/2026, decisão do dono: a capa tinha 19 seções e 22.650 px no celular,
 * com o preço a 17.000 px de rolagem. Saíram as sete que repetiam outra
 * (Transformação, Problema, Demonstração, Recursos, AulaAmostra, Jornada e
 * AlemDoAlfabeto): ficou com 12 seções e cerca de 14.500 px. Os componentes
 * continuam em components/landing/ para voltar, se um dia fizer falta.
 * ─────────────────────────────────────────────────────────────────────────
 * Uma página de venda para adulto brasileiro que já tentou aprender hebraico
 * e parou. Três coisas ela faz e uma ela não faz.
 *
 * Faz: responde logo na segunda seção o que se aprende e os dois "nada
 * de", mostra hebraico de verdade na tela - e deixa a pessoa RESPONDER
 * uma questão - antes de pedir qualquer coisa, e diz o preço sem obrigar a
 * clicar para descobrir.
 *
 * Não faz: contagem regressiva, "restam 3 vagas", preço riscado, depoimento
 * inventado. Não porque seja feio - porque é mentira, e porque o produto aqui
 * é um curso que a pessoa vai usar por meses. Quem compra por pressão pede
 * reembolso.
 *
 * Os números vêm do catálogo e do curso construído, nunca escritos à mão: uma
 * landing que promete "14 lições" quando o curso tem outra quantidade é um
 * processo do Procon esperando acontecer. É também por isso que as seções
 * ficam em components/landing/ e não num arquivo só: cada uma lê os seus
 * próprios dados.
 */

import { Hero } from '@/components/landing/Hero';
import { FaixaDaPromocao } from '@/components/landing/FaixaDaPromocao';
import { Curriculo } from '@/components/landing/Secoes';
import { Promessa } from '@/components/landing/Promessa';
import { DemoAlef } from '@/components/landing/DemoAlef';
import { OuvirEFalar } from '@/components/landing/OuvirEFalar';
import { Decisoes } from '@/components/landing/Decisoes';
import { Plataforma } from '@/components/landing/Plataforma';
import { Resultado } from '@/components/landing/Resultado';
import { BarraFixa } from '@/components/landing/BarraFixa';
import { UmDiaNaCapa } from '@/components/landing/UmDiaNaCapa';
import { JogosNaCapa } from '@/components/landing/JogosNaCapa';
import { ComVoce } from '@/components/landing/ComVoce';
import {
  Professor, Depoimentos, Preco, Faq, CtaFinal
} from '@/components/landing/Fecho';
import { FLAGSHIP, brl, getCourse } from '@/lib/catalog';
import { fimDaParceria, guardarParceriaDaUrl, parceriaAtual, precoDaParceria } from '@/lib/parceria';
import { contarComOrigem } from '@/lib/origem';
import { useEffect, useState } from 'react';
import { useAccount } from '@/lib/account/store';
import { proximoPasso } from '@/lib/cta';
import type { HeroMedia } from '@/components/landing/media';
import { tx } from '@/i18n/telas/venda-curso-de-hebraico';

export function CursoDeHebraicoClient({ midia, retrato }: { midia: HeroMedia; retrato: string | null }) {
  const account = useAccount();

  /* Um aluno que já entrou não deve ser mandado para o checkout pela própria
     capa do site dele. A regra de quem recebe qual oferta mora em lib/cta.ts,
     porque ela vale também no fim de /metodo, de /faq e do curso - e escrita
     em cada tela ela se contradiz na terceira. */
  const passo = proximoPasso(account);
  const comprar = passo.href;

  /* Quem veio por um link de parceria (/sefarad): guarda e, se o preço da
     parceria for menor que o do dia, avisa no topo. Ver lib/parceria.ts. */
  const [parceria, setParceria] = useState<string | null>(null);
  useEffect(() => { guardarParceriaDaUrl(); setParceria(parceriaAtual()); contarComOrigem('venda-visto'); }, []);
  const curso = getCourse(FLAGSHIP);
  const daParceria = parceria && curso ? precoDaParceria(curso, parceria) : null;

  return (
    <>
      {daParceria !== null && parceria && (
        <p className="m-0 bg-[var(--gold-soft)] text-[var(--gold-ink)] text-center font-ui text-[14.5px] px-4 py-2.5 border-b border-[#EADCC0]">
          {tx.parceria(<strong>{brl(daParceria)}</strong>, curso ? fimDaParceria(curso) : null)}
        </p>
      )}
      <Hero
        primaryHref={passo.href}
        /* O botão principal leva ao mesmo lugar de sempre (lib/cta.ts): o
           checkout para quem pode comprar, "Continuar de onde parei" para o
           aluno pagante. Desde 29/10/2026 o hero não mostra preço (pedido do
           dono); o preço continua na caixa de preço e na barra fixa. */
        primaryLabel={passo.vende ? tx.quero : passo.label}
        retrato={retrato}
        midia={midia}
      />
      {/* A explicação que o hero deixou de carregar (28/09/2026): o que se
          aprende e os dois "nada de". Ver Promessa.tsx. */}
      {/* A promoção do pré-lançamento, logo depois da primeira dobra (31/10/2026,
          pedido do dono). Some sozinha quando o preço virar. */}
      {passo.vende && <FaixaDaPromocao />}
      <Promessa />
      {/* A ordem da narrativa, e por que ela é esta.
          ──────────────────────────────────────────────────────────────────
          A promessa do hero cria uma dúvida ("será que EU consigo?"), e a
          página responde antes de qualquer outra coisa com a aula aberta, onde a pessoa aprende
          o Álef de verdade. Tudo o que vem depois - o método, o currículo, o
          professor, o preço - é lido por alguém que já provou a si mesmo que
          consegue, o que é uma pessoa diferente da que chegou.

          As três decisões pedagógicas ficam logo abaixo da demo, e nessa
          ordem de propósito: elas AFIRMAM o que a demo acabou de FAZER. Na
          ordem inversa seriam três promessas à espera de prova. */}
      <DemoAlef href={comprar} micro={passo.micro} label={passo.label} vende={passo.vende} />
      {/* 06/11/2026 (página que convence quem chega): depois de provar que
          consegue com o Álef, a pessoa vê para que serve - as oito paradas de
          Um dia em Israel, com as telas de verdade. */}
      <UmDiaNaCapa />
      {/* Logo depois da aula aberta: o Álef não tem som, e esta seção mostra
          o resto - ouvir o professor e ser corrigido falando. */}
      <OuvirEFalar />
      {/* Telas de verdade da plataforma e a Yael (29/10/2026). */}
      <Plataforma />
      {/* Os jogos da Academia, com os mesmos cartões de lá (06/11/2026). */}
      <JogosNaCapa />
      <Decisoes />
      {/* A seção do método (as cinco etapas da lição) saiu da capa em 30/10/2026: a
          galeria de telas mostra as mesmas etapas, e /metodo continua com o texto. */}
      <Curriculo />
      {/* As placas de verdade que se lê no fim do curso (30/10/2026). */}
      <Resultado />
      <Professor />
      {/* O que o professor oferece além da plataforma: o Fale comigo e o
          WhatsApp (06/11/2026). */}
      <ComVoce />
      <Depoimentos />
      <Preco href={comprar} label={passo.label} owned={account.ready && account.can(FLAGSHIP)} />
      <Faq />
      <CtaFinal href={comprar} label={passo.label} />
      {/* Só para quem ainda pode comprar. `vende` é a mesma regra que decide
          os outros botões - um aluno pagante não recebe uma faixa de preço
          colada no rodapé do site dele. */}
      {passo.vende && <BarraFixa href={comprar} label={passo.label} />}
    </>
  );
}

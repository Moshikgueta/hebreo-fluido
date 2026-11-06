/* A estrada do curso (05/11/2026; um caminho só desde 06/11/2026, pedido do
 * dono: "a melhor experiência com o mapa").
 * ─────────────────────────────────────────────────────────────────────────
 * As paradas que o componente EstradaDoModulo desenha, montadas a partir do
 * progresso: a Aula 0, e para cada módulo uma faixa com o lugar dele e as
 * suas etapas (as letras e os sons, o jarro na metade, as leituras e o
 * checkpoint), até o portão do desafio final. "Meu curso" mostra a estrada
 * inteira; o painel "Hoje", só um pedaço em volta da etapa de agora. As
 * travas, os links e o jarro são os mesmos de sempre: um lugar só. */

import { allLetters, course, getLetter, type CourseModule } from '@/lib/content';
import { carimbosDaNota, type ItemDaEstrada, type ParadaDaEstrada } from '@/components/aventura/EstradaDoModulo';
import { leiturasDoModulo } from '@/lib/leituras-do-curso';
import { aula0Feita, idDoJarro, isLessonComplete, isLessonMastered, letraLiberada, STAGE_COUNT } from '@/lib/state/rules';
import type { LearnerState } from '@/lib/state/types';
import { useProgress } from '@/lib/state/store';
import { idDoSom, ordemDeEnsino, portasDosModulos } from '@/lib/sons';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/painel-course-map-client';
import { tx as txE } from '@/i18n/telas/estrada-da-yael';
import { LUGAR, type IdDoCenario } from '@/components/aventura/Cenarios';
import { ETAPA_AULA0, ETAPA_DO_MODULO, ETAPA_FINAL } from '@/lib/jornada';

/* Uma lição do caminho dentro do módulo: uma letra ou um som (Vet, Tch...). */
export type Item = { id: string; he: string; nome: string; href: string };

export function itensDoModulo(m: CourseModule): Item[] {
  /* Bet, Kaf, Pe e Shin têm, no mesmo módulo, a lição do outro som: o
     cartão da letra mostra o lado dela (בּ "Bet", שׁ "Shin") e o do som
     mostra o outro (ב "Vet", שׂ "Sin"). Sem isso eram dois cartões com o
     mesmo desenho. Os sons modernos ficam fora: a letra sem guéresh está em
     outro módulo. */
  const ladoDe = (letra: string) =>
    m.lessons.find(l => l.som && l.parHe && [...l.parHe][0] === letra)?.parHe;
  return m.lessons.flatMap(ls => {
    if (ls.som) {
      return [{ id: idDoSom(ls.som), he: ls.he ?? '', nome: ls.nomePt ?? ls.som, href: `/som/${ls.som}` }];
    }
    return (ls.letters ?? []).map(getLetter).filter(l => !!l)
      .map(L => {
        const lado = ladoDe(L!.letter);
        return {
          id: L!.id,
          he: lado ?? L!.letter,
          nome: lado ? L!.namePt.split('/')[0]!.trim() : L!.namePt,
          href: `/licao/${L!.id}`
        };
      });
  });
}

/** O módulo fechou: as lições todas e o checkpoint (no módulo sem letras, as
 *  três etapas dele). A mesma regra do mapa do curso. */
export function moduloCompleto(state: LearnerState, m: CourseModule): boolean {
  const itens = itensDoModulo(m).every(i => isLessonComplete(state, i.id));
  if (m.letterIds.length === 0) return itens && (state.lessons[m.id]?.stagesDone.length ?? 0) >= 3;
  const cp = m.checkpoint ? !!state.checkpoints[m.checkpoint.id]?.passedAt : true;
  return itens && cp;
}

type EstadoDoModulo = 'feito' | 'agora' | 'adiante';

/** As etapas de um módulo, em ordem, com o estado de cada uma. */
function paradasDoModulo(
  m: CourseModule, estadoM: EstadoDoModulo, state: LearnerState, ready: boolean,
  ordem: ReturnType<typeof ordemDeEnsino>, portas: ReturnType<typeof portasDosModulos>
): ParadaDaEstrada[] {
  const itens = itensDoModulo(m);
  const extra = m.letterIds.length === 0;
  const adiante = estadoM === 'adiante';
  const motivo = m.n === 1 ? tx.abreDepoisAula0 : fmt(tx.abreDepoisModulo, { n: m.n - 1 });
  const pendente = itens.find(i => !isLessonComplete(state, i.id));
  const proxima = estadoM === 'agora' ? pendente?.id ?? null : null;
  const out: ParadaDaEstrada[] = [];
  const feitas = itens.filter(i => isLessonComplete(state, i.id)).length;
  const meio = extra ? -1 : Math.max(1, Math.floor(itens.length / 2));
  const jarro = state.firsts[idDoJarro(m.id)] ? 'aberto' : feitas >= Math.ceil(itens.length / 2) ? 'pronto' : 'fechado';
  let anterior = '';

  itens.forEach((L, i) => {
    const feita = isLessonComplete(state, L.id);
    const etapasFeitas = state.lessons[L.id]?.stagesDone.length ?? 0;
    const comecada = etapasFeitas > 0 && !feita;
    const bloqueada = adiante || (ready && !feita && !comecada && !letraLiberada(state, ordem, L.id, portas));
    const liberada = !adiante && (feita || comecada || (ready && !bloqueada));
    const agora = ready && L.id === proxima && liberada;
    const som = L.href.startsWith('/som/');
    const estadoDaLetra = feita ? tx.letraConcluida
      : comecada ? fmt(tx.letraEtapas, { n: etapasFeitas, total: STAGE_COUNT })
      : bloqueada ? tx.letraBloqueada : agora ? tx.letraProxima : '';
    out.push({
      chave: L.id, n: m.n, tipo: som ? 'som' : 'letra', he: L.he, nome: L.nome,
      sub: som ? tx.jSomNovo : tx.jLetraNova,
      href: liberada ? L.href : null,
      estado: feita ? 'feita' : agora ? 'agora' : bloqueada ? 'trancada' : 'livre',
      rotuloAcessivel: liberada ? `${fmt(tx.abrirLicao, { nome: L.nome })}${estadoDaLetra}` : `${L.nome}${estadoDaLetra}`,
      detalhe: feita ? txE.licaoFeita : comecada ? txE.etapas(etapasFeitas, STAGE_COUNT)
        : adiante ? motivo : bloqueada ? (anterior ? txE.abreDepoisDe(anterior) : motivo) : txE.licaoNova,
      acao: feita ? txE.revisar : comecada ? txE.continuar : liberada ? txE.comecar : undefined
    });
    anterior = L.nome;
    if (i + 1 === meio) {
      const sub = adiante || jarro === 'fechado' ? tx.jJarroFechado : jarro === 'pronto' ? tx.jJarroPronto : tx.jJarroAberto;
      out.push({
        chave: `jarro-${m.id}`, n: m.n, tipo: 'jarro', nome: tx.jJarro, sub, modulo: m.id,
        jarro: adiante ? 'fechado' : jarro, estado: !adiante && jarro === 'aberto' ? 'feita' : 'livre',
        rotuloAcessivel: `${tx.jJarro}: ${sub}`
      });
    }
  });

  /* O módulo sem letras (6) e o fecho do 7: as três etapas, numa parada. */
  if (extra) {
    const etapas = Math.min(3, state.lessons[m.id]?.stagesDone.length ?? 0);
    const itensFeitos = itens.every(i => isLessonComplete(state, i.id));
    const feita = etapas >= 3, agora = estadoM === 'agora' && !feita && itensFeitos;
    out.push({
      chave: `etapas-${m.id}`, n: m.n, tipo: 'texto', nome: m.titlePt, sub: txE.etapas(etapas, 3),
      href: adiante ? null : `/modulo/${m.n}`,
      estado: feita ? 'feita' : agora ? 'agora' : adiante ? 'trancada' : 'livre',
      rotuloAcessivel: `${m.titlePt}: ${txE.etapas(etapas, 3)}`,
      detalhe: adiante ? motivo : feita ? txE.licaoFeita : txE.etapas(etapas, 3),
      acao: adiante ? undefined : feita ? txE.revisar : etapas > 0 ? txE.continuar : txE.comecar,
      meta: m.milestonePt && !adiante ? { texto: m.milestonePt, alcancada: estadoM === 'feito' } : undefined
    });
  }

  for (const l of leiturasDoModulo(m, state)) {
    out.push({
      chave: l.id, n: m.n, tipo: l.id.startsWith('pl-') ? 'leitura' : l.id.startsWith('rv-') ? 'revisao' : 'texto',
      nome: l.titulo, sub: l.desc, href: adiante ? null : l.feita ? l.href : `/modulo/${m.n}`,
      estado: l.feita ? 'feita' : adiante ? 'trancada' : 'livre',
      rotuloAcessivel: `${l.titulo}${l.feita ? tx.letraConcluida : ''}`,
      detalhe: adiante ? motivo : l.feita ? txE.lida : txE.naPaginaDoModulo,
      acao: adiante ? undefined : l.feita ? txE.lerDeNovo : txE.abrir
    });
  }

  if (m.checkpoint && !extra) {
    const cp = state.checkpoints[m.checkpoint.id];
    const aprovado = !!cp?.passedAt;
    const nota = cp?.best != null ? Math.round(cp.best * 100) : null;
    const pronto = !adiante && !aprovado && !pendente;
    const estadoDoCp = aprovado ? tx.checkpointAprovado(nota) : pronto ? tx.checkpointPronto : tx.checkpointDepois;
    out.push({
      chave: `checkpoint-${m.id}`, n: m.n, tipo: 'checkpoint', nome: tx.checkpointRotulo,
      sub: aprovado && nota != null ? `${nota}%` : tx.checkpointDo(m.n), href: adiante ? null : `/checkpoint/${m.n}`,
      estado: aprovado ? 'feita' : pronto && estadoM === 'agora' ? 'agora' : adiante ? 'trancada' : 'livre',
      rotuloAcessivel: `${tx.abrirCheckpoint(m.n)}${estadoDoCp}`, carimbos: carimbosDaNota(cp?.best, aprovado),
      detalhe: adiante ? motivo : aprovado ? txE.aprovadoCom(nota) : pronto ? txE.checkpointPronto : txE.checkpointDepois,
      acao: adiante ? undefined : aprovado ? txE.refazer : txE.fazer,
      meta: m.milestonePt && !adiante ? { texto: m.milestonePt, alcancada: estadoM === 'feito' } : undefined
    });
  }
  return out;
}

/** A estrada do curso inteiro: a Aula 0, uma faixa e as etapas de cada
 *  módulo, e o desafio final. */
export function useEstradaDoCurso(): ItemDaEstrada[] {
  const p = useProgress();
  const ordem = ordemDeEnsino(allLetters(), course.modules);
  const portas = portasDosModulos(ordem, course.modules);
  const a0 = aula0Feita(p.state);
  const atual = a0 ? course.modules.findIndex(m => !moduloCompleto(p.state, m)) : -2;
  const out: ItemDaEstrada[] = [{
    chave: 'aula0', n: 0, tipo: 'leitura', nome: ETAPA_AULA0, sub: tx.comoFunciona, href: '/inicio',
    estado: a0 ? 'feita' : 'agora', rotuloAcessivel: `${ETAPA_AULA0}: ${tx.comoFunciona}`,
    detalhe: a0 ? tx.aula0Feita : tx.aula0Falta, acao: a0 ? txE.lerDeNovo : txE.comecar
  }];
  course.modules.forEach((m, i) => {
    const estadoM: EstadoDoModulo = atual === -1 || (atual >= 0 && i < atual) ? 'feito' : i === atual ? 'agora' : 'adiante';
    const paradas = paradasDoModulo(m, estadoM, p.state, p.ready, ordem, portas);
    const contaveis = paradas.filter(x => x.tipo !== 'jarro');
    const pct = contaveis.length ? Math.round(contaveis.filter(x => x.estado === 'feita').length / contaveis.length * 100) : 0;
    const lugar = m.n >= 1 && m.n <= 7 ? LUGAR[m.n as IdDoCenario] : null;
    out.push({
      chave: `faixa-${m.id}`, tipo: 'faixa', n: m.n, titulo: m.titlePt, etapa: ETAPA_DO_MODULO[m.n] ?? '',
      lugar: lugar && estadoM !== 'adiante' ? lugar : null, estado: estadoM, pct,
      href: `/modulo/${m.n}`, motivo: m.n === 1 ? tx.abreDepoisAula0 : fmt(tx.abreDepoisModulo, { n: m.n - 1 })
    });
    out.push(...paradas);
  });
  const passou = !!p.state.finalChallenge?.passedAt;
  const aberto = allLetters().every(l => isLessonMastered(p.state, l.id));
  out.push({
    chave: 'final', n: 8, tipo: 'checkpoint', nome: ETAPA_FINAL, sub: passou ? tx.verCertificado : tx.chegada,
    href: passou ? '/certificado' : aberto ? '/desafio-final' : null,
    estado: passou ? 'feita' : aberto ? 'agora' : 'trancada',
    rotuloAcessivel: `${ETAPA_FINAL}${passou ? tx.letraConcluida : ''}`, carimbos: passou ? 3 : 0,
    detalhe: passou ? tx.finalFeito : aberto ? tx.finalFalta : tx.abreQuando,
    acao: passou ? tx.verCertificado : aberto ? txE.comecar : undefined
  });
  return out;
}

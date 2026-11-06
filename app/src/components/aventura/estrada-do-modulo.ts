/* A estrada de um módulo (05/11/2026): as paradas que o componente
 * EstradaDoModulo desenha, montadas a partir do progresso. Saiu de dentro do
 * mapa (app/mapa/CourseMapClient.tsx) para que o painel "Hoje" mostre a mesma
 * estrada (pedido do dono: a mapa interativa na página principal). As
 * travas, os links e o jarro são exatamente os do mapa: um lugar só. */

import { allLetters, course, getLetter, type CourseModule } from '@/lib/content';
import { carimbosDaNota, type ParadaDaEstrada } from '@/components/aventura/EstradaDoModulo';
import { leiturasDoModulo } from '@/lib/leituras-do-curso';
import { idDoJarro, isLessonComplete, letraLiberada, STAGE_COUNT } from '@/lib/state/rules';
import { useProgress } from '@/lib/state/store';
import { idDoSom, ordemDeEnsino, portasDosModulos } from '@/lib/sons';
import { fmt } from '@/i18n';
import { tx } from '@/i18n/telas/painel-course-map-client';

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

/** A estrada do módulo `m` e o estado do jarro. Vazia quando `ativo` é falso
 *  (o módulo não é o de agora) ou quando o módulo não tem letras. */
export function useEstradaDoModulo(m: CourseModule, ativo: boolean): { estrada: ParadaDaEstrada[]; jarro: 'fechado' | 'pronto' | 'aberto' } {
  const p = useProgress();
  const itens = itensDoModulo(m);
  const ordem = ordemDeEnsino(allLetters(), course.modules);
  const portas = portasDosModulos(ordem, course.modules);
  const feitas = itens.filter(i => isLessonComplete(p.state, i.id)).length;
  const extra = m.letterIds.length === 0;
  const pendente = itens.find(i => !isLessonComplete(p.state, i.id));
  const proxima = ativo ? pendente?.id ?? null : null;

  /* A estrada do módulo atual (05/11/2026, aprovada pelo dono): as mesmas
     letras, travas e links de sempre, desenhados em fila, com o jarro na
     metade, as leituras do módulo e o portão do checkpoint. */
  const estrada: ParadaDaEstrada[] = [];
  let jarro: 'fechado' | 'pronto' | 'aberto' = 'fechado';
  if (ativo && !extra && itens.length) {
    const meio = Math.max(1, Math.floor(itens.length / 2));
    jarro = p.state.firsts[idDoJarro(m.id)] ? 'aberto' : feitas >= Math.ceil(itens.length / 2) ? 'pronto' : 'fechado';
    itens.forEach((L, i) => {
      const feita = isLessonComplete(p.state, L.id);
      const etapasFeitas = p.state.lessons[L.id]?.stagesDone.length ?? 0;
      const comecada = etapasFeitas > 0 && !feita;
      const bloqueada = p.ready && !feita && !comecada && !letraLiberada(p.state, ordem, L.id, portas);
      const liberada = feita || comecada || (p.ready && !bloqueada);
      const agora = p.ready && L.id === proxima && liberada;
      const estadoDaLetra = feita ? tx.letraConcluida
        : comecada ? fmt(tx.letraEtapas, { n: etapasFeitas, total: STAGE_COUNT })
        : bloqueada ? tx.letraBloqueada : agora ? tx.letraProxima : '';
      estrada.push({
        chave: L.id, tipo: L.href.startsWith('/som/') ? 'som' : 'letra', he: L.he, nome: L.nome,
        sub: L.href.startsWith('/som/') ? tx.jSomNovo : tx.jLetraNova,
        href: liberada ? L.href : null,
        estado: feita ? 'feita' : agora ? 'agora' : bloqueada ? 'trancada' : 'livre',
        rotuloAcessivel: liberada ? `${fmt(tx.abrirLicao, { nome: L.nome })}${estadoDaLetra}` : `${L.nome}${estadoDaLetra}`
      });
      if (i + 1 === meio) {
        const sub = jarro === 'aberto' ? tx.jJarroAberto : jarro === 'pronto' ? tx.jJarroPronto : tx.jJarroFechado;
        estrada.push({ chave: 'jarro', tipo: 'jarro', nome: tx.jJarro, sub, estado: jarro === 'aberto' ? 'feita' : 'livre', rotuloAcessivel: `${tx.jJarro}: ${sub}` });
      }
    });
    for (const l of leiturasDoModulo(m, p.state)) {
      estrada.push({
        chave: l.id, tipo: l.id.startsWith('pl-') ? 'leitura' : l.id.startsWith('rv-') ? 'revisao' : 'texto',
        nome: l.titulo, sub: l.desc, href: l.feita ? l.href : `/modulo/${m.n}`,
        estado: l.feita ? 'feita' : 'livre', rotuloAcessivel: `${l.titulo}${l.feita ? tx.letraConcluida : ''}`
      });
    }
    if (m.checkpoint) {
      const cp = p.state.checkpoints[m.checkpoint.id];
      const aprovado = !!cp?.passedAt;
      const nota = cp?.best != null ? Math.round(cp.best * 100) : null;
      const estadoDoCp = aprovado ? tx.checkpointAprovado(nota) : !pendente ? tx.checkpointPronto : tx.checkpointDepois;
      estrada.push({
        chave: 'checkpoint', tipo: 'checkpoint', nome: tx.checkpointRotulo,
        sub: aprovado && nota != null ? `${nota}%` : tx.checkpointDo(m.n), href: `/checkpoint/${m.n}`,
        estado: aprovado ? 'feita' : !pendente ? 'agora' : 'livre',
        rotuloAcessivel: `${tx.abrirCheckpoint(m.n)}${estadoDoCp}`, carimbos: carimbosDaNota(cp?.best, aprovado)
      });
    }
  }
  return { estrada, jarro };
}

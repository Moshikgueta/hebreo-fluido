/* Os alunos voltam? (06/11/2026, pedido do dono: medir a experiência.)
 * ─────────────────────────────────────────────────────────────────────────
 * O progresso de cada aluno já guarda os dias em que ele estudou
 * (`state.days`, chave YYYY-MM-DD). Daqui saem só CONTAGENS, para o painel:
 *
 *   · quantos alunos têm algum dia de estudo;
 *   · dos que começaram há 2 dias ou mais, quantos voltaram no dia seguinte
 *     ao primeiro;
 *   · dos que começaram há 14 dias ou mais, quantos estudaram na segunda
 *     semana (do 7º ao 13º dia depois do primeiro);
 *   · quantos estudaram nos últimos 7 dias.
 *
 * Nenhuma conta, nenhum e-mail sai daqui. As contas de administrador ficam
 * de fora (elas testam o curso, não estudam). O banco lê os dias com
 * `json_each`, para o Worker não abrir o estado inteiro de cada aluno.
 */

const DIA_MS = 86_400_000;
const somaDias = (dia, n) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
const DIA = /^\d{4}-\d{2}-\d{2}$/;

/** As contagens, a partir de uma lista de dias de estudo por aluno. */
export function retencao(diasPorAluno, hoje) {
  let alunos = 0, baseDia2 = 0, voltouDia2 = 0, baseSemana2 = 0, voltouSemana2 = 0, ativos7 = 0;
  const seteAtras = somaDias(hoje, -6);
  for (const lista of diasPorAluno) {
    const dias = [...new Set(lista.filter(d => DIA.test(d) && d <= hoje))].sort();
    if (!dias.length) continue;
    alunos++;
    const primeiro = dias[0];
    const tem = new Set(dias);
    if (somaDias(primeiro, 1) < hoje) {
      /* começou há 2 dias ou mais: o dia seguinte já terminou */
      baseDia2++;
      if (tem.has(somaDias(primeiro, 1))) voltouDia2++;
    }
    if (somaDias(primeiro, 13) < hoje) {
      baseSemana2++;
      if (dias.some(d => d >= somaDias(primeiro, 7) && d <= somaDias(primeiro, 13))) voltouSemana2++;
    }
    if (dias[dias.length - 1] >= seteAtras) ativos7++;
  }
  return { alunos, baseDia2, voltouDia2, baseSemana2, voltouSemana2, ativos7 };
}

/** As mesmas contagens, lidas do banco. Nunca lança: sem tabela, zeros. */
export async function retencaoDoBanco(env, admins, hoje) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT p.account_id AS id, LOWER(a.email) AS email, j.key AS dia
         FROM progress p JOIN accounts a ON a.id = p.account_id, json_each(p.state, '$.days') j
        LIMIT 200000`
    ).all();
    const porAluno = new Map();
    for (const r of results || []) {
      if (admins.includes(String(r.email))) continue;
      const l = porAluno.get(r.id) || [];
      l.push(String(r.dia));
      porAluno.set(r.id, l);
    }
    return retencao([...porAluno.values()], hoje);
  } catch {
    return retencao([], hoje);
  }
}

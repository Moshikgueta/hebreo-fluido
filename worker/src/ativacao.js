/* Os lembretes dos primeiros dias depois da compra (23/10/2026, plano de
 * marketing, oportunidade 0: marketing/01-diagnostico.md).
 * ─────────────────────────────────────────────────────────────────────────
 * Os primeiros dados mostraram quem comprou estudando no dia da compra e não
 * voltando. Três e-mails curtos, cada um UMA vez por compra:
 *
 *   d1  pago há 1 a 3 dias, nenhuma lição concluída: comece pela Aula 0;
 *   d3  pago há 3 a 6 dias, ainda nenhuma: ficou alguma dúvida?;
 *   d7  pago há 7 a 10 dias, sem estudar há mais de 3 dias: continue.
 *
 * Quem já está estudando não recebe o d1 nem o d3; quem estudou nos últimos
 * 3 dias não recebe o d7. Só compras pagas a partir de ATIVACAO_DESDE (nada
 * retroativo), só dos cursos com lições, nunca para contas de teste
 * (`.invalid`), apagadas (`.local`) ou de administrador (os testes do dono).
 *
 * Aviso de serviço contratado, como o de fim de acesso (vencimento.js): não é
 * propaganda e não depende da lista de novidades. A Política de Privacidade
 * cita os lembretes. Roda na varredura, uma vez por dia (trava `ativacao`).
 *
 * Nunca lança: um lembrete que falha não pode derrubar a varredura.
 */

import { getCourse } from './lib/catalog.js';
import { ativacoesParaAvisar, normalizeEmail, pegarTrava, reservarAtivacao, soltarAtivacao } from './lib/db.js';
import { emailsDeAdmin } from './lib/admin.js';
import { mailReady, sendMail } from './lib/mail.js';
import { mensagens } from './lib/mensagens.js';
import { idiomaDaConta, marcaDoEmail, origemDoIdioma, tituloDoCurso } from './lib/idioma.js';
import empresa from '../../data/empresa.json';

/** Compras pagas a partir daqui recebem os lembretes (o dia seguinte à publicação). */
export const ATIVACAO_DESDE = Date.parse('2026-10-24T00:00:00-03:00');

/** Os produtos cujo pedido abre as lições do curso de alfabetização. */
export const CURSOS_COM_LEMBRETE = ['alfabetizacao', 'alfabetizacao-e-israel'];

const DIA = 86_400_000;

/** O marco vale para esta pessoa agora? */
export function cabe(marco, { concluidas, progressoEm }, at = Date.now()) {
  const feitas = Number(concluidas) || 0;
  if (marco === 'd1' || marco === 'd3') return feitas === 0;
  if (marco === 'd7') return !progressoEm || at - Number(progressoEm) > 3 * DIA;
  return false;
}

export async function runAtivacao(env, at = Date.now()) {
  if (!mailReady(env)) return { enviados: 0 };
  if (!await pegarTrava(env, 'ativacao', 23 * 3_600_000, at)) return { enviados: 0, pulada: true };
  const admins = emailsDeAdmin(env);
  let enviados = 0;
  const lista = await ativacoesParaAvisar(env, { cursos: CURSOS_COM_LEMBRETE, desde: ATIVACAO_DESDE }, at);
  for (const v of lista) {
    try {
      const email = normalizeEmail(v.email);
      if (!email || /\.(invalid|local)$/i.test(email) || admins.includes(email)) continue;
      if (!cabe(v.marco, { concluidas: v.concluidas, progressoEm: v.progresso_em }, at)) continue;
      const chave = { orderId: v.order_id, marco: v.marco };
      if (!await reservarAtivacao(env, chave, at)) continue;
      const curso = getCourse(v.course_slug);
      /* A língua e os links são os da conta: este agendamento roda no Worker
         brasileiro para as contas dos dois sites (lib/idioma.js). */
      const idioma = idiomaDaConta(v);
      const site = origemDoIdioma(env, idioma);
      const r = await sendMail(env, {
        to: email,
        ...mensagens(idioma).ativacao({
          nome: v.name || '',
          curso: v.course_slug === 'alfabetizacao-e-israel'
            ? tituloDoCurso(getCourse('alfabetizacao'), idioma, idioma === 'en' ? 'Hebrew' : idioma === 'es' ? 'de hebreo' : 'de hebraico')
            : tituloDoCurso(curso, idioma, v.course_slug),
          marco: v.marco,
          concluidas: v.concluidas,
          inicio: `${site}/inicio/`,
          primeira: `${site}/licao/alef/`,
          painel: `${site}/meu-hebraico/`,
          marca: marcaDoEmail(idioma, empresa),
          suporte: empresa.contato?.emailSuporte || ''
        })
      });
      if (r && r.ok) enviados++;
      else await soltarAtivacao(env, chave);
    } catch (e) {
      console.error('ativacao', e && e.stack || e);
    }
  }
  return { enviados };
}

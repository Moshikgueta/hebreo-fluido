/* O aviso de fim de acesso (auditoria de 01/10/2026, PAY-B-004).
 * ─────────────────────────────────────────────────────────────────────────
 * O acesso vale 12 meses e não renova sozinho. Até aqui, o único aviso de
 * que ele ia acabar era uma faixa dentro da plataforma, que só vê quem
 * entra; no dia seguinte ao fim, o aluno que pagou caía na página de vendas
 * como um visitante. Agora saem três e-mails por vencimento:
 *
 *   d30  quando faltam entre 30 e 23 dias;
 *   d7   quando faltam 7 dias ou menos;
 *   fim  depois do fim (até três dias depois, se a varredura falhou no dia).
 *
 * Cada um UMA vez: a tabela `avisos_vencimento` guarda o marco mandado,
 * chaveado pelo próprio vencimento - uma renovação muda a data e os marcos
 * recomeçam. Roda na varredura de 5 em 5 minutos, mas trabalha uma vez por
 * dia (a trava `vencimentos` vale 23 horas): é um aviso por data, não por
 * hora, e uma rodada perdida é coberta pela janela de cada marco.
 *
 * Não é propaganda: é o aviso de que um serviço contratado está acabando,
 * para quem o contratou. Não depende da lista de novidades. Contas de teste
 * (`.invalid`) e apagadas (`.local`) ficam de fora.
 *
 * Nunca lança: um aviso que falha não pode derrubar a varredura, que é a
 * rede de segurança dos pagamentos.
 */

import { getCourse } from './lib/catalog.js';
import { pegarTrava, reservarVencimento, soltarVencimento, vencimentosParaAvisar } from './lib/db.js';
import { mailReady, sendMail } from './lib/mail.js';
import { mensagens } from './lib/mensagens.js';
import { idiomaDaConta, marcaDoEmail, origemDoIdioma, tituloDoCurso } from './lib/idioma.js';
import empresa from '../../data/empresa.json';

const DIA = 86_400_000;

export async function runVencimentos(env, at = Date.now()) {
  if (!mailReady(env)) return { enviados: 0 };
  if (!await pegarTrava(env, 'vencimentos', 23 * 3_600_000, at)) return { enviados: 0, pulada: true };
  let enviados = 0;
  for (const v of await vencimentosParaAvisar(env, {}, at)) {
    try {
      if (/\.(invalid|local)$/i.test(String(v.email || ''))) continue;
      const curso = getCourse(v.course_slug);
      const chave = {
        accountId: v.account_id, courseSlug: v.course_slug,
        expiresAt: Number(v.expires_at), marco: v.marco
      };
      if (!await reservarVencimento(env, chave, at)) continue;
      /* A língua e os links são os da conta (lib/idioma.js). */
      const idioma = idiomaDaConta(v);
      const site = origemDoIdioma(env, idioma);
      const m = mensagens(idioma);
      const r = await sendMail(env, {
        to: v.email,
        ...m.vencimento({
          nome: v.name || '',
          curso: tituloDoCurso(curso, idioma, v.course_slug),
          quando: m.data(Number(v.expires_at)),
          dias: Math.max(1, Math.ceil((Number(v.expires_at) - at) / DIA)),
          marco: v.marco,
          meses: curso?.accessMonths || 12,
          renovar: `${site}/checkout/${v.course_slug}/`,
          marca: marcaDoEmail(idioma, empresa),
          suporte: empresa.contato?.emailSuporte || ''
        })
      });
      if (r && r.ok) enviados++;
      else await soltarVencimento(env, chave);
    } catch (e) {
      console.error('vencimento', e && e.stack || e);
    }
  }
  return { enviados };
}

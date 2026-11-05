/* O prazo de desistência, num lugar só (03/11/2026).
 * ─────────────────────────────────────────────────────────────────────────
 * Sete dias corridos (CDC, art. 49), contados da liberação do acesso - que é
 * o pagamento confirmado, e é depois da compra, então é o mais favorável ao
 * consumidor, como a Política de Reembolso promete. E vai até o FIM do
 * sétimo dia no horário de Brasília: "sete dias" que acabam às 14h32 porque
 * foi a hora em que o PIX caiu não é como ninguém conta dias.
 *
 * Brasília é UTC-3 o ano inteiro desde 2019 (sem horário de verão).
 *
 * Morava em api/pay.js. Saiu para cá quando o acesso passou a usá-lo também
 * (lib/db.js, `activeEntitlements`): o exame final, o certificado e as
 * leituras bônus abrem depois desse prazo (decisão do dono, 03/11/2026).
 */

const DIA = 86_400_000;
const BRASILIA = 3 * 3_600_000;
/* Escrito aqui, e não lido de data/empresa.json: o gate.js importa lib/db.js,
   que importa este arquivo, e o seo.mjs da publicação carrega o gate.js no
   Node puro, que recusa JSON sem atributo de importação. O
   tests/desistencia.test.ts confere que o número bate com o
   `politicas.arrependimentoDias` de data/empresa.json. */
export const DIAS_ARREPENDIMENTO = 7;
/* No site em inglês, 14 dias: é o prazo que as regras do Paddle para o
   comprador garantem (PLANO-INGLES.md, etapa 5; o texto da política é da
   etapa 6). Lido do pedido, e não do Worker, para que um pedido nunca mude
   de prazo depois de pago. */
export const DIAS_PADDLE = 14;
/* O Stripe dos sites de fora (05/11/2026) segue os mesmos 14 dias: é o
   prazo que os Termos em inglês e espanhol prometem. */
export const diasDoPedido = row => (row && (row.provider === 'paddle' || row.provider === 'stripe')
  ? DIAS_PADDLE : DIAS_ARREPENDIMENTO);

export function prazoDeDesistencia(paidAt, dias = DIAS_ARREPENDIMENTO) {
  if (!paidAt || !dias) return null;
  const local = Number(paidAt) - BRASILIA + dias * DIA;
  return Math.floor(local / DIA) * DIA + DIA - 1 + BRASILIA;
}

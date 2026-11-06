/* O nome completo e o CPF de quem compra (06/11/2026, pedido do dono, depois
 * de falar com o contador: os dados da nota fiscal).
 *
 * O CPF é conferido pelos dois dígitos verificadores, e não só pelo tamanho:
 * um número digitado com um dígito trocado é o caso comum, e a nota sairia
 * com um CPF que não existe. As sequências de um dígito só (111.111.111-11)
 * passam na conta e não são CPF de ninguém: ficam de fora. A mesma regra está
 * em app/src/lib/cpf.ts, para a tela avisar antes da viagem de rede; o
 * servidor confere de novo, porque a conferência da tela é cortesia. */

/** Os 11 dígitos de um CPF válido, ou null. Aceita com ou sem pontuação. */
export function cpfValido(entrada) {
  const d = String(entrada ?? '').replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return null;
  const digito = n => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]) ? d : null;
}

/** O nome completo, arrumado (espaços simples), ou null: pelo menos duas
 *  palavras, só letras (com acento), espaço, apóstrofo, ponto e hífen, até
 *  120 caracteres. */
export function nomeCompletoValido(entrada) {
  const n = String(entrada ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (n.length < 5 || n.length > 120) return null;
  if (!/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u.test(n)) return null;
  return n.split(' ').filter(p => /\p{L}{2,}/u.test(p)).length >= 2 ? n : null;
}

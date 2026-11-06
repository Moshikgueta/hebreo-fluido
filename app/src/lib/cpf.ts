/* O nome completo e o CPF de quem compra (06/11/2026): a mesma regra de
 * worker/src/lib/cpf.js, para o checkout avisar antes de enviar. O servidor
 * confere de novo. tests/cpf.test.ts garante que as duas concordam. */

export function cpfValido(entrada: string): string | null {
  const d = entrada.replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return null;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]) ? d : null;
}

export function nomeCompletoValido(entrada: string): string | null {
  const n = entrada.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (n.length < 5 || n.length > 120) return null;
  if (!/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u.test(n)) return null;
  return n.split(' ').filter(p => /\p{L}{2,}/u.test(p)).length >= 2 ? n : null;
}

/** O CPF com a pontuação, enquanto se digita: 000.000.000-00. */
export function mascaraCpf(entrada: string): string {
  const d = entrada.replace(/\D/g, '').slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
}

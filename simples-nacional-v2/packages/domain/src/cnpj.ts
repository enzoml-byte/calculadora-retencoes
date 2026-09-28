/** Valida CNPJ: 14 digitos + verificadores. Aceita com/sem mascara. */
export function isValidCNPJ(input: string): boolean {
  const d = input.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, pesos: number[]): number => {
    const soma = [...base].reduce((acc, ch, i) => acc + Number(ch) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(d.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${d1}${d2}`);
}

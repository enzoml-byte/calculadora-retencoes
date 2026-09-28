export const moeda = (n: number): string =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const percentual = (n: number): string =>
  `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;

export const cnpjMask = (cnpj: string): string =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

export const competencia = (aaaamm: string): string =>
  aaaamm.length === 6 ? `${aaaamm.slice(4, 6)}/${aaaamm.slice(0, 4)}` : aaaamm;

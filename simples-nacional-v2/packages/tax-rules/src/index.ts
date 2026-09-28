export type Anexo = "III" | "IV" | "V";

export interface TaxRule {
  anexo: Anexo;
  faixa: number;
  limiteInferior: number;
  /** null = sem teto (faixa 6) */
  limiteSuperior: number | null;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  versao: string;
}

/** Versao vigente. Nova legislacao = nova constante + novas linhas, nunca editar estas. */
export const VERSAO_ATUAL = "2024.1";

const R = (
  anexo: Anexo,
  faixa: number,
  limiteInferior: number,
  limiteSuperior: number | null,
  aliquotaNominal: number,
  parcelaDeduzir: number,
): TaxRule => ({
  anexo,
  faixa,
  limiteInferior,
  limiteSuperior,
  aliquotaNominal,
  parcelaDeduzir,
  vigenciaInicio: "2024-01-01",
  vigenciaFim: null,
  versao: VERSAO_ATUAL,
});

export const TAX_RULES: TaxRule[] = [
  R("III", 1, 0, 180000, 0.06, 0),
  R("III", 2, 180000.01, 360000, 0.112, 9360),
  R("III", 3, 360000.01, 720000, 0.135, 17640),
  R("III", 4, 720000.01, 1800000, 0.16, 35640),
  R("III", 5, 1800000.01, 3600000, 0.21, 125640),
  R("III", 6, 3600000.01, null, 0.33, 648000),
  R("IV", 1, 0, 180000, 0.045, 0),
  R("IV", 2, 180000.01, 360000, 0.09, 8100),
  R("IV", 3, 360000.01, 720000, 0.102, 12420),
  R("IV", 4, 720000.01, 1800000, 0.14, 39780),
  R("IV", 5, 1800000.01, 3600000, 0.22, 183780),
  R("IV", 6, 3600000.01, null, 0.33, 828000),
  R("V", 1, 0, 180000, 0.155, 0),
  R("V", 2, 180000.01, 360000, 0.18, 4500),
  R("V", 3, 360000.01, 720000, 0.195, 9900),
  R("V", 4, 720000.01, 1800000, 0.205, 17100),
  R("V", 5, 1800000.01, 3600000, 0.23, 62100),
  R("V", 6, 3600000.01, null, 0.305, 540000),
];

export function findRule(anexo: Anexo, rbt12: number, rules: TaxRule[] = TAX_RULES): TaxRule {
  const rule = rules
    .filter((r) => r.anexo === anexo)
    .sort((a, b) => a.faixa - b.faixa)
    .find((r) => rbt12 >= r.limiteInferior && (r.limiteSuperior === null || rbt12 <= r.limiteSuperior));
  if (!rule) throw new Error(`FAIXA_NAO_ENCONTRADA:${anexo}:${rbt12}`);
  return rule;
}

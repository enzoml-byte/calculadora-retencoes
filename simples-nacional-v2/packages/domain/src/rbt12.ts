export interface MesHistorico {
  /** Competencia AAAAMM */
  competencia: string;
  receita: number;
}

export interface ResultadoRBT12 {
  rbt12: number;
  parcial: boolean;
  mesesConsiderados: number;
}

export const arred2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Soma ate 12 meses com competencia < atual (ordenados desc).
 * Sem nenhum mes anterior => rbt12 0 + parcial true (chamador decide: 422 salvo se PGDAS informou).
 */
export function calcRBT12(historico: MesHistorico[], competenciaAtual: string): ResultadoRBT12 {
  const meses = historico
    .filter((m) => m.competencia < competenciaAtual)
    .sort((a, b) => b.competencia.localeCompare(a.competencia))
    .slice(0, 12);
  const rbt12 = arred2(meses.reduce((acc, m) => acc + m.receita, 0));
  return { rbt12, parcial: meses.length < 12, mesesConsiderados: meses.length };
}

import { type Anexo, findRule, VERSAO_ATUAL } from "@v2/tax-rules";
import { ErroDominio } from "./errors.js";
import { arred2 } from "./rbt12.js";

export interface EntradaCalculo {
  anexo: Anexo;
  receitaMes: number;
  /** Soma do historico salvo (0 quando sem meses anteriores). */
  rbt12Calculado: number;
  /** RBT12 informado no PGDAS (cobre empresa nova). */
  rbt12Informado?: number | null;
  rbt12Parcial?: boolean;
}

export interface MemoriaCalculo {
  anexo: Anexo;
  faixa: number;
  rbt12Base: number;
  rbt12Parcial: boolean;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  aliquotaEfetiva: number;
  receitaMes: number;
  valorDAS: number;
  versaoRegra: string;
  divergencia: { informado: number; calculado: number } | null;
}

export interface ResultadoCalculo extends MemoriaCalculo {}

export function calcularSimples(e: EntradaCalculo): ResultadoCalculo {
  if (e.receitaMes < 0) throw new ErroDominio("RECEITA_NEGATIVA");
  const temBasePropria = e.rbt12Calculado > 0;
  if (!temBasePropria) {
    if (e.rbt12Informado == null) throw new ErroDominio("SEM_HISTORICO_RBT12");
    if (e.rbt12Informado <= 0) throw new ErroDominio("RBT12_INVALIDO", String(e.rbt12Informado));
  }
  const base = temBasePropria ? e.rbt12Calculado : (e.rbt12Informado as number);

  const rule = findRule(e.anexo, base);
  const efetiva = Math.max(0, (base * rule.aliquotaNominal - rule.parcelaDeduzir) / base);
  const divergencia =
    temBasePropria && e.rbt12Informado != null && Math.abs(e.rbt12Informado - e.rbt12Calculado) > 0.01
      ? { informado: e.rbt12Informado, calculado: e.rbt12Calculado }
      : null;

  return {
    anexo: e.anexo,
    faixa: rule.faixa,
    rbt12Base: base,
    rbt12Parcial: e.rbt12Parcial ?? !temBasePropria,
    aliquotaNominal: rule.aliquotaNominal,
    parcelaDeduzir: rule.parcelaDeduzir,
    aliquotaEfetiva: efetiva,
    receitaMes: e.receitaMes,
    valorDAS: arred2(e.receitaMes * efetiva),
    versaoRegra: VERSAO_ATUAL,
    divergencia,
  };
}

export interface Projecao {
  receitaEstimada: number;
  aliquotaEfetiva: number;
  valorDAS: number;
  faixa: number;
}

/** Hipotese conservadora: proximo RBT12 ~= atual (receitas estaveis). */
export function projetarProximoMes(receitasAnteriores: number[], rbt12Atual: number, anexo: Anexo): Projecao {
  if (receitasAnteriores.length === 0 || rbt12Atual <= 0) {
    return { receitaEstimada: 0, aliquotaEfetiva: 0, valorDAS: 0, faixa: 1 };
  }
  const janela = receitasAnteriores.slice(-3);
  const receitaEstimada = arred2(janela.reduce((a, b) => a + b, 0) / janela.length);
  const rule = findRule(anexo, rbt12Atual);
  const efetiva = Math.max(0, (rbt12Atual * rule.aliquotaNominal - rule.parcelaDeduzir) / rbt12Atual);
  return { receitaEstimada, aliquotaEfetiva: efetiva, valorDAS: arred2(receitaEstimada * efetiva), faixa: rule.faixa };
}

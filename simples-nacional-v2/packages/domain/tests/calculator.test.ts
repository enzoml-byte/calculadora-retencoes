import { describe, expect, it } from "vitest";
import { calcularSimples, projetarProximoMes } from "../src/calculator.js";
import { ErroDominio } from "../src/errors.js";
import type { Anexo } from "@v2/tax-rules";

const faixas: { anexo: Anexo; rbt12: number; faixa: number; nominal: number; deduzir: number }[] = [
  { anexo: "III", rbt12: 100000, faixa: 1, nominal: 0.06, deduzir: 0 },
  { anexo: "III", rbt12: 300000, faixa: 2, nominal: 0.112, deduzir: 9360 },
  { anexo: "III", rbt12: 500000, faixa: 3, nominal: 0.135, deduzir: 17640 },
  { anexo: "III", rbt12: 1000000, faixa: 4, nominal: 0.16, deduzir: 35640 },
  { anexo: "III", rbt12: 2000000, faixa: 5, nominal: 0.21, deduzir: 125640 },
  { anexo: "III", rbt12: 10000000, faixa: 6, nominal: 0.33, deduzir: 648000 },
  { anexo: "IV", rbt12: 100000, faixa: 1, nominal: 0.045, deduzir: 0 },
  { anexo: "IV", rbt12: 300000, faixa: 2, nominal: 0.09, deduzir: 8100 },
  { anexo: "IV", rbt12: 500000, faixa: 3, nominal: 0.102, deduzir: 12420 },
  { anexo: "IV", rbt12: 1000000, faixa: 4, nominal: 0.14, deduzir: 39780 },
  { anexo: "IV", rbt12: 2000000, faixa: 5, nominal: 0.22, deduzir: 183780 },
  { anexo: "IV", rbt12: 10000000, faixa: 6, nominal: 0.33, deduzir: 828000 },
  { anexo: "V", rbt12: 100000, faixa: 1, nominal: 0.155, deduzir: 0 },
  { anexo: "V", rbt12: 300000, faixa: 2, nominal: 0.18, deduzir: 4500 },
  { anexo: "V", rbt12: 500000, faixa: 3, nominal: 0.195, deduzir: 9900 },
  { anexo: "V", rbt12: 1000000, faixa: 4, nominal: 0.205, deduzir: 17100 },
  { anexo: "V", rbt12: 2000000, faixa: 5, nominal: 0.23, deduzir: 62100 },
  { anexo: "V", rbt12: 10000000, faixa: 6, nominal: 0.305, deduzir: 540000 },
];

describe("calcularSimples — todas as faixas III/IV/V", () => {
  for (const f of faixas) {
    it(`${f.anexo} faixa ${f.faixa} (RBT12 ${f.rbt12})`, () => {
      const r = calcularSimples({ anexo: f.anexo, receitaMes: 10000, rbt12Calculado: f.rbt12 });
      expect(r.faixa).toBe(f.faixa);
      expect(r.aliquotaNominal).toBe(f.nominal);
      expect(r.parcelaDeduzir).toBe(f.deduzir);
      expect(r.aliquotaEfetiva).toBeCloseTo((f.rbt12 * f.nominal - f.deduzir) / f.rbt12, 10);
      expect(r.valorDAS).toBeCloseTo(10000 * r.aliquotaEfetiva, 2);
      expect(r.versaoRegra).toBe("2024.1");
    });
  }
});

describe("valores-ouro", () => {
  it("III RBT12 300k receita 10k => efetiva 0.0808, DAS 808", () => {
    const r = calcularSimples({ anexo: "III", receitaMes: 10000, rbt12Calculado: 300000 });
    expect(r.aliquotaEfetiva).toBeCloseTo(0.0808, 10);
    expect(r.valorDAS).toBeCloseTo(808, 2);
  });
  it("IV RBT12 500k receita 50k => DAS 3858", () => {
    const r = calcularSimples({ anexo: "IV", receitaMes: 50000, rbt12Calculado: 500000 });
    expect(r.aliquotaEfetiva).toBeCloseTo(0.07716, 10);
    expect(r.valorDAS).toBeCloseTo(3858, 2);
  });
  it("V RBT12 2M receita 100k => DAS 19895", () => {
    const r = calcularSimples({ anexo: "V", receitaMes: 100000, rbt12Calculado: 2000000 });
    expect(r.aliquotaEfetiva).toBeCloseTo(0.19895, 10);
    expect(r.valorDAS).toBeCloseTo(19895, 2);
  });
});

describe("viradas de faixa", () => {
  it.each([
    [180000, 1],
    [180000.01, 2],
    [360000, 2],
    [360000.01, 3],
    [3600000, 5],
    [3600000.01, 6],
  ])("III RBT12 %s => faixa %s", (rbt12, faixa) => {
    expect(calcularSimples({ anexo: "III", receitaMes: 1000, rbt12Calculado: rbt12 }).faixa).toBe(faixa);
  });
});

describe("erros de dominio", () => {
  it("sem historico e sem informado => SEM_HISTORICO_RBT12", () => {
    expect(() => calcularSimples({ anexo: "III", receitaMes: 1000, rbt12Calculado: 0 })).toThrowError(ErroDominio);
    try {
      calcularSimples({ anexo: "III", receitaMes: 1000, rbt12Calculado: 0 });
    } catch (e) {
      expect((e as ErroDominio).codigo).toBe("SEM_HISTORICO_RBT12");
    }
  });
  it("informado zerado/negativo => RBT12_INVALIDO", () => {
    expect(() => calcularSimples({ anexo: "III", receitaMes: 1000, rbt12Calculado: 0, rbt12Informado: -5 })).toThrowError(
      expect.objectContaining({ codigo: "RBT12_INVALIDO" }),
    );
  });
  it("receita negativa => RECEITA_NEGATIVA", () => {
    expect(() => calcularSimples({ anexo: "III", receitaMes: -1, rbt12Calculado: 100000 })).toThrowError(
      expect.objectContaining({ codigo: "RECEITA_NEGATIVA" }),
    );
  });
});

describe("empresa nova e divergencia", () => {
  it("usa RBT12 informado do PGDAS com parcial=true", () => {
    const r = calcularSimples({ anexo: "III", receitaMes: 20000, rbt12Calculado: 0, rbt12Informado: 100000 });
    expect(r.rbt12Base).toBe(100000);
    expect(r.rbt12Parcial).toBe(true);
    expect(r.faixa).toBe(1);
    expect(r.valorDAS).toBeCloseTo(1200, 2);
  });
  it("divergencia acima de 0.01 e exibida", () => {
    const r = calcularSimples({ anexo: "III", receitaMes: 1000, rbt12Calculado: 300000, rbt12Informado: 310000 });
    expect(r.divergencia).toEqual({ informado: 310000, calculado: 300000 });
    expect(r.rbt12Base).toBe(300000); // sistema usa o calculado
  });
  it("sem divergencia quando iguais ou dentro da tolerancia", () => {
    expect(
      calcularSimples({ anexo: "III", receitaMes: 1000, rbt12Calculado: 300000, rbt12Informado: 300000 }).divergencia,
    ).toBeNull();
    expect(
      calcularSimples({ anexo: "III", receitaMes: 1000, rbt12Calculado: 300000, rbt12Informado: 300000.005 }).divergencia,
    ).toBeNull();
  });
});

describe("projecao", () => {
  it("sem historico zera", () => {
    expect(projetarProximoMes([], 300000, "III")).toEqual({ receitaEstimada: 0, aliquotaEfetiva: 0, valorDAS: 0, faixa: 1 });
  });
  it("media das ultimas 3 com faixa do RBT12 atual", () => {
    const p = projetarProximoMes([10000, 20000, 30000, 40000], 300000, "III");
    expect(p.receitaEstimada).toBe(30000);
    expect(p.faixa).toBe(2);
    expect(p.valorDAS).toBeCloseTo(30000 * 0.0808, 2);
  });
});

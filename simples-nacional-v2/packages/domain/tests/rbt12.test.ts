import { describe, expect, it } from "vitest";
import { calcRBT12, type MesHistorico } from "../src/rbt12.js";

const mes = (competencia: string, receita: number): MesHistorico => ({ competencia, receita });

describe("RBT12", () => {
  it("soma 12 meses completos, parcial=false", () => {
    const comps = ["202302", "202303", "202304", "202305", "202306", "202307", "202308", "202309", "202310", "202311", "202312", "202401"];
    const r = calcRBT12(comps.map((c) => mes(c, 10000)), "202402");
    expect(r.rbt12).toBe(120000);
    expect(r.parcial).toBe(false);
    expect(r.mesesConsiderados).toBe(12);
  });
  it("historico incompleto soma disponivel e marca parcial", () => {
    const r = calcRBT12([mes("202310", 5000), mes("202311", 7000)], "202312");
    expect(r.rbt12).toBe(12000);
    expect(r.parcial).toBe(true);
    expect(r.mesesConsiderados).toBe(2);
  });
  it("empresa nova sem historico zera com parcial", () => {
    expect(calcRBT12([], "202401")).toEqual({ rbt12: 0, parcial: true, mesesConsiderados: 0 });
  });
  it("ignora mes atual e futuros", () => {
    const r = calcRBT12([mes("202401", 99999), mes("202402", 1), mes("202312", 4000)], "202401");
    expect(r.rbt12).toBe(4000);
    expect(r.mesesConsiderados).toBe(1);
  });
  it("usa so os 12 mais recentes quando ha 15", () => {
    const comps = [
      "202210", "202211", "202212",
      "202301", "202302", "202303", "202304", "202305", "202306", "202307", "202308", "202309", "202310", "202311", "202312",
    ];
    // 3 mais antigos valem 1, os 12 recentes valem 1000
    const hist = comps.map((c, i) => mes(c, i < 3 ? 1 : 1000));
    const r = calcRBT12(hist, "202401");
    expect(r.mesesConsiderados).toBe(12);
    expect(r.rbt12).toBe(12000);
  });
});

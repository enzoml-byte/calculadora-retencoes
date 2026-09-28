import { describe, expect, it } from "vitest";
import { extrairDadosPgdas, parseBRL } from "../src/pdf.js";

const PGDAS_CHEIO = `
PGDAS-D - Demonstrativo
CNPJ: 11.222.333/0001-81
Competencia: 01/2024
Receita Bruta do Mes R$ 20.000,00
RBT12 R$ 120.000,00
Anexo III
`;

describe("parseBRL", () => {
  it("converte formatos BR", () => {
    expect(parseBRL("20.000,00")).toBe(20000);
    expect(parseBRL("1234,5")).toBe(1234.5);
    expect(parseBRL("500")).toBe(500);
    expect(parseBRL("abc")).toBeUndefined();
    expect(parseBRL("")).toBeUndefined();
  });
});

describe("extrairDadosPgdas", () => {
  it("extrai todos os campos do texto completo", () => {
    const d = extrairDadosPgdas(PGDAS_CHEIO);
    expect(d.cnpj).toBe("11222333000181");
    expect(d.periodoApuracao).toBe("202401");
    expect(d.receitaBrutaMes).toBe(20000);
    expect(d.rbt12InformadoPgdas).toBe(120000);
    expect(d.anexoSugerido).toBe("III");
    expect(d.avisos).toEqual([]);
  });
  it("aceita 'Periodo de Apuracao' e anexos IV/V", () => {
    const d = extrairDadosPgdas("Periodo de Apuracao: 12/2023\nAnexo V\nReceita Bruta R$ 1.234,56\nRBT12 R$ 500.000,00\nCNPJ 04.252.172/0001-03");
    expect(d.periodoApuracao).toBe("202312");
    expect(d.anexoSugerido).toBe("V");
    expect(d.receitaBrutaMes).toBe(1234.56);
  });
  it("texto ilegivel gera so avisos, nunca valores", () => {
    const d = extrairDadosPgdas("documento escaneado sem texto util");
    expect(d.cnpj).toBeUndefined();
    expect(d.receitaBrutaMes).toBeUndefined();
    expect(d.avisos).toEqual(
      expect.arrayContaining([
        "cnpj_nao_identificado",
        "periodo_nao_identificado",
        "receita_nao_identificada",
        "rbt12_nao_identificado",
        "anexo_nao_identificado",
      ]),
    );
  });
  it("parcial: so o que achou, resto em avisos", () => {
    const d = extrairDadosPgdas("Receita Bruta R$ 100,00");
    expect(d.receitaBrutaMes).toBe(100);
    expect(d.avisos).toContain("cnpj_nao_identificado");
    expect(d.avisos).not.toContain("receita_nao_identificada");
  });
});

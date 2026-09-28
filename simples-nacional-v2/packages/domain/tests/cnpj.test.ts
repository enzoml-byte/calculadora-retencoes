import { describe, expect, it } from "vitest";
import { isValidCNPJ } from "../src/cnpj.js";

describe("CNPJ", () => {
  it("aceita CNPJ valido com mascara", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
  });
  it("aceita CNPJ valido sem mascara", () => {
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });
  it("rejeita digito verificador errado", () => {
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
  });
  it("rejeita sequencia repetida", () => {
    expect(isValidCNPJ("00000000000000")).toBe(false);
  });
  it("rejeita tamanho errado", () => {
    expect(isValidCNPJ("123")).toBe(false);
  });
  it("aceita CNPJ sintetico com digito 0 (resto < 2)", () => {
    // base 000000000006: soma=12, resto 1 => d1=0; d2: soma=18, resto 7 => d2=4
    expect(isValidCNPJ("00000000000604")).toBe(true);
  });
});

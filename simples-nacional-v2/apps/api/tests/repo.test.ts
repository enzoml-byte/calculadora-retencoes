import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const apiDir = join(dir, "..");
// Prisma SQLite exige barras normais na URL, mesmo no Windows.
const testDb = join(apiDir, "prisma", "test.db").replace(/\\/g, "/");

process.env.DATABASE_URL = `file:${testDb}`;

async function negocio() {
  return import("../src/negocio.js");
}
async function db() {
  return import("../src/db.js");
}

beforeAll(() => {
  if (existsSync(testDb)) rmSync(testDb);
  execSync("npx prisma migrate deploy", { cwd: apiDir, env: { ...process.env, DATABASE_URL: `file:${testDb}` }, stdio: "pipe" });
});

afterAll(async () => {
  await (await db()).fecharDb();
  if (existsSync(testDb)) rmSync(testDb);
});

const CNPJ = "11222333000181";

describe("empresas", () => {
  it("cria com CNPJ valido e rejeita duplicado/invalido", async () => {
    const n = await negocio();
    const e = await n.criarEmpresa({ razaoSocial: "ACME LTDA", cnpj: CNPJ });
    expect(e.id).toBeTruthy();
    await expect(n.criarEmpresa({ razaoSocial: "Outra", cnpj: CNPJ })).rejects.toMatchObject({ codigo: "CNPJ_DUPLICADO", http: 409 });
    await expect(n.criarEmpresa({ razaoSocial: "X", cnpj: "00000000000000" })).rejects.toMatchObject({ codigo: "CNPJ_INVALIDO", http: 422 });
  });
});

describe("apuracoes", () => {
  it("primeiro mes sem RBT12 exige informado; depois calcula sozinho", async () => {
    const n = await negocio();
    const emp = await n.criarEmpresa({ razaoSocial: "Beta SA", cnpj: "00000000000604" });
    await expect(
      n.salvarApuracao({ empresaId: emp.id, periodoApuracao: "202401", receitaBrutaMes: 20000, anexo: "III" }),
    ).rejects.toMatchObject({ codigo: "SEM_HISTORICO_RBT12" });

    const a1 = await n.salvarApuracao({
      empresaId: emp.id, periodoApuracao: "202401", receitaBrutaMes: 20000, anexo: "III", rbt12InformadoPgdas: 120000,
    });
    expect(a1.rbt12Calculado).toBe(0);
    expect(a1.aliquotaEfetiva).toBeCloseTo(0.06, 10);
    expect(a1.valorDAS).toBeCloseTo(1200, 2);
    expect(a1.versaoRegra).toBe("2024.1");

    const a2 = await n.salvarApuracao({
      empresaId: emp.id, periodoApuracao: "202402", receitaBrutaMes: 20000, anexo: "III",
    });
    expect(a2.rbt12Calculado).toBe(20000);
    await expect(
      n.salvarApuracao({ empresaId: emp.id, periodoApuracao: "202402", receitaBrutaMes: 1, anexo: "III", rbt12InformadoPgdas: 999 }),
    ).rejects.toMatchObject({ codigo: "APURACAO_DUPLICADA", http: 409 });
  });

  it("retifica preservando a antiga com substituidaPorId", async () => {
    const n = await negocio();
    const { fecharDb } = await db();
    const emp = await n.criarEmpresa({ razaoSocial: "Gama ME", cnpj: "12345678000195" });
    const a1 = await n.salvarApuracao({
      empresaId: emp.id, periodoApuracao: "202401", receitaBrutaMes: 10000, anexo: "IV", rbt12InformadoPgdas: 300000,
    });
    const nova = await n.retificarApuracao(a1.id, { receitaBrutaMes: 15000, anexo: "IV", rbt12InformadoPgdas: 300000 });
    expect(nova.id).not.toBe(a1.id);
    expect(nova.receitaBrutaMes).toBe(15000);
    const { getDb } = await db();
    const antiga = await getDb().apuracao.findUnique({ where: { id: a1.id } });
    expect(antiga?.substituidaPorId).toBe(nova.id);
    const dash = await n.dashboard(emp.id);
    expect(dash.apuracoes).toHaveLength(1);
    expect(dash.apuracoes[0].id).toBe(nova.id);
    await fecharDb();
  });

  it("dashboard traz RBT12 e projecao", async () => {
    const n = await negocio();
    const emp = await n.criarEmpresa({ razaoSocial: "Delta LTDA", cnpj: "04252172000103" });
    await expect(n.dashboard("inexistente")).rejects.toMatchObject({ codigo: "EMPRESA_NAO_ENCONTRADA" });
    await n.salvarApuracao({ empresaId: emp.id, periodoApuracao: "202401", receitaBrutaMes: 30000, anexo: "V", rbt12InformadoPgdas: 500000 });
    await n.salvarApuracao({ empresaId: emp.id, periodoApuracao: "202402", receitaBrutaMes: 30000, anexo: "V" });
    const dash = await n.dashboard(emp.id);
    expect(dash.rbt12Atual).toBe(60000);
    expect(dash.rbt12Parcial).toBe(true);
    expect(dash.projecao.receitaEstimada).toBe(30000);
  });
});

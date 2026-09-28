import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/rotas.js";
import { fecharDb } from "../src/db.js";

const dir = dirname(fileURLToPath(import.meta.url));
const apiDir = join(dir, "..").replace(/\\/g, "/");
const testDb = `${apiDir}/prisma/test-rotas.db`;
process.env.DATABASE_URL = `file:${testDb}`;

const app = buildApp();

beforeAll(async () => {
  if (existsSync(testDb)) rmSync(testDb);
  execSync("npx prisma migrate deploy", { cwd: apiDir, env: { ...process.env, DATABASE_URL: `file:${testDb}` }, stdio: "pipe" });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await fecharDb();
  if (existsSync(testDb)) rmSync(testDb);
});

const multipart = (filename: string, mimetype: string, conteudo: string): { corpo: string; contentType: string } => {
  const b = "bound123";
  const corpo =
    `--${b}\r\nContent-Disposition: form-data; name="arquivo"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n${conteudo}\r\n--${b}--\r\n`;
  return { corpo, contentType: `multipart/form-data; boundary=${b}` };
};

describe("rotas", () => {
  it("health", async () => {
    const r = await app.inject({ method: "GET", url: "/api/health" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true });
  });

  it("empresas: cria, valida, lista", async () => {
    const ok = await app.inject({ method: "POST", url: "/api/empresas", payload: { razaoSocial: "Rota LTDA", cnpj: "11.222.333/0001-81" } });
    expect(ok.statusCode).toBe(201);
    const invalido = await app.inject({ method: "POST", url: "/api/empresas", payload: { razaoSocial: "X", cnpj: "00000000000000" } });
    expect(invalido.statusCode).toBe(422);
    expect(invalido.json().codigo).toBe("CNPJ_INVALIDO");
    const lista = await app.inject({ method: "GET", url: "/api/empresas" });
    expect(lista.json()).toHaveLength(1);
  });

  it("confirmar: 422 sem RBT12, 201 com informado, 409 duplicada, dashboard ok", async () => {
    const emp = await app.inject({ method: "POST", url: "/api/empresas", payload: { razaoSocial: "Fluxo SA", cnpj: "00000000000604" } });
    const empresaId = emp.json().id as string;
    const base = { empresaId, periodoApuracao: "202401", receitaBrutaMes: 20000, anexo: "III" };

    const semRbt12 = await app.inject({ method: "POST", url: "/api/apuracoes/confirmar", payload: base });
    expect(semRbt12.statusCode).toBe(422);
    expect(semRbt12.json().codigo).toBe("SEM_HISTORICO_RBT12");

    const primeira = await app.inject({ method: "POST", url: "/api/apuracoes/confirmar", payload: { ...base, rbt12InformadoPgdas: 120000 } });
    expect(primeira.statusCode).toBe(201);
    expect(primeira.json().valorDAS).toBeCloseTo(1200, 2);

    const duplicada = await app.inject({ method: "POST", url: "/api/apuracoes/confirmar", payload: { ...base, rbt12InformadoPgdas: 120000 } });
    expect(duplicada.statusCode).toBe(409);

    const dash = await app.inject({ method: "GET", url: `/api/empresas/${empresaId}/dashboard` });
    expect(dash.statusCode).toBe(200);
    expect(dash.json().apuracoes).toHaveLength(1);
    expect(dash.json().projecao.receitaEstimada).toBe(20000);

    const ret = await app.inject({
      method: "POST", url: `/api/apuracoes/${primeira.json().id as string}/retificar`,
      payload: { receitaBrutaMes: 25000, anexo: "III", rbt12InformadoPgdas: 120000 },
    });
    expect(ret.statusCode).toBe(201);
    expect(ret.json().valorDAS).toBeCloseTo(1500, 2);
  });

  it("import: rejeita nao-PDF e PDF ilegivel", async () => {
    const txt = multipart("x.txt", "text/plain", "hello");
    const naoPdf = await app.inject({ method: "POST", url: "/api/import/pdf", headers: { "content-type": txt.contentType }, payload: txt.corpo });
    expect(naoPdf.statusCode).toBe(422);
    expect(naoPdf.json().codigo).toBe("NAO_E_PDF");

    const lixo = multipart("x.pdf", "application/pdf", "%PDF-1.4 lixo sem texto");
    const ilegivel = await app.inject({ method: "POST", url: "/api/import/pdf", headers: { "content-type": lixo.contentType }, payload: lixo.corpo });
    expect(ilegivel.statusCode).toBe(422);
    expect(ilegivel.json().codigo).toBe("PDF_INVALIDO");
  });
});

import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { getDb } from "./db.js";
import { criarEmpresa, dashboard, ErroNegocio, estimar, retificarApuracao, salvarApuracao } from "./negocio.js";
import { extrairDadosPgdas, extrairTextoPdf, PDF_MAX_BYTES } from "./pdf.js";
import { anexoSchema, confirmarApuracaoSchema, empresaSchema, periodoSchema } from "./validacao.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(cors);
  void app.register(multipart, { limits: { fileSize: PDF_MAX_BYTES, files: 1 } });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ErroNegocio) return reply.code(err.http).send({ codigo: err.codigo, mensagem: err.message });
    if (err instanceof ZodError) return reply.code(422).send({ codigo: "VALIDACAO", detalhes: err.issues });
    return reply.code(500).send({ codigo: "ERRO_INTERNO" });
  });

  app.get("/api/health", () => ({ ok: true }));

  app.post("/api/empresas", async (req, reply) => reply.code(201).send(await criarEmpresa(empresaSchema.parse(req.body))));

  app.get("/api/empresas", async () =>
    getDb().empresa.findMany({ orderBy: { razaoSocial: "asc" } }),
  );

  app.post("/api/import/pdf", async (req, reply) => {
    const arquivo = await req.file();
    if (!arquivo) return reply.code(422).send({ codigo: "ARQUIVO_AUSENTE" });
    if (arquivo.mimetype !== "application/pdf") return reply.code(422).send({ codigo: "NAO_E_PDF" });
    const buffer = await arquivo.toBuffer();
    let texto: string;
    try {
      texto = await extrairTextoPdf(buffer);
    } catch {
      return reply.code(422).send({ codigo: "PDF_INVALIDO" });
    }
    const extraido = extrairDadosPgdas(texto);
    const resposta: Record<string, unknown> = {
      extraido,
      calculoEstimado: null,
      avisos: extraido.avisos,
    };
    // Estimativa quando da para vincular empresa + campos minimos.
    if (extraido.cnpj && extraido.periodoApuracao && extraido.receitaBrutaMes !== undefined && extraido.anexoSugerido) {
      const empresa = await getDb().empresa.findUnique({ where: { cnpj: extraido.cnpj } });
      if (empresa) {
        try {
          resposta.calculoEstimado = await estimar(empresa.id, {
            periodoApuracao: periodoSchema.parse(extraido.periodoApuracao),
            receitaBrutaMes: extraido.receitaBrutaMes,
            anexo: anexoSchema.parse(extraido.anexoSugerido),
            rbt12InformadoPgdas: extraido.rbt12InformadoPgdas,
          });
        } catch {
          resposta.avisos = [...extraido.avisos, "calculo_estimado_indisponivel"];
        }
      } else {
        resposta.avisos = [...extraido.avisos, "empresa_nao_cadastrada"];
      }
    }
    return resposta;
  });

  app.post("/api/apuracoes/confirmar", async (req, reply) =>
    reply.code(201).send(await salvarApuracao(confirmarApuracaoSchema.parse(req.body))),
  );

  app.post("/api/apuracoes/:id/retificar", async (req, reply) => {
    const { id } = req.params as { id: string };
    const corpo = confirmarApuracaoSchema.omit({ empresaId: true, periodoApuracao: true }).parse(req.body);
    return reply.code(201).send(await retificarApuracao(id, corpo));
  });

  app.get("/api/empresas/:id/dashboard", async (req) => dashboard((req.params as { id: string }).id));

  return app;
}

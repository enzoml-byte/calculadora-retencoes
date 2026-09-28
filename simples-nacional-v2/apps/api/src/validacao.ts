import { z } from "zod";

export const anexoSchema = z.enum(["III", "IV", "V"]);
export const periodoSchema = z.string().regex(/^\d{6}$/, "periodo AAAAMM");
export const cnpjSchema = z.string().regex(/^\d{14}$/, "cnpj 14 digitos");

export const empresaSchema = z.object({
  razaoSocial: z.string().trim().min(1).max(200),
  nomeFantasia: z.string().trim().max(200).optional(),
  cnpj: z.string().transform((s) => s.replace(/\D/g, "")).pipe(cnpjSchema),
});

export const confirmarApuracaoSchema = z.object({
  empresaId: z.string().min(1),
  periodoApuracao: periodoSchema,
  receitaBrutaMes: z.number().nonnegative(),
  anexo: anexoSchema,
  rbt12InformadoPgdas: z.number().positive().optional(),
  arquivoOriginal: z.string().max(255).optional(),
  observacoes: z.string().max(2000).optional(),
});

export type ConfirmarApuracao = z.infer<typeof confirmarApuracaoSchema>;

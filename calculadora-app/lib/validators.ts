import { z } from 'zod'

export const cnpjSchema = z.string().length(14, 'CNPJ deve ter 14 dígitos')

export const empresaCreateSchema = z.object({
  cnpj: cnpjSchema,
  razaoSocial: z.string().min(2, 'Razão social é obrigatória'),
  nomeFantasia: z.string().optional(),
  regime: z.enum(['SIMPLES', 'PRESUMIDO_GERAL', 'PRESUMIDO_HOSPITALAR']),
  anexo: z.enum(['III', 'IV', 'V']).optional(),
  rbt12: z.coerce.number().positive().optional(),
  issRetido: z.enum(['SEMPRE', 'NUNCA', 'PERGUNTAR']).default('SEMPRE'),
  informaIbsCbs: z.boolean().default(true),
})

export const empresaUpdateSchema = empresaCreateSchema.partial()

export const notaCreateSchema = z.object({
  empresaId: z.string().cuid(),
  numeroNf: z.string().optional(),
  serie: z.string().optional(),
  valorBruto: z.coerce.number().positive('Valor bruto deve ser positivo'),
  regime: z.enum(['SIMPLES', 'PRESUMIDO_GERAL', 'PRESUMIDO_HOSPITALAR']),
  issRetido: z.boolean(),
  ibsPerc: z.coerce.number().min(0).default(0),
  cbsPerc: z.coerce.number().min(0).default(0),
  informaIbsCbs: z.boolean().default(false),
})

export const conciliacaoUploadSchema = z.object({
  contaBancaria: z.string().min(1, 'Conta bancária é obrigatória'),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Nome é obrigatório'),
})

export type EmpresaCreate = z.infer<typeof empresaCreateSchema>
export type EmpresaUpdate = z.infer<typeof empresaUpdateSchema>
export type NotaCreate = z.infer<typeof notaCreateSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
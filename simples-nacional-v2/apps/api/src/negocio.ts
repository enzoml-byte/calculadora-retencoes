import { type Apuracao, type Empresa, Prisma, type PrismaClient } from "@prisma/client";
import { calcularSimples, calcRBT12, ErroDominio, isValidCNPJ, projetarProximoMes } from "@v2/domain";
import type { Anexo } from "@v2/tax-rules";
import { getDb } from "./db.js";
import type { ConfirmarApuracao } from "./validacao.js";

export class ErroNegocio extends Error {
  readonly codigo: string;
  readonly http: number;
  constructor(codigo: string, http: number, detalhe?: string) {
    super(detalhe ? `${codigo}:${detalhe}` : codigo);
    this.name = "ErroNegocio";
    this.codigo = codigo;
    this.http = http;
  }
}

const deDominio = (codigo: string): ErroNegocio => {
  switch (codigo) {
    case "CNPJ_INVALIDO":
      return new ErroNegocio(codigo, 422);
    case "SEM_HISTORICO_RBT12":
      return new ErroNegocio(codigo, 422, "informe o RBT12 do PGDAS na conferencia");
    case "APURACAO_DUPLICADA":
      return new ErroNegocio(codigo, 409);
    default:
      return new ErroNegocio(codigo, 422);
  }
};

export async function criarEmpresa(input: { razaoSocial: string; nomeFantasia?: string; cnpj: string }): Promise<Empresa> {
  if (!isValidCNPJ(input.cnpj)) throw new ErroNegocio("CNPJ_INVALIDO", 422);
  const db = getDb();
  const existente = await db.empresa.findUnique({ where: { cnpj: input.cnpj } });
  if (existente) throw new ErroNegocio("CNPJ_DUPLICADO", 409);
  return db.empresa.create({ data: input });
}

/** Cliente de banco ou de transacao (mesmos delegates). */
type Tx = Pick<PrismaClient, "empresa" | "apuracao">;

/** Historico ativo (nao-retificado) ordenado ascendente. */
async function historicoAtivo(db: Tx, empresaId: string): Promise<Apuracao[]> {
  return db.apuracao.findMany({
    where: { empresaId, substituidaPorId: null },
    orderBy: { periodoApuracao: "asc" },
  });
}

export async function salvarApuracao(input: ConfirmarApuracao, opts?: { retificandoId?: string }): Promise<Apuracao> {
  return salvarComTx(getDb(), input, opts);
}

async function salvarComTx(db: Tx, input: ConfirmarApuracao, opts?: { retificandoId?: string }): Promise<Apuracao> {
  const empresa = await db.empresa.findUnique({ where: { id: input.empresaId } });
  if (!empresa) throw new ErroNegocio("EMPRESA_NAO_ENCONTRADA", 404);

  // Na retificacao, a apuracao antiga sai do historico (mesmo periodo pode repetir).
  const hist = (await historicoAtivo(db, input.empresaId)).filter((a) => a.id !== opts?.retificandoId);
  if (hist.some((a) => a.periodoApuracao === input.periodoApuracao)) {
    throw new ErroNegocio("APURACAO_DUPLICADA", 409);
  }
  const rbt12 = calcRBT12(
    hist.map((a) => ({ competencia: a.periodoApuracao, receita: a.receitaBrutaMes })),
    input.periodoApuracao,
  );
  let memoria;
  try {
    memoria = calcularSimples({
      anexo: input.anexo as Anexo,
      receitaMes: input.receitaBrutaMes,
      rbt12Calculado: rbt12.rbt12,
      rbt12Informado: input.rbt12InformadoPgdas,
      rbt12Parcial: rbt12.parcial,
    });
  } catch (e) {
    if (e instanceof ErroDominio) throw deDominio(e.codigo);
    throw e;
  }
  try {
    return await db.apuracao.create({
      data: {
        empresaId: input.empresaId,
        periodoApuracao: input.periodoApuracao,
        receitaBrutaMes: input.receitaBrutaMes,
        rbt12InformadoPgdas: input.rbt12InformadoPgdas,
        rbt12Calculado: rbt12.rbt12,
        anexo: input.anexo,
        aliquotaNominal: memoria.aliquotaNominal,
        parcelaDeduzir: memoria.parcelaDeduzir,
        aliquotaEfetiva: memoria.aliquotaEfetiva,
        valorDAS: memoria.valorDAS,
        arquivoOriginal: input.arquivoOriginal,
        observacoes: input.observacoes,
        versaoRegra: memoria.versaoRegra,
      },
    });
  } catch (e) {
    // So violacao de unicidade vira 409; demais erros de banco sobem puros.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ErroNegocio("APURACAO_DUPLICADA", 409);
    }
    throw e;
  }
}

export async function retificarApuracao(id: string, correcao: Omit<ConfirmarApuracao, "empresaId" | "periodoApuracao">): Promise<Apuracao> {
  // Transacao: reserva a antiga com sentinela para liberar o indice parcial
  // (empresa, periodo) antes de inserir a nova; depois aponta para a nova.
  return getDb().$transaction(async (tx) => {
    const antiga = await tx.apuracao.findUnique({ where: { id } });
    if (!antiga || antiga.substituidaPorId) throw new ErroNegocio("APURACAO_NAO_ENCONTRADA", 404);
    await tx.apuracao.update({ where: { id }, data: { substituidaPorId: `retificando:${id}` } });
    const nova = await salvarComTx(
      tx,
      {
        ...correcao,
        empresaId: antiga.empresaId,
        periodoApuracao: antiga.periodoApuracao,
      },
      { retificandoId: id },
    );
    await tx.apuracao.update({ where: { id }, data: { substituidaPorId: nova.id } });
    return nova;
  });
}

export async function dashboard(empresaId: string): Promise<{
  empresa: Empresa;
  apuracoes: Apuracao[];
  rbt12Atual: number;
  rbt12Parcial: boolean;
  projecao: { receitaEstimada: number; aliquotaEfetiva: number; valorDAS: number; faixa: number };
}> {
  const db = getDb();
  const empresa = await db.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new ErroNegocio("EMPRESA_NAO_ENCONTRADA", 404);
  const apuracoes = await historicoAtivo(db, empresaId);
  const ultimo = apuracoes[apuracoes.length - 1];
  const rbt12 = calcRBT12(
    apuracoes.map((a) => ({ competencia: a.periodoApuracao, receita: a.receitaBrutaMes })),
    "999999",
  );
  const projecao = projetarProximoMes(
    apuracoes.map((a) => a.receitaBrutaMes),
    rbt12.rbt12,
    (ultimo?.anexo as Anexo | undefined) ?? "III",
  );
  return { empresa, apuracoes, rbt12Atual: rbt12.rbt12, rbt12Parcial: rbt12.parcial, projecao };
}

/** Estimativa sem persistir (tela de conferencia do import). */
export async function estimar(empresaId: string, input: { periodoApuracao: string; receitaBrutaMes: number; anexo: Anexo; rbt12InformadoPgdas?: number }) {
  const db = getDb();
  const empresa = await db.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new ErroNegocio("EMPRESA_NAO_ENCONTRADA", 404);
  const hist = await historicoAtivo(db, empresaId);
  const rbt12 = calcRBT12(
    hist.map((a) => ({ competencia: a.periodoApuracao, receita: a.receitaBrutaMes })),
    input.periodoApuracao,
  );
  try {
    const memoria = calcularSimples({
      anexo: input.anexo,
      receitaMes: input.receitaBrutaMes,
      rbt12Calculado: rbt12.rbt12,
      rbt12Informado: input.rbt12InformadoPgdas,
      rbt12Parcial: rbt12.parcial,
    });
    return { rbt12Calculado: rbt12.rbt12, rbt12Parcial: rbt12.parcial, memoria };
  } catch (e) {
    if (e instanceof ErroDominio) throw deDominio(e.codigo);
    throw e;
  }
}

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "dataCadastro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Apuracao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "periodoApuracao" TEXT NOT NULL,
    "receitaBrutaMes" REAL NOT NULL,
    "rbt12InformadoPgdas" REAL,
    "rbt12Calculado" REAL NOT NULL,
    "anexo" TEXT NOT NULL,
    "aliquotaNominal" REAL NOT NULL,
    "parcelaDeduzir" REAL NOT NULL,
    "aliquotaEfetiva" REAL NOT NULL,
    "valorDAS" REAL NOT NULL,
    "arquivoOriginal" TEXT,
    "observacoes" TEXT,
    "versaoRegra" TEXT NOT NULL,
    "substituidaPorId" TEXT,
    "dataImportacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Apuracao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "anexo" TEXT NOT NULL,
    "faixa" INTEGER NOT NULL,
    "limiteInferior" REAL NOT NULL,
    "limiteSuperior" REAL,
    "aliquotaNominal" REAL NOT NULL,
    "parcelaDeduzir" REAL NOT NULL,
    "vigenciaInicio" DATETIME NOT NULL,
    "vigenciaFim" DATETIME,
    "versao" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE INDEX "Apuracao_empresaId_periodoApuracao_idx" ON "Apuracao"("empresaId", "periodoApuracao");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRule_anexo_faixa_versao_key" ON "TaxRule"("anexo", "faixa", "versao");

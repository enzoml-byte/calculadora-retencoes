-- Unicidade de (empresaId, periodoApuracao) apenas entre apuracoes ativas.
-- SQLite trata NULL como distinto em UNIQUE, por isso o indice parcial.
CREATE UNIQUE INDEX IF NOT EXISTS "Apuracao_empresa_periodo_ativo"
  ON "Apuracao" ("empresaId", "periodoApuracao")
  WHERE "substituidaPorId" IS NULL;

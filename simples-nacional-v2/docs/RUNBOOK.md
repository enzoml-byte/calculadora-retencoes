# RUNBOOK — Operação v2

## Subir local (5 comandos)
```
corepack prepare pnpm@9.0.0 --activate   # 1x por maquina (chamar via pnpm.cmd no PowerShell com execution policy restrita)
pnpm install
pnpm --filter @v2/api db:generate
pnpm --filter @v2/api db:migrate
pnpm --filter @v2/api db:seed
pnpm -r --parallel --if-present dev      # api :3001 + web :3000
```
Web usa `/api` (proxy do Vite) por padrão; `VITE_API_URL` só para apontar α outra API.

## Deploy (Docker)
```
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts
```
- Web: http://servidor/ (nginx) — `/api/` com proxy para o backend.
- Health: `GET http://servidor/api/health`.

## Atualizar regras tributárias (nova legislação)
1. Acrescentar linhas em `packages/tax-rules/src/index.ts` com nova `versao` + `vigenciaInicio` (nunca editar versão publicada) e bump em `VERSAO_ATUAL` se for a vigente.
2. Ajustar `docs/CONTRATOS.md` (tabelas) e casos-ouro em `packages/domain/tests/calculator.test.ts`.
3. `pnpm --filter @v2/domain test` (100% core) → `pnpm --filter @v2/api db:seed` (upsert idempotente).
4. Apurações antigas mantêm `versaoRegra` original — rastreabilidade garantida.

## Backup/restore SQLite
```
# backup (container parado ou copiando o volume)
docker compose cp backend:/app/apps/api/prisma/prod.db ./backup-$(date +%F).db
# restore: trocar o arquivo no volume e reiniciar
```

## Postgres (pós-MVP, não implementado)
Schema usa só tipos portáteis (String/Float/DateTime/Boolean), mas o `provider` está fixo em
`sqlite` e há 1 migration com SQL específico (índice parcial). Migrar exige: trocar provider,
reescrever a migration do índice parcial (Postgres suporta `WHERE` em índice) e testar.

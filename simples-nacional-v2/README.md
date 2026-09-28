# Simples Nacional v2 — Calculadora (Anexos III/IV/V)

Recomeço do zero. O projeto antigo em `../simples-calculator/` é **legado congelado**: vale só como referência de conceito, não reutilizar código, arquitetura ou estrutura.

Escopo v2 (idêntico ao legado, sem expansão):
- Cadastro de empresas com CNPJ
- Importação PDF PGDAS-D + tela de conferência editável
- Cálculo alíquota efetiva III/IV/V + RBT12 + projeção próximo mês
- Histórico, memória de cálculo, retificação, detecção divergência RBT12
- Regras tributárias versionadas

Documentos canônicos:
- `AGENTS.md` — lei-magna dos agentes (o que pode/não pode)
- `docs/ROADMAP.md` — fases F0–F7 com critérios de aceite
- `docs/LEGADO.md` — status do projeto antigo

Estrutura:
```
simples-nacional-v2/
├── AGENTS.md
├── docs/ROADMAP.md + CONTRATOS.md + RUNBOOK.md + LEGADO.md
├── apps/api/        # Fastify + Zod + Prisma + pdf-parse
├── apps/web/        # React + Vite
├── packages/domain/ # motor puro de cálculo (100% cobertura)
├── packages/tax-rules/ # tabelas III/IV/V versionadas (2024.1)
└── .opencode/
```

## Início rápido
```
pnpm install
pnpm --filter @v2/api db:generate
pnpm --filter @v2/api db:migrate
pnpm --filter @v2/api db:seed
pnpm -r --parallel --if-present dev      # api :3001 + web :3000
```
Detalhes em `docs/RUNBOOK.md`.

## Limitações do MVP (honestidade fiscal)
- Ferramenta de apoio: não substitui a declaração oficial no PGDAS.
- Só Anexos III/IV/V (comércio/indústria fora do escopo).
- Parser de PDF é heurístico: a tela de conferência é obrigatória antes de salvar.
- RBT12 do sistema usa só o histórico salvo; divergências contra o PGDAS são exibidas, nunca silenciadas.
- Banco SQLite (arquivo); Postgres é pós-MVP (ver RUNBOOK).

# ROADMAP — Simples Nacional v2

Guia único do dono + agentes. Ordem é obrigatória: não pular fase. Cada fase só fecha com seu `Done`.

## Princípios
- Legado (`../simples-calculator/`) congelado. Só conceito, nunca código.
- Motor tributário puro e testado antes de qualquer I/O (PDF, DB, HTTP).
- Regras tributárias versionadas, nunca editadas no lugar.
- Commits pequenos, revisados, sem segredo versionado. Repo raiz ainda sem commits — F0 prepara o primeiro commit limpo.

## Stack decidida
- Monorepo `pnpm + TypeScript strict`: `apps/api` (Fastify + Zod + Prisma), `apps/web` (React 18 + Vite), `packages/domain` (motor puro), `packages/tax-rules` (tabelas).
- DB: SQLite dev, Postgres prod via Prisma com migrations. Seed espelha `packages/tax-rules`.
- Testes: Vitest (unit/integração) + 1 smoke Playwright na F5. Lint/format + CI na F6. Docker só na F6.

## F0 — Fundação e governança
Objetivo: versionamento seguro e base auditável.
Entregáveis: esta pasta v2, `AGENTS.md`, `docs/LEGADO.md`, `.gitignore`, `pnpm-workspace.yaml`, `package.json` raiz, READMEs dos pacotes.
Prova: `git status` mostra só arquivos intencionais (sem `node_modules`, sem `*.db`, sem `.env`); `docs/ROADMAP.md` e `AGENTS.md` existem.
Done: primeiro commit `chore(v2): fundacao F0` com root + v2 ignorando dependências/dados. Não commitar legado nem `caderno-de-campo` junto sem decisão explícita.

## F1 — Domínio e contratos
Objetivo: congelar o que o sistema calcula antes de codar.
Entregáveis em `packages/tax-rules/README` + `docs/CONTRATOS.md` (criar na fase): tabelas III/IV/V (6 faixas cada, limites, nominal, dedução, vigência `2024.1`), fórmulas `Efetiva=(RBT12*Nom-Ded)/RBT12` e `DAS=ReceitaMes*Efetiva`, regras RBT12 (12 meses, histórico incompleto, empresa nova, meses sem movimento), divergência PGDAS vs sistema, projeção, unique `(empresa, periodo)`, retificação via `substituida_por_id`.
Prova: tabela revisada linha a linha pelo dono; casos de borda listados (virada de faixa, faixa 6 sem teto, CNPJ inválido, PDF ilegível).
Done: dono aprova `CONTRATOS.md`. Sem código de cálculo ainda.

## F2 — Motor de cálculo puro (TDD)
Objetivo: coração confiável, sem I/O.
Entregáveis em `packages/domain`: `TaxRuleRepository` (interface), `RBT12Calculator`, `SimplesCalculator` (efetiva + DAS + memória + projeção), testes Vitest.
Prova: `pnpm --filter domain test` verde; cobertura 100% do core; casos: cada anexo x cada faixa, transição, RBT12 completo/incompleto/novo, memória auditável, projeção.
Done: nenhum `import` de fs/http/prisma dentro de `domain`; regras só injetadas de `tax-rules`.

## F3 — Persistência versionada
Objetivo: guardar apurações com rastreabilidade.
Entregáveis: schema Prisma (`empresas`, `apuracoes`, `tax_rules` com `versao/vigencia`), migrations (nunca `db:push` em prod), seed a partir de `tax-rules`, `versao_regra` gravada em cada apuração.
Prova: criar empresa → salvar apuração → retificar (gera nova apontando `substituida_por_id`, antiga preservada); unique `(empresa, periodo)` rejeita duplicada; re-seed de nova versão não apaga histórico.
Done: teste de integração do repositório verde com SQLite de teste.

## F4 — Importação PGDAS-D
Objetivo: PDF vira dado conferível, nunca dado cego.
Entregáveis: parser isolado em `apps/api` (só PDF, 10MB, sanitiza nome), validação Zod, resposta `extraído + cálculo estimado + avisos`.
Prova: PDFs de exemplo (III, IV, V, ilegível, fora do escopo) com resultado esperado; campo não identificado vem marcado, nunca inventado; tela de conferência obrigatória antes de salvar.
Done: taxa de extração medida e documentada; nenhum salvamento direto do parser sem confirmação.

## F5 — API + Web mínimas
Objetivo: fluxo completo usável.
Entregáveis: `GET /api/health`, CRUD empresas, `POST /api/import/pdf` + `POST /api/apuracoes/confirmar`, `GET /api/empresas/:id/dashboard`; web com Empresas, Importar/Conferir, Dashboard.
Prova: fluxo manual ponta a ponta + 1 smoke Playwright; frontend sem fórmula tributária (só exibe API); erros 422 trazem memória de cálculo.
Done: `pnpm dev` sobe api+web; fluxo cadastrar → importar → conferir/corrigir → salvar → consultar funciona.

## F6 — Qualidade, DX e operação
Objetivo: manter barato e deployável.
Entregáveis: ESLint+Prettier, CI (install, typecheck, test, build), Docker multi-stage dev/prod com healthcheck, `.env.example`, runbook atualização de regras (editar `tax-rules` → nova versão+vigência → seed → teste).
Prova: CI verde; `docker compose up` dev e prod funcionam; backup/restore SQLite documentado; frontend prod via estático + proxy `/api`.
Done: nenhum segredo no repo; README de deploy em 5 comandos.

## F7 — Congelamento MVP
Objetivo: declarar pronto com honestidade fiscal.
Entregáveis: checklist: só III/IV/V, ferramenta de apoio (não substitui PGDAS oficial), parser pode falhar (conferência obrigatória), RBT12 do sistema usa só histórico salvo.
Prova: tag `v2-mvp` + nota de limitações na UI e no README.
Done: dono testa 3 empresas reais (fictícias ou cópias) e aprova.

## Riscos e travas
- Herdar código do legado: trava — qualquer import de `../simples-calculator` rejeita a fase.
- Editar regra publicada: trava — criar nova versão.
- Salvar sem conferência: trava — F4/F5 recusam.
- Commit com `.db`/`.env`/`node_modules`: trava — revisar `git status` antes.

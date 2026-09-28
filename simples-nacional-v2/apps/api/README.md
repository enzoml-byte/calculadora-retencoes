# apps/api — Fastify + Zod + Prisma

Entra na F3 (persistência) e F5 (rotas). Regras:
- Rotas finas, serviço de negócio chama `packages/domain`.
- Validação de entrada com Zod. Erro de domínio retorna 422 com memória de cálculo quando aplicável.
- Upload PDF: aceitar só PDF, máx. 10MB, sanitizar nome, nunca persistir sem passar pela tela de conferência (F4).
- `GET /api/health` obrigatório desde o primeiro endpoint.

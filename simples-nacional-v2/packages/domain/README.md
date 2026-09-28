# packages/domain — Motor puro de cálculo

Entra na F2. Regras:
- TypeScript strict, zero dependência de I/O (sem fs, sem DB, sem HTTP).
- Exporta `RBT12Calculator`, `SimplesCalculator`, `TaxRuleRepository` (interface).
- Toda regra tributária vem injetada via `packages/tax-rules`, nunca hardcoded.
- Testes Vitest cobrem: faixas III/IV/V, transição de faixa, RBT12 completo/incompleto/empresa nova, memória de cálculo, projeção.
- Done F2 = `pnpm --filter domain test` verde + cobertura 100% do core.

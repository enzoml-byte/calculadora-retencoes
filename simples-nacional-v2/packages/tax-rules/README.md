# packages/tax-rules — Tabelas III/IV/V versionadas

Entra na F1 (especificação) e F2 (dados).
- Fonte canônica das faixas: limite inferior/superior, alíquota nominal, parcela a deduzir, vigência, versão (ex: `2024.1`).
- Fórmula canônica: `Efetiva = (RBT12 * Nominal - Deduzir) / RBT12`, `DAS = ReceitaMes * Efetiva`.
- Nenhuma outra camada pode definir alíquota. Mudança de legislação = nova versão + nova vigência, nunca editar versão publicada.
- Seed futuro espelha exatamente este pacote.

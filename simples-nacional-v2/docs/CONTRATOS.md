# CONTRATOS — Domínio congelado v2 (F1)

Aprovado pelo dono = base para F2–F5. Conflito com legado: vale este arquivo.

## 1. Tabelas vigentes — versão `2024.1` (vigência 01/2024, sem fim)

Limites em R$. Faixa 6 sem teto (`limiteSuperior = null`).

### Anexo III
| Faixa | Inferior | Superior | Nominal | Deduzir |
|---|---|---|---|---|
| 1 | 0 | 180000 | 0.06 | 0 |
| 2 | 180000.01 | 360000 | 0.112 | 9360 |
| 3 | 360000.01 | 720000 | 0.135 | 17640 |
| 4 | 720000.01 | 1800000 | 0.16 | 35640 |
| 5 | 1800000.01 | 3600000 | 0.21 | 125640 |
| 6 | 3600000.01 | null | 0.33 | 648000 |

### Anexo IV
| Faixa | Inferior | Superior | Nominal | Deduzir |
|---|---|---|---|---|
| 1 | 0 | 180000 | 0.045 | 0 |
| 2 | 180000.01 | 360000 | 0.09 | 8100 |
| 3 | 360000.01 | 720000 | 0.102 | 12420 |
| 4 | 720000.01 | 1800000 | 0.14 | 39780 |
| 5 | 1800000.01 | 3600000 | 0.22 | 183780 |
| 6 | 3600000.01 | null | 0.33 | 828000 |

### Anexo V
| Faixa | Inferior | Superior | Nominal | Deduzir |
|---|---|---|---|---|
| 1 | 0 | 180000 | 0.155 | 0 |
| 2 | 180000.01 | 360000 | 0.18 | 4500 |
| 3 | 360000.01 | 720000 | 0.195 | 9900 |
| 4 | 720000.01 | 1800000 | 0.205 | 17100 |
| 5 | 1800000.01 | 3600000 | 0.23 | 62100 |
| 6 | 3600000.01 | null | 0.305 | 540000 |

## 2. Fórmulas (decimais, arredondamento half-up 2 casas só na exibição/DAS)
- `aliquotaEfetiva = (rbt12 * aliquotaNominal - parcelaDeduzir) / rbt12`
- `valorDAS = receitaBrutaMes * aliquotaEfetiva`
- `rbt12 <= 0` → erro de domínio `RBT12_INVALIDO` (nunca dividir por zero).
- Seleção de faixa: primeira regra do anexo onde `rbt12 >= limiteInferior && (limiteSuperior == null || rbt12 <= limiteSuperior)`.

## 3. RBT12
- Definição do sistema: soma da `receitaBrutaMes` das até 12 apurações salvas com competência < competência atual, mesma empresa, excluindo retificadas (`substituidaPorId != null` exclui a antiga, conta a nova).
- Histórico completo (12): soma direta.
- Histórico incompleto/empresa nova (<12): soma o disponível e sinaliza `rbt12Parcial: true` + aviso "RBT12 parcial: N de 12 meses".
- Divergência: se `rbt12InformadoPgdas != null && |informado - calculado| > 0.01` → sinaliza `divergencia: true` com os dois valores. Nunca silencia; o cálculo do sistema usa o calculado.
- Projeção próximo mês: `receitaEstimada = média das últimas 3 apurações` (ou o valor único, ou 0 se sem histórico); aplica a faixa do RBT12 atual (hipótese conservadora de receitas estáveis) e retorna `receitaEstimada, aliquotaEfetivaProj, dasProj`. Rotulada "estimativa, não garantia".

## 4. Entidades e invariantes
- `Empresa`: id, razaoSocial (obrigatória), nomeFantasia?, cnpj (único, 14 dígitos válidos com dígitos verificadores), dataCadastro, ativo.
- `Apuracao`: id, empresaId, periodoApuracao `AAAAMM`, receitaBrutaMes (>= 0), rbt12InformadoPgdas?, rbt12Calculado, anexo III|IV|V, aliquotaNominal, parcelaDeduzir, aliquotaEfetiva, valorDAS, arquivoOriginal?, observacoes?, versaoRegra (ex `2024.1`), substituidaPorId?. Unique `(empresaId, periodoApuracao)` valendo só entre não-retificadas.
- `TaxRule`: id, anexo, faixa 1–6, limites, nominal, deduzir, vigenciaInicio, vigenciaFim?, versao. Versão publicada é imutável.
- Retificação: cria nova apuração (mesma empresa+período) e marca antiga com `substituidaPorId`. Antiga nunca apagada.
- Memória de cálculo (toda resposta de cálculo): `{ anexo, faixa, rbt12, nominal, deduzir, efetiva, receitaMes, das, versaoRegra, rbt12Parcial, divergencia? }`.

## 5. Casos de borda obrigatórios (viram teste na F2)
1. RBT12 exatamente 180000 → faixa 1; 180000.01 → faixa 2 (idem demais viradas).
2. Faixa 6 sem teto (ex: RBT12 10M Anexo III → nominal 0.33, deduzir 648000).
3. RBT12 zero/negativo → erro, sem cálculo.
4. Empresa nova sem histórico → `rbt12Parcial`, RBT12 = 0 → erro? Não: RBT12 0 cai na faixa 1 mas regra 3 barra. Decisão: empresa nova sem nenhum mês anterior usa só o mês atual como base? NÃO — sem base não há cálculo. API retorna 422 `SEM_HISTORICO_RBT12` salvo se `rbt12InformadoPgdas` fornecido na conferência ( PGDAS informa RBT12 mesmo no 1º mês). Com informado, usa-o com flag `rbt12Parcial`.
5. CNPJ inválido → 422 `CNPJ_INVALIDO`.
6. Duplicada `(empresa, periodo)` não-retificada → 409 `APURACAO_DUPLICADA`.
7. PDF ilegível/fora do escopo → 422 com campos marcados, nunca inventar valor.

## 6. Contratos de API (forma; tipos exatos na F5)
- `POST /api/empresas` `{razaoSocial, nomeFantasia?, cnpj}` → 201 Empresa | 422/409.
- `POST /api/import/pdf` (multipart, só PDF ≤10MB) → 200 `{ extraido, calculoEstimado?, avisos[] }` — nada persiste aqui.
- `POST /api/apuracoes/confirmar` (corpo = conferência editada) → 201 Apuracao+memória | 422/409.
- `POST /api/apuracoes/:id/retificar` → 201 nova Apuracao.
- `GET /api/empresas/:id/dashboard` → `{ empresa, apuracoes[], rbt12Atual, projecaoProximoMes }`.
- `GET /api/health` → `{ ok: true }`.

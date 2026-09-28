# Transcrição PGDAS-D → JSON via Gemini

Cole este prompt no Gemini junto com o PDF do PGDAS-D para gerar o JSON aceito pelo Simples Calculator.

## Prompt

```
Transcreva este PDF do PGDAS-D (Simples Nacional) para JSON estrito.
Responda SOMENTE com JSON válido, sem markdown, sem explicação.

Schema obrigatório:
{
  "cnpj": "somente dígitos ou null",
  "razaoSocial": "string ou null",
  "periodoApuracao": "MM/AAAA (ex: 06/2024)",
  "receitaBrutaMes": number (ex: 25000.00),
  "rbt12Informado": number ou null,
  "anexo": "III" | "IV" | "V" ou null
}

Regras:
- receitaBrutaMes: receita bruta do mês de apuração (não o DAS, não o RBT12).
- rbt12Informado: campo RBT12 / receita bruta 12 meses informado no PGDAS.
- anexo: identifique "Anexo III", "Anexo IV" ou "Anexo V". Se não encontrar, use null.
- periodoApuracao: competência da apuração (período de apuração).
- Use ponto como separador decimal. Sem R$, sem pontos de milhar no JSON.
- Se um campo não for encontrado, use null (não invente valores).
```

## Como usar no sistema

1. Gemini → copie o JSON gerado.
2. No Simples Calculator → empresa → Importar PGDAS-D → "Colar JSON do Gemini" → colar → Processar JSON.
3. Ou salve como `.json` e arraste para a mesma tela (aceita `.pdf` e `.json`).
4. Na conferência: verifique período, receita, RBT12, anexo (selecionável III/IV/V).
5. Se houver divergência PGDAS vs sistema, escolha qual RBT12 usar — a alíquota é recalculada na hora.
6. Confirmar e Salvar → alíquota efetiva do mês + DAS exibidos no dashboard.

## Validação

- Endpoint arquivo: `POST /api/import/preview` (multipart `file` + `empresaId`, aceita `.pdf`/`.json`)
- Endpoint colado: `POST /api/import/preview-json` body `{ empresaId, dados: {...} }`
- Recálculo: `POST /api/import/recalculate` body `{ receitaBrutaMes, rbt12Usado, anexo, periodoApuracao }`
```

## Nota fiscal do cálculo

Alíquota efetiva = (RBT12 × Alíquota Nominal − Parcela a Deduzir) / RBT12
DAS = Receita do mês × Alíquota efetiva
Tabelas III/IV/V versão 2024.1 em `prisma/seed.ts`.

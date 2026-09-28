# apps/web — React + Vite

Entra na F5. Regras:
- Páginas mínimas: Empresas, Importar/Conferir, Dashboard (histórico + RBT12 + projeção).
- Conferência é etapa obrigatória: exibe tudo extraído do PDF + cálculo estimado, permite correção manual antes de salvar.
- Cliente API isolado em um módulo. Formatação (CNPJ, moeda, competência) em um módulo `utils`.
- Sem lógica tributária no frontend: só exibe o que a API calculou.

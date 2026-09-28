# Simples Calculator - Sistema de Cálculo de Alíquota do Simples Nacional

Sistema web para auxiliar no cálculo da **alíquota mensal efetiva do Simples Nacional** para empresas prestadoras de serviços enquadradas nos **Anexos III, IV e V**, com importação automática de dados do PDF do PGDAS-D.

## 🚀 Funcionalidades

- **Cadastro de empresas** com validação de CNPJ
- **Importação de PDF do PGDAS-D** com extração automática de dados
- **Tela de conferência** antes de salvar (permite correção manual)
- **Cálculo automático da alíquota efetiva** conforme fórmulas oficiais
- **Cálculo do RBT12** baseado no histórico salvo (12 meses anteriores)
- **Projeção do próximo mês** baseada no histórico
- **Histórico completo** de apurações por empresa
- **Memória de cálculo** detalhada para auditoria
- **Retificação de apurações** com controle de versão
- **Detecção de divergências** entre RBT12 do PGDAS e calculado pelo sistema
- **Regras tributárias versionadas** no banco de dados (fácil atualização)

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + TypeScript + Fastify |
| Banco de Dados | SQLite + Prisma ORM |
| PDF Parsing | pdf-parse |
| Validação | Zod |
| Testes | Vitest |

## 📋 Pré-requisitos

### Opção 1: Docker (Recomendado)
- Docker 24+ / Docker Compose 2+

### Opção 2: Local
- Node.js 20+
- npm 9+

## 🔧 Instalação

### Com Docker (mais simples)

```bash
cd simples-calculator

# Desenvolvimento (hot reload)
npm run docker:dev
# ou: docker-compose up --build

# Produção
npm run docker:prod
# ou: docker-compose -f docker-compose.prod.yml up --build
```

Acesse:
- Frontend: http://localhost:3000 (dev) / http://localhost (prod)
- Backend API: http://localhost:3001

---

### Local (sem Docker)

```bash
# Clonar/entrar no diretório
cd simples-calculator

# Instalar dependências de todos os workspaces
npm install

# Gerar cliente Prisma
npm run db:generate

# Criar banco e rodar seed (regras tributárias + empresas de exemplo)
npm run db:push
npm run db:seed
```

## ▶️ Execução

### Desenvolvimento (frontend + backend simultâneos)

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Comandos Docker Úteis

```bash
# Subir em background
npm run docker:dev:detached

# Ver logs
npm run docker:logs

# Parar containers
npm run docker:down

# Limpar tudo (containers + volumes + órfãos)
npm run docker:clean

# Rebuild forçado
docker-compose up --build --force-recreate

# Acessar shell do backend
docker exec -it simples-backend sh

# Rodar migrations manualmente
docker exec -it simples-backend npx prisma migrate deploy

# Backup do SQLite (volume)
docker run --rm -v simples-calculator_sqlite_data:/data -v $(pwd):/backup alpine cp /data/dev.db /backup/backup-$(date +%F).db
```

### Apenas Backend

```bash
npm run dev:backend
```

### Apenas Frontend

```bash
npm run dev:frontend
```

### Produção

```bash
# Build
npm run build

# Iniciar backend
npm run start --workspace=backend

# Frontend buildado fica em frontend/dist (servir com nginx, Vercel, etc.)
```

## 🧪 Testes

```bash
# Todos os testes
npm run test

# Apenas backend
npm run test:backend
```

Os testes cobrem:
- Cálculo da alíquota efetiva (Anexos III, IV, V)
- Identificação de faixas e transições
- Cálculo do RBT12 (histórico completo, incompleto, empresa nova)
- Memória de cálculo
- Projeção do próximo mês
- Integração completa RBT12 + Alíquota

## 📁 Estrutura do Projeto

```
simples-calculator/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── pages/            # Páginas (Empresas, Dashboard)
│   │   ├── api.ts            # Cliente API
│   │   ├── utils.ts          # Utilitários de formatação
│   │   ├── App.tsx           # Roteamento
│   │   └── main.tsx          # Entry point
│   └── package.json
├── backend/                   # Fastify API
│   ├── src/
│   │   ├── calculation/      # Motor de cálculo (core)
│   │   │   ├── index.ts      # TaxRuleRepository, RBT12Calculator, SimplesCalculator
│   │   │   └── calculation.test.ts
│   │   ├── pdf-parser/       # Parser de PDF do PGDAS
│   │   ├── routes/           # Rotas da API
│   │   ├── services/         # Serviços de negócio
│   │   └── index.ts          # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Schema do banco
│   │   └── seed.ts           # Seed com regras tributárias
│   └── package.json
├── shared/                    # Tipos e utilitários compartilhados
│   └── src/types.ts
├── prisma/                    # Schema Prisma (raiz)
└── package.json              # Workspace root
```

## 🗄️ Banco de Dados

### Principais Tabelas

**empresas**
- `id`, `razao_social`, `nome_fantasia`, `cnpj` (único), `data_cadastro`, `ativo`

**apuracoes**
- `id`, `empresa_id`, `periodo_apuracao`, `receita_bruta_mes`
- `rbt12_informado_pgdas`, `rbt12_calculado_sistema`
- `anexo` (III/IV/V), `aliquota_nominal`, `parcela_deduzir`
- `aliquota_efetiva`, `valor_das`
- `arquivo_original`, `data_importacao`, `observacoes`
- `versao_regra`, `substituida_por_id` (para retificação)
- **Unique constraint**: `(empresa_id, periodo_apuracao)`

**tax_rules**
- `id`, `anexo`, `faixa`, `limite_inferior`, `limite_superior`
- `aliquota_nominal`, `parcela_deduzir`
- `vigencia_inicio`, `vigencia_fim`, `versao`

## 📊 Regras Tributárias (Seed)

O seed popula as tabelas com as faixas vigentes a partir de **01/2024**:

### Anexo III - Serviços (geral)
| Faixa | Limite Inferior | Limite Superior | Alíquota Nominal | Parcela a Deduzir |
|-------|----------------|-----------------|------------------|-------------------|
| 1 | 0 | 180.000 | 6,00% | 0 |
| 2 | 180.000,01 | 360.000 | 11,20% | 9.360 |
| 3 | 360.000,01 | 720.000 | 13,50% | 17.640 |
| 4 | 720.000,01 | 1.800.000 | 16,00% | 35.640 |
| 5 | 1.800.000,01 | 3.600.000 | 21,00% | 125.640 |
| 6 | 3.600.000,01 | — | 33,00% | 648.000 |

### Anexo IV - Serviços (específicos)
| Faixa | Limite Inferior | Limite Superior | Alíquota Nominal | Parcela a Deduzir |
|-------|----------------|-----------------|------------------|-------------------|
| 1 | 0 | 180.000 | 4,50% | 0 |
| 2 | 180.000,01 | 360.000 | 9,00% | 8.100 |
| 3 | 360.000,01 | 720.000 | 10,20% | 12.420 |
| 4 | 720.000,01 | 1.800.000 | 14,00% | 39.780 |
| 5 | 1.800.000,01 | 3.600.000 | 22,00% | 183.780 |
| 6 | 3.600.000,01 | — | 33,00% | 828.000 |

### Anexo V - Serviços (outros)
| Faixa | Limite Inferior | Limite Superior | Alíquota Nominal | Parcela a Deduzir |
|-------|----------------|-----------------|------------------|-------------------|
| 1 | 0 | 180.000 | 15,50% | 0 |
| 2 | 180.000,01 | 360.000 | 18,00% | 4.500 |
| 3 | 360.000,01 | 720.000 | 19,50% | 9.900 |
| 4 | 720.000,01 | 1.800.000 | 20,50% | 17.100 |
| 5 | 1.800.000,01 | 3.600.000 | 23,00% | 62.100 |
| 6 | 3.600.000,01 | — | 30,50% | 540.000 |

> **Fórmula da Alíquota Efetiva:**
> ```
> Alíquota Efetiva = (RBT12 × Alíquota Nominal − Parcela a Deduzir) / RBT12
> DAS = Receita do Mês × Alíquota Efetiva
> ```

## 🔄 Fluxo de Uso

1. **Cadastrar empresa** → Informar razão social, CNPJ, nome fantasia
2. **Selecionar empresa** no dropdown do header
3. **Importar PGDAS-D** → Upload do PDF → Sistema extrai dados
4. **Conferir dados** → Tela mostra tudo extraído + cálculos estimados
5. **Editar se necessário** → Corrigir campos não identificados
6. **Confirmar e salvar** → Apuração gravada no banco
7. **Consultar dashboard** → Histórico, RBT12, projeção próximo mês

## ⚠️ Observações Importantes

- **Ferramenta de apoio**: Os cálculos devem ser conferidos com o PGDAS-D oficial e a legislação vigente
- **Não substitui** a declaração oficial no sistema da Receita Federal
- **Anexo III, IV, V apenas**: Comércio e indústria não implementados
- **PDF Parser**: Pode não identificar todos os campos automaticamente - sempre confira na tela de conferência
- **RBT12 calculado pelo sistema** usa apenas o histórico salvo; o RBT12 do PGDAS pode considerar regras diferentes (ex: meses sem movimento)

## 📝 Atualizando Regras Tributárias

Quando a legislação mudar:

1. Edite `prisma/seed.ts` com as novas faixas/alíquotas/parcelas
2. Atualize a constante `TAX_RULES_VERSION` (ex: `'2025.1'`)
3. Defina `vigenciaInicio` para a data de vigência
4. Rode `npm run db:seed` novamente

O sistema guarda a `versao_regra` em cada apuração para rastreabilidade.

## 🔐 Segurança

- Validação de arquivo (apenas PDF, máx. 10MB)
- Sanitização de nomes de arquivo
- Queries parametrizadas (Prisma)
- Validação de entrada com Zod
- CORS configurado

## 📄 Licença

MIT - Uso livre para fins educacionais e profissionais.

---

## 🐳 Docker - Detalhes da Implementação

### Arquitetura dos Containers

```
┌─────────────────────────────────────────────────────────────┐
│                     docker-compose.yml                       │
├─────────────────────┬─────────────────────┬─────────────────┤
│     Frontend        │      Backend        │  Prisma Migrate │
│   (Vite/Nginx)      │    (Fastify)        │   (init only)   │
│   Port: 3000/80     │   Port: 3001        │                 │
└─────────┬───────────┴──────────┬──────────┴────────┬───────┘
          │                      │                   │
          │         ┌────────────▼────────────┐     │
          │         │    Volume: sqlite_data  │     │
          │         │  (persistência do .db)  │     │
          │         └─────────────────────────┘     │
          └─────────────────────────────────────────┘
                         Rede: simples-network
```

### Dockerfiles - Multi-stage Build

**Backend** (`backend/Dockerfile`):
- `base` → Node 20 Alpine + poppler-utils (pdf-parse)
- `development` → `npm run dev` (tsx watch)
- `builder` → `npm run build` (TypeScript → dist)
- `production` → Apenas `dist/` + `node_modules` + prisma (user não-root)

**Frontend** (`frontend/Dockerfile`):
- `base` → Dependências
- `development` → Vite dev server (`--host 0.0.0.0`)
- `builder` → `npm run build` (Vite → dist)
- `production` → Nginx Alpine servindo `dist/` + proxy `/api/` → backend

### Volumes Persistentes

```yaml
volumes:
  sqlite_data:  # Banco SQLite persiste entre restarts
```

### Variáveis de Ambiente

| Variável | Dev | Prod | Descrição |
|----------|-----|------|-----------|
| `NODE_ENV` | development | production | Modo da aplicação |
| `DATABASE_URL` | file:./data/dev.db | file:./data/prod.db | Caminho do SQLite |
| `PORT` | 3001 | 3001 | Porta do backend |
| `VITE_API_URL` | http://localhost:3001/api | (nginx proxy) | URL da API no frontend |

### Healthcheck (Produção)

```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

### Produção vs Desenvolvimento

| Aspecto | Desenvolvimento | Produção |
|---------|----------------|----------|
| Frontend | Vite HMR (porta 3000) | Nginx estático (porta 80) |
| Backend | tsx watch (reload automático) | Node compilado (dist/) |
| Build | Dentro do container (dev) | Multi-stage (builder → production) |
| SQLite | `dev.db` | `prod.db` (volume separado) |
| Logs | Console colorido | JSON structured (pode integrar Loki/Datadog) |

### Troubleshooting Comum

**Erro: "poppler not found" no pdf-parse**
```dockerfile
# Já incluído no Dockerfile:
RUN apk add --no-cache poppler-utils
```

**Permissão negada no SQLite**
```bash
# O container roda como user nodejs (UID 1001)
# Volume montado com permissões corretas
```

**Frontend não conecta na API**
- Dev: `VITE_API_URL=http://localhost:3001/api` (CORS habilitado)
- Prod: Nginx proxy `/api/` → `http://backend:3001` (rede Docker)

**Banco não persiste**
- Verifique volume `sqlite_data` em `docker-compose.yml`
- Em prod, use volume nomeado separado: `sqlite_prod_data`
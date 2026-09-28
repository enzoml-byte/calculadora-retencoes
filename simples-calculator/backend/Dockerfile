# ==========================================
# Backend - Multi-stage build
# ==========================================
FROM node:20-alpine AS base

# Instalar dependências do sistema para pdf-parse (poppler) + openssl para Prisma
RUN apk add --no-cache poppler-utils openssl

WORKDIR /app

# Copiar package files para cache de layers
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
COPY prisma/schema.prisma ./prisma/

# ==========================================
# Stage: Development dependencies
# ==========================================
FROM base AS dependencies-dev

RUN npm ci --workspaces --include-workspace-root

# ==========================================
# Stage: Development (with hot reload)
# ==========================================
FROM dependencies-dev AS development

# Copiar código fonte
COPY backend/ ./backend/
COPY shared/ ./shared/
COPY prisma/ ./prisma/

WORKDIR /app/backend

# Gerar Prisma Client
RUN npx prisma generate --schema=/app/prisma/schema.prisma

EXPOSE 3001

CMD ["npm", "run", "dev"]

# ==========================================
# Stage: Production dependencies
# ==========================================
FROM base AS dependencies-prod

RUN npm ci --workspaces --include-workspace-root --omit=dev

# ==========================================
# Stage: Build (production)
# ==========================================
FROM dependencies-dev AS builder

COPY backend/ ./backend/
COPY shared/ ./shared/
COPY prisma/ ./prisma/

# Build shared first
WORKDIR /app/shared
RUN npm run build

# Generate Prisma and build backend
WORKDIR /app/backend
RUN npx prisma generate --schema=/app/prisma/schema.prisma
RUN npm run build

# ==========================================
# Stage: Production
# ==========================================
FROM node:20-alpine AS production

RUN apk add --no-cache poppler-utils dumb-init

WORKDIR /app

# Copiar apenas o necessário do builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/shared/dist ../shared/dist
COPY --from=builder /app/shared/package*.json ../shared/

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

ENV NODE_ENV=production
ENV DATABASE_URL="file:./data/prod.db"

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/usr/sbin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
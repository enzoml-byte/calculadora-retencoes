# ==========================================
# Frontend - Multi-stage build
# ==========================================
FROM node:20-alpine AS base

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# ==========================================
# Stage: Development dependencies
# ==========================================
FROM base AS dependencies-dev

RUN npm ci --workspaces --include-workspace-root

# ==========================================
# Stage: Development (Vite dev server)
# ==========================================
FROM dependencies-dev AS development

COPY frontend/ ./frontend/
COPY shared/ ./shared/

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ==========================================
# Stage: Build (production)
# ==========================================
FROM dependencies-dev AS builder

COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Build shared first
WORKDIR /app/shared
RUN npm run build

WORKDIR /app/frontend
RUN npm run build

# ==========================================
# Stage: Production (nginx)
# ==========================================
FROM nginx:alpine AS production

# Remover default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copiar build do Vite
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Config nginx para SPA + proxy API
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
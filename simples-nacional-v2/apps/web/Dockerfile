FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY apps/web ./apps/web
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --filter @v2/web... \
  && pnpm --filter @v2/web build

FROM nginx:1.27-alpine AS production
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

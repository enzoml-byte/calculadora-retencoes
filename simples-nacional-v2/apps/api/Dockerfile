FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @v2/api db:generate \
  && pnpm --filter @v2/api build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1
CMD ["node", "dist/index.cjs"]

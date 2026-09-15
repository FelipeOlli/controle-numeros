# syntax=docker/dockerfile:1
#
# Não usamos o output "standalone" do Next.js: no Next 16 com Turbopack, o
# file-tracing dele deixou de fora dependências de runtime usadas nas rotas
# (next-auth, bcryptjs, nodemailer, zod, recharts, @prisma/adapter-pg).
# Mais simples e confiável copiar o node_modules de produção inteiro.

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
# prisma.config.ts faz `import "dotenv/config"`; é dependência de dev, então
# não vem no npm ci --omit=dev. prisma (CLI) já é dependency de produção.
RUN npm install --no-save --legacy-peer-deps dotenv \
  && chmod +x ./docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]

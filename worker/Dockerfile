# syntax=docker/dockerfile:1

FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

COPY lib ./lib
COPY worker ./worker
COPY tsconfig.json ./tsconfig.json

CMD ["npx", "tsx", "worker/index.ts"]

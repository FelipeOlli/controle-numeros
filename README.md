# Controle de Números

Painel multi-tenant de saúde de números de WhatsApp (Iungo, chip físico, Meta
Cloud API, Evolution API, Z-API), vinculados a várias empresas.

## Stack

Next.js (App Router) + TypeScript, Prisma 7 (driver adapter `@prisma/adapter-pg`)
+ PostgreSQL, next-auth v5 (credentials), Tailwind v4. Worker separado
(`worker/`) para verificação de números sem check recente e resumo diário.

## Desenvolvimento local

Pré-requisitos: Node 22+, PostgreSQL rodando localmente (ou ajuste `DATABASE_URL`
no `.env`).

```bash
cp .env.example .env   # preencha DATABASE_URL, NEXTAUTH_SECRET, etc.
npm install
npx prisma migrate dev
npx prisma db seed      # cria org + usuário de exemplo (ver saída do comando)
npm run dev
```

Alternativa 100% em Docker (sobe Postgres + app + worker):

```bash
cp .env.example .env
docker compose up --build
```

## Deploy no EasyPanel

Não há automação de criação de serviço (o MCP do EasyPanel só lista/reinicia/
dispara deploy, não cria serviços novos) — os passos abaixo são manuais, uma
vez só.

1. **Postgres**: no projeto do EasyPanel, adicione um serviço de banco
   PostgreSQL 16. Anote host interno, usuário, senha e nome do banco — vira o
   `DATABASE_URL`.
2. **App**: novo serviço tipo *App*, fonte = este repositório Git, branch
   `master`, build = Dockerfile (raiz do repo, `Dockerfile`). Porta 3000.
   Variáveis de ambiente: todas as do `.env.example` (gere `NEXTAUTH_SECRET`
   e `WEBHOOK_SIGNING_SECRET` com `openssl rand -hex 32`; `NEXTAUTH_URL` é o
   domínio público que o EasyPanel vai atribuir/configurar). O container
   aplica as migrations sozinho antes de subir (`docker-entrypoint.sh`).
3. **Worker**: novo serviço tipo *App*, mesma fonte, build = `worker/Dockerfile`.
   Mesmas variáveis de `DATABASE_URL`/SMTP/`WEBHOOK_SIGNING_SECRET`. Sem porta
   exposta.
4. Depois do primeiro deploy do app, rode uma vez (via shell do serviço ou
   `docker exec`) `npx prisma db seed` para criar a primeira organização e o
   usuário admin — ou crie manualmente via `prisma studio` apontando pro
   `DATABASE_URL` de produção.
5. Deploys seguintes: só dar push na branch — o EasyPanel rebuilda, ou use
   `trigger_deploy` do MCP quando a instância estiver acessível daqui.

## Estrutura

- `lib/tenant.ts` — `requireOrg`, guard central de isolamento multi-tenant.
  Toda rota sob `/[org]/...` e todo handler em `/api/orgs/[orgSlug]/...` passa
  por aqui antes de tocar em dado.
- `lib/health.ts` — `computeHealth`, única dona da regra de score/status.
- `lib/checks.ts` — `recordHealthCheck`, grava o check, atualiza o cache em
  `PhoneNumber`, abre incidente e dispara alerta na transição. Usada pelo
  formulário manual e pela API.
- `lib/alerts/` — canais de alerta (e-mail, webhook, WhatsApp) e o dispatcher.
- `worker/` — cron de staleness (>72h sem check vira `UNKNOWN`) e digest diário.

Fase 2 (não implementada ainda): coletores automáticos por provedor
(`ProviderCredential` já existe no schema) gravando `HealthCheck` com
`source: API` — não deve exigir migração de schema.

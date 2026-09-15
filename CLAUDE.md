# Controle de Números — CLAUDE.md do projeto

Painel multi-tenant de saúde de números WhatsApp (Iungo, chip físico, Meta Cloud API,
Evolution API, Z-API), vinculados a várias empresas. Plano completo em
`~/.claude/plans/confio-nos-seus-conehcimentos-crystalline-galaxy.md`.

## Stack
Next.js (App Router) + TypeScript, Prisma + PostgreSQL, next-auth v5 (credentials),
Tailwind v4. Deploy: Docker + EasyPanel na Hetzner.

## Convenções
- Toda rota/handler sob `/[org]/...` passa por `lib/tenant.ts` (`requireOrg`).
  Nunca confiar em `orgId` vindo do client.
- `HealthCheck` é append-only (fonte da verdade); `PhoneNumber.currentStatus` é cache
  derivado, gravado na mesma transação do check.
- Regra de score/status mora só em `lib/health.ts` (`computeHealth`), função pura.
- Fase 1 (atual): entrada manual de checks. Fase 2: coletores automáticos por provedor
  gravando `HealthCheck` com `source: API` — não deve exigir migração de schema.

## Sessões recentes
- 2026-09-15: projeto completo (auth multi-tenant, números, checks, alertas, equipe,
  worker) commitado e no ar em github.com/FelipeOlli/controle-numeros (branch master).
  Dockerfile testado só via `npm run build` local — sem Docker instalado nesta máquina,
  build de imagem em si não foi validado. Falta: criar Postgres + App + Worker no
  EasyPanel de destino (fora das 3 instâncias que o MCP alcança) e rodar o seed em
  produção. Guia completo em README.md.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

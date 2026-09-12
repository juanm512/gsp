# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a T3 Turbo monorepo for a Gaussian Splatting platform - a system for creating, processing, hosting, and visualizing 3D Gaussian Splatting content. The stack uses pnpm workspaces with Turborepo.

## Common Commands

```bash
# Install dependencies
pnpm i

# Development (all apps)
pnpm dev

# Development (web + admin only)
pnpm dev:apps
pnpm dev:web
pnpm dev:admin

# Build all packages
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:fix

# Database operations
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio

# Auth schema generation (required after auth config changes)
pnpm auth:generate

# Add shadcn/ui components
pnpm ui-add

# Create new package
pnpm turbo gen init

```

## Architecture

### Monorepo Structure

```
apps/
├── web/             # Main web application (Next.js 16, React 19, port 3000)
└── admin/           # Admin panel (Next.js 16, roles admin/superadmin, port 3001)

packages/
├── api/             # tRPC router definitions (@acme/api)
├── auth/            # Better Auth configuration (@acme/auth)
├── db/              # Drizzle ORM schema + pg client (@acme/db)
├── ui/              # Shared UI components - shadcn/ui (@acme/ui)
├── validators/      # Shared Zod schemas (@acme/validators)
├── billing/         # Polar payments, plans and limits (@acme/billing)
├── processing/      # BullMQ pipeline: orchestrator, workers, Docker + Modal (@acme/processing)
└── storage/         # S3-compatible storage (Cloudflare R2) (@acme/storage)

tooling/
├── eslint/          # Shared ESLint config
├── prettier/        # Shared Prettier config
├── tailwind/        # Shared Tailwind config
└── typescript/      # Shared TypeScript config
```

### Package Dependencies Flow

```
apps/* → @acme/api → @acme/db, @acme/auth, @acme/billing, @acme/storage, @acme/validators
apps/* → @acme/ui (for shared components)
@acme/auth → @acme/db (for auth schema)
```

### Key Patterns

**tRPC API (`packages/api`):**

- Router definitions in `src/router/`
- `publicProcedure` for unauthenticated endpoints
- `protectedProcedure` for authenticated endpoints (requires session)
- `adminProcedure` / `superAdminProcedure` for role-gated endpoints
- Context includes `db`, `session`, and `authApi`

**Database (`packages/db`):**

- Drizzle ORM with PostgreSQL
- `src/schema.ts` re-exports `auth-schema.ts` (auto-generated) and `presentation-schema.ts`
- Use `@acme/db/schema` for schema imports, `@acme/db/client` for db client

**Authentication (`packages/auth`):**

- Better Auth with email/password, email verification (Resend), organization and admin plugins
- Auth schema generated via `pnpm auth:generate`
- CLI config at `script/auth-cli.ts` (not for runtime use)
- Runtime config at `src/index.ts`

**UI Components (`packages/ui`):**

- shadcn/ui components
- Import individual components: `@acme/ui/button`, `@acme/ui/input`, etc.
- Add new components with `pnpm ui-add`

## Environment Variables

Required in `.env` (see `.env.example`):

- `POSTGRES_URL` - PostgreSQL connection string (`docker compose up -d` provides a local one)
- `REDIS_URL` - Redis for BullMQ
- `AUTH_SECRET` - Better Auth secret (generate with `openssl rand -base64 32`)
- `RESEND_API_KEY` - transactional email
- `POLAR_*`, `STORAGE_*` - billing and object storage

## Important Notes

- Package namespace is `@acme/*` - replace with your org name if needed
- Database uses the `pg` (node-postgres) driver
- All apps use `with-env` script to load root `.env` file
- UI copy is in Spanish; code, commits and docs are in English (README is Spanish)
- Zod v4 is used throughout (`zod/v4` import path)

# PetWell — Setup & Library Guide

> Package manager: **pnpm**

## Prerequisites (install once on your machine)
- **Node.js** 18+ (LTS) — https://nodejs.org
- **pnpm** — `npm i -g pnpm` (or `corepack enable`)
- **PostgreSQL** 14+ — local install, or Docker, or a hosted DB (Neon / Supabase)
- **NestJS CLI** (global, optional but handy): `pnpm add -g @nestjs/cli`

---

## Backend (`/backend`)

All dependencies are already in `backend/package.json`, so the simplest install is:

```bash
cd backend
pnpm install
```

### ⚠️ pnpm build-scripts note
pnpm blocks packages' postinstall build scripts by default. Prisma and bcrypt **need** theirs
(Prisma downloads its engine + generates the client; bcrypt compiles a native binding).
`package.json` already whitelists them via:

```json
"pnpm": { "onlyBuiltDependencies": ["@prisma/client", "prisma", "bcrypt"] }
```

If pnpm still warns about ignored build scripts, run once:
```bash
pnpm approve-builds
```

That single install pulls everything below. The grouped list is for reference (what each library
is for). If you ever start fresh, these are the exact installs.

### Runtime dependencies
```bash
# NestJS core
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs

# Config / env
pnpm add @nestjs/config

# Auth — JWT + password hashing (custom AuthGuard, no passport)
pnpm add @nestjs/jwt bcrypt

# Database — Prisma 7 client + Postgres driver adapter (runtime)
pnpm add @prisma/client @prisma/adapter-pg

# Validation (DTOs) + env validation
pnpm add class-validator class-transformer zod

# File uploads — Cloudinary + Multer
pnpm add cloudinary multer
```

### Dev dependencies
```bash
# Prisma CLI (migrations, generate, studio, seed) + dotenv (prisma.config.ts, seed)
pnpm add -D prisma ts-node tsconfig-paths dotenv

# TypeScript + Nest tooling
pnpm add -D typescript @nestjs/cli @nestjs/schematics

# Type definitions
pnpm add -D @types/node @types/express @types/bcrypt @types/multer
```

### What each library does
| Library | Purpose |
|---|---|
| `@nestjs/common` `@nestjs/core` `@nestjs/platform-express` | NestJS framework + HTTP server |
| `@nestjs/config` | Loads `.env` (DATABASE_URL, JWT_SECRET, Cloudinary keys) |
| `@nestjs/jwt` | Signs / verifies JWT access tokens (wrapped by `AccessTokenService`) |
| `bcrypt` | Hashes passwords before storing |
| `@prisma/client` `@prisma/adapter-pg` | Type-safe DB queries + Postgres driver adapter (Prisma 7) |
| `prisma` (dev) | CLI: `migrate`, `generate`, `studio`, `seed` |
| `class-validator` `class-transformer` | Validates request bodies via DTOs |
| `zod` | Validates environment variables at boot (`config/env.validation.ts`) |
| `cloudinary` | Uploads pet photos + record attachments, returns URLs |
| `multer` | Parses `multipart/form-data` file uploads |
| `ts-node` (dev) | Runs the TypeScript seed script |

### After install — get the DB running
```bash
cp .env.example .env               # fill DATABASE_URL, ACCESS_TOKEN_SECRET (32+ chars), Cloudinary keys
pnpm exec prisma generate          # generate client -> src/database/generated/prisma
pnpm exec prisma migrate dev --name init   # create tables
pnpm db:seed                       # seed clinics
pnpm start:dev                     # API on http://localhost:8000
```

> Prisma 7 note: the datasource URL lives in `prisma.config.ts` (read from `.env`), not in `schema.prisma`. The client generates into `src/database/generated/prisma` and connects through the `@prisma/adapter-pg` driver adapter.

---

## Frontend (`/frontend`)

Everything is already in `frontend/package.json`:

```bash
cd frontend
cp .env.example .env.local   # API_URL + AUTH_SECRET
pnpm install
pnpm dev                     # → http://localhost:3000
```

### What each library does
| Library | Purpose |
|---|---|
| `next` 16 (App Router) | Framework — Server Components + Server Actions |
| `next-auth` v5 (beta) | Session handling via the Credentials provider; stores the API access token |
| `react-hook-form` + `@hookform/resolvers` | Form state and submission |
| `zod` | Schema validation, shared between forms and Server Actions |
| `tailwindcss` 4 + `tw-animate-css` | Styling |
| `shadcn` + `@base-ui/react` | UI primitives (generated into `src/components/ui`) |
| `lucide-react` | Icon set |
| `date-fns` + `react-day-picker` | Date formatting and the appointment date picker |
| `sonner` | Toast notifications for action results |
| `clsx` / `tailwind-merge` / `class-variance-authority` | Class composition (`cn()` in `lib/utils.ts`) |
| `next-themes` | Theme provider wiring |

### Env
| Variable | Purpose |
|---|---|
| `API_URL` | Base URL of the NestJS API. **Server-side only** — no `NEXT_PUBLIC_` prefix, because every request is made from a Server Component or Server Action, never the browser. |
| `AUTH_SECRET` | next-auth session secret. Generate with `npx auth secret`. |

> There is no axios instance and no client-side token storage. `lib/api/auth-fetch.ts` pulls the access token from the next-auth session on the server and attaches the `Bearer` header, so the token never reaches the client bundle.

See [`frontend/README.md`](./frontend/README.md) for the layer diagram and route inventory.

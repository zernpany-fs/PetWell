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
cp .env.example .env               # fill DATABASE_URL, ACCESS_TOKEN_SECRET (32+ chars), SHARE_CODE_SECRET (32+ chars), Cloudinary keys
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

## Deploy (Vercel)

The live demo runs as **two Vercel projects** built from this one GitHub repo, plus a Prisma Postgres database created from Vercel Storage. There is no `vercel.json`; everything is set in each project's settings. Every push to `main` deploys both projects to production automatically.

| | Frontend | API |
|---|---|---|
| Vercel project | `petwell` | `petwell-api` |
| URL | https://petwell-zern.vercel.app | https://petwell-api-sandy.vercel.app |
| Framework preset | Next.js | NestJS |
| Root directory | `frontend` | `backend` |
| Build command | default (`next build`) | `pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm db:seed` |
| Environment variables | `API_URL` (the API's URL), `AUTH_SECRET` | `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `SHARE_CODE_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PORT`; for password-reset email also `RESEND_API_KEY`, `FRONTEND_URL` (and optionally `MAIL_FROM`) |

**Database.** `petwell-db` (Prisma Postgres, free tier) is connected to `petwell-api` only. Connecting it added the `DATABASE_*` variables; the app reads `DATABASE_URL`.

**Why the API build command is custom:**
- `prisma generate` — the generated client (`src/database/generated`) is not in git, so every build has to create it.
- `prisma migrate deploy` — applies any new migration to the production database before the new code goes live. It only applies; it never resets data.
- `pnpm db:seed` — makes sure the six demo clinics and their staff logins exist. The seed looks each one up first and only creates what is missing, so running it on every deploy is safe and does not overwrite changed passwords.

**Things that bit us:**
- Vercel compiles NestJS without `nest build`, so the `@/` import alias from `tsconfig.json` was never rewritten and the API crashed with `Cannot find module '@/…'`. All backend imports are relative for this reason (commit `c3b364d`). Do not reintroduce `@/` imports in `backend/`.
- The frontend calls the API only from the server (Server Components and Server Actions), so the browser never talks to the API directly and CORS does not matter in production. `FRONTEND_URL` is still needed on the API once password-reset email is on: the link in the email is built from it, and without it the link points to `localhost:3000`.
- Password-reset email (D61) is off until `RESEND_API_KEY` is set on `petwell-api`; until then the forgot-password page answers normally but sends nothing. Without a verified domain in Resend, mail is delivered only to the Resend account's own address.

**To deploy your own copy:** import the repo into Vercel twice (once with root directory `backend`, once with `frontend`), create a Postgres database under Storage and connect it to the API project, set the variables above (secrets of at least 32 characters, see `backend/.env.example`), then set the frontend's `API_URL` to the API project's URL and redeploy the frontend.

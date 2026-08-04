# PetWell — Web App

Next.js 16 (App Router) frontend for the PetWell API. Two role-scoped areas, `/owner` and `/staff`, behind a shared shell.

## Getting started

```bash
cp .env.example .env.local   # API_URL + AUTH_SECRET
pnpm install
pnpm dev                     # → http://localhost:3000
```

The API must be running first (default `http://localhost:8000` — see `../backend`).

| Script | Does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |

## Architecture

Data flows one way, and every hop runs on the server — the access token is never handed to the browser.

```
page.tsx / Server Component
        │  reads
        ▼
lib/api/*.api.ts ──► lib/api/auth-fetch.ts ──► lib/api/api-fetch.ts ──► NestJS
        ▲                (injects Bearer                (fetch wrapper,
        │                 token from session)             throws ApiError)
        │  writes
lib/actions/*.action.ts   ('use server' — validates with zod, calls the API,
                           revalidatePath, returns an ActionResult)
        ▲
        │
client component (react-hook-form + sonner toast)
```

| Layer | Location | Responsibility |
|---|---|---|
| Routes | `src/app` | Server Components; fetch data, render |
| API clients | `src/lib/api` | Typed wrappers per resource; response types in `api.type.ts` |
| Server Actions | `src/lib/actions` | Mutations — validate, call, revalidate, return `ActionResult` |
| Schemas | `src/lib/schemas` | zod schemas shared by forms and actions |
| Session | `src/lib/auth.ts`, `session.ts` | next-auth v5 (Credentials); `requireRole` helpers |
| Feature UI | `src/components/features` | Forms and interactive widgets, grouped by domain |
| Layout / shared | `src/components/layout`, `shared` | `AppShell`, nav, `StatusBadge`, placeholders |
| Primitives | `src/components/ui` | shadcn components |

## Auth & route protection

`src/middleware.ts` runs on every non-asset request and enforces the boundary: unauthenticated users hitting `/owner/*` or `/staff/*` go to `/login`, and a user in the wrong area is redirected to their own dashboard. Layouts call `requireRole()` as a second check, so a route can never render for the wrong role.

## Routes

**Owner** — `/owner/dashboard` · `pets` (list · `new` · `[petId]` · `[petId]/edit`) · `clinics` (list · `[clinicId]`) · `appointments` (list · `book` · `[appointmentId]`) · `profile`

**Staff** — `/staff/dashboard` · `pets` (patient lookup · `[petId]`) · `clinic` · `appointments` (queue · `[appointmentId]`) · `profile`

**Public** — `/` landing · `/login` · `/register`

## Styling

Tailwind 4 with a warm palette applied inline rather than via a token layer: ink `#2D2A26`, muted `#6E675C`, hairline `#E6DFD3`, canvas `#FAF8F4`, accent `#5E86AD`. Helper classes (`pw-btn-primary`, `pw-lift`, `pw-fade`, `pw-stick`) live in `src/app/globals.css`. Status colours are centralised in `components/shared/StatusBadge.tsx` and mirrored by the appointment timeline.

> `AGENTS.md` note: this is Next.js 16 — check `node_modules/next/dist/docs/` before assuming an older API.

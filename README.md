# PetWell

Pet Health Passport & Appointment Management System — clinic-agnostic, portable pet health records for the Thai market.

**Stack:** Next.js 16 · NestJS 11 · PostgreSQL · Prisma 7 · JWT · Cloudinary

## The idea

In practice a pet's medical history lives inside whichever clinic wrote it. Change clinics and the history stays behind. PetWell inverts that: the **owner** holds the record, and clinics read the pet's full history and append to it. Every record is stamped with the clinic that authored it, so provenance is never lost.

### V2: consent-based access

In v1 any clinic on the platform could read every pet. V2 (branch `feat/consent-access`) closes that: **a clinic sees nothing by default.** Access comes only from

- **an appointment the clinic confirmed** — it lasts until the visit is completed + 30 days, and ends if the appointment is cancelled; or
- **a 6-digit share code from the owner** (for walk-ins) — valid 15 minutes, single use, giving 7 / 30 / 90 days or unlimited access. The owner can revoke or extend it.

While access is active the clinic sees the full history from every clinic. Afterwards it sees only the records it wrote itself. Every time a clinic opens a pet or its records, an audit log row is written; if that write fails, the request fails.

The rules, and why each was chosen, are in [`docs/v2/PetWell_Decision_Log.md`](./docs/v2/PetWell_Decision_Log.md) (D1–D49).

## Roles

| Role | Can do |
|---|---|
| **Pet Owner** | Manage pets, read the full cross-clinic health passport, browse clinics, request and cancel appointments, share a pet with a clinic by code, revoke or extend that access |
| **Clinic Staff** | Look up pets the clinic has access to, write health records for them, edit its own records, redeem share codes, manage the clinic's appointment queue, edit the clinic profile |

Clinics are **seeded** — there is no admin module. Staff pick their clinic at sign-up and are active immediately.

## Entities

`User` · `Pet` · `HealthRecord` · `Clinic` · `Appointment` · `AppointmentStatusLog`

V2 adds `PetAccessGrant` (who may see which pet, and until when) · `ShareCode` (stored only as an HMAC hash) · `PetAccessLog` (audit log) · `ShareCodeAttempt` (for lockout after repeated wrong codes).

Nothing is hard-deleted. Pets and records are archived via `isActive`, and every appointment status change writes an `AppointmentStatusLog` row inside a transaction — that trail is what the appointment detail page renders. In V2 the same transaction also creates or ends the appointment's access grant, and a status that someone else changed in the meantime is refused with 409 instead of being overwritten.

## Layout

```
petwell-code/
├── docs/          # Specs, ERD, endpoint list, API + frontend documentation
│   └── v2/        # V2 decision log, user stories, impact analysis, flowchart
├── backend/       # NestJS API (V2 adds src/access/) + Vitest tests
├── frontend/      # Next.js App Router app — owner + staff areas
└── scripts/       # V2 API check scripts (Python) run against a live backend
```

## Run it locally

Requires Node 18+, pnpm, and PostgreSQL 14+.

```bash
# 1. API
cd backend
cp .env.example .env          # fill DATABASE_URL, ACCESS_TOKEN_SECRET, SHARE_CODE_SECRET, Cloudinary keys
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm db:seed                  # seeds the clinics
pnpm start:dev                # → http://localhost:8000

# 2. Web app (second terminal)
cd frontend
cp .env.example .env.local    # fill API_URL + AUTH_SECRET
pnpm install
pnpm dev                      # → http://localhost:3000
```

**`SHARE_CODE_SECRET` is required** (at least 32 characters): the API refuses to start without it. It is the key used to hash share codes (D26). Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**Database time zone (D46):** every database session runs in UTC (`src/database/pg-options.ts`). Databases filled before this fix store times 7 hours early — reset them with `pnpm exec prisma migrate reset`, then run `pnpm db:seed`.

See [`SETUP.md`](./SETUP.md) for the full dependency breakdown and Prisma 7 notes.

## Tests

Two layers, each checking what the other cannot:

| Layer | What it checks | Needs |
|---|---|---|
| **Vitest** (`backend`, `pnpm test`) | Unit tests of the access rules, plus integration tests that call the real services on a real database: every denied case (404 / 403 / 400 / 429), grants created and ended by appointment status, two status changes at the same moment (409), audit log failure (500) | A separate `petwell_test` database |
| **Python scripts** (`scripts/`) | The same flows end to end over HTTP — JWT, role guards, status codes — against the running API | Backend running on port 8000, `psql`, seeded staff `vet1`–`vet6` |

### Vitest — one-time setup

Integration tests empty their database on every run, so they use their own (D47). `test/setup-env.ts` stops the run if `DATABASE_URL` is not `petwell_test`, so the dev database cannot be wiped by mistake.

```bash
cd backend
createdb petwell_test
cp .env .env.test             # then change the database name in DATABASE_URL to petwell_test
(set -a; source .env.test; set +a; pnpm exec prisma migrate deploy)
pnpm test                     # 88 tests
```

`.env.test` is git-ignored. After adding a migration, run the `migrate deploy` line again.

### API check scripts

```bash
cd backend && pnpm start:dev                  # first terminal
python3 scripts/v2_api_access_check.py        # second terminal, from the repo root
python3 scripts/v2_api_share_check.py
```

They create their own owners, pets and records on every run, in the dev database.

## Seeded accounts

`pnpm db:seed` creates six clinics and one clinic-staff login for each. Password for all of them is `pass123`.

| Email | Clinic |
|---|---|
| `vet1@test.com` | โรงพยาบาลสัตว์รักษ์เพื่อน |
| `vet2@test.com` | คลินิกสัตว์เลี้ยงพิเศษ Exotic Care |
| `vet3@test.com` | ศูนย์ฉุกเฉินสัตว์ 24 ชม. PetER |
| `vet4@test.com` | โรงพยาบาลสัตว์เชียงใหม่ |
| `vet5@test.com` | คลินิกรักษาสัตว์บ้านหมอหมา |
| `vet6@test.com` | Exotic Vet Studio ภูเก็ต |

Pet owners are not seeded — register one through the UI. The seed is safe to re-run: it skips clinics and accounts that already exist, and never overwrites a password you have changed.

## Demo path

Register as an owner → add a pet → book an appointment at the clinic of `vet1@test.com` → sign in as `vet1@test.com` in a second browser and try to look the pet up under **Patients**: it is not found, because the clinic has no access yet → confirm the appointment → now the pet is found → add a vaccine record → back on the owner account, see that record appear in the passport labelled with the clinic → open the appointment to see the status history.

Sign in as `vet2@test.com` — a clinic with no appointment — and the same search finds nothing.

Share codes, revoke and extend have API endpoints but no screens yet: try them with Postman, or see `scripts/v2_api_share_check.py` for the full flow.

## New V2 endpoints

| Method & route | Who | What |
|---|---|---|
| `POST /pets/:petId/share-codes` | Owner | Create a 6-digit code (body: `durationDays` = 7, 30, 90 or `null` for unlimited) |
| `POST /share-codes/redeem` | Clinic staff | Enter a code (body: `code`) → access to that pet. Wrong code → 400; too many wrong codes → 429 |
| `GET /pets/:petId/access-grants` | Owner | Clinics that can see this pet now |
| `DELETE /pets/:petId/clinics/:clinicId/access` | Owner | Revoke all of a clinic's access to this pet |
| `PATCH /access-grants/:grantId` | Owner | Extend a share-code access (7 / 30 / 90 days or unlimited, from now) |

Existing pet, health-record and search endpoints now check access; see the impact analysis for what each one returns.

## Docs

| File | What's in it |
|---|---|
| `docs/v2/PetWell_Decision_Log.md` | **V2:** every access rule as a numbered decision (D1–D49), with the reason and findings from implementation |
| `docs/v2/PetWell_User_Stories_Access_Control.md` | **V2:** user stories US-01–US-04 with acceptance criteria |
| `docs/v2/PetWell_Impact_Analysis.md` | **V2:** which endpoints, tables and screens the change touches |
| `docs/v2/PetWell_Appointment_Grant_Flow.svg` | **V2:** how each appointment status creates, extends or ends access |
| `docs/PetWell_API_Endpoints.md` / `.xlsx` | Every v1 endpoint, body, and auth requirement (new V2 endpoints: see the table above) |
| `docs/PetWell_API_Documentation.pdf` | Narrative backend reference — architecture, every module, design reasoning (Revision 2) |
| `docs/PetWell_Frontend_Documentation.pdf` | Frontend architecture and page inventory (Revision 1) |
| `docs/PetWell_Frontend_Addendum.pdf` | What changed in the frontend after Revision 1 |
| `docs/src/` | Markdown sources for the PDFs — see `docs/src/README.md` to rebuild |
| `docs/PetWell_Feature_List.md` | Feature inventory + grading-requirement mapping |
| `docs/PetWell_Build_Checklist.md` | The phased build plan this was built against |
| `docs/PetWell_ERD.svg` | Entity-relationship diagram |
| `docs/DESIGN_SYSTEM.html` | Colours, type scale, and component styles |

## Status

**v1** (tag `v1.0`): feature-complete; all four grading requirements (auth with JWT + protected routes, two roles, CRUD on two-plus entities, two-plus core features) are covered — see `docs/PetWell_Feature_List.md` for the mapping.

**V2** (branch `feat/consent-access`):
- Done: access rules enforced in the backend on every pet, health-record and search endpoint; share code, revoke and extend endpoints; audit log; 88 Vitest tests and two API check scripts, all passing; backend typechecks.
- Not done yet: screens for share codes, the access list and redeeming a code; the staff pet page and search page do not yet show the clinic's access level. Backend `pnpm lint` does not run (ESLint is not installed).

Deliberately out of scope: admin module, password reset, telemedicine, payments, community features.

# PetWell

Pet Health Passport & Appointment Management System — clinic-agnostic, portable pet health records for the Thai market.

**Stack:** Next.js 16 · NestJS 11 · PostgreSQL · Prisma 7 · JWT · Cloudinary

## The idea

In practice a pet's medical history lives inside whichever clinic wrote it. Change clinics and the history stays behind. PetWell inverts that: the **owner** holds the record, and any clinic on the platform can read the pet's full history and append to it. Every record is stamped with the clinic that authored it, so provenance is never lost.

## Roles

| Role | Can do |
|---|---|
| **Pet Owner** | Manage pets, read the full cross-clinic health passport, browse clinics, request and cancel appointments |
| **Clinic Staff** | Look up any patient, write and update health records, manage the clinic's appointment queue, edit the clinic profile |

Clinics are **seeded** — there is no admin module. Staff pick their clinic at sign-up and are active immediately.

## Entities

`User` · `Pet` · `HealthRecord` · `Clinic` · `Appointment` · `AppointmentStatusLog`

Nothing is hard-deleted. Pets and records are archived via `isActive`, and every appointment status change writes an `AppointmentStatusLog` row inside a transaction — that trail is what the appointment detail page renders.

## Layout

```
petwell-code/
├── docs/          # Specs, ERD, endpoint list, API + frontend documentation
├── backend/       # NestJS API — 30 endpoints, 7 modules
└── frontend/      # Next.js App Router app — owner + staff areas
```

## Run it locally

Requires Node 18+, pnpm, and PostgreSQL 14+.

```bash
# 1. API
cd backend
cp .env.example .env          # fill DATABASE_URL, ACCESS_TOKEN_SECRET, Cloudinary keys
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

See [`SETUP.md`](./SETUP.md) for the full dependency breakdown and Prisma 7 notes.

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

Register as an owner → add a pet → sign in as `vet1@test.com` in a second browser → look the pet up under **Patients** → add a vaccine record → back on the owner account, see that record appear in the passport labelled with the clinic → book an appointment → confirm it as staff → open the appointment to see the status history.

To show the portability that the whole product rests on, add a second record as `vet2@test.com` — a different clinic — and the owner's passport will list both, each stamped with its source.

## Docs

| File | What's in it |
|---|---|
| `docs/PetWell_API_Endpoints.md` / `.xlsx` | Every endpoint, body, and auth requirement |
| `docs/PetWell_API_Documentation.pdf` | Narrative backend reference — architecture, every module, design reasoning (Revision 2) |
| `docs/PetWell_Frontend_Documentation.pdf` | Frontend architecture and page inventory (Revision 1) |
| `docs/PetWell_Frontend_Addendum.pdf` | What changed in the frontend after Revision 1 |
| `docs/src/` | Markdown sources for the PDFs — see `docs/src/README.md` to rebuild |
| `docs/PetWell_Feature_List.md` | Feature inventory + grading-requirement mapping |
| `docs/PetWell_Build_Checklist.md` | The phased build plan this was built against |
| `docs/PetWell_ERD.svg` | Entity-relationship diagram |
| `docs/DESIGN_SYSTEM.html` | Colours, type scale, and component styles |

## Status

Feature-complete. Backend and frontend both typecheck and lint clean; all four grading requirements (auth with JWT + protected routes, two roles, CRUD on two-plus entities, two-plus core features) are covered — see `docs/PetWell_Feature_List.md` for the mapping.

Deliberately out of scope: admin module, password reset, telemedicine, payments, community features.

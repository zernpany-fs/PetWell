# PetWell — Build Checklist

**Timeline:** ~July 22 → Aug 4 demo · **Stack:** Next.js · NestJS · PostgreSQL · Prisma · JWT · Cloudinary
**Principle:** depth-first — finish each feature end to end (DB → API → UI) before starting the next.

---

## Phase 0 — Project Setup (Day 1)

**Backend**
- [ ] Scaffold NestJS app (`nest new backend`)
- [ ] Install deps: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `prisma`, `@prisma/client`, `class-validator`, `class-transformer`, `cloudinary`, `multer`
- [ ] Stand up PostgreSQL (Docker Compose locally, or Neon/Supabase hosted)
- [ ] `prisma init`; set `DATABASE_URL` in `.env`
- [ ] Write `schema.prisma` — 6 models: User, Pet, HealthRecord, Clinic, Appointment, AppointmentStatusLog (use corrected ERD)
- [ ] Add enums: Role (OWNER, CLINIC_STAFF), RecordType, AppointmentStatus
- [ ] `prisma migrate dev --name init`
- [ ] Write `prisma/seed.ts` — seed 5–8 clinics; add seed script to `package.json`
- [ ] Configure global `ValidationPipe`, CORS, `ConfigModule` for env
- [ ] Set up Cloudinary account + env vars (cloud name, key, secret)

**Frontend**
- [ ] Scaffold Next.js app (App Router, TypeScript)
- [ ] Install: axios (or fetch wrapper), Tailwind, form lib (react-hook-form + zod optional)
- [ ] Set up API base URL env var + axios instance with auth interceptor
- [ ] Base layout shell + routing structure

---

## Phase 1 — Authentication (Days 2–3)

**Backend**
- [ ] Auth module + controller + service
- [ ] `POST /auth/register` (Pet Owner) — hash password (bcrypt), create user
- [ ] `POST /auth/register/clinic-staff` — accepts `clinicId`, links user to seeded clinic, active immediately
- [ ] `POST /auth/login` — validate credentials, return `access_token` + `user`
- [ ] `GET /auth/me` — return current user (Bearer)
- [ ] JWT strategy + `JwtAuthGuard`
- [ ] `RolesGuard` + `@Roles()` decorator (OWNER / CLINIC_STAFF)
- [ ] DTOs + validation (email format, password rules); enforce unique email

**Frontend**
- [ ] Register page (owner) + register page (clinic staff, with clinic dropdown from `GET /clinics`)
- [ ] Login page
- [ ] Auth context/store (token + user), persist token
- [ ] Protected-route wrapper / middleware (redirect to login)
- [ ] Logout
- [ ] Role-aware navigation (owner vs clinic staff)

✅ *Satisfies: Authentication, JWT, Protected Routes, ≥2 Roles*

---

## Phase 2 — Pets CRUD (Days 4–5) · first full vertical slice

**Backend**
- [ ] Pet module + controller + service
- [ ] `POST /pets` — create (owner only)
- [ ] `GET /pets` — list my pets
- [ ] `GET /pets/:petId` — detail (ownership check)
- [ ] `PATCH /pets/:petId` — update
- [ ] `DELETE /pets/:petId` — archive (set `is_active = false`, not hard delete)
- [ ] `PATCH /pets/:petId/photo` — Cloudinary upload via Multer, save returned URL
- [ ] Ownership guard (owner can only touch own pets)

**Frontend**
- [ ] Owner dashboard — list of my pets + upcoming appointments placeholder
- [ ] Add pet form (name, species, breed, birth_date, gender, weight, microchip, allergies)
- [ ] Pet photo upload UI
- [ ] Pet detail page
- [ ] Edit pet + archive action

✅ *Satisfies: CRUD entity #1 · file upload begins · demoable app*

---

## Phase 3 — Health Records (Days 6–7) · the differentiator

**Backend**
- [ ] HealthRecord module + controller + service
- [ ] `POST /pets/:petId/health-records` — clinic staff create; auto-stamp `clinic_id` (from staff) + `created_by`
- [ ] `GET /pets/:petId/health-records` — list (owner sees own; staff sees looked-up pet)
- [ ] `GET /health-records/:recordId` — detail
- [ ] `PATCH /health-records/:recordId` — update (clinic staff)
- [ ] `DELETE /health-records/:recordId` — archive (`is_active = false`)
- [ ] `POST /health-records/:recordId/attachments` — Cloudinary upload
- [ ] Patient lookup for staff (search pet by id/name/owner)

**Frontend**
- [ ] Clinic staff: patient lookup screen
- [ ] Clinic staff: create/edit health record form (type, description, dates, next_due_date, attachment)
- [ ] Owner: pet health passport view — full history across all clinics, each record labeled with source clinic
- [ ] Attachment view/download

✅ *Satisfies: CRUD entity #2 · portable-record core value working end to end*

---

## Phase 4 — Clinics + Appointments (Days 8–10) · second core feature

**Backend**
- [ ] Clinic module: `GET /clinics?search=&type=`, `GET /clinics/:clinicId`, `PATCH /clinics/:clinicId` (staff edits own)
- [ ] Appointment module + controller + service
- [ ] `POST /appointments` — owner requests (status `pending`)
- [ ] `GET /appointments` — owner's list
- [ ] `GET /clinics/:clinicId/appointments` — staff's incoming list
- [ ] `GET /appointments/:appointmentId` — detail
- [ ] `PATCH /appointments/:appointmentId/status` — staff updates status → **write AppointmentStatusLog** (old, new, changed_by, reason)
- [ ] `DELETE /appointments/:appointmentId` — owner cancels (status change + log)
- [ ] `GET /appointments/:appointmentId/logs` — status history

**Frontend**
- [ ] Clinic directory — browse + search/filter (by type/name)
- [ ] Clinic detail page (info + Google Maps link)
- [ ] Request appointment form (select pet, clinic, date, reason)
- [ ] Owner: my appointments list + statuses + cancel
- [ ] Clinic staff: incoming requests + status update UI
- [ ] Appointment detail + status history timeline
- [ ] Clinic staff: edit clinic profile

✅ *Satisfies: core feature #2 (appointments) · search/filter*

---

## Phase 5 — Cross-cutting & Polish (Days 11–12)

- [ ] Shared components: header, sidebar, status badges, modals, cards, empty/loading/error states
- [ ] Responsive layout pass
- [ ] Consistent API error handling + toast/notifications
- [ ] Server-side validation hardening on all DTOs
- [ ] Pagination on long lists (pets, records, appointments) — optional
- [ ] Basic README with setup + env instructions

---

## Phase 6 — Stretch (only if ahead, Day 13)

- [ ] Resend email vaccine reminders (uses `next_due_date`)
- [ ] Email verification on sign-up
- [ ] Owner avatar upload
- [ ] In-app notifications on status change

---

## Phase 7 — Demo Prep (Aug 3–4)

- [ ] Seed realistic demo data (owners, pets, clinics, records, appointments)
- [ ] Walk every happy path end to end; fix breakages
- [ ] Deploy backend + frontend (+ managed Postgres)
- [ ] Prepare demo script / walkthrough order
- [ ] Rehearse the 4-minute core loop: register → add pet → clinic adds record → owner views passport → book appointment → staff confirms

---

## Requirement Coverage (quick check)

| Requirement | Done when |
|---|---|
| Authentication (sign-up, login, JWT, protected routes) | Phase 1 |
| ≥ 2 Roles | Phase 1 (Owner + Clinic Staff) |
| CRUD on ≥ 2 entities | Phase 2 (Pet) + Phase 3 (HealthRecord) |
| ≥ 2 core features (excl. auth) | Phase 3/4 (Appointments) + File Upload + Search/Filter |

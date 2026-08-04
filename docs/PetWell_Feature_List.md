# PetWell — Feature List

**Project:** PetWell — Pet Health Passport & Appointment Management System
**Stack:** Next.js · NestJS · PostgreSQL · Prisma 7 · JWT · Cloudinary
**Roles:** Pet Owner · Clinic Staff
**Entities:** User · Pet · HealthRecord · Clinic · Appointment · AppointmentStatusLog

Legend: **[Core]** = MVP / required for grading · **[Stretch]** = nice-to-have · **✅** = built end to end (API + UI where applicable) · **⬜** = not started

> **Status: feature-complete, front and back.** All four grading requirements are implemented and verified end-to-end (30 endpoints), and every core item now has UI. Both packages typecheck and lint clean.
>
> Architecture note: auth is **protected-by-default** (global `AuthGuard`); public routes opt out with `@Public()`. Clinic staff are auto-activated at sign-up (no admin approval); clinics are seeded. User names are `firstName` + `lastName` (+ optional `phone`).

---

## 1. Authentication & Authorization

- ✅ **[Core]** Sign up as Pet Owner (`POST /auth/register`)
- ✅ **[Core]** Sign up as Clinic Staff — select seeded clinic, active immediately (`POST /auth/register/clinic-staff`)
- ✅ **[Core]** Login → JWT access token (`POST /auth/login`)
- ✅ **[Core]** Get authenticated user (`GET /auth/me`)
- ✅ **[Core]** Global JWT `AuthGuard` — protected-by-default, `@Public()` to opt out
- ✅ **[Core]** Role-based access control — 2 roles via `@Roles` + `RolesGuard`
- ✅ **[Core]** Password hashing (bcrypt, salt 12); unique email enforced
- ⬜ **[Stretch]** Email verification · refresh token rotation

---

## 2. Pet Owner Features

### 2.0 Dashboard / Home
- ✅ **[Core]** Pet Owner dashboard — pets + upcoming/recent appointments

### 2.1 Profile & Account
- ✅ **[Core]** View own profile (`GET /auth/me`)
- ✅ **[Core]** Edit profile — firstName, lastName, phone (`PATCH /users/me`)
- ✅ **[Stretch]** Upload owner avatar (`PATCH /users/me/avatar`) + cover (`PATCH /users/me/cover`) — mirrors reference project

### 2.2 Pet Management (CRUD — entity: Pet)
- ✅ **[Core]** Create a pet
- ✅ **[Core]** List my pets
- ✅ **[Core]** View single pet detail
- ✅ **[Core]** Edit pet information
- ✅ **[Core]** Archive pet (status-change via `isActive`)
- ✅ **[Core]** Upload pet photo (Cloudinary)

### 2.3 Health Records (portable — the core differentiator)
- ✅ **[Core]** View a pet's complete history across **all** clinics
- ✅ **[Core]** Each record labeled with its source clinic
- ✅ **[Core]** Record attachments (Cloudinary)
- ✅ **[Core]** Records are read-only to the owner (created by clinics)
- ⬜ **[Stretch]** Filter by type/date/clinic · export passport PDF

### 2.4 Appointments (entity: Appointment)
- ✅ **[Core]** Browse / search clinics (`GET /clinics?search=&type=`)
- ✅ **[Core]** View clinic detail (info + Google Maps URL)
- ✅ **[Core]** Request an appointment
- ✅ **[Core]** Slot capacity — 2 appointments per clinic per hour, enforced server-side in a `SERIALIZABLE` transaction; full hours are greyed out in the picker and a 409 is shown gracefully if the last seat goes mid-booking
- ✅ **[Core]** View my appointment list & statuses
- ✅ **[Core]** View appointment detail + status history
- ✅ **[Core]** Cancel an appointment (status change, logged)
- ⬜ **[Stretch]** Reschedule · email confirmation on status change

### 2.5 Reminders
- ⬜ **[Stretch]** Email vaccine / follow-up reminders (uses `nextDueDate`)

---

## 3. Clinic Staff Features

### 3.1 Account & Clinic Profile
- ✅ **[Core]** Login (active immediately after sign-up)
- ✅ **[Core]** Clinic association — staff linked to a seeded clinic at sign-up
- ✅ **[Core]** View / edit own clinic profile
- ✅ **[Core]** Clinic dashboard — pending-request and today counters + action queue

### 3.2 Patient Lookup
- ✅ **[Core]** Search any pet by name, microchip number, or owner name / email / phone (`GET /pets/search?q=`)
- ✅ **[Core]** Look up a pet + view its full cross-clinic history

### 3.3 Health Record Management (CRUD — entity: HealthRecord)
- ✅ **[Core]** Create a health record (auto-stamps clinic + author)
- ✅ **[Core]** View / update records
- ✅ **[Core]** Upload attachments (Cloudinary)
- ✅ **[Core]** Archive via `isActive` (audit integrity)

### 3.4 Appointment Handling (entities: Appointment, AppointmentStatusLog)
- ✅ **[Core]** View incoming appointment requests (per clinic)
- ✅ **[Core]** Update appointment status (hybrid: web request, phone confirmation)
- ✅ **[Core]** Every status change writes an AppointmentStatusLog (transaction)
- ✅ **[Core]** Appointment detail page with a rendered status-history timeline (who changed it, when, and why) — owner and staff
- ✅ **[Core]** View clinic appointment history

---

## 4. Cross-Cutting / System Features

- ✅ **[Core]** Clinics seeded in the database (no Admin module)
- ✅ **[Core]** File upload service — Cloudinary + Multer (stream upload)
- ✅ **[Core]** Search & filter (clinics by name/type · pets by name/microchip/owner)
- ✅ **[Core]** Concurrency control — per-slot booking capacity guarded by a `SERIALIZABLE` transaction with single retry on `P2034`
- ✅ **[Core]** Audit trail via status logs + status-change-over-delete
- ✅ **[Core]** Google Maps as a stored URL link
- ✅ **[Core]** Server-side validation (global ValidationPipe + DTOs) & zod env validation
- ✅ **[Core]** Responsive UI · shared component library (`AppShell`, `StatusBadge`, `StatusTimeline`, `PhotoPlaceholder`, shadcn primitives)
- ⬜ **[Stretch]** In-app notifications · polished loading/empty/error states · pagination

---

## 5. Explicitly Out of Scope

- Admin module / dashboard / user management UI
- Forgot / reset / change password
- Telemedicine · payment gateway · community features · specialist-doctor booking

---

## Grading Requirements — all met ✅

| Requirement | Covered by | Status |
|---|---|---|
| Authentication (Sign-up, Login, JWT, Protected Routes) | §1 | ✅ Done |
| ≥ 2 Roles | Pet Owner, Clinic Staff | ✅ Done |
| CRUD on ≥ 2 Entities | Pet, HealthRecord (+ Appointment, Clinic) | ✅ Done |
| ≥ 2 Core Features (excl. Auth) | Appointment management + File upload + Search/filter | ✅ Done |

*See `PetWell_API_Endpoints.md` / `.xlsx` for the full endpoint spec.*

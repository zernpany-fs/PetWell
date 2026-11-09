# PetWell — Impact Analysis: Consent-Based Access

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Date** | 2026-11-09 |
| **Author** | Nopparuth Panyanithiwat |
| **Related** | `PetWell_Decision_Log.md` (D1–D22), `PetWell_User_Stories_Access_Control.md` |
| **Based on** | Backend code at tag `v1.0` (read-only review of `schema.prisma`, pet, health-record and appointment modules) |

## 1. Summary

In v1, any `CLINIC_STAFF` user can search, read and write to every pet in the system. V2 puts every clinic read and write of pet data behind one access check. The change touches **3 modules and 8 existing endpoints**, adds **4 tables** and **one shared service**, and needs **no change** to owner-facing endpoints.

## 2. Gaps found during the review

| Gap | Where | Resolved by |
|---|---|---|
| Any clinic can search every pet and gets the owner's phone and email in the result | `GET /pets/search` | D18 |
| Any clinic can create a health record for any pet | `POST /pets/:petId/health-records` | D19 |
| No defined response for a clinic without access | pet and record read endpoints | D20 |
| Vitest is not installed and there are no tests (the context doc said Vitest was in the stack) | `backend/package.json`, `frontend/package.json` | D22 |
| `GET /health-records/:recordId` does not check `isActive` (v1 bug) | `health-record.service.findOne` | Fix during V2 |

## 3. Affected endpoints

| Endpoint | v1 behaviour (clinic staff) | V2 behaviour | Decisions |
|---|---|---|---|
| `GET /pets/search` | All active pets, with owner phone and email | Only pets with active access or authored records; owner contact only with active access | D18, D9 |
| `GET /pets/:petId` | Full pet profile (incl. chronic condition, drug allergy) for any pet | Access → full profile + owner contact. Authored records only → `id`, `name`, `species`. Neither → `404` | D5, D9, D20 |
| `GET /pets/:petId/health-records` | All records | Access → all records. No access → only records it authored, or `404` if none | D5, D6, D11, D20 |
| `GET /health-records/:recordId` | Any record | Allowed with access, or if the clinic authored it | D6, D11 |
| `POST /pets/:petId/health-records` | Any pet | Requires active access | D19 |
| `PATCH`, `DELETE`, `POST …/attachments` on `/health-records/:recordId` | Authoring clinic only | No change (authoring clinic, with or without access) | D6, D19 |
| `PATCH /appointments/:id/status` | Changes status + writes status log | Same, plus: first `CONFIRMED` → create grant; `COMPLETED` → grant expires in 30 days; `REJECTED` / `CANCELLED` → end grant | D1, D2, D4, D13 |
| `DELETE /appointments/:id` (owner cancel) | Cancels + writes status log | Same, plus end the appointment's grant | D4 |
| `DELETE /pets/:petId` (owner archive) | Archives pet, cancels live appointments | Same, plus end grants from those appointments | US-02 AC4 |

Not affected: owner endpoints for pets and appointments, `GET /clinics/:clinicId/appointments` (already returns only `pet { id, name, species }`), availability, auth and user endpoints.

## 4. New pieces

- **`AccessService` (shared)** — one place for: checking a clinic's access to a pet, writing the audit log entry (D10), creating a grant from an appointment, and ending grants. Used by the pet, health-record and appointment services.
- **New endpoints** — owner generates a share code; clinic redeems a share code; owner lists and revokes a clinic's access (exact routes to be defined in the API doc).
- **New tables** (D17) — `PetAccessGrant`, `ShareCode`, `PetAccessLog`, `ShareCodeAttempt`.

## 5. Technical notes for the ER design

- `updateStatus` and owner `cancel` use Prisma's array form `$transaction([...])`. They need the callback form (`$transaction(async (tx) => …)`) so the grant change runs in the same transaction as the status change.
- Proposed (to confirm when drawing the ER): make `PetAccessGrant.appointmentId` **unique**, so an appointment can never create a second grant (US-01 AC3, D13 enforced by the database). Consider `endedAt` + `endReason` (`REVOKED` / `CANCELLED` / `REJECTED`) instead of only `revokedAt`, so the audit trail shows why access ended.
- The JWT payload already carries `clinicId`, so the access check needs no extra lookup for the clinic.

## 6. Frontend impact (not yet reviewed in detail)

- `app/staff/pets/page.tsx` (search) and `app/staff/pets/[petId]/page.tsx` (pet detail) call endpoints whose responses change. They need empty-state and "no access" handling.
- New owner screens: generate share code, list and revoke clinic access. New staff screen: enter share code.

## 7. Out of scope for V2

Pets without an owner (D8, deferred by D21) and everything else in the decision log backlog.

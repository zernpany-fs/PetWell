# PetWell — API Endpoints

Reflects the built NestJS backend (fakebuck-style architecture).

**Auth model:** a global `AuthGuard` protects every route by default. Routes marked **Public** opt out with `@Public()`. Protected routes require `Bearer <access_token>`; role-restricted routes add `@Roles(...)` + `RolesGuard`.

**Status:** ✅ = implemented & smoke-tested.

**Totals:** 31 endpoints — **all implemented**.

## Auth (`auth` module · `AuthController`)

| Status | Feature | Method | Path | Body | Auth | Success |
|:--:|---|---|---|---|---|---|
| ✅ | Register (Pet Owner) | POST | `/auth/register` | firstName, lastName, phone?, email, password | Public | `{ message }` |
| ✅ | Register (Clinic Staff) | POST | `/auth/register/clinic-staff` | …+ clinicId | Public | `{ message }` |
| ✅ | Login | POST | `/auth/login` | email, password | Public | `{ access_token, user }` |
| ✅ | Get authenticated user | GET | `/auth/me` | — | Protected | `user` |

## User (`user` module · `UserController`)

| Status | Feature | Method | Path | Body | Auth | Success |
|:--:|---|---|---|---|---|---|
| ✅ | Update my profile | PATCH | `/users/me` | firstName?, lastName?, phone?, addressLine?, subdistrict?, district?, province?, postalCode? | Protected | `user` |
| ✅ | Upload avatar | PATCH | `/users/me/avatar` | avatar (multipart) | Protected | raw URL string |
| ✅ | Upload cover | PATCH | `/users/me/cover` | cover (multipart) | Protected | raw URL string |

## Pet (`pet` module · `PetController`)

| Status | Feature | Method | Path | Body | Auth | Success |
|:--:|---|---|---|---|---|---|
| ✅ | Create pet | POST | `/pets` | name, species, breed?, birthDate?, chronicCondition?, drugAllergy?, microchipNo?, latestWeight? | Protected (OWNER) | `pet` |
| ✅ | List my pets | GET | `/pets` | — | Protected (OWNER) | `Pet[]` |
| ✅ | Patient lookup | GET | `/pets/search?q=` | — | Protected (CLINIC_STAFF) | `Pet[]` (each with `owner` summary) |
| ✅ | Get pet by id | GET | `/pets/:petId` | — | Protected | `pet` |
| ✅ | Update pet | PATCH | `/pets/:petId` | (pet fields, optional) | Protected (OWNER) | `pet` |
| ✅ | Upload pet photo | PATCH | `/pets/:petId/photo` | photo (multipart) | Protected (OWNER) | `{ url }` |
| ✅ | Archive pet | DELETE | `/pets/:petId` | — | Protected (OWNER) | `{ message }` |

## Health Record (`health-record` module · `HealthRecordController`)

| Status | Feature | Method | Path | Body | Auth | Success |
|:--:|---|---|---|---|---|---|
| ✅ | Create health record | POST | `/pets/:petId/health-records` | recordType, description, recordDate, nextDueDate? | Protected (CLINIC_STAFF) | `healthRecord` |
| ✅ | List pet health records | GET | `/pets/:petId/health-records` | — | Protected | `HealthRecord[]` |
| ✅ | Get health record | GET | `/health-records/:recordId` | — | Protected | `healthRecord` |
| ✅ | Update health record | PATCH | `/health-records/:recordId` | recordType?, description?, nextDueDate? | Protected (CLINIC_STAFF) | `healthRecord` |
| ✅ | Upload record attachment | POST | `/health-records/:recordId/attachments` | file (multipart) | Protected (CLINIC_STAFF) | `{ url }` |
| ✅ | Archive health record | DELETE | `/health-records/:recordId` | — | Protected (CLINIC_STAFF) | `{ message }` |

## Clinic (`clinic` module · `ClinicController`)

| Status | Feature | Method | Path | Body | Auth | Success |
|:--:|---|---|---|---|---|---|
| ✅ | List / search clinics | GET | `/clinics?search=&type=` | — | Public | `Clinic[]` |
| ✅ | Get clinic by id | GET | `/clinics/:clinicId` | — | Public | `clinic` |
| ✅ | Update clinic profile | PATCH | `/clinics/:clinicId` | name?, address?, phone?, description?, clinicType?, googleMapsLink? | Protected (CLINIC_STAFF) | `clinic` |

## Appointment (`appointment` module · `AppointmentController`)

| Status | Feature | Method | Path | Body | Auth | Success |
|:--:|---|---|---|---|---|---|
| ✅ | Request appointment | POST | `/appointments` | petId, clinicId, appointmentDate, notes? | Protected (OWNER) | `appointment` |
| ✅ | List my appointments | GET | `/appointments` | — | Protected (OWNER) | `Appointment[]` |
| ✅ | Day slot availability | GET | `/clinics/:clinicId/availability?date=YYYY-MM-DD` | — | Protected | `DayAvailability` |
| ✅ | List clinic appointments | GET | `/clinics/:clinicId/appointments` | — | Protected (CLINIC_STAFF) | `Appointment[]` |
| ✅ | Get appointment | GET | `/appointments/:appointmentId` | — | Protected | `appointment` |
| ✅ | Update appointment status | PATCH | `/appointments/:appointmentId/status` | status, reason? | Protected (CLINIC_STAFF) | `appointment` |
| ✅ | Cancel appointment | DELETE | `/appointments/:appointmentId` | — | Protected (OWNER) | `{ message }` |
| ✅ | Get appointment status history | GET | `/appointments/:appointmentId/logs` | — | Protected | `AppointmentStatusLog[]` (each with `changedBy` summary) |

---

*Every endpoint is implemented. Avatar/cover upload mirrors the reference project's `user` module.*

**Route-order note:** `GET /pets/search` is declared before `GET /pets/:petId` in `PetController`, otherwise `search` would be captured by the UUID param route and rejected by `ParseUUIDPipe`.

**Search matching:** `q` is matched case-insensitively against pet `name`, `microchipNo`, and the owner's `firstName`, `lastName`, `email`, and `phone`. A blank or missing `q` returns `[]` rather than every pet; results are capped at 50.

**Upload responses:** pet photo and record attachment return `{ url }`; avatar and cover return the URL as a raw string (mirroring the reference project). `api-fetch` on the frontend tolerates both.

**Missing file:** every upload endpoint returns **400** `No file was uploaded` when the multipart field is absent.

## Owner address

`PATCH /users/me` accepts an optional Thai postal address, stored as five nullable columns on `users` rather than one blob, so it stays queryable — grouping owners by province, for instance.

| Field | Rule |
|---|---|
| `addressLine` | ≤ 255 chars — house no., moo, soi, road |
| `subdistrict` | ≤ 100 chars — ตำบล / แขวง |
| `district` | ≤ 100 chars — อำเภอ / เขต |
| `province` | ≤ 100 chars — จังหวัด |
| `postalCode` | exactly 5 digits, `varchar(5)` |

Every part is optional. Sending `""` **clears** the field: a `TrimToNull` transform maps an empty string to `null` so the column empties rather than storing a blank, and `ValidateIf` skips the format rules for null — otherwise clearing a postal code would fail the 5-digit check.

`province` is validated as a bounded string, not against a fixed list. The frontend offers the 77 provinces as a dropdown for input quality, but pinning the list server-side would block a user the day an administrative name changes, for no real safety gain.

The fields are returned on every user response, but only rendered on `/owner/profile`. Clinic staff have an address on their `Clinic` record, so `ProfileForm` omits the section for them — and omits the keys from the payload entirely, so saving a staff profile cannot blank an address.

## Appointment status transitions

`PATCH /appointments/:appointmentId/status` only accepts the moves below. `REJECTED`, `COMPLETED` and `CANCELLED` are terminal — anything else is a **400**, which is what keeps the `AppointmentStatusLog` trail trustworthy.

| From | May become |
|---|---|
| `PENDING` | `CONFIRMED` · `RESCHEDULED` · `REJECTED` · `CANCELLED` |
| `CONFIRMED` | `RESCHEDULED` · `COMPLETED` · `CANCELLED` |
| `RESCHEDULED` | `CONFIRMED` · `REJECTED` · `CANCELLED` |
| `REJECTED` `COMPLETED` `CANCELLED` | — terminal |

`DELETE /appointments/:appointmentId` (owner cancel) is allowed only from `PENDING`, `CONFIRMED`, or `RESCHEDULED`.

**Other guards:** `appointmentDate` must be in the future. Archived pets (`isActive: false`) read as 404 and cannot be booked or given new records. Archiving a pet cancels its live appointments and logs each cancellation.

## Slot capacity

Each clinic accepts **2 appointments per one-hour slot**. Slots align to the top of the hour, half-open — the 10:00 slot covers `10:00:00`–`10:59:59.999` and 11:00 belongs to the next one. Capacity is **per clinic**: clinic A being full at 10:00 does not affect clinic B.

`POST /appointments` returns **409 Conflict** when the slot is taken:

```json
{ "statusCode": 409, "message": "This time slot is fully booked. Please choose another time." }
```

**Seats.** `PENDING`, `CONFIRMED`, `RESCHEDULED` and `COMPLETED` occupy a seat. `CANCELLED` and `REJECTED` release theirs — otherwise a cancelled booking would block its slot forever.

**Race safety.** The count and the insert run together in one `SERIALIZABLE` transaction. A plain transaction would not do: at Prisma's default `READ COMMITTED` two concurrent bookings can each count 1 and each insert, producing 3 in a slot capped at 2. Under `SERIALIZABLE`, Postgres SSI detects that the count one transaction relied on was invalidated by the other and aborts it with a serialization failure (SQLSTATE 40001 → Prisma `P2034`). Because a conflict only means the loser read a stale count — not necessarily that the slot is full — the service retries once and lets the fresh count decide; a second conflict returns 409 asking the user to try again.

The `@@index([clinicId, appointmentDate])` on `appointments` is part of this, not just a performance tweak: it lets the count use an index range scan, so SSI's predicate locks cover only the slot. Without it a sequential scan takes a table-wide lock and unrelated clinics would spuriously conflict.

**Timezone.** Clinics are ICT (UTC+07:00), a whole-hour offset with no DST, so truncating an instant to the hour gives the same boundary in UTC as in local time. `slotStart` is returned as an absolute ISO instant and should be posted straight back as `appointmentDate`; the accompanying `hour` field is the clinic-local hour for display, so clients never do timezone math.

**Business hours.** 09:00–18:00 local, giving nine slots with the last starting at 17:00. Defined in `appointment.constants.ts`, not per clinic.

### `DayAvailability`

```json
{
  "clinicId": "…", "date": "2026-08-03", "capacityPerSlot": 2,
  "slots": [
    { "slotStart": "2026-08-03T02:00:00.000Z", "hour": 9,
      "booked": 0, "remaining": 2, "isFull": false, "isPast": true },
    { "slotStart": "2026-08-03T03:00:00.000Z", "hour": 10,
      "booked": 2, "remaining": 0, "isFull": true, "isPast": false }
  ]
}
```

`isPast` is true once the slot has started, so today's earlier hours are unbookable without a second round trip.

# PetWell — User Stories: Consent-Based Access

| | |
|---|---|
| **Status** | Draft v0.4 |
| **Date** | 2026-11-10 |
| **Related** | `PetWell_Decision_Log.md` (decision IDs D1–D27) |
| **Roles** | `OWNER`, `CLINIC_STAFF` (as in the system) |

## Terms

- **Appointment-based access**: access a clinic gets from a confirmed appointment (D1, D2).
- **Owner-share access**: access the owner gives explicitly, by share code, for a chosen duration (D3, D7, D15).
- **Authored records**: health records created by the clinic itself (`HealthRecord.clinicId`).
- A clinic has access to a pet if it has **at least one active access of either kind**.

---

## US-01 — Clinic gets access when it confirms an appointment

**As** clinic staff, **I want** to see a pet's full history once my clinic has confirmed its appointment, **so that** I can prepare the treatment without asking the owner for paperwork.

- **AC1** *Given* a pet has an appointment at clinic X that has never been `CONFIRMED`, *when* X's staff set it to `CONFIRMED` for the first time, from any status (`PENDING` or `RESCHEDULED`), *then* an appointment-based access is created for X on that pet, and X's staff can open the pet's full history (records from all clinics) and the owner's contact info as entered. (D1, D5, D9)
- **AC2** *Given* an appointment is `PENDING`, `REJECTED`, or `RESCHEDULED` and has never been `CONFIRMED`, *when* X's staff try to open the pet's profile or records, *then* the API responds `404 Pet not found` and no pet data is returned (unless X authored records for this pet, in which case X gets only `id`, `name`, `species` and its own records). The appointment list still shows only the pet's id, name, and species. (D1, D20)
- **AC3** *(edge case)* *Given* an appointment is `CONFIRMED` with active access, *when* its status changes to `RESCHEDULED`, *then* access stays active; and when it returns to `CONFIRMED`, no duplicate access is created.
- **AC4** *Given* an appointment moves from `CONFIRMED` to `COMPLETED` on date D, *when* 30 days have passed since D, *then* the access expires and X sees only the records X authored. (D2, D6, D11)
- **AC5** *Given* X has access (of either kind), *when* X's staff open the pet, *then* the system writes an audit log entry (who, which pet, when, which kind of access). If X has no access but opens a pet it authored records for, the entry is written with no access kind. (D10, D24)
- **AC6** *Given* X has no active access to a pet, *when* X's staff try to create a health record for it, *then* the request is denied and no record is created. Records X authored earlier stay editable. (D6, D19)
- **AC7** *Given* X's staff search pets, *when* results are returned, *then* they include only pets X has active access to or has authored records for, and owner phone/email appear only for pets with active access. (D18)

---

## US-02 — Cancelling or rejecting an appointment ends appointment-based access

**As** a pet owner, **I want** a clinic to lose the access it got from an appointment when that appointment is cancelled or rejected, **so that** clinics I am no longer using cannot see my pet's data.

- **AC1** *Given* X's only access to the pet comes from appointment A, *when* A becomes `CANCELLED` (by the owner or by X's staff) or `REJECTED`, *then* the access ends immediately, X's staff are denied, and X still sees the records X authored. (D4, D6, D11)
- **AC2** *Given* X also has an owner-share access with time remaining, *when* A is cancelled, *then* the owner-share access is not affected. (D4)
- **AC3** *(edge case)* *Given* the pet has two confirmed appointments A and B at X, *when* A is cancelled, *then* X keeps access through B, and loses it only when no appointment-based access from any appointment remains (an appointment `COMPLETED` less than 30 days ago still counts, per D2).
- **AC4** *(edge case)* *Given* the owner archives the pet (which cancels the pet's live appointments), *when* the cancellation completes, *then* appointment-based access created by those appointments ends as well.

---

## US-03 — Owner gives a clinic access with a share code

**As** a pet owner, **I want** to generate a short code for a clinic to enter, **so that** a clinic I visit without a booking can see my pet's history immediately, with no request-and-wait step.

- **AC1** *Given* I am logged in as `OWNER` and own the pet, *when* I choose a duration (7 / 30 / 90 days or unlimited) and generate a code, *then* the system creates a 6-digit code that is valid for 15 minutes, can be used once, and is bound to that pet. (D3, D7)
- **AC2** *Given* a clinic's staff enter a valid, unexpired, unused code, *when* they confirm, *then* the clinic gets owner-share access for the duration I chose, and the code can no longer be used. (D3, D5, D7)
- **AC3** *Given* a code has expired or already been used, *when* staff enter it, *then* the system rejects it with a generic message that does not reveal whether the code ever existed.
- **AC4** *Given* a staff account has entered 5 wrong codes, *when* it tries again, *then* that account is blocked from entering codes for 15 minutes. *Given* a clinic's staff have entered 10 wrong codes within one hour (across all accounts), *when* any staff of that clinic tries again, *then* code entry for the whole clinic is blocked for 15 minutes. (D14)
- **AC5** *(edge case)* *Given* clinic X already has an active owner-share access to my pet, *when* X's staff redeem a new code I generated, *then* a new owner-share access is created with the new duration, and X keeps access while either one is active. (D27)

---

## US-04 — Owner revokes or extends a clinic's access

**As** a pet owner, **I want** to revoke or extend a clinic's access to my pet, **so that** I stay in control of who can read the history without generating a new code every time.

- **AC1** *Given* clinic X has active access to my pet (of either kind), *when* I revoke X's access, *then* X loses access immediately and sees only the records X authored. (D11)
- **AC2** *Given* X has both appointment-based and owner-share access, *when* I revoke access for X, *then* both end. The appointment itself is not cancelled. (D12)
- **AC3** *(edge case)* *Given* I revoked X's access while the appointment is still `CONFIRMED`, *when* time passes, *then* X does **not** regain access from that same appointment; X gets access again only through a newly confirmed appointment or a new share code. An appointment that was `PENDING` at revoke time and is confirmed later creates new access. (D13)
- **AC4** *Given* clinic X has an active owner-share access to my pet, *when* I choose a new duration (7 / 30 / 90 days or unlimited), *then* that access now expires at the new duration counted from now, and no code is needed. Clinic staff cannot extend access, and access that has ended or comes from an appointment cannot be extended. (D3, D27)

---

## Backlog (stories still to write)

- **US-05** Clinic creates a pet and records for an owner who has no account (D8 — deferred by D21, not in V2)
- **US-06** Owner views the audit log of who opened their pet (D10 follow-up)

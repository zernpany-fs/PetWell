# PetWell — Decision Log: Consent-Based Access to Pet Records

| | |
|---|---|
| **Status** | Draft v0.3 |
| **Date** | 2026-11-09 |
| **Author** | Nopparuth Panyanithiwat |
| **Change** | Clinics can no longer read any pet's records by default. Access comes from a confirmed appointment or from the owner's explicit share. |

## 1. Why this change

The original design let any clinic search and read the full history of every pet ("clinic-agnostic passport"). That is convenient for clinics but gives owners no control over who sees their pet's health data. This change keeps the cross-clinic history (it is medically useful) and puts the owner in control of who can read it.

## 2. Decisions

| ID | Topic | Decision | Rationale |
|---|---|---|---|
| D1 | When access starts (appointments) | When the clinic sets the appointment to **CONFIRMED** for the first time, from any status (not when the owner books). | A booking alone would let anyone book at random just to open a pet's data. |
| D2 | How long appointment-based access lasts | Until the appointment is **COMPLETED + 30 days**. | Covers follow-up questions after the visit without keeping access forever. |
| D3 | Owner share | The owner shares a pet with a clinic for **7 / 30 / 90 days or unlimited**, and can revoke at any time. | Owner chooses the trade-off between convenience and control. |
| D4 | Two kinds of access | (a) **Appointment-based** (automatic) and (b) **Owner share** (explicit). Cancelling or rejecting an appointment ends only (a). | An explicit owner share should not disappear because an appointment was cancelled. |
| D5 | What a clinic can read with access | The **full history from all clinics**. | A treating vet needs to know everything the pet has been through. |
| D6 | Records a clinic wrote itself | The authoring clinic **always** sees them, even without access. | They are the clinic's own work records. |
| D7 | Walk-in without an appointment | The owner generates a **share code** (OTP-style) and tells the clinic; the clinic enters it and gets access immediately. No request/approval step. Defaults: 6 digits, valid 15 minutes, single use, bound to one pet. Lockout after failed attempts: see D14. | Works at the counter in seconds; short expiry and single use limit abuse. |
| D8 | Pets with no owner in the system | A clinic can create the pet and its records itself. *Claiming* such a pet by an owner who registers later is out of scope. **Deferred to backlog for V2 — see D21.** | Needed for real walk-ins, but claim/merge logic is a separate, larger feature. |
| D9 | Owner contact info | While a clinic has access, it sees the contact info the owner entered. When access ends, it no longer sees it. | Practical for emergencies, and it follows the same access check as health records, so it needs no extra logic. What a clinic may keep after access ends is in the backlog. |
| D10 | Audit log | Record every time a clinic opens a pet (who, which pet, when, via which kind of access). | Trust and traceability. |
| D11 | After access ends (revoked or expired) | The clinic sees **only the records it authored**. It does not keep a frozen copy of other clinics' records. | Simple, and revocation really means revocation. Owners who want a clinic to keep access can use "unlimited" share. |
| D12 | Owner revokes a clinic's access | Revoking ends **both** appointment-based and owner-share access for that clinic. The appointment itself is not cancelled. | When an owner revokes a clinic, they mean that clinic should not see the pet at all. |
| D13 | Access after revocation | The clinic does **not** regain access from an appointment that was already confirmed. A later first-time `CONFIRMED` of another appointment (including one already pending at revoke time) creates new access. | Revocation must stick. An appointment the owner booked counts as fresh consent. |
| D14 | Share-code lockout | 5 wrong codes per staff account → that account is blocked for 15 min. 10 wrong codes per clinic per hour → code entry for the whole clinic is blocked for 15 min. | A per-account limit alone lets a clinic with many accounts keep guessing. |
| D15 | Ways to share | Owner-share access is granted **only via share code** (D7). | Keeps V2 within the timebox. Direct share to a chosen clinic goes to the backlog. |
| D16 | Where V2 lives | Same repo. Tag the last v1 commit as `v1.0`, build V2 on branch `feat/consent-access`, merge to `main` when done. Uncommitted v1 files must be cleared before tagging. | Reviewers can follow the system from v1 to v2 in one history. No copied code. |
| D17 | New entities | `PetAccessGrant` (both access types in one table: `type` = `APPOINTMENT` / `OWNER_SHARE`, `petId`, `clinicId`, `appointmentId?`, `expiresAt?` (null = unlimited), `revokedAt?`), `ShareCode` (`codeHash`, `petId`, `durationDays?`, `expiresAt`, `usedAt?`), `PetAccessLog` (audit log: `userId`, `clinicId`, `petId`, `grantId`, `viewedAt`), `ShareCodeAttempt` (lockout counting: `userId`, `clinicId`, `attemptedAt`, `success`). | One table for grants means one place for the access check, and D12 revokes both types with one update. Codes are stored hashed so a database leak does not expose them. |
| D18 | Clinic pet search (`GET /pets/search`) | Results include only pets the clinic currently has access to, or pets with records the clinic authored. Owner contact (phone, email) is returned only for pets with active access. | Unrestricted search would bypass consent and expose owner contact (D9). |
| D19 | Writing health records | A clinic can create a record only while it has active access to the pet. Records it already authored stay editable after access ends (D6). | Stops clinics writing into histories of pets they do not treat. Walk-ins use a share code first. If the owner does not grant access, the visit is not recorded in PetWell; this gap is the owner's choice. |
| D20 | Response when a clinic has no access | No access and no authored records → `404 Pet not found` (does not reveal the pet exists). No access but has authored records → basic pet info (`id`, `name`, `species`) and only its own records. | Matches v1's 404 style and gives D6/D11 a concrete shape. |
| D21 | Scope cut: D8 | Pets without an owner (D8, US-05) move to the backlog for V2. | Making `Pet.ownerId` optional touches almost every ownership check and does not fit the 7-day timebox. |
| D22 | Test setup | Set up Vitest (minimal) on day 11 together with `.prettierrc`, and write access-check tests alongside the code. | Vitest is not installed yet; leaving setup to day 17 risks losing the test day. |

## 3. Findings from code review (2026-11-09)

- **Grants must be stored records**, created at the first CONFIRMED and ended by REJECTED / CANCELLED / COMPLETED + 30 days. They must not be derived from the current status. Reason: `RESCHEDULED` can follow `CONFIRMED` (clinic had access) or `PENDING` (never confirmed), and the status alone cannot tell them apart.
- **Three code paths change appointment status**: clinic status update, owner cancel, and pet archive (cancels live appointments). Access rules must be applied in all three, preferably through one shared function.
- **Clinics can cancel appointments too**, not only owners.
- The appointment list already exposes only `pet { id, name, species }` to the clinic, so no extra change is needed before access is granted.
- `Pet.ownerId` is currently **required**. D8 (pets created by a clinic) needs it to become optional.
- `HealthRecord.clinicId` already identifies the authoring clinic, which makes D6 a simple filter.
- See `PetWell_Impact_Analysis.md` for the full list of affected endpoints.

## 4. Out of scope / backlog

- Pets with no owner in the system, created by a clinic (D8, US-05 — deferred by D21)
- Owner claims a pet that a clinic created (D8 follow-up)
- Clinic requests access and the owner approves
- Owner selects a clinic and shares directly, without a code (D15 follow-up)
- Clinic-private notes not shown to the owner (considered for D19, not adopted)
- Owner chooses the scope of what is shared (all history vs. selected records)
- Frozen snapshot of history at the date access ended
- Owner-facing view of the audit log ("who viewed my pet")
- Review of what owner contact info a clinic may keep after access ends (D9 follow-up)

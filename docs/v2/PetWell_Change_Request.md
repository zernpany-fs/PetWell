# PetWell — Change Request CR-01: Consent-Based Access to Pet Records

| | |
|---|---|
| **Status** | Implemented — merged to `main` on 2026-11-20 |
| **Author** | Nopparuth Panyanithiwat |
| **Baseline** | v1 (tag `v1.0`) |
| **Related** | Decision log (D1–D54), user stories US-01–US-04, impact analysis, grant flowchart (all in `docs/v2/`) |

## 1. Problem

In v1, any clinic staff account can search every pet, read its full health history and the owner's phone and email, and add records to it. The owner has no say in who sees this data, and nothing records who looked at it.

## 2. Proposed change

A clinic sees a pet only while it has access, and access comes from one of two sources:

- **Appointment**: created when the clinic confirms an appointment for the first time; ends 30 days after the visit is completed, or when the appointment is cancelled or rejected (D1, D2, D4).
- **Owner share**: the owner gives a 6-digit code (valid 15 minutes, single use) for 7 / 30 / 90 days or unlimited (D3, D7).

The owner can see which clinics have access, change the duration of a share, and revoke a clinic (D12, D27). Without access, a clinic sees only the records it wrote (D6, D11). Every time a clinic opens a pet or its records, an audit log entry is written (D10).

## 3. Scope

| In scope | Out of scope (backlog) |
|---|---|
| Access check on all clinic pet, record and search endpoints | Pets without an owner account (D8, deferred by D21) |
| Share code, redeem, access list, revoke, extend | Owner view of the audit log (US-06) |
| Audit log and share-code lockout (D14) | Clinic requests access, owner approves |
| Owner and staff screens for the above | Live update of the owner's access list |

## 4. Impact

| Area | Impact |
|---|---|
| Clinic staff | Must confirm an appointment or get a share code before seeing a pet. Pets they only wrote records for show as "Own records only". |
| Owners | New **Clinic access** card on each pet: share, list, change, revoke. No change to booking or the passport. |
| Backend | 8 existing endpoints in 3 modules changed; 5 new endpoints; one shared `AccessService`. |
| Database | 4 new tables, added by one migration. No existing table or column is changed or removed. |
| Config | New required secret `SHARE_CODE_SECRET` (D26). |

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A clinic loses access in the middle of a visit | The owner can share a code on the spot; staff see a clear limited-access message, not an error (D53). |
| Guessing share codes | Codes stored as HMAC; lockout per account and per clinic (D14, D26, D40). |
| Status changed by two people at once leaves an open grant | Compare-and-set in one transaction; the loser gets `409` (D31). |
| Data seen without a trace | If the audit log write fails, no data is returned (D34). |

## 6. Verification

- 88 automated tests (Vitest, separate test database) and two API check scripts (27 and 35 cases), all passing before merge.
- Every new screen checked by hand in the browser against the acceptance criteria of US-03 and US-04.

## 7. Rollback

Deploy tag `v1.0`. The migration only adds tables, so v1 runs on the V2 database unchanged; the new tables are left unused. Rolling back reopens the v1 gaps in section 1.

## 8. Timeline

Planned: 7 working days (9–19 Nov 2026). Actual: rules, design, backend, tests and docs within the timebox; the remaining frontend took 1 of the 2 extension days allowed by D50 and was merged on 20 Nov 2026.

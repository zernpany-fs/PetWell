# PetWell — Staff Approval

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Date** | 2026-11-27 |
| **Author** | Nopparuth Panyanithiwat |
| **Related** | `v2/PetWell_Decision_Log.md` (D68–D71; numbering continues here, index of all decisions), `v2/PetWell_User_Stories_Access_Control.md` (US-01–US-04) |

## 1. Why

`POST /auth/register/clinic-staff` was public and needed only a `clinicId`, which `GET /clinics` lists. Anyone could sign up as staff of any clinic and log in at once with that clinic's access: full history and owner contact of every pet shared with it. That defeats the consent rules of V2 (D1–D54). The original SRS (4.2, 7.1) required approval before a staff account could be used, but it was never built.

## 2. User story

### US-09 — Clinic approves new staff

**As** clinic staff, **I want** to approve or reject people who sign up as staff of my clinic, **so that** only real staff can see the records owners share with us.

- **AC1** *Given* someone signs up as staff of a clinic, *then* the account is `PENDING`, gets no access, and the sign-up page says the clinic must approve it first. (D73)
- **AC2** *Given* my account is `PENDING`, *when* I log in with the right password, *then* I get `403` saying the account is awaiting approval and no token. A wrong password still gets the usual `401 Invalid email or password`. (D74)
- **AC3** *Given* I am approved staff of clinic A, *when* I open **Staff requests**, *then* I see only the pending requests for clinic A. (D72, D76)
- **AC4** *Given* I approve a request, *then* that person can log in and work as staff of clinic A. (D76)
- **AC5** *Given* I reject a request, *then* the account stays as `REJECTED`, cannot log in (`403`), and its email cannot be used to sign up again. (D74, D75)
- **AC6** *Given* the request belongs to another clinic or does not exist, *then* I get `404`; *given* it was already decided, *then* I get `409`; in both cases nothing changes. (D76)
- **AC7** *Given* I am an owner, *when* I call either endpoint, *then* I get `403`.

## 3. Decisions

| ID | Topic | Decision | Reason |
|---|---|---|---|
| D72 | Who approves new staff | Any `APPROVED` staff member of the same clinic. There is no `ADMIN` role. | Clinics know their own staff. An admin module (SRS 4.3) does not fit the timebox. |
| D73 | Staff status | New `User.staffStatus`: `PENDING` / `APPROVED` / `REJECTED` (null for owners), plus `staffDecidedById` and `staffDecidedAt`. Sign-up creates `PENDING`; the seed creates `APPROVED`. The migration approves only the **earliest** staff account of each clinic (the seeded one) and sets every other existing staff account to `PENDING`, so that a clinic reviews accounts made while sign-up was open. | One field drives login; the decider and date make approvals traceable. Approving every existing account would also approve anyone who used the open sign-up. Each clinic keeps one approved account, so it can approve the rest. |
| D74 | Login while pending or rejected | The password is checked first. Right password and `PENDING` → `403 Your clinic has not approved this account yet`; `REJECTED` → `403 This staff account was not approved`. No token is issued. | Blocking at login closes the gap in one place instead of in every endpoint. Checking the password first means the status is never shown to someone who does not know the password. |
| D75 | Rejected accounts | Kept as `REJECTED`; the email stays taken. | Same no-hard-delete approach as the rest of PetWell, and it keeps a trace of who asked. |
| D76 | Approve and reject API | `GET /clinics/me/staff-requests` lists pending requests of the caller's clinic (oldest first). `PATCH /clinics/me/staff-requests/:userId` with `{ "decision": "APPROVE" \| "REJECT" }`. Another clinic's or an unknown user → `404`; already decided → `409`. The update is a compare-and-set on `staffStatus = PENDING`, like D31. | `404` does not reveal other clinics' requests. Compare-and-set stops two staff deciding the same request at once. |

## 4. Changes

- **Database:** enum `StaffStatus`; `users.staff_status`, `staff_decided_by` (self-reference) and `staff_decided_at`. Migration `20261127154423_staff_approval` also sets existing staff accounts as D73 says. The seed marks each demo staff login `APPROVED`.
- **Backend:** sign-up sets `PENDING` (`UserService.createUser`); login refuses unapproved staff after the password check (`AuthService.login`, D74); `GET` / `PATCH /clinics/me/staff-requests` in `ClinicController` / `ClinicService` (D76).
- **Frontend:** the staff sign-up message says the clinic must approve the account; login shows a pending or rejected message instead of "invalid" (`lib/auth-errors.ts`); **Clinic Profile → Staff requests** lists pending sign-ups with **Approve** and **Reject** (Reject asks for confirmation in the row, as D52 does for revoke).
- **Scripts:** `new_staff()` in `scripts/v2_api_lib.py` now has the clinic's seeded staff approve each account it creates; new `scripts/v2_api_staff_check.py` checks the HTTP side.

## 5. Verification (2026-11-27)

- Vitest backend 141/141 (11 new in `src/clinic/staff-approval.int.spec.ts`, one or more per AC); frontend 58/58 (8 new).
- API scripts: access 27/27, share codes 35/35, staff approval 17/17.
- Each new test was checked by breaking the code on purpose, one change at a time: no pending check at login, sign-up created as approved, no compare-and-set, request list not limited to the clinic, Reject without confirmation, a wrong password shown as pending. Each made a test fail.
- By hand in the browser: sign up as staff of vet1's clinic → message to wait → login refused with the pending message → vet1 approves under Staff requests → the new account logs in; reject with confirmation removes the row.

## 6. Known limits

- An approved staff member cannot be removed from the clinic yet (backlog).
- No email tells the clinic about a new request or the person about the decision; staff see requests on Clinic Profile.
- Tokens issued before this change stay valid until they expire (24 hours, D60), so an account that used the open sign-up keeps working for at most one more day after the deploy.
- A request with no approved staff in its clinic can never be decided; the migration keeps one approved account per clinic so this does not happen with the demo data.

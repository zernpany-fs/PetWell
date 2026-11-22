# PetWell — Password Reset (Forgot Password)

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Date** | 2026-11-22 |
| **Author** | Nopparuth Panyanithiwat |
| **Related** | `SRS_PetWell` (Should-have: Forgot Password), wireframes v6 screen 04, `v2/PetWell_Decision_Log.md` (D1–D54; numbering continues here) |

## 1. Why

There is no way back into an account after a forgotten password. The SRS lists Forgot Password as a Should-have and the wireframes already have the screen; v1 left it out of scope. This change adds it for both roles.

## 2. User story

### US-07 — Reset a forgotten password

**As** a pet owner or clinic staff member, **I want** to reset my password through a link sent to my email, **so that** I can get back into my account without asking anyone.

- **AC1** *Given* I am on the login page, *when* I choose **Forgot password?** and enter my email, *then* I always see the same message ("If an account exists for that email, we have sent a reset link"), whether or not the email has an account. (D57)
- **AC2** *Given* an active account exists for that email, *when* I request a link, *then* an email with a single-use link valid for 30 minutes is sent, and any older unused link for that account stops working. (D56, D61)
- **AC3** *Given* I open a valid link, *when* I enter a new password that meets the registration rule (at least 6 letters or numbers) twice, *then* the password changes, the link can no longer be used, and I can log in with the new password only. (D56, D59)
- **AC4** *Given* a link is expired, already used, replaced by a newer one, or made up, *when* I submit a new password, *then* the request fails with one generic message ("This reset link is invalid or has expired") and nothing changes. (D59)
- **AC5** *(edge case)* *Given* 3 links were requested for my account within the last hour, *when* I request another, *then* no email is sent, and I still see the same message as AC1. (D58)
- **AC6** *(edge case)* *Given* the account is inactive, *when* a link is requested, *then* no email is sent, and the message is the same as AC1. (D55, D57)

## 3. Decisions

| ID | Topic | Decision | Reason |
|---|---|---|---|
| D55 | Scope | Forgot / reset by an emailed link, for `OWNER` and `CLINIC_STAFF`. Only active accounts get a link. Changing the password while logged in stays out of scope. | Both roles log in the same way, so they lose passwords the same way. An inactive account must not be reopened this way. |
| D56 | Reset token | 32 random bytes from `crypto.randomBytes`, sent in the link as base64url. Only its SHA-256 hash is stored (`PasswordResetToken.tokenHash`, unique). Valid **30 minutes**, **single use**. A new request ends the account's older unused tokens; a successful reset ends all of them. | 256 random bits cannot be guessed, so a plain hash is enough (unlike the 6-digit share code, which needed HMAC, D26). A leaked table gives no usable links. One live link at a time keeps old emails harmless. |
| D57 | Forgot-password response | `POST /auth/forgot-password` always returns `200` with the same message — for a known, unknown, inactive or rate-limited email. | Never reveal which emails have an account (same idea as D42). |
| D58 | Request limit | At most **3 links per account per rolling hour**, counted from stored tokens. Further requests send nothing and still return `200` (D57). | Stops someone flooding a user's inbox. Counting stored tokens needs no new table. |
| D59 | Reset rules | `POST /auth/reset-password` with `token` and `password`. The password follows the registration rule (at least 6, letters or numbers). Unknown, expired, used or replaced tokens all return `400 This reset link is invalid or has expired`. | One rule for every password. One message for every bad link, like D42. |
| D60 | Sessions after a reset | Access tokens already issued stay valid until they expire (`ACCESS_TOKEN_EXPIRES_IN`). | JWTs are stateless here; revoking them needs a server-side session list or token version, which is not worth it for this demo. Accepted risk, written down. |
| D61 | Sending email | `MailService` sends through **Resend** when `RESEND_API_KEY` is set (sender `MAIL_FROM`, default `PetWell <onboarding@resend.dev>`). Without a key, outside production it writes the reset link to the backend log so the flow can be tried locally; in production it logs only that email is not configured. The link is `FRONTEND_URL/reset-password?token=…`. | Works on any machine without an email account, never puts a live link in production logs, and needs only an API key to send for real. Without a verified domain, Resend only delivers to the Resend account's own address, so the live demo can show the flow but not email strangers. |
| D62 | Screens | **Forgot password?** link under the login button → `/forgot-password` (email, then the AC1 message). `/reset-password?token=…`: new password + confirm; on success go to login with a message. The token is checked only when the form is submitted. | Matches wireframe screen 04. Checking on submit needs no extra endpoint and gives the same answer. |

## 4. Changes

| Area | Change |
|---|---|
| Database | New table `password_reset_tokens` (`PasswordResetToken`: id, userId → users, tokenHash unique, expiresAt, usedAt, createdAt; index on userId + createdAt) |
| Backend | `POST /auth/forgot-password`, `POST /auth/reset-password` (both public); `PasswordResetService`; `MailModule` / `MailService`; env `RESEND_API_KEY`, `MAIL_FROM` (optional) |
| Frontend | Link on the login page; pages `/forgot-password` and `/reset-password`; Server Actions and Zod schemas |

## 5. Verification (2026-11-22)

- **Backend (Vitest, `petwell_test`)**: 14 new tests — 3 unit (token format, hash, link) and 11 integration covering AC1–AC6, a replaced link, an account made inactive after the request, and two resets with the same link at once (only one wins). Three deliberate bugs (no hourly limit, older links not ended, no compare-and-set) each made a test fail. Full backend suite 102/102.
- **Frontend (Vitest + Testing Library)**: 6 new component tests (email check, same message, password rule, confirm match, token sent, bad-link message). Two deliberate bugs (no confirm check, no redirect) each made a test fail. Full frontend suite 21/21.
- **By hand, in the browser**: login → Forgot password? → message → link from the backend log → mismatched confirm rejected → new password set → redirected to login → old password refused, new one accepted → same link again refused with "Get a new link" → reset page without a token explains what to do → logged-in users are sent to their dashboard → unknown email gets the same message → 4th request in an hour sends nothing.

## 6. Known limits

- The response time of `forgot-password` can differ slightly between known and unknown emails (a known one writes a token and sends email). The message is identical (D57); hiding the timing too would need a background queue.
- Existing sessions are not ended by a reset (D60).

## 7. Out of scope

- Change password while logged in
- Ending existing sessions after a reset (D60)
- Email verification at sign-up
- Vaccine reminder emails (SRS Should-have; can reuse `MailService` later)

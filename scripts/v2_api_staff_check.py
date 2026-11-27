#!/usr/bin/env python3
"""US-09 check: staff approval over HTTP (D72-D76).

    python3 scripts/v2_api_staff_check.py

Needs the backend running on http://localhost:8000 (or PETWELL_API) and psql.
The service rules are covered by Vitest (staff-approval.int.spec.ts); this
checks what only the HTTP layer does: guards, roles, validation, status codes.
"""
from v2_api_lib import (
    PASSWORD, RUN, api, check, clinic_of, finish, msg, new_owner, section,
    seeded_staff_of, sql,
)

C1, C2 = clinic_of("vet1@test.com"), clinic_of("vet2@test.com")
V1, V2 = seeded_staff_of(C1), seeded_staff_of(C2)
_, OWN = new_owner("staffcheck")


def sign_up(tag: str, clinic_id: str):
    email = f"v2{tag}{RUN}@test.com"
    s, d = api("POST", "/auth/register/clinic-staff", body={
        "firstName": "V2", "lastName": tag.capitalize(), "email": email,
        "password": PASSWORD, "clinicId": clinic_id,
    })
    return email, s, d, sql(f"select id from users where email='{email}'")


def log_in(email: str, password: str = PASSWORD):
    return api("POST", "/auth/login", body={"email": email, "password": password})


section("A. Sign-up and login (AC1, AC2)")
email, s, d, NEW = sign_up("pending", C1)
check("A1 sign-up -> 201 and says the clinic must approve (D73)",
      s == 201 and "approve" in msg(d).lower(), f"{s} {msg(d)}")
s, d = log_in(email)
check("A2 pending, right password -> 403, no token (D74)",
      s == 403 and "access_token" not in (d or {}), f"{s} {msg(d)}")
s, d = log_in(email, "wrongpass1")
check("A3 pending, wrong password -> 401 (D74)", s == 401, f"{s} {msg(d)}")

section("B. Requests list (AC3, AC7)")
s, d = api("GET", "/clinics/me/staff-requests", V1)
check("B1 vet1 sees the new request", s == 200 and NEW in [r["id"] for r in d], s)
s, d = api("GET", "/clinics/me/staff-requests", V2)
check("B2 vet2 (other clinic) does not see it", s == 200 and NEW not in [r["id"] for r in d], s)
s, _ = api("GET", "/clinics/me/staff-requests", OWN)
check("B3 owner -> 403 (AC7)", s == 403, s)
s, _ = api("GET", "/clinics/me/staff-requests")
# The app-wide auth guard answers a missing header with 400 (all endpoints).
check("B4 no token -> refused (400, same as every endpoint)", s == 400, s)

section("C. Decide (AC4-AC7)")
s, d = api("PATCH", f"/clinics/me/staff-requests/{NEW}", OWN, {"decision": "APPROVE"})
check("C1 owner -> 403 (AC7)", s == 403, s)
s, d = api("PATCH", f"/clinics/me/staff-requests/{NEW}", V1, {"decision": "MAYBE"})
check("C2 bad decision -> 400", s == 400, msg(d))
s, d = api("PATCH", "/clinics/me/staff-requests/not-a-uuid", V1, {"decision": "APPROVE"})
check("C3 bad id -> 400", s == 400, msg(d))
s, d = api("PATCH", f"/clinics/me/staff-requests/{NEW}", V2, {"decision": "APPROVE"})
check("C4 other clinic -> 404 (AC6)", s == 404, msg(d))
s, d = api("PATCH", f"/clinics/me/staff-requests/{NEW}", V1, {"decision": "APPROVE"})
check("C5 vet1 approves -> 200 (AC4)", s == 200, msg(d))
s, d = log_in(email)
check("C6 approved staff can log in (AC4)", s == 200 and d.get("access_token"), s)
s, d = api("PATCH", f"/clinics/me/staff-requests/{NEW}", V1, {"decision": "REJECT"})
check("C7 decide again -> 409 (AC6)", s == 409, msg(d))

email2, _, _, NEW2 = sign_up("rejected", C1)
s, d = api("PATCH", f"/clinics/me/staff-requests/{NEW2}", V1, {"decision": "REJECT"})
check("C8 vet1 rejects -> 200 (AC5)", s == 200, msg(d))
s, d = log_in(email2)
check("C9 rejected staff -> 403 (AC5, D74)", s == 403, f"{s} {msg(d)}")
_, s, d, _ = sign_up("rejected", C1)
check("C10 same email again -> 409 (D75)", s == 409, f"{s} {msg(d)}")

finish()

#!/usr/bin/env python3
"""V2 check: share codes, revoke, extend, lockout (US-03, US-04, D40-D45).

    python3 scripts/v2_api_share_check.py

Needs the backend running on http://localhost:8000 (or PETWELL_API) and psql.
Creates its own owners, pets, staff and appointment; see v2_api_lib.py.
Leaves one clinic locked for code entry for 15 minutes (section F).
"""
import threading
from datetime import timedelta

from v2_api_lib import (
    RUN, api, check, clinic_of, finish, login, msg, near, new_owner, new_pet,
    new_staff, now, reset_test_lockouts, section, sql,
)

reset_test_lockouts()
owner_email, OWN = new_owner("owner")
_, OTHER_OWNER = new_owner("other")
PET = new_pet(OWN, "Share")
OTHER_PET = new_pet(OTHER_OWNER, "Other")
V1, V2, V4 = (login(f"vet{i}@test.com") for i in (1, 2, 4))
C = {i: clinic_of(f"vet{i}@test.com") for i in (1, 2, 4)}
W = new_staff("wrong", C[1])  # fresh account for the wrong-code cases
print(f"run {RUN}: owner={owner_email} pet={PET}")

section("A. Generate code (US-03 AC1)")
s, d = api("POST", f"/pets/{PET}/share-codes", OWN, {"durationDays": 7})
CODE7 = d.get("code") if isinstance(d, dict) else None
check("A1 7-day code -> 201, 6 digits, code valid 15 min (D7)",
      s == 201 and CODE7 and len(CODE7) == 6 and CODE7.isdigit()
      and near(d["expiresAt"], now() + timedelta(minutes=15)), f"{s} {d}")
s, d = api("POST", f"/pets/{PET}/share-codes", OWN, {})
check("A2 durationDays missing -> 400 (D41)", s == 400, msg(d))
s, d = api("POST", f"/pets/{PET}/share-codes", OWN, {"durationDays": 14})
check("A3 durationDays 14 -> 400", s == 400, msg(d))
s, _ = api("POST", f"/pets/{OTHER_PET}/share-codes", OWN, {"durationDays": 7})
check("A4 someone else's pet -> 404", s == 404)
s, _ = api("POST", f"/pets/{PET}/share-codes", V1, {"durationDays": 7})
check("A5 clinic staff cannot generate -> 403", s == 403)
stored = sql(f"select code_hash from share_codes where pet_id='{PET}' limit 1")
check("A6 DB stores a 64-char HMAC, not the code (D26)",
      len(stored) == 64 and CODE7 not in stored)

section("B. Redeem (US-03 AC2-AC5)")
s, _ = api("GET", f"/pets/{PET}", V2)
check("B1 vet2 opens pet before redeem -> 404", s == 404)
s, d = api("POST", "/share-codes/redeem", V2, {"code": CODE7})
GRANT7 = d.get("grantId") if isinstance(d, dict) else None
check("B2 redeem -> 201, access for 7 days from redeem (D41)",
      s == 201 and GRANT7 and near(d["expiresAt"], now() + timedelta(days=7)), f"{s} {d}")
s, d = api("GET", f"/pets/{PET}", V2)
check("B3 vet2 opens pet -> 200 FULL", s == 200 and d.get("accessLevel") == "FULL")
s1, d1 = api("POST", "/share-codes/redeem", W, {"code": CODE7})
s2, d2 = api("POST", "/share-codes/redeem", W, {"code": "000000" if CODE7 != "000000" else "000001"})
check("B4 used code -> 400", s1 == 400, msg(d1))
check("B5 wrong code -> same message as used code (AC3, D42)",
      s2 == 400 and msg(d1) == msg(d2), msg(d2))
s, d = api("POST", f"/pets/{PET}/share-codes", OWN, {"durationDays": 30})
# Force-expire the code just created (expiry before its creation time).
sql(f"update share_codes set expires_at = created_at - interval '1 minute' "
    f"where pet_id='{PET}' and used_at is null")
s, d = api("POST", "/share-codes/redeem", W, {"code": d["code"]})
check("B6 expired code -> 400 same message", s == 400 and msg(d) == msg(d1), msg(d))
s, d = api("POST", "/share-codes/redeem", W, {"code": "12ab"})
check("B7 wrong format -> 400 validation, not counted (D40)", s == 400, msg(d))
s, d = api("POST", f"/pets/{PET}/share-codes", OWN, {"durationDays": None})
s, d = api("POST", "/share-codes/redeem", V2, {"code": d["code"]})
GRANT_UNL = d.get("grantId") if isinstance(d, dict) else None
check("B8 second code, same clinic -> new unlimited grant (D27)",
      s == 201 and GRANT_UNL and GRANT_UNL != GRANT7 and d["expiresAt"] is None, f"{s} {d}")

_, d = api("POST", f"/pets/{PET}/share-codes", OWN, {"durationDays": 30})
race, out = d["code"], {}
barrier = threading.Barrier(2)


def redeem_at_once(name, token):
    barrier.wait()
    out[name] = api("POST", "/share-codes/redeem", token, {"code": race})[0]


threads = [threading.Thread(target=redeem_at_once, args=a) for a in (("vet1", V1), ("vet4", V4))]
[t.start() for t in threads]
[t.join() for t in threads]
won = [n for n, code in out.items() if code == 201]
check("B9 two clinics redeem one code at once -> exactly one wins (D7, D25)",
      sorted(out.values()) == [201, 400], out)
# Undo the race winner's access so the sections below start clean.
api("DELETE", f"/pets/{PET}/clinics/{C[1] if won == ['vet1'] else C[4]}/access", OWN)

section("C. Owner access list (D43)")
s, d = api("GET", f"/pets/{PET}/access-grants", OWN)
check("C1 2 active OWNER_SHARE grants of vet2's clinic",
      s == 200 and len(d) == 2 and all(g["type"] == "OWNER_SHARE" and g["clinic"]["id"] == C[2]
                                      for g in d), f"{s} {d if s != 200 else len(d)}")
s, _ = api("GET", f"/pets/{PET}/access-grants", V2)
check("C2 clinic staff cannot list -> 403", s == 403)

section("D. Extend (US-04 AC4, D27, D44)")
s, d = api("PATCH", f"/access-grants/{GRANT7}", OWN, {"durationDays": 30})
check("D1 7-day grant -> 30 days from now",
      s == 200 and near(d["expiresAt"], now() + timedelta(days=30)), f"{s} {d}")
s, _ = api("PATCH", f"/access-grants/{GRANT7}", V2, {"durationDays": 90})
check("D2 clinic staff cannot extend -> 403", s == 403)
# A different weekday/hour each run, so earlier runs cannot fill the slot.
day, hour = 23 + int(RUN) % 5, 9 + int(RUN) // 5 % 8  # 23-27 Nov, 09-16 ICT
s, appt = api("POST", "/appointments", OWN, {
    "petId": PET, "clinicId": C[4], "appointmentDate": f"2026-11-{day}T{hour - 7:02d}:00:00.000Z"})
APPT = appt.get("id") if isinstance(appt, dict) else None
s2, _ = api("PATCH", f"/appointments/{APPT}/status", V4, {"status": "CONFIRMED"})
APPT_GRANT = sql(f"select id from pet_access_grants where appointment_id='{APPT}'") if APPT else ""
check("D3 setup: vet4 confirms appointment -> APPOINTMENT grant",
      s2 == 200 and APPT_GRANT, f"book={s} {msg(appt)} confirm={s2}")
s, d = api("PATCH", f"/access-grants/{APPT_GRANT}", OWN, {"durationDays": 30})
check("D4 extend appointment grant -> 409", s == 409, msg(d))
_, d = api("POST", f"/pets/{PET}/share-codes", OWN, {"durationDays": 7})
s, d = api("POST", "/share-codes/redeem", V4, {"code": d["code"]})
SHARE4 = d.get("grantId") if isinstance(d, dict) else None
check("D5 setup: vet4 also redeems a code (both kinds now)", s == 201)

section("E. Revoke (US-04 AC1-AC3, D12, D13)")
s, d = api("DELETE", f"/pets/{PET}/clinics/{C[4]}/access", OWN)
check("E1 revoke vet4 -> both grants end", s == 200 and d.get("endedGrants") == 2, f"{s} {d}")
s, _ = api("GET", f"/pets/{PET}", V4)
check("E2 vet4 opens pet -> 404 right away", s == 404)
status = sql(f"select status from appointments where id='{APPT}'")
check("E3 appointment itself stays CONFIRMED (D12)", status == "CONFIRMED", status)
reasons = sql(f"select string_agg(distinct end_reason::text, ',') from pet_access_grants "
              f"where pet_id='{PET}' and clinic_id='{C[4]}'")
check("E4 both grants end with REVOKED", reasons == "REVOKED", reasons)
s, d = api("DELETE", f"/pets/{PET}/clinics/{C[4]}/access", OWN)
check("E5 revoke again -> 404 (D44)", s == 404, msg(d))
s, d = api("PATCH", f"/access-grants/{SHARE4}", OWN, {"durationDays": 30})
check("E6 extend a revoked owner share -> 409 'already ended'", s == 409 and "ended" in msg(d), msg(d))
s1, _ = api("PATCH", f"/appointments/{APPT}/status", V4, {"status": "RESCHEDULED"})
s2, _ = api("PATCH", f"/appointments/{APPT}/status", V4, {"status": "CONFIRMED"})
s3, _ = api("GET", f"/pets/{PET}", V4)
check("E7 re-confirming the same appointment does not restore access (D13)",
      (s1, s2, s3) == (200, 200, 404), (s1, s2, s3))
s, d = api("GET", f"/pets/{PET}/access-grants", OWN)
check("E8 list shows only vet2's 2 grants", s == 200 and len(d) == 2)

section("F. Lockout (US-03 AC4, D14, D40)")
# A clinic with no failed attempts in the last 75 minutes.
LOCK_CLINIC = sql(f"""select c.id from clinics c where c.id <> '{C[1]}' and c.id not in (
  select clinic_id from share_code_attempts where not success and attempted_at >
  (select max(attempted_at) from share_code_attempts) - interval '75 minutes')
  order by c.name limit 1""")
S1, S2, S3 = (new_staff(f"lock{n}x", LOCK_CLINIC) for n in "abc")
for _ in range(5):
    api("POST", "/share-codes/redeem", S1, {"code": "999999"})
s, d = api("POST", "/share-codes/redeem", S1, {"code": "999999"})
check("F1 6th try after 5 wrong codes -> 429 for that account", s == 429, msg(d))
s, _ = api("POST", "/share-codes/redeem", S2, {"code": "999999"})
check("F2 another account of that clinic is not locked -> 400", s == 400)
for _ in range(4):
    api("POST", "/share-codes/redeem", S2, {"code": "999999"})
s, d = api("POST", "/share-codes/redeem", S3, {"code": "999999"})
check("F3 10 wrong codes in the clinic -> a fresh account gets 429", s == 429, msg(d))
s, _ = api("POST", "/share-codes/redeem", W, {"code": "999999"})
check("F4 other clinics are not affected -> 400", s == 400)
fails = sql(f"select count(*) from share_code_attempts a join users u on u.id = a.user_id "
            f"where u.email ~ '^v2lock[abc]x{RUN}@' and not a.success")
check("F5 attempts while locked are not recorded (exactly 10)", fails == "10", fails)

finish()

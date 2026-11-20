#!/usr/bin/env python3
"""V2 check: clinic access on pets, health records and search (US-01, D18-D39).

    python3 scripts/v2_api_access_check.py

Needs the backend running on http://localhost:8000 (or PETWELL_API) and psql.
Creates its own owners, pets and records; see v2_api_lib.py.

Story: vet1 gets FULL access by share code and writes a record; vet2 does the
same; the owner then revokes vet1, which leaves vet1 with AUTHORED_ONLY.
"""
from v2_api_lib import (
    RUN, api, check, clinic_of, finish, login, msg, new_owner, new_pet,
    reset_test_lockouts, section, share_access, sql,
)

reset_test_lockouts()
owner_email, OWN = new_owner("owner")
PET = new_pet(OWN, "Access")
V1, V2 = login("vet1@test.com"), login("vet2@test.com")
C1 = clinic_of("vet1@test.com")
MISSING = "00000000-0000-4000-8000-000000000000"
RECORD = {"recordType": "VACCINE", "recordDate": "2026-11-13"}
print(f"run {RUN}: owner={owner_email} pet={PET}")


def logs(clinic_id: str) -> list[str]:
    """grant_id of each audit-log row of this clinic for PET ('null' = null)."""
    rows = sql(f"select coalesce(grant_id::text, 'null') from pet_access_logs "
               f"where pet_id='{PET}' and clinic_id='{clinic_id}' order by viewed_at")
    return rows.split("\n") if rows else []


section("1. GET /pets/:petId (D20, D32-D34)")
s, d = api("GET", f"/pets/{PET}", V1)
check("1.1 no access -> 404, not logged (D32)", s == 404 and logs(C1) == [], msg(d))
G1 = share_access(OWN, PET, V1)
s, d = api("GET", f"/pets/{PET}", V1)
check("1.2 FULL -> 200 with owner contact and accessLevel (D9, D33)",
      s == 200 and d.get("accessLevel") == "FULL" and d["owner"]["email"] == owner_email)
check("1.3 FULL view logged with its grantId (D24)", logs(C1) == [G1], logs(C1))
s2, d2 = api("GET", f"/pets/{MISSING}", V1)
s3, d3 = api("GET", f"/pets/{PET}", V2)
check("1.4 missing pet and no-access pet give the same 404",
      s2 == s3 == 404 and msg(d2) == msg(d3), f"{msg(d2)} / {msg(d3)}")
s, d = api("GET", f"/pets/{PET}", OWN)
check("1.5 owner -> 200, owner shape (no accessLevel)", s == 200 and "accessLevel" not in d)

section("2. Health records (D5, D19, D35-D37)")
s, d = api("POST", f"/pets/{PET}/health-records", V2, {**RECORD, "description": "by vet2"})
check("2.1 vet2 without access writes -> 404 (D35)", s == 404, msg(d))
s, d = api("POST", f"/pets/{PET}/health-records", V1, {**RECORD, "description": "by vet1"})
R1 = d.get("id") if isinstance(d, dict) else None
check("2.2 vet1 with FULL writes -> 201", s == 201 and R1, msg(d))
share_access(OWN, PET, V2)
s, d = api("POST", f"/pets/{PET}/health-records", V2, {**RECORD, "description": "by vet2"})
R2 = d.get("id") if isinstance(d, dict) else None
check("2.3 vet2 after share code writes -> 201", s == 201 and R2, msg(d))
s, d = api("GET", f"/pets/{PET}/health-records", V1)
check("2.4 FULL sees records of other clinics too (D5)",
      s == 200 and {r["id"] for r in d} == {R1, R2}, f"{s} {len(d) if isinstance(d, list) else d}")
s, d = api("GET", f"/health-records/{R2}", V1)
check("2.5 FULL reads another clinic's record by id -> 200", s == 200)

s, d = api("DELETE", f"/pets/{PET}/clinics/{C1}/access", OWN)
check("2.6 setup: owner revokes vet1 (now AUTHORED_ONLY)", s == 200, d)
s, d = api("GET", f"/pets/{PET}", V1)
check("2.7 AUTHORED_ONLY -> id/name/species only (D20)",
      s == 200 and set(d) == {"accessLevel", "id", "name", "species"}, d)
check("2.8 AUTHORED_ONLY view logged with grantId null (D24)", logs(C1)[-1] == "null", logs(C1))
s, d = api("GET", f"/pets/{PET}/health-records", V1)
check("2.9 AUTHORED_ONLY list shows only own records (D11)",
      s == 200 and [r["id"] for r in d] == [R1], f"{s} {d if s != 200 else len(d)}")
s, d = api("GET", f"/health-records/{R2}", V1)
check("2.10 another clinic's record by id -> 404 (the v1 hole)", s == 404, msg(d))
s, d = api("GET", f"/health-records/{R1}", V1)
check("2.11 own record by id -> 200 (D6)", s == 200)
s, d = api("POST", f"/pets/{PET}/health-records", V1, {**RECORD, "description": "x"})
check("2.12 AUTHORED_ONLY writes -> 403 (D35)", s == 403, msg(d))
s, d = api("PATCH", f"/health-records/{R1}", V1, {"description": "by vet1, edited"})
check("2.13 own record still editable after access ended (D19)", s == 200, msg(d))
s, d = api("PATCH", f"/health-records/{R1}", V2, {"description": "x"})
check("2.14 other clinic cannot edit it -> 403", s == 403, msg(d))
s, d = api("GET", f"/pets/{PET}/health-records", OWN)
check("2.15 owner sees all records", s == 200 and len(d) == 2)

section("3. Search (D18, D38, D39)")


def search(token, term):
    s, d = api("GET", f"/pets/search?q={term}", token)
    return [(p["id"], p["accessLevel"], "owner" in p) for p in d] if s == 200 else (s, d)


check("3.1 AUTHORED_ONLY found by pet name, no owner",
      search(V1, f"Access{RUN}") == [(PET, "AUTHORED_ONLY", False)], search(V1, f"Access{RUN}"))
check("3.2 AUTHORED_ONLY NOT found by owner email (D38)",
      search(V1, owner_email) == [], search(V1, owner_email))
check("3.3 FULL found by owner email, with owner",
      search(V2, owner_email) == [(PET, "FULL", True)], search(V2, owner_email))
before = sql("select count(*) from pet_access_logs")
search(V2, owner_email)
check("3.4 search is not logged (D39)", sql("select count(*) from pet_access_logs") == before)

section("4. Archived records (D30, D37)")
s, _ = api("DELETE", f"/health-records/{R1}", V1)
check("4.1 vet1 archives its record -> 200", s == 200)
s1, _ = api("GET", f"/health-records/{R1}", V1)
s2, _ = api("GET", f"/health-records/{R1}", OWN)
s3, _ = api("PATCH", f"/health-records/{R1}", V1, {"description": "x"})
check("4.2 archived record: 404 for clinic, owner, and edit (D37)",
      (s1, s2, s3) == (404, 404, 404), (s1, s2, s3))
s, _ = api("GET", f"/pets/{PET}", V1)
check("4.3 no active authored records left -> vet1 gets 404 (D30)", s == 404)

finish()

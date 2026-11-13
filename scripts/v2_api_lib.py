"""Shared helpers for the V2 API check scripts (scripts/v2_api_*_check.py).

These scripts call a RUNNING local backend and read the local database with
psql. They create their own test owners, pets and staff on every run, so they
do not depend on existing data. Seeded staff vet1-vet6@test.com
(password pass123) must exist.

Not a replacement for Vitest: they are scripted versions of the manual
Postman checks, used until the AC-based tests are written (day 17).
"""
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(ROOT, "backend", ".env")
BASE = os.environ.get("PETWELL_API", "http://localhost:8000")
PASSWORD = "pass123"

# Unique suffix per run, so test emails and pet names never clash.
RUN = str(int(time.time()))[-6:]

_results: list[bool] = []


def _database_url() -> str:
    with open(ENV_FILE) as f:
        for line in f:
            if line.startswith("DATABASE_URL"):
                # psql does not accept Prisma's ?schema=... option
                return line.split("=", 1)[1].strip().strip('"').split("?")[0]
    raise SystemExit("DATABASE_URL not found in backend/.env")


DB_URL = _database_url()


def sql(query: str) -> str:
    """Run one SQL statement with psql and return its trimmed output."""
    return subprocess.run(
        ["psql", DB_URL, "-tAc", query], capture_output=True, text=True, check=True
    ).stdout.strip()


def api(method: str, path: str, token: str | None = None, body=None):
    """Call the API. Returns (status_code, parsed_json_or_None)."""
    req = urllib.request.Request(BASE + path, method=method)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data) as res:
            raw = res.read().decode()
            return res.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as err:
        raw = err.read().decode()
        return err.code, (json.loads(raw) if raw else None)
    except urllib.error.URLError:
        raise SystemExit(f"Backend not reachable at {BASE}. Start it first.")


def msg(body) -> str:
    """The `message` of an error body, for printing."""
    return body.get("message") if isinstance(body, dict) else str(body)


def check(label: str, ok, detail="") -> None:
    _results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + label + (f"   [{detail}]" if detail else ""))


def section(title: str) -> None:
    print(f"\n--- {title}")


def finish() -> None:
    """Print the summary and exit 1 if anything failed."""
    passed = sum(_results)
    print(f"\n{passed}/{len(_results)} passed")
    raise SystemExit(0 if passed == len(_results) else 1)


def login(email: str) -> str:
    status, body = api("POST", "/auth/login", body={"email": email, "password": PASSWORD})
    if status != 200:
        raise SystemExit(f"Login failed for {email}: {status} {msg(body)}")
    return body["access_token"]


def new_owner(tag: str) -> tuple[str, str]:
    """Register a fresh owner. Returns (email, token)."""
    email = f"v2{tag}{RUN}@test.com"
    api("POST", "/auth/register", body={
        "firstName": "V2", "lastName": tag.capitalize(), "phone": f"08{RUN}00",
        "email": email, "password": PASSWORD,
    })
    return email, login(email)


def new_staff(tag: str, clinic_id: str) -> str:
    """Register a fresh clinic staff account. Returns its token."""
    email = f"v2{tag}{RUN}@test.com"
    api("POST", "/auth/register/clinic-staff", body={
        "firstName": "V2", "lastName": tag.capitalize(), "email": email,
        "password": PASSWORD, "clinicId": clinic_id,
    })
    return login(email)


def new_pet(owner_token: str, name: str, species: str = "Cat") -> str:
    status, body = api("POST", "/pets", owner_token, {"name": f"{name}{RUN}", "species": species})
    if status != 201:
        raise SystemExit(f"Could not create pet: {status} {msg(body)}")
    return body["id"]


def clinic_of(email: str) -> str:
    return sql(f"select clinic_id from users where email='{email}'")


def share_access(owner_token: str, pet_id: str, staff_token: str, days=7) -> str:
    """Owner creates a code and the clinic redeems it. Returns the grant id."""
    _, code = api("POST", f"/pets/{pet_id}/share-codes", owner_token, {"durationDays": days})
    status, body = api("POST", "/share-codes/redeem", staff_token, {"code": code["code"]})
    if status != 201:
        raise SystemExit(f"Could not redeem share code: {status} {msg(body)}")
    return body["grantId"]


def reset_test_lockouts() -> None:
    """Delete share-code attempts made by test accounts (seeded vets and
    accounts created by these scripts), so earlier runs cannot lock them."""
    sql("""delete from share_code_attempts where user_id in (select id from users
      where email ~ '^(vet[1-6]|v2[a-z]+[0-9]+)@test\\.com$')""")


def near(iso: str | None, expected: datetime | None, tolerance_s: int = 120) -> bool:
    """True if an ISO time from the API is within `tolerance_s` of `expected`."""
    if iso is None or expected is None:
        return iso is None and expected is None
    actual = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return abs((actual - expected).total_seconds()) < tolerance_s


def now() -> datetime:
    return datetime.now(timezone.utc)

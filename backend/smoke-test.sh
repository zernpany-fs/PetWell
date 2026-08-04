#!/usr/bin/env bash
# PetWell full end-to-end smoke test (Phases 1-4).
# Assumes the API is running on :8000 and owner@test.com + vet@test.com exist.
# Run from the backend folder:  bash smoke-test.sh

BASE="http://localhost:8000"

# Extract a "key":"value" string field from a JSON blob (first match, no jq needed).
extract() { grep -o "\"$1\":\"[^\"]*\"" | head -1 | sed "s/.*:\"//;s/\"$//"; }

echo "==> 1. Owner login"
OWNER_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"owner@test.com","password":"pass123"}' | extract access_token)
[ -z "$OWNER_TOKEN" ] && { echo "   ERROR: owner login failed"; exit 1; }
echo "   ok"

echo "==> 2. Create pet (Momo) as owner"
PET_ID=$(curl -s -X POST "$BASE/pets" -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Momo","species":"Dog","breed":"Shiba","latestWeight":9.5}' | extract id)
[ -z "$PET_ID" ] && { echo "   ERROR: pet create failed"; exit 1; }
echo "   pet id: $PET_ID"

echo "==> 3. Vet login (grab token + clinic id)"
VET_RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"vet@test.com","password":"pass123"}')
STAFF_TOKEN=$(echo "$VET_RES" | extract access_token)
VET_CLINIC_ID=$(echo "$VET_RES" | extract clinicId)
[ -z "$STAFF_TOKEN" ] && { echo "   ERROR: vet login failed"; exit 1; }
echo "   vet clinic id: $VET_CLINIC_ID"

echo "==> 4. Create health record on Momo (as vet)"
curl -s -X POST "$BASE/pets/$PET_ID/health-records" \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"recordType":"VACCINE","description":"Rabies vaccine","recordDate":"2026-07-23","nextDueDate":"2027-07-23"}'
echo

echo "==> 5. Read Momo's portable history (as owner)"
curl -s "$BASE/pets/$PET_ID/health-records" -H "Authorization: Bearer $OWNER_TOKEN"
echo

echo "==> 6. List clinics (as owner)"
curl -s "$BASE/clinics" -H "Authorization: Bearer $OWNER_TOKEN"
echo

echo "==> 7. Book appointment at the vet's clinic (as owner)"
# Computed, not hardcoded: appointmentDate must be in the future, so a fixed
# date silently starts failing with a 400 once it passes. Uses a random hour
# within business hours (09:00-17:00 ICT = 02:00-10:00 UTC) so repeated runs
# don't fill the 2-per-hour slot and start returning 409.
APPT_DATE=$(node -e "
  const d = new Date(Date.now() + 7 * 864e5);
  d.setUTCHours(2 + Math.floor(Math.random() * 9), 0, 0, 0);
  console.log(d.toISOString());
")
echo "   requesting $APPT_DATE"
APPT_ID=$(curl -s -X POST "$BASE/appointments" -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"petId\":\"$PET_ID\",\"clinicId\":\"$VET_CLINIC_ID\",\"appointmentDate\":\"$APPT_DATE\",\"notes\":\"Annual checkup\"}" | extract id)
[ -z "$APPT_ID" ] && { echo "   ERROR: appointment create failed"; exit 1; }
echo "   appointment id: $APPT_ID"

echo "==> 8. Vet lists their clinic's appointments"
curl -s "$BASE/clinics/$VET_CLINIC_ID/appointments" -H "Authorization: Bearer $STAFF_TOKEN"
echo

echo "==> 9. Vet confirms the appointment (PENDING -> CONFIRMED)"
curl -s -X PATCH "$BASE/appointments/$APPT_ID/status" \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED","reason":"Confirmed by phone"}'
echo

echo "==> 10. Owner reads the appointment status history (audit log)"
curl -s "$BASE/appointments/$APPT_ID/logs" -H "Authorization: Bearer $OWNER_TOKEN"
echo
echo "==> done"

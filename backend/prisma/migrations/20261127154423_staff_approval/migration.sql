-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staff_decided_at" TIMESTAMPTZ,
ADD COLUMN     "staff_decided_by" UUID,
ADD COLUMN     "staff_status" "StaffStatus";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staff_decided_by_fkey" FOREIGN KEY ("staff_decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- D73: existing staff accounts. The earliest account of each clinic (the
-- seeded one) is approved; every other existing staff account waits for that
-- clinic to approve it, because it may have used the open sign-up.
UPDATE "users" SET "staff_status" = 'APPROVED'
WHERE "id" IN (
  SELECT DISTINCT ON ("clinic_id") "id"
  FROM "users"
  WHERE "role" = 'CLINIC_STAFF' AND "clinic_id" IS NOT NULL
  ORDER BY "clinic_id", "created_at", "id"
);

UPDATE "users" SET "staff_status" = 'PENDING'
WHERE "role" = 'CLINIC_STAFF' AND "staff_status" IS NULL;

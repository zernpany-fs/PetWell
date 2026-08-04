-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address_line" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "postal_code" VARCHAR(5),
ADD COLUMN     "province" TEXT,
ADD COLUMN     "subdistrict" TEXT;

-- CreateIndex
CREATE INDEX "appointments_clinic_id_appointment_date_idx" ON "appointments"("clinic_id", "appointment_date");

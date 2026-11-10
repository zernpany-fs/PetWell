-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('APPOINTMENT', 'OWNER_SHARE');

-- CreateEnum
CREATE TYPE "GrantEndReason" AS ENUM ('REVOKED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "pet_access_grants" (
    "id" UUID NOT NULL,
    "type" "AccessType" NOT NULL,
    "pet_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "appointment_id" UUID,
    "share_code_id" UUID,
    "expires_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "end_reason" "GrantEndReason",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_codes" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "duration_days" INTEGER,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_access_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "grant_id" UUID,
    "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_code_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "success" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_code_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pet_access_grants_appointment_id_key" ON "pet_access_grants"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "pet_access_grants_share_code_id_key" ON "pet_access_grants"("share_code_id");

-- CreateIndex
CREATE INDEX "pet_access_grants_pet_id_clinic_id_idx" ON "pet_access_grants"("pet_id", "clinic_id");

-- CreateIndex
CREATE INDEX "share_codes_code_hash_idx" ON "share_codes"("code_hash");

-- CreateIndex
CREATE INDEX "share_code_attempts_user_id_attempted_at_idx" ON "share_code_attempts"("user_id", "attempted_at");

-- CreateIndex
CREATE INDEX "share_code_attempts_clinic_id_attempted_at_idx" ON "share_code_attempts"("clinic_id", "attempted_at");

-- AddForeignKey
ALTER TABLE "pet_access_grants" ADD CONSTRAINT "pet_access_grants_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_access_grants" ADD CONSTRAINT "pet_access_grants_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_access_grants" ADD CONSTRAINT "pet_access_grants_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_access_grants" ADD CONSTRAINT "pet_access_grants_share_code_id_fkey" FOREIGN KEY ("share_code_id") REFERENCES "share_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_codes" ADD CONSTRAINT "share_codes_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_access_logs" ADD CONSTRAINT "pet_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_access_logs" ADD CONSTRAINT "pet_access_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_access_logs" ADD CONSTRAINT "pet_access_logs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_access_logs" ADD CONSTRAINT "pet_access_logs_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "pet_access_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_code_attempts" ADD CONSTRAINT "share_code_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_code_attempts" ADD CONSTRAINT "share_code_attempts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

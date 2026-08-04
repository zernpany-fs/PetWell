-- AlterTable
ALTER TABLE "health_records" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];

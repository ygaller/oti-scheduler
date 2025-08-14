-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'CUTI_BERSAMA');

-- AlterTable
ALTER TABLE "NationalHoliday" ADD COLUMN "type" "HolidayType" NOT NULL DEFAULT 'NATIONAL';

-- Backfill: tandai entri cuti bersama yang sudah ada berdasarkan nama
UPDATE "NationalHoliday" SET "type" = 'CUTI_BERSAMA' WHERE "name" ILIKE '%cuti bersama%';

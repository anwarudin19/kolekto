ALTER TABLE "Team"
ADD COLUMN "defaultInvoiceDueDay" INTEGER;

ALTER TABLE "Role"
ADD COLUMN "invoiceDueDay" INTEGER;

CREATE TABLE "NationalHoliday" (
    "id" UUID NOT NULL,
    "holidayDate" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NationalHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NationalHoliday_holidayDate_key" ON "NationalHoliday"("holidayDate");

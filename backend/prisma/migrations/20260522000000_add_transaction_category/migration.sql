-- CreateTable
CREATE TABLE "TransactionCategory" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionCategory_teamId_idx" ON "TransactionCategory"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_teamId_name_key" ON "TransactionCategory"("teamId", "name");

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "categoryId" UUID;

-- CreateIndex
CREATE INDEX "Transaction_teamId_categoryId_idx" ON "Transaction"("teamId", "categoryId");

-- AddForeignKey
ALTER TABLE "TransactionCategory" ADD CONSTRAINT "TransactionCategory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

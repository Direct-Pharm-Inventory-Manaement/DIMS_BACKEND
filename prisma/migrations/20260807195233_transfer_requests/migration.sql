/*
  Warnings:

  - A unique constraint covering the columns `[batchNo,branch]` on the table `Medicine` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Medicine_batchNo_key";

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "destinationBranch" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "TransferRequest_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequest_code_key" ON "TransferRequest"("code");

-- CreateIndex
CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");

-- CreateIndex
CREATE INDEX "TransferRequest_sourceBranch_idx" ON "TransferRequest"("sourceBranch");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_batchNo_branch_key" ON "Medicine"("batchNo", "branch");

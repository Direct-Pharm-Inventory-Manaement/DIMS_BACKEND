-- CreateTable
CREATE TABLE "ReportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportLog_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TransferRequest" (
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
    "priority" TEXT NOT NULL DEFAULT 'standard',
    "requestedDeliveryDate" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "requestedById" TEXT NOT NULL,
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "reviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "TransferRequest_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TransferRequest" ("batchNo", "code", "completedAt", "createdAt", "destinationBranch", "id", "medicineId", "medicineName", "notes", "packaging", "priority", "quantity", "requestedById", "requestedDeliveryDate", "reviewNote", "sourceBranch", "status", "updatedAt") SELECT "batchNo", "code", "completedAt", "createdAt", "destinationBranch", "id", "medicineId", "medicineName", "notes", "packaging", "priority", "quantity", "requestedById", "requestedDeliveryDate", "reviewNote", "sourceBranch", "status", "updatedAt" FROM "TransferRequest";
DROP TABLE "TransferRequest";
ALTER TABLE "new_TransferRequest" RENAME TO "TransferRequest";
CREATE UNIQUE INDEX "TransferRequest_code_key" ON "TransferRequest"("code");
CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");
CREATE INDEX "TransferRequest_sourceBranch_idx" ON "TransferRequest"("sourceBranch");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ReportLog_createdAt_idx" ON "ReportLog"("createdAt");

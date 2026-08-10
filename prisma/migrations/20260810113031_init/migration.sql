-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT NOT NULL DEFAULT '',
    "strength" TEXT NOT NULL DEFAULT '',
    "form" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL DEFAULT 'Unspecified',
    "supplier" TEXT NOT NULL DEFAULT '',
    "stockCategory" TEXT NOT NULL DEFAULT 'essential',
    "quantity" INTEGER NOT NULL,
    "unitOfMeasurement" TEXT NOT NULL DEFAULT 'Units',
    "unitPriceGhs" DOUBLE PRECISION NOT NULL,
    "sellingPriceGhs" DOUBLE PRECISION,
    "storageLocation" TEXT NOT NULL DEFAULT '',
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 50,
    "reorderLevel" INTEGER,
    "manufacturingDate" TIMESTAMP(3),
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionRecord" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ConsumptionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpiryAction" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpiryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
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
    "requestedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "requestedById" TEXT NOT NULL,
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "systemName" TEXT NOT NULL DEFAULT 'Direct Inventory Manager',
    "organizationName" TEXT NOT NULL DEFAULT 'Direct Pharmacy',
    "defaultBranch" TEXT NOT NULL DEFAULT 'Adenta Main',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "criticalAlertDays" INTEGER NOT NULL DEFAULT 30,
    "highRiskDays" INTEGER NOT NULL DEFAULT 60,
    "monitoringDays" INTEGER NOT NULL DEFAULT 90,
    "minimumStockTrigger" INTEGER NOT NULL DEFAULT 20,
    "predictionWindowDays" INTEGER NOT NULL DEFAULT 7,
    "twoFactorRequired" BOOLEAN NOT NULL DEFAULT false,
    "autoLogoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'satellite',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "licenseNumber" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportLog" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Medicine_category_idx" ON "Medicine"("category");

-- CreateIndex
CREATE INDEX "Medicine_branch_idx" ON "Medicine"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_batchNo_branch_key" ON "Medicine"("batchNo", "branch");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_medicineId_idx" ON "ConsumptionRecord"("medicineId");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_date_idx" ON "ConsumptionRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumptionRecord_medicineId_date_key" ON "ConsumptionRecord"("medicineId", "date");

-- CreateIndex
CREATE INDEX "ExpiryAction_medicineId_idx" ON "ExpiryAction"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequest_code_key" ON "TransferRequest"("code");

-- CreateIndex
CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");

-- CreateIndex
CREATE INDEX "TransferRequest_sourceBranch_idx" ON "TransferRequest"("sourceBranch");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE INDEX "ReportLog_createdAt_idx" ON "ReportLog"("createdAt");

-- CreateIndex
CREATE INDEX "PasswordOtp_userId_idx" ON "PasswordOtp"("userId");

-- AddForeignKey
ALTER TABLE "ConsumptionRecord" ADD CONSTRAINT "ConsumptionRecord_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpiryAction" ADD CONSTRAINT "ExpiryAction_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportLog" ADD CONSTRAINT "ReportLog_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordOtp" ADD CONSTRAINT "PasswordOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

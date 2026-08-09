-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'satellite',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "licenseNumber" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

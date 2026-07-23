-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Medicine" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "unitPriceGhs" REAL NOT NULL,
    "sellingPriceGhs" REAL,
    "storageLocation" TEXT NOT NULL DEFAULT '',
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 50,
    "reorderLevel" INTEGER,
    "manufacturingDate" DATETIME,
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "expiryDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Medicine" ("batchNo", "branch", "category", "createdAt", "expiryDate", "form", "id", "lowStockThreshold", "manufacturer", "name", "packaging", "quantity", "stockCategory", "strength", "unitPriceGhs", "updatedAt") SELECT "batchNo", "branch", "category", "createdAt", "expiryDate", "form", "id", "lowStockThreshold", "manufacturer", "name", "packaging", "quantity", "stockCategory", "strength", "unitPriceGhs", "updatedAt" FROM "Medicine";
DROP TABLE "Medicine";
ALTER TABLE "new_Medicine" RENAME TO "Medicine";
CREATE UNIQUE INDEX "Medicine_batchNo_key" ON "Medicine"("batchNo");
CREATE INDEX "Medicine_category_idx" ON "Medicine"("category");
CREATE INDEX "Medicine_branch_idx" ON "Medicine"("branch");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

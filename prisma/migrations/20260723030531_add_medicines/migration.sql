-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "strength" TEXT NOT NULL DEFAULT '',
    "form" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceGhs" REAL NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 50,
    "expiryDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_batchNo_key" ON "Medicine"("batchNo");

-- CreateIndex
CREATE INDEX "Medicine_category_idx" ON "Medicine"("category");

-- CreateIndex
CREATE INDEX "Medicine_branch_idx" ON "Medicine"("branch");

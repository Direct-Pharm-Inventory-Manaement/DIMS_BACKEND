-- CreateTable
CREATE TABLE "ConsumptionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ConsumptionRecord_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ConsumptionRecord_medicineId_idx" ON "ConsumptionRecord"("medicineId");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_date_idx" ON "ConsumptionRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumptionRecord_medicineId_date_key" ON "ConsumptionRecord"("medicineId", "date");

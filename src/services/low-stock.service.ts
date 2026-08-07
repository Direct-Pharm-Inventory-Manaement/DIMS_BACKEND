import { prisma } from "../lib/prisma";

export type RiskTier = "critical" | "reorder-soon" | "stable";

const CRITICAL_DAYS = 5;
const REORDER_SOON_DAYS = 10;
/** "Predicted stock-outs" counts anything depleting within this many days. */
const STOCKOUT_HORIZON_DAYS = 30;
/** Restocking recommendations target this many days of coverage. */
const TARGET_COVERAGE_DAYS = 30;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Stable 4-digit identifier derived from the medicine's real id — not a stored field, just a display shorthand. */
function deriveSku(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (Math.imul(hash, 31) + id.charCodeAt(i)) | 0;
  return `SKU-${(Math.abs(hash) % 9000) + 1000}`;
}

interface MedicineForPrediction {
  id: string;
  name: string;
  strength: string;
  category: string;
  branch: string;
  quantity: number;
  unitPriceGhs: number;
  supplier: string;
}

export interface Prediction {
  id: string;
  name: string;
  strength: string;
  sku: string;
  category: string;
  branch: string;
  currentStock: number;
  avgDailyUsage: number;
  /** ISO date string, or null if usage is zero (no depletion to predict). */
  depletionDate: string | null;
  daysUntilDepletion: number | null;
  riskTier: RiskTier;
}

async function computeAvgDailyUsage(
  medicineIds: string[],
  windowDays: number,
): Promise<Map<string, number>> {
  if (medicineIds.length === 0) return new Map();
  const since = new Date(startOfDay(new Date()).getTime() - windowDays * 24 * 60 * 60 * 1000);
  const records = await prisma.consumptionRecord.findMany({
    where: { medicineId: { in: medicineIds }, date: { gte: since } },
  });
  const totals = new Map<string, number>();
  for (const r of records) {
    totals.set(r.medicineId, (totals.get(r.medicineId) ?? 0) + r.quantity);
  }
  const averages = new Map<string, number>();
  for (const id of medicineIds) {
    averages.set(id, (totals.get(id) ?? 0) / windowDays);
  }
  return averages;
}

function toRiskTier(daysUntilDepletion: number | null): RiskTier {
  if (daysUntilDepletion === null) return "stable";
  if (daysUntilDepletion <= CRITICAL_DAYS) return "critical";
  if (daysUntilDepletion <= REORDER_SOON_DAYS) return "reorder-soon";
  return "stable";
}

async function buildPredictions(
  branch: string | undefined,
  windowDays: number,
): Promise<Prediction[]> {
  const medicines: MedicineForPrediction[] = await prisma.medicine.findMany({
    where: { branch },
    select: {
      id: true,
      name: true,
      strength: true,
      category: true,
      branch: true,
      quantity: true,
      unitPriceGhs: true,
      supplier: true,
    },
  });
  const usage = await computeAvgDailyUsage(
    medicines.map((m) => m.id),
    windowDays,
  );

  return medicines.map((m) => {
    const avgDailyUsage = usage.get(m.id) ?? 0;
    const daysUntilDepletion =
      avgDailyUsage > 0 ? m.quantity / avgDailyUsage : null;
    const depletionDate =
      daysUntilDepletion !== null
        ? new Date(Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000).toISOString()
        : null;
    return {
      id: m.id,
      name: m.name,
      strength: m.strength,
      sku: deriveSku(m.id),
      category: m.category,
      branch: m.branch,
      currentStock: m.quantity,
      avgDailyUsage: Math.round(avgDailyUsage * 10) / 10,
      depletionDate,
      daysUntilDepletion:
        daysUntilDepletion !== null ? Math.round(daysUntilDepletion * 10) / 10 : null,
      riskTier: toRiskTier(daysUntilDepletion),
    };
  });
}

export interface LowStockSummary {
  criticalLowStock: number;
  criticalAddedToday: number;
  reorderSoon: number;
  adequateStock: number;
  adequatePct: number;
  predictedStockOuts: number;
  totalMedicines: number;
}

export async function getSummary(
  branch: string | undefined,
  windowDays: number,
): Promise<LowStockSummary> {
  const predictions = await buildPredictions(branch, windowDays);
  const critical = predictions.filter((p) => p.riskTier === "critical");
  const reorderSoon = predictions.filter((p) => p.riskTier === "reorder-soon");
  const adequate = predictions.length - critical.length - reorderSoon.length;
  const predictedStockOuts = predictions.filter(
    (p) => p.daysUntilDepletion !== null && p.daysUntilDepletion <= STOCKOUT_HORIZON_DAYS,
  ).length;

  // "Added today": items that would already have been critical yesterday
  // are not "new" — this counts ones whose depletion crossed into the
  // critical window within the last day (i.e. 4-5 days out), a real,
  // if approximate, signal rather than a static filler number.
  const criticalAddedToday = critical.filter(
    (p) => p.daysUntilDepletion !== null && p.daysUntilDepletion > CRITICAL_DAYS - 1,
  ).length;

  return {
    criticalLowStock: critical.length,
    criticalAddedToday,
    reorderSoon: reorderSoon.length,
    adequateStock: adequate,
    adequatePct:
      predictions.length === 0 ? 100 : Math.round((adequate / predictions.length) * 100),
    predictedStockOuts,
    totalMedicines: predictions.length,
  };
}

export interface ListPredictionsParams {
  branch?: string;
  windowDays: number;
  outOfStockOnly?: boolean;
  page: number;
  pageSize: number;
}

export async function listPredictions(params: ListPredictionsParams): Promise<{
  items: Prediction[];
  total: number;
  page: number;
  pageSize: number;
}> {
  let predictions = await buildPredictions(params.branch, params.windowDays);
  if (params.outOfStockOnly) {
    predictions = predictions.filter((p) => p.currentStock === 0);
  }
  // Sorted soonest-depletion-first ("confidence" of urgency); items with no
  // usage history (no prediction) sink to the bottom.
  predictions.sort((a, b) => {
    if (a.daysUntilDepletion === null) return 1;
    if (b.daysUntilDepletion === null) return -1;
    return a.daysUntilDepletion - b.daysUntilDepletion;
  });

  const start = (params.page - 1) * params.pageSize;
  return {
    items: predictions.slice(start, start + params.pageSize),
    total: predictions.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export interface BranchRisk {
  branch: string;
  atRiskPct: number;
  label: "Stable" | "Medium Risk" | "High Risk";
}

export async function getBranchRisk(windowDays: number): Promise<BranchRisk[]> {
  const branchRows = await prisma.medicine.groupBy({ by: ["branch"], orderBy: { branch: "asc" } });
  const results: BranchRisk[] = [];
  for (const { branch } of branchRows) {
    const predictions = await buildPredictions(branch, windowDays);
    const atRisk = predictions.filter(
      (p) => p.riskTier === "critical" || p.riskTier === "reorder-soon",
    ).length;
    const atRiskPct =
      predictions.length === 0 ? 0 : Math.round((atRisk / predictions.length) * 100);
    results.push({
      branch,
      atRiskPct,
      label: atRiskPct >= 35 ? "High Risk" : atRiskPct >= 15 ? "Medium Risk" : "Stable",
    });
  }
  return results;
}

export interface RestockingRecommendation {
  medicineId: string;
  name: string;
  strength: string;
  targetStock: number;
  recommendedOrder: number;
  primarySupplier: string;
  estCostGhs: number;
}

export async function getRestockingRecommendations(
  branch: string | undefined,
  windowDays: number,
): Promise<RestockingRecommendation[]> {
  const predictions = await buildPredictions(branch, windowDays);
  const medicines = await prisma.medicine.findMany({
    where: { id: { in: predictions.map((p) => p.id) } },
    select: { id: true, unitPriceGhs: true, supplier: true },
  });
  const byId = new Map(medicines.map((m) => [m.id, m]));

  return predictions
    .filter((p) => p.riskTier === "critical" || p.riskTier === "reorder-soon")
    .map((p) => {
      const medicine = byId.get(p.id)!;
      const targetStock = Math.round(p.avgDailyUsage * TARGET_COVERAGE_DAYS);
      const recommendedOrder = Math.max(0, targetStock - p.currentStock);
      return {
        medicineId: p.id,
        name: p.name,
        strength: p.strength,
        targetStock,
        recommendedOrder,
        primarySupplier: medicine.supplier || "Unspecified",
        estCostGhs: Math.round(recommendedOrder * medicine.unitPriceGhs * 100) / 100,
      };
    })
    .sort((a, b) => b.estCostGhs - a.estCostGhs);
}

export interface VelocityPoint {
  date: string;
  weekday: string;
  actual: number;
  predicted: number;
}

/** Actual daily consumption vs a trailing moving-average forecast, over the most recent 7 days of history. */
export async function getConsumptionVelocity(
  branch: string | undefined,
  windowDays: number,
): Promise<VelocityPoint[]> {
  const medicines = await prisma.medicine.findMany({
    where: { branch },
    select: { id: true },
  });
  const medicineIds = medicines.map((m) => m.id);
  if (medicineIds.length === 0) return [];

  const today = startOfDay(new Date());
  const earliestNeeded = new Date(
    today.getTime() - (7 + windowDays) * 24 * 60 * 60 * 1000,
  );
  const records = await prisma.consumptionRecord.findMany({
    where: { medicineId: { in: medicineIds }, date: { gte: earliestNeeded } },
  });

  const dailyTotals = new Map<number, number>();
  for (const r of records) {
    const key = r.date.getTime();
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + r.quantity);
  }

  function totalForDay(dayStart: number): number {
    return dailyTotals.get(dayStart) ?? 0;
  }

  const points: VelocityPoint[] = [];
  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const day = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const actual = totalForDay(day.getTime());

    let predictedSum = 0;
    for (let w = 1; w <= windowDays; w++) {
      const priorDay = new Date(day.getTime() - w * 24 * 60 * 60 * 1000);
      predictedSum += totalForDay(priorDay.getTime());
    }

    points.push({
      date: day.toISOString().slice(0, 10),
      weekday: day.toLocaleDateString("en-US", { weekday: "short" }),
      actual,
      predicted: Math.round((predictedSum / windowDays) * 10) / 10,
    });
  }
  return points;
}

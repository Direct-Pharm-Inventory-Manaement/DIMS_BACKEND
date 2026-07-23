import type { Medicine } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

export type RiskTier = "critical" | "warning" | "advisory";
export type ExpiryActionType = "clearance" | "transfer" | "review";

const DAY_MS = 24 * 60 * 60 * 1000;
const RISK_HORIZON_DAYS = 180;

function daysUntil(date: Date, now = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/** Tier for a batch inside the 180-day risk horizon; null when it's safely out. */
export function deriveRiskTier(expiryDate: Date, now = new Date()): RiskTier | null {
  const days = daysUntil(expiryDate, now);
  if (days <= 30) return "critical";
  if (days <= 90) return "warning";
  if (days <= 180) return "advisory";
  return null;
}

const SUGGESTED_ACTION: Record<RiskTier, ExpiryActionType> = {
  critical: "clearance",
  warning: "transfer",
  advisory: "review",
};

export interface ExpiryRiskRow {
  id: string;
  name: string;
  strength: string;
  form: string;
  batchNo: string;
  branch: string;
  manufacturer: string;
  stockCategory: string;
  quantity: number;
  packaging: string;
  expiryDate: string;
  riskTier: RiskTier;
  suggestedAction: ExpiryActionType;
  actioned: boolean;
}

type MedicineWithActions = Medicine & { expiryActions: { id: string }[] };

function toRow(medicine: MedicineWithActions, tier: RiskTier): ExpiryRiskRow {
  return {
    id: medicine.id,
    name: medicine.name,
    strength: medicine.strength,
    form: medicine.form,
    batchNo: medicine.batchNo,
    branch: medicine.branch,
    manufacturer: medicine.manufacturer,
    stockCategory: medicine.stockCategory,
    quantity: medicine.quantity,
    packaging: medicine.packaging,
    expiryDate: medicine.expiryDate.toISOString(),
    riskTier: tier,
    suggestedAction: SUGGESTED_ACTION[tier],
    actioned: medicine.expiryActions.length > 0,
  };
}

async function loadAtRisk(): Promise<{ row: MedicineWithActions; tier: RiskTier }[]> {
  const horizon = new Date(Date.now() + RISK_HORIZON_DAYS * DAY_MS);
  const rows = await prisma.medicine.findMany({
    where: { expiryDate: { lte: horizon } },
    include: { expiryActions: { select: { id: true } } },
    orderBy: { expiryDate: "asc" },
  });
  return rows.flatMap((row) => {
    const tier = deriveRiskTier(row.expiryDate);
    return tier ? [{ row, tier }] : [];
  });
}

export interface ExpiryRiskSummary {
  critical: number;
  warning: number;
  advisory: number;
  reviewedBatches: number;
}

export async function getSummary(): Promise<ExpiryRiskSummary> {
  const [atRisk, reviewedBatches] = await Promise.all([
    loadAtRisk(),
    prisma.expiryAction.count(),
  ]);
  return {
    critical: atRisk.filter((r) => r.tier === "critical").length,
    warning: atRisk.filter((r) => r.tier === "warning").length,
    advisory: atRisk.filter((r) => r.tier === "advisory").length,
    reviewedBatches,
  };
}

export interface ListRiskParams {
  riskTier?: RiskTier;
  manufacturer?: string;
  stockCategory?: string;
  page: number;
  pageSize: number;
}

export async function listAtRisk(params: ListRiskParams): Promise<{
  items: ExpiryRiskRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const atRisk = (await loadAtRisk()).filter(
    ({ row, tier }) =>
      (!params.riskTier || tier === params.riskTier) &&
      (!params.manufacturer || row.manufacturer === params.manufacturer) &&
      (!params.stockCategory || row.stockCategory === params.stockCategory),
  );
  const start = (params.page - 1) * params.pageSize;
  return {
    items: atRisk
      .slice(start, start + params.pageSize)
      .map(({ row, tier }) => toRow(row, tier)),
    total: atRisk.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export interface TrendMonth {
  month: string;
  lossValueGhs: number;
  protectedValueGhs: number;
}

/** Stock value expiring in each of the next 6 months, split by whether the batch has a mitigation action. */
export async function getTrend(): Promise<TrendMonth[]> {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const end = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const rows = await prisma.medicine.findMany({
    where: { expiryDate: { lt: end } },
    include: { expiryActions: { select: { id: true } } },
  });

  return months.map(({ year, month }) => {
    const inMonth = rows.filter(
      (r) =>
        r.expiryDate.getFullYear() === year && r.expiryDate.getMonth() === month,
    );
    const value = (list: typeof inMonth) =>
      Math.round(list.reduce((sum, r) => sum + r.quantity * r.unitPriceGhs, 0));
    return {
      month: new Date(year, month, 1).toLocaleString("en", { month: "short" }),
      lossValueGhs: value(inMonth.filter((r) => r.expiryActions.length === 0)),
      protectedValueGhs: value(inMonth.filter((r) => r.expiryActions.length > 0)),
    };
  });
}

export interface RiskDistribution {
  criticalLossPct: number;
  underWatchPct: number;
  healthySupplyPct: number;
  safeStockPct: number;
}

/** Share of total stock value by risk band; "safe" is everything not critical. */
export async function getDistribution(): Promise<RiskDistribution> {
  const rows = await prisma.medicine.findMany();
  const value = (r: Medicine) => r.quantity * r.unitPriceGhs;
  const total = rows.reduce((sum, r) => sum + value(r), 0);
  if (total === 0) {
    return { criticalLossPct: 0, underWatchPct: 0, healthySupplyPct: 100, safeStockPct: 100 };
  }
  const pct = (part: number) => Math.round((part / total) * 100);
  const critical = rows.filter((r) => deriveRiskTier(r.expiryDate) === "critical");
  const watch = rows.filter((r) => {
    const tier = deriveRiskTier(r.expiryDate);
    return tier === "warning" || tier === "advisory";
  });
  const criticalLossPct = pct(critical.reduce((s, r) => s + value(r), 0));
  const underWatchPct = pct(watch.reduce((s, r) => s + value(r), 0));
  return {
    criticalLossPct,
    underWatchPct,
    healthySupplyPct: Math.max(0, 100 - criticalLossPct - underWatchPct),
    safeStockPct: Math.max(0, 100 - criticalLossPct),
  };
}

export interface RecentAction {
  id: string;
  type: ExpiryActionType;
  title: string;
  note: string;
  createdAt: string;
}

const ACTION_TITLES: Record<ExpiryActionType, string> = {
  clearance: "Clearance Sale Initiated",
  transfer: "Stock Transfer Suggested",
  review: "Batch Review Completed",
};

export async function getRecentActions(limit = 6): Promise<RecentAction[]> {
  const actions = await prisma.expiryAction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return actions.map((a) => ({
    id: a.id,
    type: a.type as ExpiryActionType,
    title: ACTION_TITLES[a.type as ExpiryActionType] ?? "Action Recorded",
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function createAction(
  medicineId: string,
  type: ExpiryActionType,
): Promise<RecentAction> {
  const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
  if (!medicine) throw new HttpError(404, "Medicine not found.");

  const notes: Record<ExpiryActionType, string> = {
    clearance: `Batch ${medicine.batchNo} marked for clearance promotion.`,
    transfer: `Transfer suggested for ${medicine.quantity.toLocaleString()} units of ${medicine.name} from ${medicine.branch}.`,
    review: `Batch ${medicine.batchNo} reviewed and acknowledged.`,
  };
  const action = await prisma.expiryAction.create({
    data: { medicineId, type, note: notes[type] },
  });
  return {
    id: action.id,
    type,
    title: ACTION_TITLES[type],
    note: action.note,
    createdAt: action.createdAt.toISOString(),
  };
}

export async function getManufacturers(): Promise<string[]> {
  const rows = await prisma.medicine.groupBy({
    by: ["manufacturer"],
    orderBy: { manufacturer: "asc" },
  });
  return rows.map((r) => r.manufacturer);
}

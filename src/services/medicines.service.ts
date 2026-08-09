import type { Medicine } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import { getSettings } from "./settings.service";

export type MedicineStatus =
  | "in-stock"
  | "low-stock"
  | "critical-expiry"
  | "out-of-stock";

const CRITICAL_EXPIRY_WINDOW_DAYS = 90;

export interface MedicineDto {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  form: string;
  packaging: string;
  category: string;
  batchNo: string;
  branch: string;
  manufacturer: string;
  supplier: string;
  stockCategory: string;
  quantity: number;
  unitOfMeasurement: string;
  unitPriceGhs: number;
  sellingPriceGhs: number | null;
  storageLocation: string;
  lowStockThreshold: number;
  reorderLevel: number | null;
  manufacturingDate: string | null;
  internalNotes: string;
  expiryDate: string;
  status: MedicineStatus;
}

/** Status is derived, never stored — one source of truth for all clients. */
export function deriveStatus(medicine: Medicine, now = new Date()): MedicineStatus {
  if (medicine.quantity === 0) return "out-of-stock";
  const criticalCutoff = new Date(
    now.getTime() + CRITICAL_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  if (medicine.expiryDate <= criticalCutoff) return "critical-expiry";
  if (medicine.quantity <= medicine.lowStockThreshold) return "low-stock";
  return "in-stock";
}

function toDto(medicine: Medicine): MedicineDto {
  return {
    id: medicine.id,
    name: medicine.name,
    genericName: medicine.genericName,
    strength: medicine.strength,
    form: medicine.form,
    packaging: medicine.packaging,
    category: medicine.category,
    batchNo: medicine.batchNo,
    branch: medicine.branch,
    manufacturer: medicine.manufacturer,
    supplier: medicine.supplier,
    stockCategory: medicine.stockCategory,
    quantity: medicine.quantity,
    unitOfMeasurement: medicine.unitOfMeasurement,
    unitPriceGhs: medicine.unitPriceGhs,
    sellingPriceGhs: medicine.sellingPriceGhs,
    storageLocation: medicine.storageLocation,
    lowStockThreshold: medicine.lowStockThreshold,
    reorderLevel: medicine.reorderLevel,
    manufacturingDate: medicine.manufacturingDate?.toISOString() ?? null,
    internalNotes: medicine.internalNotes,
    expiryDate: medicine.expiryDate.toISOString(),
    status: deriveStatus(medicine),
  };
}

export async function getMedicine(id: string): Promise<MedicineDto> {
  const medicine = await prisma.medicine.findUnique({ where: { id } });
  if (!medicine) throw new HttpError(404, "Medicine not found.");
  return toDto(medicine);
}

export interface ListMedicinesParams {
  status?: MedicineStatus;
  category?: string;
  branch?: string;
  supplier?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ListMedicinesResult {
  items: MedicineDto[];
  total: number;
  page: number;
  pageSize: number;
}

// Status is derived from quantity vs threshold and expiry-vs-now, which
// SQL can't express portably through Prisma, so rows matching the plain
// filters are loaded and status filtering/pagination happen in memory.
// Fine at pharmacy scale; revisit with raw SQL if the catalog grows.
async function loadFiltered(
  params: Pick<ListMedicinesParams, "status" | "category" | "branch" | "supplier" | "search">,
): Promise<Medicine[]> {
  const rows = await prisma.medicine.findMany({
    where: {
      category: params.category,
      branch: params.branch,
      supplier: params.supplier,
      OR: params.search
        ? [
            { name: { contains: params.search } },
            { batchNo: { contains: params.search } },
            { category: { contains: params.search } },
            { branch: { contains: params.search } },
          ]
        : undefined,
    },
    orderBy: { name: "asc" },
  });
  return params.status ? rows.filter((row) => deriveStatus(row) === params.status) : rows;
}

export async function listMedicines(
  params: ListMedicinesParams,
): Promise<ListMedicinesResult> {
  const filtered = await loadFiltered(params);
  const start = (params.page - 1) * params.pageSize;
  return {
    items: filtered.slice(start, start + params.pageSize).map(toDto),
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export interface InventoryReportSummary {
  totalMedicines: number;
  totalUnits: number;
  inventoryValueGhs: number;
  lowStockAlerts: number;
}

/** Same filters as listMedicines, aggregated over the whole filtered set rather than one page — powers the Full Inventory Report's stat cards. */
export async function getInventoryReportSummary(
  params: Pick<ListMedicinesParams, "status" | "category" | "branch" | "supplier" | "search">,
): Promise<InventoryReportSummary> {
  const filtered = await loadFiltered(params);
  return {
    totalMedicines: filtered.length,
    totalUnits: filtered.reduce((sum, r) => sum + r.quantity, 0),
    inventoryValueGhs: Math.round(filtered.reduce((sum, r) => sum + r.quantity * r.unitPriceGhs, 0) * 100) / 100,
    lowStockAlerts: filtered.filter((r) => deriveStatus(r) === "low-stock").length,
  };
}

export async function getFacets(): Promise<{
  categories: string[];
  branches: string[];
  suppliers: string[];
}> {
  const [categories, branches, suppliers] = await Promise.all([
    prisma.medicine.groupBy({ by: ["category"], orderBy: { category: "asc" } }),
    prisma.medicine.groupBy({ by: ["branch"], orderBy: { branch: "asc" } }),
    prisma.medicine.groupBy({ by: ["supplier"], orderBy: { supplier: "asc" } }),
  ]);
  return {
    categories: categories.map((c) => c.category),
    branches: branches.map((b) => b.branch),
    suppliers: suppliers.map((s) => s.supplier).filter((s) => s !== ""),
  };
}

export interface MedicinesSummary {
  totalSkus: number;
  lowStockAlerts: number;
  stockOuts: number;
  stockOutBranches: number;
  lastBatchNo: string | null;
}

export async function getSummary(): Promise<MedicinesSummary> {
  const rows = await prisma.medicine.findMany();
  const statuses = rows.map((row) => ({ row, status: deriveStatus(row) }));
  const stockOutRows = statuses.filter((s) => s.status === "out-of-stock");
  const latest = await prisma.medicine.findFirst({
    orderBy: { createdAt: "desc" },
    select: { batchNo: true },
  });
  return {
    totalSkus: rows.length,
    lowStockAlerts: statuses.filter((s) => s.status === "low-stock").length,
    stockOuts: stockOutRows.length,
    stockOutBranches: new Set(stockOutRows.map((s) => s.row.branch)).size,
    lastBatchNo: latest?.batchNo ?? null,
  };
}

export interface MedicineInput {
  name: string;
  genericName?: string;
  strength?: string;
  form: string;
  packaging?: string;
  category: string;
  batchNo: string;
  branch: string;
  manufacturer?: string;
  supplier?: string;
  stockCategory?: string;
  quantity: number;
  unitOfMeasurement?: string;
  unitPriceGhs: number;
  sellingPriceGhs?: number | null;
  storageLocation?: string;
  lowStockThreshold?: number;
  reorderLevel?: number | null;
  manufacturingDate?: string | null;
  internalNotes?: string;
  expiryDate: string;
}

const MIN_EXPIRY_MONTHS_AHEAD = 6;

function toData(input: Partial<MedicineInput>) {
  return {
    ...input,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
    manufacturingDate:
      input.manufacturingDate === undefined
        ? undefined
        : input.manufacturingDate
          ? new Date(input.manufacturingDate)
          : null,
  };
}

export async function createMedicine(input: MedicineInput): Promise<MedicineDto> {
  const existing = await prisma.medicine.findUnique({
    where: { batchNo_branch: { batchNo: input.batchNo, branch: input.branch } },
  });
  if (existing) {
    throw new HttpError(
      409,
      `Batch ${input.batchNo} already exists at ${input.branch}.`,
    );
  }

  // Inventory guideline: newly registered stock must have at least six
  // months of shelf life. (Edits are exempt — existing stock ages.)
  const minExpiry = new Date();
  minExpiry.setMonth(minExpiry.getMonth() + MIN_EXPIRY_MONTHS_AHEAD);
  if (new Date(input.expiryDate) < minExpiry) {
    throw new HttpError(
      400,
      `Expiry date must be at least ${MIN_EXPIRY_MONTHS_AHEAD} months from today.`,
    );
  }

  // Falls back to the admin-configured default (Settings → Inventory
  // Thresholds) rather than the schema's static default when the caller
  // doesn't specify one explicitly.
  const lowStockThreshold =
    input.lowStockThreshold ?? (await getSettings()).minimumStockTrigger;

  const created = await prisma.medicine.create({
    data: {
      ...toData(input),
      name: input.name,
      form: input.form,
      packaging: input.packaging ?? "",
      category: input.category,
      batchNo: input.batchNo,
      branch: input.branch,
      quantity: input.quantity,
      unitPriceGhs: input.unitPriceGhs,
      expiryDate: new Date(input.expiryDate),
      lowStockThreshold,
    },
  });
  return toDto(created);
}

export async function updateMedicine(
  id: string,
  input: Partial<MedicineInput>,
): Promise<MedicineDto> {
  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Medicine not found.");
  const nextBatchNo = input.batchNo ?? existing.batchNo;
  const nextBranch = input.branch ?? existing.branch;
  if (nextBatchNo !== existing.batchNo || nextBranch !== existing.branch) {
    const clash = await prisma.medicine.findUnique({
      where: { batchNo_branch: { batchNo: nextBatchNo, branch: nextBranch } },
    });
    if (clash) {
      throw new HttpError(409, `Batch ${nextBatchNo} already exists at ${nextBranch}.`);
    }
  }
  const updated = await prisma.medicine.update({
    where: { id },
    data: toData(input),
  });
  return toDto(updated);
}

export async function deleteMedicine(id: string): Promise<void> {
  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Medicine not found.");
  await prisma.medicine.delete({ where: { id } });
}

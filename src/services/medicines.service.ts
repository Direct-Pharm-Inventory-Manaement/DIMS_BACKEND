import type { Medicine } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

export type MedicineStatus =
  | "in-stock"
  | "low-stock"
  | "critical-expiry"
  | "out-of-stock";

const CRITICAL_EXPIRY_WINDOW_DAYS = 90;

export interface MedicineDto {
  id: string;
  name: string;
  strength: string;
  form: string;
  packaging: string;
  category: string;
  batchNo: string;
  branch: string;
  quantity: number;
  unitPriceGhs: number;
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
    strength: medicine.strength,
    form: medicine.form,
    packaging: medicine.packaging,
    category: medicine.category,
    batchNo: medicine.batchNo,
    branch: medicine.branch,
    quantity: medicine.quantity,
    unitPriceGhs: medicine.unitPriceGhs,
    expiryDate: medicine.expiryDate.toISOString(),
    status: deriveStatus(medicine),
  };
}

export interface ListMedicinesParams {
  status?: MedicineStatus;
  category?: string;
  branch?: string;
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
export async function listMedicines(
  params: ListMedicinesParams,
): Promise<ListMedicinesResult> {
  const rows = await prisma.medicine.findMany({
    where: {
      category: params.category,
      branch: params.branch,
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

  const filtered = params.status
    ? rows.filter((row) => deriveStatus(row) === params.status)
    : rows;

  const start = (params.page - 1) * params.pageSize;
  return {
    items: filtered.slice(start, start + params.pageSize).map(toDto),
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getFacets(): Promise<{
  categories: string[];
  branches: string[];
}> {
  const [categories, branches] = await Promise.all([
    prisma.medicine.groupBy({ by: ["category"], orderBy: { category: "asc" } }),
    prisma.medicine.groupBy({ by: ["branch"], orderBy: { branch: "asc" } }),
  ]);
  return {
    categories: categories.map((c) => c.category),
    branches: branches.map((b) => b.branch),
  };
}

export interface MedicinesSummary {
  totalSkus: number;
  lowStockAlerts: number;
  stockOuts: number;
  stockOutBranches: number;
}

export async function getSummary(): Promise<MedicinesSummary> {
  const rows = await prisma.medicine.findMany();
  const statuses = rows.map((row) => ({ row, status: deriveStatus(row) }));
  const stockOutRows = statuses.filter((s) => s.status === "out-of-stock");
  return {
    totalSkus: rows.length,
    lowStockAlerts: statuses.filter((s) => s.status === "low-stock").length,
    stockOuts: stockOutRows.length,
    stockOutBranches: new Set(stockOutRows.map((s) => s.row.branch)).size,
  };
}

export interface MedicineInput {
  name: string;
  strength?: string;
  form: string;
  packaging: string;
  category: string;
  batchNo: string;
  branch: string;
  quantity: number;
  unitPriceGhs: number;
  lowStockThreshold?: number;
  expiryDate: string;
}

export async function createMedicine(input: MedicineInput): Promise<MedicineDto> {
  const existing = await prisma.medicine.findUnique({
    where: { batchNo: input.batchNo },
  });
  if (existing) {
    throw new HttpError(409, `Batch ${input.batchNo} already exists.`);
  }
  const created = await prisma.medicine.create({
    data: { ...input, expiryDate: new Date(input.expiryDate) },
  });
  return toDto(created);
}

export async function updateMedicine(
  id: string,
  input: Partial<MedicineInput>,
): Promise<MedicineDto> {
  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Medicine not found.");
  const updated = await prisma.medicine.update({
    where: { id },
    data: {
      ...input,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
    },
  });
  return toDto(updated);
}

export async function deleteMedicine(id: string): Promise<void> {
  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Medicine not found.");
  await prisma.medicine.delete({ where: { id } });
}

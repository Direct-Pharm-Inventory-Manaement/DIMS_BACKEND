import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

export type TransferStatus = "pending" | "approved" | "rejected" | "completed";

export interface TransferDto {
  id: string;
  code: string;
  medicineId: string;
  medicineName: string;
  batchNo: string;
  packaging: string;
  sourceBranch: string;
  destinationBranch: string;
  quantity: number;
  status: TransferStatus;
  requestedBy: { id: string; name: string };
  reviewNote: string;
  createdAt: string;
  completedAt: string | null;
}

function toDto(
  row: Awaited<ReturnType<typeof prisma.transferRequest.findFirstOrThrow>> & {
    requestedBy: { id: string; name: string };
  },
): TransferDto {
  return {
    id: row.id,
    code: row.code,
    medicineId: row.medicineId,
    medicineName: row.medicineName,
    batchNo: row.batchNo,
    packaging: row.packaging,
    sourceBranch: row.sourceBranch,
    destinationBranch: row.destinationBranch,
    quantity: row.quantity,
    status: row.status as TransferStatus,
    requestedBy: row.requestedBy,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

const REQUESTED_BY_SELECT = { select: { id: true, name: true } };

async function generateCode(): Promise<string> {
  const now = new Date();
  const prefix = `TRF-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const count = await prisma.transferRequest.count({
    where: { code: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

export interface ListTransfersParams {
  status?: TransferStatus;
  sourceBranch?: string;
  search?: string;
  /** Only requests created on or after this date. */
  dateFrom?: string;
  page: number;
  pageSize: number;
}

export async function listTransfers(params: ListTransfersParams): Promise<{
  items: TransferDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const where = {
    status: params.status,
    sourceBranch: params.sourceBranch,
    createdAt: params.dateFrom ? { gte: new Date(params.dateFrom) } : undefined,
    OR: params.search
      ? [
          { medicineName: { contains: params.search } },
          { batchNo: { contains: params.search } },
          { code: { contains: params.search } },
        ]
      : undefined,
  };
  const [rows, total] = await Promise.all([
    prisma.transferRequest.findMany({
      where,
      include: { requestedBy: REQUESTED_BY_SELECT },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.transferRequest.count({ where }),
  ]);
  return {
    items: rows.map(toDto),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export interface TransfersSummary {
  pendingApproval: number;
  newSinceYesterday: number;
  approved: number;
  fulfillRatePct: number;
  rejected: number;
  completedThisQuarter: number;
}

export async function getSummary(): Promise<TransfersSummary> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const quarterStart = new Date();
  quarterStart.setMonth(Math.floor(quarterStart.getMonth() / 3) * 3, 1);
  quarterStart.setHours(0, 0, 0, 0);

  const [pendingApproval, newSinceYesterday, approved, completed, rejected, completedThisQuarter] =
    await Promise.all([
      prisma.transferRequest.count({ where: { status: "pending" } }),
      prisma.transferRequest.count({
        where: { status: "pending", createdAt: { gte: yesterday } },
      }),
      prisma.transferRequest.count({ where: { status: "approved" } }),
      prisma.transferRequest.count({ where: { status: "completed" } }),
      prisma.transferRequest.count({ where: { status: "rejected" } }),
      prisma.transferRequest.count({
        where: { status: "completed", completedAt: { gte: quarterStart } },
      }),
    ]);

  const fulfillRatePct =
    approved + completed === 0 ? 100 : Math.round((completed / (approved + completed)) * 100);

  return {
    pendingApproval,
    newSinceYesterday,
    approved,
    fulfillRatePct,
    rejected,
    completedThisQuarter,
  };
}

export async function getBranches(): Promise<string[]> {
  const rows = await prisma.medicine.groupBy({ by: ["branch"], orderBy: { branch: "asc" } });
  return rows.map((r) => r.branch);
}

export interface CreateTransferInput {
  medicineId: string;
  destinationBranch: string;
  quantity: number;
}

export async function createTransfer(
  input: CreateTransferInput,
  requestedById: string,
): Promise<TransferDto> {
  const medicine = await prisma.medicine.findUnique({ where: { id: input.medicineId } });
  if (!medicine) throw new HttpError(404, "Medicine not found.");
  if (input.destinationBranch === medicine.branch) {
    throw new HttpError(400, "Destination branch must differ from the source branch.");
  }
  if (input.quantity <= 0) {
    throw new HttpError(400, "Quantity must be greater than zero.");
  }
  if (input.quantity > medicine.quantity) {
    throw new HttpError(
      400,
      `Only ${medicine.quantity.toLocaleString()} units available at ${medicine.branch}.`,
    );
  }

  const code = await generateCode();
  const created = await prisma.transferRequest.create({
    data: {
      code,
      medicineId: medicine.id,
      medicineName: `${medicine.name} ${medicine.strength}`.trim(),
      batchNo: medicine.batchNo,
      packaging: medicine.packaging,
      sourceBranch: medicine.branch,
      destinationBranch: input.destinationBranch,
      quantity: input.quantity,
      requestedById,
    },
    include: { requestedBy: REQUESTED_BY_SELECT },
  });
  return toDto(created);
}

async function getPendingOrThrow(id: string) {
  const transfer = await prisma.transferRequest.findUnique({ where: { id } });
  if (!transfer) throw new HttpError(404, "Transfer request not found.");
  if (transfer.status !== "pending") {
    throw new HttpError(400, `Only pending requests can be reviewed (this one is ${transfer.status}).`);
  }
  return transfer;
}

export async function approveTransfer(id: string): Promise<TransferDto> {
  const transfer = await getPendingOrThrow(id);
  const medicine = await prisma.medicine.findUnique({ where: { id: transfer.medicineId } });
  if (!medicine || transfer.quantity > medicine.quantity) {
    throw new HttpError(400, "Source branch no longer has enough stock to approve this transfer.");
  }
  const updated = await prisma.transferRequest.update({
    where: { id },
    data: { status: "approved" },
    include: { requestedBy: REQUESTED_BY_SELECT },
  });
  return toDto(updated);
}

export async function rejectTransfer(id: string, reviewNote: string): Promise<TransferDto> {
  await getPendingOrThrow(id);
  const updated = await prisma.transferRequest.update({
    where: { id },
    data: { status: "rejected", reviewNote },
    include: { requestedBy: REQUESTED_BY_SELECT },
  });
  return toDto(updated);
}

/** Moves real stock: decrements the source batch, credits (or creates) the destination batch. */
export async function completeTransfer(id: string): Promise<TransferDto> {
  const transfer = await prisma.transferRequest.findUnique({ where: { id } });
  if (!transfer) throw new HttpError(404, "Transfer request not found.");
  if (transfer.status !== "approved") {
    throw new HttpError(
      400,
      `Only approved requests can be completed (this one is ${transfer.status}).`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const source = await tx.medicine.findUnique({ where: { id: transfer.medicineId } });
    if (!source || transfer.quantity > source.quantity) {
      throw new HttpError(400, "Source branch no longer has enough stock to complete this transfer.");
    }

    await tx.medicine.update({
      where: { id: source.id },
      data: { quantity: { decrement: transfer.quantity } },
    });

    const destination = await tx.medicine.findUnique({
      where: { batchNo_branch: { batchNo: source.batchNo, branch: transfer.destinationBranch } },
    });
    if (destination) {
      await tx.medicine.update({
        where: { id: destination.id },
        data: { quantity: { increment: transfer.quantity } },
      });
    } else {
      const { id: _id, quantity: _qty, branch: _branch, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } =
        source;
      await tx.medicine.create({
        data: { ...rest, branch: transfer.destinationBranch, quantity: transfer.quantity },
      });
    }

    return tx.transferRequest.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
      include: { requestedBy: REQUESTED_BY_SELECT },
    });
  });

  return toDto(updated);
}

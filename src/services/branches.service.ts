import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

export interface BranchDto {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  licenseNumber: string;
  medicineCount: number;
  staffCount: number;
}

export async function listBranches(): Promise<BranchDto[]> {
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });
  const [medicineCounts, staffCounts] = await Promise.all([
    prisma.medicine.groupBy({ by: ["branch"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["branch"], _count: { _all: true } }),
  ]);
  const medicineByBranch = new Map(medicineCounts.map((r) => [r.branch, r._count._all]));
  const staffByBranch = new Map(staffCounts.map((r) => [r.branch, r._count._all]));

  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    type: b.type,
    address: b.address,
    phone: b.phone,
    licenseNumber: b.licenseNumber,
    medicineCount: medicineByBranch.get(b.name) ?? 0,
    staffCount: staffByBranch.get(b.name) ?? 0,
  }));
}

export interface UpdateBranchInput {
  type?: string;
  address?: string;
  phone?: string;
  licenseNumber?: string;
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<BranchDto> {
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Branch not found.");
  const updated = await prisma.branch.update({ where: { id }, data: input });
  const [medicineCount, staffCount] = await Promise.all([
    prisma.medicine.count({ where: { branch: updated.name } }),
    prisma.user.count({ where: { branch: updated.name } }),
  ]);
  return {
    id: updated.id,
    name: updated.name,
    type: updated.type,
    address: updated.address,
    phone: updated.phone,
    licenseNumber: updated.licenseNumber,
    medicineCount,
    staffCount,
  };
}

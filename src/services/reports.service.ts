import { prisma } from "../lib/prisma";

export type ReportType = "full-inventory" | "expiry" | "low-stock" | "transfer-history";
export type ReportFormat = "pdf" | "csv";

export interface ReportLogEntry {
  id: string;
  reportType: ReportType;
  format: ReportFormat;
  fileName: string;
  generatedBy: { id: string; name: string };
  createdAt: string;
}

export interface LogReportInput {
  reportType: ReportType;
  format: ReportFormat;
  fileName: string;
}

export async function logReport(input: LogReportInput, generatedById: string): Promise<ReportLogEntry> {
  const created = await prisma.reportLog.create({
    data: { ...input, generatedById },
    include: { generatedBy: { select: { id: true, name: true } } },
  });
  return {
    id: created.id,
    reportType: created.reportType as ReportType,
    format: created.format as ReportFormat,
    fileName: created.fileName,
    generatedBy: created.generatedBy,
    createdAt: created.createdAt.toISOString(),
  };
}

export interface ListReportLogParams {
  page: number;
  pageSize: number;
}

export async function listReportLog(params: ListReportLogParams): Promise<{
  items: ReportLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const [rows, total] = await Promise.all([
    prisma.reportLog.findMany({
      include: { generatedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.reportLog.count(),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      reportType: r.reportType as ReportType,
      format: r.format as ReportFormat,
      fileName: r.fileName,
      generatedBy: r.generatedBy,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

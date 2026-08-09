import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SystemSettings } from "@prisma/client";
import { prisma } from "../lib/prisma";

const SINGLETON_ID = "singleton";

/** The one settings row always exists — seeded on `npm run seed`, created lazily here as a safety net. */
export async function getSettings(): Promise<SystemSettings> {
  return prisma.systemSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export interface UpdateSettingsInput {
  systemName?: string;
  organizationName?: string;
  defaultBranch?: string;
  timezone?: string;
  dateFormat?: string;
  criticalAlertDays?: number;
  highRiskDays?: number;
  monitoringDays?: number;
  minimumStockTrigger?: number;
  predictionWindowDays?: number;
  twoFactorRequired?: boolean;
  autoLogoutMinutes?: number;
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SystemSettings> {
  await getSettings();
  return prisma.systemSettings.update({ where: { id: SINGLETON_ID }, data: input });
}

export interface SystemInfo {
  appVersion: string;
  dbEngine: string;
  dbSizeBytes: number;
  uptimeSeconds: number;
  lastBackupAt: string | null;
}

const backendVersion = (() => {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

/** Every field here is a real, currently-observable fact — no simulated backup timestamps or fake quotas. */
export function getSystemInfo(): SystemInfo {
  let dbSizeBytes = 0;
  try {
    // Prisma resolves a relative DATABASE_URL against the prisma/ folder
    // (where schema.prisma lives), not the project root.
    const url = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./dev.db";
    dbSizeBytes = statSync(join(__dirname, "../../prisma", url)).size;
  } catch {
    dbSizeBytes = 0;
  }
  return {
    appVersion: backendVersion,
    dbEngine: "SQLite",
    dbSizeBytes,
    uptimeSeconds: Math.round(process.uptime()),
    // No backup system exists yet — reporting a fabricated timestamp here
    // would misrepresent data safety; null means "not configured".
    lastBackupAt: null,
  };
}

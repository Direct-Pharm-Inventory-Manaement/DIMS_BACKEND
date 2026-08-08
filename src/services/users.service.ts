import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

export type UserRole = "super_admin" | "administrator" | "pharmacist" | "store_manager" | "cashier";
export type UserAccountStatus = "active" | "suspended";

const ONLINE_WINDOW_MINUTES = 15;
/** Roles considered elevated/"admin" for the summary stat card. */
const ADMIN_ROLES: readonly UserRole[] = ["super_admin", "administrator"];

export interface UserDto {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  branch: string;
  status: UserAccountStatus;
  online: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function toDto(user: User): UserDto {
  const online =
    user.status === "active" &&
    user.lastLoginAt !== null &&
    Date.now() - user.lastLoginAt.getTime() <= ONLINE_WINDOW_MINUTES * 60 * 1000;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role as UserRole,
    branch: user.branch,
    status: user.status as UserAccountStatus,
    online,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export interface ListUsersParams {
  search?: string;
  role?: UserRole[];
  branch?: string;
  page: number;
  pageSize: number;
}

export async function listUsers(params: ListUsersParams): Promise<{
  items: UserDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const where = {
    role: params.role ? { in: params.role } : undefined,
    branch: params.branch,
    OR: params.search
      ? [
          { name: { contains: params.search } },
          { email: { contains: params.search } },
          { username: { contains: params.search } },
        ]
      : undefined,
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items: rows.map(toDto), total, page: params.page, pageSize: params.pageSize };
}

export interface UsersSummary {
  totalUsers: number;
  newThisMonth: number;
  activeNow: number;
  adminRoles: number;
}

export async function getSummary(): Promise<UsersSummary> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);

  const [totalUsers, newThisMonth, activeNow, adminRoles] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { status: "active", lastLoginAt: { gte: onlineSince } } }),
    prisma.user.count({ where: { role: { in: [...ADMIN_ROLES] } } }),
  ]);

  return { totalUsers, newThisMonth, activeNow, adminRoles };
}

function generateTempPassword(): string {
  // Readable-ish: base64url alphabet, 12 chars — strong enough for a
  // one-time credential the user changes on first login.
  return randomBytes(9).toString("base64url");
}

export interface CreateUserInput {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  branch: string;
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ user: UserDto; temporaryPassword: string }> {
  const clash = await prisma.user.findFirst({
    where: { OR: [{ email: input.email.toLowerCase() }, { username: input.username }] },
  });
  if (clash) {
    throw new HttpError(409, "A user with that email or username already exists.");
  }

  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      username: input.username,
      role: input.role,
      branch: input.branch,
      passwordHash,
    },
  });
  return { user: toDto(created), temporaryPassword };
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  username?: string;
  role?: UserRole;
  branch?: string;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserDto> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "User not found.");

  if (input.email || input.username) {
    const clash = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          input.email ? { email: input.email.toLowerCase() } : undefined,
          input.username ? { username: input.username } : undefined,
        ].filter((c): c is NonNullable<typeof c> => Boolean(c)),
      },
    });
    if (clash) throw new HttpError(409, "A user with that email or username already exists.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { ...input, email: input.email?.toLowerCase() },
  });
  return toDto(updated);
}

export async function setUserStatus(id: string, status: UserAccountStatus): Promise<UserDto> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "User not found.");
  const updated = await prisma.user.update({ where: { id }, data: { status } });
  return toDto(updated);
}

export async function resetUserPassword(id: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "User not found.");
  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  return temporaryPassword;
}

import { createHash, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import { signToken, type Branch, type UserRole } from "../utils/jwt";
import { sendOtpEmail } from "./mailer";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

// Temporary demo credentials, active only while env.devAuthBypass is on.
const DEV_BYPASS_EMAIL_PATTERN = /@gmail\.com$/i;
const DEV_BYPASS_PASSWORD = "DODDADWOA2526";

function devBypassUser(email: string): PublicUser {
  const localPart = email.split("@")[0] || "demo";
  return {
    id: `dev-${localPart.toLowerCase()}`,
    name: localPart,
    email: email.toLowerCase(),
    role: "administrator",
    branch: "adenta",
  };
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch: Branch;
}

interface AuthResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    branch: user.branch as Branch,
  };
}

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function loginWithPassword(
  identifier: string,
  password: string,
): Promise<AuthResult> {
  if (
    env.devAuthBypass &&
    DEV_BYPASS_EMAIL_PATTERN.test(identifier.trim()) &&
    password === DEV_BYPASS_PASSWORD
  ) {
    const user = devBypassUser(identifier.trim());
    const token = signToken({
      sub: user.id,
      role: user.role,
      branch: user.branch,
      temporary: false,
    });
    return { token, user };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });

  // Compare against a dummy hash when the user is missing so response
  // timing doesn't reveal which identifiers exist.
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ??
      "$2b$12$C6UzMDM.H6dfI/f/IKcEeO1qN0T1p7VUlfwvO/tS0ySZ1P3ZbKS9C",
  );

  if (!user || !passwordMatches) {
    throw new HttpError(401, "Incorrect username/email or password.");
  }

  const token = signToken({
    sub: user.id,
    role: user.role as UserRole,
    branch: user.branch as Branch,
    temporary: false,
  });
  return { token, user: toPublicUser(user) };
}

export async function requestPasswordOtp(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Silently succeed for unknown emails so the endpoint can't be used
  // to probe which addresses have accounts.
  if (!user) return;

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

  await prisma.$transaction([
    // A fresh request invalidates any previous outstanding code.
    prisma.passwordOtp.deleteMany({ where: { userId: user.id } }),
    prisma.passwordOtp.create({
      data: {
        userId: user.id,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    }),
  ]);

  await sendOtpEmail(user.email, code);
}

export async function verifyPasswordOtp(
  email: string,
  otp: string,
): Promise<AuthResult> {
  if (env.devAuthBypass && /^\d{6}$/.test(otp)) {
    const user = devBypassUser(email.trim());
    const token = signToken({
      sub: user.id,
      role: user.role,
      branch: user.branch,
      temporary: true,
    });
    return { token, user };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      passwordOtps: {
        where: { consumedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const record = user?.passwordOtps[0];

  if (!user || !record) {
    throw new HttpError(401, "Invalid or expired code. Request a new one.");
  }
  if (record.expiresAt < new Date() || record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(401, "Invalid or expired code. Request a new one.");
  }

  if (record.codeHash !== hashOtp(otp)) {
    await prisma.passwordOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new HttpError(401, "Incorrect code. Please check and try again.");
  }

  await prisma.passwordOtp.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  const token = signToken({
    sub: user.id,
    role: user.role as UserRole,
    branch: user.branch as Branch,
    temporary: true,
  });
  return { token, user: toPublicUser(user) };
}

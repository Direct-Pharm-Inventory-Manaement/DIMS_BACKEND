import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type UserRole = "administrator" | "staff";
export type Branch = "adenta" | "haatso";

export interface TokenPayload {
  sub: string;
  role: UserRole;
  branch: Branch;
  /** True when the session came from OTP recovery rather than a password. */
  temporary: boolean;
}

/** Temporary (OTP) sessions are short-lived: enough to sign in and change the password. */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: payload.temporary ? "15m" : "8h",
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}

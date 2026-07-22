import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  // Temporary demo bypass (any @gmail.com + shared password, any 6-digit
  // OTP). On by default only outside production; set DEV_AUTH_BYPASS=false
  // to force real auth anywhere.
  devAuthBypass:
    process.env.DEV_AUTH_BYPASS === "false"
      ? false
      : process.env.DEV_AUTH_BYPASS === "true" || nodeEnv !== "production",
  jwtSecret: required(
    "JWT_SECRET",
    process.env.NODE_ENV === "production" ? undefined : "dev-only-secret",
  ),
  // SMTP is optional in development: without it, OTP emails are logged
  // to the console instead of sent.
  smtp: process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
        from: process.env.SMTP_FROM || "Direct Inventory Manager <no-reply@directpharmacy.local>",
      }
    : null,
};

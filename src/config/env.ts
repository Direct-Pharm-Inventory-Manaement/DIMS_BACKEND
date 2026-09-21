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
  // Brevo's transactional email HTTP API (not raw SMTP) — Render's free
  // tier blocks outbound traffic on SMTP ports (25/465/587) entirely, so
  // this goes over regular HTTPS instead. Optional in development:
  // without it, emails are logged to the console instead of sent.
  brevo: process.env.BREVO_API_KEY
    ? {
        apiKey: process.env.BREVO_API_KEY,
        from: process.env.SMTP_FROM || "Direct Inventory Manager <no-reply@directpharmacy.local>",
      }
    : null,
};

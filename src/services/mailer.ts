import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;

if (env.smtp) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user
      ? { user: env.smtp.user, pass: env.smtp.pass }
      : undefined,
  });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = "Your Direct Inventory Manager verification code";
  const text = [
    `Your one-time verification code is: ${code}`,
    "",
    "It expires in 10 minutes. If you did not request this code, you can ignore this email.",
  ].join("\n");

  if (!transporter) {
    // No SMTP configured (development): surface the code in the server log.
    console.log(`[mailer] OTP for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtp!.from,
    to,
    subject,
    text,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  username: string,
  temporaryPassword: string,
): Promise<void> {
  const subject = "Your Direct Inventory Manager account";
  const text = [
    `Hi ${name},`,
    "",
    "An account has been created for you on Direct Inventory Manager.",
    "",
    `Username: ${username}`,
    `Temporary password: ${temporaryPassword}`,
    "",
    "Sign in and change this password as soon as possible.",
  ].join("\n");

  if (!transporter) {
    console.log(`[mailer] Welcome email for ${to} (${username}): temp password ${temporaryPassword}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtp!.from,
    to,
    subject,
    text,
  });
}

export async function sendPasswordResetNotice(
  to: string,
  name: string,
  username: string,
  temporaryPassword: string,
): Promise<void> {
  const subject = "Your Direct Inventory Manager password was reset";
  const text = [
    `Hi ${name},`,
    "",
    "An administrator reset your password on Direct Inventory Manager.",
    "",
    `Username: ${username}`,
    `New temporary password: ${temporaryPassword}`,
    "",
    "Sign in and change this password as soon as possible. If you didn't expect this, contact your administrator.",
  ].join("\n");

  if (!transporter) {
    console.log(`[mailer] Password reset notice for ${to} (${username}): temp password ${temporaryPassword}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtp!.from,
    to,
    subject,
    text,
  });
}

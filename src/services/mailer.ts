import { env } from "../config/env";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/** Splits "Name <email@example.com>" into Brevo's {name, email} sender shape. */
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.*)<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "Direct Inventory Manager", email: from.trim() };
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!env.brevo) {
    // No Brevo API key configured (development): surface the content in the server log.
    console.log(`[mailer] To: ${to} | Subject: ${subject}\n${text}`);
    return;
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.brevo.apiKey,
    },
    body: JSON.stringify({
      sender: parseSender(env.brevo.from),
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo API request failed (${response.status}): ${body}`);
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = "Your Direct Inventory Manager verification code";
  const text = [
    `Your one-time verification code is: ${code}`,
    "",
    "It expires in 10 minutes. If you did not request this code, you can ignore this email.",
  ].join("\n");
  await sendEmail(to, subject, text);
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
  await sendEmail(to, subject, text);
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
  await sendEmail(to, subject, text);
}

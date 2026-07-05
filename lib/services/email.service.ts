import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

export type EmailSendResult = {
  queued: boolean;
  mode: "smtp" | "ethereal" | "log";
  messageId?: string;
  previewUrl?: string;
  error?: string;
};

let smtpTransporter: nodemailer.Transporter | null = null;
let etherealTransporterPromise: Promise<nodemailer.Transporter> | null = null;

export function isSmtpConfigured() {
  const host = process.env.SMTP_HOST?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  const user = process.env.SMTP_USER?.trim();
  if (!host || !password || !user) return false;
  if (host === "smtp.example.com") return false;
  return true;
}

export function isMailtrapSandbox() {
  return process.env.SMTP_HOST?.includes("sandbox.smtp.mailtrap.io") ?? false;
}

export function isMailtrapLive() {
  return process.env.SMTP_HOST?.includes("live.smtp.mailtrap.io") ?? false;
}

function shouldUseEthereal() {
  if (process.env.SMTP_MODE === "log") return false;
  if (process.env.SMTP_MODE === "ethereal") return true;
  return process.env.NODE_ENV === "development" && !isSmtpConfigured();
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  if (!isSmtpConfigured()) return null;

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: process.env.SMTP_PORT !== "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

  return smtpTransporter;
}

async function getEtherealTransporter() {
  if (!etherealTransporterPromise) {
    etherealTransporterPromise = (async () => {
      const testAccount = await nodemailer.createTestAccount();
      logger.info("Using Ethereal test SMTP for development emails", {
        user: testAccount.user,
        hint: "Set SMTP_HOST/SMTP_PASSWORD in .env to send real email instead.",
      });
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    })();
  }

  return etherealTransporterPromise;
}

function logDevEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const text = params.text ?? params.html.replace(/<[^>]+>/g, "");
  logger.info("Email (dev log mode — not sent via SMTP)", {
    to: params.to,
    subject: params.subject,
    body: text,
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailSendResult> {
  const from = process.env.SMTP_FROM ?? "PayForMe <noreply@payforme.local>";

  let transport = getSmtpTransporter();
  let mode: EmailSendResult["mode"] = "smtp";

  if (!transport && shouldUseEthereal()) {
    transport = await getEtherealTransporter();
    mode = "ethereal";
  }

  if (!transport) {
    logDevEmail(params);
    return { queued: true, mode: "log" };
  }

  try {
    const info = await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text ?? params.html.replace(/<[^>]+>/g, ""),
    });

    const previewUrl: string | undefined =
      mode === "ethereal"
        ? (nodemailer.getTestMessageUrl(info) || undefined)
        : undefined;

    logger.info("Email sent", {
      mode,
      messageId: info.messageId,
      to: params.to,
      previewUrl,
    });

    return {
      queued: true,
      mode,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Email delivery failed", { to: params.to, mode, error: message });

    if (shouldUseEthereal() && mode === "smtp") {
      try {
        const fallback = await getEtherealTransporter();
        const info = await fallback.sendMail({
          from,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text ?? params.html.replace(/<[^>]+>/g, ""),
        });
        const previewUrl: string | undefined =
          nodemailer.getTestMessageUrl(info) || undefined;
        logger.warn("Primary SMTP failed; delivered via Ethereal instead", {
          to: params.to,
          previewUrl,
        });
        return {
          queued: true,
          mode: "ethereal",
          messageId: info.messageId,
          previewUrl,
          error: message,
        };
      } catch {
        // fall through to log mode
      }
    }

    if (process.env.NODE_ENV === "development") {
      logDevEmail(params);
      return { queued: true, mode: "log", error: message };
    }

    throw error;
  }
}

export function buildEmailTemplate(title: string, body: string) {
  const htmlBody = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("<br/>");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;background:#f6f6f6;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="color:#059669;margin:0 0 16px">PayForMe</h2>
    <h3 style="margin:0 0 12px">${title}</h3>
    <p style="color:#52525b;line-height:1.6">${htmlBody}</p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0"/>
    <p style="font-size:12px;color:#a1a1aa">© PayForMe — Rental Financing Platform</p>
  </div>
</body>
</html>`;
}

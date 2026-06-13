import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  });

  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = process.env.SMTP_FROM ?? "RentForMe <noreply@rentforme.com>";
  const transport = getTransporter();

  if (!transport) {
    logger.info("Email (dev mode — SMTP not configured)", {
      to: params.to,
      subject: params.subject,
    });
    return { queued: true, mode: "log" as const };
  }

  const info = await transport.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text ?? params.html.replace(/<[^>]+>/g, ""),
  });

  logger.info("Email sent", { messageId: info.messageId, to: params.to });
  return { queued: true, mode: "smtp" as const, messageId: info.messageId };
}

export function buildEmailTemplate(title: string, body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;background:#f6f6f6;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="color:#059669;margin:0 0 16px">RentForMe</h2>
    <h3 style="margin:0 0 12px">${title}</h3>
    <p style="color:#52525b;line-height:1.6">${body}</p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0"/>
    <p style="font-size:12px;color:#a1a1aa">© RentForMe — Rental Financing Platform</p>
  </div>
</body>
</html>`;
}

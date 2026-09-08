import { NextRequest } from "next/server";
import { z } from "zod";
import { apiResponse, withPublicHandler } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";
import { sendEmail, buildEmailTemplate } from "@/lib/services/email.service";
import { SUPPORT_EMAIL } from "@/constants/platform";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email address").max(254),
  subject: z.string().trim().min(3, "Subject is required").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
});

export const POST = withPublicHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400, "VALIDATION_ERROR");
  }

  const { name, email, subject, message } = parsed.data;

  const emailBody = [
    `New contact form submission from ${name} (${email})`,
    "",
    `Subject: ${subject}`,
    "",
    message,
  ].join("\n");

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[PayForMe Contact] ${subject}`,
    html: buildEmailTemplate(`Contact form: ${subject}`, emailBody),
    text: emailBody,
  });

  return apiResponse({ sent: true }, 200, "Your message has been sent. We will get back to you soon.");
});

import { describe, it, expect, afterEach } from "vitest";
import {
  buildEmailTemplate,
  isRealEmailConfigured,
  isResendConfigured,
  isSmtpConfigured,
} from "@/lib/services/email.service";

describe("Email service", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("builds an HTML template with title and body", () => {
    const html = buildEmailTemplate("Subject", "Message body");
    expect(html).toContain("Subject");
    expect(html).toContain("Message body");
    expect(html).toContain("PayForMe");
  });

  it("detects Resend configuration", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    expect(isResendConfigured()).toBe(true);
    expect(isRealEmailConfigured()).toBe(true);
  });

  it("detects SMTP configuration", () => {
    process.env.SMTP_HOST = "smtp.example.org";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "pass";
    expect(isSmtpConfigured()).toBe(true);
    expect(isRealEmailConfigured()).toBe(true);
  });
});

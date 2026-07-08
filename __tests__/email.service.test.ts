import { describe, it, expect } from "vitest";
import { buildEmailTemplate } from "@/lib/services/email.service";

describe("Email service", () => {
  it("builds an HTML template with title and body", () => {
    const html = buildEmailTemplate("Subject", "Message body");
    expect(html).toContain("Subject");
    expect(html).toContain("Message body");
    expect(html).toContain("PayForMe");
  });
});

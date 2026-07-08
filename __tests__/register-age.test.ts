import { describe, expect, it } from "vitest";
import { calculateAge, isAtLeastAge, parseDateOfBirth } from "@/lib/utils/age";
import { registerSchema } from "@/lib/validations/auth";

describe("age utils", () => {
  it("calculates age correctly before birthday", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 20, today.getMonth() + 1, today.getDate());
    expect(calculateAge(dob)).toBe(19);
  });

  it("validates minimum age", () => {
    const today = new Date();
    const adult = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    const minor = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    expect(isAtLeastAge(adult, 18)).toBe(true);
    expect(isAtLeastAge(minor, 18)).toBe(false);
  });

  it("parses valid date strings", () => {
    expect(parseDateOfBirth("2000-01-15")).toBeInstanceOf(Date);
    expect(parseDateOfBirth("invalid")).toBeNull();
  });
});

describe("registerSchema date of birth", () => {
  const base = {
    email: "user@example.com",
    password: "SecurePass1!",
    fullName: "Test User",
    role: "BUYER" as const,
    entityType: "INDIVIDUAL" as const,
  };

  it("requires date of birth for individual signups", () => {
    const result = registerSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "dateOfBirth")).toBe(true);
    }
  });

  it("rejects users under 18", () => {
    const today = new Date();
    const minorDob = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10);

    const result = registerSchema.safeParse({
      ...base,
      dateOfBirth: minorDob,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("18");
    }
  });

  it("accepts adults and skips DOB for company accounts", () => {
    const adultDob = "1995-06-15";
    const individual = registerSchema.safeParse({
      ...base,
      dateOfBirth: adultDob,
    });
    expect(individual.success).toBe(true);

    const company = registerSchema.safeParse({
      ...base,
      entityType: "COMPANY",
      companyName: "Acme Rentals Ltd",
    });
    expect(company.success).toBe(true);
  });
});

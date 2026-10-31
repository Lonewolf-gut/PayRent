import { describe, expect, it } from "vitest";
import {
  isSupabaseDatabaseUrl,
  normalizeDatabaseUrl,
} from "@/lib/db/database-url";

describe("normalizeDatabaseUrl", () => {
  it("adds sslmode and pgbouncer for Supabase pooler URLs", () => {
    const raw =
      "postgresql://postgres.abc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const normalized = normalizeDatabaseUrl(raw);
    expect(normalized).toContain("sslmode=require");
    expect(normalized).toContain("pgbouncer=true");
  });

  it("detects Supabase hosts", () => {
    expect(
      isSupabaseDatabaseUrl(
        "postgresql://u:p@db.x.supabase.co:5432/postgres"
      )
    ).toBe(true);
    expect(isSupabaseDatabaseUrl("postgresql://rentvest@localhost:5432/r")).toBe(
      false
    );
  it("adds pool_timeout for Supabase pooler URLs", () => {
    const raw =
      "postgresql://postgres.abc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const normalized = normalizeDatabaseUrl(raw);
    expect(normalized).toContain("pool_timeout=30");
    expect(normalized).toContain("connection_limit=10");
  });
});

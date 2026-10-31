/**
 * Check whether an email exists in the database the backend .env points at.
 * Usage: node scripts/check-login-email.js you@example.com
 */
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

require("./ensure-direct-url.js");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function redactDatabaseUrl(url) {
  if (!url) return "(missing)";
  try {
    const normalized = url.replace(/^postgresql:/, "postgres:");
    const u = new URL(normalized);
    const user = u.username ? u.username.slice(0, 12) + "…" : "";
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")} user=${user}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error("Usage: node scripts/check-login-email.js <email>");
    process.exit(1);
  }

  const normalized = normalizeEmail(emailArg);
  console.log("DATABASE_URL target:", redactDatabaseUrl(process.env.DATABASE_URL?.trim()));
  console.log("Lookup email (normalized):", normalized);
  console.log("");

  const prisma = new PrismaClient();
  try {
    let user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: { equals: normalized, mode: "insensitive" } },
        select: { id: true, email: true, role: true, isActive: true },
      });
    }

    if (!user) {
      const partial = await prisma.user.findMany({
        where: { email: { contains: normalized.split("@")[0], mode: "insensitive" } },
        take: 5,
        select: { email: true, role: true },
      });
      console.log("No user with that email in this database.");
      if (partial.length) {
        console.log("Similar emails in this database:");
        for (const row of partial) {
          console.log(`  - ${row.email} (${row.role})`);
        }
      } else {
        console.log("No similar emails found. Confirm Supabase project matches DATABASE_URL in .env.");
      }
      process.exit(2);
    }

    console.log("Found user:");
    console.log(JSON.stringify(user, null, 2));
    if (user.email !== normalized) {
      console.log("");
      console.log(
        "Note: stored email casing differs from normalized login. Run:",
        `UPDATE "User" SET email = '${normalized}' WHERE id = '${user.id}';`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

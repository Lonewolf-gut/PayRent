/**
 * Apply role-rebrand enum migration without local psql installed.
 *
 * Usage:
 *   npm run db:role-rebrand
 *
 * Requires Docker Postgres container `rentvest-postgres` (from npm run docker:up).
 *
 * Run this BEFORE `npx prisma db push` when upgrading to Buyer/Merchant/Marketer roles.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(__dirname, "..", "prisma", "sql", "role-rebrand-migration.sql");

function containerRunning(name) {
  try {
    const out = execSync(`docker inspect -f "{{.State.Running}}" ${name}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out === "true";
  } catch {
    return false;
  }
}

function runSql(sql, { ignoreMissing = false } = {}) {
  try {
    execSync("docker exec -i rentvest-postgres psql -U rentvest -d rentvest -v ON_ERROR_STOP=1", {
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
    });
    return true;
  } catch (error) {
    const message = String(error.stderr ?? error.stdout ?? error.message ?? error);
    if (ignoreMissing && /does not exist/i.test(message)) {
      return false;
    }
    throw new Error(message);
  }
}

function showEnumValues(enumName) {
  try {
    const out = execSync(
      `docker exec rentvest-postgres psql -U rentvest -d rentvest -t -A -c "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = '${enumName}' ORDER BY e.enumsortorder;"`,
      { encoding: "utf8" }
    );
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

if (!containerRunning("rentvest-postgres")) {
  console.error(
    "Postgres container 'rentvest-postgres' is not running.\n" +
      "Start it first: npm run docker:up\n" +
      "Then run: npm run db:role-rebrand"
  );
  process.exit(1);
}

console.log("Current UserRole values:", showEnumValues("UserRole").join(", ") || "(none)");

const steps = [
  `ALTER TYPE "UserRole" RENAME VALUE 'TENANT' TO 'BUYER';`,
  `ALTER TYPE "UserRole" RENAME VALUE 'LANDLORD' TO 'MERCHANT';`,
  `ALTER TYPE "UserRole" RENAME VALUE 'AGENT' TO 'MARKETER';`,
  `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMPLIANCE_OFFICER';`,
  `ALTER TYPE "WalletType" RENAME VALUE 'TENANT' TO 'BUYER';`,
  `ALTER TYPE "WalletType" RENAME VALUE 'LANDLORD' TO 'MERCHANT';`,
  `ALTER TYPE "WalletType" RENAME VALUE 'AGENT' TO 'MARKETER';`,
  `ALTER TYPE "BeneficiaryType" RENAME VALUE 'LANDLORD' TO 'MERCHANT';`,
  `ALTER TYPE "BeneficiaryType" RENAME VALUE 'AGENT' TO 'MARKETER';`,
];

for (const step of steps) {
  const label = step.replace(/\s+/g, " ").trim();
  try {
    const applied = runSql(step, { ignoreMissing: true });
    console.log(applied ? `✓ ${label}` : `· skipped (already applied): ${label}`);
  } catch (error) {
    console.error(`✗ failed: ${label}`);
    console.error(String(error.message ?? error));
    process.exit(1);
  }
}

console.log("\nUpdated UserRole values:", showEnumValues("UserRole").join(", ") || "(none)");

const userRole = showEnumValues("UserRole");
if (userRole.includes("TENANT") || userRole.includes("LANDLORD") || userRole.includes("AGENT")) {
  console.error(
    "\nOld enum values still present. Do NOT run `prisma db push` with data-loss yet.\n" +
      "Contact support or reset the dev database if this persists."
  );
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.warn("Warning: SQL file missing at", sqlPath);
}

console.log("\nRole rebrand migration complete.");
console.log("\nNext steps:");
console.log("  npx prisma db push");
console.log("  npx prisma generate");
console.log("  npm run copy-prisma-client");
console.log("  npm run db:seed");

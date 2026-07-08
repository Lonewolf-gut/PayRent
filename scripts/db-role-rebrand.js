/**
 * Apply role-rebrand enum migration without local psql installed.
 *
 * Usage:
 *   npm run db:role-rebrand
 *
 * Requires Docker Postgres container `rentvest-postgres` (from npm run docker:up).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(__dirname, "..", "prisma", "sql", "role-rebrand-migration.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

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

if (!containerRunning("rentvest-postgres")) {
  console.error(
    "Postgres container 'rentvest-postgres' is not running.\n" +
      "Start it first: npm run docker:up\n" +
      "Then run: npm run db:role-rebrand"
  );
  process.exit(1);
}

try {
  execSync("docker exec -i rentvest-postgres psql -U rentvest -d rentvest", {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log("Role rebrand migration applied via Docker Postgres.");
} catch (error) {
  const message = String(error.stderr ?? error.message ?? error);
  if (/TENANT|LANDLORD|AGENT/.test(message) && /does not exist/i.test(message)) {
    console.log(
      "Enum values may already be renamed (TENANT/LANDLORD/AGENT not found). Continuing…"
    );
  } else {
    console.error("Migration failed:", message);
    process.exit(1);
  }
}

console.log("\nNext steps:");
console.log("  npx prisma db push");
console.log("  npx prisma generate");
console.log("  npm run copy-prisma-client");
console.log("  npm run db:seed");

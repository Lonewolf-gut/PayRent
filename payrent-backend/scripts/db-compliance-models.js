/**
 * Apply compliance models migration without local psql installed.
 *
 * Usage:
 *   npm run db:compliance-models
 *
 * Requires Docker Postgres container `rentvest-postgres` (from npm run docker:up).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(__dirname, "..", "prisma", "sql", "compliance-models-migration.sql");
const DOCKER_TIMEOUT_MS = 45_000;

console.log("Compliance models: checking Docker Postgres…");

function dockerExec(command, options = {}) {
  return execSync(command, {
    encoding: "utf8",
    timeout: DOCKER_TIMEOUT_MS,
    ...options,
  });
}

function containerRunning(name) {
  try {
    const out = dockerExec(`docker inspect -f "{{.State.Running}}" ${name}`, {
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out === "true";
  } catch {
    return false;
  }
}

if (!containerRunning("rentvest-postgres")) {
  console.error(
    "\nPostgres container 'rentvest-postgres' is not running.\n" +
      "Start it first:\n" +
      "  npm run docker:up\n" +
      "Then run:\n" +
      "  npm run db:compliance-models"
  );
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error("SQL file not found:", sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");

try {
  dockerExec(
    "docker exec -i rentvest-postgres psql -U rentvest -d rentvest -v ON_ERROR_STOP=1",
    { input: sql, stdio: ["pipe", "pipe", "pipe"] }
  );
  console.log("✓ Compliance models migration applied.");
} catch (error) {
  console.error("Migration failed:", String(error.stderr ?? error.stdout ?? error.message ?? error));
  process.exit(1);
}

console.log("\nNext steps:");
console.log("  npx prisma db push");
console.log("  npx prisma generate");
console.log("  npm run copy-prisma-client");

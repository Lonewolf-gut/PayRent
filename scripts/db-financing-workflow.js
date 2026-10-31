/**
 * Apply financing workflow migration without local psql installed.
 *
 * Usage:
 *   npm run db:financing-workflow
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(__dirname, "..", "prisma", "sql", "financing-workflow-migration.sql");
const DOCKER_TIMEOUT_MS = 45_000;

console.log("Financing workflow: checking Docker Postgres…");

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
      "  npm run db:financing-workflow"
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
  console.log("✓ Financing workflow migration applied.");
} catch (error) {
  console.error("Migration failed:", String(error.stderr ?? error.stdout ?? error.message ?? error));
  process.exit(1);
}

console.log("\nNext steps:");
console.log("  npx prisma db push");
console.log("  npx prisma generate");
console.log("  npm run copy-prisma-client");

/**
 * Apply lastLoginAt column migration.
 * Usage: npm run db:user-last-login
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(__dirname, "..", "prisma", "sql", "user-last-login-migration.sql");

function containerRunning(name) {
  try {
    return (
      execSync(`docker inspect -f "{{.State.Running}}" ${name}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim() === "true"
    );
  } catch {
    return false;
  }
}

if (!containerRunning("rentvest-postgres")) {
  console.error("Postgres container 'rentvest-postgres' is not running. Run: npm run docker:up");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
execSync(
  "docker exec -i rentvest-postgres psql -U rentvest -d rentvest -v ON_ERROR_STOP=1",
  { input: sql, stdio: ["pipe", "inherit", "inherit"] }
);
console.log("✓ User lastLoginAt migration applied.");

/**
 * Add SSNIT + dashboard theme columns for profile and admin visibility.
 *
 * Usage: npm run db:ssnit-theme
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(__dirname, "..", "prisma", "sql", "ssnit-theme-migration.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

execSync("docker exec -i rentvest-postgres psql -U rentvest -d rentvest", {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
});

console.log("SSNIT and dashboard theme columns applied.");

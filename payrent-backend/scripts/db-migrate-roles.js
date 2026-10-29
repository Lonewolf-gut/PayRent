/**
 * Full role migration: rename enums in Postgres, then sync Prisma schema.
 * Windows-friendly — no local psql required.
 */
const { execSync } = require("child_process");

function run(command, label) {
  console.log(`\n[${label}] ${command}`);
  execSync(command, { stdio: "inherit", shell: true });
}

console.log("Starting full role migration (enum rename + prisma sync)…");
console.log("Step 1/4 usually finishes in under 30 seconds if Docker is running.\n");

run("node scripts/db-role-rebrand.js", "1/4 role-rebrand");
run("npx prisma db push", "2/4 prisma db push");
run("npx prisma generate", "3/4 prisma generate");
run("npm run copy-prisma-client", "4/4 copy prisma client");
console.log("\nDone. Optional: npm run db:seed");

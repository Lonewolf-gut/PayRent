/**
 * Full role migration: rename enums in Postgres, then sync Prisma schema.
 * Windows-friendly — no local psql required.
 */
const { execSync } = require("child_process");

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", shell: true });
}

run("node scripts/db-role-rebrand.js");
run("npx prisma db push");
run("npx prisma generate");
run("npm run copy-prisma-client");
console.log("\nOptional: npm run db:seed");

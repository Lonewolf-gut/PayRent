/**
 * Builds SQL for the full Prisma schema without connecting to the database.
 * Use when local `prisma db push` fails with P1001 (firewall / IPv6 / network restrictions).
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.join(__dirname, "..");
const outPath = path.join(projectRoot, "prisma", "supabase-bootstrap.sql");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--script",
  ],
  {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
  }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "prisma migrate diff failed");
  process.exit(result.status || 1);
}

const banner = `-- PayRent schema bootstrap (generated ${new Date().toISOString()})
-- Run in Supabase Dashboard → SQL Editor (new query → paste → Run).
-- Then locally: npm run db:generate && npm run dev

`;

fs.writeFileSync(outPath, banner + result.stdout, "utf8");
console.log(`Wrote ${outPath}`);
console.log("Open Supabase → SQL Editor, paste the file contents, and Run.");

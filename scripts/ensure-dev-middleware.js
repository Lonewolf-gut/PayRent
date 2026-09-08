/**
 * Dev only: restore middleware.ts from middleware.dev.ts
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const source = path.join(projectRoot, "middleware.dev.ts");
const target = path.join(projectRoot, "middleware.ts");

if (!fs.existsSync(source)) {
  console.warn("[dev middleware] middleware.dev.ts not found — running without middleware.");
  process.exit(0);
}

fs.copyFileSync(source, target);
console.log("[dev middleware] Enabled middleware.ts for development.");

/**
 * Guards split-repo production builds. Safe to run on every build.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");

function fail(message) {
  console.error(`\n[production setup] ${message}\n`);
  process.exit(1);
}

function warn(message) {
  console.warn(`[production setup] WARNING: ${message}`);
}

const proxyPath = path.join(projectRoot, "proxy.ts");
const middlewarePath = path.join(projectRoot, "middleware.ts");

if (fs.existsSync(proxyPath)) {
  if (fs.existsSync(middlewarePath)) {
    fs.rmSync(proxyPath, { force: true });
    console.log("[production setup] Removed legacy proxy.ts (middleware.ts is used instead).");
  } else {
    fs.renameSync(proxyPath, middlewarePath);
    let contents = fs.readFileSync(middlewarePath, "utf8");
    contents = contents.replace(
      /export\s+async\s+function\s+proxy\s*\(/,
      "export async function middleware("
    );
    fs.writeFileSync(middlewarePath, contents, "utf8");
    console.log("[production setup] Renamed proxy.ts → middleware.ts for production compatibility.");
  }
}

if (!fs.existsSync(middlewarePath)) {
  fail("middleware.ts is missing at project root.");
}

for (const marker of ["payrent-frontend", "payrent-backend"]) {
  if (fs.existsSync(path.join(projectRoot, marker))) {
    warn(`Found nested "${marker}/" folder — you may have the monorepo layout. Use sync branches instead.`);
  }
}

console.log("[production setup] OK");

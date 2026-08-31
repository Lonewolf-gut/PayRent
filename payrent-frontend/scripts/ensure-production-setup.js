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

// proxy.ts breaks npm start on Next.js 16 — must use middleware.ts
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
  fail(
    "middleware.ts is missing. Production requires middleware.ts at the project root.\n" +
      "Do not use proxy.ts — it causes 'manifests singleton' errors on npm start."
  );
}

// Detect leftover monorepo layout inside a split-repo folder
const monorepoMarkers = ["payrent-frontend", "payrent-backend"];
for (const marker of monorepoMarkers) {
  if (fs.existsSync(path.join(projectRoot, marker))) {
    warn(
      `Found nested "${marker}/" folder. You may have pulled the monorepo branch by mistake.\n` +
        "Use sync/payrent-frontend-5e51 only. Delete nested payrent-* folders."
    );
  }
}

const pkgPath = path.join(projectRoot, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
    warn(
      "package.json has workspaces — this is a monorepo root, not PayRent-Frontend.\n" +
        "Pull sync/payrent-frontend-5e51 into a clean folder."
    );
  }
}

console.log("[production setup] OK");

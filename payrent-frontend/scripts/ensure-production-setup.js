/**
 * Production builds must NOT include middleware.ts — it breaks npm start on
 * Next.js 16.2 + Windows (manifests singleton error). Auth is handled in layouts.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");

function warn(message) {
  console.warn(`[production setup] WARNING: ${message}`);
}

for (const legacy of ["proxy.ts", "middleware.ts"]) {
  const filePath = path.join(projectRoot, legacy);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
    console.log(`[production setup] Removed ${legacy} (not used in production builds).`);
  }
}

for (const marker of ["payrent-frontend", "payrent-backend"]) {
  if (fs.existsSync(path.join(projectRoot, marker))) {
    warn(
      `Found nested "${marker}/" folder. Pull sync/payrent-frontend-5e51 into a clean folder.`
    );
  }
}

const pkgPath = path.join(projectRoot, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
    warn("package.json has workspaces — this folder looks like a monorepo root, not PayRent-Frontend.");
  }
}

if (!fs.existsSync(path.join(projectRoot, "middleware.dev.ts"))) {
  console.warn("[production setup] middleware.dev.ts missing — dev auth middleware unavailable.");
}

console.log("[production setup] OK (production build without edge middleware).");

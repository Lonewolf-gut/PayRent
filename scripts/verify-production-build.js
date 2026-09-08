/**
 * Verifies .next is a complete production build safe for npm start.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const buildDir = path.join(projectRoot, ".next");

function fail(message) {
  console.error(`\n[verify build] ${message}\n`);
  process.exit(1);
}

const required = [
  "BUILD_ID",
  "routes-manifest.json",
  "build-manifest.json",
  path.join("server", "app-paths-manifest.json"),
];

const missing = required.filter((rel) => !fs.existsSync(path.join(buildDir, rel)));
if (missing.length > 0) {
  fail(
    "Production build is incomplete. Run:\n" +
      "  npm run prod\n\n" +
      `Missing: ${missing.join(", ")}`
  );
}

// middleware must NOT be present in production — it causes manifests singleton errors
const middlewareManifestPath = path.join(buildDir, "server", "middleware-manifest.json");
if (fs.existsSync(middlewareManifestPath)) {
  const middlewareManifest = JSON.parse(fs.readFileSync(middlewareManifestPath, "utf8"));
  if (middlewareManifest.middleware && Object.keys(middlewareManifest.middleware).length > 0) {
    fail(
      "Production build includes edge middleware, which breaks npm start on Windows.\n" +
        "Run: npm run clean && npm run build\n" +
        "Ensure middleware.ts is removed before build (prebuild script should do this)."
    );
  }
}

if (fs.existsSync(path.join(projectRoot, "middleware.ts")) || fs.existsSync(path.join(projectRoot, "proxy.ts"))) {
  fail(
    "middleware.ts or proxy.ts must not exist during production build.\n" +
      "Run npm run clean && npm run build again."
  );
}

console.log("[verify build] Production build OK.");

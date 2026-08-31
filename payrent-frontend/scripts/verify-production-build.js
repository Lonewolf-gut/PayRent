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
  path.join("server", "middleware-manifest.json"),
];

const missing = required.filter((rel) => !fs.existsSync(path.join(buildDir, rel)));
if (missing.length > 0) {
  fail(
    "Production build is incomplete. Run:\n" +
      "  npm run clean\n" +
      "  npm run build\n\n" +
      `Missing: ${missing.join(", ")}`
  );
}

const middlewareManifest = JSON.parse(
  fs.readFileSync(path.join(buildDir, "server", "middleware-manifest.json"), "utf8")
);

if (!middlewareManifest.middleware || Object.keys(middlewareManifest.middleware).length === 0) {
  fail(
    "middleware-manifest.json is empty — npm start will fail with 'manifests singleton'.\n" +
      "Cause: proxy.ts was used instead of middleware.ts.\n" +
      "Fix: ensure middleware.ts exists at project root, then npm run clean && npm run build"
  );
}

console.log("[verify build] Production build OK (middleware registered).");

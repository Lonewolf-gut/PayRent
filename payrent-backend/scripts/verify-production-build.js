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
      "  npm run clean\n" +
      "  npm run build\n\n" +
      `Missing: ${missing.join(", ")}`
  );
}

const middlewareManifestPath = path.join(buildDir, "server", "middleware-manifest.json");
if (fs.existsSync(middlewareManifestPath)) {
  const middlewareManifest = JSON.parse(fs.readFileSync(middlewareManifestPath, "utf8"));
  if (!middlewareManifest.middleware || Object.keys(middlewareManifest.middleware).length === 0) {
    fail(
      "middleware-manifest.json is empty. Rename proxy.ts to middleware.ts, then rebuild."
    );
  }
}

console.log("[verify build] Production build OK.");

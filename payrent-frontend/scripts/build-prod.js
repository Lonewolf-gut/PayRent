/**
 * One-shot production build: setup guards → clean → build → verify.
 * Usage: node scripts/build-prod.js
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function runStep(label, args) {
  console.log(`\n[prod] ${label}...`);
  const result = spawnSync(npmCmd, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

require("./ensure-production-setup.js");
runStep("Cleaning cache", ["run", "clean"]);
runStep("Building", ["run", "build"]);
require("./verify-production-build.js");

console.log("\n[prod] Build complete. Run: npm start\n");

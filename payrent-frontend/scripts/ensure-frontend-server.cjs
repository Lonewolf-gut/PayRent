#!/usr/bin/env node
/**
 * Local-friendly start: run production server when `.next` is a valid build,
 * otherwise clean stale output and start `next dev` (avoids manifests singleton crash).
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const nextDir = path.join(root, ".next");

function hasValidProductionBuild() {
  const required = [
    path.join(nextDir, "BUILD_ID"),
    path.join(nextDir, "routes-manifest.json"),
    path.join(nextDir, "build-manifest.json"),
    path.join(nextDir, "server"),
  ];
  return required.every((file) => fs.existsSync(file));
}

function removeNextOutput() {
  for (const dir of [".next", ".next-dev"]) {
    try {
      fs.rmSync(path.join(root, dir), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: root,
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

if (hasValidProductionBuild()) {
  run("npx", ["next", "start", "--port", "3000"]);
}

console.warn("");
console.warn("PayRent Frontend: no valid production build in .next/");
console.warn("Starting development server instead of `next start` (this avoids the manifests error).");
console.warn("");
console.warn("  Daily use:  npm run dev");
console.warn("  Production: npm run clean && npm run build && npm run start:prod");
console.warn("");

if (fs.existsSync(nextDir)) {
  console.warn("Removing stale .next output…");
  removeNextOutput();
}

run("npx", ["next", "dev", "--port", "3000", "--webpack"]);

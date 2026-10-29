#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const nextDir = path.join(process.cwd(), ".next");
const required = [
  path.join(nextDir, "BUILD_ID"),
  path.join(nextDir, "routes-manifest.json"),
  path.join(nextDir, "build-manifest.json"),
  path.join(nextDir, "server"),
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("");
  console.error("PayRent Frontend: production build is incomplete.");
  console.error("Missing:", missing.map((f) => path.relative(process.cwd(), f)).join(", "));
  console.error("");
  console.error("Run:");
  console.error("  npm run clean");
  console.error("  npm run build");
  console.error("  npm run start:prod");
  console.error("");
  process.exit(1);
}

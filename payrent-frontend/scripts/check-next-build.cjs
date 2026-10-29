#!/usr/bin/env node
/**
 * Guard `npm start` — Next.js throws "manifests singleton was not initialized"
 * when production server runs without a completed `next build`.
 */
const fs = require("node:fs");
const path = require("node:path");

const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");

if (!fs.existsSync(buildIdPath)) {
  console.error("");
  console.error("PayRent Frontend: no production build found in .next/");
  console.error("");
  console.error("  For local development (recommended):");
  console.error("    npm run clean");
  console.error("    npm run dev");
  console.error("");
  console.error("  For production mode:");
  console.error("    npm run clean");
  console.error("    npm run build");
  console.error("    npm start");
  console.error("");
  process.exit(1);
}

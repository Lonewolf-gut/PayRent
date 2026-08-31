const fs = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const projectRoot = path.join(__dirname, "..");
loadEnvConfig(projectRoot);

// Validate build before starting
require("./verify-production-build.js");

const port = String(process.env.PORT || "3000").replace(/"/g, "");
const isWindows = process.platform === "win32";

console.log(`Starting production server on http://localhost:${port}`);

const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: port,
};

// npx + shell is the most reliable way to start Next on Windows
const child = spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "-p", port], {
  stdio: "inherit",
  env,
  cwd: projectRoot,
  shell: isWindows,
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`\nServer stopped (${signal}).`);
  } else if (code && code !== 0) {
    console.error(`\nServer exited with code ${code}.`);
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

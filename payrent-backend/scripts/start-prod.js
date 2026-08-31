const { spawn } = require("node:child_process");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const projectRoot = path.join(__dirname, "..");
loadEnvConfig(projectRoot);

require("./verify-production-build.js");

const port = String(process.env.PORT || "3001").replace(/"/g, "");
const isWindows = process.platform === "win32";

console.log(`Starting production server on http://localhost:${port}`);

const child = spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "-p", port], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: port },
  cwd: projectRoot,
  shell: isWindows,
});

child.on("exit", (code, signal) => {
  if (signal) console.error(`\nServer stopped (${signal}).`);
  else if (code && code !== 0) console.error(`\nServer exited with code ${code}.`);
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

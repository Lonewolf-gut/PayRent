const { spawn } = require("node:child_process");
const path = require("node:path");

require("./stop-dev.js");
require("./remove-dev-cache-link.js");

const nodeOptions = [
  process.env.NODE_OPTIONS,
  "--max-old-space-size=8192",
]
  .filter(Boolean)
  .join(" ");

const projectRoot = path.join(__dirname, "..");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

console.log("");
console.log("Starting PayRent dev server (Turbopack)…");
console.log("After Ready, open http://localhost:3000 (or http://127.0.0.1:3000) — wait for GET / 200 in this terminal.");
console.log("If Turbopack crashes on CSS, run: npm run dev:webpack");
console.log("");

const child = spawn(
  process.execPath,
  [nextCli, "dev", "--turbopack", "--hostname", "0.0.0.0"],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    cwd: projectRoot,
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`\nDev server stopped (${signal}).`);
  } else if (code && code !== 0) {
    console.error(`\nDev server exited with code ${code}.`);
    console.error("Try: npm run dev:webpack");
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

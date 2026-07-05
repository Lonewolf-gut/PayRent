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
console.log("Starting PayRent dev server (webpack — slower, more stable on Windows)…");
console.log("First compile can take 2–5 minutes. Keep this terminal open.");
console.log("");

const child = spawn(
  process.execPath,
  [nextCli, "dev", "--webpack", "--hostname", "0.0.0.0"],
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
    console.error("Try: npm run clean && npm run dev:webpack");
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

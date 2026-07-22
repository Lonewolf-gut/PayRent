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

function resolveBundler() {
  const cliArg = process.argv.find((arg) => arg === "--webpack" || arg === "--turbo" || arg === "--turbopack");
  if (cliArg === "--webpack") return "webpack";
  if (cliArg === "--turbo" || cliArg === "--turbopack") return "turbopack";

  const forced = process.env.DEV_BUNDLER?.toLowerCase();
  if (forced === "webpack" || forced === "turbo" || forced === "turbopack") {
    return forced === "webpack" ? "webpack" : "turbopack";
  }

  return "turbopack";
}

const bundler = resolveBundler();
const bundlerArgs = bundler === "webpack" ? ["--webpack"] : ["--turbopack"];

console.log("");
if (bundler === "webpack") {
  console.log("Starting PayRent dev server (webpack)…");
  console.log("First compile can take 2–5 minutes. Keep this terminal open.");
} else {
  console.log("Starting PayRent dev server (Turbopack)…");
  if (process.platform === "win32") {
    console.log("If Turbopack crashes with memory errors, run: npm run dev:webpack");
  }
}
console.log("After Ready, open http://localhost:3000");
console.log("");

const child = spawn(
  process.execPath,
  [nextCli, "dev", ...bundlerArgs, "--hostname", "0.0.0.0"],
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
    if (bundler === "turbopack") {
      console.error("Try: npm run dev:webpack");
    } else {
      console.error("Try: npm run clean && npm run dev:webpack");
    }
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

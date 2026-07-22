const { spawn } = require("node:child_process");
const path = require("node:path");

require("./stop-dev.js");
require("./remove-dev-cache-link.js");

const { pruneTurbopackCache } = require("./prune-turbopack-cache.js");

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

if (bundler === "turbopack") {
  pruneTurbopackCache();
}

console.log("");
if (bundler === "webpack") {
  console.log("Starting PayRent dev server (webpack)…");
  console.log("First compile can take 2–5 minutes. Keep this terminal open.");
} else {
  console.log("Starting PayRent dev server (Turbopack)…");
  if (process.platform === "win32") {
    if (process.env.TURBOPACK_FS_CACHE !== "1") {
      console.log("Windows: Turbopack disk cache off (prevents paging-file crashes).");
      console.log("Faster warm starts: set TURBOPACK_FS_CACHE=1 in .env (needs a larger page file).");
    }
    console.log("Add this folder to Windows Defender exclusions if compiles stay slow.");
  }
}
console.log("After Ready, open http://localhost:3000");
if (process.platform === "win32") {
  console.log("503 on /api/*? Run: npm run bring-up  (starts Docker Postgres + Redis)");
  console.log("Check: http://localhost:3000/api/health");
}
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
      console.error("Try: npm run clean && npm run dev");
      console.error("Or: npm run dev:webpack");
      if (process.platform === "win32") {
        console.error("503 errors? Start Docker: docker compose up -d postgres redis");
      }
    } else {
      console.error("Try: npm run clean && npm run dev:webpack");
    }
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

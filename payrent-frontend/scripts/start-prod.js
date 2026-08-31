const fs = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const projectRoot = path.join(__dirname, "..");
loadEnvConfig(projectRoot);

const port = String(process.env.PORT || "3000").replace(/"/g, "");
const buildDir = path.join(projectRoot, ".next");

function resolveNextCli() {
  const candidates = [
    path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"),
    path.join(projectRoot, "..", "node_modules", "next", "dist", "bin", "next"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function assertProductionBuildReady() {
  const requiredPaths = [
    path.join(buildDir, "BUILD_ID"),
    path.join(buildDir, "routes-manifest.json"),
    path.join(buildDir, "build-manifest.json"),
    path.join(buildDir, "server", "app-paths-manifest.json"),
  ];

  const missing = requiredPaths.filter((filePath) => !fs.existsSync(filePath));
  if (missing.length === 0) return;

  console.error("");
  console.error("Production build is missing or incomplete.");
  console.error("Run a full build before `npm start`:");
  console.error("  npm run clean");
  console.error("  npm run build");
  console.error("");
  console.error("For local development, use `npm run dev` instead of `npm start`.");
  console.error("");
  for (const filePath of missing) {
    console.error(`Missing: ${path.relative(projectRoot, filePath)}`);
  }
  process.exit(1);
}

assertProductionBuildReady();

const nextCli = resolveNextCli();
const startArgs = nextCli
  ? [nextCli, "start", "--hostname", "0.0.0.0", "-p", port]
  : ["next", "start", "--hostname", "0.0.0.0", "-p", port];
const startCommand = nextCli ? process.execPath : "npx";

console.log(`Starting production server on http://localhost:${port}`);

const child = spawn(startCommand, startArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: port,
  },
  cwd: projectRoot,
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

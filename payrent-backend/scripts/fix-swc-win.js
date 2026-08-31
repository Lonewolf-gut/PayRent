/**
 * Reinstall @next/swc-win32-x64-msvc to match the installed next version.
 * Fixes "not a valid Win32 application" without a full node_modules reinstall.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");

if (process.platform !== "win32") {
  console.log("[fix-swc] Skipped (Windows only).");
  process.exit(0);
}

if (process.env.SKIP_FIX_SWC === "1") {
  console.log("[fix-swc] Skipped (SKIP_FIX_SWC=1).");
  process.exit(0);
}

const nextPkgPath = path.join(projectRoot, "node_modules", "next", "package.json");
if (!fs.existsSync(nextPkgPath)) {
  console.error("[fix-swc] Run npm install first — next is not installed.");
  process.exit(1);
}

const nextVersion = JSON.parse(fs.readFileSync(nextPkgPath, "utf8")).version;
const swcPackage = `@next/swc-win32-x64-msvc@${nextVersion}`;
const swcDir = path.join(projectRoot, "node_modules", "@next", "swc-win32-x64-msvc");
const swcBinary = path.join(swcDir, "next-swc.win32-x64-msvc.node");

function runNpm(args) {
  const command = ["npm", ...args].join(" ");
  console.log(`[fix-swc] Running: ${command}`);

  const result = spawnSync(command, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.error) {
    console.error("[fix-swc] npm spawn error:", result.error.message);
  }

  return result.status ?? 1;
}

function nativeSwcLooksValid() {
  if (!fs.existsSync(swcBinary)) return false;

  try {
    require(swcBinary);
    return true;
  } catch {
    return false;
  }
}

if (nativeSwcLooksValid()) {
  console.log(`[fix-swc] Native SWC for next@${nextVersion} is already loadable.`);
  process.exit(0);
}

console.log(`[fix-swc] Repairing ${swcPackage}...`);

if (fs.existsSync(swcDir)) {
  fs.rmSync(swcDir, { recursive: true, force: true });
}

let status = runNpm([
  "install",
  swcPackage,
  "--no-save",
  "--no-audit",
  "--no-fund",
  "--legacy-peer-deps",
]);

if (status === 0 && nativeSwcLooksValid()) {
  console.log("[fix-swc] Native SWC repaired.");
  process.exit(0);
}

console.warn("[fix-swc] Native SWC install failed or binary still invalid. Trying WASM fallback...");

status = runNpm([
  "install",
  `@next/swc-wasm-nodejs@${nextVersion}`,
  "--no-save",
  "--no-audit",
  "--no-fund",
  "--legacy-peer-deps",
]);

if (status !== 0) {
  console.error(
    [
      "[fix-swc] SWC repair failed.",
      "Manual fix (PowerShell):",
      `  Remove-Item -Recurse -Force node_modules\\@next\\swc-win32-x64-msvc -ErrorAction SilentlyContinue`,
      `  npm install ${swcPackage} --no-save --legacy-peer-deps`,
      "Or skip auto-fix for this run:",
      "  $env:SKIP_FIX_SWC=\"1\"; npm run build",
    ].join("\n")
  );
  process.exit(status);
}

console.log("[fix-swc] Installed WASM SWC fallback. Build may be slower but should work.");
process.exit(0);

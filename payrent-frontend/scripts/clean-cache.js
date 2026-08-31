const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execSync } = require("node:child_process");

const dirs = [
  ".next",
  ".next-dev",
  path.join(process.env.LOCALAPPDATA || os.tmpdir(), "PayRent", "next-dev"),
];

function removeDir(dir) {
  const fullPath = path.resolve(dir);

  try {
    if (
      process.platform === "win32" &&
      (dir === ".next-dev" || dir.endsWith("PayRent\\next-dev") || dir.endsWith("PayRent/next-dev")) &&
      fs.existsSync(fullPath)
    ) {
      try {
        execSync(`cmd /c rmdir "${fullPath}"`, { stdio: "ignore" });
        console.log("Removed", dir);
        return;
      } catch {
        // fall through
      }
    }

    fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
    console.log("Removed", dir);
  } catch (error) {
    if (process.platform === "win32") {
      try {
        execSync(
          `powershell -NoProfile -Command "Remove-Item -LiteralPath '${fullPath.replace(/'/g, "''")}' -Recurse -Force -ErrorAction Stop"`,
          { stdio: "ignore" }
        );
        console.log("Removed", dir);
        return;
      } catch {
        // fall through
      }
    }
    console.warn("Could not remove", dir, error instanceof Error ? error.message : error);
  }
}

for (const dir of dirs) {
  removeDir(dir);
}

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
        // fall through to recursive delete for normal folders
      }
    }

    fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
    console.log("Removed", dir);
    return;
  } catch (error) {
    if (process.platform === "win32") {
      try {
        execSync(`powershell -NoProfile -Command "Remove-Item -LiteralPath '${fullPath.replace(/'/g, "''")}' -Recurse -Force -ErrorAction Stop"`, {
          stdio: "ignore",
        });
        console.log("Removed", dir);
        return;
      } catch {
        // fall through
      }
    }

    if (error.code === "EPERM" || error.code === "ENOTEMPTY") {
      console.warn(`${dir}: locked or in use — stop \`npm run dev\` first, then run \`npm run clean\` again`);
    } else {
      console.warn(`${dir}:`, error.message);
    }
  }
}

for (const dir of dirs) {
  removeDir(dir);
}

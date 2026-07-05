const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execSync } = require("node:child_process");

const projectRoot = path.join(__dirname, "..");
const linkPath = path.join(projectRoot, ".next-dev");
const targetPath = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  "PayRent",
  "next-dev"
);

function isWindowsJunction(dirPath) {
  if (process.platform !== "win32" || !fs.existsSync(dirPath)) return false;
  try {
    const out = execSync(`cmd /c dir /AL "${path.dirname(dirPath)}"`, {
      encoding: "utf8",
    });
    const name = path.basename(dirPath);
    return (
      out.includes(`<JUNCTION>     ${name}`) ||
      out.includes(`<JUNCTION>     ${name} [`) ||
      out.includes(`<SYMLINKD>     ${name}`)
    );
  } catch {
    return false;
  }
}

/** Remove AppData junction — breaks Turbopack module resolution on Windows. */
function removeDevCacheLink() {
  if (process.platform !== "win32") return;

  if (fs.existsSync(linkPath) && isWindowsJunction(linkPath)) {
    execSync(`cmd /c rmdir "${linkPath}"`, { stdio: "inherit" });
    console.log("Removed .next-dev junction (use local cache folder instead).");
  }

  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5 });
    console.log("Removed AppData dev cache:", targetPath);
  }
}

removeDevCacheLink();

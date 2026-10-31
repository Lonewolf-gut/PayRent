const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
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
    return fs.lstatSync(dirPath).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Remove AppData junction — breaks Turbopack module resolution on Windows. */
function removeDevCacheLink() {
  if (process.platform !== "win32") return;

  if (fs.existsSync(linkPath) && isWindowsJunction(linkPath)) {
    fs.rmSync(linkPath, { recursive: true, force: true, maxRetries: 5 });
    console.log("Removed .next-dev junction (use local cache folder instead).");
  }

  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5 });
    console.log("Removed AppData dev cache:", targetPath);
  }
}

removeDevCacheLink();

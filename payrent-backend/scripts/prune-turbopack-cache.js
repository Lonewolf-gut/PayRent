const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const turbopackCacheDir = path.join(projectRoot, ".next-dev", "dev", "cache", "turbopack");

function pruneTurbopackCache(options = {}) {
  const { force = false } = options;

  if (process.platform !== "win32") return false;
  if (!force && process.env.TURBOPACK_FS_CACHE === "1") return false;
  if (!fs.existsSync(turbopackCacheDir)) return false;

  try {
    fs.rmSync(turbopackCacheDir, { recursive: true, force: true, maxRetries: 5 });
    console.log("Cleared Turbopack dev cache (avoids Windows paging-file / mmap crashes).");
    return true;
  } catch (error) {
    console.warn(
      "Could not clear Turbopack cache — stop the dev server, then run: npm run clean"
    );
    if (error instanceof Error) {
      console.warn(error.message);
    }
    return false;
  }
}

module.exports = { pruneTurbopackCache };

if (require.main === module) {
  pruneTurbopackCache({ force: true });
}

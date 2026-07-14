const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.join(__dirname, "..");
const prismaCliCandidates = [
  path.join(projectRoot, "node_modules", "prisma", "build", "index.js"),
  path.join(projectRoot, "node_modules", "prisma", "build", "child.js"),
];

const prismaClientDirs = [
  path.join(projectRoot, "node_modules", ".prisma", "client"),
  path.join(projectRoot, "node_modules", "@prisma", "client", ".prisma", "client"),
];

function resolvePrismaCli() {
  for (const candidate of prismaCliCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.error(
    [
      "Local Prisma CLI was not found. Install dependencies first:",
      "  npm install",
      "",
      "If install scripts were skipped, run:",
      "  npm install --include=dev",
      "  npm run db:generate",
    ].join("\n")
  );
  process.exit(1);
}

function removePathWithRetry(filePath, maxRetries = 5, delayMs = 500) {
  if (!fs.existsSync(filePath)) return false;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      console.log(`Removed: ${filePath}`);
      return true;
    } catch (error) {
      if (error.code === "EPERM" && attempt < maxRetries - 1) {
        console.warn(`EPERM on attempt ${attempt + 1}, retrying after ${delayMs}ms...`);
        const start = Date.now();
        while (Date.now() - start < delayMs) {
          // Busy wait for Windows file-handle release
        }
      } else {
        console.warn(`Unable to remove: ${filePath} - ${error.message}`);
        return false;
      }
    }
  }

  return false;
}

function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Synchronous delay without shelling out
  }
}

console.log("Cleaning stale Prisma client directories...");
let removedAny = false;
for (const prismaClientDir of prismaClientDirs) {
  if (!fs.existsSync(prismaClientDir)) continue;
  removedAny = removePathWithRetry(prismaClientDir) || removedAny;
}

if (removedAny) {
  console.log("Waiting for file handles to be released...");
  sleep(1000);
}

const prismaCli = resolvePrismaCli();
const prismaVersion = (() => {
  try {
    return require(path.join(projectRoot, "node_modules", "prisma", "package.json")).version;
  } catch {
    return "unknown";
  }
})();

console.log(`Running prisma generate (local prisma@${prismaVersion})...`);
const prismaResult = spawnSync(process.execPath, [prismaCli, "generate"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
  shell: false,
});

if (prismaResult.error) {
  console.error("Prisma generate failed:", prismaResult.error.message || prismaResult.error);
  process.exit(1);
}

if (prismaResult.status !== 0) {
  console.error(`Prisma generate exited with code ${prismaResult.status ?? "unknown"}`);
  process.exit(prismaResult.status || 1);
}

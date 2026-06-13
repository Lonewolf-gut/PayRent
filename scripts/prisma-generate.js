const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const prismaClientDirs = [
  path.join(__dirname, "..", "node_modules", ".prisma", "client"),
  path.join(__dirname, "..", "node_modules", "@prisma", "client", ".prisma", "client"),
];

function removePathWithRetry(filePath, maxRetries = 5, delayMs = 500) {
  if (!fs.existsSync(filePath)) return;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      console.log(`Removed: ${filePath}`);
      return;
    } catch (error) {
      if (error.code === "EPERM" && attempt < maxRetries - 1) {
        console.warn(`EPERM on attempt ${attempt + 1}, retrying after ${delayMs}ms...`);
        // Synchronous busy-wait
        const start = Date.now();
        while (Date.now() - start < delayMs) {
          // Busy wait
        }
      } else {
        console.warn(`Unable to remove: ${filePath} - ${error.message}`);
        return;
      }
    }
  }
}

console.log("Cleaning stale Prisma client directories...");
for (const prismaClientDir of prismaClientDirs) {
  if (!fs.existsSync(prismaClientDir)) continue;
  removePathWithRetry(prismaClientDir);
}

// Synchronous delay before Prisma generate to ensure file handles are released
console.log("Waiting for file handles to be released...");
const startWait = Date.now();
while (Date.now() - startWait < 1000) {
  // Busy wait 1 second
}

console.log("Running prisma generate...");
const env = { ...process.env };

const prismaResult = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  shell: true,
  env,
});

if (prismaResult.error) {
  console.error("Prisma generate failed:", prismaResult.error.message || prismaResult.error);
  process.exit(1);
}

process.exit(prismaResult.status || 0);


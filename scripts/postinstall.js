const { spawnSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const isWindows = process.platform === "win32";

function runStep(label, scriptPath) {
  console.log(`\n[postinstall] ${label}...`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });

  if (result.error) {
    console.error(`[postinstall] ${label} failed:`, result.error.message || result.error);
    return result.error.code === "ENOENT" ? 127 : 1;
  }

  return result.status ?? 1;
}

const generateStatus = runStep("Generating Prisma client", path.join(__dirname, "prisma-generate.js"));
if (generateStatus !== 0) {
  console.error(
    [
      "",
      "[postinstall] Prisma client generation failed.",
      isWindows
        ? "On Windows this often happens when npx downloads a newer Prisma version or a native binary cannot load."
        : "Check that devDependencies installed correctly and DATABASE_URL is optional for generate.",
      "",
      "Try:",
      "  npm install --ignore-scripts",
      "  npm run db:generate",
      "  npm run copy-prisma-client",
      "",
      "If that still fails, share the full output from npm run db:generate.",
    ].join("\n")
  );
  process.exit(generateStatus);
}

const copyStatus = runStep("Copying Prisma client", path.join(__dirname, "copy-prisma-client.js"));
if (copyStatus !== 0) {
  console.error(
    [
      "",
      "[postinstall] Prisma client copy failed.",
      "Run manually after generate succeeds:",
      "  npm run copy-prisma-client",
    ].join("\n")
  );
  process.exit(copyStatus);
}

console.log("\n[postinstall] Prisma client is ready.");

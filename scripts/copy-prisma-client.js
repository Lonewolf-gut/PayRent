const fs = require('node:fs');
const path = require('node:path');

const sourceCandidates = [
  path.join(__dirname, '..', 'node_modules', '.prisma', 'client'),
  path.join(__dirname, '..', '.prisma', 'client'),
  path.join(__dirname, '..', 'node_modules', '@prisma', 'client', '.prisma', 'client'),
];
const targetDir = path.join(__dirname, '..', 'node_modules', '@prisma', 'client', '.prisma', 'client');
const legacyPrismaDir = path.join(__dirname, '..', 'node_modules', '@prisma', 'client', '.prisma');

function removeLegacyFlatPrismaFiles() {
  if (!fs.existsSync(legacyPrismaDir)) return;

  for (const item of fs.readdirSync(legacyPrismaDir)) {
    if (item === 'client') continue;
    const itemPath = path.join(legacyPrismaDir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      fs.rmSync(itemPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(itemPath);
    }
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const sourceDir = sourceCandidates.find((dir) => fs.existsSync(dir));

if (!sourceDir) {
  throw new Error(
    `Prisma generated client not found. Run "npx prisma generate" first. Checked paths:\n- ${sourceCandidates.join("\n- ")}`
  );
}

removeLegacyFlatPrismaFiles();
copyDirectory(sourceDir, targetDir);
console.log(`Copied Prisma client from ${sourceDir} to ${targetDir}`);

const defaultDtsPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@prisma",
  "client",
  "default.d.ts"
);
const defaultDtsContent = 'export * from "./.prisma/client/default"\n';

fs.writeFileSync(defaultDtsPath, defaultDtsContent);
console.log(`Updated Prisma type entrypoint at ${defaultDtsPath}`);

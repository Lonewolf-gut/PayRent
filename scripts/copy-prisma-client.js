const fs = require('node:fs');
const path = require('node:path');

const sourceCandidates = [
  path.join(__dirname, '..', 'node_modules', '.prisma', 'client'),
  path.join(__dirname, '..', '.prisma', 'client'),
  path.join(__dirname, '..', 'node_modules', '@prisma', 'client', '.prisma', 'client'),
];
const targetDir = path.join(__dirname, '..', 'node_modules', '@prisma', 'client', '.prisma', 'client');

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

copyDirectory(sourceDir, targetDir);
console.log(`Copied Prisma client from ${sourceDir} to ${targetDir}`);

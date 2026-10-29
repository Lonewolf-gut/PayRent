/**
 * Generate PDF exports for integration documentation.
 * Usage: npm run docs:integrations-pdf
 */
const { execSync } = require("child_process");
const path = require("path");

const docsDir = path.join(__dirname, "..", "docs");

const files = [
  "company-onboarding-requirements.md",
  "sms-integration.md",
  "momo-integration.md",
  "cloud-storage-setup.md",
  "platform-integrations-guide.md",
];

for (const file of files) {
  const input = path.join(docsDir, file);
  console.log(`Generating PDF for ${file}...`);
  execSync(`npx --yes md-to-pdf "${input}"`, {
    cwd: docsDir,
    stdio: "inherit",
  });
}

console.log("✓ Integration documentation PDFs generated in docs/");

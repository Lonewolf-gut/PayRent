/**
 * Generate docs/bank-partner-api.pdf from docs/bank-partner-api.md
 * Usage: npm run docs:bank-partner-pdf
 */
const { execSync } = require("child_process");
const path = require("path");

const docsDir = path.join(__dirname, "..", "docs");
const input = path.join(docsDir, "bank-partner-api.md");

execSync(`npx --yes md-to-pdf "${input}"`, {
  cwd: docsDir,
  stdio: "inherit",
});

console.log("✓ Generated docs/bank-partner-api.pdf");

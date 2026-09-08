/**
 * Generate docs/integration-business-documents.pdf
 * Usage: npm run docs:kyb-matrix-pdf
 */
const { execSync } = require("child_process");
const path = require("path");

const docsDir = path.join(__dirname, "..", "docs");
const input = path.join(docsDir, "integration-business-documents.md");

execSync(`npx --yes md-to-pdf "${input}"`, {
  cwd: docsDir,
  stdio: "inherit",
});

console.log("✓ Generated docs/integration-business-documents.pdf");

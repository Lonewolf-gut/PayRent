const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const hasFinancingRequestDocument = typeof prisma.financingRequestDocument?.findMany === "function";
const hasLegacyTenantFinancingDocument =
  typeof prisma.tenantFinancingDocument?.findMany === "function";

if (!hasFinancingRequestDocument) {
  console.error(
    [
      "Prisma client is out of date (missing financingRequestDocument).",
      "Run in PayRent-Backend:",
      "  npm run db:generate",
      "Then restart: npm run dev",
    ].join("\n")
  );
  process.exit(1);
}

if (hasLegacyTenantFinancingDocument) {
  console.warn(
    "[prisma] Client still exposes tenantFinancingDocument (legacy). Regenerate after schema pull: npm run db:generate"
  );
}

console.log("[prisma] Client OK (FinancingRequestDocument).");

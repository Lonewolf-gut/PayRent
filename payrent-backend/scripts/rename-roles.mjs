#!/usr/bin/env node
/**
 * Bulk role rebrand: TENANT→BUYER, LANDLORD→MERCHANT, AGENT→MARKETER
 * Also renames dashboard/API URL segments.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".next-dev",
  ".git",
  "dist",
  "coverage",
]);

const REPLACEMENTS = [
  // Role enum strings (order: longer phrases first where needed)
  ['"TENANT"', '"BUYER"'],
  ["'TENANT'", "'BUYER'"],
  ['"LANDLORD"', '"MERCHANT"'],
  ["'LANDLORD'", "'MERCHANT'"],
  ['"AGENT"', '"MARKETER"'],
  ["'AGENT'", "'MARKETER'"],
  // URL path segments
  ["/dashboard/tenant", "/dashboard/buyer"],
  ["/dashboard/landlord", "/dashboard/merchant"],
  ["/dashboard/agent", "/dashboard/marketer"],
  ["/api/tenant/", "/api/buyer/"],
  ["/api/tenant", "/api/buyer"],
  ["/api/landlord/", "/api/merchant/"],
  ["/api/landlord", "/api/merchant"],
  ["/api/agent/", "/api/marketer/"],
  ["/api/agent", "/api/marketer"],
  // Query params
  ["role=TENANT", "role=BUYER"],
  ["role=LANDLORD", "role=MERCHANT"],
  ["role=AGENT", "role=MARKETER"],
  // Email domain
  ["@rentvest.com", "@payforme.com"],
  // Permission rename
  ["agent:manage", "marketer:manage"],
];

const EXTENSIONS = new Set([".ts", ".tsx", ".md", ".sql", ".js", ".mjs"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (EXTENSIONS.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

function applyReplacements(content) {
  let result = content;
  for (const [from, to] of REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  // Fix over-replacements in identifiers we must preserve
  result = result.replaceAll("MarketerProfile", "AgentProfile");
  result = result.replaceAll("prisma.marketerProfile", "prisma.agentProfile");
  result = result.replaceAll("db.marketerProfile", "db.agentProfile");
  result = result.replaceAll("MerchantProfile", "Landlord");
  result = result.replaceAll("prisma.merchant", "prisma.landlord");
  result = result.replaceAll("db.merchant", "db.landlord");
  result = result.replaceAll("BuyerProfile", "Tenant");
  result = result.replaceAll("prisma.buyer", "prisma.tenant");
  result = result.replaceAll("db.buyer", "db.tenant");
  result = result.replaceAll(".buyer.", ".tenant.");
  result = result.replaceAll("assignedMarketer", "assignedAgent");
  result = result.replaceAll("MarketerReferral", "AgentReferral");
  result = result.replaceAll("marketer-referral", "agent-referral");
  result = result.replaceAll("marketer-commission", "agent-commission");
  result = result.replaceAll("marketerCommission", "agentCommission");
  result = result.replaceAll("marketerReferral", "agentReferral");
  result = result.replaceAll("/api/marketers/", "/api/agents/");
  result = result.replaceAll("/api/marketers", "/api/agents");
  result = result.replaceAll("marketerUserId", "agentUserId");
  result = result.replaceAll("MarketerAssignment", "AgentAssignment");
  return result;
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  if (file.includes("scripts/rename-roles.mjs")) continue;
  const original = readFileSync(file, "utf8");
  const updated = applyReplacements(original);
  if (updated !== original) {
    writeFileSync(file, updated);
    changed += 1;
    console.log("updated:", file.replace(ROOT + "/", ""));
  }
}

console.log(`\nDone. ${changed} files updated.`);

/**
 * Prisma schema declares directUrl = env("DIRECT_URL").
 * Loads PayRent-Backend/.env before reading vars (Prisma loads .env only for its own CLI).
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const envPath = path.join(projectRoot, ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  let raw = fs.readFileSync(filePath, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

const envLoaded = loadEnvFile(envPath);

try {
  require("dotenv").config({ path: envPath, override: false });
} catch {
  // manual load above is enough
}

const generateOnly =
  process.argv.includes("--generate-only") ||
  process.env.PRISMA_GENERATE_SKIP_ENV === "1";

const direct = process.env.DIRECT_URL?.trim();
const database = process.env.DATABASE_URL?.trim();

if (!direct && database) {
  process.env.DIRECT_URL = database;
  if (!generateOnly) {
    console.warn(
      "[prisma] DIRECT_URL was missing — using DATABASE_URL. " +
        "Supabase pooler (port 6543): set DIRECT_URL to the direct connection (5432) in .env."
    );
  }
}

if (!process.env.DIRECT_URL?.trim()) {
  if (generateOnly) {
    process.env.DIRECT_URL =
      database ||
      "postgresql://prisma-generate-placeholder@127.0.0.1:5432/postgres?schema=public";
    module.exports = { envLoaded, generateOnly: true };
    return;
  }

  if (!envLoaded) {
    console.error(
      `No .env file at ${envPath}\n` +
        "Create PayRent-Backend/.env with DATABASE_URL (see .env.example or docs/supabase-database.md)."
    );
  } else if (!database) {
    console.error(
      ".env exists but DATABASE_URL is empty or not parsed.\n" +
        'Use one line: DATABASE_URL="postgresql://..." (UTF-8 file, not .env.txt).'
    );
  } else {
    console.error("Missing DIRECT_URL and DATABASE_URL in the environment.");
  }
  process.exit(1);
}

module.exports = { envLoaded, generateOnly: false };

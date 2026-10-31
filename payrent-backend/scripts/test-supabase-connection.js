/**
 * Tests TCP reachability to Supabase hosts in .env (no credentials sent).
 */
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

require("./ensure-direct-url.js");

function parseHostPort(urlString) {
  try {
    const normalized = urlString.replace(/^postgresql:/, "postgres:");
    const u = new URL(normalized);
    return {
      host: u.hostname,
      port: Number(u.port || 5432),
      label: urlString.includes(":6543") ? "pooler-6543" : "port-5432",
    };
  } catch {
    return null;
  }
}

function probe(host, port, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (ok, error) => {
      socket.destroy();
      resolve({ ok, error });
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false, "timeout"));
    socket.on("error", (err) => done(false, err.code || err.message));
  });
}

async function main() {
  const targets = [];
  const db = process.env.DATABASE_URL?.trim();
  const direct = process.env.DIRECT_URL?.trim();

  if (db) {
    const p = parseHostPort(db);
    if (p) targets.push({ name: "DATABASE_URL", ...p });
  }
  if (direct) {
    const p = parseHostPort(direct);
    if (p) targets.push({ name: "DIRECT_URL", ...p });
  }

  if (targets.length === 0) {
    console.error("No DATABASE_URL / DIRECT_URL in .env");
    process.exit(1);
  }

  console.log("Testing TCP (PostgreSQL ports must be open from your PC to Supabase):\n");

  let anyOk = false;
  for (const t of targets) {
    const result = await probe(t.host, t.port);
    const status = result.ok ? "OK" : "FAILED";
    console.log(
      `  ${t.name} → ${t.host}:${t.port}  ${status}` +
        (result.error ? ` (${result.error})` : "")
    );
    if (result.ok) anyOk = true;
  }

  console.log("");

  if (!anyOk) {
    console.log("No Supabase ports reachable. Typical fixes:");
    console.log("  1. Supabase Dashboard → Project Settings → Database → Network");
    console.log("     Disable IP restrictions or add your current public IP.");
    console.log("  2. Confirm the project is not paused.");
    console.log("  3. ISP/firewall blocking outbound 5432/6543 — try another network or VPN.");
    console.log("  4. Enable Supabase IPv4 add-on and use the IPv4 connection strings.");
    console.log("  5. Apply schema without local TCP: npm run db:export-schema-sql");
    console.log("     then run the SQL file in Supabase → SQL Editor.");
    process.exit(1);
  }

  if (targets.some((t) => t.name === "DIRECT_URL")) {
    const directTarget = targets.find((t) => t.name === "DIRECT_URL");
    const directResult = await probe(directTarget.host, directTarget.port);
    if (!directResult.ok) {
      console.log(
        "DIRECT_URL port is blocked but DATABASE_URL may work for the running app."
      );
      console.log("Use: npm run db:export-schema-sql  then paste SQL in Supabase SQL Editor.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

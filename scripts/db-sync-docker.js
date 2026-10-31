const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(__dirname, "..", "prisma", "sql", "sync-property-columns.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

execSync("docker exec -i rentvest-postgres psql -U rentvest -d rentvest", {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
});

console.log("Property columns synced via Docker Postgres.");

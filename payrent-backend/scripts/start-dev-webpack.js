// Backward-compatible alias — use: npm run dev (webpack on Windows) or npm run dev:webpack
process.argv.push("--webpack");
require("./start-dev.js");

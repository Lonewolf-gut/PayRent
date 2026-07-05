const { execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function killPort(port) {
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();

    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING")) continue;

      const match = trimmed.match(new RegExp(`:${port}\\s`, "i"));
      if (!match) continue;

      const pid = trimmed.split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== "0") {
        pids.add(pid);
      }
    }

    if (pids.size === 0) {
      console.log(`No process found on port ${port}`);
      return;
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${port}`);
      } catch {
        // already exited
      }
    }
  } catch {
    console.log(`No process found on port ${port}`);
  }
}

function killNextLock() {
  const lockPaths = [
    path.join(process.cwd(), ".next-dev", "dev", "lock"),
    path.join(process.env.LOCALAPPDATA || os.tmpdir(), "PayRent", "next-dev", "dev", "lock"),
  ];
  for (const lockPath of lockPaths) {
    try {
      fs.unlinkSync(lockPath);
      console.log("Removed stale dev lock:", lockPath);
    } catch {
      // no lock file
    }
  }
}

killPort(3000);
killPort(3001);
killNextLock();

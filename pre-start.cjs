const { execSync } = require('child_process');

// Get git hash with fallback
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git-info';
  }
};

// ---------------------------------------------------------------------------
// Kill any stale process occupying the dev port so restarts are clean.
// ---------------------------------------------------------------------------
const DEV_PORT = Number(process.env.PORT) || 5173;

function killStalePortProcess(port) {
  const isWin = process.platform === 'win32';

  try {
    if (isWin) {
      // netstat output: "  TCP  0.0.0.0:5173  0.0.0.0:0  LISTENING  12345"
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const pids = new Set();

      for (const line of out.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);

        if (pid && pid !== process.pid) {
          pids.add(pid);
        }
      }

      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
          console.log(`🧹 Killed stale process on port ${port} (PID ${pid})`);
        } catch {
          // Process may have already exited — ignore
        }
      }
    } else {
      // Unix: lsof gives clean PID output
      const out = execSync(`lsof -ti tcp:${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      for (const pidStr of out.trim().split('\n')) {
        const pid = parseInt(pidStr, 10);

        if (pid && pid !== process.pid) {
          try {
            process.kill(pid, 'SIGTERM');
            console.log(`🧹 Killed stale process on port ${port} (PID ${pid})`);
          } catch {
            // Process may have already exited — ignore
          }
        }
      }
    }
  } catch {
    // No process found on port — nothing to clean up (this is the happy path)
  }
}

killStalePortProcess(DEV_PORT);

let commitJson = {
  hash: JSON.stringify(getGitHash()),
  version: JSON.stringify(process.env.npm_package_version),
};

console.log(`
★═══════════════════════════════════════★
           D E V O N Z
         ⚡️  Welcome  ⚡️
★═══════════════════════════════════════★
`);
console.log('📍 Current Version Tag:', `v${commitJson.version}`);
console.log('📍 Current Commit Version:', commitJson.hash);
console.log('  Please wait until the URL appears here');
console.log('★═══════════════════════════════════════★');

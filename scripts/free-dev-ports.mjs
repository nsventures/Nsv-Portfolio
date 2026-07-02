/**
 * Free dev ports before npm run dev:all (Windows + Unix).
 */
import { execSync } from 'node:child_process'

const PORTS = [3001, 5173]

function freePortWin(port) {
  try {
    const out = execSync(
      `netstat -ano | findstr ":${port}" | findstr LISTENING`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    )
    const pids = new Set()
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/)
      const pid = Number(parts[parts.length - 1])
      if (pid > 0) pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`  freed port ${port} (pid ${pid})`)
      } catch {
        // already gone
      }
    }
  } catch {
    // nothing listening
  }
}

function freePortUnix(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim()
    if (!pids) return
    for (const pid of pids.split('\n')) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        console.log(`  freed port ${port} (pid ${pid})`)
      } catch {
        // ignore
      }
    }
  } catch {
    // nothing listening
  }
}

const free = process.platform === 'win32' ? freePortWin : freePortUnix

console.log('Checking dev ports…')
for (const port of PORTS) {
  free(port)
}

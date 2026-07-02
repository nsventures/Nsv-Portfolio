import { spawn } from 'node:child_process'

const extra = process.argv.slice(2)
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true })
  child.on('exit', (code) => process.exit(code ?? 0))
}

// Common typo: `npm run dev :all` passes ":all" to vite and breaks the site.
if (extra.some((arg) => arg === ':all' || arg === 'all')) {
  console.log('\n  Note: use `npm run dev:all` (no space). Starting both servers…\n')
  run(npmCmd, ['run', 'dev:all'])
} else {
  run('vite', extra)
}

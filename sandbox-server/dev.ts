import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const tsxBin = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')

const spawnChild = (command: string, args: string[]) =>
  spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const sandboxDevPort = process.env.SANDBOX_PORT ?? '4274'

// 后端使用 tsx watch，修改 Koa/认证/沙箱文件后会自动重启。
const sandbox = spawn(tsxBin, ['watch', '--clear-screen=false', 'sandbox-server/server.ts'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    // dev 默认避开 4273，减少与已运行实例冲突；仍可通过 SANDBOX_PORT 覆盖。
    SANDBOX_PORT: sandboxDevPort,
  },
})
const vite = spawnChild(npmBin, ['run', 'dev:web'])

const shutdown = (code = 0) => {
  sandbox.kill('SIGTERM')
  vite.kill('SIGTERM')
  process.exit(code)
}

sandbox.on('exit', (code) => {
  if (code && code !== 0) shutdown(code)
})

vite.on('exit', (code) => {
  shutdown(code ?? 0)
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const spawnChild = (command, args) =>
  spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

const sandbox = spawnChild(process.execPath, ['sandbox-server/server.mjs'])
const vite = spawnChild('npm', ['run', 'dev:web'])

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

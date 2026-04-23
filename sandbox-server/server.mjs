import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { cp, mkdir, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const sandboxRoot = path.join(os.tmpdir(), 'averontend-command-sandbox')
const port = Number(process.env.SANDBOX_PORT ?? 4273)
const image = process.env.SANDBOX_IMAGE ?? 'node:22-bookworm'
const maxBodyBytes = 32 * 1024
const maxOutputBytes = 200 * 1024

/** @type {Map<string, { id: string, workspaceDir: string, busy: boolean, createdAt: number }>} */
const sessions = new Map()

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > maxBodyBytes) {
        reject(new Error('请求体过大'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('JSON 解析失败'))
      }
    })
    req.on('error', reject)
  })

const copyFilter = (source) => {
  const rel = path.relative(repoRoot, source)
  if (!rel) return true
  const top = rel.split(path.sep)[0]
  if (top === '.git' || top === 'node_modules' || top === 'dist') return false
  if (top === 'sandbox-server') return false
  return true
}

const createSessionWorkspace = async (id) => {
  await mkdir(sandboxRoot, { recursive: true })
  const workspaceDir = path.join(sandboxRoot, id)
  await cp(repoRoot, workspaceDir, { recursive: true, filter: copyFilter })
  return workspaceDir
}

const destroySession = async (id) => {
  const session = sessions.get(id)
  if (!session) return false
  sessions.delete(id)
  await rm(session.workspaceDir, { recursive: true, force: true })
  return true
}

const truncate = (value) => {
  if (value.length <= maxOutputBytes) return value
  return `${value.slice(0, maxOutputBytes)}\n...[输出已截断]`
}

const runCommandInDocker = (workspaceDir, command, timeoutMs) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const dockerArgs = [
      'run',
      '--rm',
      '--init',
      '--cpus',
      '1.5',
      '--memory',
      '1g',
      '--pids-limit',
      '256',
      '-v',
      `${workspaceDir}:/workspace`,
      '-w',
      '/workspace',
      image,
      'bash',
      '-lc',
      `export npm_config_update_notifier=false npm_config_fund=false CI=true; ${command}`,
    ]

    const child = spawn('docker', dockerArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 2000)
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout = truncate(stdout + chunk.toString())
    })
    child.stderr.on('data', (chunk) => {
      stderr = truncate(stderr + chunk.toString())
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({
        exitCode: code ?? (timedOut ? 124 : 1),
        signal: signal ?? null,
        stdout,
        stderr,
        timedOut,
        elapsedMs: Date.now() - startedAt,
      })
    })
  })

await mkdir(sandboxRoot, { recursive: true })

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: '缺少 URL' })
    return
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  const url = new URL(req.url, `http://${req.headers.host ?? '127.0.0.1'}`)
  const pathname = url.pathname

  try {
    if (req.method === 'GET' && pathname === '/api/sandbox/status') {
      sendJson(res, 200, {
        ok: true,
        image,
        sessions: sessions.size,
      })
      return
    }

    if (req.method === 'POST' && pathname === '/api/sandbox/sessions') {
      const id = randomUUID()
      const workspaceDir = await createSessionWorkspace(id)
      const session = { id, workspaceDir, busy: false, createdAt: Date.now() }
      sessions.set(id, session)
      sendJson(res, 201, {
        id,
        workspaceDir,
      })
      return
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/sandbox/sessions/')) {
      const id = pathname.split('/').at(-1) ?? ''
      const deleted = await destroySession(id)
      sendJson(res, deleted ? 200 : 404, deleted ? { ok: true } : { error: '会话不存在' })
      return
    }

    if (req.method === 'POST' && pathname.endsWith('/exec')) {
      const parts = pathname.split('/').filter(Boolean)
      const id = parts.at(-2) ?? ''
      const session = sessions.get(id)
      if (!session) {
        sendJson(res, 404, { error: '会话不存在' })
        return
      }
      if (session.busy) {
        sendJson(res, 409, { error: '该会话正在执行命令，请稍后再试' })
        return
      }

      const body = await readJsonBody(req)
      const command = typeof body.command === 'string' ? body.command.trim() : ''
      const timeoutMs =
        typeof body.timeoutMs === 'number' && body.timeoutMs > 1000
          ? Math.min(body.timeoutMs, 5 * 60 * 1000)
          : 2 * 60 * 1000
      if (!command) {
        sendJson(res, 400, { error: '命令不能为空' })
        return
      }

      session.busy = true
      try {
        const result = await runCommandInDocker(session.workspaceDir, command, timeoutMs)
        sendJson(res, 200, {
          ...result,
          command,
          workspaceDir: session.workspaceDir,
        })
      } finally {
        session.busy = false
      }
      return
    }

    sendJson(res, 404, { error: '未找到接口' })
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`[sandbox-server] listening on http://127.0.0.1:${port}`)
  console.log(`[sandbox-server] docker image: ${image}`)
})

const shutdown = async () => {
  for (const id of [...sessions.keys()]) {
    await destroySession(id)
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

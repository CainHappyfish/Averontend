import Router from '@koa/router'
import Koa, { type Context, type Middleware } from 'koa'
import bodyParser from 'koa-bodyparser'
import serveStatic from 'koa-static'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createAuthSession as createDbAuthSession,
  createUser as createUserRecord,
  deleteAllSandboxSessionRecords,
  deleteAuthSession,
  deleteExpiredAuthSessions,
  deleteSandboxSessionRecord,
  getAuthSessionUser,
  getSandboxSessionRecordById,
  getSandboxSessionRecordByUserId,
  getUserProgress,
  listExpiredSandboxSessionRecords,
  saveUserProgress,
  touchAuthSession,
  touchSandboxSessionRecord,
  type SandboxSessionRecord,
  type UserProgressRecord,
  upsertSandboxSessionRecord,
  type UserRecord,
  verifyUserCredentials,
} from './auth-db.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const distDir = path.join(repoRoot, 'dist')
const publicDir = path.join(repoRoot, 'public')
const sandboxRoot = path.join(os.tmpdir(), 'averontend-command-sandbox')
const port = Number(process.env.SANDBOX_PORT ?? 4273)
const bindHost = process.env.SANDBOX_BIND_HOST ?? '127.0.0.1'
const configuredImage = process.env.SANDBOX_IMAGE ?? 'node:22-bookworm'
const previewBindHost = process.env.SANDBOX_PREVIEW_BIND_HOST ?? '127.0.0.1'
const previewPortStart = Number(process.env.SANDBOX_PREVIEW_PORT_START ?? 4500)
const previewPortEnd = Number(process.env.SANDBOX_PREVIEW_PORT_END ?? 4599)
const previewPublicHost = (process.env.SANDBOX_PREVIEW_PUBLIC_HOST ?? '').trim()
const previewPublicProto = (process.env.SANDBOX_PREVIEW_PUBLIC_PROTO ?? 'http').trim() || 'http'
const imageFallbackCandidates = [
  configuredImage,
  'node:22-bookworm',
  'node:22',
  'node:lts-bookworm',
  'node:lts',
  'node:20-bookworm',
  'node:20',
]
const maxBodyBytes = 64 * 1024
const maxOutputBytes = 300 * 1024
const devContainerPort = 5173
const metaDirName = '.averontend'
const htmlStart = '<!-- AVERO-HTML-START -->'
const htmlEnd = '<!-- AVERO-HTML-END -->'
const jsStart = '// AVERO-USER-START'
const jsEnd = '// AVERO-USER-END'
const authCookieName = 'averontend.sid'
const authSessionTtlMs = 7 * 24 * 60 * 60 * 1000
const sandboxIdleTimeoutMs = 30 * 60 * 1000
const sandboxMaxLifetimeMs = 4 * 60 * 60 * 1000
const gcIntervalMs = 60 * 1000

type ScriptLanguage = 'javascript' | 'typescript' | 'vue'
type SandboxMode = 'web' | 'vue'

interface Session {
  id: string
  userId: string
  workspaceDir: string
  containerId: string
  forwardedPort: number
  busy: boolean
  createdAt: number
  lastActiveAt: number
  expiresAt: number
  mode: SandboxMode
  language: ScriptLanguage
  image: string
  status: 'active' | 'stopped'
}

interface ShellResult {
  code: number
  signal: string | null
  stdout: string
  stderr: string
  timedOut: boolean
  elapsedMs: number
}

interface RequestBody {
  [key: string]: unknown
}

interface SandboxFiles {
  html: string
  css: string
  js: string
}

interface AuthState {
  user: UserRecord | null
  authSessionId: string | null
}

interface ProgressRequestBody {
  completedLessonIds?: unknown
  visitedLessonIds?: unknown
}

const sessions = new Map<string, Session>()

const truncate = (value: string) => {
  if (value.length <= maxOutputBytes) return value
  return `${value.slice(0, maxOutputBytes)}\n...[输出已截断]`
}

const formatDockerImageError = (rawError: unknown) => {
  const text = String(rawError || '').trim()
  if (!text) {
    return `启动 Docker 容器失败：无法获取镜像 ${configuredImage}。`
  }

  if (
    /Unable to find image/i.test(text) ||
    /pull access denied/i.test(text) ||
    /registry-1\.docker\.io/i.test(text) ||
    /context deadline exceeded/i.test(text)
  ) {
    return [
      `启动 Docker 容器失败：当前需要镜像 \`${configuredImage}\`，但 Docker 无法从 Docker Hub 拉取它。`,
      '常见原因：网络超时、未配置 Docker 镜像源，或本机还没有这个镜像。',
      `可选处理方式：`,
      `1. 手动执行 \`docker pull ${configuredImage}\` 后再重试。`,
      '2. 给 Docker 配置可用镜像源 / 代理，再重试。',
      '3. 如果你本机已有别的 Node 镜像，可先设置环境变量 `SANDBOX_IMAGE=<本地镜像名>` 再启动 `npm run sandbox:server`。',
      '',
      `Docker 原始错误：${text}`,
    ].join('\n')
  }

  return text
}

const shQuote = (value: string | number) => `'${String(value).replace(/'/g, `'\"'\"'`)}'`
const unique = <T>(list: T[]) => [...new Set(list.filter(Boolean))]
const isSandboxWorkspacePath = (value: string) =>
  value === sandboxRoot || value.startsWith(`${sandboxRoot}${path.sep}`)
const hasStaticDist = async () => {
  try {
    await readFile(path.join(distDir, 'index.html'), 'utf8')
    return true
  } catch {
    return false
  }
}

const runShell = (command: string, args: string[], timeoutMs = 30000) =>
  new Promise<ShellResult>((resolve, reject) => {
    const startedAt = Date.now()
    const child = spawn(command, args, {
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
        code: code ?? (timedOut ? 124 : 1),
        signal: signal ?? null,
        stdout,
        stderr,
        timedOut,
        elapsedMs: Date.now() - startedAt,
      })
    })
  })

const httpError = (status: number, message: string) => {
  const error = new Error(message) as Error & { status?: number }
  error.status = status
  return error
}

const getBody = (ctx: Context) => (ctx.request.body ?? {}) as RequestBody

const parseProgressBody = (body: ProgressRequestBody) => {
  const toLessonIds = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

  const completedLessonIds = toLessonIds(body.completedLessonIds)
  const visitedLessonIds = [...new Set([...toLessonIds(body.visitedLessonIds), ...completedLessonIds])]

  return { completedLessonIds, visitedLessonIds }
}

const parseLanguage = (value: unknown): ScriptLanguage =>
  value === 'typescript' || value === 'vue' ? value : 'javascript'

const detectMode = (language: ScriptLanguage): SandboxMode => (language === 'vue' ? 'vue' : 'web')

const getMainFilename = (language: ScriptLanguage) =>
  language === 'typescript' || language === 'vue' ? 'src/main.ts' : 'src/main.js'

const getEditableFileMap = (language: ScriptLanguage) =>
  language === 'vue'
    ? {
        html: 'src/App.vue',
        css: 'src/style.css',
        js: 'src/main.ts',
      }
    : {
        html: 'index.html',
        css: 'src/style.css',
        js: getMainFilename(language),
      }

const getSessionMetaPaths = (session: Pick<Session, 'workspaceDir'>) => {
  const metaDir = path.join(session.workspaceDir, metaDirName)
  return {
    metaDir,
    pidFile: path.join(metaDir, 'pid'),
    exitCodeFile: path.join(metaDir, 'exitcode'),
    terminalLogFile: path.join(metaDir, 'terminal.log'),
  }
}

const ensureMetaDir = async (session: Pick<Session, 'workspaceDir'>) => {
  const { metaDir } = getSessionMetaPaths(session)
  await mkdir(metaDir, { recursive: true })
}

const buildPackageJson = (mode: SandboxMode) =>
  JSON.stringify(
    mode === 'vue'
      ? {
          name: 'averontend-sandbox',
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: `vite --host 0.0.0.0 --port ${devContainerPort} --strictPort`,
            build: 'vite build',
          },
          dependencies: {
            vue: '^3.5.32',
          },
          devDependencies: {
            vite: '^8.0.9',
            '@vitejs/plugin-vue': '^6.0.6',
            typescript: '~6.0.2',
          },
        }
      : {
          name: 'averontend-sandbox',
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: `vite --host 0.0.0.0 --port ${devContainerPort} --strictPort`,
            build: 'vite build',
          },
          devDependencies: {
            vite: '^8.0.9',
            typescript: '~6.0.2',
          },
        },
    null,
    2,
  )

const buildIndexHtml = (html: string, language: ScriptLanguage) => {
  const mainFile = getMainFilename(language)
  if (language === 'vue') {
    return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Averontend Sandbox</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/${mainFile}"></script>
  </body>
</html>
`
  }

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Averontend Sandbox</title>
  </head>
  <body>
${htmlStart}
${html}
${htmlEnd}
    <script type="module" src="/${mainFile}"></script>
  </body>
</html>
`
}

const vueImportPreamble = `import {
  createApp,
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  readonly,
  shallowRef,
  shallowReactive,
  onMounted,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onUpdated,
  onBeforeUpdate,
  onErrorCaptured,
  provide,
  inject,
  h,
  nextTick,
  defineComponent,
  defineAsyncComponent,
  Teleport,
  Transition,
  TransitionGroup,
} from 'vue'
import './style.css'
`

const webImportPreamble = `import './style.css'
`

const consoleBridgePreamble = `if (!window.__AVERONTEND_CONSOLE_BRIDGE__) {
  window.__AVERONTEND_CONSOLE_BRIDGE__ = true
  const send = (type, payload) => {
    try {
      window.parent?.postMessage({ source: 'averontend-sandbox', type, payload }, '*')
    } catch {}
  }
  for (const method of ['log', 'warn', 'error', 'info']) {
    const original = console[method].bind(console)
    console[method] = (...args) => {
      send('console', {
        method,
        message: args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
      })
      original(...args)
    }
  }
  window.addEventListener('error', (event) => {
    send('runtime-error', event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    send('runtime-error', event.reason ? String(event.reason) : 'Promise rejected')
  })
}
`

const buildMainSource = (js: string, language: ScriptLanguage) => {
  const preamble = language === 'vue' ? vueImportPreamble : webImportPreamble
  return `${preamble}
${consoleBridgePreamble}
${jsStart}
${js}
${jsEnd}
`
}

const buildViteConfig = (mode: SandboxMode) =>
  mode === 'vue'
    ? `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
`
    : ''

const buildTsConfig = () => `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": false,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "types": []
  }
}
`

const extractBetween = (source: string, start: string, end: string) => {
  const s = source.indexOf(start)
  const e = source.lastIndexOf(end)
  if (s === -1 || e === -1 || e < s) return source
  return source.slice(s + start.length, e).replace(/^\n/, '').replace(/\n\s*$/, '\n')
}

const readMaybe = async (filePath: string) => {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

const writeSandboxFiles = async (workspaceDir: string, language: ScriptLanguage, files: SandboxFiles) => {
  await mkdir(path.join(workspaceDir, 'src'), { recursive: true })
  const mode = detectMode(language)
  await writeFile(path.join(workspaceDir, 'package.json'), buildPackageJson(mode), 'utf8')
  await writeFile(path.join(workspaceDir, 'tsconfig.json'), buildTsConfig(), 'utf8')
  const viteConfig = buildViteConfig(mode)
  if (viteConfig) {
    await writeFile(path.join(workspaceDir, 'vite.config.ts'), viteConfig, 'utf8')
  } else {
    await rm(path.join(workspaceDir, 'vite.config.ts'), { force: true })
  }
  if (language === 'vue') {
    await writeFile(path.join(workspaceDir, 'index.html'), buildIndexHtml('', language), 'utf8')
    await writeFile(path.join(workspaceDir, 'src/App.vue'), files.html, 'utf8')
    await writeFile(path.join(workspaceDir, 'src/style.css'), files.css, 'utf8')
    await writeFile(path.join(workspaceDir, 'src/main.ts'), files.js, 'utf8')
    return
  }
  await writeFile(path.join(workspaceDir, 'index.html'), buildIndexHtml(files.html, language), 'utf8')
  await writeFile(path.join(workspaceDir, 'src/style.css'), files.css, 'utf8')
  await writeFile(path.join(workspaceDir, getMainFilename(language)), buildMainSource(files.js, language), 'utf8')
}

const readSandboxFiles = async (workspaceDir: string, language: ScriptLanguage) => {
  if (language === 'vue') {
    return {
      files: {
        html: await readMaybe(path.join(workspaceDir, 'src/App.vue')),
        css: await readMaybe(path.join(workspaceDir, 'src/style.css')),
        js: await readMaybe(path.join(workspaceDir, 'src/main.ts')),
      },
      labels: getEditableFileMap(language),
    }
  }
  const mainFile = path.join(workspaceDir, getMainFilename(language))
  const html = extractBetween(await readMaybe(path.join(workspaceDir, 'index.html')), htmlStart, htmlEnd)
  const css = await readMaybe(path.join(workspaceDir, 'src/style.css'))
  const js = extractBetween(await readMaybe(mainFile), jsStart, jsEnd)
  return {
    files: { html, css, js },
    labels: getEditableFileMap(language),
  }
}

const dockerImageExistsLocally = async (imageName: string) => {
  const result = await runShell('docker', ['image', 'inspect', imageName], 15000)
  return result.code === 0
}

const resolveSandboxImage = async () => {
  const candidates = unique(imageFallbackCandidates)
  for (const imageName of candidates) {
    if (await dockerImageExistsLocally(imageName)) {
      return {
        image: imageName,
        source: imageName === configuredImage ? 'configured-local' : 'fallback-local',
      }
    }
  }
  return {
    image: configuredImage,
    source: 'pull-configured',
  }
}

const isPortAvailable = (host: string, portToCheck: number) =>
  new Promise<boolean>((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(portToCheck, host)
  })

const allocatePreviewPort = async () => {
  const used = new Set([...sessions.values()].map((session) => session.forwardedPort))
  for (let portCandidate = previewPortStart; portCandidate <= previewPortEnd; portCandidate += 1) {
    if (used.has(portCandidate)) continue
    if (await isPortAvailable(previewBindHost, portCandidate)) return portCandidate
  }
  throw httpError(503, `预览端口池已耗尽，请扩大 ${previewPortStart}-${previewPortEnd} 范围`)
}

const getPreviewUrl = (forwardedPort: number) => {
  if (previewPublicHost) {
    return `${previewPublicProto}://${previewPublicHost}:${forwardedPort}`
  }
  if (previewBindHost === '0.0.0.0') {
    return `${previewPublicProto}://127.0.0.1:${forwardedPort}`
  }
  return `http://${previewBindHost}:${forwardedPort}`
}

const createSessionWorkspace = async (id: string, language: ScriptLanguage, files: SandboxFiles) => {
  await mkdir(sandboxRoot, { recursive: true })
  const workspaceDir = path.join(sandboxRoot, id)
  await mkdir(workspaceDir, { recursive: true })
  await writeSandboxFiles(workspaceDir, language, files)
  return workspaceDir
}

const createContainer = async (workspaceDir: string) => {
  const resolved = await resolveSandboxImage()
  const previewPort = await allocatePreviewPort()
  const result = await runShell(
    'docker',
    [
      'run',
      '-d',
      '--rm',
      '--init',
      '--cpus',
      '1.5',
      '--memory',
      '1g',
      '--pids-limit',
      '256',
      '-p',
      `${previewBindHost}:${previewPort}:${devContainerPort}`,
      '-v',
      `${workspaceDir}:/workspace`,
      '-w',
      '/workspace',
      resolved.image,
      'sleep',
      'infinity',
    ],
    60000,
  )
  if (result.code !== 0) {
    throw httpError(500, formatDockerImageError(result.stderr || result.stdout || '启动 Docker 容器失败'))
  }
  return {
    containerId: result.stdout.trim(),
    forwardedPort: previewPort,
    image: resolved.image,
  }
}

const dockerExec = (session: Pick<Session, 'containerId'>, command: string, timeoutMs = 30000) =>
  runShell('docker', ['exec', session.containerId, 'bash', '-lc', command], timeoutMs)

const dockerExecInWorkspace = (session: Pick<Session, 'containerId'>, command: string, timeoutMs = 30000) =>
  dockerExec(session, `cd /workspace && export npm_config_update_notifier=false npm_config_fund=false CI=true; ${command}`, timeoutMs)

const ensureDevCommandReady = (command: string) => {
  const trimmed = String(command).trim()
  if (!trimmed) return trimmed
  const isDevServerCommand =
    /^npm\s+run\s+dev\b/.test(trimmed) ||
    /^npm\s+exec\s+vite\b/.test(trimmed) ||
    /^npx\s+vite\b/.test(trimmed) ||
    /^vite\b/.test(trimmed)
  if (!isDevServerCommand) return trimmed
  return [
    "if [ ! -f package.json ]; then echo 'package.json not found in /workspace' >&2; exit 1; fi",
    "if [ ! -x node_modules/.bin/vite ]; then npm install; fi",
    trimmed,
  ].join(' && ')
}

const cleanupDevServerProcesses = async (session: Pick<Session, 'containerId'>) => {
  await dockerExec(
    session,
    [
      `if command -v pkill >/dev/null 2>&1; then pkill -f ${shQuote(`vite --host 0.0.0.0 --port ${devContainerPort} --strictPort`)} 2>/dev/null || true; fi`,
      `if command -v pkill >/dev/null 2>&1; then pkill -f ${shQuote('/workspace/node_modules/.bin/vite')} 2>/dev/null || true; fi`,
      `if command -v fuser >/dev/null 2>&1; then fuser -k ${devContainerPort}/tcp 2>/dev/null || true; fi`,
      `if command -v lsof >/dev/null 2>&1; then lsof -ti tcp:${devContainerPort} | xargs -r kill -9 2>/dev/null || true; fi`,
    ].join('; '),
    15000,
  )
}

const probePreviewReady = (portToProbe: number, timeoutMs = 1200) =>
  new Promise<boolean>((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port: portToProbe, path: '/', timeout: timeoutMs },
      (res) => {
        res.resume()
        resolve((res.statusCode ?? 500) < 500)
      },
    )
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.on('error', () => resolve(false))
  })

const toSandboxRecord = (session: Session): SandboxSessionRecord => ({
  id: session.id,
  userId: session.userId,
  workspaceDir: session.workspaceDir,
  containerId: session.containerId,
  forwardedPort: session.forwardedPort,
  image: session.image,
  language: session.language,
  mode: session.mode,
  status: session.status,
  createdAt: session.createdAt,
  lastActiveAt: session.lastActiveAt,
  expiresAt: session.expiresAt,
})

const touchSession = (session: Session, status: Session['status'] = session.status) => {
  session.lastActiveAt = Date.now()
  session.status = status
  touchSandboxSessionRecord(session.id, session.lastActiveAt, status)
}

const getProcessStatus = async (session: Session) => {
  const { pidFile, exitCodeFile, terminalLogFile } = getSessionMetaPaths(session)
  const pid = (await readMaybe(pidFile)).trim()
  let running = false
  if (pid) {
    const probe = await dockerExec(session, `kill -0 ${shQuote(pid)} 2>/dev/null; echo $?`, 10000)
    running = probe.stdout.trim().endsWith('0')
  }
  return {
    running,
    pid,
    exitCode: (await readMaybe(exitCodeFile)).trim(),
    log: await readMaybe(terminalLogFile),
    previewReady: running ? await probePreviewReady(session.forwardedPort) : false,
  }
}

const stopBackgroundProcess = async (session: Session) => {
  const { pidFile } = getSessionMetaPaths(session)
  const pid = (await readMaybe(pidFile)).trim()
  if (pid) {
    await dockerExec(
      session,
      [
        `kill -TERM -- -${shQuote(pid)} 2>/dev/null || true`,
        `kill ${shQuote(pid)} 2>/dev/null || true`,
        'sleep 1',
        `kill -KILL -- -${shQuote(pid)} 2>/dev/null || true`,
        `kill -9 ${shQuote(pid)} 2>/dev/null || true`,
      ].join('; '),
      10000,
    )
  }
  await cleanupDevServerProcesses(session)
}

const startBackgroundProcess = async (session: Session, command: string) => {
  await ensureMetaDir(session)
  await stopBackgroundProcess(session)
  const preparedCommand = ensureDevCommandReady(command)
  const { terminalLogFile, exitCodeFile, pidFile } = getSessionMetaPaths(session)
  const relativeLog = path.relative(session.workspaceDir, terminalLogFile)
  const relativeExit = path.relative(session.workspaceDir, exitCodeFile)
  const relativePid = path.relative(session.workspaceDir, pidFile)
  const inner = [
    'cd /workspace',
    `mkdir -p ${shQuote(metaDirName)}`,
    `: > ${shQuote(relativeLog)}`,
    `rm -f ${shQuote(relativeExit)} ${shQuote(relativePid)}`,
    `echo $$ > ${shQuote(relativePid)}`,
    `bash -lc ${shQuote(`export npm_config_update_notifier=false npm_config_fund=false CI=true; ${preparedCommand}`)} > ${shQuote(relativeLog)} 2>&1`,
    `printf '%s' $? > ${shQuote(relativeExit)}`,
  ].join('; ')
  const result = await runShell('docker', ['exec', '-d', session.containerId, 'bash', '-lc', inner], 30000)
  if (result.code !== 0) throw httpError(500, result.stderr || result.stdout || '启动后台进程失败')
  touchSession(session, 'active')
}

const bootstrapSessionDependencies = async (session: Session) => {
  if (session.language !== 'vue') return
  const result = await dockerExecInWorkspace(session, 'npm install', 10 * 60 * 1000)
  if (result.code !== 0) throw httpError(500, result.stderr || result.stdout || '初始化 Vue 沙箱依赖失败')
}

const cleanupStaleSandboxArtifacts = async () => {
  await mkdir(sandboxRoot, { recursive: true })
  const ps = await runShell('docker', ['ps', '-q'], 30000)
  const ids = unique(
    (ps.stdout || '')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )

  let removedContainers = 0
  for (const id of ids) {
    const inspect = await runShell(
      'docker',
      ['inspect', id, '--format', '{{range .Mounts}}{{printf "%s\t%s\n" .Source .Destination}}{{end}}'],
      30000,
    )
    if (inspect.code !== 0) continue
    const mounts = (inspect.stdout || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const isSandboxContainer = mounts.some((line) => {
      const [source, destination] = line.split('\t')
      return isSandboxWorkspacePath(source) && destination === '/workspace'
    })
    if (!isSandboxContainer) continue
    const removed = await runShell('docker', ['rm', '-f', id], 30000)
    if (removed.code === 0) removedContainers += 1
  }

  await rm(sandboxRoot, { recursive: true, force: true })
  await mkdir(sandboxRoot, { recursive: true })
  deleteAllSandboxSessionRecords()
  if (removedContainers > 0) {
    console.log(`[sandbox-server] cleaned ${removedContainers} stale sandbox container(s)`)
  }
}

const destroySession = async (id: string) => {
  const live = sessions.get(id)
  const record = live ? toSandboxRecord(live) : getSandboxSessionRecordById(id)
  if (!record) return false
  sessions.delete(record.id)
  deleteSandboxSessionRecord(record.id)
  try {
    const liveSession: Session =
      live ??
      {
        id: record.id,
        userId: record.userId,
        workspaceDir: record.workspaceDir,
        containerId: record.containerId,
        forwardedPort: record.forwardedPort,
        image: record.image,
        busy: false,
        createdAt: record.createdAt,
        lastActiveAt: record.lastActiveAt,
        expiresAt: record.expiresAt,
        mode: record.mode as SandboxMode,
        language: record.language as ScriptLanguage,
        status: record.status as Session['status'],
      }
    await stopBackgroundProcess(liveSession)
    await runShell('docker', ['rm', '-f', record.containerId], 30000)
  } catch {
    // ignore
  }
  await rm(record.workspaceDir, { recursive: true, force: true })
  return true
}

const destroyUserSandbox = async (userId: string) => {
  const record = getSandboxSessionRecordByUserId(userId)
  if (!record) return false
  return destroySession(record.id)
}

const createSessionForUser = async (userId: string, language: ScriptLanguage, files: SandboxFiles) => {
  const id = randomUUID()
  const now = Date.now()
  const workspaceDir = await createSessionWorkspace(id, language, files)
  const container = await createContainer(workspaceDir)
  const session: Session = {
    id,
    userId,
    workspaceDir,
    containerId: container.containerId,
    forwardedPort: container.forwardedPort,
    image: container.image,
    busy: false,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: now + sandboxMaxLifetimeMs,
    mode: detectMode(language),
    language,
    status: 'active',
  }
  sessions.set(id, session)
  upsertSandboxSessionRecord(toSandboxRecord(session))
  await ensureMetaDir(session)
  await bootstrapSessionDependencies(session)
  return session
}

const getOrCreateSandboxSession = async (userId: string, language: ScriptLanguage, files: SandboxFiles) => {
  const record = getSandboxSessionRecordByUserId(userId)
  if (record) {
    const live = sessions.get(record.id)
    if (live) {
      const expired = Date.now() >= live.expiresAt || Date.now() - live.lastActiveAt >= sandboxIdleTimeoutMs
      if (expired || live.language !== language) {
        await destroySession(live.id)
      } else {
        touchSession(live)
        await writeSandboxFiles(live.workspaceDir, live.language, files)
        return live
      }
    } else {
      await destroySession(record.id)
    }
  }
  return createSessionForUser(userId, language, files)
}

const sanitizeFiles = (body: RequestBody): SandboxFiles => ({
  html: typeof body.files === 'object' && body.files && typeof (body.files as RequestBody).html === 'string'
    ? ((body.files as RequestBody).html as string)
    : '<main></main>',
  css: typeof body.files === 'object' && body.files && typeof (body.files as RequestBody).css === 'string'
    ? ((body.files as RequestBody).css as string)
    : '',
  js: typeof body.files === 'object' && body.files && typeof (body.files as RequestBody).js === 'string'
    ? ((body.files as RequestBody).js as string)
    : '',
})

const setAuthCookie = (ctx: Context, sessionId: string) => {
  ctx.cookies.set(authCookieName, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    overwrite: true,
    path: '/',
    maxAge: authSessionTtlMs,
  })
}

const clearAuthCookie = (ctx: Context) => {
  ctx.cookies.set(authCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    overwrite: true,
    path: '/',
    expires: new Date(0),
  })
}

const resolveAuthState = (ctx: Context, { touch = true } = {}): AuthState => {
  const sessionId = ctx.cookies.get(authCookieName) ?? null
  const record = getAuthSessionUser(sessionId ?? undefined)
  if (!record || record.expiresAt <= Date.now()) {
    if (sessionId) deleteAuthSession(sessionId)
    clearAuthCookie(ctx)
    return { user: null, authSessionId: null }
  }
  if (touch) touchAuthSession(record.id, authSessionTtlMs)
  return {
    user: {
      id: record.userId,
      username: record.username,
      createdAt: record.createdAt,
    },
    authSessionId: record.id,
  }
}

const authOptional: Middleware = async (ctx, next) => {
  const auth = resolveAuthState(ctx)
  ctx.state.auth = auth
  await next()
}

const requireAuth: Middleware = async (ctx, next) => {
  const auth = resolveAuthState(ctx)
  ctx.state.auth = auth
  if (!auth.user) throw httpError(401, '请先登录')
  await next()
}

const getAuthedUser = (ctx: Context) => {
  const auth = ctx.state.auth as AuthState | undefined
  if (!auth?.user) throw httpError(401, '请先登录')
  return auth.user
}

const getOwnedSession = (ctx: Context, id: string) => {
  const user = getAuthedUser(ctx)
  const record = getSandboxSessionRecordById(id)
  if (!record || record.userId !== user.id) throw httpError(404, '会话不存在')
  const live = sessions.get(id)
  if (!live) {
    deleteSandboxSessionRecord(id)
    throw httpError(404, '会话不存在')
  }
  touchSession(live)
  return live
}

const gcExpiredSessions = async () => {
  deleteExpiredAuthSessions()
  const expired = listExpiredSandboxSessionRecords(Date.now(), sandboxIdleTimeoutMs)
  for (const record of expired) {
    await destroySession(record.id)
  }
}

await cleanupStaleSandboxArtifacts()

const app = new Koa()
const router = new Router()

app.use(async (ctx, next) => {
  ctx.set('Cache-Control', 'no-store')
  try {
    await next()
  } catch (error) {
    const status = typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 500
    ctx.status = status
    ctx.body = {
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

app.use(bodyParser({ jsonLimit: `${maxBodyBytes}b` }))
app.use(serveStatic(publicDir, { index: false }))
app.use(serveStatic(distDir, { index: false }))

router.get('/api/auth/me', authOptional, (ctx) => {
  const auth = (ctx.state.auth as AuthState | undefined) ?? { user: null }
  ctx.body = auth.user ? { authenticated: true, user: auth.user } : { authenticated: false }
})

router.post('/api/auth/register', async (ctx) => {
  const body = getBody(ctx)
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''
  let user: UserRecord
  try {
    user = createUserRecord(username, password)
  } catch (error) {
    throw httpError(409, error instanceof Error ? error.message : '注册失败')
  }
  const authSession = createDbAuthSession(user.id, authSessionTtlMs)
  setAuthCookie(ctx, authSession.id)
  ctx.body = { ok: true, user }
})

router.post('/api/auth/login', async (ctx) => {
  const body = getBody(ctx)
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const user = verifyUserCredentials(username, password)
  if (!user) throw httpError(401, '用户名或密码错误')
  const authSession = createDbAuthSession(user.id, authSessionTtlMs)
  setAuthCookie(ctx, authSession.id)
  ctx.body = { ok: true, user }
})

router.post('/api/auth/logout', authOptional, async (ctx) => {
  const auth = (ctx.state.auth as AuthState | undefined) ?? { user: null, authSessionId: null }
  if (auth.user) {
    await destroyUserSandbox(auth.user.id)
  }
  if (auth.authSessionId) deleteAuthSession(auth.authSessionId)
  clearAuthCookie(ctx)
  ctx.body = { ok: true }
})

router.get('/api/progress', requireAuth, (ctx) => {
  const user = getAuthedUser(ctx)
  const progress = getUserProgress(user.id)
  ctx.body = {
    ok: true,
    progress,
  }
})

router.put('/api/progress', requireAuth, (ctx) => {
  const user = getAuthedUser(ctx)
  const body = getBody(ctx) as ProgressRequestBody
  const { completedLessonIds, visitedLessonIds } = parseProgressBody(body)
  const progress: UserProgressRecord = saveUserProgress(user.id, completedLessonIds, visitedLessonIds)
  ctx.body = {
    ok: true,
    progress,
  }
})

router.get('/api/sandbox/status', authOptional, async (ctx) => {
  const resolved = await resolveSandboxImage()
  const auth = (ctx.state.auth as AuthState | undefined) ?? { user: null }
  ctx.body = {
    ok: true,
    image: resolved.image,
    configuredImage,
    imageSource: resolved.source,
    sessions: sessions.size,
    authenticated: !!auth.user,
    user: auth.user,
  }
})

router.post('/api/sandbox/sessions', requireAuth, async (ctx) => {
  const user = getAuthedUser(ctx)
  const body = getBody(ctx)
  const language = parseLanguage(body.language)
  const files = sanitizeFiles(body)
  const session = await getOrCreateSandboxSession(user.id, language, files)
  ctx.status = 201
  ctx.body = {
    id: session.id,
    workspaceDir: session.workspaceDir,
    previewUrl: getPreviewUrl(session.forwardedPort),
    image: session.image,
    labels: getEditableFileMap(language),
  }
})

router.delete('/api/sandbox/sessions/:id', requireAuth, async (ctx) => {
  const session = getOwnedSession(ctx, ctx.params.id)
  await destroySession(session.id)
  ctx.body = { ok: true }
})

router.get('/api/sandbox/sessions/:id/files', requireAuth, async (ctx) => {
  const session = getOwnedSession(ctx, ctx.params.id)
  ctx.body = await readSandboxFiles(session.workspaceDir, session.language)
})

router.put('/api/sandbox/sessions/:id/files', requireAuth, async (ctx) => {
  const session = getOwnedSession(ctx, ctx.params.id)
  const body = getBody(ctx)
  const files = {
    html: typeof body.files === 'object' && body.files && typeof (body.files as RequestBody).html === 'string'
      ? ((body.files as RequestBody).html as string)
      : '',
    css: typeof body.files === 'object' && body.files && typeof (body.files as RequestBody).css === 'string'
      ? ((body.files as RequestBody).css as string)
      : '',
    js: typeof body.files === 'object' && body.files && typeof (body.files as RequestBody).js === 'string'
      ? ((body.files as RequestBody).js as string)
      : '',
  }
  await writeSandboxFiles(session.workspaceDir, session.language, files)
  ctx.body = {
    ok: true,
    labels: getEditableFileMap(session.language),
  }
})

router.get('/api/sandbox/sessions/:id/process', requireAuth, async (ctx) => {
  const session = getOwnedSession(ctx, ctx.params.id)
  ctx.body = {
    ...(await getProcessStatus(session)),
    previewUrl: getPreviewUrl(session.forwardedPort),
  }
})

router.post('/api/sandbox/sessions/:id/process/stop', requireAuth, async (ctx) => {
  const session = getOwnedSession(ctx, ctx.params.id)
  await stopBackgroundProcess(session)
  touchSession(session, 'stopped')
  ctx.body = { ok: true }
})

router.post('/api/sandbox/sessions/:id/exec', requireAuth, async (ctx) => {
  const session = getOwnedSession(ctx, ctx.params.id)
  if (session.busy) throw httpError(409, '该会话正在执行命令，请稍后再试')

  const body = getBody(ctx)
  const command = typeof body.command === 'string' ? body.command.trim() : ''
  const timeoutMs =
    typeof body.timeoutMs === 'number' && body.timeoutMs > 1000
      ? Math.min(body.timeoutMs, 10 * 60 * 1000)
      : 2 * 60 * 1000
  const background = body.background === true
  if (!command) throw httpError(400, '命令不能为空')

  session.busy = true
  try {
    if (background) {
      await startBackgroundProcess(session, command)
      ctx.body = {
        ok: true,
        background: true,
        command,
        previewUrl: getPreviewUrl(session.forwardedPort),
      }
      return
    }

    const result = await dockerExecInWorkspace(session, ensureDevCommandReady(command), timeoutMs)
    ctx.body = {
      command,
      exitCode: result.code,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr,
      timedOut: result.timedOut,
      elapsedMs: result.elapsedMs,
      workspaceDir: session.workspaceDir,
      ...(await readSandboxFiles(session.workspaceDir, session.language)),
    }
  } finally {
    session.busy = false
    touchSession(session)
  }
})

app.use(router.routes())
app.use(router.allowedMethods())
app.use(async (ctx, next) => {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
    await next()
    return
  }
  if (ctx.path.startsWith('/api/')) {
    await next()
    return
  }
  if (!(await hasStaticDist())) {
    await next()
    return
  }
  ctx.type = 'html'
  ctx.body = await readFile(path.join(distDir, 'index.html'), 'utf8')
})

const server = app.listen(port, bindHost, () => {
  console.log(`[sandbox-server] listening on http://${bindHost}:${port}`)
  console.log(`[sandbox-server] configured docker image: ${configuredImage}`)
  console.log(`[sandbox-server] preview ports: ${previewBindHost}:${previewPortStart}-${previewPortEnd}`)
})

const gcTimer = setInterval(() => {
  void gcExpiredSessions()
}, gcIntervalMs)
gcTimer.unref()

const shutdown = async () => {
  clearInterval(gcTimer)
  for (const id of [...sessions.keys()]) {
    await destroySession(id)
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

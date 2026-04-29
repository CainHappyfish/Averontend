<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import MonacoEditor from './components/MonacoEditor.vue'
import MapSubLessonRight, { type SubLessonPhase } from './components/MapSubLessonRight.vue'
import {
  CHAPTER1_TITLE,
  MAP_MODULE_ORDER,
  type MapSidebarModule,
  getCh1Lessons,
  getLessonsForModule,
} from './data/courseMap'
import { getLessonExercises } from './data/lessonExercises'
import { lessons, moduleNameMap } from './data/lessons'
import { getDocMarkdown, getDocSectionCountForLesson } from './data/moduleDocMarkdown'
import type { Lesson, ModuleKey } from './types/lesson'
import { buildSandboxDocument, type SandboxRuntime } from './sandbox/buildSandboxDocument'
import { transpileScript } from './sandbox/transpileScript'
import brandIcon from './assets/92F89723448B3C975E4F2FC459334AF8.jpg'

type EditorTab = 'html' | 'css' | 'js'
type DocTab = 'docs' | 'guide'

interface DocHeading {
  id: string
  text: string
  level: number
  /** 上级 h2 的 id（level 3 时有值，用于侧栏树线） */
  parentId?: string
}

interface LessonDraft {
  html: string
  css: string
  js: string
}

type ConsoleEntryLevel = 'system' | 'log' | 'warn' | 'error' | 'info'

interface ConsoleEntry {
  level: ConsoleEntryLevel
  label: string
  message: string
}

type SearchResultType = 'lesson' | 'heading'

interface SearchResultItem {
  key: string
  type: SearchResultType
  title: string
  subtitle: string
  lessonId: string
  headingId?: string
  score: number
}

interface AuthUser {
  id: string
  username: string
  createdAt: number
}

interface UserProgressPayload {
  userId: string
  completedLessonIds: string[]
  visitedLessonIds: string[]
  updatedAt: number
}

const ANSI_ESCAPE_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

const stripAnsi = (value: string) => value.replace(ANSI_ESCAPE_RE, '').replace(/\u0007/g, '')

const normalizeTerminalLine = (rawLine: string) => {
  const cleanLine = stripAnsi(rawLine).replace(/\s+$/, '')
  const trimmed = cleanLine.trim()
  if (!trimmed || trimmed === '$') return ''

  const compact = trimmed.replace(/\s+/g, ' ')
  const viteReady = compact.match(/^VITE\s+v([^\s]+)\s+ready in\s+(\d+)\s*ms$/i)
  if (viteReady) {
    return `[vite] v${viteReady[1]} ready · ${viteReady[2]} ms`
  }
  if (/^➜\s*Local:/i.test(compact) || /^Local:/i.test(compact)) {
    return `[vite] Local: ${compact.replace(/^➜\s*Local:\s*/i, '')}`
  }
  if (/^➜\s*Network:/i.test(compact) || /^Network:/i.test(compact)) {
    return `[vite] Network: ${compact.replace(/^➜\s*Network:\s*/i, '')}`
  }
  const npmScript = compact.match(/^>\s+(.+)$/)
  if (npmScript) {
    const content = npmScript[1].trim()
    if (/^[\w.-]+@[\d.]+\s+\S+/i.test(content)) return `[npm] ${content}`
    if (/^(vite|npm|pnpm|yarn|bun)\b/i.test(content)) return `[cmd] ${content}`
    return `> ${content}`
  }

  return cleanLine
}

const formatTerminalOutput = (source: string) => {
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const normalized: string[] = []
  for (const line of lines) {
    const nextLine = normalizeTerminalLine(line)
    if (!nextLine) {
      if (normalized[normalized.length - 1] !== '') normalized.push('')
      continue
    }
    normalized.push(nextLine)
  }
  while (normalized[0] === '') normalized.shift()
  while (normalized[normalized.length - 1] === '') normalized.pop()
  return normalized.join('\n')
}

const inferPreviewReadyFromLog = (log: string | undefined) =>
  /\bready in\s+\d+\s*ms\b/i.test(stripAnsi(log ?? ''))

const parseConsoleEntry = (raw: string): ConsoleEntry => {
  const clean = stripAnsi(raw).trim()
  const match = clean.match(/^\[(system|log|warn|error|info)\s*\]\s*(.*)$/i)
  if (!match) {
    return {
      level: 'log',
      label: 'LOG',
      message: clean || raw,
    }
  }

  const rawLevel = match[1].toLowerCase() as ConsoleEntryLevel
  return {
    level: rawLevel,
    label: rawLevel === 'system' ? 'SYSTEM' : rawLevel.toUpperCase(),
    message: match[2] || '',
  }
}

const authUser = ref<AuthUser | null>(null)
const authLoading = ref(true)
const authBusy = ref(false)
const authMode = ref<'login' | 'register'>('login')
const authUsername = ref('')
const authPassword = ref('')
const authError = ref('')
const appBootstrapped = ref(false)

const selectedLessonId = ref(lessons[0]?.id ?? '')
const docTab = ref<DocTab>('docs')
const activeEditorTab = ref<EditorTab>('html')
const htmlCode = ref('')
const cssCode = ref('')
const jsCode = ref('')
const previewDoc = ref('')
const previewFrame = ref<HTMLIFrameElement | null>(null)
const terminalOutputRef = ref<HTMLElement | null>(null)
const previewFrameLoading = ref(false)
/** 沙箱以 Blob URL 独立导航，换稿时释放上一 URL 避免泄露 */
let sandboxBlobUrl: string | null = null
const docsContainerRef = ref<HTMLElement | null>(null)
const consoleLogs = ref<string[]>([])
const runtimeState = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const autoRunEnabled = ref(true)
const isHydratingLesson = ref(false)
const cleanTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const activeExerciseId = ref('')
const outputPanelTab = ref<'terminal' | 'console'>('terminal')
const previewExternalUrl = ref('')
const commandSandboxPreviewUrl = ref('')
const commandSandboxPreviewReady = ref(false)
const previewFrameTarget = ref('')
const searchQuery = ref('')
const searchPanelOpen = ref(false)
const searchBoxRef = ref<HTMLElement | null>(null)
let sandboxFileSyncTimer: ReturnType<typeof setTimeout> | null = null
let sandboxProcessPollTimer: ReturnType<typeof setTimeout> | null = null

type CommandSandboxState = 'offline' | 'ready' | 'running' | 'error'
interface CommandSandboxExecResult {
  command: string
  exitCode: number
  signal: string | null
  stdout: string
  stderr: string
  timedOut: boolean
  elapsedMs: number
  workspaceDir: string
  files: LessonDraft
}

const commandSandboxState = ref<CommandSandboxState>('offline')
const commandSandboxSessionId = ref('')
const commandSandboxWorkspace = ref('')
const commandSandboxCommand = ref('')
const commandSandboxOutput = ref('终端输出会显示在这里。')
const commandSandboxError = ref('')
const commandSandboxBusy = ref(false)
const commandSandboxProcessRunning = ref(false)
const commandSandboxLastProcessLog = ref('')

const commandSandboxStatusLabel = computed(() => {
  if (commandSandboxState.value === 'running') return '执行中'
  if (commandSandboxState.value === 'error') return '命令失败'
  if (commandSandboxSessionId.value) return commandSandboxProcessRunning.value ? '会话在线 · 开发服务运行中' : '会话在线'
  return commandSandboxState.value === 'offline' ? '服务离线' : '服务在线'
})

const previewLoading = computed(
  () =>
    previewFrameLoading.value ||
    (!!previewExternalUrl.value &&
      commandSandboxProcessRunning.value &&
      !commandSandboxPreviewReady.value),
)

const previewLoadingText = computed(() =>
  selectedLesson.value?.scriptLanguage === 'vue'
    ? '预览加载中，正在等待 Vue 开发服务响应...'
    : '预览加载中...',
)

const terminalOutputDisplay = computed(() => formatTerminalOutput(commandSandboxOutput.value))

const consoleEntries = computed(() => consoleLogs.value.map(parseConsoleEntry))

const currentExercises = computed(() =>
  selectedLesson.value ? getLessonExercises(selectedLesson.value.id) : [],
)

const currentExercise = computed(() => {
  const list = currentExercises.value
  if (!list.length) return null
  return list.find((e) => e.id === activeExerciseId.value) ?? list[0] ?? null
})

const editorFileLabels = computed(() => ({
  html: selectedLesson.value?.scriptLanguage === 'vue' ? 'src/App.vue' : 'index.html',
  css: 'src/style.css',
  js:
    selectedLesson.value?.scriptLanguage === 'typescript'
      ? 'src/main.ts'
      : selectedLesson.value?.scriptLanguage === 'vue'
        ? 'src/main.ts'
        : 'src/main.js',
}))

const currentSandboxFiles = (): LessonDraft => ({
  html: htmlCode.value,
  css: cssCode.value,
  js: jsCode.value,
})

const scrollTerminalToBottom = async () => {
  await nextTick()
  terminalOutputRef.value?.scrollTo({
    top: terminalOutputRef.value.scrollHeight,
    behavior: 'smooth',
  })
}

const appendTerminalOutput = async (chunk: string) => {
  const text = chunk.trimEnd()
  if (!text) return
  commandSandboxOutput.value =
    commandSandboxOutput.value.trim() === ''
      ? text
      : `${commandSandboxOutput.value.replace(/\s*$/, '')}\n${text}`
  await scrollTerminalToBottom()
}

const applySandboxFilesToEditors = (files: Partial<LessonDraft>) => {
  if (typeof files.html === 'string') htmlCode.value = files.html
  if (typeof files.css === 'string') cssCode.value = files.css
  if (typeof files.js === 'string') jsCode.value = files.js
}

const sandboxFetch = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : `请求失败（${response.status}）`)
  }
  return payload as T
}

const authActionLabel = computed(() => (authMode.value === 'login' ? '登录' : '注册'))
const authSwitchLabel = computed(() =>
  authMode.value === 'login' ? '没有账号？去注册' : '已有账号？去登录',
)

const DRAFT_STORAGE_KEY = 'averontend:lesson-drafts'
const LAST_LESSON_KEY = 'averontend:last-lesson-id'
const LEGACY_COMPLETED_KEY = 'averontend:completed-lesson-ids'
const LEGACY_VISITED_KEY = 'averontend:visited-lesson-ids'

/** 旧站课程 id 迁移（localStorage 里仍可能存着旧值） */
const LEGACY_LESSON_IDS: Record<string, string> = {
  'html-card': 'ch1-html',
  'vite-script': 'eng-01',
  'ts-user': 'ts-01',
  'vue-mind': 'vue-01',
}

const normalizeStoredLessonId = (id: string) => LEGACY_LESSON_IDS[id] ?? id
const lessonOrderIndex = new Map(lessons.map((lesson, index) => [lesson.id, index]))
const validLessonIds = new Set(lessons.map((lesson) => lesson.id))

const sortLessonIds = (ids: Iterable<string>) =>
  [...new Set(ids)]
    .filter((id) => validLessonIds.has(id))
    .sort((a, b) => (lessonOrderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (lessonOrderIndex.get(b) ?? Number.MAX_SAFE_INTEGER))

const parseStoredLessonIds = (raw: string | null) => {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    if (!Array.isArray(parsed)) return []
    return sortLessonIds(parsed.map((id) => normalizeStoredLessonId(String(id ?? ''))))
  } catch {
    return []
  }
}

const getProgressStorageKeys = (userId: string) => ({
  completed: `averontend:progress:${userId}:completed-lesson-ids`,
  visited: `averontend:progress:${userId}:visited-lesson-ids`,
})

const readStoredProgressForUser = (userId: string): UserProgressPayload => {
  const keys = getProgressStorageKeys(userId)
  const rawCompleted = localStorage.getItem(keys.completed)
  const rawVisited = localStorage.getItem(keys.visited)
  const rawLegacyCompleted = localStorage.getItem(LEGACY_COMPLETED_KEY)
  const rawLegacyVisited = localStorage.getItem(LEGACY_VISITED_KEY)
  const completedLessonIds = parseStoredLessonIds(rawCompleted ?? rawLegacyCompleted)
  const visitedLessonIds = sortLessonIds([
    ...parseStoredLessonIds(rawVisited ?? rawLegacyVisited),
    ...completedLessonIds,
  ])

  if (!rawCompleted && rawLegacyCompleted) {
    localStorage.setItem(keys.completed, JSON.stringify(completedLessonIds))
  }
  if (!rawVisited && rawLegacyVisited) {
    localStorage.setItem(keys.visited, JSON.stringify(visitedLessonIds))
  }
  if (rawLegacyCompleted) localStorage.removeItem(LEGACY_COMPLETED_KEY)
  if (rawLegacyVisited) localStorage.removeItem(LEGACY_VISITED_KEY)

  return {
    userId,
    completedLessonIds,
    visitedLessonIds,
    updatedAt: 0,
  }
}

const writeStoredProgressForUser = (userId: string, progress: Pick<UserProgressPayload, 'completedLessonIds' | 'visitedLessonIds'>) => {
  const keys = getProgressStorageKeys(userId)
  localStorage.setItem(keys.completed, JSON.stringify(sortLessonIds(progress.completedLessonIds)))
  localStorage.setItem(keys.visited, JSON.stringify(sortLessonIds([...progress.visitedLessonIds, ...progress.completedLessonIds])))
}

const completedLessonIds = ref<Set<string>>(new Set())
const visitedLessonIds = ref<Set<string>>(new Set())

const applyProgressState = (progress: Pick<UserProgressPayload, 'completedLessonIds' | 'visitedLessonIds'>) => {
  const completed = sortLessonIds(progress.completedLessonIds)
  const visited = sortLessonIds([...progress.visitedLessonIds, ...completed])
  completedLessonIds.value = new Set(completed)
  visitedLessonIds.value = new Set(visited)
}

const persistProgressLocally = () => {
  if (!authUser.value) return
  writeStoredProgressForUser(authUser.value.id, {
    completedLessonIds: [...completedLessonIds.value],
    visitedLessonIds: [...visitedLessonIds.value],
  })
}

let progressSyncTimer: ReturnType<typeof setTimeout> | null = null
let progressHydrating = false

const syncProgressState = async () => {
  if (!authUser.value) return
  const payload = {
    completedLessonIds: sortLessonIds(completedLessonIds.value),
    visitedLessonIds: sortLessonIds([...visitedLessonIds.value, ...completedLessonIds.value]),
  }
  const response = await sandboxFetch<{ ok: boolean; progress: UserProgressPayload }>('/api/progress', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  applyProgressState(response.progress)
  persistProgressLocally()
}

const scheduleProgressSync = () => {
  if (!authUser.value || progressHydrating) return
  if (progressSyncTimer) clearTimeout(progressSyncTimer)
  progressSyncTimer = setTimeout(() => {
    void syncProgressState().catch(() => {
      // 本地缓存仍然保留，稍后下一次操作会再次触发同步
    })
  }, 320)
}

const commitProgressState = (nextCompleted: Iterable<string>, nextVisited: Iterable<string>) => {
  applyProgressState({
    completedLessonIds: sortLessonIds(nextCompleted),
    visitedLessonIds: sortLessonIds(nextVisited),
  })
  persistProgressLocally()
  scheduleProgressSync()
}

const markLessonVisited = (id: string) => {
  if (visitedLessonIds.value.has(id)) return
  const next = new Set(visitedLessonIds.value)
  next.add(id)
  commitProgressState(completedLessonIds.value, next)
}

const getLessonPhase = (id: string): SubLessonPhase => {
  if (completedLessonIds.value.has(id)) return 'done'
  if (visitedLessonIds.value.has(id)) return 'in-progress'
  return 'not-started'
}

const onMapSubStatusAction = async (id: string) => {
  const phase = getLessonPhase(id)
  if (phase === 'not-started') {
    await loadLesson(id)
    return
  }
  toggleLessonDone(id)
}

const toggleLessonDone = (id: string) => {
  const next = new Set(completedLessonIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  const visited = new Set(visitedLessonIds.value)
  visited.add(id)
  commitProgressState(next, visited)
}

let autoRunTimer: ReturnType<typeof setTimeout> | null = null
let runTicket = 0
const scrollbarCleanupFns: Array<() => void> = []

const selectedLesson = computed(() => lessons.find((item) => item.id === selectedLessonId.value))
const focusedMapModule = ref<ModuleKey>(selectedLesson.value?.module ?? 'basics')
const lessonIndex = computed(() => lessons.findIndex((item) => item.id === selectedLessonId.value))
const totalLessonCount = lessons.length
const totalDocSectionCount = lessons.reduce((sum, lesson) => sum + getDocSectionCountForLesson(lesson), 0)
const completedLessonCount = computed(() => completedLessonIds.value.size)
const visitedLessonCount = computed(() => visitedLessonIds.value.size)
const completedSectionCount = computed(() =>
  lessons.reduce((sum, lesson) => sum + (completedLessonIds.value.has(lesson.id) ? getDocSectionCountForLesson(lesson) : 0), 0),
)
const courseProgressPercent = computed(() =>
  totalLessonCount ? Math.round((completedLessonCount.value / totalLessonCount) * 100) : 0,
)
const courseProgressWidth = computed(() => `${courseProgressPercent.value}%`)
const currentLessonDone = computed(() =>
  selectedLesson.value ? completedLessonIds.value.has(selectedLesson.value.id) : false,
)
const currentLessonProgressText = computed(() => {
  if (!selectedLesson.value) return '未开始'
  return currentLessonDone.value
    ? '已完成'
    : visitedLessonIds.value.has(selectedLesson.value.id)
      ? '进行中'
      : '未开始'
})
/** 未写 `practiceRequiresSandbox` 时默认需要沙箱；工程化等课在本地完成练习 */
const lessonNeedsSandbox = computed(
  () => selectedLesson.value?.practiceRequiresSandbox !== false,
)
const hasPrevLesson = computed(() => lessonIndex.value > 0)
const hasNextLesson = computed(() => lessonIndex.value < lessons.length - 1)

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')

const normalizeForSearch = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '')
    .trim()

const isSubsequence = (needle: string, haystack: string) => {
  if (!needle || !haystack) return false
  let i = 0
  let j = 0
  while (i < needle.length && j < haystack.length) {
    if (needle[i] === haystack[j]) i += 1
    j += 1
  }
  return i === needle.length
}

const calcFuzzyScore = (query: string, target: string) => {
  if (!query || !target) return 0
  if (target.includes(query)) return 120 - Math.min(target.indexOf(query), 80)
  if (isSubsequence(query, target)) return 70 - Math.max(target.length - query.length, 0)
  return 0
}

let headingSlugMap = new Map<string, number>()
markdown.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
  const next = tokens[idx + 1]
  const title = next?.type === 'inline' ? next.content : 'section'
  const base = slugify(title) || 'section'
  const count = headingSlugMap.get(base) ?? 0
  const id = count === 0 ? base : `${base}-${count}`
  headingSlugMap.set(base, count + 1)
  tokens[idx].attrSet('id', id)
  return self.renderToken(tokens, idx, options)
}

const extractHeadings = (raw: string): DocHeading[] => {
  const counts = new Map<string, number>()
  const list: DocHeading[] = []
  let lastH2Id: string | undefined
  markdown.parse(raw, {}).forEach((token, idx, all) => {
    if (token.type !== 'heading_open') return
    const level = Number(token.tag.replace('h', ''))
    if (level < 2 || level > 3) return
    const next = all[idx + 1]
    const text = next?.type === 'inline' ? next.content : 'section'
    const base = slugify(text) || 'section'
    const count = counts.get(base) ?? 0
    const id = count === 0 ? base : `${base}-${count}`
    counts.set(base, count + 1)
    if (level === 2) {
      lastH2Id = id
      list.push({ id, text, level })
    } else {
      list.push({ id, text, level, parentId: lastH2Id })
    }
  })
  return list
}

const rawDoc = computed(() => getDocMarkdown(selectedLesson.value))
const docHtml = computed(() => {
  headingSlugMap = new Map<string, number>()
  return markdown.render(rawDoc.value)
})
const docHeadings = computed(() => extractHeadings(rawDoc.value))
const lessonSearchSource = computed(() =>
  lessons.map((lesson) => {
    const moduleLabel = moduleNameMap[lesson.module]
    const keywords = [lesson.title, moduleLabel, lesson.goal, ...(lesson.hints ?? []), lesson.id].join(' ')
    return {
      lessonId: lesson.id,
      title: lesson.title,
      subtitle: `${moduleLabel} · 课程`,
      normalizedKeywords: normalizeForSearch(keywords),
    }
  }),
)
const headingSearchSource = computed(() =>
  lessons.flatMap((lesson) => {
    const moduleLabel = moduleNameMap[lesson.module]
    const lessonTitle = lesson.title
    const lessonTitleNormalized = normalizeForSearch(lessonTitle)
    return extractHeadings(getDocMarkdown(lesson)).map((heading) => ({
      key: `${lesson.id}:${heading.id}`,
      lessonId: lesson.id,
      headingId: heading.id,
      title: heading.text,
      subtitle: `${moduleLabel} · ${lessonTitle}`,
      normalizedHeading: normalizeForSearch(heading.text),
      normalizedLessonTitle: lessonTitleNormalized,
    }))
  }),
)
const searchResults = computed<SearchResultItem[]>(() => {
  const normalizedQuery = normalizeForSearch(searchQuery.value)
  if (!normalizedQuery) return []
  const lessonResults: SearchResultItem[] = lessonSearchSource.value
    .map((item) => {
      const score = calcFuzzyScore(normalizedQuery, item.normalizedKeywords)
      if (score <= 0) return null
      return {
        key: `lesson:${item.lessonId}`,
        type: 'lesson',
        title: item.title,
        subtitle: item.subtitle,
        lessonId: item.lessonId,
        score,
      } as SearchResultItem
    })
    .filter((item): item is SearchResultItem => Boolean(item))
  const headingResults: SearchResultItem[] = headingSearchSource.value
    .map((item) => {
      const headingScore = calcFuzzyScore(normalizedQuery, item.normalizedHeading)
      const lessonScore = calcFuzzyScore(normalizedQuery, item.normalizedLessonTitle)
      const score = Math.max(headingScore + 8, lessonScore)
      if (score <= 0) return null
      return {
        key: `heading:${item.key}`,
        type: 'heading',
        title: item.title,
        subtitle: `${item.subtitle} · 文档小节`,
        lessonId: item.lessonId,
        headingId: item.headingId,
        score,
      } as SearchResultItem
    })
    .filter((item): item is SearchResultItem => Boolean(item))
  return [...lessonResults, ...headingResults].sort((a, b) => b.score - a.score).slice(0, 10)
})
const showSearchPanel = computed(() => searchPanelOpen.value && searchQuery.value.trim().length > 0)

const ch1Lessons = computed(() => getCh1Lessons())

/** 第一章「HTML / CSS / JS」大卡片是否展开，子章节在展开后展示 */
const ch1PanelOpen = ref(true)
/** 整块「课程地图」列表是否展开 */
const mapCourseOpen = ref(true)

const isBasicsModuleActive = computed(() => focusedMapModule.value === 'basics')

/** 折叠态副标题：当前节标题（在第一章内）或首节课标题 */
const basicsCardSubtitle = computed(() => {
  if (selectedLesson.value?.module === 'basics') return selectedLesson.value.title
  return ch1Lessons.value[0]?.title ?? ''
})

/** 第一章大卡片 x/n：n = 子课（子文档）个数；x = 已标记完成子课数 */
const ch1SubDocTotal = computed(() => ch1Lessons.value.length)
const ch1DoneCount = computed(
  () => ch1Lessons.value.filter((l) => completedLessonIds.value.has(l.id)).length,
)
const ch1ParentBarWidth = computed(() => {
  const n = ch1SubDocTotal.value
  if (n === 0) return '0%'
  return `${(ch1DoneCount.value / n) * 100}%`
})
const ch1ParentFraction = computed(() => {
  const n = ch1SubDocTotal.value
  return `${ch1DoneCount.value}/${n}`
})

const moduleDoneCount = (m: MapSidebarModule) =>
  getLessonsForModule(m).filter((l) => completedLessonIds.value.has(l.id)).length

const getModuleProgressLabel = (m: MapSidebarModule) => {
  const list = getLessonsForModule(m)
  const n = list.length
  if (n === 0) return '0/0'
  return `${moduleDoneCount(m)}/${n}`
}

const getModuleBarWidth = (m: MapSidebarModule) => {
  const list = getLessonsForModule(m)
  const n = list.length
  if (n === 0) return '0%'
  return `${(moduleDoneCount(m) / n) * 100}%`
}

const mapModuleOpen = ref<Record<MapSidebarModule, boolean>>({
  improve: false,
  engineering: false,
  typescript: false,
  vue: false,
  nodejs: false,
  practice: false,
})

const activeOutlineId = ref<string | null>(null)

const toggleCh1Panel = () => {
  focusedMapModule.value = 'basics'
  ch1PanelOpen.value = !ch1PanelOpen.value
}

const toggleMapModule = (m: MapSidebarModule) => {
  focusedMapModule.value = m
  const next = { ...mapModuleOpen.value, [m]: !mapModuleOpen.value[m] }
  mapModuleOpen.value = next
}

const isLessonInModuleActive = (m: ModuleKey) => focusedMapModule.value === m

const activeCode = computed({
  get: () =>
    activeEditorTab.value === 'html'
      ? htmlCode.value
      : activeEditorTab.value === 'css'
        ? cssCode.value
        : jsCode.value,
  set: (value: string) => {
    if (activeEditorTab.value === 'html') htmlCode.value = value
    else if (activeEditorTab.value === 'css') cssCode.value = value
    else jsCode.value = value
  },
})

const activeEditorLanguage = computed(() => {
  if (activeEditorTab.value === 'html') return 'html'
  if (activeEditorTab.value === 'css') return 'css'
  if (selectedLesson.value?.scriptLanguage === 'typescript') return 'typescript'
  if (selectedLesson.value?.scriptLanguage === 'vue') return 'typescript'
  return 'javascript'
})

const readDrafts = (): Record<string, LessonDraft> => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, LessonDraft>) : {}
  } catch {
    return {}
  }
}

const writeDrafts = (drafts: Record<string, LessonDraft>) => {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts))
}

const isVueSfcDraft = (code: string) =>
  /<template[\s>]/.test(code) &&
  /<\/template>/.test(code) &&
  /<script setup(?:\s+lang=["']ts["'])?/.test(code)

const isVueMainDraft = (code: string) =>
  /import\s+App\s+from\s+['"]\.\/App\.vue['"]/.test(code) &&
  /createApp\s*\(\s*App\s*\)\.mount\(\s*['"]#app['"]\s*\)/.test(code)

const takeCompatibleDraft = (lesson: Lesson): LessonDraft | null => {
  const drafts = readDrafts()
  const draft = drafts[lesson.id]
  if (!draft) return null
  if (lesson.scriptLanguage !== 'vue') return draft
  if (isVueSfcDraft(draft.html) && isVueMainDraft(draft.js)) return draft
  delete drafts[lesson.id]
  writeDrafts(drafts)
  return null
}

const persistDraft = () => {
  const lessonId = selectedLessonId.value
  if (!lessonId) return
  const drafts = readDrafts()
  drafts[lessonId] = { html: htmlCode.value, css: cssCode.value, js: jsCode.value }
  writeDrafts(drafts)
}

const setPreviewFrameToUrl = async (url: string) => {
  await nextTick()
  const frame = previewFrame.value
  if (!frame) return
  if (previewFrameTarget.value === url) return
  const prev = sandboxBlobUrl
  previewFrameLoading.value = true
  previewFrameTarget.value = url
  frame.setAttribute('src', url)
  if (prev) {
    URL.revokeObjectURL(prev)
    sandboxBlobUrl = null
  }
}

const resetPreviewFrame = async () => {
  await nextTick()
  const frame = previewFrame.value
  const prev = sandboxBlobUrl
  previewExternalUrl.value = ''
  previewFrameTarget.value = ''
  previewFrameLoading.value = false
  if (frame) frame.setAttribute('src', 'about:blank')
  if (prev) {
    URL.revokeObjectURL(prev)
    sandboxBlobUrl = null
  }
}

const getInitialLessonId = () => {
  const cached = localStorage.getItem(LAST_LESSON_KEY)
  const normalized = cached ? normalizeStoredLessonId(cached) : null
  if (cached && normalized && cached !== normalized) {
    localStorage.setItem(LAST_LESSON_KEY, normalized)
  }
  return (lessons.find((item) => item.id === (normalized ?? '')) ?? lessons[0]).id
}

const hydrateProgressState = async () => {
  if (!authUser.value) {
    applyProgressState({ completedLessonIds: [], visitedLessonIds: [] })
    return
  }

  progressHydrating = true
  try {
    const local = readStoredProgressForUser(authUser.value.id)
    const response = await sandboxFetch<{ ok: boolean; progress: UserProgressPayload }>('/api/progress', {
      method: 'GET',
    })
    const merged: UserProgressPayload = {
      userId: authUser.value.id,
      completedLessonIds: sortLessonIds([
        ...response.progress.completedLessonIds,
        ...local.completedLessonIds,
      ]),
      visitedLessonIds: sortLessonIds([
        ...response.progress.visitedLessonIds,
        ...local.visitedLessonIds,
        ...response.progress.completedLessonIds,
        ...local.completedLessonIds,
      ]),
      updatedAt: response.progress.updatedAt,
    }
    applyProgressState(merged)
    persistProgressLocally()
    if (
      merged.completedLessonIds.join(',') !== sortLessonIds(response.progress.completedLessonIds).join(',') ||
      merged.visitedLessonIds.join(',') !== sortLessonIds(response.progress.visitedLessonIds).join(',')
    ) {
      await syncProgressState()
    }
  } catch {
    const local = readStoredProgressForUser(authUser.value.id)
    applyProgressState(local)
    persistProgressLocally()
  } finally {
    progressHydrating = false
  }
}

const initializeAuthedApp = async () => {
  if (appBootstrapped.value) return
  await probeCommandSandbox()
  await hydrateProgressState()
  await loadLesson(getInitialLessonId())
  await nextTick()
  setupSmartScrollbars()
  appBootstrapped.value = true
}

const refreshAuthState = async () => {
  try {
    const payload = await sandboxFetch<{ authenticated: boolean; user?: AuthUser }>('/api/auth/me', {
      method: 'GET',
    })
    authUser.value = payload.authenticated ? payload.user ?? null : null
  } catch {
    authUser.value = null
  }
}

const submitAuth = async () => {
  const username = authUsername.value.trim()
  const password = authPassword.value
  if (!username || !password) {
    authError.value = '请输入用户名和密码'
    return
  }
  authBusy.value = true
  authError.value = ''
  try {
    const payload = await sandboxFetch<{ ok: boolean; user: AuthUser }>(
      authMode.value === 'login' ? '/api/auth/login' : '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      },
    )
    authUser.value = payload.user
    authPassword.value = ''
    appBootstrapped.value = false
    await initializeAuthedApp()
  } catch (error) {
    authError.value = error instanceof Error ? error.message : String(error)
  } finally {
    authBusy.value = false
  }
}

const toggleAuthMode = () => {
  authMode.value = authMode.value === 'login' ? 'register' : 'login'
  authError.value = ''
}

const logout = async () => {
  authBusy.value = true
  if (progressSyncTimer) {
    clearTimeout(progressSyncTimer)
    progressSyncTimer = null
  }
  try {
    await destroyCommandSandboxSession()
    await sandboxFetch<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch {
    // ignore on logout
  } finally {
    authBusy.value = false
  }
  authUser.value = null
  authPassword.value = ''
  authError.value = ''
  appBootstrapped.value = false
  applyProgressState({ completedLessonIds: [], visitedLessonIds: [] })
  commandSandboxState.value = 'ready'
  commandSandboxOutput.value = '终端输出会显示在这里。'
  commandSandboxError.value = ''
  consoleLogs.value = []
  runtimeState.value = 'idle'
}

const stopCommandSandboxPolling = () => {
  if (!sandboxProcessPollTimer) return
  clearTimeout(sandboxProcessPollTimer)
  sandboxProcessPollTimer = null
}

const probeCommandSandbox = async () => {
  try {
    await sandboxFetch<{ ok: boolean }>('/api/sandbox/status', { method: 'GET' })
    commandSandboxState.value = commandSandboxSessionId.value ? commandSandboxState.value : 'ready'
    if (!commandSandboxSessionId.value && commandSandboxOutput.value === '终端输出会显示在这里。') {
      commandSandboxOutput.value =
        'Averontend terminal ready.\n输入命令后会自动初始化隔离容器。\n内置命令：clear / reset / stop'
    }
    commandSandboxError.value = ''
  } catch (error) {
    commandSandboxState.value = 'offline'
    commandSandboxError.value = error instanceof Error ? error.message : String(error)
    commandSandboxOutput.value =
      '命令沙箱服务未启动。请使用 `npm run dev`（会同时启动前端与 sandbox-server），或单独执行 `npm run sandbox:server`。'
  }
}

const destroyCommandSandboxSession = async () => {
  stopCommandSandboxPolling()
  if (!commandSandboxSessionId.value) return
  const id = commandSandboxSessionId.value
  commandSandboxSessionId.value = ''
  commandSandboxWorkspace.value = ''
  commandSandboxProcessRunning.value = false
  commandSandboxPreviewUrl.value = ''
  commandSandboxPreviewReady.value = false
  await resetPreviewFrame()
  try {
    await sandboxFetch<{ ok: boolean }>(`/api/sandbox/sessions/${id}`, { method: 'DELETE' })
  } catch {
    // ignore on teardown
  }
}

const ensureCommandSandboxSession = async () => {
  if (commandSandboxSessionId.value) return
  const lang = selectedLesson.value?.scriptLanguage ?? 'javascript'
  if (lang === 'vue') {
    await appendTerminalOutput('[system] 正在初始化 Vue 会话并安装依赖，请稍候...')
  }
  const data = await sandboxFetch<{
    id: string
    workspaceDir: string
    previewUrl: string
  }>('/api/sandbox/sessions', {
    method: 'POST',
    body: JSON.stringify({
      language: lang,
      files: currentSandboxFiles(),
    }),
  })
  commandSandboxSessionId.value = data.id
  commandSandboxWorkspace.value = data.workspaceDir
  commandSandboxPreviewUrl.value = data.previewUrl
  commandSandboxPreviewReady.value = false
  commandSandboxState.value = 'ready'
  commandSandboxError.value = ''
  commandSandboxLastProcessLog.value = ''
  await appendTerminalOutput(`[system] 会话已初始化：${data.workspaceDir}`)
}

const syncSandboxFiles = async () => {
  if (!commandSandboxSessionId.value) return
  const lang = selectedLesson.value?.scriptLanguage ?? 'javascript'
  await sandboxFetch<{ ok: boolean }>(`/api/sandbox/sessions/${commandSandboxSessionId.value}/files`, {
    method: 'PUT',
    body: JSON.stringify({
      language: lang,
      files: currentSandboxFiles(),
    }),
  })
}

const scheduleSandboxFileSync = () => {
  if (!commandSandboxSessionId.value || isHydratingLesson.value || commandSandboxBusy.value) return
  if (sandboxFileSyncTimer) clearTimeout(sandboxFileSyncTimer)
  sandboxFileSyncTimer = setTimeout(() => {
    void syncSandboxFiles().catch((error) => {
      commandSandboxError.value = error instanceof Error ? error.message : String(error)
      commandSandboxState.value = 'error'
    })
  }, 420)
}

const syncSandboxFilesFromSession = async () => {
  if (!commandSandboxSessionId.value) return
  const data = await sandboxFetch<{ files: LessonDraft }>(
    `/api/sandbox/sessions/${commandSandboxSessionId.value}/files`,
    { method: 'GET' },
  )
  applySandboxFilesToEditors(data.files)
}

const pollCommandSandboxProcess = async () => {
  if (!commandSandboxSessionId.value) return
  try {
    const data = await sandboxFetch<{
      running: boolean
      log: string
      exitCode: string
      previewUrl: string
      previewReady?: boolean
    }>(`/api/sandbox/sessions/${commandSandboxSessionId.value}/process`, { method: 'GET' })
    commandSandboxProcessRunning.value = data.running
    const nextLog = data.log ?? ''
    const previewReady =
      typeof data.previewReady === 'boolean' ? data.previewReady : inferPreviewReadyFromLog(nextLog)
    commandSandboxPreviewReady.value = previewReady
    if (nextLog && nextLog !== commandSandboxLastProcessLog.value) {
      const delta = nextLog.startsWith(commandSandboxLastProcessLog.value)
        ? nextLog.slice(commandSandboxLastProcessLog.value.length)
        : `\n${nextLog}`
      commandSandboxLastProcessLog.value = nextLog
      await appendTerminalOutput(delta)
    }
    if (data.running) {
      commandSandboxState.value = 'running'
      commandSandboxPreviewUrl.value = data.previewUrl
      if (previewReady) {
        previewExternalUrl.value = data.previewUrl
        await setPreviewFrameToUrl(data.previewUrl)
      } else if (selectedLesson.value?.scriptLanguage === 'vue') {
        setSandboxHintPreview('真实 Vue 3 + TypeScript 开发服务启动中，等待预览页面就绪...')
      }
      stopCommandSandboxPolling()
      sandboxProcessPollTimer = setTimeout(() => void pollCommandSandboxProcess(), 1500)
      return
    }
    stopCommandSandboxPolling()
    commandSandboxState.value = data.exitCode && data.exitCode !== '0' ? 'error' : 'ready'
    if (data.exitCode) {
      await appendTerminalOutput(`[process exit ${data.exitCode}] 长驻进程已结束`)
    }
    if (previewExternalUrl.value) {
      previewExternalUrl.value = ''
      if (selectedLesson.value?.scriptLanguage === 'vue') {
        setSandboxHintPreview('真实 Vue 3 + TypeScript 预览已停止。重新点击“运行”或在终端执行 `npm run dev` 可恢复。')
      } else {
        await runCode()
      }
    }
    await syncSandboxFilesFromSession()
  } catch (error) {
    stopCommandSandboxPolling()
    commandSandboxState.value = 'error'
    commandSandboxError.value = error instanceof Error ? error.message : String(error)
  }
}

const stopCommandSandboxProcess = async () => {
  if (!commandSandboxSessionId.value) return
  stopCommandSandboxPolling()
  await sandboxFetch<{ ok: boolean }>(
    `/api/sandbox/sessions/${commandSandboxSessionId.value}/process/stop`,
    { method: 'POST', body: JSON.stringify({}) },
  )
  commandSandboxProcessRunning.value = false
  commandSandboxState.value = 'ready'
  commandSandboxPreviewReady.value = false
  commandSandboxLastProcessLog.value = ''
  await resetPreviewFrame()
  await appendTerminalOutput('[system] 已请求停止长驻进程')
  if (selectedLesson.value?.scriptLanguage === 'vue') {
    setSandboxHintPreview('真实 Vue 3 + TypeScript 预览已停止。重新点击“运行”或在终端执行 `npm run dev` 可恢复。')
    return
  }
  await runCode()
}

const runCommandInSandbox = async () => {
  const command = commandSandboxCommand.value.trim()
  if (!command) return
  if (command === 'clear') {
    commandSandboxOutput.value = ''
    commandSandboxCommand.value = ''
    return
  }
  if (command === 'reset') {
    commandSandboxCommand.value = ''
    await resetCommandSandboxSession()
    return
  }
  if (command === 'stop') {
    commandSandboxCommand.value = ''
    await stopCommandSandboxProcess()
    return
  }
  commandSandboxBusy.value = true
  outputPanelTab.value = 'terminal'
  commandSandboxError.value = ''
  await appendTerminalOutput(`$ ${command}`)
  try {
    await ensureCommandSandboxSession()
    await syncSandboxFiles()
    const background = /^npm\s+run\s+dev\b/.test(command) || /^vite\b/.test(command)
    const result = await sandboxFetch<
      | ({ ok: true; background: true; previewUrl: string; command: string })
      | CommandSandboxExecResult
    >(`/api/sandbox/sessions/${commandSandboxSessionId.value}/exec`, {
      method: 'POST',
      body: JSON.stringify({
        command,
        timeoutMs: background ? 15000 : 120000,
        background,
      }),
    })

    if ('background' in result) {
      commandSandboxProcessRunning.value = true
      commandSandboxState.value = 'running'
      commandSandboxLastProcessLog.value = ''
      commandSandboxPreviewUrl.value = result.previewUrl
      commandSandboxPreviewReady.value = false
      await appendTerminalOutput('[system] 已启动开发服务，正在等待预览就绪并轮询日志...')
      if (selectedLesson.value?.scriptLanguage === 'vue') {
        setSandboxHintPreview('真实 Vue 3 + TypeScript 开发服务启动中，等待预览页面就绪...')
      }
      void pollCommandSandboxProcess()
      commandSandboxCommand.value = ''
      return
    }

    commandSandboxState.value = result.exitCode === 0 ? 'ready' : 'error'
    commandSandboxWorkspace.value = result.workspaceDir
    await appendTerminalOutput(
      [result.stdout.trimEnd(), result.stderr.trimEnd(), `[exit ${result.exitCode}] ${result.elapsedMs} ms${result.timedOut ? '（超时已终止）' : ''}`]
        .filter(Boolean)
        .join('\n'),
    )
    applySandboxFilesToEditors(result.files)
    commandSandboxCommand.value = ''
  } catch (error) {
    commandSandboxState.value = 'error'
    commandSandboxError.value = error instanceof Error ? error.message : String(error)
    await appendTerminalOutput(`[ERROR] ${commandSandboxError.value}`)
  } finally {
    commandSandboxBusy.value = false
  }
}

const resetCommandSandboxSession = async () => {
  commandSandboxBusy.value = true
  commandSandboxError.value = ''
  try {
    await destroyCommandSandboxSession()
    await ensureCommandSandboxSession()
    await appendTerminalOutput('[system] 已重置命令沙箱，会话目录已重新按当前编辑区内容初始化。')
  } catch (error) {
    commandSandboxState.value = 'error'
    commandSandboxError.value = error instanceof Error ? error.message : String(error)
  } finally {
    commandSandboxBusy.value = false
  }
}

const renderPreview = async (doc: string) => {
  if (previewExternalUrl.value) return
  await nextTick()
  const frame = previewFrame.value
  if (!frame) return
  const prev = sandboxBlobUrl
  const nextUrl = URL.createObjectURL(
    new Blob([doc], { type: 'text/html;charset=utf-8' }),
  )
  previewFrameLoading.value = true
  previewFrameTarget.value = nextUrl
  frame.setAttribute('src', nextUrl)
  sandboxBlobUrl = nextUrl
  if (prev) URL.revokeObjectURL(prev)
}

const onPreviewFrameLoad = () => {
  previewFrameLoading.value = false
}

const setSandboxHintPreview = (message: string) => {
  previewDoc.value = buildSandboxDocument({
    html: `<p class="local-practice-hint">${message}</p>`,
    css: `.local-practice-hint { margin: 0; color: #475569; font-size: 14px; line-height: 1.6; }`,
    js: '',
  })
}

const runCode = async () => {
  if (!lessonNeedsSandbox.value) {
    runtimeState.value = 'idle'
    consoleLogs.value = [
      '[提示] 本课练习在本地终端或本机仓库中完成，无需在右侧沙箱中运行或预览。',
    ]
    setSandboxHintPreview('本课无必做沙箱练习。请切换「文档」/「练练？」在本地跟练。')
    return
  }
  const ticket = ++runTicket
  runtimeState.value = 'running'
  const lang = selectedLesson.value?.scriptLanguage ?? 'javascript'
  if (lang === 'vue') {
    consoleLogs.value = ['[system] 正在准备真实 Vue 3 + TypeScript 项目...']
    commandSandboxError.value = ''
    try {
      commandSandboxBusy.value = true
      outputPanelTab.value = 'terminal'
      await ensureCommandSandboxSession()
      await syncSandboxFiles()

      if (
        commandSandboxProcessRunning.value &&
        commandSandboxPreviewUrl.value &&
        commandSandboxPreviewReady.value
      ) {
        previewExternalUrl.value = commandSandboxPreviewUrl.value
        await setPreviewFrameToUrl(commandSandboxPreviewUrl.value)
        runtimeState.value = 'success'
        consoleLogs.value = ['[system] 已同步到真实 Vue 3 + TypeScript 项目，右侧为 Vite dev server 预览。']
        return
      }

      const command = 'if [ ! -d node_modules ]; then npm install; fi && npm run dev'
      await appendTerminalOutput(`$ ${command}`)
      const result = await sandboxFetch<
        | ({ ok: true; background: true; previewUrl: string; command: string })
        | CommandSandboxExecResult
      >(`/api/sandbox/sessions/${commandSandboxSessionId.value}/exec`, {
        method: 'POST',
        body: JSON.stringify({
          command,
          timeoutMs: 240000,
          background: true,
        }),
      })

      if ('background' in result) {
        commandSandboxProcessRunning.value = true
        commandSandboxState.value = 'running'
        commandSandboxLastProcessLog.value = ''
        commandSandboxPreviewUrl.value = result.previewUrl
        commandSandboxPreviewReady.value = false
        runtimeState.value = 'success'
        consoleLogs.value = ['[system] 真实 Vue 3 + TypeScript 开发服务已启动，正在等待预览页面就绪。']
        setSandboxHintPreview('真实 Vue 3 + TypeScript 开发服务启动中，等待预览页面就绪...')
        void pollCommandSandboxProcess()
        return
      }

      runtimeState.value = result.exitCode === 0 ? 'success' : 'error'
      commandSandboxState.value = result.exitCode === 0 ? 'ready' : 'error'
      commandSandboxWorkspace.value = result.workspaceDir
      applySandboxFilesToEditors(result.files)
      consoleLogs.value = [
        result.exitCode === 0
          ? '[system] Vue 命令执行完成。'
          : `[ERROR] Vue 命令执行失败（exit ${result.exitCode}）。`,
      ]
      await appendTerminalOutput(
        [result.stdout.trimEnd(), result.stderr.trimEnd(), `[exit ${result.exitCode}] ${result.elapsedMs} ms${result.timedOut ? '（超时已终止）' : ''}`]
          .filter(Boolean)
          .join('\n'),
      )
      if (result.exitCode !== 0) {
        setSandboxHintPreview('真实 Vue 3 + TypeScript 预览启动失败。请查看下方终端输出。')
      }
    } catch (error) {
      if (ticket !== runTicket) return
      runtimeState.value = 'error'
      commandSandboxState.value = 'error'
      commandSandboxError.value = error instanceof Error ? error.message : String(error)
      consoleLogs.value = [`[ERROR] ${commandSandboxError.value}`]
      setSandboxHintPreview('真实 Vue 3 + TypeScript 预览启动失败。请查看下方终端输出。')
      await appendTerminalOutput(`[ERROR] ${commandSandboxError.value}`)
    } finally {
      commandSandboxBusy.value = false
    }
    return
  }

  consoleLogs.value = ['[system] 代码执行中...']
  try {
    const script = await transpileScript(jsCode.value, lang)
    if (ticket !== runTicket) return
    const runtime: SandboxRuntime = 'vanilla'
    previewDoc.value = buildSandboxDocument({
      html: htmlCode.value,
      css: cssCode.value,
      js: script,
      runtime,
    })
  } catch (error) {
    if (ticket !== runTicket) return
    runtimeState.value = 'error'
    previewDoc.value = buildSandboxDocument({
      html: htmlCode.value,
      css: cssCode.value,
      js: '',
      runtime: 'vanilla',
    })
    consoleLogs.value.push(`[ERROR] 编译失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const scheduleAutoRun = () => {
  if (!lessonNeedsSandbox.value) return
  if (!autoRunEnabled.value || isHydratingLesson.value) return
  if (autoRunTimer) clearTimeout(autoRunTimer)
  autoRunTimer = setTimeout(() => void runCode(), 420)
}

const applyMergedStarter = (lesson: Lesson, exerciseId: string) => {
  const exs = getLessonExercises(lesson.id)
  const ex = exs.find((e) => e.id === exerciseId) ?? exs[0]
  const base = lesson.starterCode
  const p = ex?.starterCode
  htmlCode.value = p?.html ?? base.html
  cssCode.value = p?.css ?? base.css
  jsCode.value = p?.js ?? base.js
}

const loadLesson = async (lessonId: string) => {
  const lesson = lessons.find((item) => item.id === lessonId)
  if (!lesson) return
  const previousLessonId = selectedLessonId.value
  const isSwitchingLesson = !!previousLessonId && previousLessonId !== lesson.id
  const exs = getLessonExercises(lesson.id)
  isHydratingLesson.value = true
  selectedLessonId.value = lesson.id
  focusedMapModule.value = lesson.module
  activeExerciseId.value = exs[0]?.id ?? ''
  if (isSwitchingLesson) {
    await destroyCommandSandboxSession()
  }
  await resetPreviewFrame()
  const draft = takeCompatibleDraft(lesson)
  if (draft) {
    htmlCode.value = draft.html
    cssCode.value = draft.css
    jsCode.value = draft.js
  } else {
    applyMergedStarter(lesson, activeExerciseId.value)
  }
  activeEditorTab.value = 'html'
  runtimeState.value = 'idle'
  consoleLogs.value = []
  localStorage.setItem(LAST_LESSON_KEY, lesson.id)
  markLessonVisited(lessonId)
  if (lesson.module === 'basics') {
    ch1PanelOpen.value = true
  }
  await runCode()
  if (lessonNeedsSandbox.value && !commandSandboxSessionId.value && commandSandboxState.value !== 'offline') {
    try {
      await ensureCommandSandboxSession()
      await syncSandboxFilesFromSession()
    } catch {
      // runCode 已负责暴露错误，这里只尽量保证标签名与真实文件对应
    }
  }
  isHydratingLesson.value = false
}

const goPrev = async () => {
  if (!hasPrevLesson.value) return
  await loadLesson(lessons[lessonIndex.value - 1].id)
}

const goNext = async () => {
  if (!hasNextLesson.value) return
  await loadLesson(lessons[lessonIndex.value + 1].id)
}

const resetLesson = async () => {
  const lesson = selectedLesson.value
  if (!lesson) return
  isHydratingLesson.value = true
  applyMergedStarter(lesson, activeExerciseId.value)
  isHydratingLesson.value = false
  persistDraft()
  await runCode()
}

const toggleSelectedLessonDone = () => {
  if (!selectedLesson.value) return
  toggleLessonDone(selectedLesson.value.id)
}

const selectExercise = async (id: string) => {
  const lesson = selectedLesson.value
  if (!lesson) return
  if (activeExerciseId.value === id) return
  isHydratingLesson.value = true
  activeExerciseId.value = id
  applyMergedStarter(lesson, id)
  isHydratingLesson.value = false
  persistDraft()
  await runCode()
}

const jumpToHeading = async (id: string) => {
  activeOutlineId.value = id
  docTab.value = 'docs'
  await nextTick()
  docsContainerRef.value?.querySelector<HTMLElement>(`#${id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

const applySearchResult = async (result: SearchResultItem) => {
  await loadLesson(result.lessonId)
  if (result.type === 'heading' && result.headingId) {
    await jumpToHeading(result.headingId)
  } else {
    docTab.value = 'docs'
  }
  searchPanelOpen.value = false
}

const onSearchFocus = () => {
  searchPanelOpen.value = true
}

const onSearchEnter = async () => {
  if (!searchResults.value.length) return
  await applySearchResult(searchResults.value[0])
}

const onSearchContainerPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (searchBoxRef.value?.contains(target)) return
  searchPanelOpen.value = false
}

const setupSmartScrollbars = () => {
  while (scrollbarCleanupFns.length > 0) scrollbarCleanupFns.pop()?.()
  document.querySelectorAll<HTMLElement>('[data-scrollbar]').forEach((el) => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    let hovered = false
    const show = () => el.classList.add('is-scroll-active')
    const hide = (delay = 220) => {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        if (!hovered) el.classList.remove('is-scroll-active')
      }, delay)
    }
    const onScroll = () => {
      show()
      hide(680)
    }
    const onEnter = () => {
      hovered = true
      show()
    }
    const onLeave = () => {
      hovered = false
      hide(100)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    scrollbarCleanupFns.push(() => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      if (hideTimer) clearTimeout(hideTimer)
    })
  })
}

watch([htmlCode, cssCode, jsCode], () => {
  if (isHydratingLesson.value) return
  persistDraft()
  scheduleAutoRun()
  scheduleSandboxFileSync()
})
watch(previewDoc, (value) => void renderPreview(value))
watch([docTab, selectedLessonId], async () => {
  activeOutlineId.value = null
  await nextTick()
  setupSmartScrollbars()
})
watch([mapCourseOpen, ch1PanelOpen], async () => {
  await nextTick()
  setupSmartScrollbars()
})
watch(autoRunEnabled, (enabled) => enabled && scheduleAutoRun())

const onSandboxMessage = (event: MessageEvent) => {
  const data = event.data as
    | {
        source: string
        type: 'console' | 'runtime-error' | 'ready'
        payload: string | { method: string; message: string }
      }
    | undefined
  if (!data || data.source !== 'averontend-sandbox') return
  if (data.type === 'console' && typeof data.payload === 'object') {
    const prefix = data.payload.method.toUpperCase().padEnd(5, ' ')
    consoleLogs.value.push(`[${prefix}] ${data.payload.message}`)
    return
  }
  if (data.type === 'runtime-error') {
    runtimeState.value = 'error'
    consoleLogs.value.push(`[ERROR] ${String(data.payload)}`)
    return
  }
  runtimeState.value = 'success'
  consoleLogs.value.push('[system] 运行完成，预览已更新。')
}

onMounted(() => {
  window.addEventListener('message', onSandboxMessage)
  document.addEventListener('pointerdown', onSearchContainerPointerDown)
  void (async () => {
    await refreshAuthState()
    if (authUser.value) {
      await initializeAuthedApp()
    }
    authLoading.value = false
  })()
})

onUnmounted(() => {
  window.removeEventListener('message', onSandboxMessage)
  document.removeEventListener('pointerdown', onSearchContainerPointerDown)
  if (autoRunTimer) clearTimeout(autoRunTimer)
  if (cleanTimer.value) clearTimeout(cleanTimer.value)
  if (sandboxFileSyncTimer) clearTimeout(sandboxFileSyncTimer)
  stopCommandSandboxPolling()
  void destroyCommandSandboxSession()
  if (sandboxBlobUrl) {
    URL.revokeObjectURL(sandboxBlobUrl)
    sandboxBlobUrl = null
  }
  while (scrollbarCleanupFns.length > 0) scrollbarCleanupFns.pop()?.()
})

const runtimeLabelMap = {
  idle: '未运行',
  running: '运行中',
  success: '运行成功',
  error: '运行失败',
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand-mark" aria-hidden="true">
          <img class="brand-mark-ico" :src="brandIcon" alt="" width="30" height="30" />
        </div>
        <strong class="brand-title">Averontend PlayGround</strong>
      </div>
      <div class="topbar-right">
        <div ref="searchBoxRef" class="search-wrap">
          <label class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索文档、课程、代码..."
              @focus="onSearchFocus"
              @keydown.enter.prevent="onSearchEnter"
            />
            <span>⌕</span>
          </label>
          <div v-if="showSearchPanel" class="search-panel">
            <button
              v-for="item in searchResults"
              :key="item.key"
              type="button"
              class="search-result-item"
              @click="applySearchResult(item)"
            >
              <span class="search-result-title">{{ item.title }}</span>
              <span class="search-result-meta">{{ item.subtitle }}</span>
            </button>
            <div v-if="searchResults.length === 0" class="search-empty">未找到匹配结果</div>
          </div>
        </div>
        <div v-if="authUser" class="auth-toolbar">
          <span class="auth-user-chip">{{ authUser.username }}</span>
          <button type="button" class="auth-logout-btn" :disabled="authBusy" @click="void logout()">退出</button>
        </div>
      </div>
    </header>

    <main v-if="authLoading" class="auth-gate auth-gate-loading">
      <section class="auth-panel card">
        <p class="auth-kicker">Averontend</p>
        <h2>正在恢复登录状态</h2>
        <p class="auth-tip">稍候片刻，正在检查当前浏览器会话。</p>
      </section>
    </main>

    <main v-else-if="!authUser" class="auth-gate">
      <section class="auth-panel card">
        <p class="auth-kicker">Averontend</p>
        <h2>{{ authMode === 'login' ? '登录后继续学习' : '先创建一个账号' }}</h2>
        <p class="auth-tip">一个用户只绑定一个沙箱，会话闲置后会自动销毁。</p>
        <form class="auth-form" @submit.prevent="void submitAuth()">
          <label class="auth-field">
            <span>用户名</span>
            <input v-model.trim="authUsername" type="text" autocomplete="username" placeholder="输入用户名" />
          </label>
          <label class="auth-field">
            <span>密码</span>
            <input
              v-model="authPassword"
              type="password"
              autocomplete="current-password"
              placeholder="至少 6 位"
            />
          </label>
          <p v-if="authError" class="auth-error">{{ authError }}</p>
          <button type="submit" class="auth-primary-btn" :disabled="authBusy">
            {{ authBusy ? `${authActionLabel}中...` : authActionLabel }}
          </button>
        </form>
        <button type="button" class="auth-toggle-btn" :disabled="authBusy" @click="toggleAuthMode">
          {{ authSwitchLabel }}
        </button>
      </section>
    </main>

    <main v-else class="learning-layout">
      <aside class="left-rail">
        <section class="rail-card map-rail-one">
          <button type="button" class="map-rail-head" @click="mapCourseOpen = !mapCourseOpen">
            <span class="map-rail-title">课程地图</span>
            <span class="rail-chevron" :class="{ 'is-open': mapCourseOpen }" aria-hidden="true" />
          </button>
          <div v-show="mapCourseOpen" class="map-rail-body map-scroll" data-scrollbar>
            <div
              class="map-ch1-block"
              :class="{ 'is-open': ch1PanelOpen, 'is-active': isBasicsModuleActive }"
            >
              <div class="map-ch1-card-skin" :class="{ 'is-active': isBasicsModuleActive }">
                <button
                  type="button"
                  class="map-ch1-group-head"
                  :aria-expanded="ch1PanelOpen"
                  @click="toggleCh1Panel"
                >
                  <span
                    class="map-item-icon"
                    :class="isBasicsModuleActive ? 'is-pin' : 'is-dot'"
                    aria-hidden="true"
                  />
                  <div class="map-ch1-group-main">
                    <span class="map-ch1-kicker">{{ CHAPTER1_TITLE }}</span>
                    <div class="map-ch1-t">{{ moduleNameMap.basics }}</div>
                    <p class="map-ch1-subtitle">{{ basicsCardSubtitle }}</p>
                    <div class="map-item-foot">
                      <div
                        class="map-mini-bar"
                        :class="{
                          'is-muted': !isBasicsModuleActive,
                          'is-active-bar': isBasicsModuleActive,
                        }"
                        aria-hidden="true"
                      >
                        <span :style="{ width: ch1ParentBarWidth }" />
                      </div>
                      <span class="map-fraction" :class="{ 'is-muted': !isBasicsModuleActive }">{{
                        ch1ParentFraction
                      }}</span>
                    </div>
                  </div>
                  <span class="map-ch1-chevron" :class="{ 'is-open': ch1PanelOpen }" aria-hidden="true" />
                </button>
              </div>
              <ul v-show="ch1PanelOpen" class="map-ch1-children">
                <li v-for="lesson in ch1Lessons" :key="lesson.id" class="map-sub-row">
                  <button
                    type="button"
                    class="map-sub-item"
                    :class="{ active: selectedLessonId === lesson.id }"
                    @click="loadLesson(lesson.id)"
                  >
                    <span class="map-sub-k">{{ lesson.partLabel }}</span>
                    <span class="map-sub-t">{{ lesson.title }}</span>
                  </button>
                  <MapSubLessonRight
                    :section-count="getDocSectionCountForLesson(lesson)"
                    :phase="getLessonPhase(lesson.id)"
                    @action="onMapSubStatusAction(lesson.id)"
                  />
                </li>
              </ul>
            </div>

            <div
              v-for="mod in MAP_MODULE_ORDER"
              :key="mod"
              class="map-mod map-mod-block"
              :class="{ 'is-open': mapModuleOpen[mod], 'is-active': isLessonInModuleActive(mod) }"
            >
              <div class="map-mod-card-skin" :class="{ 'is-active': isLessonInModuleActive(mod) }">
                <div
                  class="map-mod-row"
                  :class="{ active: isLessonInModuleActive(mod), 'is-open': mapModuleOpen[mod] }"
                >
                  <button
                    type="button"
                    class="map-mod-hit"
                    :aria-expanded="mapModuleOpen[mod]"
                    @click="toggleMapModule(mod)"
                  >
                    <span
                      class="map-item-icon"
                      :class="isLessonInModuleActive(mod) ? 'is-pin' : 'is-dot'"
                      aria-hidden="true"
                    />
                    <div class="map-item-text">
                      <div class="map-mod-title">{{ moduleNameMap[mod] }}</div>
                      <p class="map-mod-subtitle">{{ getLessonsForModule(mod)[0]?.title }}</p>
                      <div class="map-item-foot">
                        <div
                          class="map-mini-bar"
                          :class="{
                            'is-muted': !isLessonInModuleActive(mod),
                            'is-active-bar': isLessonInModuleActive(mod),
                          }"
                          aria-hidden="true"
                        >
                          <span :style="{ width: getModuleBarWidth(mod) }" />
                        </div>
                        <span
                          class="map-fraction"
                          :class="{ 'is-muted': !isLessonInModuleActive(mod) }"
                          >{{ getModuleProgressLabel(mod) }}</span
                        >
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="map-mod-chevron"
                    :class="{ 'is-open': mapModuleOpen[mod] }"
                    aria-label="展开或收起"
                    @click.stop="toggleMapModule(mod)"
                  />
                </div>
              </div>
              <ul
                v-show="mapModuleOpen[mod] && getLessonsForModule(mod).length > 0"
                class="map-mod-sub"
              >
                <li v-for="les in getLessonsForModule(mod)" :key="les.id" class="map-sub-row">
                  <button
                    type="button"
                    class="map-mod-sub-hit"
                    :class="{ active: selectedLessonId === les.id }"
                    @click="loadLesson(les.id)"
                  >
                    {{ les.title }}
                  </button>
                  <MapSubLessonRight
                    :section-count="getDocSectionCountForLesson(les)"
                    :phase="getLessonPhase(les.id)"
                    @action="onMapSubStatusAction(les.id)"
                  />
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="rail-card outline-rail-card">
          <div class="rail-card-head is-static">
            <span class="outline-head-icon" aria-hidden="true" />
            <span class="rail-card-title">文档目录</span>
          </div>
          <div class="outline-scroll" data-scrollbar>
            <ul class="outline-list">
              <li
                v-for="heading in docHeadings"
                :key="heading.id"
                :class="[
                  `level-${heading.level}`,
                  { 'is-nested': heading.parentId, active: activeOutlineId === heading.id },
                ]"
              >
                <button type="button" @click="jumpToHeading(heading.id)">
                  <span class="outline-label">{{ heading.text }}</span>
                  <span v-if="activeOutlineId === heading.id" class="outline-active-dot" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </div>
        </section>

        <section class="rail-card progress-rail-card">
          <div class="rail-card-head is-static">
            <span class="rail-card-title">学习进度</span>
          </div>
          <div class="progress-rail-body">
            <div class="progress-rail-top">
              <span class="progress-rail-label">本课程进度</span>
              <span class="progress-rail-pct">{{ courseProgressPercent }}%</span>
            </div>
            <div class="progress-line is-brand">
              <span :style="{ width: courseProgressWidth }"></span>
            </div>
            <div class="progress-rail-cumulative">累计学习</div>
            <div class="progress-rail-stats">
              <div class="progress-stat">
                <span class="progress-stat-ico ico-day" aria-hidden="true" />
                <span>已完成 {{ completedLessonCount }}/{{ totalLessonCount }} 节</span>
              </div>
              <div class="progress-stat">
                <span class="progress-stat-ico ico-time" aria-hidden="true" />
                <span>已开始 {{ visitedLessonCount }}/{{ totalLessonCount }} 节</span>
              </div>
            </div>
            <div class="progress-rail-cumulative">当前课程</div>
            <div class="progress-rail-current">
              <span class="progress-current-title">{{ selectedLesson?.title ?? '未选择课程' }}</span>
              <span class="progress-current-state">{{ currentLessonProgressText }}</span>
            </div>
            <div class="progress-rail-stats">
              <div class="progress-stat">
                <span class="progress-stat-ico ico-day" aria-hidden="true" />
                <span>文档完成 {{ completedSectionCount }}/{{ totalDocSectionCount }} 节</span>
              </div>
            </div>
            <button type="button" class="progress-rail-action" @click="toggleSelectedLessonDone">
              {{ currentLessonDone ? '取消当前课完成' : '标记当前课完成' }}
            </button>
          </div>
        </section>
      </aside>

      <section class="doc-pane card">
        <div class="pane-tabs">
          <button type="button" :class="{ active: docTab === 'docs' }" @click="docTab = 'docs'">文档</button>
          <button type="button" :class="{ active: docTab === 'guide' }" @click="docTab = 'guide'">写代码</button>
        </div>

        <header class="doc-header">
          <h2>{{ moduleNameMap[selectedLesson?.module ?? 'basics'] }}</h2>
          <p>当前课程：{{ selectedLesson?.title }}</p>
        </header>

        <section
          v-if="docTab === 'docs' && selectedLesson?.module === 'vue'"
          class="module-entry-note module-entry-note-vue"
        >
          <p>
            建议优先在本地跑真实 Vue 项目：先执行
            <code>npm create vite@latest your-vue-app -- --template vue-ts</code>，进入目录后运行
            <code>npm install</code> 与 <code>npm run dev</code>。
            站内沙箱可用于跟练，但因容器、端口转发与 iframe 预览等问题，偶尔会出现启动慢或白屏，学习阶段以本地环境为主更稳。
          </p>
        </section>

        <section
          v-if="docTab === 'docs'"
          ref="docsContainerRef"
          class="doc-content markdown-body"
          data-scrollbar
          v-html="docHtml"
        ></section>

        <section v-else class="doc-content writing-guide" data-scrollbar>
          <h3>本节写代码目标</h3>
          <p>{{ selectedLesson?.goal }}</p>
          <p v-if="!lessonNeedsSandbox" class="writing-local-notice">
            本课练习在<strong>本机终端、Git 或本地仓库</strong>中完成，无需在右侧沙箱中写代码或点「运行」。
          </p>
          <template v-if="currentExercises.length">
            <h4>练习题</h4>
            <p v-if="lessonNeedsSandbox" class="writing-exercise-note">点击一题会载入该题起稿。若你已在右侧改过代码，切换前请留意覆盖。</p>
            <p v-else class="writing-exercise-note">以下题目在本地或笔记中完成；无需切换右侧起稿（工程化课无必做沙箱代码）。</p>
            <ul class="writing-exercise-list" role="list">
              <li v-for="ex in currentExercises" :key="ex.id" role="listitem">
                <button
                  type="button"
                  class="writing-exercise-item"
                  :class="{ 'is-active': ex.id === activeExerciseId }"
                  @click="void selectExercise(ex.id)"
                >
                  <span class="writing-exercise-head">
                    <span class="writing-exercise-title">{{ ex.title }}</span>
                    <span v-if="ex.scope === 'synthesis'" class="writing-exercise-badge">综合</span>
                  </span>
                  <span class="writing-exercise-concept">{{ ex.relatedConcept }}</span>
                  <span class="writing-exercise-task">{{ ex.task }}</span>
                </button>
              </li>
            </ul>
          </template>
          <template v-else>
            <h4>练习提示</h4>
            <ul>
              <li v-for="hint in selectedLesson?.hints ?? []" :key="hint">{{ hint }}</li>
            </ul>
          </template>
          <p v-if="lessonNeedsSandbox">建议先阅读「文档」与左侧目录，再切到本页选题并在右侧写代码、运行预览。</p>
          <p v-else>建议先阅读「文档」与左侧目录，再按题目在本地跟练、自检是否达成目标。</p>
        </section>

        <footer class="doc-footer">
          <button type="button" :disabled="!hasPrevLesson" @click="goPrev">← 上一节</button>
          <button type="button" :disabled="!hasNextLesson" @click="goNext">下一节 →</button>
        </footer>
      </section>

      <section class="code-pane code-pane-strict">
        <div v-if="lessonNeedsSandbox" class="code-surface">
          <div class="code-toolbar">
            <div class="code-tabs">
              <button
                type="button"
                :class="{ active: activeEditorTab === 'html' }"
                @click="activeEditorTab = 'html'"
              >
                {{ editorFileLabels.html }}
              </button>
              <button
                type="button"
                :class="{ active: activeEditorTab === 'css' }"
                @click="activeEditorTab = 'css'"
              >
                {{ editorFileLabels.css }}
              </button>
              <button
                type="button"
                :class="{ active: activeEditorTab === 'js' }"
                @click="activeEditorTab = 'js'"
              >
                {{ editorFileLabels.js }}
              </button>
            </div>

            <div class="code-actions">
              <button type="button" class="code-btn-reset" @click="resetLesson">重置</button>
              <button type="button" class="code-btn-run" @click="void runCode()">运行</button>
            </div>
          </div>

          <div class="code-body">
            <div class="editor-wrap">
              <MonacoEditor
                v-model="activeCode"
                :language="activeEditorLanguage"
                :ts-global-inject="selectedLesson?.scriptLanguage === 'vue' ? 'vue' : 'none'"
              />
            </div>
            <div class="hint-floating" data-scrollbar>
              <template v-if="currentExercise">
                <p
                  v-if="currentExercise.scope === 'synthesis'"
                  class="hint-floating-synth"
                >
                  综合题：一道题覆盖多节文档内容
                </p>
                <h4 class="hint-floating-h">{{ currentExercise.title }}</h4>
                <p class="hint-floating-meta">覆盖知识点：{{ currentExercise.relatedConcept }}</p>
                <p class="hint-floating-task">{{ currentExercise.task }}</p>
              </template>
              <h4 class="hint-floating-h">分步提示</h4>
              <ul>
                <li
                  v-for="h in currentExercise?.hints ?? selectedLesson?.hints ?? []"
                  :key="h"
                >
                  {{ h }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div v-else class="code-surface code-surface-local" data-scrollbar>
          <p class="local-practice-kicker">工程化练习</p>
          <p class="local-practice-title">本课无必做沙箱代码</p>
          <p class="local-practice-text">
            请结合左侧「文档」与「练练？」在<strong>本机</strong>完成题目；工程化题不要求在右侧编写或运行页面代码。
          </p>
        </div>
      </section>

      <section v-if="lessonNeedsSandbox" class="preview-pane card">
        <header class="preview-header">
          <h3>页面预览</h3>
          <div class="status-group">
            <label class="preview-autorun">
              <input v-model="autoRunEnabled" type="checkbox" />
              <span>实时预览</span>
            </label>
            <span class="chip">{{
                selectedLesson?.scriptLanguage === 'typescript'
                  ? 'TS'
                  : selectedLesson?.scriptLanguage === 'vue'
                    ? 'Vue 3'
                    : 'JS'
              }}</span>
            <span class="chip" :class="runtimeState">{{ runtimeLabelMap[runtimeState] }}</span>
          </div>
        </header>

        <div class="preview-frame-wrap">
          <div
            v-if="previewLoading"
            class="preview-loading"
            aria-live="polite"
          >
            <span class="preview-loading-spinner" aria-hidden="true"></span>
            <p>{{ previewLoadingText }}</p>
          </div>
          <iframe
            ref="previewFrame"
            title="preview-sandbox"
            class="preview-sandbox-frame"
            sandbox="allow-scripts allow-same-origin"
            referrerpolicy="no-referrer"
            @load="onPreviewFrameLoad"
          ></iframe>
        </div>

        <div class="console-block">
          <div class="console-head console-head-tabs">
            <div class="console-tabs">
              <button
                type="button"
                :class="{ active: outputPanelTab === 'terminal' }"
                @click="outputPanelTab = 'terminal'"
              >
                终端
              </button>
              <button
                type="button"
                :class="{ active: outputPanelTab === 'console' }"
                @click="outputPanelTab = 'console'"
              >
                控制台
              </button>
            </div>
            <button
              v-if="outputPanelTab === 'console'"
              type="button"
              @click="consoleLogs = []"
            >
              清空
            </button>
          </div>
          <div
            v-if="outputPanelTab === 'terminal'"
            class="command-sandbox-shell"
          >
            <div class="command-sandbox-shell-head">
              <span class="command-sandbox-shell-meta">
                {{ commandSandboxStatusLabel }}
                <template v-if="commandSandboxWorkspace">
                  · {{ commandSandboxWorkspace }}
                </template>
              </span>
            </div>
            <pre
              ref="terminalOutputRef"
              class="command-sandbox-output"
              data-scrollbar
            ><code>{{ terminalOutputDisplay }}</code></pre>
            <label class="command-sandbox-terminal-line">
              <span class="command-sandbox-prompt">$</span>
              <input
                v-model="commandSandboxCommand"
                class="command-sandbox-input"
                type="text"
                spellcheck="false"
                placeholder="输入命令后回车"
                :disabled="commandSandboxState === 'offline' || commandSandboxBusy"
                @keyup.enter.exact.prevent="void runCommandInSandbox()"
              />
            </label>
            <p
              v-if="commandSandboxError"
              class="command-sandbox-error"
              role="status"
            >
              {{ commandSandboxError }}
            </p>
          </div>
          <div
            v-else
            class="console-output"
            data-scrollbar
          >
            <p
              v-if="consoleEntries.length === 0"
              class="console-empty"
            >
              暂无控制台输出
            </p>
            <div
              v-for="(entry, index) in consoleEntries"
              :key="`${index}-${entry.label}`"
              class="console-entry"
              :class="`console-entry-${entry.level}`"
            >
              <span class="console-entry-label">{{ entry.label }}</span>
              <span class="console-entry-message">{{ entry.message }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="preview-pane card preview-local-placeholder">
        <div class="preview-local-inner" data-scrollbar>
          <h3>本地练习</h3>
          <p>本课不展示沙箱预览与控制台。完成度在终端、Git 或编辑笔记中自测即可。</p>
        </div>
      </section>
    </main>
  </div>
</template>

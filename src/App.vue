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
}

const selectedLessonId = ref(lessons[0]?.id ?? '')
const docTab = ref<DocTab>('docs')
const activeEditorTab = ref<EditorTab>('html')
const htmlCode = ref('')
const cssCode = ref('')
const jsCode = ref('')
const previewDoc = ref('')
const previewFrame = ref<HTMLIFrameElement | null>(null)
/** 沙箱以 Blob URL 独立导航，换稿时释放上一 URL 避免泄露 */
let sandboxBlobUrl: string | null = null
const docsContainerRef = ref<HTMLElement | null>(null)
const consoleLogs = ref<string[]>([])
const runtimeState = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const autoRunEnabled = ref(true)
const isHydratingLesson = ref(false)
const cleanTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const activeExerciseId = ref('')

/** 与仓库根 package.json 中的脚本一致，供在「本机终端」复现完整 npm 工作流 */
const localNpmCommands =
  'cd Averontend\nnpm install\nnpm run dev\n'
const copyNpmHint = ref(false)
const copyLocalNpmCommands = async () => {
  try {
    await navigator.clipboard.writeText(localNpmCommands)
    copyNpmHint.value = true
    window.setTimeout(() => {
      copyNpmHint.value = false
    }, 2200)
  } catch {
    console.warn('[Averontend] 无法写入剪贴板，请手选终端命令')
  }
}

const commandSandboxState = ref<CommandSandboxState>('offline')
const commandSandboxSessionId = ref('')
const commandSandboxWorkspace = ref('')
const commandSandboxCommand = ref('npm run build')
const commandSandboxOutput = ref('命令输出会显示在这里。')
const commandSandboxError = ref('')
const commandSandboxBusy = ref(false)

const commandSandboxStatusLabel = computed(() => {
  if (commandSandboxState.value === 'running') return '执行中'
  if (commandSandboxState.value === 'ready') return commandSandboxSessionId.value ? '已就绪' : '服务在线'
  if (commandSandboxState.value === 'error') return '命令失败'
  return '服务离线'
})

const sandboxFetch = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
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

const probeCommandSandbox = async () => {
  try {
    await sandboxFetch<{ ok: boolean }>('/api/sandbox/status', { method: 'GET' })
    commandSandboxState.value = commandSandboxSessionId.value ? 'ready' : 'ready'
    commandSandboxError.value = ''
    if (!commandSandboxSessionId.value) {
      commandSandboxOutput.value = '命令沙箱在线。输入命令后可直接“初始化并执行”。'
    }
  } catch (error) {
    commandSandboxState.value = 'offline'
    commandSandboxError.value = error instanceof Error ? error.message : String(error)
    commandSandboxOutput.value =
      '命令沙箱服务未启动。请使用 `npm run dev`（已同时启动前端与 sandbox-server），或单独执行 `npm run sandbox:server`。'
  }
}

const destroyCommandSandboxSession = async () => {
  if (!commandSandboxSessionId.value) return
  const id = commandSandboxSessionId.value
  commandSandboxSessionId.value = ''
  commandSandboxWorkspace.value = ''
  try {
    await sandboxFetch<{ ok: boolean }>(`/api/sandbox/sessions/${id}`, { method: 'DELETE' })
  } catch {
    // 页面关闭或 dev server 退出时无需阻塞卸载流程
  }
}

const ensureCommandSandboxSession = async () => {
  if (commandSandboxSessionId.value) return
  const data = await sandboxFetch<{ id: string; workspaceDir: string }>('/api/sandbox/sessions', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  commandSandboxSessionId.value = data.id
  commandSandboxWorkspace.value = data.workspaceDir
  commandSandboxState.value = 'ready'
  commandSandboxError.value = ''
}

const resetCommandSandboxSession = async () => {
  commandSandboxBusy.value = true
  commandSandboxError.value = ''
  try {
    await destroyCommandSandboxSession()
    await ensureCommandSandboxSession()
    commandSandboxOutput.value = '已重置 Docker 命令沙箱，会话工作区为当前仓库的一份隔离拷贝。'
  } catch (error) {
    commandSandboxState.value = 'offline'
    commandSandboxError.value = error instanceof Error ? error.message : String(error)
  } finally {
    commandSandboxBusy.value = false
  }
}

const runCommandInSandbox = async () => {
  const command = commandSandboxCommand.value.trim()
  if (!command) return
  commandSandboxBusy.value = true
  commandSandboxError.value = ''
  commandSandboxState.value = 'running'
  commandSandboxOutput.value = `$ ${command}\n\n[system] Docker 命令沙箱执行中...`
  try {
    await ensureCommandSandboxSession()
    const result = await sandboxFetch<CommandSandboxExecResult>(
      `/api/sandbox/sessions/${commandSandboxSessionId.value}/exec`,
      {
        method: 'POST',
        body: JSON.stringify({
          command,
          timeoutMs: 120000,
        }),
      },
    )
    commandSandboxWorkspace.value = result.workspaceDir
    commandSandboxState.value = result.exitCode === 0 ? 'ready' : 'error'
    commandSandboxOutput.value = [
      `$ ${result.command}`,
      '',
      result.stdout.trimEnd(),
      result.stderr.trimEnd(),
      `[exit ${result.exitCode}] ${result.elapsedMs} ms${result.timedOut ? '（超时已终止）' : ''}`,
    ]
      .filter(Boolean)
      .join('\n')
  } catch (error) {
    commandSandboxState.value = 'error'
    commandSandboxError.value = error instanceof Error ? error.message : String(error)
    commandSandboxOutput.value = [
      `$ ${command}`,
      '',
      '[ERROR] 命令沙箱执行失败。',
      commandSandboxError.value,
    ].join('\n')
  } finally {
    commandSandboxBusy.value = false
  }
}

const currentExercises = computed(() =>
  selectedLesson.value ? getLessonExercises(selectedLesson.value.id) : [],
)

const currentExercise = computed(() => {
  const list = currentExercises.value
  if (!list.length) return null
  return list.find((e) => e.id === activeExerciseId.value) ?? list[0] ?? null
})

const DRAFT_STORAGE_KEY = 'averontend:lesson-drafts'
const LAST_LESSON_KEY = 'averontend:last-lesson-id'
const COMPLETED_KEY = 'averontend:completed-lesson-ids'
const VISITED_KEY = 'averontend:visited-lesson-ids'

/** 旧站课程 id 迁移（localStorage 里仍可能存着旧值） */
const LEGACY_LESSON_IDS: Record<string, string> = {
  'html-card': 'ch1-html',
  'vite-script': 'eng-01',
  'ts-user': 'ts-01',
  'vue-mind': 'vue-01',
}

const normalizeStoredLessonId = (id: string) => LEGACY_LESSON_IDS[id] ?? id

const readCompletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    const out = new Set<string>()
    let changed = false
    for (const id of arr) {
      const n = normalizeStoredLessonId(id)
      if (n !== id) changed = true
      out.add(n)
    }
    if (changed) {
      localStorage.setItem(COMPLETED_KEY, JSON.stringify([...out]))
    }
    return out
  } catch {
    return new Set()
  }
}

const readVisitedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(VISITED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    const out = new Set<string>()
    let changed = false
    for (const id of arr) {
      const n = normalizeStoredLessonId(id)
      if (n !== id) changed = true
      out.add(n)
    }
    if (changed) {
      localStorage.setItem(VISITED_KEY, JSON.stringify([...out]))
    }
    return out
  } catch {
    return new Set()
  }
}

const completedLessonIds = ref<Set<string>>(readCompletedIds())
const visitedLessonIds = ref<Set<string>>(readVisitedIds())

const persistCompleted = () => {
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...completedLessonIds.value]))
}

const markLessonVisited = (id: string) => {
  if (visitedLessonIds.value.has(id)) return
  const next = new Set(visitedLessonIds.value)
  next.add(id)
  visitedLessonIds.value = next
  localStorage.setItem(VISITED_KEY, JSON.stringify([...next]))
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
  completedLessonIds.value = next
  persistCompleted()
}

let autoRunTimer: ReturnType<typeof setTimeout> | null = null
let runTicket = 0
const scrollbarCleanupFns: Array<() => void> = []

const selectedLesson = computed(() => lessons.find((item) => item.id === selectedLessonId.value))
const lessonIndex = computed(() => lessons.findIndex((item) => item.id === selectedLessonId.value))
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

const ch1Lessons = computed(() => getCh1Lessons())

/** 第一章「HTML / CSS / JS」大卡片是否展开，子章节在展开后展示 */
const ch1PanelOpen = ref(true)
/** 整块「课程地图」列表是否展开 */
const mapCourseOpen = ref(true)

const isBasicsModuleActive = computed(() => selectedLesson.value?.module === 'basics')

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
})

const activeOutlineId = ref<string | null>(null)

const toggleMapModule = (m: MapSidebarModule) => {
  const next = { ...mapModuleOpen.value, [m]: !mapModuleOpen.value[m] }
  mapModuleOpen.value = next
}

const isLessonInModuleActive = (m: ModuleKey) => selectedLesson.value?.module === m

const loadModuleFirstLesson = async (m: ModuleKey) => {
  const list = getLessonsForModule(m)
  if (list[0]) await loadLesson(list[0].id)
}

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

const persistDraft = () => {
  const lessonId = selectedLessonId.value
  if (!lessonId) return
  const drafts = readDrafts()
  drafts[lessonId] = { html: htmlCode.value, css: cssCode.value, js: jsCode.value }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts))
}

const renderPreview = async (doc: string) => {
  await nextTick()
  const frame = previewFrame.value
  if (!frame) return
  const prev = sandboxBlobUrl
  const nextUrl = URL.createObjectURL(
    new Blob([doc], { type: 'text/html;charset=utf-8' }),
  )
  frame.setAttribute('src', nextUrl)
  sandboxBlobUrl = nextUrl
  if (prev) URL.revokeObjectURL(prev)
}

const runCode = async () => {
  if (!lessonNeedsSandbox.value) {
    runtimeState.value = 'idle'
    consoleLogs.value = [
      '[提示] 本课练习在本地终端或本机仓库中完成，无需在右侧沙箱中运行或预览。',
    ]
    previewDoc.value = buildSandboxDocument({
      html: `<p class="local-practice-hint">本课无必做沙箱练习。请切换「文档」/「练练？」在本地跟练。</p>`,
      css: `.local-practice-hint { margin: 0; color: #475569; font-size: 14px; line-height: 1.5; }`,
      js: '',
    })
    return
  }
  const ticket = ++runTicket
  runtimeState.value = 'running'
  consoleLogs.value = ['[system] 代码执行中...']
  try {
    const lang = selectedLesson.value?.scriptLanguage ?? 'javascript'
    const script = await transpileScript(jsCode.value, lang)
    if (ticket !== runTicket) return
    const runtime: SandboxRuntime = lang === 'vue' ? 'vue3' : 'vanilla'
    previewDoc.value = buildSandboxDocument({
      html: htmlCode.value,
      css: cssCode.value,
      js: script,
      runtime,
    })
  } catch (error) {
    if (ticket !== runTicket) return
    runtimeState.value = 'error'
    const lang = selectedLesson.value?.scriptLanguage ?? 'javascript'
    const runtime: SandboxRuntime = lang === 'vue' ? 'vue3' : 'vanilla'
    previewDoc.value = buildSandboxDocument({
      html: htmlCode.value,
      css: cssCode.value,
      js: '',
      runtime,
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
  const draft = readDrafts()[lesson.id]
  const exs = getLessonExercises(lesson.id)
  isHydratingLesson.value = true
  selectedLessonId.value = lesson.id
  activeExerciseId.value = exs[0]?.id ?? ''
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
  void probeCommandSandbox()
  const cached = localStorage.getItem(LAST_LESSON_KEY)
  const normalized = cached ? normalizeStoredLessonId(cached) : null
  if (cached && normalized && cached !== normalized) {
    localStorage.setItem(LAST_LESSON_KEY, normalized)
  }
  const first = lessons.find((item) => item.id === (normalized ?? '')) ?? lessons[0]
  void loadLesson(first.id)
  void nextTick().then(setupSmartScrollbars)
})

onUnmounted(() => {
  window.removeEventListener('message', onSandboxMessage)
  if (autoRunTimer) clearTimeout(autoRunTimer)
  if (cleanTimer.value) clearTimeout(cleanTimer.value)
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
          <svg
            class="brand-mark-ico"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <strong class="brand-title">Averontend PlayGround</strong>
      </div>
      <nav class="topbar-nav">
        <a href="#">学习路径</a>
        <a href="#">课程</a>
        <a href="#">练习</a>
        <a href="#">项目</a>
        <a href="#">社区</a>
        <a href="#">资源</a>
      </nav>
      <div class="topbar-right">
        <label class="search-box">
          <input type="text" placeholder="搜索文档、课程、代码..." />
          <span>⌕</span>
        </label>
        <button type="button" class="icon-btn">◔</button>
        <button type="button" class="profile-btn">前端小白 ▾</button>
      </div>
    </header>

    <main class="learning-layout">
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
                  @click="ch1PanelOpen = !ch1PanelOpen"
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
                  <button type="button" class="map-mod-hit" @click="loadModuleFirstLesson(mod)">
                    <span class="map-item-icon is-dot" />
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
              <span class="progress-rail-pct">30%</span>
            </div>
            <div class="progress-line is-brand">
              <span style="width: 30%"></span>
            </div>
            <div class="progress-rail-cumulative">累计学习</div>
            <div class="progress-rail-stats">
              <div class="progress-stat">
                <span class="progress-stat-ico ico-day" aria-hidden="true" />
                <span>12 天</span>
              </div>
              <div class="progress-stat">
                <span class="progress-stat-ico ico-time" aria-hidden="true" />
                <span>36 小时</span>
              </div>
            </div>
          </div>
        </section>
      </aside>

      <section class="doc-pane card">
        <div class="pane-tabs">
          <button type="button" :class="{ active: docTab === 'docs' }" @click="docTab = 'docs'">文档</button>
          <button type="button" :class="{ active: docTab === 'guide' }" @click="docTab = 'guide'">练练？</button>
        </div>

        <header class="doc-header">
          <h2>{{ moduleNameMap[selectedLesson?.module ?? 'basics'] }}</h2>
          <p>当前课程：{{ selectedLesson?.title }}</p>
        </header>

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
                HTML
              </button>
              <button
                type="button"
                :class="{ active: activeEditorTab === 'css' }"
                @click="activeEditorTab = 'css'"
              >
                CSS
              </button>
              <button
                type="button"
                :class="{ active: activeEditorTab === 'js' }"
                @click="activeEditorTab = 'js'"
              >
                {{
                selectedLesson?.scriptLanguage === 'typescript'
                  ? 'TS'
                  : selectedLesson?.scriptLanguage === 'vue'
                    ? 'Vue 3'
                    : 'JS'
              }}
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

        <details
          v-if="lessonNeedsSandbox"
          class="local-npm-details"
        >
          <summary class="local-npm-summary">本机终端：npm 与 Node</summary>
          <div class="local-npm-body">
            <p class="local-npm-lead">
              浏览器内<strong>无法</strong>代你执行
              <code>npm</code> / <code>node</code> / 安装包；当前「页面预览」只在隔离
              <code>iframe</code> 里跑已加载的页面脚本。依赖安装、Vite/构建请在<strong>本机</strong>终端执行（需已装
              <a
                href="https://nodejs.org/"
                target="_blank"
                rel="noreferrer noopener"
              >Node.js</a>）。
            </p>
            <p
              v-if="copyNpmHint"
              class="local-npm-copied"
              role="status"
            >
              已复制到剪贴板
            </p>
            <pre class="local-npm-snippet"><code>{{ localNpmCommands.trimEnd() }}</code></pre>
            <button
              type="button"
              class="code-btn-run local-npm-copy"
              @click="void copyLocalNpmCommands()"
            >
              复制上述命令
            </button>
          </div>
        </details>

        <details
          v-if="lessonNeedsSandbox"
          class="command-sandbox-details"
          open
        >
          <summary class="local-npm-summary">命令沙箱（Docker）</summary>
          <div class="command-sandbox-body">
            <p class="command-sandbox-lead">
              这里会在本机 Docker 容器里执行命令，工作目录是当前仓库的一份<strong>隔离拷贝</strong>。适合
              <code>npm install</code>、<code>npm run build</code> 这类<strong>非交互</strong>命令。
            </p>
            <p class="command-sandbox-meta">
              状态：{{ commandSandboxStatusLabel }}
              <template v-if="commandSandboxWorkspace">
                · 工作区：<code>{{ commandSandboxWorkspace }}</code>
              </template>
            </p>
            <div class="command-sandbox-toolbar">
              <button
                type="button"
                class="code-btn-reset"
                :disabled="commandSandboxBusy"
                @click="void resetCommandSandboxSession()"
              >
                重置会话
              </button>
              <button
                type="button"
                class="code-btn-run"
                :disabled="commandSandboxBusy || commandSandboxState === 'offline' || !commandSandboxCommand.trim()"
                @click="void runCommandInSandbox()"
              >
                {{ commandSandboxBusy ? '执行中...' : commandSandboxSessionId ? '执行命令' : '初始化并执行' }}
              </button>
            </div>
            <input
              v-model="commandSandboxCommand"
              class="command-sandbox-input"
              type="text"
              placeholder="例如：npm run build"
              @keyup.enter.exact.prevent="void runCommandInSandbox()"
            />
            <p class="command-sandbox-note">
              长驻命令如 <code>npm run dev</code> 当前不会自动转发端口到右侧预览；更适合安装依赖、构建、测试等一次性命令。
            </p>
            <p class="command-sandbox-note">
              首次执行若本机没有镜像，会尝试拉取 <code>node:22-bookworm</code>；若 Docker Hub 网络不通，请先手动
              <code>docker pull node:22-bookworm</code>。
            </p>
            <p
              v-if="commandSandboxError"
              class="command-sandbox-error"
              role="status"
            >
              {{ commandSandboxError }}
            </p>
            <pre class="command-sandbox-output"><code>{{ commandSandboxOutput }}</code></pre>
          </div>
        </details>

        <div class="preview-frame-wrap">
          <iframe
            ref="previewFrame"
            title="preview-sandbox"
            class="preview-sandbox-frame"
            sandbox="allow-scripts"
            referrerpolicy="no-referrer"
          ></iframe>
        </div>

        <div class="console-block">
          <div class="console-head">
            <span>控制台输出</span>
            <button type="button" @click="consoleLogs = []">清空</button>
          </div>
          <pre data-scrollbar>{{ consoleLogs.join('\n') }}</pre>
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

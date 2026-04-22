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
import { lessons, moduleNameMap } from './data/lessons'
import { getDocMarkdown, getDocSectionCountForLesson } from './data/moduleDocMarkdown'
import type { ModuleKey } from './types/lesson'
import { buildSandboxDocument } from './sandbox/buildSandboxDocument'
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

const selectedLessonId = ref(lessons[0]?.id ?? '')
const docTab = ref<DocTab>('docs')
const activeEditorTab = ref<EditorTab>('html')
const htmlCode = ref('')
const cssCode = ref('')
const jsCode = ref('')
const previewDoc = ref('')
const previewFrame = ref<HTMLIFrameElement | null>(null)
const docsContainerRef = ref<HTMLElement | null>(null)
const consoleLogs = ref<string[]>([])
const runtimeState = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const autoRunEnabled = ref(true)
const isHydratingLesson = ref(false)
const cleanTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const DRAFT_STORAGE_KEY = 'averontend:lesson-drafts'
const LAST_LESSON_KEY = 'averontend:last-lesson-id'
const COMPLETED_KEY = 'averontend:completed-lesson-ids'
const VISITED_KEY = 'averontend:visited-lesson-ids'

const readCompletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

const readVisitedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(VISITED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
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
  return selectedLesson.value?.scriptLanguage === 'typescript' ? 'typescript' : 'javascript'
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
  if (!frame?.contentDocument) return
  frame.contentDocument.open()
  frame.contentDocument.write(doc)
  frame.contentDocument.close()
}

const runCode = async () => {
  const ticket = ++runTicket
  runtimeState.value = 'running'
  consoleLogs.value = ['[system] 代码执行中...']
  try {
    const script = await transpileScript(
      jsCode.value,
      selectedLesson.value?.scriptLanguage ?? 'javascript',
    )
    if (ticket !== runTicket) return
    previewDoc.value = buildSandboxDocument({
      html: htmlCode.value,
      css: cssCode.value,
      js: script,
    })
  } catch (error) {
    if (ticket !== runTicket) return
    runtimeState.value = 'error'
    previewDoc.value = buildSandboxDocument({
      html: htmlCode.value,
      css: cssCode.value,
      js: '',
    })
    consoleLogs.value.push(`[ERROR] 编译失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const scheduleAutoRun = () => {
  if (!autoRunEnabled.value || isHydratingLesson.value) return
  if (autoRunTimer) clearTimeout(autoRunTimer)
  autoRunTimer = setTimeout(() => void runCode(), 420)
}

const loadLesson = async (lessonId: string) => {
  const lesson = lessons.find((item) => item.id === lessonId)
  if (!lesson) return
  const draft = readDrafts()[lesson.id]
  isHydratingLesson.value = true
  selectedLessonId.value = lesson.id
  htmlCode.value = draft?.html ?? lesson.starterCode.html
  cssCode.value = draft?.css ?? lesson.starterCode.css
  jsCode.value = draft?.js ?? lesson.starterCode.js
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
  htmlCode.value = lesson.starterCode.html
  cssCode.value = lesson.starterCode.css
  jsCode.value = lesson.starterCode.js
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
  const cached = localStorage.getItem(LAST_LESSON_KEY)
  const normalized = cached === 'html-card' ? 'ch1-html' : cached
  const first = lessons.find((item) => item.id === normalized) ?? lessons[0]
  void loadLesson(first.id)
  void nextTick().then(setupSmartScrollbars)
})

onUnmounted(() => {
  window.removeEventListener('message', onSandboxMessage)
  if (autoRunTimer) clearTimeout(autoRunTimer)
  if (cleanTimer.value) clearTimeout(cleanTimer.value)
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
        <button type="button" class="icon-btn">&lt;</button>
        <div class="brand-mark">&lt;/&gt;</div>
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
          <button type="button" :class="{ active: docTab === 'guide' }" @click="docTab = 'guide'">写代码</button>
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
          <h4>练习提示</h4>
          <ul>
            <li v-for="hint in selectedLesson?.hints ?? []" :key="hint">{{ hint }}</li>
          </ul>
          <p>建议先阅读左侧目录对应章节，再切到右侧代码区完成练习。</p>
        </section>

        <footer class="doc-footer">
          <button type="button" :disabled="!hasPrevLesson" @click="goPrev">← 上一节</button>
          <button type="button" :disabled="!hasNextLesson" @click="goNext">下一节 →</button>
        </footer>
      </section>

      <section class="code-pane code-pane-strict">
        <div class="code-surface">
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
                {{ selectedLesson?.scriptLanguage === 'typescript' ? 'TS' : 'JS' }}
              </button>
            </div>

            <div class="code-actions">
              <button type="button" class="code-btn-reset" @click="resetLesson">重置</button>
              <button type="button" class="code-btn-run" @click="void runCode()">运行</button>
            </div>
          </div>

          <div class="code-body">
            <div class="editor-wrap">
              <MonacoEditor v-model="activeCode" :language="activeEditorLanguage" />
            </div>
            <div class="hint-floating" data-scrollbar>
              <h4>练习提示</h4>
              <ul>
                <li v-for="hint in selectedLesson?.hints ?? []" :key="hint">{{ hint }}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="preview-pane card">
        <header class="preview-header">
          <h3>页面预览</h3>
          <div class="status-group">
            <label class="preview-autorun">
              <input v-model="autoRunEnabled" type="checkbox" />
              <span>实时预览</span>
            </label>
            <span class="chip">{{ selectedLesson?.scriptLanguage === 'typescript' ? 'TS' : 'JS' }}</span>
            <span class="chip" :class="runtimeState">{{ runtimeLabelMap[runtimeState] }}</span>
          </div>
        </header>

        <div class="preview-frame-wrap">
          <iframe ref="previewFrame" title="sandbox-preview" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>

        <div class="console-block">
          <div class="console-head">
            <span>控制台输出</span>
            <button type="button" @click="consoleLogs = []">清空</button>
          </div>
          <pre data-scrollbar>{{ consoleLogs.join('\n') }}</pre>
        </div>
      </section>
    </main>
  </div>
</template>

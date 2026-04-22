import type { Lesson, ModuleKey } from '../types/lesson'
import basicsCssDoc from '../content/docs/base/basics-css.md?raw'
import basicsHtmlDoc from '../content/docs/base/basics-html.md?raw'
import basicsJsDoc from '../content/docs/base/basics-js.md?raw'
import engineeringDoc from '../content/docs/engineering.md?raw'
import typescriptDoc from '../content/docs/typescript.md?raw'
import vueDoc from '../content/docs/vue.md?raw'

export const moduleDocMarkdownMap: Record<ModuleKey, string> = {
  /** 当无法按节命中时使用（不应长期依赖，仅兜底） */
  basics: basicsHtmlDoc,
  engineering: engineeringDoc,
  typescript: typescriptDoc,
  vue: vueDoc,
}

/** 第一章三节课与文档一一对应 */
const basicsByLessonId: Record<string, string> = {
  'ch1-html': basicsHtmlDoc,
  'ch1-css': basicsCssDoc,
  'ch1-js': basicsJsDoc,
}

export const getDocMarkdown = (lesson: Lesson | undefined): string => {
  if (lesson && lesson.module === 'basics' && basicsByLessonId[lesson.id]) {
    return basicsByLessonId[lesson.id]
  }
  if (!lesson) return moduleDocMarkdownMap.basics
  return moduleDocMarkdownMap[lesson.module]
}

/**
 * 统计 `##` 二级标题行数（排除 `###` 及以下）。会跳过 ``` / ~~~ 围栏内行，避免误计示例里的 ##。
 * 与 `?raw` 导入的 md 一致，Vite 热更 md 时侧栏「N 节」会随内容刷新，无需手填表。
 */
export function countMarkdownH2Headings(raw: string): number {
  let inFence = false
  let n = 0
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const t = line.trimStart()
    if (t.startsWith('##') && !t.startsWith('###')) n += 1
  }
  return n
}

export const getDocSectionCountForLesson = (lesson: Pick<Lesson, 'id' | 'module'>) =>
  countMarkdownH2Headings(getDocMarkdown(lesson as Lesson))

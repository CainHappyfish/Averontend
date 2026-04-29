import type { Lesson, ModuleKey } from '../types/lesson'
import basicsCssDoc from '../content/docs/base/basics-css.md?raw'
import basicsHtmlDoc from '../content/docs/base/basics-html.md?raw'
import basicsJsDoc from '../content/docs/base/basics-js.md?raw'
import basics00SetupDoc from '../content/docs/base/basics-00-setup.md?raw'
import basics00TerminalDoc from '../content/docs/base/basics-00-terminal.md?raw'
import basics00DebugDoc from '../content/docs/base/basics-00-debug.md?raw'
import eng01Doc from '../content/docs/engineering/eng-01-node-packages.md?raw'
import eng02Doc from '../content/docs/engineering/eng-02-vite-and-build.md?raw'
import eng03Doc from '../content/docs/engineering/eng-03-git-and-modules.md?raw'
import imp01Doc from '../content/docs/improve/imp-01-types-coercion-strings.md?raw'
import imp02Doc from '../content/docs/improve/imp-02-arrays.md?raw'
import imp03Doc from '../content/docs/improve/imp-03-objects-iteration.md?raw'
import imp04Doc from '../content/docs/improve/imp-04-prototype-scope-closure.md?raw'
import imp05Doc from '../content/docs/improve/imp-05-memory-v8-gc.md?raw'
import imp06Doc from '../content/docs/improve/imp-06-async.md?raw'
import imp07Doc from '../content/docs/improve/imp-07-network-modules-es6.md?raw'
import ts01Doc from '../content/docs/typescript/ts-01-intro-tuple-enum.md?raw'
import ts02Doc from '../content/docs/typescript/ts-02-type-alias-and-generics.md?raw'
import ts03Doc from '../content/docs/typescript/ts-03-utility-pick-omit.md?raw'
import ts04Doc from '../content/docs/typescript/ts-04-returntype-nonnullable.md?raw'
import vue01Doc from '../content/docs/vue/vue-01.md?raw'
import vue02Doc from '../content/docs/vue/vue-02.md?raw'
import vue03Doc from '../content/docs/vue/vue-03.md?raw'
import vue04Doc from '../content/docs/vue/vue-04.md?raw'
import vue05Doc from '../content/docs/vue/vue-05.md?raw'
import vue06Doc from '../content/docs/vue/vue-06.md?raw'
import vue07Doc from '../content/docs/vue/vue-07.md?raw'
import vue08Doc from '../content/docs/vue/vue-08.md?raw'
import node01Doc from '../content/docs/nodejs/node-01-frontend-backend-tool.md?raw'
import node02Doc from '../content/docs/nodejs/node-02-scripts.md?raw'
import node03Doc from '../content/docs/nodejs/node-03-http-api.md?raw'
import node04Doc from '../content/docs/nodejs/node-04-koa-basic.md?raw'
import node05Doc from '../content/docs/nodejs/node-05-koa-crud.md?raw'
import node06Doc from '../content/docs/nodejs/node-06-bff-mock-deploy.md?raw'
import practice01Doc from '../content/docs/vue-practice/vue-practice-01-manage-system-demo.md?raw'
import practice02Doc from '../content/docs/vue-practice/vue-practice-02-manage-system-demo-b-route.md?raw'
import practice03Doc from '../content/docs/vue-practice/vue-practice-03-stage-checkpoints-capstone.md?raw'

export const moduleDocMarkdownMap: Record<ModuleKey, string> = {
  /** 当无法按节命中时使用（不应长期依赖，仅兜底） */
  basics: basicsHtmlDoc,
  improve: imp01Doc,
  engineering: eng01Doc,
  typescript: ts01Doc,
  vue: vue01Doc,
  nodejs: node01Doc,
  practice: practice01Doc,
}

const vueByLessonId: Record<string, string> = {
  'vue-01': vue01Doc,
  'vue-02': vue02Doc,
  'vue-03': vue03Doc,
  'vue-04': vue04Doc,
  'vue-05': vue05Doc,
  'vue-06': vue06Doc,
  'vue-07': vue07Doc,
  'vue-08': vue08Doc,
}

const practiceByLessonId: Record<string, string> = {
  'practice-01': practice01Doc,
  'practice-02': practice02Doc,
  'practice-03': practice03Doc,
}

const nodejsByLessonId: Record<string, string> = {
  'node-01': node01Doc,
  'node-02': node02Doc,
  'node-03': node03Doc,
  'node-04': node04Doc,
  'node-05': node05Doc,
  'node-06': node06Doc,
}

/** 多模块下：子课 id 与文档一一对应（basics / improve / engineering / typescript） */
const basicsByLessonId: Record<string, string> = {
  'ch0-setup': basics00SetupDoc,
  'ch0-terminal': basics00TerminalDoc,
  'ch0-debug': basics00DebugDoc,
  'ch1-html': basicsHtmlDoc,
  'ch1-css': basicsCssDoc,
  'ch1-js': basicsJsDoc,
}

const engineeringByLessonId: Record<string, string> = {
  'eng-01': eng01Doc,
  'eng-02': eng02Doc,
  'eng-03': eng03Doc,
}

const improveByLessonId: Record<string, string> = {
  'imp-01': imp01Doc,
  'imp-02': imp02Doc,
  'imp-03': imp03Doc,
  'imp-04': imp04Doc,
  'imp-05': imp05Doc,
  'imp-06': imp06Doc,
  'imp-07': imp07Doc,
}

const typescriptByLessonId: Record<string, string> = {
  'ts-01': ts01Doc,
  'ts-02': ts02Doc,
  'ts-03': ts03Doc,
  'ts-04': ts04Doc,
}

export const getDocMarkdown = (lesson: Lesson | undefined): string => {
  if (lesson && lesson.module === 'basics' && basicsByLessonId[lesson.id]) {
    return basicsByLessonId[lesson.id]
  }
  if (lesson && lesson.module === 'improve' && improveByLessonId[lesson.id]) {
    return improveByLessonId[lesson.id]
  }
  if (lesson && lesson.module === 'typescript' && typescriptByLessonId[lesson.id]) {
    return typescriptByLessonId[lesson.id]
  }
  if (lesson && lesson.module === 'engineering' && engineeringByLessonId[lesson.id]) {
    return engineeringByLessonId[lesson.id]
  }
  if (lesson && lesson.module === 'vue' && vueByLessonId[lesson.id]) {
    return vueByLessonId[lesson.id]
  }
  if (lesson && lesson.module === 'nodejs' && nodejsByLessonId[lesson.id]) {
    return nodejsByLessonId[lesson.id]
  }
  if (lesson && lesson.module === 'practice' && practiceByLessonId[lesson.id]) {
    return practiceByLessonId[lesson.id]
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

export type ModuleKey = 'basics' | 'improve' | 'engineering' | 'typescript' | 'vue'

export type LessonStarter = {
  html: string
  css: string
  js: string
}

/** 与课程主起稿可合并：未写的 language 用课程默认 starter */
export interface LessonExercise {
  id: string
  title: string
  /**
   * `focus`：对应文档中某一节 / 一个知识点，一小步练透。
   * `synthesis`：一题里串联多节内容，做小型综合（CSS/JS 常混用两种）。
   * 未写时与 `focus` 相同。
   */
  scope?: 'focus' | 'synthesis'
  /** 对应教学文档/知识点，便于自测是否覆盖到；综合题可写多节，用「+」等连接 */
  relatedConcept: string
  task: string
  hints: string[]
  starterCode?: Partial<LessonStarter>
}

export interface Lesson {
  id: string
  module: ModuleKey
  /** 侧栏「第一章」内小标题，如 HTML / CSS / JS */
  partLabel?: string
  level: '入门' | '基础' | '进阶'
  title: string
  goal: string
  hints: string[]
  /**
   * 为 `false` 时本课练习在本地终端/编辑器完成，不依赖右侧沙箱预览。未写时与 `true` 相同。
   */
  practiceRequiresSandbox?: boolean
  scriptLanguage: 'javascript' | 'typescript'
  starterCode: LessonStarter
}

export type ModuleKey = 'basics' | 'engineering' | 'typescript' | 'vue'

export interface Lesson {
  id: string
  module: ModuleKey
  /** 侧栏「第一章」内小标题，如 HTML / CSS / JS */
  partLabel?: string
  level: '入门' | '基础' | '进阶'
  title: string
  goal: string
  hints: string[]
  scriptLanguage: 'javascript' | 'typescript'
  starterCode: {
    html: string
    css: string
    js: string
  }
}

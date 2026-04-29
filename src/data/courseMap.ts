import type { ModuleKey } from '../types/lesson'
import { lessons } from './lessons'

/** 第一章前加入预备章：先过工具与调试，再进入 HTML / CSS / JS */
export const CHAPTER1_TITLE = '预备章 + 第一章'
export const CH1_LESSON_IDS = ['ch0-setup', 'ch0-terminal', 'ch0-debug', 'ch1-html', 'ch1-css', 'ch1-js'] as const

/** 侧栏中按「章 + 模块」顺序展示（除第一章外为各独立模块） */
export const MAP_MODULE_ORDER = ['improve', 'engineering', 'typescript', 'vue', 'nodejs', 'practice'] as const
export type MapSidebarModule = (typeof MAP_MODULE_ORDER)[number]

export const getLessonById = (id: string) => lessons.find((l) => l.id === id)

export const getCh1Lessons = () =>
  CH1_LESSON_IDS.map((id) => getLessonById(id)).filter(Boolean) as NonNullable<
    ReturnType<typeof getLessonById>
  >[]

export const getLessonsForModule = (m: ModuleKey) => lessons.filter((l) => l.module === m)

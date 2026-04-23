import type { ModuleKey } from '../types/lesson'

interface DocTopic {
  title: string
  commonUsage: string[]
  exampleCode: string
  analysis: string[]
}

interface ModuleDoc {
  module: ModuleKey
  title: string
  summary: string
  quickChecklist: string[]
  topics: DocTopic[]
}

export const moduleDocs: Record<ModuleKey, ModuleDoc> = {
  basics: {
    module: 'basics',
    title: 'HTML / CSS / JS 常用用法',
    summary: '聚焦三件套最常见、最容易在项目里直接上手的能力。',
    quickChecklist: [
      'HTML：语义化结构 + 可访问性属性',
      'CSS：布局优先（Flex/Grid）+ 响应式适配',
      'JS：事件驱动 + 数据渲染 + 异步请求',
    ],
    topics: [
      {
        title: 'HTML 结构与语义化',
        commonUsage: ['页面骨架：header/main/section/footer', '表单：label + input + button', '媒体：img + alt + figure'],
        exampleCode: `<main>\n  <section class="profile">\n    <h2>前端学习者档案</h2>\n    <p>目标：8 周完成 Vue + TS 入门项目。</p>\n    <a href="/courses">进入课程</a>\n  </section>\n</main>`,
        analysis: [
          '使用 main/section 提升可读性与可访问性。',
          '标题层级明确，屏幕阅读器更容易理解结构。',
          '锚点链接是最基础的导航交互入口。',
        ],
      },
      {
        title: 'CSS 布局与组件样式',
        commonUsage: ['卡片布局：display:flex 或 display:grid', '常用间距：8/12/16/24 节奏', '响应式：media query + 百分比宽度'],
        exampleCode: `.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));\n  gap: 16px;\n}\n\n.card {\n  padding: 16px;\n  border-radius: 12px;\n  border: 1px solid #dbe2f0;\n}`,
        analysis: [
          'auto-fill + minmax 是高频响应式网格写法。',
          '统一间距节奏可提升视觉一致性。',
          '边框 + 圆角 + 留白是最常见信息卡片基础。',
        ],
      },
      {
        title: 'JavaScript 事件与渲染',
        commonUsage: ['点击事件绑定', '数组 map 渲染列表', 'async/await 异步流程'],
        exampleCode: `const list = ['HTML', 'CSS', 'JavaScript']\nconst root = document.querySelector('#skills')\n\nroot.innerHTML = list.map((item) => \`<li>\${item}</li>\`).join('')\n\ndocument.querySelector('#reload')?.addEventListener('click', async () => {\n  const data = await Promise.resolve({ ok: true })\n  console.log('更新结果', data)\n})`,
        analysis: [
          'map + join 是渲染字符串模板的经典组合。',
          '事件绑定放在渲染后执行，避免元素未挂载。',
          'async/await 让异步逻辑更接近同步写法。',
        ],
      },
    ],
  },
  improve: {
    module: 'improve',
    title: 'JavaScript 提高（手撕与场景）',
    summary: '在第一章语法之上，用面试高频与日常排障点串起语言核心概念。',
    quickChecklist: [
      '类型、转换、数组/对象与迭代要能说清，不靠背题。',
      '原型、this、闭包、异步与事件循环是主线。',
      '浅拷贝/泄漏/GC/模块差异要与工程经验对齐。',
    ],
    topics: [
      {
        title: '基础类型与隐式转换',
        commonUsage: ['typeof / === / Object.is', 'falsy 集合', '对象 ToPrimitive 路径'],
        exampleCode: `console.log([] == false)\nconsole.log(Number("10px"))\nNumber.isNaN(NaN)`,
        analysis: [
          '业务里优先用严格相等与显式转型。',
          '对象参与运算或比较时，走规范规定的转换步骤。',
        ],
      },
      {
        title: '数组、类数组与可迭代',
        commonUsage: ['Array.isArray', 'Array.from', '从 arguments 到 rest 参数', 'splice 副作用'],
        exampleCode: `const like = { 0: "a", length: 1 }\nconst arr = Array.from(like)`,
        analysis: [
          'forEach 与 map 的返回值与可中断性不同。',
          '会改原数组的 API 要在代码审里高亮提醒。',
        ],
      },
      {
        title: '异步组合与可观测性',
        commonUsage: ['Promise.* 取舍', 'try/catch + await', '失败策略与可取消性'],
        exampleCode: `const all = await Promise.allSettled([p1, p2])\nall.filter((r) => r.status === "fulfilled")`,
        analysis: [
          'all 与 allSettled 对应「强一致」与「分结果处理」两种业务。',
          '未处理 rejection 要在规范与监控里当一等公民看。',
        ],
      },
    ],
  },
  engineering: {
    module: 'engineering',
    title: '前端工程化常用用法',
    summary: '从运行环境到构建工具，覆盖日常开发最常用的一套链路。',
    quickChecklist: [
      'Node + nvm：统一本地运行环境',
      'npm/pnpm/yarn：依赖安装与脚本管理',
      'Vite：本地开发、打包、预览',
    ],
    topics: [
      {
        title: 'Node 与 nvm',
        commonUsage: ['nvm install 20', 'nvm use 20', 'nvm alias default 20'],
        exampleCode: `# 安装并切换到 Node 20\nnvm install 20\nnvm use 20\n\n# 验证版本\nnode -v\nnpm -v`,
        analysis: [
          '团队统一 Node 大版本可减少环境问题。',
          'default alias 避免每次打开终端都手动切换。',
          '先确认 node/npm 版本再安装依赖最稳妥。',
        ],
      },
      {
        title: '包管理器与脚本',
        commonUsage: ['安装依赖：npm i / pnpm i', '运行脚本：npm run dev', '按需安装：npm i axios'],
        exampleCode: `{\n  "scripts": {\n    "dev": "vite",\n    "build": "vue-tsc -b && vite build",\n    "preview": "vite preview"\n  }\n}`,
        analysis: [
          'dev/build/preview 是 Vite 项目最基础三件套脚本。',
          '把复杂命令收敛到 scripts，团队成员调用更一致。',
          '先类型检查再构建可更早发现问题。',
        ],
      },
      {
        title: 'Vite 常用配置',
        commonUsage: ['别名配置 @ 指向 src', '环境变量区分 dev/prod', '构建前缀 base 调整'],
        exampleCode: `import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\nimport { fileURLToPath, URL } from 'node:url'\n\nexport default defineConfig({\n  plugins: [vue()],\n  resolve: {\n    alias: {\n      '@': fileURLToPath(new URL('./src', import.meta.url)),\n    },\n  },\n})`,
        analysis: [
          '路径别名可减少 ../../ 这类相对路径噪音。',
          'defineConfig 可获得更好的 TS 提示。',
          '工程化配置应保持少而清晰，避免过度抽象。',
        ],
      },
    ],
  },
  typescript: {
    module: 'typescript',
    title: 'TypeScript 常用用法',
    summary: '覆盖项目里最常用的类型定义、约束与推断技巧。',
    quickChecklist: [
      '优先给 API 数据和函数参数加类型',
      '对象结构用 interface，组合类型用 type',
      '利用联合类型 + 缩小提升类型安全',
    ],
    topics: [
      {
        title: '基础类型与函数签名',
        commonUsage: ['string/number/boolean', '函数参数和返回值标注', '数组泛型 Array<T>'],
        exampleCode: `function formatPrice(price: number, unit: string = 'CNY'): string {\n  return \`\${price.toFixed(2)} \${unit}\`\n}\n\nconst prices: Array<number> = [19, 39, 59]\nconst result = prices.map((item) => formatPrice(item))`,
        analysis: [
          '函数签名是最值得先补全类型的位置。',
          '默认参数与返回值类型一起声明更直观。',
          'Array<number> 明确了集合元素的类型边界。',
        ],
      },
      {
        title: '接口与类型别名',
        commonUsage: ['interface 描述对象', 'type 组合联合类型', '可选属性/只读属性'],
        exampleCode: `interface Course {\n  readonly id: string\n  title: string\n  desc?: string\n}\n\ntype CourseLevel = 'beginner' | 'intermediate' | 'advanced'`,
        analysis: [
          'readonly 能防止关键字段被误改。',
          '可选属性适合渐进补全场景。',
          '联合字面量类型可限制输入范围。',
        ],
      },
      {
        title: '类型缩小与守卫',
        commonUsage: ['typeof 判别基础类型', 'in 判别对象字段', '自定义类型守卫'],
        exampleCode: `type ApiResult = { data: string[] } | { error: string }\n\nfunction printResult(result: ApiResult) {\n  if ('data' in result) {\n    console.log(result.data.length)\n    return\n  }\n  console.error(result.error)\n}`,
        analysis: [
          'in 是联合对象类型最常用的缩小手段。',
          '分支后可获得精确类型提示。',
          '缩小逻辑越明确，运行时错误越少。',
        ],
      },
    ],
  },
  vue: {
    module: 'vue',
    title: 'Vue 3 从基础到常见用法',
    summary: '以 Composition API（**组合式 API** 与之为同一套）为主线：setup、ref、组合式风格；**勿** 使用 Options API / 选项式（data、methods 等）完成本站练习。文档示例与本地工程侧重 <script setup>，沙箱中可用 createApp({ setup, template })。',
    quickChecklist: [
      '响应式与模板：ref、reactive、指令、v-model、class',
      '组件：props、emit、插槽、生命周期、provide/inject',
      '进阶：composables、Router/Pinia 引入时机与职责划分',
    ],
    topics: [
      {
        title: '响应式与模板渲染',
        commonUsage: ['ref/reactive 定义状态', 'v-for 渲染列表', 'v-model 双向绑定'],
        exampleCode: `<script setup lang="ts">\nimport { ref } from 'vue'\nconst keyword = ref('')\nconst list = ref(['Vue', 'TypeScript'])\n<\/script>\n\n<template>\n  <input v-model="keyword" />\n  <li v-for="item in list" :key="item">{{ item }}</li>\n</template>`,
        analysis: [
          'ref 适合基础值，reactive 适合对象结构。',
          'v-for 必须配稳定 key，避免渲染异常。',
          'v-model 在表单场景最常用且直观。',
        ],
      },
      {
        title: '组件通信与副作用',
        commonUsage: ['defineProps 接收数据', 'defineEmits 派发事件', 'watch 监听状态变化'],
        exampleCode: `<script setup lang="ts">\nconst props = defineProps<{ count: number }>()\nconst emit = defineEmits<{ (e: 'inc'): void }>()\n<\/script>\n\n<template>\n  <button @click="emit('inc')">+{{ props.count }}</button>\n</template>`,
        analysis: [
          'props 单向流动，子组件不直接改父数据。',
          '事件命名应语义化，便于维护。',
          'watch 适合处理异步副作用，不适合纯派生值。',
        ],
      },
      {
        title: 'Pinia 与组合式封装',
        commonUsage: ['defineStore 创建状态仓库', 'storeToRefs 解构响应式', '抽离 useXxx composable'],
        exampleCode: `import { defineStore } from 'pinia'\n\nexport const useUserStore = defineStore('user', {\n  state: () => ({ name: '', token: '' }),\n  actions: {\n    setUser(name: string, token: string) {\n      this.name = name\n      this.token = token\n    },\n  },\n})`,
        analysis: [
          '跨页面共享数据时优先用 Pinia。',
          'actions 集中处理业务更新逻辑。',
          'composable 适合复用请求、分页、筛选等逻辑。',
        ],
      },
    ],
  },
}

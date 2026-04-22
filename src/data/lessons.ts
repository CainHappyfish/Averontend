import type { Lesson } from '../types/lesson'

export const moduleNameMap: Record<Lesson['module'], string> = {
  basics: 'HTML / CSS / JS',
  engineering: '前端工程化',
  typescript: 'TypeScript',
  vue: 'Vue',
}

export const lessons: Lesson[] = [
  {
    id: 'ch1-html',
    module: 'basics',
    partLabel: 'HTML',
    level: '入门',
    title: '结构：用语义化标签做一张个人名片',
    goal: '用少量标签搭出名片的结构：标题、简介、外链，并建立「结构先于样式」的心智。',
    scriptLanguage: 'javascript',
    hints: [
      '优先使用 section、h2、p、a 等语义化标签，而不是通篇 div。',
      '外链补全 target 与 rel，养成安全、可维护的写法。',
    ],
    starterCode: {
      html: `<section class="card">\n  <h2>我的前端名片</h2>\n  <p>在这里写一句自我介绍。</p>\n  <a href="https://vuejs.org/" target="_blank" rel="noreferrer">访问 Vue 官网</a>\n</section>`,
      css: `/* 下一节再写版式，此处仅最小占位 */\nbody {\n  font-family: system-ui, sans-serif;\n  margin: 0;\n}\n\n.card {\n  padding: 16px;\n}`,
      js: `// 下一节再加交互逻辑\n`,
    },
  },
  {
    id: 'ch1-css',
    module: 'basics',
    partLabel: 'CSS',
    level: '入门',
    title: '样式与版式：让名片有层次、易阅读',
    goal: '用盒模型与常用布局属性，把同一张名片的版式、间距和视觉层次做出来。',
    scriptLanguage: 'javascript',
    hints: [
      '用 max-width、margin: auto 等控制宽度与水平居中。',
      '用圆角、阴影等做层次，但保持克制、可读优先。',
    ],
    starterCode: {
      html: `<section class="card">\n  <h2>我的前端名片</h2>\n  <p>在这里写一句自我介绍。</p>\n  <a href="https://vuejs.org/" target="_blank" rel="noreferrer">访问 Vue 官网</a>\n</section>`,
      css: `.card {\n  max-width: 320px;\n  margin: 48px auto;\n  padding: 20px;\n  border-radius: 14px;\n  background: #ffffff;\n  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);\n}\n\nh2 {\n  margin: 0 0 12px;\n}\n\na {\n  color: #2563eb;\n}`,
      js: `// 下一节再加事件与点击态\n`,
    },
  },
  {
    id: 'ch1-js',
    module: 'basics',
    partLabel: 'JS',
    level: '入门',
    title: '行为：用事件与 class 做点击态',
    goal: '用选择器与事件监听，在适当时机改 DOM / 切换 class，把「能点的名片」接在同一份结构上。',
    scriptLanguage: 'javascript',
    hints: [
      '用 querySelector 等 API 在脚本里找节点，避免硬编码大段 innerHTML。',
      '状态尽量落在 class 上，由 CSS 管样子，由 JS 管何时切换。',
    ],
    starterCode: {
      html: `<section class="card">\n  <h2>我的前端名片</h2>\n  <p>在这里写一句自我介绍。</p>\n  <a href="https://vuejs.org/" target="_blank" rel="noreferrer">访问 Vue 官网</a>\n</section>`,
      css: `.card {\n  max-width: 320px;\n  margin: 48px auto;\n  padding: 20px;\n  border-radius: 14px;\n  background: #ffffff;\n  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);\n}\n\nh2 {\n  margin: 0 0 12px;\n}\n\na {\n  color: #2563eb;\n}\n\n.card.active {\n  outline: 2px solid #6366f1;\n}`,
      js: `const card = document.querySelector('.card')\ncard?.addEventListener('click', () => {\n  card.classList.toggle('active')\n})\n`,
    },
  },
  {
    id: 'vite-script',
    module: 'engineering',
    level: '基础',
    title: '理解 npm scripts 的常用命令',
    goal: '通过 JS 模拟包管理脚本面板，让初学者快速理解 dev/build/preview。',
    scriptLanguage: 'javascript',
    hints: ['使用数组 + map 渲染命令列表。', '点击按钮后在控制台输出对应命令说明。'],
    starterCode: {
      html: `<main>\n  <h2>常见 npm scripts</h2>\n  <div id="scripts"></div>\n</main>`,
      css: `main {\n  max-width: 560px;\n  margin: 40px auto;\n  font-family: ui-sans-serif, system-ui;\n}\n\nbutton {\n  margin: 0 8px 8px 0;\n  padding: 8px 12px;\n  border: 0;\n  border-radius: 10px;\n  background: #0f172a;\n  color: #fff;\n  cursor: pointer;\n}`,
      js: `const scripts = [\n  { name: 'dev', desc: '启动开发服务器' },\n  { name: 'build', desc: '打包生产代码' },\n  { name: 'preview', desc: '预览构建产物' },\n]\n\nconst container = document.querySelector('#scripts')\n\ncontainer.innerHTML = scripts\n  .map((item) => \`<button data-name="\${item.name}">\${item.name}</button>\`)\n  .join('')\n\ncontainer.addEventListener('click', (event) => {\n  const el = event.target\n  if (!(el instanceof HTMLButtonElement)) return\n\n  const selected = scripts.find((item) => item.name === el.dataset.name)\n  if (!selected) return\n  console.log(\`\${selected.name}: \${selected.desc}\`)\n})`,
    },
  },
  {
    id: 'ts-user',
    module: 'typescript',
    level: '基础',
    title: '对象类型与联合类型',
    goal: '通过 TypeScript 原生类型标注来感受类型设计思路。',
    scriptLanguage: 'typescript',
    hints: ['先定义用户对象结构，再处理访客与会员两种状态。', '在控制台输出最终欢迎语。'],
    starterCode: {
      html: `<main>\n  <h2>TypeScript 思维练习</h2>\n  <p id="output"></p>\n</main>`,
      css: `main {\n  margin: 48px auto;\n  max-width: 520px;\n  font-family: ui-sans-serif, system-ui;\n}\n\n#output {\n  margin-top: 14px;\n  font-weight: 700;\n}`,
      js: `type UserRole = 'guest' | 'member'\n\ninterface User {\n  name: string\n  role: UserRole\n}\n\nconst user: User = {\n  name: 'Avero',\n  role: 'member',\n}\n\nconst message: string = user.role === 'member'\n  ? \`欢迎回来，\${user.name}！\`\n  : '你好，访客！'\n\nconst output = document.querySelector('#output')\nif (output) {\n  output.textContent = message\n}\nconsole.log(message)`,
    },
  },
  {
    id: 'vue-mind',
    module: 'vue',
    level: '进阶',
    title: 'Vue 响应式思维（概念演示）',
    goal: '先理解状态驱动视图，再迁移到真实 Vue 组件。',
    scriptLanguage: 'javascript',
    hints: ['把状态与渲染函数拆开。', '先更新状态，再触发重绘。'],
    starterCode: {
      html: `<main>\n  <h2>响应式概念演示</h2>\n  <div id="app"></div>\n</main>`,
      css: `main {\n  max-width: 540px;\n  margin: 48px auto;\n  font-family: ui-sans-serif, system-ui;\n}\n\nbutton {\n  border: 0;\n  padding: 8px 14px;\n  border-radius: 999px;\n  background: #7c3aed;\n  color: #fff;\n  cursor: pointer;\n}`,
      js: `const state = { count: 0 }\nconst root = document.querySelector('#app')\n\nfunction render() {\n  root.innerHTML = \`\n    <p>当前计数：\${state.count}</p>\n    <button id="inc">+1</button>\n  \`\n\n  root.querySelector('#inc')?.addEventListener('click', () => {\n    state.count += 1\n    render()\n  })\n}\n\nrender()`,
    },
  },
]

# Averontend

一个面向前端教学的练习网站原型，主打 **边看文档边实操**、**实时预览反馈**。

## 技术栈

- 前端：`Vue 3` + `TypeScript` + `Vite`
- 编辑器：`Monaco Editor`
- 文档渲染：`markdown-it`
- 浏览器转译：`esbuild-wasm`（用于 TS 练习即时执行）
- 预览沙箱：`iframe` 隔离执行 + `postMessage` 日志回传

## 当前已实现

- 课程地图（HTML/CSS/JS、工程化、TypeScript、Vue）
- 课程级代码模板（HTML/CSS/JS）
- 左侧教学区整块切换：
  - `教学文档`：读取本地 `.md` 文件并渲染
  - `写代码`：展示提示、代码标签页与编辑器
- 实时预览（防抖自动运行）+ 手动立即运行
- 控制台输出面板（log/warn/error/info）
- 代码草稿本地持久化（刷新不丢）
- 记住上次学习课程

## 项目结构

```text
src/
  components/
    MonacoEditor.vue
  content/docs/
    base/
      basics-html.md
      basics-css.md
      basics-js.md
    engineering.md
    typescript.md
    vue.md
  data/
    lessons.ts
    moduleDocMarkdown.ts
  sandbox/
    buildSandboxDocument.ts
    transpileScript.ts
  App.vue
  style.css
```

## 教学文档维护方式

文档以 Markdown 存在本地目录：

- `src/content/docs/base/basics-html.md`（第一章 · HTML 节）
- `src/content/docs/base/basics-css.md`（第一章 · CSS 节）
- `src/content/docs/base/basics-js.md`（第一章 · JS 节）
- 侧栏「N 节」的 **N** 在运行时按对应 `.md` 正文中 `##` 行数统计（`moduleDocMarkdown.ts`），与 Vite 热更联动，**不必**为节数再维护手填表
- `src/content/docs/engineering.md`
- `src/content/docs/typescript.md`
- `src/content/docs/vue.md`

`module` 为 `basics` 时，会按**当前课程 id**（`ch1-html` / `ch1-css` / `ch1-js`）切换上述三份文档；其他模块见 `getDocMarkdown()`。

新增章节流程：

1. 在对应 `.md` 文件中按章节追加内容（第一章三份分别维护）
2. 如果新增模块，补充一个新的 `.md` 文件并在 `moduleDocMarkdownMap` 中登记
3. 若在第一章增加新课节，在 `lessons` 与 `moduleDocMarkdown.ts` 的 `basicsByLessonId` 中同时挂上 id 与文件

## 本地开发

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm run preview
```

## 下一步建议

- 文档目录导航（自动提取 h2/h3 生成锚点）
- 示例代码“一键插入编辑器”
- 练习自动判题（测试用例 + 结果反馈）
- Vue SFC 在线运行链路（`template/script/style`）

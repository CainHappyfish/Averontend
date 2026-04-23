# Vue 3 入门、createApp 与 SFC

本系列以 **Vue 3** + **Composition API** 为主线。官方中文里常写作 **「组合式 API」**——**它们与「Composition API」是同一套 API 的中英文叫法，不是两种东西**。与 [Vue 3 官方中文文档](https://cn.vuejs.org/) 一致处以其为准。

**本站对写法的要求：**

- **必须**用 **Composition API** 风格：在单文件里用 **`<script setup>`**，在站内沙箱里用 **`createApp({ setup() { … }, template: … })`**，以 **`ref` / `reactive`、组合式 `computed` / `watch`、** **生命周期钩子（`onMounted` 等）** 组织逻辑。
- **不要**用 **Options API**（**选项式 API**）：**不要**写 **`data()`**、**`methods`、** **选项上的 `computed` / `watch` 对象** 等 2 时代的以「配置对象」为中心的老写法（维护旧项目时可另学）。

---

## 开始之前：本教程在讲什么

**Vue** 是一套用于**构建用户界面**的渐进式 JavaScript 框架。你可以只增强页面的一小块，也可以搭完整 SPA。

- **渐进式**：路由、状态管理、工具链按需加。
- **单文件组件（SFC）**：一个 `.vue` 里通常有 `<template>`、`<script>`、`<style>`。
- **Vue 3**：性能更好、**Composition API** 是一等公民、TypeScript 支持更顺；**新项目**应优先选 Vue 3。

| 项 | 说明 |
|----|------|
| 运行环境 | **真沙箱**：预览在 **独立 `iframe` 子文档** 中运行（用 **Blob URL** 整页打开，而不再用 `Document#write` 注入）。`iframe` 的 **`sandbox` 只启用 `allow-scripts`、不启用 `allow-same-origin`，**子文档为**独立源**，与宿主**隔离**；子页还带有 **CSP** 收紧脚本与 `form` 等。沙箱自 **CDN** 同步拉取 **Vue 3 全量包**（含**模板**编译器），在「脚本」中写 `createApp({ setup, template })…mount('#app')` 时，运行时已预置 **`createApp` / `ref` 等**（**不必**手写 `import`）。**需能访问 unpkg 拉取 `vue.global.prod.js`**。**`npm install` / `npm run dev` 等无法**在浏览器里替代：见右侧「页面预览」上方的 **「本机终端：npm 与 Node」**，在已安装 Node 的机器上执行。 |
| 语法 | 教学文档以 **`<script setup lang="ts">`** 为范例；站内沙箱用 **TS/JS** 写 `createApp` 的 **setup**（脚本按 **TypeScript** 去类型）。 |
| `ref` 一词 | 可指 **`ref()` 响应式**；或模板 **`ref` 属性**（取 DOM/子组件），后文会区分。 |

---

## 第一个应用：createApp 与单文件组件

工程化入口常如下：

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

最小 **`.vue`** 骨架：

```vue
<script setup lang="ts">
// 响应式、方法、计算、生命周期等
</script>

<template>
  <!-- 声明式 UI -->
</template>

<style scoped>
/* 可选；scoped 限制选择器只作用于本组件 */
</style>
```

- **`createApp(根).mount(节点)`** 把应用挂到页面上。
- **声明式渲染**：描述「数据与 UI 的关系」，数据变则框架**更新 DOM**。

**与练习区对应**：在沙箱里**直接**写 `createApp` 与**模板**即可看到响应式；本地工程里把同一逻辑放进 `.vue` 的 `<script setup>` 与 `<template>` 中。

**下一节**：`vue-02` 文档会讲**模板插值与指令**；在此之前可用「练练？」巩固 `ref` 与 `template` 的配合。

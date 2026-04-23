# Vue 3 入门、createApp 与 SFC

本系列以 **Vue 3** + **Composition API** 为主线。官方中文里常写作 **「组合式 API」**——**它们与「Composition API」是同一套 API 的中英文叫法，不是两种东西**。与 [Vue 3 官方中文文档](https://cn.vuejs.org/) 一致处以其为准。

**本站对写法的要求：**

- **必须**用 **Composition API** 风格：在单文件里用 **`<script setup>`**，在站内与本地工程里都以 **`App.vue` + `src/main.ts`** 的方式组织代码，以 **`ref` / `reactive`、组合式 `computed` / `watch`、** **生命周期钩子（`onMounted` 等）** 组织逻辑。
- **不要**用 **Options API**（**选项式 API**）：**不要**写 **`data()`**、**`methods`、** **选项上的 `computed` / `watch` 对象** 等 2 时代的以「配置对象」为中心的老写法（维护旧项目时可另学）。

---

## 先在本地装好 Vue 并跑起来

如果你是第一次学 Vue，**建议优先在本地跑真实项目**，再把小片段拿到站内沙箱里验证。原因很简单：沙箱要处理 `iframe`、容器、端口转发、依赖安装等问题，偶尔会出现白屏、启动慢、预览不同步等工程噪音；**学 Vue 本身时，本地 Vite 项目更稳、更接近真实开发**。

最常见的本地起步方式：

```bash
npm create vite@latest your-vue-app -- --template vue-ts
```

按提示选好项目名后，进入目录并安装依赖：

```bash
cd your-vue-app
npm install
```

开发模式启动：

```bash
npm run dev
```

看到终端里出现类似下面的地址，就说明项目已经跑起来了：

```text
Local:   http://localhost:5173/
```

浏览器打开这个地址，就能看到你的 Vue 页面。后续本教程中的代码，推荐优先放进本地项目的 `src/App.vue`、`src/main.ts`、`src/style.css` 里练习。

---

## 开始之前：本教程在讲什么

**Vue** 是一套用于**构建用户界面**的渐进式 JavaScript 框架。你可以只增强页面的一小块，也可以搭完整 SPA。

- **渐进式**：路由、状态管理、工具链按需加。
- **单文件组件（SFC）**：一个 `.vue` 里通常有 `<template>`、`<script>`、`<style>`。
- **Vue 3**：性能更好、**Composition API** 是一等公民、TypeScript 支持更顺；**新项目**应优先选 Vue 3。

| 项 | 说明 |
|----|------|
| 运行环境 | **真沙箱**：站内 Vue 练习会创建一个接近真实项目的 Vite + Vue 3 + TypeScript 环境，内部有 `src/App.vue`、`src/main.ts`、`src/style.css`，也支持在容器里执行 `npm install`、`npm run dev`。但沙箱仍可能受网络、容器启动、端口转发、`iframe` 预览等因素影响，所以**建议优先在本地 Vite 项目中跟练**。 |
| 语法 | 教学文档以 **`<script setup lang="ts">`** 为范例；推荐把主要练习写在 `App.vue` 中，`src/main.ts` 只负责 `createApp(App).mount('#app')`。 |
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

**与练习区对应**：站内练习区与本地项目一样，都会落到真实的 `App.vue` / `main.ts` / `style.css` 文件；推荐把主要逻辑写进 `.vue` 的 `<script setup>` 与 `<template>` 中。

**下一节**：`vue-02` 文档会讲**模板插值与指令**；在此之前可用「练练？」巩固 `ref` 与 `template` 的配合。

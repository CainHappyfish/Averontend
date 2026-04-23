# 模板：插值、指令与缩写

在 `<template>` 里，把数据「绑」到 DOM 上，有两种最常见形式：**双花括号插值** 与 **带 `v-` 的指令**。

---

## 插值与简单表达式

**`{{ expression }}`** 把表达式的**字符串结果**当文本显示。

```vue
<script setup lang="ts">
import { ref } from 'vue'
const name = ref('Avero')
</script>

<template>
  <p>你好，{{ name }}！</p>
  <p>重复：{{ name }}</p>
</template>
```

- 可写**简单表达式**（`{{ n + 1 }}`、`{{ ok ? 'Y' : 'N' }}`），不要写**完整语句**（`if`/`for` 单独成句）。
- **`<script>` 里**对 `ref` 读写用 **`.value`**；**`<template>` 里**对 `ref` **自动解包**。

`v-once` 可固定子树只渲染一次，静态内容或极端性能场景下使用。

---

## 指令、缩写与 v-html 安全

| 指令 | 作用 |
|------|------|
| `v-bind` / `:` | 把表达式绑定到**属性**（`href`、`class`、`data-*` 等） |
| `v-on` / `@` | 监听**事件** |
| `v-if` / `v-else` | 条件**是否创建**节点 |
| `v-show` | 用 **CSS** 显隐，节点仍在 |
| `v-for` | 列表，配 **`:key`** |
| `v-model` | 表单**双向**（后文 `vue-06` 细讲） |
| `v-html` | 把字符串当 HTML 插入（**XSS 风险**） |

**缩写**（必记）：

```vue
<template>
  <a :href="url" :title="tip">链接</a>
  <button type="button" @click="onSave">保存</button>
</template>
```

**`v-html` 规则**：只用于**可信任**内容（如自家 CMS 已消毒的 HTML）；**不要**对**用户**原始输入用 `v-html`。

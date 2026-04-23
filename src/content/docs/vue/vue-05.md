# 条件/列表、样式与事件

本课对应模板里**分支、循环、类名、事件**等日常写法。

---

## 条件与列表、key 的意义

- **`v-if` / `v-else` / `v-else-if`**：条件为假时**不创建**子树（可释放内部状态）。
- **`v-show`**：**display** 显隐，适合频繁切换的轻量 UI。
- **`v-for` + `:key`**：`key` 用**稳定唯一 id**（业务 id 优先）；列表会**重排/插入删除**时，**不要**用**数组下标**当 key（除非列表静态且只读）。

Vue 3 中**同一节点**上 **`v-if` 优先于 `v-for`**；官方建议**不要**同节点混用，拆成**外层 `v-if` + 内层 `v-for` 的 `<template>`** 等结构。

```vue
<template>
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.label }}</li>
  </ul>
</template>
```

---

## 样式、class 与 `scoped`

**`:class`** 可绑定**对象**、**数组**、和静态 class 混写：

```vue
<p :class="{ active: isOn, 'text-mute': disabled }" class="row" />
<p :class="[isOn && 'is-active', 'base']" />
```

- **带 `scoped` 的 `<style>`**（Vite+Vue 常见）：选择器会**加上唯一属性**避免干扰子组件；穿透子代用 **`:deep()`** 等（以构建链文档为准）。

---

## 事件与修饰符

| 修饰符 | 作用 |
|--------|------|
| `.prevent` | `event.preventDefault()` |
| `.stop` | `event.stopPropagation()` |
| `.once` | 只触发一次 |
| `.capture` / `.passive` / `.self` | 见官方事件章节 |

```vue
<form @submit.prevent="onSubmit">
  <input @keyup.enter="onSearch" />
</form>
```

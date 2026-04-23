# 插槽与生命周期

**插槽**让父在子组件的「占位区」里塞模板；**生命周期**让你对准**挂载/更新/卸载**做副作用的创建与清理。

---

## 插槽：默认、具名、作用域

- **默认插槽**：子组件中 `<slot />`。
- **具名插槽**：`<slot name="header" />`；父用 **`<template #header>`**。
- **作用域插槽**：子**向父传数据**（`slotProps`），父侧 **`#row="slotProps"`** 或 **`<template #row="{ item }">`**。

子组件把列表项**交给父渲染**的示意：

```vue
<li v-for="item in list" :key="item.id">
  <slot name="row" :item="item" />
</li>
```

父：

```vue
<MyList :list="items">
  <template #row="{ item }">
    <span>{{ item.name }}</span>
  </template>
</MyList>
```

---

## 生命周期钩子

| 组合式 API | 典型用途 |
|------------|----------|
| `onBeforeMount` / `onMounted` | 发请求、量 DOM、挂第三方到元素 |
| `onBeforeUpdate` / `onUpdated` | 少在 `onUpdated` 里又改**本地导致循环**的响应式 |
| `onBeforeUnmount` / `onUnmounted` | **清定时器、取消订阅、解绑全局监听** |

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
const sec = ref(0)
let timer: number
onMounted(() => {
  timer = window.setInterval(() => sec.value++, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>
```

**SSR** 时部分钩子行为不同，需 `onServerPrefetch` 等，进阶再展开。

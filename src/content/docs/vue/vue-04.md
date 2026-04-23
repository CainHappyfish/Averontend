# 计算属性与侦听器

**派生值**和**副作用**要分流：`computed` 做纯派生，`watch` / `watchEffect` 做随数据变的副作用（或把副作用放在事件里明确触发）。

---

## 计算属性 computed

从已有状态**推导出**新值；**有缓存**——依赖不变则不会重复求值（与「模板里每次调普通函数」不同）。

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
const first = ref('Zhang')
const last = ref('San')
const full = computed(() => `${last.value} ${first.value}`.trim())
</script>

<template>
  <p>{{ full }}</p>
</template>
```

- 可写 `computed`（`get`/`set`）用于「派生展示 + 写回多源」等场景。
- **不要**在 `computed` 里发请求、改外部非响应式世界——那是副作用，用 `watch` 或用户事件。

---

## 侦听器 watch 与 watchEffect

- **`watch(源, 回调, 选项?)`**：明确监听**哪些源**；可 `deep`、`immediate`。
- **`watchEffect(fn)`**：**自动**收集 `fn` 里读到的依赖；**立即执行一次**，之后依赖变再执行。

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
const userId = ref(1)
watch(userId, (n, o) => {
  console.log(o, '→', n)
})
</script>
```

`watch` 可侦听 `ref`、getter `() => obj.a`、**多个源数组**等；深层结构注意性能，必要时**浅比较**或**只侦听 id**。

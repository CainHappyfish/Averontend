# 响应式：ref 与 reactive

Vue 3 的响应式系统基于 **Proxy**（`reactive`）与对原始值的**包装**（`ref`）。

---

## ref：为单个值建「跟踪」

`ref(初始值)` 返回**包装对象**；在脚本里用 **`.value`** 读值，在模板里**自动解包**。

```vue
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
function inc() {
  count.value += 1
}
</script>

<template>
  <p>{{ count }}</p>
  <button type="button" @click="inc">+1</button>
</template>
```

原始类型在 JS 里**按值传递**，无法「共享一处可变槽位」；`ref` 用对象包一层，才能统一**追踪**和**更新**。

`ref` 里也可放**对象**；深层的变更在 Vue 3 中通常也是响应的，但**结构化表单**也常用 `reactive`（下一节）。

---

## reactive：对象与数组的代理

`reactive` 只接受**对象类**值，返回**代理**；对属性的读写会触发更新。

```vue
<script setup lang="ts">
import { reactive } from 'vue'
const form = reactive({ name: '', city: '上海' })
</script>
```

**反模式**：`const { name } = reactive(...)` 解构会**掉响应**；需要解构用 **`toRefs` / `toRef`** 包回 `ref`。

---

## 选用 ref 还是 reactive

| 场景 | 建议 |
|------|------|
| 原始值、或习惯「整份用 `.value`」 | `ref` |
| 多字段对象、大量 `form.x =` | `reactive` + 必要时 `toRefs` |
| 要**整体替换**引用 | 优先 **`ref(对象)`**，写 `x.value = newObj` 最直观 |

团队内**风格一致**比争论更重要。

---

## 模板 `ref`（与 ref() 不同）

`ref="inputEl"` 用于取 **DOM 或子组件实例**：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
const inputEl = ref<HTMLInputElement | null>(null)
onMounted(() => inputEl.value?.focus())
</script>

<template>
  <input ref="inputEl" />
</template>
```

子组件上绑 `ref` 时，能拿到**子暴露**的 API（`defineExpose` 控制可见性）。

# 表单、props 与事件

输入类控件、父子数据流，是业务页里**最高频**的一块。

---

## 表单与 v-model

`v-model` 本质上是 **`:modelValue` + `@update:modelValue`** 的**语法糖**；原生元素上常对应 `value`/`checked` 与 `input`/`change`。

- **`.lazy`**：`change` 时同步，减少每次按键触发。
- **`.number` / `.trim`**：自动转换类型或去空格。
- **checkbox**、**select** 的多选与**值**绑定，以官方**表单**指南为准。

```vue
<script setup lang="ts">
import { ref } from 'vue'
const text = ref('')
const agree = ref(false)
</script>

<template>
  <input v-model.trim="text" />
  <label><input v-model="agree" type="checkbox" /> 同意</label>
</template>
```

---

## defineProps 与单向数据流

子组件**声明**接收的 props；**父**通过属性传入。

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{ title: string; count?: number }>(),
  { count: 0 },
)
</script>

<template>
  <h3>{{ props.title }}</h3>
</template>
```

- **子不要直接改 prop**；需要本地可编辑时，**拷贝到 `ref`** 或用 **`v-model:xxx` + emit** 回写父级。

---

## defineEmits 与类型

```vue
<script setup lang="ts">
const emit = defineEmits<{
  submit: [payload: { name: string }]
  'update:count': [n: number]
}>()
</script>
```

在父上：`@submit="handler"`。与 **`v-model:count`** 搭配时，子侧通常发 **`update:count`**（Vue 3.4+ 亦可用 `defineModel` 简化，视构建与团队规范而定）。

# Vue 入门到进阶

## 响应式状态

```vue
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">count: {{ count }}</button>
</template>
```

## 组件通信

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ (e: 'submit'): void }>()
</script>

<template>
  <h3>{{ props.title }}</h3>
  <button @click="emit('submit')">提交</button>
</template>
```

## 组合式函数（Composables）

```ts
import { ref } from 'vue'

export function useCounter() {
  const count = ref(0)
  const inc = () => count.value++
  return { count, inc }
}
```

## Pinia 示例

```ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({ name: '' }),
  actions: {
    setName(name: string) {
      this.name = name
    },
  },
})
```

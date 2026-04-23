# 注入、复用、Router 与 Pinia

在会写组件、props/emit 之后，再收拢**跨层共享**、**逻辑复用**与**全应用**的路由/状态，层次更清晰。

---

## provide 与 inject

**跨多层级**传值时，避免每层 props/emit 转发，可用 `provide` / `inject`（**偏局部**子树配置，不替代**全局**状态方案）。

- key 建议用 **`Symbol` 防止冲突**。
- 对**可选** inject 要**设默认值**并做好类型与运行时防御。

```ts
// 父
provide(ThemeKey, themeRef)

// 子（深层）
const theme = inject(ThemeKey, 'light' as 'light' | 'dark')
```

---

## 组合式函数 Composables

`useXxx.ts` 里**封装**「响应式 + 方法」，多组件**复用**；优先于**选项式 mixin** 混用逻辑。

```ts
export function useCounter(initial = 0) {
  const n = ref(initial)
  return { n, inc: (k = 1) => (n.value += k), reset: () => (n.value = initial) }
}
```

**每次在组件里调用** `useCounter()` 得到**独立一份**状态；多实例**共享**同一 store 时，把 `ref` 放在**模块级**或 **Pinia**。

---

## Teleport 与 Transition（略）

- **`<Teleport to="body">`**：把模态、全屏层挂到 `body`，躲父级 `overflow` / 叠层问题。
- **`<Transition>`** / **`<TransitionGroup>`**：动效、列表进出。

---

## 何时引入 Router 与 Pinia

| 包 | 职责 |
|----|------|
| **Vue Router** | **URL ↔ 页面/视图**、嵌套路由、导航守卫、懒加载。 |
| **Pinia** | **跨页/跨多组件**的**业务状态**、**异步 action**、与 DevTools 配合。 |

建议顺序：组件 → Router（页面边界） → Pinia（真正需要**全局**时再加）。

---

## 小结

1. 心智：**改响应式数据 → 页面自动跟新**。
2. 日常主路径：**`script setup` + `ref`/`reactive` + `computed` + 模板指令**。
3. 数据流：父**props** 下、子 **emit** 上、跨几层 **provide/inject**、跨全局 **Pinia**。
4. 深化：直接以 [cn.vuejs.org](https://cn.vuejs.org/) 为纲，在本地 Vite 项目里做**真实页面**最管用。

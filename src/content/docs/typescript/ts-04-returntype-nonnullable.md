# ReturnType 与 NonNullable

## `infer` 与 `ReturnType`

`ReturnType` 从**函数类型**中**推导出返回类型**；实现依赖 **条件类型 + `infer`** 抓出**返回位置**的类型参数。

```tsx
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any
```

**案例**：

```tsx
const myFun = () => ({
  name: 'zhangsan',
  age: 233,
  sex: '1',
  tel: 123456789,
  fun: () => 233,
  arr: [1, 2, 3, 4, 5, 6],
})

type Test2 = ReturnType<typeof myFun>
```

**错误示范**：对**非函数**使用 `ReturnType`：

```tsx
const someValue = 42
// type Invalid = ReturnType<typeof someValue> // 报错：非函数
```

> `infer` 的更多玩法（**参数/多个 infer** 等）见手册「infer Type Inference in Conditional Types」。

## `NonNullable`：排除 `null` 与 `undefined`

从**联合类型**中去掉 `null` / `undefined`（以**当前** TS 内置实现为准，下面为**一种**等价的**常见**写法，原稿中 `T & {}` 的写法是**历史/教学**笔记，**请对照**你本地 `lib.es5.d.ts` / 发行说明）：

```tsx
type NonNullable<T> = T extends null | undefined ? never : T
```

**使用案例**（仍可能需要在**运行时**配合判空/断言，类型层仅作**静态**约束）：

```tsx
type MaybeString = string | null | undefined

const value: MaybeString = getSomeStringValue()

const nonNullableValue: NonNullable<MaybeString> = value! // 或其它收窄手段

console.log(nonNullableValue.length)
```

> **最佳实践**：优先用**控制流**收窄、`?.` 可选链、与业务层的 **Error/Result** 显式模型，**避免** 滥用 `!` 与「假安全」的断言。

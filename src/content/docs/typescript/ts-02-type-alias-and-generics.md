# type、interface 与条件类型

## `type` 和 `interface` 的侧重

- **`interface`**：多用来描述**对象结构**，支持**声明合并**（同名牌累加）等工程习惯。
- **`type`**：除对象外，还常用于**联合、交叉、元组、映射、条件**等，表达力更**集中在一行一别名**上。

> 新代码在「只描述一个对象结构」时 `interface` 很顺手；在「**联合 + 条件 + infer**」时往往落在 `type` 上。团队规范优先。

## 交叉类型

通过 `&` 将多个类型**合并**为一个类型，需**同时满足**各分支（对象字段合并时常见，注意**同名不兼容**时的「`never` 洞」问题）。

```tsx
T & U
```

**示例**（仅示意，真实项目需处理原型、`Symbol` 键等；此处略做类型侧写法）：

```tsx
function extend<T, U>(first: T, second: U): T & U {
  const result = { ...first, ...second } as T & U
  return result
}
```

## 联合类型

联合类型表示「**其一**」即可，书写类似逻辑或：

```tsx
T | U
```

例如 `string | string[]` 在分支里常配合 **`typeof` / `Array.isArray`** 做**类型收窄**：

```tsx
function formatCommandline(command: string[] | string) {
  let line = ''
  if (typeof command === 'string') {
    line = command.trim()
  } else {
    line = command.join(' ').trim()
  }
  return line
}
```

> 原稿中「交的关系」在中文叙述里易与**交叉 `&` 的「且」**混淆；**联合**的直觉是 **或（OR）**。

## 类型别名

类型别名可给**任意合法类型注记**起名字，例如原始值、联合、元组、条件类型等：

```tsx
type some = boolean | string

const b: some = true
const c: some = 'hello'
```

**泛型别名**：

```tsx
type Container<T> = { value: T }
```

**自引用**（树等结构；注意**终止条件/深度** 与 编译期限制）：

```tsx
type Tree<T> = {
  value: T
  left: Tree<T> | null
  right: Tree<T> | null
}
```

## 类型索引（`keyof`）

`keyof` 从对象类型中取出**键名**的**联合**：

```tsx
interface Button {
  type: string
  text: string
}

type ButtonKeys = keyof Button
// 等价于 "type" | "text"
```

## 泛型与类型约束（`extends`）

在**泛型**里用 `extends` 约束**类型参数**（与 `class` 的 `extends` 继承是**不同**层面）：

```tsx
type BaseType = string | number | boolean

function copy<T extends BaseType>(arg: T): T {
  return arg
}
```

与 `keyof` 组合，安全地**按键取值**：

```tsx
function getValue<T, K extends keyof T>(obj: T, key: K) {
  return obj[key]
}

const obj = { a: 1 }
const a = getValue(obj, 'a')
```

## 映射类型

用 `in` 遍历**键的联合**（常配合 `keyof`），在类型层面「批量改签名」：

```tsx
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}
```

- `keyof T` 得到键的联合
- `P in keyof T` 会对每个键**分发**一次映射

## 条件类型

条件类型的语法与三元表达式**形态**类似：

```tsx
T extends U ? X : Y
```

当左边 `T` 在**可判定**的上下文中能**与 `U` 建立子类型关系**时，取 `X`，否则 `Y`；在**联合分发（distributive）** 等规则下需单独学习（见官方手册「Conditional Types」）。

下一节《内置工具：Omit / Pick 等》从 **`Omit` / `Pick`** 等**内置**类型继续展开，它们多由**条件、映射、Exclude** 等**组合**实现。

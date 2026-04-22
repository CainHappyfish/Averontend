# 工具类型：Omit、Pick、Partial 与联合裁剪

> 节选自项目笔记：`Omit` / `Pick` / `Partial` 等**内置**类型是阅读类型体操与**业务 DTO 裁剪**的常用抓手。

## Omit：省略/剔除

从对象类型中**去掉**部分键，得到新类型。

```tsx
interface UserObj {
  readonly name: string
  age: number
  id: number
  sex: 0 | 1
  address: string
  weight: number
}

type Person = Omit<UserObj, 'age' | 'sex' | 'address' | 'weight'>

interface Person1 {
  readonly name: string
  id: number
}
```

`Omit` 的经典实现形态（**示意**，以当前 TS 内置为准）：

```tsx
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
```

## Pick：采集

**只取**部分键，形成新对象类型（与 `Omit` 相对）。

```tsx
interface UserObj {
  readonly name: string
  age: number
  id: number
  sex: 0 | 1
  address: string
  weight: number
}

type Person = Pick<UserObj, 'name' | 'id'>

interface Person1 {
  readonly name: string
  id: number
}
```

```tsx
type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}
```

## Partial

把对象**所有属性**变为**可选**。

```tsx
interface Person {
  name: string
  age: number
  id: number
  sex: 0 | 1
  address: string
  weight: number
}

const newObj: Partial<Person> = {
  name: '张三',
}
```

**简易版实现**：

```tsx
type Partial<T> = {
  [P in keyof T]?: T[P]
}
```

## Required

与 `Partial` 相反，把**可选**统统一变为**必填**；`-?` 表示**剥掉**可选修饰：

```tsx
interface Person {
  name: string
  age: number
  id?: number
  sex?: 0 | 1
}

const newObj: Required<Person> = {
  name: '张三',
  age: 1,
  id: 1,
  sex: 1,
}
```

```tsx
type Required<T> = {
  [P in keyof T]-?: T[P]
}
```

## Readonly

把**每个**属性都**加上** `readonly`（**浅**只读；嵌套对象需递归工具类型时另写或引用库）：

```tsx
interface Person {
  readonly name: string
  age: number
  id?: number
}

const newObj: Readonly<Person> = {
  name: '张三',
  age: 1,
  id: 1,
}
// newObj.name = '李四' // 错误
```

```tsx
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}
```

## Extract

从联合类型 `T` 中**取出**能赋给 `U` 的那部分，常用于**子联合**的「提取」。

```tsx
type Extract<T, U> = T extends U ? T : never
```

```tsx
type Test1 = '1' | '2' | '3'

const obj: Extract<Test1, '1' | '2'> = '1'
```

## Exclude

与 `Extract` 相对，在联合中**排掉**能赋给 `U` 的成员：

```tsx
type Exclude<T, U> = T extends U ? never : T
```

```tsx
type Test1 = '1' | '2' | '3'

const obj: Exclude<Test1, '1' | '2'> = '3'
```

下一节将介绍 **`ReturnType`** 与 **`NonNullable`** 等**从函数/可空联合** 上「**推断/剔除**」的常用工具。

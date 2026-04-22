# TypeScript 基础常用用法

## 类型标注

```ts
const title: string = 'Averontend'
const count: number = 3
const done: boolean = false
```

## 接口与类型别名

```ts
interface User {
  id: string
  name: string
  role: 'guest' | 'member'
}

type ApiStatus = 'idle' | 'loading' | 'success' | 'error'
```

## 函数签名

```ts
function formatPrice(price: number, currency = 'CNY'): string {
  return `${price.toFixed(2)} ${currency}`
}
```

## 联合类型缩小

```ts
type Result = { data: string[] } | { error: string }

function printResult(result: Result) {
  if ('data' in result) {
    console.log(result.data.length)
  } else {
    console.error(result.error)
  }
}
```

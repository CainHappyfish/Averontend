# 对象、浅拷贝与迭代

## `Object.assign` 与对象展开是深拷贝吗？

**都是浅拷贝（shallow）**。

- `Object.assign(target, ...sources)`：把**可枚举、自有**源属性**拷贝**到 `target`；**遇到 getter 会求值**；是**可观察地修改 `target`** 的 API。
- **对象展开** `{ ...obj }`：同样浅拷贝**一层**可枚举**自有**属性，**不复制**原型链上继承的常规属性，但会处理 **Symbol** 键（在对应 ES 版本规则下）；与 `Object.assign` 的细微差异以规范为准，面试答「**浅 + 不拷贝原型 + 不拷贝 get/set 语义完全一致**」时需谨慎。

> 深拷贝需 `structuredClone`、库函数或**针对业务的自定义**，注意 **函数、环、特殊对象** 与 **性能/安全**。

## `for...in` 与 `for...of`

两者都是循环语法，**语义不同**：

| | `for...in` | `for...of` |
| --- | --- | --- |
| 典型场景 | 遍历**可枚举的字符串键**（含**继承**链上可枚举属性，除非过滤） | 遍历**有迭代器/可迭代协议**的集合的**值**（数组元素、`Map` 值、`String` 码元等，依对象而定） |
| 数组 | 得到**字符串下标**「`"0"`,`"1"`…」并可能**带上原型**上的可枚举键 | 得到**元素值**（在原生数组上最直观） |
| 普通对象 | 可枚举的键 | **默认不可**；需对象实现**可迭代协议**或遍历 `Object.keys` 等 API |

> 对数组做「只想要下标/值」时，优先 `for`/`forEach`/`for...of`；**`for...in` 不擅长遍历作为列表的数组**。

**常见修正表述**（易背错）：

- `for...of`：在**可迭代对象**上取**值**（数组即元素、字符串即每段迭代结果、Map/Set 依其迭代语义）。
- `for...in`：遍历**可枚举的键**（在对象上；数组上为下标**字符串**，且**不要**假设顺序与下标一一无干扰）。

**总结**：`for...in` 更面向「对象的可枚举**键**空间」的探测（常配合 `hasOwn`）；`for...of` 更面向**迭代协议**的**值**级遍历。

## 用 `for...of` 遍历**普通**对象

普通对象**默认**不是内置可迭代对象。可用 **`Object.keys` / `Object.entries` / `Object.getOwnPropertyNames`** 等，或**手动挂** `Symbol.iterator`：

```js
const obj = { a: 1, b: 2, c: 3 }

obj[Symbol.iterator] = function* () {
  const keys = Object.keys(this)
  for (const k of keys) {
    yield [k, this[k]]
  }
}

for (const [k, v] of obj) {
  console.log(k, v)
}
```

> 更常见写法是直接 `for (const [k, v] of Object.entries(obj))` —— 无需自写迭代器。

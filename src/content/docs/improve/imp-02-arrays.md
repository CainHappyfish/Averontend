# 数组与类数组

## 判断是否为数组

常用方式（按场景选择，**优先 `Array.isArray`**）：

```js
Object.prototype.toString.call(obj).slice(8, -1) === 'Array'

// 依赖原型链与执行环境，了解即可
obj.__proto__ === Array.prototype

Array.isArray(obj)

obj instanceof Array
```

> 注意：`instanceof` 在跨 realm（如多个 iframe）可能不准；`Array.isArray` 更稳。

## 类数组（Array-like）

拥有 **`length` 与若干下标属性**的对象，如 `arguments`、部分 DOM 列表。**没有**数组原型上的方法，可用 `call` / `apply` 借用，或转为真数组。

```js
var arrayLike = {
  0: 'name',
  1: 'age',
  2: 'sex',
  length: 3,
}
```

### 转为真数组

```js
var arrayLike = { 0: 'name', 1: 'age', 2: 'sex', length: 3 }

Array.prototype.slice.call(arrayLike)
Array.prototype.splice.call(arrayLike, 0)
Array.from(arrayLike)
Array.prototype.concat.apply([], arrayLike)
```

## `arguments` 对象

仅存在于**非箭头函数**的函数体内，是类数组，包含实参。非严格模式与形参的「别名」行为、严格模式下的差异以 MDN/规范为准；**`arguments.callee` 在严格模式不可用**，且新代码更推荐**剩余参数** `(...rest)` 代替对 `arguments` 的强依赖。

```js
var data = []
for (var i = 0; i < 3; i++) {
  data[i] = (function (j) {
    return function () {
      console.log(j)
    }
  })(i)
}
data[0]()
data[1]()
data[2]()
```

## 常用数组 API（分类记忆）

- **与字符串互转**：`toString` / `toLocaleString` / `join`（`join` 可指定分隔符）。
- **尾操作**：`pop` / `push`（`push` 可一次推多个）。
- **首操作**：`shift` / `unshift`。
- **重排**：`reverse` / `sort`；`sort` 可传比较函数 `(a, b) => number`。
- **不可变/部分不可变地合并或截取**：`concat`、`slice`（不修改原数组）。
- **会改原数组的拼接/裁切**：`splice`（可删可插，签名见下）。
- **查找下标**：`indexOf` / `lastIndexOf`（`includes` 更语义化，ES2016+）。
- **迭代系**：`every` / `some` / `filter` / `map` / `forEach`（**注意** `forEach` 中无法用 `return` 终止外层，也不能 `break`）。
- **归约**：`reduce` / `reduceRight`。

```js
array.splice(startIndex, deleteCount, item1, item2, /* … */)
```

### 会修改原数组的方法（常考）

`fill`（部分场景）、`pop`、`push`、`shift`、`splice`、`unshift`、`reverse`、`sort` 等；具体以**是否**对原对象做**原地**更新为准。

### 常不改变原数组（返回新结果或只读迭代）

`concat`、`filter`、`slice`、`map`（**返回新数组**）、`reduce` 等；但注意 **`map` 回调里若给元素赋可变对象的属性，会「看起来」改到原物」**——仍是**浅**语义。

## `Array.prototype.sort` 的引擎策略（简版）

各引擎实现不同，**不要依赖排序的稳定性/复杂度细节作为跨浏览器契约**；现代 ECMA 对 `Array.prototype.sort` 的**稳定性**有规范要求（随版本迭代）。V8 等会在小数组/常见形态下混合使用**插入排序、快排变种、Timsort** 等。面试答法：**平均接近 O(n log n)**，比较函数**写得越便宜越好**；超大数据**分页/分块**再合并。

## `forEach` 与 `map` 有何不同

- **`forEach`**：按元素执行副作用，**返回 `undefined`**，**不返回新数组**；无法从 `forEach` **中断**为外层的 `return`/`continue` 语义（需用 `some`/`every` 等模式）。
- **`map`**：返回**新数组**，长度与原数组相同，一一对应；未显式 `return` 的位置会变成 `undefined`。

## 与字符串 API 的配合

- 字符串的 `split` 与 `join` 常和数组一起考「往返」；注意编码与**代理对**问题（`split('')` 在含 emoji 时并不总是「字符级」），需要时用 `Array.from` 或**迭代器**按码点切分（依运行环境能力）。

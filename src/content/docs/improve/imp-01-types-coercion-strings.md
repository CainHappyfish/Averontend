# JavaScript 数据类型与类型转换

> 延伸阅读（场景题笔记）：[JavaScript 场景题 (Notion)](https://www.notion.so/JavaScript-23e648f69905803aaf6fc599114f4b52?pvs=21)

`JavaScript` 共有**八种**数据类型：**Undefined、Null、Boolean、Number、String、Object、Symbol、BigInt**。

其中 **Symbol** 和 **BigInt** 是 ES6 起逐步普及的类型：

- **Symbol**：创建后独一无二且不可变，常用于避免全局键名、实现私有字段语义等。
- **BigInt**：表示任意精度的整数字面量，可安全存储超出 `Number` 安全整数范围的大整数。

## 原始类型与引用类型

这些类型可粗分为**原始数据类型**与**引用数据类型**；在引擎实现里常对应**栈 / 堆**等不同存储与存活策略的直观理解（以规范与具体引擎为准，勿死记「一定在某个区」的物理细节）：

- **堆**：通常存放**引用数据类型**（如普通 `Object`、数组、函数等），体积与生命周期变化大。
- **栈**：常用来存放**原始值**的引用、执行上下文、小型固定结构等，访问频繁、模型上更「线形」；**原始值**往往按值语义参与运算，**对象**在栈中常见的是**指向堆上对象的引用**。

## 堆与栈：心智图

- 引用数据类型在堆中存实体，在栈/上下文里以**引用（指针/句柄）**出现。
- 原始类型在表达式里以**值拷贝**的直觉更容易理解，例如数字、布尔等。

## substring 与 substr

两者都用于取子串，**参数含义不同**（注意：`substr` 在 Web 标准中已标记弃用，新代码建议用 `slice` 或 `substring`）：

- `substring(startIndex, endIndex)`：起止均为索引，`end` 可省略，表示取到**不含** `end` 的区间。
- `substr(startIndex, length)`：从 `start` 起取**长度**为 `length` 的一段；`length` 可省略时取到末尾。

## 类型转换（概览）

### 转数字

- **Undefined** → `NaN`
- **Null** → `+0`
- **Boolean** → `true` → `1`，`false` → `+0`
- **Number** → 同值
- **String** → 先尝试数词法转换；含非数片段往往得 `NaN`；`parseInt` / `parseFloat` 的解析规则更细（前导、进制等）

```js
console.log(Number('123')) // 123
console.log(Number('10px')) // NaN
console.log(parseInt('123abc', 10)) // 123
```

### 转字符串

- **Undefined** → `"undefined"`
- **Null** → `"null"`
- **Boolean** → `"true"` / `"false"`
- **Number** → 见规范，含 `NaN`/`Infinity` 等
- **String** → 同值

### 转对象 / 包装类型

- 除 `null` / `undefined` 外，原始值可通过 `String` / `Number` / `Boolean` 等构造函数得到对应包装对象（日常更多用自动装箱的理解即可）。
- 在「期望是对象」的上下文，对 `null` / `undefined` 往往抛 `TypeError`。

### 转布尔

仅 **falsy** 的少数值会被当成 `false`（经典集合）：`false`、`0`、`-0`、`NaN`、`""`、`null`、`undefined`；**对象（含 `[]`）在布尔上下文一般为 `true`**（除非自己定义 `toString` / `valueOf` 的转换行为，见后文）。

```js
console.log(Boolean('')) // false
console.log(Boolean([])) // true
```

### 对象到原始值

通常按 **`Symbol.toPrimitive` → `valueOf` → `toString`（根据 hint）** 的路径尝试，直到得到原始值或失败（`ToPrimitive` 细节以 ECMA 规范为准）。文中示例：

```js
const obj = {
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return 42
    return 'object'
  },
}
console.log(obj + 1) // 例如 "object1" 一类结果，依 hint 与运算而定
```

#### 常见陷阱

- 空数组 `[]` 转布尔为 `true`，在数值上下文可能经 `toString` 成 `''` 再成 `0`：

```js
console.log(Number([])) // 0
console.log([] == false) // true（`==` 会触发多步隐式转换，勿依赖）
```

- 日期在 `+` 与「减数字」中往往表现不同，分别偏向字符串与数值。

### 运算符与隐式转换

- `+`：若一侧为字符串倾向，往往走**拼接**。
- 多数算术/位运算会倾向 **ToNumber**。

```js
console.log('5' + 3) // "53"
console.log('5' - 2) // 3
```

### `JSON.stringify` 与特殊值

- 基本类型按常规序列化，**`undefined` 在对象属性**等场景有省略规则，在**数组**里可能出现 `null` 占位（以规范为准）。
- 函数、部分 `Symbol` 等在对象属性中常被忽略，除非自定义 `toJSON` 等。

## undefined、null、0、NaN 与空字符串

- **`undefined`**：未赋值、无返回、缺失属性等。
- **`null`**：刻意表示「无对象」的占位，类型检测为 `object` 是历史包袱（`typeof null === 'object'`）。
- **`0` / `-0`**：与 `+0` 在 `Object.is` 下可区分；除法溢出得 `±Infinity`。
- **`NaN`**：与自身**不相等**，请用 `Number.isNaN` 判断是否为 **NaN 数值**（对字符串先 `Number` 再判）。

**练习**：在控制台用 `==` 与 `===` 各写几组 `null` / `undefined` 比较，并阅读 `==` 的抽象相等规则说明。

## 关于「引用与拷贝」的预告

- `Object.assign` 与对象展开**默认是浅层拷贝**，**嵌套对象**仍共享内层引用；与深拷贝、结构化克隆是不同问题，见后文《对象、迭代与拷贝》一节。

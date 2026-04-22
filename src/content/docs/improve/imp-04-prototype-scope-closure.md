# 原型、作用域、this 与闭包

## 原型与原型链

除 `null` 外，JS 中的对象在创建时都会**关联**一个原型；访问属性时若自身没有，会沿**原型链**向**上**查，直到 `Object.prototype` 或链终点。

```js
function Person() {}
const person = new Person()
person.name = 'Kevin'
console.log(person.name) // Kevin

Person.prototype.name = 'Kevin'
const person1 = new Person()
console.log(person1.name) // Kevin

console.log(person.__proto__ === Person.prototype) // true
console.log(Person === Person.prototype.constructor) // true
```

- **每个函数**有 `prototype` 指向**作为构造函数时**的「实例原型」对象。
- **实例**有 `__proto__`（或标准 API `Object.getPrototypeOf`）指回构造函数的 `prototype`（旧教材写法；新代码**避免在业务中大量魔改** `__proto__`）。
- 原型上可有 **`constructor`** 指回函数本身。

> 图例（教材常见）：`实例 → 构造函数.prototype → … → Object.prototype → null`（**原型**与**构造器**角色不同，别混用）。

## 作用域与作用域链

**词法作用域**（在写代码时，即「静态」绑定**函数体**的**父级**环境，而非调用栈动态猜）：函数**定义处**的父级，构成闭包/链的上游。

```js
var scope = 'global scope'
function checkscope() {
  var scope = 'local scope'
  function f() {
    return scope
  }
  return f()
}
checkscope() // "local scope"

var scope2 = 'global scope'
function checkscope2() {
  var scope2 = 'local scope'
  function f() {
    return scope2
  }
  return f
}
checkscope2()() // "local scope"
```

查找变量时，自当前**执行上下文的词法环境**逐层**向外**上溯到全局，这串链即**作用域链**（实现细节有「环境记录」等概念，以规范为准）。

## `this` 的绑定

**由调用方式**决定，而不是由「函数写在哪」单独决定（箭头函数**例外**）：

- **直接调用**普通函数：非严格模式下常为**全局**（浏览器 `window` 等），严格模式为 `undefined`。
- **`new` 构造函数**：`this` 指向**新对象**；若**显式 `return` 一个对象**，则以该对象为准**替换**默认实例；若 `return` 非对象，则**仍**以默认实例为准。
- **`call` / `apply` / `bind`**：把 `this` **显式**绑到**第一个实参**（`bind` 返回**新函数**）。
- **作为对象方法调用**：`this` 一般为**调用时**的**接收方**；若**先**取出再**裸调**，会丢失**接收方**（常见要 `bind` 或**箭头/局部变量**保存）。
- **箭头函数**：**没有**自有 `this` / `arguments` / 构造能力；**在词法上继承外层**的 `this`，**且不可被** `call` 等**改写**；适合做回调和 `setTimeout` 里**固定**外层 `this`。

> `setTimeout(function(){ ... }, 0)` 中普通函数的 `this` 常见为**全局/严格 undefined**；**箭头函数**会继承**外层** `this`（如方法里的 `this` 指向 `foo`）。

## 闭包

> MDN：闭包是**能访问**词法**外部**的**非局部变量**的函数组合。

- **实现角度**：**内部函数**持有了对外层词法环境**中绑定**的**引用**；外层返回后，只要还有引用可达，这些绑定就**不一定会被**回收（这是能力，也带来**被误用**占内存的隐患）。

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

- **用 `let` 块级**或 **IIFE 传 `i`** 是常见修复「循环里异步打印同一 `i`」的样板。

## 尾调用

**尾调用**指函数**最后一步**是**原样**把控制权交给**另一个**函数调用；**严格模式**下，引擎可以**不保留**当前栈帧（**尾调用优化**，TCO），利于深递归的栈空间。现实：**浏览器/Node 的 TCO 支持非常有限/不稳定**，**不要依赖 TCO 写业务算法**，面试知道概念即可。

## 按值还是按引用

**对原始类型**：在参数传递的直觉模型里，常描述为**传值**；函数里改形参的**新赋值**不会影响外部变量。  
**对对象/数组**传的是**引用的值**（`reference` 的**拷贝**），在函数里**改**属性会影响**同堆对象**；**整体重新赋值**形参**不会**改外部标识符的绑定。面试答清这两层，就不容易和「引用类型」的直觉打架。

```js
var value = 1
function foo(v) {
  v = 2
  console.log(v) // 2
}
foo(value)
console.log(value) // 1
```

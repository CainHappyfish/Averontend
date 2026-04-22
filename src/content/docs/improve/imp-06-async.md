# 异步与 Promise

## `Promise` 基本语义

- `Promise` 是**异步**编程的一种**抽象**，把**将来**的完成/失败**标准化**为**可组合**的 `then` 链与 `async/await` 语法糖。
- **三态**（概念上）：`pending` → `fulfilled` 或 `rejected`；**只决一次**，状态**不可逆**。

构造器**立即**执行**executor**；`resolve` / `reject` 用于从 `pending` **落定**。

```js
new Promise((resolve, reject) => {
  // async op
  resolve(value)
  // or reject(err)
})
```

- **缺点/边界**（面试常点）：`Promise` **创建即执行**，**不自带可取消**（需**自定义**或 **AbortController** 等**组合**模式）；`reject` 的**未处理**在有些环境下会以**未捕获**形式冒泡，需要 `.catch` 或**全局**监听与规范更新。

## 常用 API

- **`then` / `catch` / `finally`**
- **`Promise.all`**：全部 `fulfill` 才**整体** `fulfill`，**一**个 `reject` 即**整体** `reject`（**短路**），结果为**与输入同序**的值数组（或**首个**的拒绝原因，依具体调用）。
- **`Promise.race`**：**任一**先落定即跟其**结果/原因**走。
- **`Promise.allSettled`**：全部**落定**后给**每段**的 `{ status, value/reason }` 信息（**不短路**为整体失败，除非你自己包一层 `Promise` 再**抛**）。

### `all` 与 `allSettled` 的取舍

- 需要**全部成功**的**强事务**感 → 倾向 `all`（**早失败、早停**的语义在业务里是否合适要评估）。
- 要**对失败项做**补偿/重试/统计 → 倾向 `allSettled`。

## `async` / `await`

- `async` 函数**总**返回**Promise**；**显式** `return x` 视同 `Promise.resolve(x)`。
- `await` **暂停当前 async 函数**到**该 Promise 落定**（在**微任务**队列语义下继续），**不阻塞**主线程的其它**宏任务/渲染**的粗粒度时序，但会**让出**当前 async 函数的控制流，直到结果可用。
- **错误处理**优先 **`try/catch` 包住 await**，或在**返回的 Promise 上** `.catch`；`await` **拒绝**会**像 throw** 一样在 `try/catch` 里**被捕**（注意**并发的 `await` 在循环里**会**串行**——是常见性能坑，需要 **`Promise.all` + 映射** 或 **`for await…of` on async iterable** 分场景处理）。

**对比 `then` 链**：

- `async/await` **更线性、更可读**；**`then` 链**在**高阶**组合、**不引入 `async` 的库边界**中仍常出现。

## 与「网络 / 时间」的衔接

现代接口请求多为 **fetch/xhr/库**，返回 **Promise 或 类 Promise** 对象；`await` 常与其配合。下一节《网络、模块与 ES6+》中展开 **fetch / axios** 的**边界行为**与**模块**差异。

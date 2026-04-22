## 在页面里运行 JavaScript

在「写代码」里编辑的 `js` 会在沙箱页面里执行。脚本可以：

- 使用浏览器提供的 **DOM API** 读取、修改页面上已渲染的节点；
- 使用 **Web API**（如 `console`）与预览环境交互，便于在右侧控制台里观察运行结果。

沙箱中代码执行顺序是：先加载 HTML 结构，再应用 CSS，再执行你的脚本。因此用脚本查询 DOM 时，应确保目标元素已经出现在 HTML 里。

## DOM 与选择器

**DOM**（Document Object Model）是浏览器把 HTML 解析后形成的树形结构。JavaScript 通过 DOM API 访问这棵树，例如：

- `document.querySelector('选择器')`：返回匹配到的第一个元素，找不到则返回 `null`。
- `document.querySelectorAll('选择器')`：返回 NodeList，可遍历多个节点。
- 元素上可用 `el.classList.add/remove/toggle` 在运行时切换 `class`，无需手写整个 `class` 字符串。

> 在练习里给 `.card` 加点击态时，可先用 `querySelector('.card')` 取到根节点，再 `classList.toggle('active')`。

## 事件与 addEventListener

**事件**是用户或浏览器触发的行为（如 `click`、`input`、`resize`）。常用写法用 `addEventListener` 绑定：

```js
const el = document.querySelector('.card')
el?.addEventListener('click', () => {
  // 在回调里写响应逻辑
})
```

- 第二个参数是 **回调函数**，在事件触发时执行。
- 用 `?` 可选链可避免 `querySelector` 取不到时抛错；若 `el` 为 `null`，不会调用 `addEventListener`。
- 同一事件类型可多次 `addEventListener`；在练习的简易示例里，避免重复执行同一 `render` 导致重复绑定时，要注意逻辑拆分。

## 与 HTML、CSS 的分工

- **结构（HTML）** 只描述语义与层次；**样式（CSS）** 只描述外观与布局；**行为（JS）** 在二者就绪后，根据事件或数据更新 DOM 与样式类。
- 用 JS 做「动画或临时态」时，更推荐 **切换 class**（由 CSS 描述 `.active` 的样子），而不要把大量内联 `style` 写死在 JS 里，方便维护与对照文档里的「本节课 CSS」练习。

## console 与调试

- `console.log`：输出普通信息，会在右侧 **控制台** 中显示（沙箱会转发到父页面）。
- 写练习代码时，可在关键步骤加 `log`，确认变量值与执行顺序，再与文档中的说明对照。

## 安全习惯：target 与 rel

- 为 `<a target="_blank">` 的链接在 HTML 中加上 `rel="noreferrer"`（或更完整的 `noopener` 组合）是现代常用写法，降低新窗口带来的 **`window.opener` 风险**；脚本中若打开新窗口，也应了解同源与打开策略的约束。

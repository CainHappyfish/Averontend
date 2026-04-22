## src 与 href：嵌入资源，还是建立引用

`src` 和 `href` 都能关联外部资源，但语义与加载行为不同：

- **src**：把资源内容嵌入当前文档流程，常见于 `img`、`script`、`iframe`。
- **href**：建立引用关系，不把资源本体嵌入标签位置，常见于 `a`、`link`。

> `script src` 会参与脚本加载与执行时机控制；`link href` 主要用于样式表和外部链接关系。

## script 的 defer 与 async：下载与执行顺序

两者都用于异步加载外部脚本，区别主要在执行时机与顺序：

- **执行顺序**
  - `async`：谁先下载完谁先执行，顺序不保证。
  - `defer`：按文档中出现顺序执行。
- **执行时机**
  - `async`：下载完成后立即执行，可能打断 HTML 解析。
  - `defer`：等待 HTML 解析完成后执行（`DOMContentLoaded` 前）。

## 行内、块级与空（void）元素

空元素没有闭合标签，不能包含内容，例如：`<input />`

- **行内元素**：`a`、`span`、`strong`、`img`、`input`、`select`
- **块级元素**：`div`、`p`、`h1`、`ul`、`ol`、`li`、`dl`、`dt`、`dd`
- **空元素**：`hr`、`br`、`img`、`input`、`link`、`meta`

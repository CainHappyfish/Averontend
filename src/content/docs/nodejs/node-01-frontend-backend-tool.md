# Node.js 01：前端工程师为什么要学 Node.js

## 本节目标

这一章不是让你立刻转后端，而是让你拥有一套“前端身边的后端工具箱”。Node.js 让 JavaScript 跑在浏览器之外，于是你可以用熟悉的语言做这些事：

- 写脚本：批量生成文件、整理文档、处理构建产物
- 启服务：做 Mock API、本地联调服务、轻量后台接口
- 做中间层：把多个后端接口整理成前端更好用的数据
- 管工程：运行 Vite、ESLint、TypeScript、测试和打包脚本

前端工程师学 Node.js 的重点不是“背 API”，而是理解它能补上前端开发链路里的哪一块。

## 浏览器和 Node.js 的区别

浏览器里的 JavaScript 面向页面：

- 有 `document`、`window`、DOM、BOM
- 主要处理用户交互、页面渲染、网络请求
- 受同源策略、权限和沙箱限制

Node.js 里的 JavaScript 面向系统和服务：

- 没有 DOM，也没有 `window`
- 可以读写文件、启动 HTTP 服务、访问环境变量
- 常用于命令行工具、开发服务器、接口服务、构建工具

简单说：浏览器负责“用户看到什么”，Node.js 负责“开发和服务如何运转”。

## 前端最常见的 Node.js 使用场景

### 1. 运行项目脚本

你每天写的这些命令，本质都依赖 Node.js 生态：

```bash
npm install
npm run dev
npm run build
npm run preview
```

`package.json` 里的 `scripts` 是团队协作的统一入口。不要让每个人记不同命令，把它们写进脚本里。

### 2. 写开发辅助工具

比如根据路由配置生成菜单、批量创建组件模板、扫描 Markdown 标题、生成 API 类型声明。这些任务不属于页面交互，但能明显提升开发效率。

### 3. 做本地 Mock 服务

当前端页面还没等到真实后端接口时，可以用 Node.js 先起一个接口服务：

```js
import http from 'node:http'

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ data: [{ id: 1, name: 'Hina' }] }))
})

server.listen(3000, () => {
  console.log('mock server: http://localhost:3000')
})
```

这段代码很原始，但它说明了 Node.js 可以直接启动一个 HTTP 服务。

### 4. 做 BFF

BFF 是 Backend For Frontend。它不是传统大后端，而是更贴近前端页面的数据适配层。

例如页面需要“用户信息 + 练习计划 + 最近反馈”，真实后端可能有三个接口。BFF 可以聚合它们，给前端一个更好用的接口。

## 本章学习路线

本章会按前端实际工作顺序展开：

1. 先理解 Node.js 的定位
2. 学会写命令行脚本
3. 理解 HTTP 接口的基本结构
4. 使用 Koa 写小型 API 服务
5. 用中间件、路由和 body 解析完善 CRUD
6. 把 Node.js 用作 Mock、BFF 和部署辅助工具

## 本节练习

在本机准备一个目录：

```bash
mkdir node-for-frontend
cd node-for-frontend
npm init -y
node -v
```

然后在 `package.json` 里加一个脚本：

```json
{
  "scripts": {
    "hello": "node hello.js"
  }
}
```

创建 `hello.js`：

```js
console.log('Node.js is a backend tool for frontend work.')
```

运行：

```bash
npm run hello
```

如果你能用 `npm run hello` 跑出内容，就完成了本章的第一步。

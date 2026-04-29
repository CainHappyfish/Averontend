# Node.js 04：Koa 入门，写一个小型 API 服务

## 本节目标

Koa 是一个轻量 Node.js Web 框架。它不像原生 `http` 那样需要你手动处理很多细节，也不像大型框架那样自带一堆约定。对前端工程师来说，Koa 很适合用来做：

- 本地 Mock 服务
- 管理后台轻量接口
- BFF 数据聚合层
- 前后端联调代理服务

本节会用 Koa 写一个最小 API 服务。

## 创建项目

```bash
mkdir koa-practice
cd koa-practice
npm init -y
npm install koa @koa/router koa-bodyparser @koa/cors
```

在 `package.json` 里加：

```json
{
  "type": "module",
  "scripts": {
    "dev": "node server.js"
  }
}
```

## 启动第一个 Koa 服务

创建 `server.js`：

```js
import Koa from 'koa'

const app = new Koa()

app.use(async (ctx) => {
  ctx.body = {
    data: 'Hello Koa',
  }
})

app.listen(3000, () => {
  console.log('Koa server: http://localhost:3000')
})
```

运行：

```bash
npm run dev
```

访问 `http://localhost:3000`，你会看到 JSON 响应。

## ctx 是什么

Koa 的核心对象是 `ctx`，它把请求和响应包装在一起。

常用属性：

- `ctx.method`：请求方法
- `ctx.path`：请求路径
- `ctx.query`：查询参数
- `ctx.params`：路由参数，需要 Router
- `ctx.request.body`：请求体，需要 bodyparser
- `ctx.status`：响应状态码
- `ctx.body`：响应内容

你可以把 `ctx` 理解成“这次请求的上下文”。

## Koa 的洋葱模型

Koa 中间件长这样：

```js
app.use(async (ctx, next) => {
  console.log('before')
  await next()
  console.log('after')
})
```

多个中间件会像洋葱一样执行：

1. 先进入外层中间件
2. `await next()` 交给下一层
3. 里面全部执行完后，再回到外层

这很适合做日志、错误处理、鉴权、耗时统计。

```js
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.path} ${ctx.status} - ${ms}ms`)
})
```

## 加上 Router

使用 `@koa/router`：

```js
import Koa from 'koa'
import Router from '@koa/router'

const app = new Koa()
const router = new Router({ prefix: '/api' })

router.get('/health', (ctx) => {
  ctx.body = {
    data: {
      status: 'ok',
    },
  }
})

router.get('/practices', (ctx) => {
  ctx.body = {
    data: [
      { id: 1, title: '吉他分段练习', status: 'doing' },
      { id: 2, title: '合奏走位确认', status: 'todo' },
    ],
  }
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000, () => {
  console.log('Koa server: http://localhost:3000')
})
```

现在你有两个接口：

- `GET /api/health`
- `GET /api/practices`

## 给前端调用

前端可以这样请求：

```js
const res = await fetch('http://localhost:3000/api/practices')
const result = await res.json()
console.log(result.data)
```

如果前端和接口端口不同，下一步要加 CORS。

## 本节练习

完成一个 Koa 服务：

1. `GET /api/health` 返回健康状态
2. `GET /api/practices` 返回练习计划列表
3. 给每次请求打印 method、path、status、耗时

做到这一步，你已经有了前端可调用的小型 API 服务。

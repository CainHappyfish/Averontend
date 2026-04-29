# Node.js 05：Koa 中间件、Router、Body 与错误处理

## 本节目标

这一节把 Koa 从“能返回列表”推进到“能做 CRUD”。我们先用内存数组模拟数据库，重点练接口结构、请求体解析、参数校验和统一错误处理。

你会完成：

- `koa-bodyparser` 解析 JSON 请求体
- `@koa/cors` 处理本地跨域
- `@koa/router` 拆分 REST 路由
- 统一错误响应
- 一个练习计划 CRUD API

## 完整依赖

```bash
npm install koa @koa/router koa-bodyparser @koa/cors
```

`package.json`：

```json
{
  "type": "module",
  "scripts": {
    "dev": "node server.js"
  }
}
```

## 服务骨架

```js
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

const app = new Koa()
const router = new Router({ prefix: '/api' })

app.use(cors())
app.use(bodyParser())
```

`cors()` 解决本地前端跨域，`bodyParser()` 让你能通过 `ctx.request.body` 读取 JSON。

## 统一错误处理

错误处理中间件要尽量放在前面：

```js
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    ctx.status = error.status ?? 500
    ctx.body = {
      error: error.message ?? 'Internal Server Error',
    }
    ctx.app.emit('error', error, ctx)
  }
})
```

这样路由里抛出的错误都能被统一转换成 JSON，而不是直接让服务崩掉。

## 内存数据仓库

先不用数据库：

```js
let nextId = 3

const practices = [
  { id: 1, title: '吉他分段练习', status: 'doing' },
  { id: 2, title: '合奏走位确认', status: 'todo' },
]

function findPractice(id) {
  return practices.find((item) => item.id === Number(id))
}
```

内存数据会在服务重启后丢失，但非常适合练接口。

## 查询列表

```js
router.get('/practices', (ctx) => {
  ctx.body = {
    data: practices,
  }
})
```

前端调用：

```js
const res = await fetch('http://localhost:3000/api/practices')
const result = await res.json()
```

## 查询详情

```js
router.get('/practices/:id', (ctx) => {
  const item = findPractice(ctx.params.id)

  if (!item) {
    ctx.status = 404
    ctx.body = { error: 'Practice not found' }
    return
  }

  ctx.body = { data: item }
})
```

## 新增记录

```js
router.post('/practices', (ctx) => {
  const body = ctx.request.body

  if (!body.title) {
    ctx.status = 400
    ctx.body = { error: 'title is required' }
    return
  }

  const item = {
    id: nextId++,
    title: body.title,
    status: body.status ?? 'todo',
  }

  practices.push(item)
  ctx.status = 201
  ctx.body = { data: item }
})
```

前端提交时要记得 `Content-Type`：

```js
await fetch('http://localhost:3000/api/practices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ title: '新曲目合奏', status: 'todo' }),
})
```

## 更新和删除

```js
router.patch('/practices/:id', (ctx) => {
  const item = findPractice(ctx.params.id)

  if (!item) {
    ctx.status = 404
    ctx.body = { error: 'Practice not found' }
    return
  }

  Object.assign(item, ctx.request.body)
  ctx.body = { data: item }
})

router.delete('/practices/:id', (ctx) => {
  const index = practices.findIndex((item) => item.id === Number(ctx.params.id))

  if (index === -1) {
    ctx.status = 404
    ctx.body = { error: 'Practice not found' }
    return
  }

  const [removed] = practices.splice(index, 1)
  ctx.body = { data: removed }
})
```

## 启动服务

```js
app.use(router.routes())
app.use(router.allowedMethods())

app.on('error', (error) => {
  console.error(error)
})

app.listen(3000, () => {
  console.log('Koa CRUD API: http://localhost:3000')
})
```

## 本节练习

把上面的接口整理成完整 `server.js`，并用浏览器、Postman、curl 或前端页面验证：

1. 查询练习列表
2. 新增一条练习
3. 修改这条练习状态
4. 删除一条练习
5. 故意传空标题，确认会返回 `400`

这就是一个小型管理系统后端的雏形。

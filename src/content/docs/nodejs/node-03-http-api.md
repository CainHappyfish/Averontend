# Node.js 03：HTTP 服务、接口与前后端联调

## 本节目标

前端调接口时，最怕只会说“接口不通”。学一点 Node.js 后端基础，可以让你更快定位问题：是 URL 错了、method 错了、参数没传、服务端报错，还是跨域没处理。

本节重点：

- HTTP 请求和响应的基本结构
- REST 风格接口怎么设计
- 状态码和 JSON 响应怎么读
- 前后端联调时如何排查问题

## 一个接口由什么组成

前端发起请求时，至少要看四件事：

- URL：请求到哪里
- Method：用 `GET`、`POST`、`PUT`、`PATCH` 还是 `DELETE`
- Request：请求头、查询参数、请求体
- Response：状态码、响应头、响应体

例如：

```js
await fetch('http://localhost:3000/api/practices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Pastel＊Palettes 合奏练习',
    status: 'todo',
  }),
})
```

这不是“调用一个函数”，而是浏览器和后端服务之间的一次 HTTP 对话。

## REST 风格接口

管理系统最常见的是 CRUD：

- `GET /api/practices`：查询列表
- `GET /api/practices/:id`：查询详情
- `POST /api/practices`：新增
- `PUT /api/practices/:id`：整体更新
- `PATCH /api/practices/:id`：局部更新
- `DELETE /api/practices/:id`：删除

REST 不是强制规范，但它能让接口语义更稳定。前端看到 method 和 URL，就能猜到大概用途。

## 状态码要会读

常见状态码：

- `200`：成功
- `201`：创建成功
- `204`：成功但没有响应体
- `400`：请求参数有问题
- `401`：未登录
- `403`：无权限
- `404`：资源不存在
- `500`：服务端异常

前端处理接口时不要只判断“有没有 data”。状态码本身就是重要信号。

## 用 Node 原生 http 写一个小接口

```js
import http from 'node:http'

const practices = [
  { id: 1, title: '吉他分段练习', status: 'doing' },
  { id: 2, title: '合奏走位确认', status: 'todo' },
]

const server = http.createServer((req, res) => {
  if (req.url === '/api/practices' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ data: practices }))
    return
  }

  res.statusCode = 404
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(3000, () => {
  console.log('server: http://localhost:3000')
})
```

原生 `http` 能帮助你理解底层，但真实项目里通常会使用 Koa、Express、Fastify 这类框架。

## 跨域是什么

如果前端页面运行在 `http://localhost:5173`，接口运行在 `http://localhost:3000`，它们就是不同源。

浏览器会要求接口服务返回类似这样的响应头：

```txt
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE
Access-Control-Allow-Headers: Content-Type,Authorization
```

所以跨域问题不是前端 `fetch` 写错，也不是浏览器“抽风”，而是服务端需要允许这个来源访问。

## 联调排查顺序

接口不符合预期时，按这个顺序看：

1. Network 面板里请求有没有发出去
2. URL 和 method 是否正确
3. 请求体是否是后端需要的格式
4. 状态码是多少
5. 响应体里的错误信息是什么
6. 服务端控制台有没有报错
7. 是否是跨域或鉴权问题

这套顺序能帮你从“感觉不通”变成“定位到哪里不通”。

## 本节练习

用原生 `http` 写一个 `GET /api/health`：

```json
{
  "data": {
    "status": "ok"
  }
}
```

然后在浏览器或终端访问：

```bash
curl http://localhost:3000/api/health
```

确认能得到 JSON 响应后，再进入 Koa。

# Node.js 06：Mock、BFF 与部署前检查

## 本节目标

学完 Koa 的 CRUD 后，前端工程师还需要知道 Node.js 在团队协作里能扮演什么角色。本节把它放到真实开发流程里：

- 前后端并行开发时做 Mock 服务
- 页面需要组合多个接口时做 BFF
- 本地联调时做代理和数据适配
- 上线前检查端口、环境变量、日志和错误响应

## Mock 服务

Mock 的目标不是随便返回假数据，而是尽量模拟真实接口：

- URL 和 method 接近真实设计
- 字段名和类型保持稳定
- 状态码要覆盖成功和失败
- 响应延迟可以适当模拟

示例：

```js
router.get('/practices', async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 300))

  ctx.body = {
    data: [
      { id: 1, title: '合奏练习', status: 'doing' },
      { id: 2, title: '新曲目确认', status: 'todo' },
    ],
  }
})
```

有延迟的 Mock 更接近真实网络，前端才能认真处理 loading 状态。

## BFF 是什么

BFF 是 Backend For Frontend，意思是“为前端服务的后端”。

传统后端接口可能更贴近领域模型：

- `/api/user/profile`
- `/api/practices/today`
- `/api/songs/progress`
- `/api/notifications`

但首页可能只想要一个接口：

```txt
GET /api/dashboard
```

BFF 可以把多个后端接口聚合成一个前端友好的响应：

```js
router.get('/dashboard', async (ctx) => {
  const [profile, practices, songs] = await Promise.all([
    fetchJson('http://real-api.local/user/profile'),
    fetchJson('http://real-api.local/practices/today'),
    fetchJson('http://real-api.local/songs/progress'),
  ])

  ctx.body = {
    data: {
      profile,
      todayPractices: practices,
      songProgress: songs,
    },
  }
})
```

BFF 的重点是“适配前端页面”，不是替代所有后端系统。

## 简单请求代理

有时前端本地开发需要代理真实接口：

```js
router.get('/proxy/user', async (ctx) => {
  const res = await fetch('https://example.com/api/user', {
    headers: {
      Authorization: ctx.get('Authorization'),
    },
  })

  ctx.status = res.status
  ctx.body = await res.json()
})
```

这可以用于：

- 统一加鉴权头
- 绕开本地跨域
- 隐藏真实后端地址
- 做临时字段转换

但代理层不要偷偷吞掉错误，否则前端会更难排查问题。

## 静态资源服务

Koa 也可以托管前端打包后的静态资源：

```bash
npm install koa-static
```

```js
import serve from 'koa-static'

app.use(serve('dist'))
```

这样访问 Node 服务时，可以直接打开前端页面。不过真实生产环境通常还会使用 Nginx、CDN 或平台托管，Node 只负责 API。

## 环境变量

不要把端口、真实 API 地址、密钥写死在代码里：

```js
const PORT = Number(process.env.PORT ?? 3000)
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000'

app.listen(PORT, () => {
  console.log(`server: http://localhost:${PORT}`)
})
```

运行：

```bash
PORT=3100 API_BASE_URL=http://localhost:4000 npm run dev
```

环境变量让同一份代码能在本地、测试、生产环境使用不同配置。

## 部署前检查清单

上线前至少检查：

- 端口是否来自环境变量
- 真实接口地址是否可配置
- 错误响应是否是 JSON
- 日志是否能看到 method、path、status、耗时
- CORS 是否只放开需要的来源
- 静态资源路径是否正确
- 敏感信息是否没有提交到仓库

前端工程师做 Node 工具时，不需要一开始就追求“大后端架构”，但要有这些基本安全感。

## 本节练习

基于上一节的 Koa CRUD 服务，增加一个 `GET /api/dashboard`：

```json
{
  "data": {
    "summary": {
      "practiceCount": 2,
      "todoCount": 1
    },
    "recentPractices": []
  }
}
```

要求：

1. 从已有练习列表计算统计数据
2. 返回最近 3 条练习
3. 服务端打印请求日志
4. 端口支持 `PORT` 环境变量

完成后，你就拥有了一个更接近真实前端工作流的 Node.js 后端工具。

# Averontend

一个面向前端教学的练习网站原型，主打 **边看文档边实操**、**实时预览反馈**，并为工程化 / Vue 课程提供隔离命令沙箱。

## 技术栈

- 前端：`Vue 3` + `TypeScript` + `Vite`
- 后端：`Koa` + `TypeScript` + `tsx watch`
- 编辑器：`Monaco Editor`
- 文档渲染：`markdown-it`
- 浏览器转译：`esbuild-wasm`（用于 TS 练习即时执行）
- 预览沙箱：`iframe` 隔离执行 + `postMessage` 日志回传
- 命令沙箱：`Docker` + 端口转发 + 文件同步
- 鉴权 / 会话：`SQLite` + `httpOnly cookie`

## 当前已实现

- 课程地图（HTML/CSS/JS、JavaScript 提高、工程化、TypeScript、Vue）
- 课程级代码模板（HTML/CSS/JS）与 Vue 3 + TypeScript 项目起稿
- 左侧教学区整块切换：
  - `教学文档`：读取本地 `.md` 文件并渲染
  - `写代码`：展示提示、代码标签页与编辑器
- 实时预览（防抖自动运行）+ 手动立即运行
- 控制台输出面板（log/warn/error/info）
- 代码草稿本地持久化（刷新不丢）
- 记住上次学习课程
- 登录 / 注册
- 一个用户只绑定一个沙箱会话
- 沙箱空闲超时后自动销毁
- Vue 课程可在沙箱内执行 `npm run dev`
- Koa 沙箱服务支持热更新

## 项目结构

```text
public/
  favicon.jpg
sandbox-server/
  auth-db.ts
  dev.ts
  server.ts
src/
  components/
    MonacoEditor.vue
  content/docs/
    base/
      basics-html.md
      basics-css.md
      basics-js.md
    improve/
      imp-01-types-coercion-strings.md
      imp-02-arrays.md
      imp-03-objects-iteration.md
      imp-04-prototype-scope-closure.md
      imp-05-memory-v8-gc.md
      imp-06-async.md
      imp-07-network-modules-es6.md
    engineering/
      eng-01-node-packages.md
      eng-02-vite-and-build.md
      eng-03-git-and-modules.md
    typescript/
      ts-01-intro-tuple-enum.md
      ts-02-type-alias-and-generics.md
      ts-03-utility-pick-omit.md
      ts-04-returntype-nonnullable.md
    vue/
      vue-01.md … vue-08.md
  data/
    lessons.ts
    moduleDocMarkdown.ts
  sandbox/
    buildSandboxDocument.ts
    transpileScript.ts
  App.vue
  style.css
```

## 教学文档维护方式

文档以 Markdown 存在本地目录：

- `src/content/docs/base/basics-html.md`（第一章 · HTML 节）
- `src/content/docs/base/basics-css.md`（第一章 · CSS 节）
- `src/content/docs/base/basics-js.md`（第一章 · JS 节）
- 侧栏「N 节」的 **N** 在运行时按对应 `.md` 正文中 `##` 行数统计（`moduleDocMarkdown.ts`），与 Vite 热更联动，**不必**为节数再维护手填表
- `src/content/docs/improve/imp-01-…` 等七份（与 `imp-01`～`imp-07` 一一对应，见 `improveByLessonId`）
- `src/content/docs/engineering/eng-01-node-packages.md` 等三份（与 `eng-01` / `eng-02` / `eng-03` 一一对应，见 `engineeringByLessonId`）
- `src/content/docs/typescript/ts-01-…` 等四份（与 `ts-01`～`ts-04` 一一对应，见 `typescriptByLessonId`）
- `src/content/docs/vue/vue-01.md` 等八份（与 `vue-01`～`vue-08` 一一对应，见 `vueByLessonId`）

`module` 为 `basics` 时，会按**当前课程 id**（`ch1-html` / `ch1-css` / `ch1-js`）切换上述三份文档；`improve`、`engineering`、`typescript`、**`vue`** 等模块按**子课 id** 绑定子文档。其余见 `getDocMarkdown()`。

新增章节流程：

1. 在对应 `.md` 文件中按章节追加内容（第一章三份分别维护）
2. 如果新增模块，补充 `moduleDocMarkdownMap` 与 `lessons`；若子文档**按课拆分**，在 `getDocMarkdown` 的 `*ByLessonId` 映射中登记
3. 若在第一章、JavaScript 提高、工程化、**TypeScript** 或 **Vue** 下增加子课，在 `lessons` 与 `basicsByLessonId` / `improveByLessonId` / `engineeringByLessonId` / `typescriptByLessonId` / **`vueByLessonId`** 中同时挂上 id 与文件，并在 `lessonExercises.ts` 中登记该课的练习题

## 本地开发

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动：

- `Vite` 前端开发服务器
- `Koa` 沙箱服务（通过 `tsx watch` 热更新）

如果只想单独启动沙箱服务：

```bash
npm run sandbox:server
```

如果只想启动一次、不监听后端改动：

```bash
npm run sandbox:server:once
```

## 环境要求

- `Node.js 22+`
- `Docker`

说明：

- Vue 课程的命令沙箱依赖 Docker 容器内执行 `npm install` / `npm run dev`
- 本地会话数据库位于 `sandbox-server/.data/`，已加入 `.gitignore`
- 若 Docker 无法拉取默认镜像，可通过 `SANDBOX_IMAGE` 指定本地可用的 Node 镜像

## 单机部署

这套项目现在支持在一台服务器上直接部署：

- `Koa` 会直接提供前端 `dist` 静态资源
- `/api/*` 由同一个 `Koa` 进程处理
- 命令沙箱预览通过固定端口池暴露给浏览器 iframe

### 当前线上地址

- 主站：`http://115.190.197.0:4273`
- API 状态：`http://115.190.197.0:4273/api/sandbox/status`

当前线上实际使用的端口：

- `4273/tcp`
- `4500-4599/tcp`

### 1. 构建并启动

```bash
npm install
npm run build
npm run start
```

### 2. 生产环境变量

建议至少配置这些环境变量：

```bash
SANDBOX_PORT=4273
SANDBOX_BIND_HOST=0.0.0.0
SANDBOX_PREVIEW_BIND_HOST=0.0.0.0
SANDBOX_PREVIEW_PORT_START=4500
SANDBOX_PREVIEW_PORT_END=4599
SANDBOX_PREVIEW_PUBLIC_PROTO=http
SANDBOX_PREVIEW_PUBLIC_HOST=<你的服务器公网IP或域名>
```

说明：

- `SANDBOX_PORT`：主站与 API 的监听端口
- `SANDBOX_PREVIEW_PORT_START` / `SANDBOX_PREVIEW_PORT_END`：给沙箱内 `vite dev server` 用的固定端口池
- `SANDBOX_PREVIEW_PUBLIC_HOST`：前端 iframe 访问预览页时使用的对外地址

### 3. 需要开放的端口

如果你先按“单机直出 HTTP”部署，防火墙至少开放：

- `4273/tcp`：主站、登录、课程文档、API
- `4500-4599/tcp`：沙箱预览端口池

如果你后面再套 `Nginx/Caddy` 做 80/443 反代：

- 仍然需要把 `4500-4599/tcp` 对外放行给 iframe 访问
- 主站只需对外开放 `80/tcp`、`443/tcp`
- `4273/tcp` 可以只在机器内部监听，不必对公网开放

### 4. systemd

仓库里附了一个可改路径后直接用的 `systemd` 示例：

- `deploy/averontend.service`
- `deploy/averontend.env.example`

复制后把工作目录、Node 路径、环境文件路径改成你的服务器实际值即可。

### 5. 一次完整上线流程

```bash
git pull
npm install
npm run build
SANDBOX_PORT=4273 \
SANDBOX_BIND_HOST=0.0.0.0 \
SANDBOX_PREVIEW_BIND_HOST=0.0.0.0 \
SANDBOX_PREVIEW_PORT_START=4500 \
SANDBOX_PREVIEW_PORT_END=4599 \
SANDBOX_PREVIEW_PUBLIC_PROTO=http \
SANDBOX_PREVIEW_PUBLIC_HOST=115.190.197.0 \
npm run start
```

如果使用 `systemd`，推荐流程：

```bash
git pull
npm install
npm run build
sudo cp deploy/averontend.service /etc/systemd/system/averontend.service
sudo cp deploy/averontend.env.example /opt/Averontend/deploy/averontend.env
sudo systemctl daemon-reload
sudo systemctl enable --now averontend
sudo systemctl restart averontend
```

常用排查命令：

```bash
sudo systemctl status averontend
sudo journalctl -u averontend -n 200 --no-pager
ss -ltnp
docker ps
```

## 生产构建

```bash
npm run build
npm run preview
```

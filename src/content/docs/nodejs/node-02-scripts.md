# Node.js 02：用 Node 写前端自动化脚本

## 本节目标

前端项目里有很多重复劳动：新建组件、整理路由、扫描文档、生成配置、检查文件是否存在。Node.js 很适合处理这些“不是页面，但服务于页面开发”的任务。

本节重点掌握：

- 用 `node:fs/promises` 读写文件
- 用 `node:path` 处理跨平台路径
- 用 `process.argv` 接收命令行参数
- 把脚本收进 `package.json > scripts`

## 为什么前端要会写脚本

当一个任务满足下面任意条件，就值得考虑写成 Node 脚本：

- 每周都会重复做
- 容易手动漏步骤
- 输出结果有固定格式
- 多个项目成员都需要执行

脚本的价值不是炫技，而是减少重复和误差。

## 读写文件

先创建 `scripts/create-note.js`：

```js
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const title = process.argv[2] ?? 'untitled'
const dir = path.resolve('notes')
const file = path.join(dir, `${title}.md`)

await mkdir(dir, { recursive: true })
await writeFile(file, `# ${title}\n\nTODO: write notes.\n`, 'utf-8')

console.log(`created: ${file}`)
```

在 `package.json` 添加：

```json
{
  "scripts": {
    "note": "node scripts/create-note.js"
  },
  "type": "module"
}
```

运行：

```bash
npm run note koa-api
```

你会得到 `notes/koa-api.md`。

## 常用内置模块

### `node:fs/promises`

处理文件和目录：

- `readFile`：读取文件
- `writeFile`：写入文件
- `mkdir`：创建目录
- `readdir`：读取目录内容

### `node:path`

处理路径，不要自己拼字符串：

```js
import path from 'node:path'

const file = path.join('src', 'components', 'Button.vue')
const abs = path.resolve(file)
```

`path.join` 会根据操作系统处理分隔符，团队里有人用 macOS、Linux、Windows 时更稳。

### `process`

读取运行环境：

```js
console.log(process.cwd())
console.log(process.argv)
console.log(process.env.NODE_ENV)
```

前端构建、部署脚本里经常会用环境变量控制行为。

## 脚本设计原则

一个好用的前端脚本应该做到：

- 输入明确：参数从哪里来
- 输出明确：生成了什么文件或打印了什么结果
- 出错明确：失败时告诉用户怎么修
- 可重复执行：重复跑不会破坏已有项目

例如创建文件前先判断是否存在，避免覆盖用户内容。

```js
import { access, writeFile } from 'node:fs/promises'

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

if (await exists('notes/koa-api.md')) {
  console.error('file already exists')
  process.exit(1)
}

await writeFile('notes/koa-api.md', '# Koa API\n')
```

## 本节练习

写一个 `scripts/create-component.js`：

1. 接收组件名，例如 `npm run component HinaCard`
2. 在 `src/components/HinaCard.vue` 创建文件
3. 写入基础 `<template>` 和 `<script setup>`
4. 如果文件已存在，打印错误并退出

完成后，你就拥有了一个真实前端项目里很常用的自动化脚本。

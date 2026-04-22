# 包管理与运行环境

本章从**Node 与 nvm、包管理、npm 脚本、依赖声明**起笔，是工程化里最先踩稳的一块。本课**练习在本地终端/编辑器完成**，不必在右侧预览中跑代码，可与「练练？」中的题目对照明细。

---

## 环境：Node 与 nvm

团队里统一 **Node 大版本**，能减少「我本地能跑」类问题。常用 nvm 命令如下：

```bash
nvm install 20
nvm use 20
nvm alias default 20
node -v
npm -v
```

在 `package.json` 里可用 **`engines`** 声明建议的 Node/npm 版本（安装时仅提示，是否强依赖由包管理器策略决定）。

---

## 包管理器与 npm 脚本

日常开发中最常用的是「装依赖」和「跑脚本」：

- **`npm install` / `npm i`**：按锁文件与 `package.json` 安装依赖。
- **`npm run <script>`**：执行 `package.json` 里 `scripts` 下的命令，如 `dev`、`build`、`preview`。

### 示例：`scripts` 长什么样

单页应用里常把 dev/build/preview 交给 Vite：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

含义不必死记：开发时跑 `dev`，提测/上线前跑 `build`，本地看构建结果用 `preview`。

---

## npm、Yarn 与 pnpm 一览

三种都能装包、执行 scripts，差异主要在**安装算法、目录结构、磁盘与 monorepo 体验**。

| 维度 | npm | Yarn | pnpm |
| --- | --- | --- | --- |
| 锁文件 | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| 典型特点 | 默认随 Node、生态广 | 缓存与并行安装成熟 | 内容寻址存储、节省磁盘 |
| 工作区 | workspaces | workspaces | workspaces，对 monorepo 友好 |

选型上：团队统一一种即可；新项目可优先考虑 **pnpm**，在依赖多、磁盘紧张时优势明显。

---

## 幽灵依赖（Phantom Dependency）

**含义**：某个包**没有**写进你项目的 `dependencies` / `devDependencies`，却因为「被别的依赖装进了 `node_modules`」而被你直接 `import` 使用。

**为何不好**：一旦上游不再装该传递依赖，你的构建或运行会直接报错；版本也不受你控制。

**实践**：

- 凡在业务代码里用到的包，尽量**显式写进** `package.json`。
- 使用 **pnpm** 时，默认只能访问声明过的依赖，有助于从机制上减少误用。

---

## pnpm 在做什么

pnpm 用**全局内容寻址存储 + 项目内硬链/符号链接**，同一版本的包在磁盘上尽量只存一份，多项目共用，安装往往更快、更省空间。

与「幽灵依赖」相关：pnpm 的 `node_modules` 结构让**未声明的依赖不易被直接引用**，倒逼依赖关系清晰（具体行为以官方文档与版本为准）。

---

## package.json 要关心哪些字段

不必背全表，按场景记几类即可。

### 依赖相关

| 字段 | 用途 |
| --- | --- |
| `dependencies` | 线上运行需要的包，会随「装你的包」一起装。 |
| `devDependencies` | 仅开发/构建用（测试、打包工具等），一般不进业务运行包。 |
| `peerDependencies` | 期望由宿主环境提供的包（如插件要求某版本的 Vue），不自动替你装全。 |
| `optionalDependencies` | 装失败时往往不阻断整次安装（平台相关包等）。 |

### 入口与发布

| 字段 | 用途 |
| --- | --- |
| `name` / `version` | 发包名与版本；私有项目也要养成写 `version` 的习惯。 |
| `main` / `module` / `exports` | 指明别人 `import` 你的包时从哪进；`exports` 可写子路径与条件导出。 |
| `types` | TypeScript 类型入口，如 `index.d.ts`。 |
| `private: true` | 防止误发布到公网 npm。 |
| `files` | 发包时包含哪些文件，控制包体大小。 |

### 工程与元信息

| 字段 | 用途 |
| --- | --- |
| `scripts` | `npm run` 能跑的命令。 |
| `engines` | 建议的 Node/npm 版本。 |
| `browserslist` | 给 Babel、Autoprefixer 等用，定义要兼容的浏览器范围。 |
| `workspaces` | monorepo 多包目录声明。 |

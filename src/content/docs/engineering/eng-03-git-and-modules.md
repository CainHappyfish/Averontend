# Git 与模块规范

本章收束 **Git 协作（Husky、merge/rebase、fetch/pull）** 与 **ESM / CJS 模块** 等话题，和团队日常排障、读老代码直接相关。本课**练习在本地命令行中完成**。

---

## Git：Husky 在帮什么忙

Git 原生的 hook 在 `.git/hooks` 下，**不进版本库**。**Husky** 等工具把要执行的脚本放到仓库里（如 `.husky/`，可提交），再让 Git 去执行这些脚本，从而在 `commit` / `push` 前做 **lint、测试、信息校验**。

实现上依赖「**由仓库控制的脚本** + **Git 能调用到它们**」；细节随 Husky 大版本有差异，以官方说明为准。

---

## merge 与 rebase、pull 与 fetch

**`git merge`**：保留分叉历史，多一个合并提交，直观但图可能更「枝繁叶茂」。

**`git rebase`**：把当前分支的提交「挪」到目标分支之后，历史更线形；**会改写已推送过的提交的 hash**，在公共分支上强推会伤害他人协作，**适合本地整理提交，再进主分支时多用 merge 或经评审的流程**。

**`git fetch`**：只把远程新提交拉到本地，**不自动合并**到当前分支；**`git pull`** ≈ `fetch` + `merge`（或配置成 rebase）。本地有未提交修改时，常用 **`git stash`** 暂存 → `pull` → `stash pop` 再解决冲突。

---

## ES Module 与 CommonJS

**ESM**（`import` / `export`）：**静态结构**，适合构建期做 **Tree Shaking**；现代浏览器与 Node 均支持，是前端工程首选模块语法。

**CJS**（`require` / `module.exports`）：Node 传统写法，**运行时**可动态 `require`；生态里老包多，Vite 预构建会处理很多 CJS 依赖以便在浏览器里以 ESM 使用。

新代码优先用 **ESM**；读老文档或配 Node 脚本时会遇到 CJS，知道二者别混用默认导出即可。

---

## 小结

- **环境、依赖、脚本** 是最小闭环：会装、会跑、会声明。
- **构建工具** 各有一套心智：Webpack 偏「一切皆 loader 管道」，Vite 偏「开发时 ESM + 预构建 + 生产 Rollup」。
- **Git** 在团队里比「会提交」多一步：理解 merge/rebase 风险、会用 fetch 与 stash。
- **ESM 为主、CJS 兼容** 是长期趋势。

有具体场景（如 monorepo、CI、发包）时，再针对某一节深挖官方文档即可。

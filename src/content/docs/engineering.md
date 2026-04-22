# 前端工程化

## Node / nvm 常用命令

```bash
nvm install 20
nvm use 20
nvm alias default 20
node -v
npm -v
```

## 包管理器

- `npm i`：安装依赖
- `npm run dev`：启动开发环境
- `npm run build`：构建生产包
- `npm run preview`：本地预览构建产物

## Vite 工程关键点

1. 使用 `@vitejs/plugin-vue` 支持 Vue SFC
2. 使用 `alias` 简化路径引用
3. 区分开发和生产环境变量（`import.meta.env`）

## 示例：常见 scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

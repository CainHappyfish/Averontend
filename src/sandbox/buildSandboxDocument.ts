import { getVue3RuntimePreamble } from './vueInjectedGlobals'

export type SandboxRuntime = 'vanilla' | 'vue3'

interface SandboxInput {
  html: string
  css: string
  js: string
  /**
   * `vanilla`：仅用户脚本。
   * `vue3`：先同步加载 CDN 上的全量 `vue.global.prod.js`（含**模板**编译器），再执行脚本；`Vue` 在全局，并预解构常用 API。
   */
  runtime?: SandboxRuntime
}

const escapeScript = (code: string) => code.replaceAll('</script>', '<\\/script>')

/** 与主项目 `vue` 依赖主版本对齐，含编译器，支持 `createApp({ template: '...' })` */
const VUE3_GLOBAL_CDN = 'https://unpkg.com/vue@3.5.32/dist/vue.global.prod.js'

export const buildSandboxDocument = ({ html, css, js, runtime = 'vanilla' }: SandboxInput): string => {
  const userJs = escapeScript(js)
  const vue3Preamble = getVue3RuntimePreamble()
  const vueScriptTag =
    runtime === 'vue3'
      ? `    <script src="${VUE3_GLOBAL_CDN}" crossorigin="anonymous"><\/script>
`
      : ''
  const userBlock =
    runtime === 'vue3'
      ? `        try {
          ${vue3Preamble}
${userJs}
          send('ready', '运行完成')
        } catch (error) {
          send('runtime-error', error instanceof Error ? error.message : String(error))
        }`
      : `        try {
${userJs}
          send('ready', '运行完成')
        } catch (error) {
          send('runtime-error', error instanceof Error ? error.message : String(error))
        }`

  /** 页面级 CSP：限制默认资源、仅允许内联 + unpkg 脚本、禁止 base 等，与「子文档 + sandbox」配合形成隔离 */
  const csp = [
    "default-src 'none'",
    "base-uri 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline' https://unpkg.com",
    "img-src * data: blob: https:",
    "font-src * data:",
    "connect-src *",
    "form-action 'none'",
  ].join('; ')

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <style>
      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        padding: 16px;
        font-family: 'Segoe UI', 'PingFang SC', sans-serif;
        background: #f8fafc;
      }

      * {
        box-sizing: border-box;
      }

${css}
    </style>
  </head>
  <body>
${html}
${vueScriptTag}    <script>
      (() => {
        const send = (type, payload) => {
          window.parent.postMessage({ source: 'averontend-sandbox', type, payload }, '*')
        }

        const bindConsole = (method) => {
          const original = console[method]
          console[method] = (...args) => {
            send('console', {
              method,
              message: args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
            })
            original.apply(console, args)
          }
        }

        ;['log', 'warn', 'error', 'info'].forEach(bindConsole)

        window.addEventListener('error', (event) => {
          send('runtime-error', event.message)
        })

        window.addEventListener('unhandledrejection', (event) => {
          send('runtime-error', event.reason ? String(event.reason) : 'Promise rejected')
        })

${userBlock}
      })()
    <\/script>
  </body>
</html>`
}

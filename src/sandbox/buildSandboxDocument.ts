interface SandboxInput {
  html: string
  css: string
  js: string
}

const escapeScript = (code: string) => code.replaceAll('</script>', '<\\/script>')

export const buildSandboxDocument = ({ html, css, js }: SandboxInput): string => {
  const userJs = escapeScript(js)

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
    <script>
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

        try {
${userJs}
          send('ready', '运行完成')
        } catch (error) {
          send('runtime-error', error instanceof Error ? error.message : String(error))
        }
      })()
    <\/script>
  </body>
</html>`
}

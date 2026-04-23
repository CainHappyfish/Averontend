import * as esbuild from 'esbuild-wasm'
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url'

type ScriptLanguage = 'javascript' | 'typescript' | 'vue'

let isEsbuildReady = false
let initPromise: Promise<void> | null = null

const ensureEsbuildReady = async () => {
  if (isEsbuildReady) return
  if (initPromise) {
    await initPromise
    return
  }

  initPromise = esbuild.initialize({
    wasmURL: wasmUrl,
    worker: true,
  })

  await initPromise
  isEsbuildReady = true
  initPromise = null
}

export const transpileScript = async (
  sourceCode: string,
  language: ScriptLanguage,
): Promise<string> => {
  if (language === 'javascript') return sourceCode

  await ensureEsbuildReady()

  /** 课程站「Vue3」课：在沙箱中写 `createApp` + `ref` 等，按 TS 去类型（可写纯 JS） */
  if (language === 'vue') {
    const output = await esbuild.transform(sourceCode, {
      loader: 'ts',
      target: 'es2020',
      sourcemap: false,
    })
    return output.code
  }

  const output = await esbuild.transform(sourceCode, {
    loader: 'ts',
    target: 'es2020',
    format: 'iife',
    sourcemap: false,
  })

  return output.code
}

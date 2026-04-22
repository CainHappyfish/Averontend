import * as esbuild from 'esbuild-wasm'
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url'

type ScriptLanguage = 'javascript' | 'typescript'

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
  const output = await esbuild.transform(sourceCode, {
    loader: 'ts',
    target: 'es2020',
    format: 'iife',
    sourcemap: false,
  })

  return output.code
}

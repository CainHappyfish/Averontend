/**
 * 与预览 iframe 内 `const { … } = Vue` 预解构的标识符一致，供：
 * - `buildSandboxDocument` 生成运行时代码
 * - Monaco `addExtraLib` 声明全局，消除 2304「找不到名称」误报
 */
export const VUE_INJECTED_GLOBAL_IDENTIFIERS = [
  'createApp',
  'ref',
  'reactive',
  'computed',
  'watch',
  'watchEffect',
  'readonly',
  'shallowRef',
  'shallowReactive',
  'onMounted',
  'onUnmounted',
  'onBeforeMount',
  'onBeforeUnmount',
  'onUpdated',
  'onBeforeUpdate',
  'onErrorCaptured',
  'provide',
  'inject',
  'h',
  'nextTick',
  'defineComponent',
  'defineAsyncComponent',
  'Teleport',
  'Transition',
  'TransitionGroup',
] as const

/** 运行时在子页面里执行的解构；插入在 `        try {\n          ` 之后，首行无缩进、与 buildSandbox 模板拼接一致 */
export const getVue3RuntimePreamble = (): string => {
  const names = VUE_INJECTED_GLOBAL_IDENTIFIERS.join(',\n          ')
  return `if (typeof Vue === 'undefined' || !Vue) {
          throw new Error('Vue 3 未加载，请检查网络后重试。')
        }
        const {
          ${names}
        } = Vue
`
}

/**
 * 仍保留全局声明以兼容旧的 iframe 运行时；同时补一份宽松 module 声明，
 * 让 Monaco 在 `src/main.ts` 里写 `import { createApp } from 'vue'`
 * 以及 `import App from './App.vue'` 时不再报模块找不到。
 */
export const getVueInjectedMonacoExtraLibDts = (): string =>
  [
    '/** 兼容旧沙箱与真实 Vue + TS 编辑体验的宽松声明文件 */',
    'declare module "*.vue" {',
    '  const component: any',
    '  export default component',
    '}',
    "declare module 'vue' {",
    '  export type DefineComponent = any',
    ...VUE_INJECTED_GLOBAL_IDENTIFIERS.map((id) => `  export const ${id}: any`),
    '  const Vue: any',
    '  export default Vue',
    '}',
    'declare const Vue: any;',
    ...VUE_INJECTED_GLOBAL_IDENTIFIERS.map((id) => `declare const ${id}: any;`),
  ].join('\n')

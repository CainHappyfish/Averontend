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
 * 宽松 `any` 以匹配 CDN 全量 UMD，不依赖 `node_modules/vue` 的声明解析
 * （Monaco 独立 TS 语言服务不解析本仓库的 `vue` 包。）
 */
export const getVueInjectedMonacoExtraLibDts = (): string =>
  [
    '/** 预览 iframe 注入，仅用于编辑器中消除未声明全局误报（无 import/export 的全局声明文件） */',
    "declare const Vue: any;",
    ...VUE_INJECTED_GLOBAL_IDENTIFIERS.map((id) => `declare const ${id}: any;`),
  ].join('\n')

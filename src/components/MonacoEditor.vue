<script setup lang="ts">
import loader from '@monaco-editor/loader'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface Props {
  modelValue: string
  language: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const hostRef = ref<HTMLElement | null>(null)
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null
let monaco: typeof import('monaco-editor') | null = null
let changeDisposer: import('monaco-editor').IDisposable | null = null

const THEME_ID = 'averontend-dark'

onMounted(async () => {
  if (!hostRef.value) return

  const monacoInstance = await loader.init()
  monaco = monacoInstance

  monacoInstance.editor.defineTheme(THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'tag', foreground: '61AFEF' },
      { token: 'tag.id.pug', foreground: '61AFEF' },
      { token: 'meta.tag', foreground: '61AFEF' },
      { token: 'attribute.name', foreground: '56D4C7' },
      { token: 'attribute.name.html', foreground: '56D4C7' },
      { token: 'attribute.value', foreground: 'E5C07B' },
      { token: 'string', foreground: 'E5C07B' },
      { token: 'string.html', foreground: 'E5C07B' },
    ],
    colors: {
      'editor.background': '#1e2227',
      'editorLineNumber.foreground': '#5c6370',
      'editorLineNumber.activeForeground': '#9ca3af',
      'editorGutter.background': '#1e2227',
      'editorCursor.foreground': '#c8d0e0',
      'editor.selectionBackground': '#3d4c5c88',
    },
  })

  const editorInstance = monacoInstance.editor.create(hostRef.value, {
    value: props.modelValue,
    language: props.language,
    theme: THEME_ID,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
    tabSize: 2,
    scrollBeyondLastLine: false,
    roundedSelection: false,
    padding: { top: 12, bottom: 8 },
    lineNumbersMinChars: 2,
  })
  editor = editorInstance

  changeDisposer = editorInstance.onDidChangeModelContent(() => {
    emit('update:modelValue', editorInstance.getValue())
  })
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor) return
    if (editor.getValue() === value) return
    editor.setValue(value)
  },
)

watch(
  () => props.language,
  (value) => {
    if (!editor || !monaco) return
    const model = editor.getModel()
    if (!model) return
    monaco.editor.setModelLanguage(model, value)
  },
)

onBeforeUnmount(() => {
  changeDisposer?.dispose()
  editor?.dispose()
})
</script>

<template>
  <div ref="hostRef" class="monaco-host"></div>
</template>

<style scoped>
.monaco-host {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>

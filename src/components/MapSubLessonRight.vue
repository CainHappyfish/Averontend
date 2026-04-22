<script setup lang="ts">
import { computed } from 'vue'

export type SubLessonPhase = 'not-started' | 'in-progress' | 'done'

const props = defineProps<{
  sectionCount: number
  phase: SubLessonPhase
}>()

const emit = defineEmits<{ (e: 'action'): void }>()

const aria = computed(() => {
  if (props.phase === 'done') return '已完成，点击取消完成'
  if (props.phase === 'in-progress') return '进行中，点击标记已读完'
  return '未开始，点击打开该课'
})
</script>

<template>
  <div class="map-sub-meta">
    <span class="map-sub-sec">{{ sectionCount }} 节</span>
    <button
      type="button"
      class="map-sub-status"
      :aria-label="aria"
      @click="emit('action')"
    >
      <!-- 未开始：空环 -->
      <svg
        v-if="phase === 'not-started'"
        class="map-sub-ico ico-ghost"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r="6.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>

      <!-- 进行中：浅外环 + 高亮弧 + 中心点 -->
      <svg
        v-else-if="phase === 'in-progress'"
        class="map-sub-ico ico-progress"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r="6.5"
          fill="none"
          stroke="#e5e7eb"
          stroke-width="1.4"
        />
        <path
          d="M 10 3.1 A 6.9 6.9 0 0 1 16.2 6.0"
          fill="none"
          stroke="#d97706"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <circle cx="10" cy="10" r="1.3" fill="#d97706" />
      </svg>

      <!-- 完成：对勾圆 -->
      <svg
        v-else
        class="map-sub-ico ico-on"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="6.5" fill="currentColor" />
        <path
          d="M 6.1 9.5 L 8.5 12.0 L 13.4 6.0"
          fill="none"
          stroke="#fff"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.map-sub-meta {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
}

.map-sub-sec {
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  white-space: nowrap;
}

.map-sub-status {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  transition: background 0.12s;
}

.map-sub-status:hover {
  background: #f3f4f6;
}

.map-sub-ico {
  display: block;
  pointer-events: none;
}

.map-sub-ico.ico-ghost {
  color: #c4c4c4;
}

.map-sub-ico.ico-on {
  color: #16a34a;
}
</style>

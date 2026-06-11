<template>
  <footer class="statusbar">
    <div class="statusbar__left">
      <span class="statusbar__item">就绪</span>
    </div>
    <div class="statusbar__right">
      <span class="statusbar__item">{{ version }}</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const { version } = storeToRefs(appStore);

// 占位组件 — 后续任务会实现完整的状态栏
// 包含：连接状态指示器、任务统计、版本信息、时钟
</script>

<style scoped>
.statusbar {
  height: var(--statusbar-height);
  background: var(--bg-statusbar);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  gap: 16px;
}

.statusbar__left,
.statusbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.statusbar__item {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': sidebarCollapsed }">
    <div class="sidebar__nav">
      <p class="sidebar__placeholder">导航菜单（占位）</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const { sidebarCollapsed } = storeToRefs(appStore);

// 占位组件 — 后续任务会实现完整的侧边栏
// 包含：Logo、导航菜单（任务中心/质检报告/规则配置/系统设置）、折叠按钮
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  color: var(--text-inverse);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-normal);
  overflow: hidden;
  z-index: var(--z-sidebar);
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar__nav {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}

.sidebar__placeholder {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  writing-mode: vertical-rl;
  letter-spacing: 2px;
}
</style>

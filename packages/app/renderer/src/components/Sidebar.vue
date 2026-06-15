<template>
  <aside
    class="sidebar"
    :class="{ 'sidebar--collapsed': sidebarCollapsed }"
  >
    <!-- Logo 区域 -->
    <div class="sidebar__logo">
      <span class="sidebar__logo-icon">📊</span>
      <transition name="fade">
        <span v-if="!sidebarCollapsed" class="sidebar__logo-text">Ai质检</span>
      </transition>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar__nav">
      <div
        v-for="item in menuItems"
        :key="item.path"
        class="sidebar__nav-item"
        :class="{ 'sidebar__nav-item--active': isActive(item.path) }"
        @click="navigate(item.path)"
        :title="sidebarCollapsed ? item.label : ''"
      >
        <span class="sidebar__nav-icon">{{ item.icon }}</span>
        <transition name="fade">
          <span v-if="!sidebarCollapsed" class="sidebar__nav-label">{{ item.label }}</span>
        </transition>
      </div>
    </nav>

    <!-- 底部操作区 -->
    <div class="sidebar__footer">
      <div class="sidebar__divider" />
      <div
        class="sidebar__toggle"
        @click="appStore.toggleSidebar()"
        :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <span class="sidebar__toggle-icon">
          {{ sidebarCollapsed ? '▶' : '◀' }}
        </span>
        <transition name="fade">
          <span v-if="!sidebarCollapsed" class="sidebar__toggle-text">收起侧边栏</span>
        </transition>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const { sidebarCollapsed } = storeToRefs(appStore);

const menuItems = [
  { icon: '🏠', label: '首页', path: '/' },
  { icon: '📊', label: '数据校验', path: '/validator' },
  { icon: '🖼️', label: '图像检测', path: '/image-detector' },
  { icon: '📄', label: 'PDF处理', path: '/pdf-processor' },
  { icon: '🔒', label: 'MD5校验', path: '/md5-checker' },
  { icon: '🏷️', label: '元数据封装', path: '/metadata' },
  { icon: '📋', label: '文档管理', path: '/doc-manager' },
];

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

function navigate(path: string): void {
  router.push(path);
}
</script>

<style scoped>
/* Stripe 风格侧边栏 */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-normal);
  overflow: hidden;
  z-index: var(--z-sidebar);
  user-select: none;
  border-right: 1px solid var(--border-color);
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
}

/* ---- Logo ---- */
.sidebar__logo {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  gap: 10px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color-light);
}

.sidebar--collapsed .sidebar__logo {
  padding: 0;
  justify-content: center;
}

.sidebar__logo-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.sidebar__logo-text {
  font-size: 20px;
  font-weight: 400;
  color: var(--color-primary);
  white-space: nowrap;
  overflow: hidden;
  letter-spacing: -0.4px;
}

/* ---- 导航 ---- */
.sidebar__nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  gap: 2px;
  overflow-y: auto;
}

.sidebar__nav-item {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  gap: 10px;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;
  border-left: 3px solid transparent;
  font-weight: 300;
}

.sidebar--collapsed .sidebar__nav-item {
  padding: 0;
  justify-content: center;
}

.sidebar__nav-item:hover {
  background: var(--bg-hover);
  color: var(--color-primary);
}

.sidebar__nav-item--active {
  background: rgba(83, 58, 253, 0.06);
  color: var(--color-primary);
  border-left: 3px solid var(--color-primary);
  font-weight: 400;
}

.sidebar__nav-item--active:hover {
  background: rgba(83, 58, 253, 0.08);
}

.sidebar__nav-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1;
}

.sidebar__nav-label {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- 底部 ---- */
.sidebar__footer {
  flex-shrink: 0;
  padding: 4px 0;
}

.sidebar__divider {
  height: 1px;
  background: var(--border-color-light);
  margin: 0 12px 4px;
}

.sidebar__toggle {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  gap: 10px;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-placeholder);
}

.sidebar--collapsed .sidebar__toggle {
  padding: 0;
  justify-content: center;
}

.sidebar__toggle:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.sidebar__toggle-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.sidebar__toggle-text {
  font-size: 13px;
  white-space: nowrap;
  font-weight: 300;
}

/* ---- 过渡动画（文字淡入淡出） ---- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

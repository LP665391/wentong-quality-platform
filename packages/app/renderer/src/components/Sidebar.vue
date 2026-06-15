<template>
  <aside
    class="sidebar"
    :class="{ 'sidebar--collapsed': sidebarCollapsed }"
  >
    <!-- Logo 区域 -->
    <div class="sidebar__logo">
      <svg class="sidebar__logo-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="#533afd"/>
        <!-- 文档 -->
        <rect x="14" y="10" width="20" height="28" rx="3" fill="white" fill-opacity="0.95"/>
        <path d="M28 10L34 16H31C29.3431 16 28 14.6569 28 13V10Z" fill="white" fill-opacity="0.6"/>
        <!-- 文档线条 -->
        <rect x="18" y="20" width="12" height="2" rx="1" fill="#533afd" fill-opacity="0.4"/>
        <rect x="18" y="25" width="10" height="2" rx="1" fill="#533afd" fill-opacity="0.3"/>
        <rect x="18" y="30" width="8" height="2" rx="1" fill="#533afd" fill-opacity="0.2"/>
        <!-- 神经网络节点 -->
        <circle cx="10" cy="18" r="2.5" fill="white" fill-opacity="0.7"/>
        <circle cx="10" cy="30" r="2.5" fill="white" fill-opacity="0.7"/>
        <circle cx="38" cy="18" r="2.5" fill="white" fill-opacity="0.7"/>
        <circle cx="38" cy="30" r="2.5" fill="white" fill-opacity="0.7"/>
        <!-- 连接线 -->
        <line x1="12" y1="18" x2="14" y2="20" stroke="white" stroke-opacity="0.4" stroke-width="1"/>
        <line x1="12" y1="30" x2="14" y2="28" stroke="white" stroke-opacity="0.4" stroke-width="1"/>
        <line x1="34" y1="20" x2="36" y2="18" stroke="white" stroke-opacity="0.4" stroke-width="1"/>
        <line x1="34" y1="28" x2="36" y2="30" stroke="white" stroke-opacity="0.4" stroke-width="1"/>
        <!-- 对勾 -->
        <circle cx="32" cy="34" r="7" fill="#10b981"/>
        <path d="M29 34L31 36L35 32" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <transition name="fade">
        <span v-if="!sidebarCollapsed" class="sidebar__logo-text">Ai 质检系统</span>
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
        <span class="sidebar__nav-icon" v-html="item.icon"></span>
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
        <span class="sidebar__toggle-icon" v-html="sidebarCollapsed ? iconChevronRight : iconChevronLeft"></span>
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

// SVG 图标 — 统一线性风格 24x24
const iconHome = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

const iconCheck = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>';

const iconImage = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

const iconFile = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';

const iconShield = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';

const iconTag = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';

const iconDoc = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="14" y2="14"/></svg>';

const iconChevronLeft = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
const iconChevronRight = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

const menuItems = [
  { icon: iconHome, label: '首页', path: '/' },
  { icon: iconCheck, label: '数据校验', path: '/validator' },
  { icon: iconImage, label: '图像检测', path: '/image-detector' },
  { icon: iconFile, label: 'PDF处理', path: '/pdf-processor' },
  { icon: iconShield, label: 'MD5校验', path: '/md5-checker' },
  { icon: iconTag, label: '元数据封装', path: '/metadata' },
  { icon: iconDoc, label: '文档管理', path: '/doc-manager' },
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

.sidebar__logo-svg {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
}

.sidebar__logo-text {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-primary);
  white-space: nowrap;
  overflow: hidden;
  letter-spacing: -0.3px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar__nav-icon :deep(svg) {
  display: block;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.sidebar__toggle-icon :deep(svg) {
  display: block;
}

.sidebar__toggle-text {
  font-size: 13px;
  white-space: nowrap;
  font-weight: 300;
}

/* ---- 过渡动画 ---- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

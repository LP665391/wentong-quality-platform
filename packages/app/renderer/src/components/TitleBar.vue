<template>
  <header class="titlebar drag-region">
    <span class="titlebar__title">Ai质检平台</span>
  </header>
</template>

<script setup lang="ts">
// macOS 自定义标题栏
// - 居中显示应用标题
// - 白色背景 + 底部细边框
// - 固定定位在顶部
// - drag-region 允许拖拽窗口
</script>

<style scoped>
.titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--titlebar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-titlebar);
  flex-shrink: 0;

  /* Stripe 风格 — 白色背景 */
  background: var(--bg-titlebar);

  /* 底部边框 */
  border-bottom: 1px solid var(--border-color);
}

.titlebar__title {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-primary);
  letter-spacing: -0.2px;
  user-select: none;
}
</style>

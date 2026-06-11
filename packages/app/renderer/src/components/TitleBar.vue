<template>
  <header class="titlebar drag-region">
    <span class="titlebar__title">文通Ai质检平台</span>
  </header>
</template>

<script setup lang="ts">
// macOS 自定义标题栏
// - 居中显示应用标题
// - 毛玻璃效果背景（backdrop-filter）
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

  /* 毛玻璃效果 */
  background: rgba(43, 45, 58, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);

  /* 底部边框 */
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.titlebar__title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.5px;
  user-select: none;
}
</style>

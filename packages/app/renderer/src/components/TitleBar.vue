<template>
  <header class="titlebar drag-region">
    <div class="titlebar__title">文通Ai质检平台</div>
  </header>
</template>

<script setup lang="ts">
// 占位组件 — 后续任务会实现完整的 macOS 自定义标题栏
// 包含：窗口控制按钮（红黄绿）、标题文字、窗口操作菜单
</script>

<style scoped>
.titlebar {
  height: var(--titlebar-height);
  background: var(--bg-titlebar);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.titlebar__title {
  opacity: 0.8;
}
</style>

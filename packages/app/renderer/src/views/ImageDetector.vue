<template>
  <div class="module-page">
    <div class="page-header">
      <h2>🖼️ 图像检测</h2>
      <p class="page-desc">批量检测图像质量，AI 驱动，支持清晰度、合规性、文字识别</p>
    </div>
    <div class="wt-card">
      <el-empty description="功能开发中，敬请期待..." :image-size="100" />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.module-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  color: #262626;
  margin-bottom: 8px;
}

.page-desc {
  font-size: 14px;
  color: #8c8c8c;
}
</style>

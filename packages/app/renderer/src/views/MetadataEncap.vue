<template>
  <div class="module-page">
    <div class="page-header">
      <h2>🏷️ 元数据封装</h2>
      <p class="page-desc">为文件添加/提取 EXIF、XMP 等元数据，便于检索与归档</p>
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

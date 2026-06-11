<template>
  <div class="module-page">
    <div class="page-header">
      <h2>📊 数据校验</h2>
      <p class="page-desc">对 Excel/CSV 文件进行格式、内容、逻辑校验，快速发现数据问题</p>
    </div>

    <div class="wt-card">
      <el-tabs model-value="file">
        <el-tab-pane label="文件选择" name="file" />
        <el-tab-pane label="校验规则" name="rules" />
        <el-tab-pane label="校验结果" name="result" />
      </el-tabs>
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

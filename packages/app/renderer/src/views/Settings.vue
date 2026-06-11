<template>
  <div class="module-page">
    <div class="page-header">
      <h2>⚙️ 系统设置</h2>
      <p class="page-desc">配置应用基础参数，个性化你的使用体验</p>
    </div>

    <div class="wt-card">
      <el-form label-width="140px" label-position="left" class="settings-form">
        <!-- 语言 -->
        <el-form-item label="界面语言">
          <el-select model-value="zh-CN" disabled style="width: 240px">
            <el-option label="简体中文" value="zh-CN" />
            <el-option label="English" value="en-US" />
          </el-select>
        </el-form-item>

        <!-- 主题 -->
        <el-form-item label="主题模式">
          <el-radio-group model-value="light">
            <el-radio value="light">浅色模式</el-radio>
            <el-radio value="dark">深色模式</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 默认输出目录 -->
        <el-form-item label="默认输出目录">
          <el-input
            model-value="/Users/liupeng/Documents/质检输出"
            placeholder="请选择默认输出目录"
            style="width: 360px"
          >
            <template #append>
              <el-button>浏览</el-button>
            </template>
          </el-input>
        </el-form-item>

        <!-- 最大并发任务数 -->
        <el-form-item label="最大并发任务数">
          <el-input-number
            :model-value="3"
            :min="1"
            :max="10"
            :step="1"
          />
        </el-form-item>

        <!-- 保存按钮 -->
        <el-form-item>
          <el-button type="primary">保存设置</el-button>
          <el-button>恢复默认</el-button>
        </el-form-item>
      </el-form>
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

.settings-form {
  max-width: 600px;
  padding-top: 8px;
}
</style>

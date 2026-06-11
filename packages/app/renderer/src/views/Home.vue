<template>
  <div class="home">
    <!-- 顶部标题 -->
    <header class="home-header">
      <h1 class="home-title">文通Ai质检平台</h1>
      <p class="home-subtitle">数据质量管理工具集</p>
    </header>

    <!-- 功能模块卡片区 -->
    <section class="home-modules">
      <div class="module-grid">
        <div
          v-for="item in modules"
          :key="item.name"
          class="module-card"
        >
          <div class="module-icon">{{ item.icon }}</div>
          <h3 class="module-name">{{ item.name }}</h3>
          <p class="module-desc">{{ item.desc }}</p>
          <el-button type="primary" class="module-action" plain>
            {{ item.action }}
            <el-icon class="module-arrow"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </section>

    <!-- 最近使用 -->
    <section class="home-recent">
      <h2 class="section-title">最近使用</h2>
      <el-empty description="暂无使用记录" :image-size="80" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue';

/** 功能模块列表 */
const modules = [
  {
    icon: '📊',
    name: '数据校验',
    desc: 'Excel/CSV 格式、内容、逻辑校验',
    action: '进入',
  },
  {
    icon: '🖼️',
    name: '图像检测',
    desc: '批量图像质量检测（AI驱动）',
    action: '进入',
  },
  {
    icon: '📄',
    name: 'PDF处理',
    desc: '合并、拆分、加密、水印',
    action: '进入',
  },
  {
    icon: '🔒',
    name: 'MD5校验',
    desc: '文件完整性验证',
    action: '进入',
  },
  {
    icon: '🏷️',
    name: '元数据封装',
    desc: '文件属性管理',
    action: '进入',
  },
  {
    icon: '📋',
    name: '文档管理',
    desc: 'Excel字段自动提取',
    action: '进入',
  },
];
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  padding: 40px 48px;
}

/* 顶部标题 */
.home-header {
  text-align: center;
  margin-bottom: 48px;
}

.home-title {
  font-size: 32px;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 2px;
}

.home-subtitle {
  margin-top: 8px;
  font-size: 16px;
  color: #86909c;
}

/* 功能模块 */
.home-modules {
  max-width: 960px;
  margin: 0 auto 48px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.module-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.module-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 12px;
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 6px;
}

.module-desc {
  font-size: 13px;
  color: #86909c;
  margin-bottom: 16px;
  line-height: 1.5;
}

.module-action {
  margin-top: auto;
}

.module-arrow {
  margin-left: 4px;
}

/* 最近使用 */
.home-recent {
  max-width: 960px;
  margin: 0 auto;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
  padding-left: 4px;
}
</style>

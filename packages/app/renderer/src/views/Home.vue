<template>
  <div class="home">
    <!-- 顶部标题 -->
    <header class="home-header">
      <h1 class="home-title">文通Ai质检平台</h1>
      <p class="home-subtitle">数据质量管理工具集</p>
    </header>

    <!-- 拖拽上传区 -->
    <section class="home-dropzone">
      <div
        class="dropzone-area"
        :class="{ 'dropzone-area--active': isDragging }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="dropzone-content">
          <span class="dropzone-icon">📂</span>
          <p class="dropzone-text">拖拽文件到此处，自动识别并打开对应模块</p>
          <p class="dropzone-hint">支持 Excel / CSV / 图片 / PDF</p>
        </div>
      </div>
    </section>

    <!-- 功能模块卡片区 -->
    <section class="home-modules">
      <h2 class="section-title">功能模块</h2>
      <div class="module-grid">
        <div
          v-for="item in modules"
          :key="item.name"
          class="module-card"
          @click="goModule(item.route)"
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
      <div v-if="recentTasks.length > 0" class="recent-list">
        <div
          v-for="task in recentTasks"
          :key="task.id"
          class="recent-item"
        >
          <div class="recent-item__info">
            <span class="recent-item__name">{{ task.name }}</span>
            <span class="recent-item__module">{{ task.module }}</span>
          </div>
          <div class="recent-item__meta">
            <span class="recent-item__time">{{ formatTime(task.createdAt) }}</span>
            <el-tag
              :type="statusTagType(task.status)"
              size="small"
              class="recent-item__status"
            >
              {{ statusLabel(task.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无使用记录" :image-size="80" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight } from '@element-plus/icons-vue';
import { useTaskStore, type TaskStatus } from '@/stores/task';
import { storeToRefs } from 'pinia';

const router = useRouter();
const taskStore = useTaskStore();
const { recentTasks } = storeToRefs(taskStore);

/** 拖拽悬停状态 */
const isDragging = ref(false);

/** 功能模块列表 */
const modules = [
  { icon: '📊', name: '数据校验', desc: 'Excel/CSV 格式、内容、逻辑校验', action: '进入', route: '/validator' },
  { icon: '🖼️', name: '图像检测', desc: '批量图像质量检测（AI驱动）', action: '进入', route: '/image-detector' },
  { icon: '📄', name: 'PDF处理', desc: '合并、拆分、加密、水印', action: '进入', route: '/pdf-processor' },
  { icon: '🔒', name: 'MD5校验', desc: '文件完整性验证', action: '进入', route: '/md5-checker' },
  { icon: '🏷️', name: '元数据封装', desc: '文件属性管理', action: '进入', route: '/metadata' },
  { icon: '📋', name: '文档管理', desc: 'Excel字段自动提取', action: '进入', route: '/doc-manager' },
];

/** 点击卡片跳转 */
function goModule(path: string) {
  router.push(path);
}

/** 拖入时高亮 */
function onDragOver() {
  isDragging.value = true;
}

/** 拖出时取消高亮 */
function onDragLeave() {
  isDragging.value = false;
}

/** 放置文件：根据扩展名自动跳转 */
function onDrop(e: DragEvent) {
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const fileName = files[0].name.toLowerCase();

  // 根据文件扩展名路由
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.csv')) {
    router.push('/validator');
  } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.bmp') || fileName.endsWith('.gif') || fileName.endsWith('.webp')) {
    router.push('/image-detector');
  } else if (fileName.endsWith('.pdf')) {
    router.push('/pdf-processor');
  }
}

/** 格式化时间戳 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 状态 → el-tag type */
function statusTagType(status: TaskStatus): 'info' | 'warning' | 'success' | 'danger' | '' {
  const map: Record<TaskStatus, string> = {
    pending: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info',
  };
  return (map[status] as 'info' | 'warning' | 'success' | 'danger' | '') || 'info';
}

/** 状态文本 */
function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  };
  return map[status] || status;
}
</script>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 0 48px;
}

/* ---- 顶部标题 ---- */
.home-header {
  text-align: center;
  margin-bottom: 32px;
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

/* ---- 拖拽区 ---- */
.home-dropzone {
  margin-bottom: 40px;
}

.dropzone-area {
  border: 2px dashed #c0c4cc;
  border-radius: 12px;
  padding: 36px 24px;
  text-align: center;
  transition: border-color 0.25s ease, background 0.25s ease;
  background: #fafbfc;
  cursor: pointer;
}

.dropzone-area--active {
  border-color: #1677ff;
  background: #e8f3ff;
}

.dropzone-icon {
  font-size: 48px;
  line-height: 1;
  display: block;
  margin-bottom: 12px;
}

.dropzone-text {
  font-size: 16px;
  color: #606266;
  margin-bottom: 6px;
}

.dropzone-hint {
  font-size: 13px;
  color: #c0c4cc;
}

/* ---- 功能模块 ---- */
.home-modules {
  margin-bottom: 40px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
  padding-left: 4px;
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

/* ---- 最近使用 ---- */
.home-recent {
  /* max-width already handled by .home */
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.recent-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.recent-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item__name {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
}

.recent-item__module {
  font-size: 12px;
  color: #86909c;
}

.recent-item__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recent-item__time {
  font-size: 12px;
  color: #c0c4cc;
}

.recent-item__status {
  /* el-tag handles styling */
}
</style>

<template>
  <div class="home">
    <!-- 欢迎横幅 -->
    <section class="home-welcome">
      <div class="welcome-content">
        <div class="welcome-text">
          <h1 class="welcome-title">👋 欢迎使用 Ai质检平台</h1>
          <p class="welcome-date">{{ currentDate }}</p>
        </div>
      </div>
    </section>

    <!-- 统计面板（仅浏览器演示模式） -->
    <section v-if="isBrowser" class="home-stats">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-card__icon">📊</span>
          <div class="stat-card__body">
            <span class="stat-card__number">{{ animatedStats.rows.toLocaleString() }}</span>
            <span class="stat-card__label">累计校验行数</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-card__icon">🔍</span>
          <div class="stat-card__body">
            <span class="stat-card__number">{{ animatedStats.issues.toLocaleString() }}</span>
            <span class="stat-card__label">累计发现问题</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-card__icon">📋</span>
          <div class="stat-card__body">
            <span class="stat-card__number">{{ animatedStats.reports }}</span>
            <span class="stat-card__label">生成报告数</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 典型场景入口（仅浏览器演示） -->
    <section v-if="isBrowser" class="home-scenarios">
      <h2 class="section-title">⚡ 典型场景</h2>
      <p class="section-subtitle">点击直接进入演示，了解 Ai质检平台如何解决实际问题</p>
      <div class="scenario-grid">
        <div
          v-for="scene in DEMO_SCENARIOS"
          :key="scene.id"
          class="scenario-card"
          @click="goScenario(scene.route, scene.id)"
        >
          <div class="scenario-card__icon">{{ scene.icon }}</div>
          <div class="scenario-card__content">
            <h3 class="scenario-card__title">{{ scene.title }}</h3>
            <p class="scenario-card__subtitle">{{ scene.subtitle }}</p>
            <p class="scenario-card__desc">{{ scene.description }}</p>
          </div>
          <div class="scenario-card__action">
            <span>进入演示</span>
            <span class="scenario-card__arrow">→</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 拖拽上传区 -->
    <section class="home-dropzone">
      <div
        class="dropzone-area"
        :class="{ 'dropzone-area--active': isDragging }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        @click="onClickDropzone"
      >
        <div class="dropzone-content">
          <span class="dropzone-icon">📂</span>
          <p class="dropzone-text">拖拽文件到此处，或点击选择文件</p>
          <p class="dropzone-hint">支持 Excel / CSV / 图片 / PDF · 自动识别并打开对应模块</p>
        </div>
      </div>
    </section>

    <!-- 全部工具 -->
    <section class="home-modules">
      <h2 class="section-title">🔧 全部工具</h2>
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
          @click="goModule(moduleRouteMap[task.module] ?? '/')"
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
      <el-empty v-else description="暂无使用记录 · 尝试点击上方典型场景体验" :image-size="80" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskStore, type TaskStatus } from '@/stores/task';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { DEMO_SCENARIOS, DEMO_HOME_STATS } from '@/utils/demo-scenarios';

const router = useRouter();
const taskStore = useTaskStore();
const appStore = useAppStore();
const { recentTasks } = storeToRefs(taskStore);

/** 当前日期 */
const currentDate = computed(() => {
  const d = new Date();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekDays[d.getDay()]}`;
});

/** 拖拽悬停状态 */
const isDragging = ref(false);

/** 是否浏览器环境（仅在浏览器中展示演示功能） */
const isBrowser = computed(() => !(window as any).electronAPI && !(window as any).api);

/** 动画统计数字 */
const animatedStats = ref({ rows: 0, issues: 0, reports: 0 });

let statsTimer: ReturnType<typeof setInterval> | null = null;

/** 模块名 → 路由映射 */
const moduleRouteMap: Record<string, string> = {
  validator: '/validator',
  image: '/image-detector',
  pdf: '/pdf-processor',
  md5: '/md5-checker',
  metadata: '/metadata',
  doc: '/doc-manager',
};

/** 功能模块列表 */
const modules = [
  { icon: '📊', name: '数据校验', desc: 'Excel/CSV 格式、内容、逻辑校验', route: '/validator' },
  { icon: '🖼️', name: '图像检测', desc: '批量图像质量检测', route: '/image-detector' },
  { icon: '📄', name: 'PDF处理', desc: '合并、拆分、加密、水印', route: '/pdf-processor' },
  { icon: '🔒', name: 'MD5校验', desc: '文件完整性哈希验证', route: '/md5-checker' },
  { icon: '🏷️', name: '元数据封装', desc: '文件属性提取与注入', route: '/metadata' },
  { icon: '📋', name: '文档管理', desc: 'Excel 字段自动提取', route: '/doc-manager' },
];

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

onMounted(() => {
  // 数字滚动动画
  animateStats();
});

onUnmounted(() => {
  if (statsTimer) clearInterval(statsTimer);
});

// ---------------------------------------------------------------------------
// 统计数字动画
// ---------------------------------------------------------------------------

function animateStats() {
  const target = DEMO_HOME_STATS;
  const duration = 1500; // 1.5 秒完成
  const steps = 30;
  const interval = duration / steps;
  let step = 0;

  statsTimer = setInterval(() => {
    step++;
    const progress = step / steps;
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);

    animatedStats.value = {
      rows: Math.round(target.totalRows * eased),
      issues: Math.round(target.totalIssues * eased),
      reports: Math.round(target.totalReports * eased),
    };

    if (step >= steps) {
      animatedStats.value = {
        rows: target.totalRows,
        issues: target.totalIssues,
        reports: target.totalReports,
      };
      if (statsTimer) clearInterval(statsTimer);
    }
  }, interval);
}

// ---------------------------------------------------------------------------
// 方法
// ---------------------------------------------------------------------------

/** 点击场景卡片 → 开启演示模式 + 跳转 */
function goScenario(route: string, scenarioId: string) {
  // 自动开启演示模式
  if (!appStore.demoMode) {
    appStore.toggleDemoMode();
  }
  // 将场景 ID 存到 sessionStorage，目标页面读取后自动加载对应数据
  sessionStorage.setItem('demoScenario', scenarioId);
  router.push(route);
}

/** 点击模块卡片跳转 */
function goModule(path: string) {
  router.push(path);
}

/** 点击拖拽区：弹出文件选择对话框 */
function onClickDropzone() {
  const api = (window as any).electronAPI ?? (window as any).api;
  if (api?.selectFile) {
    api.selectFile().then((files: string[]) => {
      if (files && files.length > 0) {
        routeByExtension(files[0]);
      }
    }).catch(() => {
      // 对话框取消
    });
  }
}

/** 拖入高亮 */
function onDragOver() {
  isDragging.value = true;
}

/** 拖出取消高亮 */
function onDragLeave() {
  isDragging.value = false;
}

/** 拖放文件 */
function onDrop(e: DragEvent) {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  routeByExtension(files[0].name);
}

/** 根据扩展名路由 */
function routeByExtension(fileName: string) {
  const name = fileName.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.csv') || name.endsWith('.xls')) {
    router.push('/validator');
  } else if (/\.(jpg|jpeg|png|bmp|gif|webp)$/.test(name)) {
    router.push('/image-detector');
  } else if (name.endsWith('.pdf')) {
    router.push('/pdf-processor');
  }
}

/** 格式化时间 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 状态 → Tag 类型 */
function statusTagType(status: TaskStatus): 'info' | 'warning' | 'success' | 'danger' | '' {
  const map: Record<TaskStatus, string> = {
    pending: 'info', running: 'warning', completed: 'success', failed: 'danger', cancelled: 'info',
  };
  return (map[status] as any) || 'info';
}

/** 状态文本 */
function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    pending: '等待中', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消',
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

/* ---- 欢迎横幅 ---- */
.home-welcome {
  margin-bottom: 24px;
}

.welcome-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 28px 32px;
  color: #fff;
}

.welcome-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.welcome-date {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

/* ---- 统计面板 ---- */
.home-stats {
  margin-bottom: 36px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-card__icon {
  font-size: 36px;
  line-height: 1;
}

.stat-card__body {
  display: flex;
  flex-direction: column;
}

.stat-card__number {
  font-size: 28px;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 1px;
}

.stat-card__label {
  font-size: 13px;
  color: #86909c;
  margin-top: 2px;
}

/* ---- 典型场景 ---- */
.home-scenarios {
  margin-bottom: 36px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 4px;
  padding-left: 4px;
}

.section-subtitle {
  font-size: 13px;
  color: #86909c;
  margin-bottom: 16px;
  padding-left: 4px;
}

.scenario-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scenario-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-left: 4px solid transparent;
}

.scenario-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-left-color: #1677ff;
}

.scenario-card__icon {
  font-size: 40px;
  flex-shrink: 0;
}

.scenario-card__content {
  flex: 1;
  min-width: 0;
}

.scenario-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 2px;
}

.scenario-card__subtitle {
  font-size: 13px;
  color: #1677ff;
  margin-bottom: 4px;
}

.scenario-card__desc {
  font-size: 12px;
  color: #86909c;
  line-height: 1.6;
}

.scenario-card__action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1677ff;
  font-size: 14px;
  font-weight: 500;
}

.scenario-card__arrow {
  transition: transform 0.2s ease;
}

.scenario-card:hover .scenario-card__arrow {
  transform: translateX(4px);
}

/* ---- 拖拽区 ---- */
.home-dropzone {
  margin-bottom: 40px;
}

.dropzone-area {
  border: 2px dashed #c0c4cc;
  border-radius: 12px;
  padding: 28px 24px;
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
  font-size: 42px;
  line-height: 1;
  display: block;
  margin-bottom: 8px;
}

.dropzone-text {
  font-size: 15px;
  color: #606266;
  margin-bottom: 4px;
}

.dropzone-hint {
  font-size: 12px;
  color: #c0c4cc;
}

/* ---- 功能模块 ---- */
.home-modules {
  margin-bottom: 40px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.module-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
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
  font-size: 40px;
  line-height: 1;
  margin-bottom: 10px;
}

.module-name {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 4px;
}

.module-desc {
  font-size: 12px;
  color: #86909c;
  line-height: 1.4;
}

/* ---- 最近使用 ---- */
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
  cursor: pointer;
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
</style>

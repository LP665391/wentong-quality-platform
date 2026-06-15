<template>
  <div class="home">
    <!-- 欢迎横幅 -->
    <section class="home-welcome">
      <div class="welcome-content">
        <!-- 动态光效装饰 -->
        <div class="welcome-glow welcome-glow--1"></div>
        <div class="welcome-glow welcome-glow--2"></div>
        <div class="welcome-glow welcome-glow--3"></div>
        <div class="welcome-orb welcome-orb--1"></div>
        <div class="welcome-orb welcome-orb--2"></div>
        <div class="welcome-orb welcome-orb--3"></div>
        <div class="welcome-orb welcome-orb--4"></div>
        <div class="welcome-orb welcome-orb--5"></div>
        <div class="welcome-orb welcome-orb--6"></div>
        <!-- 粒子线条装饰 -->
        <div class="welcome-particles">
          <span class="particle particle--1"></span>
          <span class="particle particle--2"></span>
          <span class="particle particle--3"></span>
          <span class="particle particle--4"></span>
          <span class="particle particle--5"></span>
        </div>
        <div class="welcome-text">
          <div class="welcome-company">文通质检</div>
          <h1 class="welcome-title">AI 智能质检平台</h1>
          <p class="welcome-subtitle">多维度自动化质量检测，为您的数据保驾护航</p>
          <p class="welcome-date">{{ currentDate }}</p>
        </div>
      </div>
    </section>

    <!-- 统计面板（仅浏览器演示模式） -->
    <section v-if="isBrowser" class="home-stats">
      <div class="stats-grid">
        <div class="stat-card stat-card--blue">
          <div class="stat-card__glow"></div>
          <span class="stat-card__icon">📊</span>
          <div class="stat-card__body">
            <span class="stat-card__number stat-card__number--blue">{{ animatedStats.rows.toLocaleString() }}</span>
            <span class="stat-card__label">累计校验行数</span>
          </div>
        </div>
        <div class="stat-card stat-card--purple">
          <div class="stat-card__glow"></div>
          <span class="stat-card__icon">🔍</span>
          <div class="stat-card__body">
            <span class="stat-card__number stat-card__number--purple">{{ animatedStats.issues.toLocaleString() }}</span>
            <span class="stat-card__label">累计发现问题</span>
          </div>
        </div>
        <div class="stat-card stat-card--cyan">
          <div class="stat-card__glow"></div>
          <span class="stat-card__icon">📋</span>
          <div class="stat-card__body">
            <span class="stat-card__number stat-card__number--cyan">{{ animatedStats.reports }}</span>
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
          v-for="(scene, idx) in DEMO_SCENARIOS"
          :key="scene.id"
          class="scenario-card"
          :class="[`scenario-card--color${(idx % 3) + 1}`]"
          @click="goScenario(scene.route, scene.id)"
        >
          <div class="scenario-card__bar"></div>
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

    <!-- 拖拽上传区（已隐藏） -->
    <section class="home-dropzone" v-if="false">
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
          v-for="(item, idx) in modules"
          :key="item.name"
          class="module-card"
          :class="[`module-card--color${(idx % 3) + 1}`]"
          @click="goModule(item.route)"
        >
          <div class="module-card__bg"></div>
          <div class="module-icon">
            <span class="module-icon__inner">{{ item.icon }}</span>
          </div>
          <h3 class="module-name">{{ item.name }}</h3>
          <p class="module-desc">{{ item.desc }}</p>
          <div class="module-card__shine"></div>
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
  // 中文模块名映射
  '数据校验': '/validator',
  '图像检测': '/image-detector',
  'PDF处理': '/pdf-processor',
  'MD5校验': '/md5-checker',
  '元数据封装': '/metadata',
  '文档管理': '/doc-manager',
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

/** 点击场景卡片 → 跳转（桌面版已禁用演示模式） */
function goScenario(route: string, scenarioId: string) {
  // 桌面版不启用演示模式，直接跳转
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
/* ==================================================================
   Home — Stripe 风格设计
   主题：白底 + 紫色点缀 + 轻盈优雅
   ================================================================== */

.home {
  max-width: 1024px;
  margin: 0 auto;
  padding: 24px 0 56px;
}

/* ==================================================================
   Welcome Banner — Stripe 风格
   ================================================================== */

.home-welcome {
  margin-bottom: 32px;
}

.welcome-content {
  position: relative;
  background: linear-gradient(135deg, #1c1e54 0%, #061b31 100%);
  border-radius: 12px;
  padding: 40px 44px;
  color: #fff;
  overflow: hidden;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 10px 30px -10px;
}

/* 紫色光晕装饰 */
.welcome-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.welcome-glow--1 {
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(83, 58, 253, 0.3), transparent);
  top: -80px; right: -40px;
}

.welcome-glow--2 {
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(234, 34, 97, 0.15), transparent);
  bottom: -60px; left: -30px;
}

.welcome-glow--3 {
  display: none;
}

/* 隐藏深色主题的浮动元素 */
.welcome-orb,
.welcome-particles {
  display: none;
}

/* 文字内容 */
.welcome-text {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.welcome-company {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.welcome-title {
  font-size: 32px;
  font-weight: 300;
  color: #fff;
  letter-spacing: -0.64px;
  line-height: 1.1;
  margin: 0;
}

.welcome-subtitle {
  font-size: 16px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  margin: 4px 0 0;
  line-height: 1.4;
}

.welcome-date {
  font-size: 13px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 12px;
}

/* ==================================================================
   Section Titles — Stripe
   ================================================================== */

.section-title {
  font-size: 20px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 6px;
  padding-left: 4px;
  letter-spacing: -0.2px;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 300;
  color: var(--text-secondary);
  margin-bottom: 20px;
  padding-left: 4px;
}

/* ==================================================================
   Stats Panel — Stripe 卡片风格
   ================================================================== */

.home-stats {
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  position: relative;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
}

.stat-card__glow {
  display: none;
}

.stat-card__icon {
  font-size: 36px;
  line-height: 1;
  flex-shrink: 0;
}

.stat-card__body {
  display: flex;
  flex-direction: column;
}

.stat-card__number {
  font-size: 28px;
  font-weight: 300;
  letter-spacing: -0.56px;
  line-height: 1.1;
  color: var(--color-primary);
}

.stat-card__number--blue {
  color: var(--color-primary);
}

.stat-card__number--purple {
  color: #8b5cf6;
}

.stat-card__number--cyan {
  color: var(--color-success);
}

.stat-card__label {
  font-size: 13px;
  font-weight: 300;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* ==================================================================
   Scenarios — Stripe 风格
   ================================================================== */

.home-scenarios {
  margin-bottom: 32px;
}

.scenario-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scenario-card {
  position: relative;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.scenario-card__bar {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  transition: all var(--transition-fast);
}

.scenario-card--color1 .scenario-card__bar {
  background: var(--color-primary);
}

.scenario-card--color2 .scenario-card__bar {
  background: var(--color-success);
}

.scenario-card--color3 .scenario-card__bar {
  background: #8b5cf6;
}

.scenario-card:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(83, 58, 253, 0.2);
}

.scenario-card:hover .scenario-card__bar {
  width: 4px;
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
  font-weight: 400;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.scenario-card__subtitle {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-primary);
  margin: 0 0 4px;
}

.scenario-card--color2 .scenario-card__subtitle {
  color: var(--color-success);
}

.scenario-card--color3 .scenario-card__subtitle {
  color: #8b5cf6;
}

.scenario-card__desc {
  font-size: 13px;
  font-weight: 300;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.scenario-card__action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 400;
}

.scenario-card--color2 .scenario-card__action {
  color: var(--color-success);
}

.scenario-card--color3 .scenario-card__action {
  color: #8b5cf6;
}

.scenario-card__arrow {
  display: inline-block;
  transition: transform var(--transition-fast);
}

.scenario-card:hover .scenario-card__arrow {
  transform: translateX(4px);
}

/* ==================================================================
   Modules — Stripe 卡片网格
   ================================================================== */

.home-modules {
  margin-bottom: 32px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.module-card {
  position: relative;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 28px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
  cursor: pointer;
  overflow: hidden;
}

.module-card__bg,
.module-card__shine {
  display: none;
}

.module-card:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(83, 58, 253, 0.2);
}

.module-icon {
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
}

.module-icon__inner {
  font-size: 42px;
  line-height: 1;
  display: block;
  transition: transform var(--transition-fast);
}

.module-card:hover .module-icon__inner {
  transform: scale(1.08);
}

.module-name {
  position: relative;
  z-index: 1;
  font-size: 15px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.module-desc {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 300;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

/* ==================================================================
   Dropzone (hidden)
   ================================================================== */

.home-dropzone {
  margin-bottom: 32px;
}

.dropzone-area {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  transition: border-color var(--transition-fast), background var(--transition-fast);
  background: var(--bg-card);
  cursor: pointer;
}

.dropzone-area--active {
  border-color: var(--color-primary);
  background: rgba(83, 58, 253, 0.04);
}

.dropzone-icon {
  font-size: 36px;
  line-height: 1;
  display: block;
  margin-bottom: 8px;
}

.dropzone-text {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.dropzone-hint {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-secondary);
}

/* ==================================================================
   Recent Items — Stripe
   ================================================================== */

.home-recent {
  margin-bottom: 20px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.recent-item:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(83, 58, 253, 0.2);
}

.recent-item__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recent-item__name {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
}

.recent-item__module {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-secondary);
}

.recent-item__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recent-item__time {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-placeholder);
}

/* ==================================================================
   Responsive
   ================================================================== */

@media (max-width: 768px) {
  .home {
    padding: 16px 12px 40px;
  }

  .welcome-content {
    padding: 28px 24px;
  }

  .welcome-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .module-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .module-grid {
    grid-template-columns: 1fr;
  }

  .scenario-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 20px;
  }

  .scenario-card__icon {
    font-size: 32px;
  }

  .scenario-card__action {
    align-self: flex-end;
  }
}
</style>

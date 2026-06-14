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
   Home — 增强视觉冲击力设计
   主题：深蓝 + 紫 + 青色渐变
   ================================================================== */

.home {
  max-width: 1024px;
  margin: 0 auto;
  padding: 24px 0 56px;
}

/* ==================================================================
   Animations
   ================================================================== */

@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
  50%      { transform: translateY(-18px) rotate(6deg); opacity: 0.6; }
}

@keyframes floatReverse {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.25; }
  50%      { transform: translateY(14px) rotate(-5deg); opacity: 0.55; }
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(1.15); }
}

@keyframes shimmer {
  0%   { left: -100%; }
  100% { left: 200%; }
}

@keyframes particleDrift {
  0%   { transform: translate(0, 0); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translate(40px, -60px); opacity: 0; }
}

@keyframes borderGlow {
  0%, 100% { border-color: rgba(99, 102, 241, 0.3); }
  50%      { border-color: rgba(99, 102, 241, 0.8); }
}

@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ==================================================================
   Welcome Banner
   ================================================================== */

.home-welcome {
  margin-bottom: 32px;
  perspective: 1000px;
}

.welcome-content {
  position: relative;
  background: linear-gradient(135deg, #0f0c29, #1a1a3e 25%, #1e2a4a 50%, #0d1b3e 75%, #0f0c29);
  background-size: 400% 400%;
  animation: gradientShift 12s ease infinite;
  border-radius: 20px;
  padding: 48px 44px;
  color: #fff;
  overflow: hidden;
  box-shadow:
    0 8px 40px rgba(15, 12, 41, 0.5),
    0 0 120px rgba(99, 102, 241, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 光晕效果 */
.welcome-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.welcome-glow--1 {
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35), transparent);
  top: -80px; right: -40px;
  animation: pulseGlow 6s ease-in-out infinite;
}

.welcome-glow--2 {
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.3), transparent);
  bottom: -60px; left: -30px;
  animation: pulseGlow 8s ease-in-out 1s infinite;
}

.welcome-glow--3 {
  width: 180px; height: 180px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.3), transparent);
  top: 50%; left: 60%;
  animation: pulseGlow 7s ease-in-out 2s infinite;
}

/* 浮动圆点 */
.welcome-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.welcome-orb--1 {
  width: 12px; height: 12px;
  background: rgba(99, 102, 241, 0.6);
  top: 18%; right: 22%;
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.5);
  animation: float 5s ease-in-out infinite;
}

.welcome-orb--2 {
  width: 8px; height: 8px;
  background: rgba(34, 211, 238, 0.7);
  top: 62%; right: 12%;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.5);
  animation: floatReverse 6s ease-in-out 0.8s infinite;
}

.welcome-orb--3 {
  width: 10px; height: 10px;
  background: rgba(168, 85, 247, 0.7);
  top: 28%; right: 48%;
  box-shadow: 0 0 14px rgba(168, 85, 247, 0.5);
  animation: float 7s ease-in-out 1.5s infinite;
}

.welcome-orb--4 {
  width: 6px; height: 6px;
  background: rgba(99, 102, 241, 0.5);
  top: 75%; right: 32%;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
  animation: floatReverse 5.5s ease-in-out 0.3s infinite;
}

.welcome-orb--5 {
  width: 14px; height: 14px;
  background: rgba(34, 211, 238, 0.5);
  top: 8%; right: 8%;
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.4);
  animation: float 8s ease-in-out 2.2s infinite;
}

.welcome-orb--6 {
  width: 7px; height: 7px;
  background: rgba(168, 85, 247, 0.6);
  top: 45%; right: 68%;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
  animation: floatReverse 4.5s ease-in-out 3s infinite;
}

/* 粒子线条 */
.welcome-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: particleDrift 4s ease-in-out infinite;
}

.particle--1 { top: 30%; left: 10%; animation-delay: 0s; }
.particle--2 { top: 60%; left: 25%; animation-delay: 1.2s; }
.particle--3 { top: 45%; left: 40%; animation-delay: 2.4s; }
.particle--4 { top: 20%; left: 55%; animation-delay: 0.6s; }
.particle--5 { top: 70%; left: 70%; animation-delay: 3s; }

/* 文字内容 */
.welcome-text {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.welcome-company {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(34, 211, 238, 0.85);
  margin-bottom: 4px;
}

.welcome-title {
  font-size: 38px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2px;
  line-height: 1.2;
  margin: 0;
  background: linear-gradient(135deg, #fff 30%, #a5b4fc 60%, #67e8f9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.65);
  margin: 4px 0 0;
  letter-spacing: 0.5px;
}

.welcome-date {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 8px;
  letter-spacing: 0.5px;
}

/* ==================================================================
   Section Titles
   ================================================================== */

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 6px;
  padding-left: 4px;
  letter-spacing: 0.5px;
}

.section-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 20px;
  padding-left: 4px;
}

/* ==================================================================
   Stats Panel — 玻璃态
   ================================================================== */

.home-stats {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  gap: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1.2);
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.3),
    0 0 40px rgba(99, 102, 241, 0.08);
}

/* 微光边框 */
.stat-card__glow {
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent 60%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.stat-card--blue .stat-card__glow {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.5), transparent 60%);
}

.stat-card--purple .stat-card__glow {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.5), transparent 60%);
}

.stat-card--cyan .stat-card__glow {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.5), transparent 60%);
}

.stat-card__icon {
  font-size: 42px;
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.1));
}

.stat-card__body {
  display: flex;
  flex-direction: column;
}

.stat-card__number {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 1px;
  line-height: 1.1;
  animation: countUp 0.5s ease-out both;
}

.stat-card__number--blue {
  background: linear-gradient(135deg, #818cf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card__number--purple {
  background: linear-gradient(135deg, #c084fc, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card__number--cyan {
  background: linear-gradient(135deg, #67e8f9, #22d3ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card__label {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  letter-spacing: 0.3px;
}

/* ==================================================================
   Scenarios — 彩色左边框
   ================================================================== */

.home-scenarios {
  margin-bottom: 40px;
}

.scenario-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scenario-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  gap: 22px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1.2);
}

.scenario-card__bar {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  transition: all 0.35s ease;
}

/* 不同颜色 */
.scenario-card--color1 .scenario-card__bar {
  background: linear-gradient(180deg, #6366f1, #818cf8);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
}

.scenario-card--color2 .scenario-card__bar {
  background: linear-gradient(180deg, #10b981, #34d399);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
}

.scenario-card--color3 .scenario-card__bar {
  background: linear-gradient(180deg, #a855f7, #c084fc);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.5);
}

.scenario-card:hover {
  transform: translateX(6px) translateY(-2px);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    0 0 60px rgba(99, 102, 241, 0.06);
}

.scenario-card:hover .scenario-card__bar {
  width: 6px;
  top: 8px;
  bottom: 8px;
}

.scenario-card__icon {
  font-size: 44px;
  flex-shrink: 0;
  transition: transform 0.35s ease;
}

.scenario-card:hover .scenario-card__icon {
  transform: scale(1.1);
}

.scenario-card__content {
  flex: 1;
  min-width: 0;
}

.scenario-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 4px;
}

.scenario-card__subtitle {
  font-size: 13px;
  font-weight: 500;
  color: #818cf8;
  margin: 0 0 6px;
}

.scenario-card--color2 .scenario-card__subtitle {
  color: #34d399;
}

.scenario-card--color3 .scenario-card__subtitle {
  color: #c084fc;
}

.scenario-card__desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

.scenario-card__action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #818cf8;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.3s ease;
}

.scenario-card--color2 .scenario-card__action {
  color: #34d399;
}

.scenario-card--color3 .scenario-card__action {
  color: #c084fc;
}

.scenario-card__arrow {
  display: inline-block;
  transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1.2);
}

.scenario-card:hover .scenario-card__arrow {
  transform: translateX(6px);
}

/* ==================================================================
   Modules — 2×3 网格 + 3D Hover
   ================================================================== */

.home-modules {
  margin-bottom: 44px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.module-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 32px 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1.2);
  cursor: pointer;
  overflow: hidden;
}

/* 卡片渐变背景装饰 */
.module-card__bg {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  border-radius: 16px;
}

.module-card--color1 .module-card__bg {
  background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.12), transparent 70%);
}

.module-card--color2 .module-card__bg {
  background: radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.12), transparent 70%);
}

.module-card--color3 .module-card__bg {
  background: radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.12), transparent 70%);
}

.module-card:hover .module-card__bg {
  opacity: 1;
}

/* 光泽扫过 */
.module-card__shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.04),
    transparent
  );
  transform: skewX(-18deg);
  pointer-events: none;
}

.module-card:hover .module-card__shine {
  animation: shimmer 0.7s ease forwards;
}

.module-card:hover {
  transform: translateY(-10px) scale(1.03);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.4),
    0 0 80px rgba(99, 102, 241, 0.08);
}

.module-icon {
  position: relative;
  z-index: 1;
  margin-bottom: 14px;
}

.module-icon__inner {
  font-size: 48px;
  line-height: 1;
  display: block;
  filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.3));
  transition: transform 0.4s ease, filter 0.4s ease;
}

.module-card:hover .module-icon__inner {
  transform: scale(1.12);
  filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.5));
}

.module-name {
  position: relative;
  z-index: 1;
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 6px;
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.module-card:hover .module-name {
  color: #fff;
}

.module-desc {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  transition: color 0.3s ease;
}

.module-card:hover .module-desc {
  color: #94a3b8;
}

/* ==================================================================
   Dropzone (hidden)
   ================================================================== */

.home-dropzone {
  margin-bottom: 40px;
}

.dropzone-area {
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 28px 24px;
  text-align: center;
  transition: border-color 0.25s ease, background 0.25s ease;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
}

.dropzone-area--active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

.dropzone-icon {
  font-size: 42px;
  line-height: 1;
  display: block;
  margin-bottom: 8px;
}

.dropzone-text {
  font-size: 15px;
  color: #cbd5e1;
  margin-bottom: 4px;
}

.dropzone-hint {
  font-size: 12px;
  color: #475569;
}

/* ==================================================================
   Recent Items
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
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s ease;
  cursor: pointer;
}

.recent-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transform: translateX(3px);
}

.recent-item__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recent-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.recent-item__module {
  font-size: 12px;
  color: #64748b;
}

.recent-item__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recent-item__time {
  font-size: 12px;
  color: #475569;
}

/* ==================================================================
   Responsive
   ================================================================== */

@media (max-width: 768px) {
  .home {
    padding: 16px 12px 40px;
  }

  .welcome-content {
    padding: 32px 24px;
  }

  .welcome-title {
    font-size: 26px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .module-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
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
    padding: 18px 20px;
  }

  .scenario-card__icon {
    font-size: 36px;
  }

  .scenario-card__action {
    align-self: flex-end;
  }
}
</style>

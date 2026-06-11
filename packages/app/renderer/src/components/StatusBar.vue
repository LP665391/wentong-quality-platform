<template>
  <footer class="statusbar">
    <!-- 左侧：授权状态 + 演示模式 + 版本号 -->
    <div class="statusbar__left">
      <span class="statusbar__item">
        <span class="status-indicator status-indicator--active" />
        <span>已授权</span>
      </span>
      <span class="statusbar__divider">|</span>
      <span v-if="isBrowser && appStore.demoMode" class="statusbar__item">
        <span class="status-indicator status-indicator--demo" />
        <span>演示中</span>
      </span>
      <span v-if="isBrowser && appStore.demoMode" class="statusbar__divider">|</span>
      <span class="statusbar__item statusbar__version">
        v{{ appStore.version }}
      </span>
    </div>

    <!-- 中间：最近任务数量 -->
    <div class="statusbar__center">
      <span
        v-if="taskStore.runningTasks.length > 0"
        class="statusbar__item statusbar__task-badge"
      >
        🔄 {{ taskStore.runningTasks.length }} 个任务运行中
      </span>
      <span class="statusbar__item">
        📋 最近 {{ taskStore.recentTasks.length }} 条任务
      </span>
    </div>

    <!-- 右侧：公司信息 + 当前时间 -->
    <div class="statusbar__right">
      <span class="statusbar__item statusbar__company">
        © 连云港文安档案科技有限公司
      </span>
      <span class="statusbar__divider">|</span>
      <span class="statusbar__item statusbar__phone">
        183 5281 1015
      </span>
      <span class="statusbar__divider">|</span>
      <span class="statusbar__item statusbar__chairman">
        董事长 刘婷
      </span>
      <span class="statusbar__divider">|</span>
      <span class="statusbar__item statusbar__time">
        {{ currentTime }}
      </span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useTaskStore } from '@/stores/task';

const appStore = useAppStore();
const taskStore = useTaskStore();

/** 仅在浏览器中显示演示指示器 */
const isBrowser = computed(() => !(window as any).electronAPI && !(window as any).api);

// ---------------------------------------------------------------------------
// 当前时间（每 30 秒更新）
// ---------------------------------------------------------------------------
function formatTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${h}:${min}`;
}

const currentTime = ref(formatTime(new Date()));
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = formatTime(new Date());
  }, 30_000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<style scoped>
.statusbar {
  height: var(--statusbar-height);
  background: var(--bg-statusbar);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  gap: 16px;
  user-select: none;
}

/* ---- 左 / 中 / 右 容器 ---- */
.statusbar__left,
.statusbar__center,
.statusbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.statusbar__center {
  flex: 1;
  justify-content: center;
}

.statusbar__right {
  flex-shrink: 0;
}

/* ---- 条目 ---- */
.statusbar__item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.statusbar__divider {
  color: var(--text-placeholder);
  margin: 0 2px;
}

/* ---- 授权指示灯 ---- */
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
  flex-shrink: 0;
}

.status-indicator--active {
  background: #67c23a;
  box-shadow: 0 0 4px rgba(103, 194, 58, 0.5);
}

.status-indicator--demo {
  background: #e6a23c;
  box-shadow: 0 0 4px rgba(230, 162, 60, 0.5);
  animation: demo-pulse 2s ease-in-out infinite;
}

@keyframes demo-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ---- 版本号 ---- */
.statusbar__version {
  color: var(--text-placeholder);
}

/* ---- 任务徽章 ---- */
.statusbar__task-badge {
  color: var(--color-primary);
  font-weight: 500;
}

/* ---- 公司信息 ---- */
.statusbar__company {
  color: var(--text-secondary);
  font-size: 11px;
}

.statusbar__phone,
.statusbar__chairman {
  color: var(--text-hint);
  font-size: 11px;
}

/* ---- 时间 ---- */
.statusbar__time {
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}
</style>

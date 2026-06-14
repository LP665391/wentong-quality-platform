<template>
  <div class="module-page">
    <div class="page-header">
      <h2>🖼️ 档案图像质量检测</h2>
      <p class="page-desc">依据 DA/T 31-2017 标准，检测格式、分辨率、色彩、模糊、歪斜、黑边</p>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         区域1：检测配置
         ══════════════════════════════════════════════════════════════════ -->
    <div class="wt-card">
      <h3 class="section-title">检测配置</h3>

      <el-form label-width="100px" label-position="left">
        <!-- 质检目录 -->
        <el-form-item label="质检目录">
          <div class="input-with-btn">
            <el-input
              v-model="dirPath"
              placeholder="请选择包含图像的目录"
              readonly
              clearable
              @clear="dirPath = ''"
            />
            <el-button type="primary" @click="selectDir" :disabled="running">
              浏览
            </el-button>
            <el-button type="success" v-if="isBrowser" @click="loadDemoImages" :disabled="running" plain>
              🎯 加载演示图片
            </el-button>
          </div>
        </el-form-item>

        <!-- 包含子目录 -->
        <el-form-item label="子目录">
          <el-checkbox v-model="recursive" :disabled="running">
            包含子目录
          </el-checkbox>
        </el-form-item>

        <!-- 检测模式 -->
        <el-form-item label="检测模式">
          <div class="preset-buttons">
            <el-button
              :type="presetId === 'archive' ? 'primary' : 'default'"
              @click="presetId = 'archive'"
              :disabled="running"
            >
              📦 保存级
            </el-button>
            <el-button
              :type="presetId === 'access' ? 'primary' : 'default'"
              @click="presetId = 'access'"
              :disabled="running"
            >
              📖 利用级
            </el-button>
            <el-button
              :type="presetId === 'quick' ? 'primary' : 'default'"
              @click="presetId = 'quick'"
              :disabled="running"
            >
              ⚡ 快速筛查
            </el-button>
          </div>
          <p class="preset-desc">{{ presetDescription }}</p>
        </el-form-item>

        <!-- 并发数 -->
        <el-form-item label="并发数">
          <el-slider
            v-model="concurrency"
            :min="1"
            :max="8"
            :step="1"
            :disabled="running"
            style="width: 200px"
            show-stops
          />
          <span class="slider-hint">{{ concurrency }} 个并发</span>
        </el-form-item>

        <!-- 阈值 -->
        <el-form-item label="合格阈值">
          <el-slider
            v-model="threshold"
            :min="0"
            :max="100"
            :disabled="running"
            style="width: 200px"
            show-stops
          />
          <span class="slider-hint">≥ {{ threshold }} 分</span>
        </el-form-item>
      </el-form>

      <!-- 操作按钮 -->
      <div class="action-row">
        <el-button
          type="success"
          size="large"
          :disabled="!canStart || running"
          :loading="running"
          @click="startDetection"
        >
          {{ running ? '检测中...' : '运行检测' }}
        </el-button>
        <el-button
          type="danger"
          size="large"
          :disabled="!running"
          @click="cancelDetection"
        >
          取消
        </el-button>
      </div>

      <!-- 进度条 -->
      <div v-if="running || progress.total > 0" class="progress-section">
        <el-progress
          :percentage="progress.percent"
          :status="progress.error ? 'exception' : progress.percent >= 100 ? 'success' : undefined"
          :stroke-width="16"
          :text-inside="true"
        />
        <p class="progress-text">
          <el-tag :type="progressTagType" size="small" effect="plain">
            {{ progressStatusText }}
          </el-tag>
          <span v-if="progress.current > 0 && progress.total > 0">
            {{ progress.current }} / {{ progress.total }}
          </span>
          <span v-if="progress.fileName" class="progress-file">
            {{ progress.fileName }}
          </span>
        </p>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         区域2：统计面板
         ══════════════════════════════════════════════════════════════════ -->
    <div v-if="results.length > 0" class="stats-grid">
      <div class="stat-item">
        <span class="stat-number">{{ results.length }}</span>
        <span class="stat-label">总数</span>
      </div>
      <div class="stat-item stat-success">
        <span class="stat-number">{{ qualifiedCount }}</span>
        <span class="stat-label">合格</span>
      </div>
      <div class="stat-item stat-error">
        <span class="stat-number">{{ unqualifiedCount }}</span>
        <span class="stat-label">不合格</span>
      </div>
      <div class="stat-item stat-info">
        <span class="stat-number">{{ qualifiedRate }}%</span>
        <span class="stat-label">合格率</span>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         区域3：缩略图网格
         ══════════════════════════════════════════════════════════════════ -->
    <div v-if="results.length > 0" class="thumbnail-grid">
      <div
        v-for="item in displayResults"
        :key="item.filePath"
        class="thumbnail-item"
        :class="{ 'is-unqualified': !item.isQualified, 'is-error': !!item.error }"
        @click="openImage(item.filePath)"
      >
        <div class="thumbnail-img">
          <img
            :src="getFileUrl(item.filePath)"
            :alt="item.fileName"
            @error="onImgError"
            loading="lazy"
          />
          <span class="thumbnail-status">
            {{ item.error ? '⚠️' : item.isQualified ? '✅' : '❌' }}
          </span>
        </div>
        <span class="thumbnail-name" :title="item.fileName">{{ item.fileName }}</span>
        <span class="thumbnail-score" :class="{ 'score-low': item.score < threshold }">
          {{ item.error ? 'N/A' : item.score.toFixed(0) + '分' }}
        </span>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         底部操作栏
         ══════════════════════════════════════════════════════════════════ -->
    <div v-if="results.length > 0" class="footer-actions">
      <el-button @click="exportReport" :disabled="exporting">
        <el-icon><Download /></el-icon>
        {{ exporting ? '导出中...' : '导出报告' }}
      </el-button>
      <el-button @click="openDir" :disabled="!dirPath">
        <el-icon><FolderOpened /></el-icon>
        打开目录
      </el-button>
      <el-button @click="resetResults">
        <el-icon><Delete /></el-icon>
        清除结果
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useAppStore } from '@/stores/app';
import { generateImageScreeningResults, COMPARISON_DATA, type ComparisonData, type DemoImageResult } from '@/utils/demo-scenarios';
import { generateDemoImage } from '@/utils/demo-data';
import { Download, FolderOpened, Delete } from '@element-plus/icons-vue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetectionResult {
  fileName: string;
  filePath: string;
  isQualified: boolean;
  score: number;
  modelUsed: string;
  details: Record<string, unknown>;
  error?: string;
}

interface ProgressData {
  taskId: string;
  current: number;
  total: number;
  fileName: string;
  percent: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const dirPath = ref('');
const presetId = ref('archive');
const recursive = ref(false);
const concurrency = ref(4);
const threshold = ref(50);
const running = ref(false);
const exporting = ref(false);
const showComparison = ref(false);
const comparisonData = ref<ComparisonData[]>([]);
const appStore = useAppStore();

// 是否浏览器环境（非 Electron）
const isBrowser = computed(() => !(window as any).electronAPI && !(window as any).api);

const progress = ref<{
  current: number;
  total: number;
  fileName: string;
  percent: number;
  error?: string;
}>({
  current: 0,
  total: 0,
  fileName: '',
  percent: 0,
});

const taskId = ref('');
const results = ref<DetectionResult[]>([]);

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const canStart = computed(() => dirPath.value.trim().length > 0 && presetId.value.length > 0);

// 预设模式描述
const presetDescriptions: Record<string, string> = {
  archive: '归档入库标准：TIFF格式 + ≥300DPI + 全项检测（格式/分辨率/色彩/模糊/歪斜/黑边）',
  access: '查阅利用标准：JPEG/PDF格式 + ≥150DPI + 基础检测（格式/分辨率/色彩/模糊）',
  quick: '快速验收：仅检查格式和分辨率（≥150DPI），支持常见图片格式',
};

const presetDescription = computed(() => presetDescriptions[presetId.value] || '');

const qualifiedCount = computed(() =>
  results.value.filter((r) => r.isQualified && !r.error).length,
);

const unqualifiedCount = computed(() =>
  results.value.filter((r) => !r.isQualified || !!r.error).length,
);

const qualifiedRate = computed(() => {
  if (results.value.length === 0) return 0;
  return Math.round((qualifiedCount.value / results.value.length) * 100);
});

/** 按阈值过滤后的展示结果 */
const displayResults = computed(() => results.value);

const progressTagType = computed(() => {
  if (progress.value.error) return 'danger';
  if (progress.value.percent >= 100) return 'success';
  return 'primary';
});

const progressStatusText = computed(() => {
  if (progress.value.error) return '错误';
  if (progress.value.percent >= 100) return '完成';
  if (progress.value.percent > 0) return '检测中';
  return '准备中';
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

function getFileUrl(filePath: string): string {
  // Electron 中 file:// 协议加载本地图片
  if (filePath.startsWith('/')) {
    return `file://${filePath}`;
  }
  return `file:///${filePath}`;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function selectDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    // 浏览器环境静默
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (dir) {
      dirPath.value = dir;
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function startDetection(): Promise<void> {
  if (!canStart.value) return;

  const api = getApi();
  
  if (!api?.createImageDetectorTask) {
    ElMessage.warning('图像检测功能仅在桌面应用中可用');
    return;
  }

  try {
    running.value = true;
    progress.value = { current: 0, total: 0, fileName: '', percent: 0 };
    results.value = [];

    // 1) 创建检测任务
    const createRes = await api.createImageDetectorTask({
      dirPath: dirPath.value,
      presetId: presetId.value,
      options: {
        recursive: recursive.value,
        concurrency: concurrency.value,
      },
    });
    taskId.value = createRes.taskId;

    // 2) 监听进度
    let cleanupProgress: (() => void) | null = null;
    if (api.onImageDetectorProgress) {
      cleanupProgress = api.onImageDetectorProgress(
        (data: ProgressData) => {
          if (data.taskId !== taskId.value) return;
          progress.value = {
            current: data.current,
            total: data.total,
            fileName: data.fileName,
            percent: data.percent,
            error: data.error,
          };
        },
      );
    }

    // 3) 执行检测
    const runRes = await api.runImageDetector({
      taskId: taskId.value,
      dirPath: dirPath.value,
      presetId: presetId.value,
      options: {
        recursive: recursive.value,
        concurrency: concurrency.value,
      },
    });

    // 4) 清理进度监听
    if (cleanupProgress) cleanupProgress();

    if (runRes.success) {
      results.value = (runRes.results as DetectionResult[]) || [];
      progress.value.percent = 100;

      ElNotification({
        title: '检测完成',
        message: `共 ${results.value.length} 张图片：${qualifiedCount.value} 合格，${unqualifiedCount.value} 不合格`,
        type: unqualifiedCount.value > 0 ? 'warning' : 'success',
        duration: 5000,
      });
    } else if (!runRes.cancelled) {
      ElNotification({
        title: '检测失败',
        message: runRes.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    ElNotification({
      title: '检测异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    running.value = false;
  }
}

async function cancelDetection(): Promise<void> {
  const api = getApi();
  if (!api?.cancelImageDetector) {
    running.value = false;
    return;
  }

  try {
    await api.cancelImageDetector({ taskId: taskId.value });
    ElMessage.info('已取消检测');
  } catch (err: any) {
    ElMessage.error(`取消失败：${err.message ?? err}`);
  } finally {
    running.value = false;
  }
}

function onImgError(event: Event): void {
  const img = event.target as HTMLImageElement;
  // 使用占位图替代加载失败的图片
  img.src =
    'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'120\'%3E%3Crect fill=\'%23f5f5f5\' width=\'160\' height=\'120\'/%3E%3Ctext x=\'80\' y=\'65\' text-anchor=\'middle\' fill=\'%23c0c4cc\' font-size=\'14\'%3E图片加载失败%3C/text%3E%3C/svg%3E';
}

async function openImage(filePath: string): Promise<void> {
  const api = getApi();
  if (api?.openExternal) {
    await api.openExternal(filePath);
  }
}

async function openDir(): Promise<void> {
  const api = getApi();
  if (api?.openExternal && dirPath.value) {
    await api.openExternal(dirPath.value);
  }
}

async function exportReport(): Promise<void> {
  if (results.value.length === 0) return;

  const api = getApi();
  if (!api?.selectDirectory) {
    // 浏览器环境静默
    return;
  }

  exporting.value = true;

  try {
    // 选择导出目录
    const outDir = await api.selectDirectory();
    if (!outDir) {
      exporting.value = false;
      return;
    }

    // 构建 JSON 报告
    const report = {
      taskId: taskId.value,
      presetId: presetId.value,
      threshold: threshold.value,
      dirPath: dirPath.value,
      total: results.value.length,
      qualified: qualifiedCount.value,
      unqualified: unqualifiedCount.value,
      qualifiedRate: qualifiedRate.value,
      generatedAt: new Date().toISOString(),
      results: results.value,
    };

    // 转换为 CSV（简单实现）
    const csvHeader = '文件名,路径,是否合格,分数,模型,错误';
    const csvRows = results.value.map((r) => {
      const parts = [
        r.fileName,
        r.filePath,
        r.isQualified ? '是' : '否',
        r.score,
        r.modelUsed,
        r.error ?? '',
      ];
      return parts.map((p) => `"${String(p).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // 通过 IPC 写出文件
    if (api?.writeFile) {
      const jsonPath = `${outDir}/image-detection-report.json`;
      const csvPath = `${outDir}/image-detection-report.csv`;

      await api.writeFile(jsonPath, JSON.stringify(report, null, 2));
      await api.writeFile(csvPath, csvContent);

      ElNotification({
        title: '导出成功',
        message: `报告已保存至：${outDir}`,
        type: 'success',
        duration: 5000,
      });
    } else {
      // 浏览器环境静默
    }
  } catch (err: any) {
    ElMessage.error(`导出失败：${err.message ?? err}`);
  } finally {
    exporting.value = false;
  }
}

function resetResults(): void {
  results.value = [];
  progress.value = { current: 0, total: 0, fileName: '', percent: 0 };
  taskId.value = '';
}

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

onMounted(() => {
  // 桌面版不自动加载演示数据
});

// ---------------------------------------------------------------------------
// 演示模式：加载内置图片并生成真实缩略图
// ---------------------------------------------------------------------------

async function loadDemoImages() {
  dirPath.value = '📁 产品图片目录 (20张)';
  const demoResults = generateImageScreeningResults();
  comparisonData.value = COMPARISON_DATA['image-screening'] ?? [];

  // 为每张图生成真实的 Canvas 缩略图
  const resultsPromises = demoResults.map(async (r) => {
    const w = (r.details.width as number) || 320;
    const h = (r.details.height as number) || 240;
    // 用 Canvas 生成缩略图 Blob URL
    const thumbnailUrl = await generateDemoImage(
      Math.min(w, 320),
      Math.min(h, 240),
    );
    return {
      fileName: r.fileName,
      filePath: thumbnailUrl, // Blob URL，浏览器可显示
      isQualified: r.isQualified,
      score: r.score,
      modelUsed: r.modelUsed,
      details: r.details,
    };
  });

  results.value = await Promise.all(resultsPromises);

  const qualified = results.value.filter((r) => r.isQualified).length;
  ElNotification({
    title: '产品图片批量筛查 · 演示数据已加载',
    message: `20 张图片，合格 ${qualified} 张，不合格 ${20 - qualified} 张`,
    type: 'success',
  });
}
</script>

<style scoped>
/* ── 页面布局 ── */
.module-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 32px;
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

/* ── 表单 ── */
.input-with-btn {
  display: flex;
  gap: 8px;
  width: 100%;
}

.input-with-btn .el-input {
  flex: 1;
}

.slider-hint {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}

/* ── 模型选项 ── */
.model-option {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.model-name {
  font-weight: 600;
  font-size: 14px;
}

.model-desc {
  font-size: 12px;
  color: #909399;
}

/* ── 操作按钮 ── */
.action-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

/* ── 进度条 ── */
.progress-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.progress-text {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-file {
  color: #909399;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

/* ── 统计面板 ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 16px 0;
}

.stat-item {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px 16px;
  text-align: center;
  transition: transform 0.2s;
}

.stat-item:hover {
  transform: translateY(-2px);
}

.stat-item.stat-success {
  background: #f0f9eb;
}

.stat-item.stat-success .stat-number {
  color: #67c23a;
}

.stat-item.stat-error {
  background: #fef0f0;
}

.stat-item.stat-error .stat-number {
  color: #f56c6c;
}

.stat-item.stat-info {
  background: #ecf5ff;
}

.stat-item.stat-info .stat-number {
  color: #409eff;
}

.stat-number {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-top: 6px;
}

/* ── 缩略图网格 ── */
.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin: 16px 0 24px;
}

.thumbnail-item {
  background: #fff;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.thumbnail-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.thumbnail-item.is-unqualified {
  border-color: #fde2e2;
}

.thumbnail-item.is-unqualified:hover {
  border-color: #f56c6c;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.15);
}

.thumbnail-item.is-error {
  border-color: #fdf6ec;
  opacity: 0.8;
}

.thumbnail-img {
  position: relative;
  width: 100%;
  height: 140px;
  background: #f5f5f5;
  overflow: hidden;
}

.thumbnail-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-status {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 18px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.thumbnail-name {
  display: block;
  padding: 8px 10px 4px;
  font-size: 12px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-score {
  display: block;
  padding: 0 10px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #67c23a;
}

.thumbnail-score.score-low {
  color: #f56c6c;
}

/* ── 底部操作栏 ── */
.footer-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
</style>

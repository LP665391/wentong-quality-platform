<template>
  <div class="module-page">
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>🖼️ 档案图像质量检测</h2>
        <p class="page-desc">依据 DA/T 31-2017 标准，检测格式、分辨率、色彩、模糊、歪斜、黑边</p>
      </div>
      <el-button size="small" @click="showGuide = true">📖 使用说明</el-button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         区域1：检测配置（步骤一）
         ═════════════════════════════════════════════════════════════════ -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">1</span>
        <span>选择目录</span>
      </div>

      <el-form label-width="80px" label-position="left">
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
      </el-form>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         区域2：检测模式（步骤二）
         ═════════════════════════════════════════════════════════════════ -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">2</span>
        <span>检测模式</span>
      </div>

      <div class="preset-section">
        <div class="preset-label">检测模式</div>
        <div class="preset-buttons">
          <el-button
            :type="presetId === 'archive' ? 'primary' : 'default'"
            :plain="presetId !== 'archive'"
            @click="presetId = 'archive'"
            :disabled="running"
          >
            <span class="preset-btn-name">📦 保存级</span>
            <span class="preset-btn-desc">归档入库</span>
          </el-button>
          <el-button
            :type="presetId === 'access' ? 'primary' : 'default'"
            :plain="presetId !== 'access'"
            @click="presetId = 'access'"
            :disabled="running"
          >
            <span class="preset-btn-name">📖 利用级</span>
            <span class="preset-btn-desc">查阅利用</span>
          </el-button>
          <el-button
            :type="presetId === 'quick' ? 'primary' : 'default'"
            :plain="presetId !== 'quick'"
            @click="presetId = 'quick'"
            :disabled="running"
          >
            <span class="preset-btn-name">⚡ 快速筛查</span>
            <span class="preset-btn-desc">快速验收</span>
          </el-button>
        </div>
        <div class="preset-desc">{{ presetDescription }}</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         区域3：执行检测（步骤三）
         ══════════════════════════════════════════════════════════════════ -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">3</span>
        <span>执行检测</span>
      </div>

      <div class="action-row">
        <el-button
          type="success"
          size="large"
          :disabled="!canStart || running"
          :loading="running"
          @click="startDetection"
        >
          {{ running ? '检测中...' : '开始检测' }}
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
         区域4：检测结果
         ══════════════════════════════════════════════════════════════════ -->
    <div v-if="results.length > 0" class="wt-card result-card">
      <div class="step-title">
        <span class="step-badge result-badge">✓</span>
        <span>检测结果</span>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ results.length }}</div>
            <div class="stat-label">总数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-success">
            <div class="stat-value">{{ qualifiedCount }}</div>
            <div class="stat-label">合格</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-error">
            <div class="stat-value">{{ unqualifiedCount }}</div>
            <div class="stat-label">不合格</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ qualifiedRate }}%</div>
            <div class="stat-label">合格率</div>
          </div>
        </el-col>
      </el-row>

      <!-- 导出按钮 -->
      <div class="export-row">
        <span class="export-label">操作：</span>
        <el-button
          type="primary"
          :icon="Download"
          size="small"
          @click="exportReport"
          :disabled="exporting"
          :loading="exporting"
        >
          导出报告
        </el-button>
        <el-button
          :icon="FolderOpened"
          size="small"
          @click="openDir"
          :disabled="!dirPath"
        >
          打开目录
        </el-button>
        <el-button
          :icon="Delete"
          size="small"
          @click="resetResults"
        >
          清除结果
        </el-button>
      </div>

      <!-- 缩略图网格 -->
      <div class="thumbnail-grid">
        <div
          v-for="item in displayResults"
          :key="item.filePath"
          class="thumbnail-item"
          :class="{ 'is-unqualified': !item.isQualified, 'is-error': !!item.error }"
          @click="openImage(item.filePath)"
        >
          <div class="thumbnail-img">
            <img
              :src="(item.details.thumbnail as string) || ''"
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
            {{ item.score.toFixed(0) + '分' }}
          </span>
          <span v-if="item.error" class="thumbnail-error" :title="item.error">
            {{ item.error }}
          </span>
        </div>
      </div>
    </div>
    <!-- 使用说明对话框 -->
    <el-dialog v-model="showGuide" title="📖 使用说明 — 图像检测" width="650px">
      <div style="line-height: 1.8; font-size: 14px; color: #303133; padding: 0 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">一、功能概述</h3>
        <p style="margin: 0 0 16px 0; color: #595959;">批量检测图片质量，自动识别模糊、过暗、过亮等不合格图片，依据 DA/T 31-2017 标准输出评分与检测报告。</p>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">二、操作步骤</h3>
        <ol style="margin: 0 0 16px 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;"><strong>步骤1：</strong>选择图片目录 — 点击"浏览"选择包含待检测图片的文件夹，可勾选"包含子目录"递归扫描。</li>
          <li style="margin-bottom: 6px;"><strong>步骤2：</strong>选择检测模式 — 保存级（归档入库，全项检测）、利用级（查阅利用，基础检测）、快速筛查（仅格式和分辨率）。</li>
          <li style="margin-bottom: 6px;"><strong>步骤3：</strong>开始检测 — 点击"开始检测"，系统依次对每张图像进行格式、分辨率、色彩、模糊度、歪斜、黑边等多维度检测。</li>
          <li style="margin-bottom: 6px;"><strong>步骤4：</strong>查看检测结果 — 页面展示合格/不合格统计、合格率，缩略图网格展示每张图片的评分和检测结果。</li>
          <li style="margin-bottom: 6px;"><strong>步骤5：</strong>导出报告 — 点击"导出报告"生成检测报告，方便归档和反馈。</li>
        </ol>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">三、常见问题</h3>
        <ul style="margin: 0 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">支持格式：TIFF、JPEG、PNG、BMP、PDF 等常见图像格式</li>
          <li style="margin-bottom: 4px;">支持批量检测，自动遍历目录下所有图像文件</li>
          <li style="margin-bottom: 4px;">检测结果包含评分（0-100 分），低于阈值标记为不合格</li>
          <li style="margin-bottom: 4px;">保存级模式严格依据 DA/T 31-2017 纸质档案数字化技术规范</li>
          <li style="margin-bottom: 4px;">检测结果不理想时，可调整检测模式重新检测</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useAppStore } from '@/stores/app';
import { useTaskStore } from '@/stores/task';
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
const showGuide = ref(false);
const comparisonData = ref<ComparisonData[]>([]);
const appStore = useAppStore();
const taskStore = useTaskStore();

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
  // macOS/Linux: file:///path/to/file
  // Windows: file:///C:/path/to/file
  if (filePath.startsWith('/')) {
    return `file://${filePath}`;
  }
  return `file:///${filePath}`;
}

// Electron 环境下使用 IPC 获取图片的 base64 编码
async function getFileUrlSafe(filePath: string): Promise<string> {
  const api = getApi();
  if (api?.readFileAsBase64) {
    try {
      const base64 = await api.readFileAsBase64(filePath);
      const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        bmp: 'image/bmp',
        webp: 'image/webp',
        tiff: 'image/tiff',
        tif: 'image/tiff',
      };
      const mime = mimeTypes[ext] || 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    } catch {
      // 降级到 file:// 协议
      return getFileUrl(filePath);
    }
  }
  return getFileUrl(filePath);
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
      const rawResults = (runRes.results as DetectionResult[]) || [];
      progress.value.percent = 100;

      // 在 Electron 环境中，将图片路径转换为 base64 URL 以便显示
      if (api?.readFileAsBase64) {
        results.value = await Promise.all(
          rawResults.map(async (r) => {
            try {
              const base64 = await api.readFileAsBase64(r.filePath);
              const ext = r.filePath.split('.').pop()?.toLowerCase() || 'jpg';
              const mimeTypes: Record<string, string> = {
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                png: 'image/png',
                bmp: 'image/bmp',
                webp: 'image/webp',
                tiff: 'image/tiff',
                tif: 'image/tiff',
              };
              const mime = mimeTypes[ext] || 'image/jpeg';
              return {
                ...r,
                filePath: `data:${mime};base64,${base64}`,
              };
            } catch {
              return r;
            }
          })
        );
      } else {
        results.value = rawResults;
      }

      ElNotification({
        title: '检测完成',
        message: `共 ${results.value.length} 张图片：${qualifiedCount.value} 合格，${unqualifiedCount.value} 不合格`,
        type: unqualifiedCount.value > 0 ? 'warning' : 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `图像检测 - ${results.value.length}张图片`, module: '图像检测', status: unqualifiedCount.value > 0 ? 'completed' : 'completed' });
    } else if (!runRes.cancelled) {
      ElNotification({
        title: '检测失败',
        message: runRes.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `图像检测 - ${dirPath.value}`, module: '图像检测', status: 'failed', error: runRes.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '检测异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
    taskStore.addTask({ name: `图像检测 - ${dirPath.value}`, module: '图像检测', status: 'failed', error: err.message ?? String(err) });
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

      await api.writeFile({ filePath: jsonPath, content: JSON.stringify(report, null, 2) });
      await api.writeFile({ filePath: csvPath, content: csvContent });

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
  padding-top: 20px;
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

/* ─ 步骤卡片 ── */
.step-card {
  margin-bottom: 16px;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.step-badge.result-badge {
  background: #67c23a;
}

/* ── 文件输入 ── */
.input-with-btn {
  display: flex;
  gap: 8px;
  width: 100%;
}

.input-with-btn .el-input {
  flex: 1;
}

/* ── 预设模式 ── */
.preset-section {
  margin-bottom: 16px;
}

.preset-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
  font-weight: 500;
}

.preset-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.preset-buttons .el-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  min-width: 140px;
}

.preset-btn-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.preset-btn-desc {
  font-size: 12px;
  color: #909399;
}

.preset-desc {
  font-size: 13px;
  color: #909399;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  line-height: 1.5;
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

/* ── 结果卡片 ─ */
.result-card {
  margin-top: 16px;
}

/* ── 统计卡片 ── */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px 16px;
  text-align: center;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.stat-success {
  background: #f0f9eb;
}

.stat-card.stat-success .stat-value {
  color: #67c23a;
}

.stat-card.stat-error {
  background: #fef0f0;
}

.stat-card.stat-error .stat-value {
  color: #f56c6c;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 6px;
}

/* ── 导出行 ── */
.export-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 20px;
}

.export-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* ── 缩略图网格 ── */
.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.thumbnail-item {
  background: #fff;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
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
  word-break: break-all;
  white-space: normal;
  line-height: 1.4;
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

.thumbnail-error {
  display: block;
  padding: 2px 10px 8px;
  font-size: 11px;
  color: #f56c6c;
  word-break: break-all;
  white-space: normal;
  line-height: 1.4;
  /* 默认显示三行 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.thumbnail-error:hover {
  /* 鼠标悬停时显示全部 */
  overflow: visible;
  -webkit-line-clamp: unset;
  position: relative;
  z-index: 10;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>

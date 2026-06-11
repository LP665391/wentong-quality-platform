<template>
  <div class="module-page">
    <div class="page-header">
      <h2>📊 数据校验</h2>
      <p class="page-desc">对 Excel/CSV 文件进行格式、内容、逻辑校验，快速发现数据问题</p>
    </div>

    <!-- ── 步骤一：选择文件 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">1</span>
        <span>选择文件</span>
      </div>
      <el-form label-width="80px" label-position="left">
        <el-form-item label="校验文件">
          <div class="input-with-btn">
            <el-input
              v-model="filePath"
              placeholder="请选择待校验的 Excel/CSV 文件"
              readonly
              clearable
              @clear="filePath = ''"
            />
            <el-button type="primary" @click="selectFile" :disabled="validating">
              浏览
            </el-button>
            <el-button type="success" v-if="isBrowser" @click="loadDemoData" :disabled="validating" plain>
              🎯 加载演示数据
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="输出目录">
          <div class="input-with-btn">
            <el-input
              v-model="outputPath"
              placeholder="校验报告输出目录（可选）"
              readonly
              clearable
              @clear="outputPath = ''"
            />
            <el-button @click="selectOutput" :disabled="validating">浏览</el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- ── 步骤二：配置规则 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">2</span>
        <span>配置规则</span>
      </div>
      <el-form label-width="100px" label-position="left">
        <el-form-item label="校验规则">
          <el-select
            v-model="preset"
            placeholder="选择预设校验规则"
            :disabled="validating"
            style="width: 240px"
          >
            <el-option label="标准模式" value="standard">
              <div class="preset-option">
                <span class="preset-name">标准模式</span>
                <span class="preset-desc">必填检查 + 格式验证 + 范围检查</span>
              </div>
            </el-option>
            <el-option label="严格模式" value="strict">
              <div class="preset-option">
                <span class="preset-name">严格模式</span>
                <span class="preset-desc">全部 error 级别，更严格的数值范围</span>
              </div>
            </el-option>
            <el-option label="宽松模式" value="loose">
              <div class="preset-option">
                <span class="preset-name">宽松模式</span>
                <span class="preset-desc">仅检查必填字段，警告级别</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- ── 步骤三：执行校验 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">3</span>
        <span>执行校验</span>
      </div>
      <div class="action-row">
        <el-button
          type="success"
          size="large"
          :disabled="!canStart || validating"
          :loading="validating"
          @click="startValidation"
        >
          {{ validating ? '校验中...' : '开始校验' }}
        </el-button>
        <el-button
          type="danger"
          size="large"
          :disabled="!validating"
          @click="cancelValidation"
        >
          取消
        </el-button>
      </div>

      <!-- 进度条 -->
      <div v-if="validating || progressMessage" class="progress-section">
        <el-progress
          :percentage="progressPercent"
          :status="progressStatus === 'error' ? 'exception' : progressStatus === 'done' ? 'success' : undefined"
          :stroke-width="16"
          :text-inside="true"
        />
        <p class="progress-text">
          <el-tag
            :type="progressTagType"
            size="small"
            effect="plain"
          >
            {{ progressStatusText }}
          </el-tag>
          {{ progressMessage }}
        </p>
      </div>
    </div>

    <!-- ── 校验结果 ── -->
    <div v-if="report" class="wt-card result-card">
      <div class="step-title">
        <span class="step-badge result-badge">✓</span>
        <span>校验结果</span>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ report.totalRows }}</div>
            <div class="stat-label">数据行数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-error">
            <div class="stat-value">{{ report.totalErrors }}</div>
            <div class="stat-label">错误</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-warning">
            <div class="stat-value">{{ report.totalWarnings }}</div>
            <div class="stat-label">警告</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ formatDuration(report.duration) }}</div>
            <div class="stat-label">耗时</div>
          </div>
        </el-col>
      </el-row>

      <!-- 导出按钮 -->
      <div class="export-row">
        <span class="export-label">导出报告：</span>
        <el-button
          type="primary"
          :icon="Download"
          size="small"
          @click="exportReport('excel')"
          :disabled="exporting"
          :loading="exporting && exportFormat === 'excel'"
        >
          Excel
        </el-button>
        <el-button
          size="small"
          @click="exportReport('json')"
          :disabled="exporting"
          :loading="exporting && exportFormat === 'json'"
        >
          JSON
        </el-button>
        <el-button
          size="small"
          @click="exportReport('csv')"
          :disabled="exporting"
          :loading="exporting && exportFormat === 'csv'"
        >
          CSV
        </el-button>
      </div>

      <!-- 错误明细表格 -->
      <el-table
        :data="report.errors"
        stripe
        border
        max-height="480"
        style="width: 100%; margin-top: 16px"
        empty-text="🎉 未发现任何问题"
      >
        <el-table-column prop="rowNumber" label="行号" width="70" align="center" sortable />
        <el-table-column prop="fieldName" label="字段" width="120" />
        <el-table-column label="错误类型" width="130">
          <template #default="{ row }">
            <el-tag
              :type="row.severity === 'error' ? 'danger' : 'warning'"
              size="small"
              effect="dark"
            >
              {{ row.errorType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="当前值" width="160">
          <template #default="{ row }">
            <span class="cell-value">{{ formatValue(row.value) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="suggestion" label="建议" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.suggestion">{{ row.suggestion }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="严重程度" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.severity === 'error' ? 'danger' : 'warning'"
              size="small"
              effect="plain"
            >
              {{ row.severity === 'error' ? '错误' : '警告' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import { generateDemoCSV } from '@/utils/demo-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationProgress {
  current: number;
  total: number;
  percent: number;
  status: 'idle' | 'parsing' | 'validating' | 'reporting' | 'done' | 'error';
  message: string;
}

interface ValidationError {
  rowNumber: number;
  fieldName: string;
  errorType: string;
  description: string;
  suggestion?: string;
  severity: 'error' | 'warning';
  value: unknown;
}

interface ValidationReport {
  taskId: string;
  fileName: string;
  fileType: string;
  totalRows: number;
  totalErrors: number;
  totalWarnings: number;
  ruleResults: Array<{
    ruleType: string;
    ruleName: string;
    errorCount: number;
    warningCount: number;
  }>;
  errors: ValidationError[];
  duration: number;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const filePath = ref('');
const outputPath = ref('');
const preset = ref<'standard' | 'strict' | 'loose'>('standard');
const validating = ref(false);
const exporting = ref(false);
const isBrowser = computed(() => !(window as any).electronAPI && !(window as any).api);
const exportFormat = ref<'excel' | 'json' | 'csv' | ''>('');

const progressPercent = ref(0);
const progressStatus = ref<ValidationProgress['status']>('idle');
const progressMessage = ref('');

const taskId = ref('');
const report = ref<ValidationReport | null>(null);

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const canStart = computed(() => filePath.value.trim().length > 0 && preset.value.length > 0);

const progressTagType = computed(() => {
  switch (progressStatus.value) {
    case 'parsing':
    case 'validating':
    case 'reporting':
      return 'primary';
    case 'done':
      return 'success';
    case 'error':
      return 'danger';
    default:
      return 'info';
  }
});

const progressStatusText = computed(() => {
  const map: Record<string, string> = {
    idle: '空闲',
    parsing: '解析中',
    validating: '校验中',
    reporting: '生成报告',
    done: '完成',
    error: '错误',
  };
  return map[progressStatus.value] ?? progressStatus.value;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '（空）';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function selectFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) {
    // 浏览器环境静默，不弹窗
    return;
  }
  try {
    const files: string[] = await api.selectFile({
      filters: [
        { name: 'Excel/CSV 文件', extensions: ['xlsx', 'xls', 'csv'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (files && files.length > 0) {
      filePath.value = files[0];
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function selectOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    // 浏览器环境静默
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (dir) {
      outputPath.value = dir;
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function startValidation(): Promise<void> {
  if (!canStart.value) return;

  const api = getApi();
  
  // 演示模式：数据已加载，直接展示
  if (report.value) {
    ElMessage.info('演示数据已就绪，下方查看结果');
    return;
  }
  
  if (!api?.createValidatorTask) {
    ElMessage.warning('数据校验功能仅在桌面应用中可用');
    return;
  }

  try {
    validating.value = true;
    progressPercent.value = 0;
    progressStatus.value = 'idle';
    progressMessage.value = '正在创建校验任务...';
    report.value = null;

    // 1) 创建任务
    const createRes = await api.createValidatorTask({
      filePath: filePath.value,
      options: { preset: preset.value },
    });
    taskId.value = createRes.taskId;

    // 2) 监听进度
    let cleanupProgress: (() => void) | null = null;
    if (api.onValidatorProgress) {
      cleanupProgress = api.onValidatorProgress(
        (data: { taskId: string; progress: ValidationProgress }) => {
          if (data.taskId !== taskId.value) return;
          progressPercent.value = data.progress.percent;
          progressStatus.value = data.progress.status;
          progressMessage.value = data.progress.message;
        },
      );
    }

    // 3) 执行校验
    const runRes = await api.runValidator({
      taskId: taskId.value,
      filePath: filePath.value,
      preset: preset.value,
    });

    // 4) 清理进度监听
    if (cleanupProgress) cleanupProgress();

    if (runRes.success) {
      report.value = runRes.report as ValidationReport;
      ElNotification({
        title: '校验完成',
        message: `发现 ${report.value!.totalErrors} 个错误，${report.value!.totalWarnings} 个警告`,
        type: report.value!.totalErrors > 0 ? 'warning' : 'success',
        duration: 5000,
      });
    } else {
      ElNotification({
        title: '校验失败',
        message: runRes.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    ElNotification({
      title: '校验异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    validating.value = false;
  }
}

async function cancelValidation(): Promise<void> {
  const api = getApi();
  if (!api?.cancelValidator) {
    validating.value = false;
    return;
  }

  try {
    await api.cancelValidator({ taskId: taskId.value });
    ElMessage.info('已取消校验');
  } catch (err: any) {
    ElMessage.error(`取消失败：${err.message ?? err}`);
  } finally {
    validating.value = false;
  }
}

async function exportReport(format: 'excel' | 'json' | 'csv'): Promise<void> {
  if (!report.value) return;

  const api = getApi();

  // 1) 确定输出路径
  let outPath = outputPath.value;
  if (!outPath) {
    // 没有预设输出目录，尝试让用户选择
    if (api?.selectDirectory) {
      outPath = await api.selectDirectory();
      if (!outPath) return;
    } else {
      ElMessage.warning('请先在步骤一设置输出目录');
      return;
    }
  }

  const fileName = `${report.value.fileName.replace(/\.[^.]+$/, '')}_校验报告`;
  const extMap: Record<string, string> = { excel: '.xlsx', json: '.json', csv: '.csv' };
  const fullPath = `${outPath}/${fileName}${extMap[format]}`;

  exporting.value = true;
  exportFormat.value = format;

  try {
    if (api?.exportValidatorReport) {
      const res = await api.exportValidatorReport({
        taskId: taskId.value,
        format,
        outputPath: fullPath,
      });
      if (res.success) {
        ElNotification({
          title: '导出成功',
          message: `报告已保存至：${fullPath}`,
          type: 'success',
          duration: 5000,
        });
      } else {
        ElMessage.error(res.error ?? '导出失败');
      }
    } else {
      // 浏览器环境静默
    }
  } catch (err: any) {
    ElMessage.error(`导出失败：${err.message ?? err}`);
  } finally {
    exporting.value = false;
    exportFormat.value = '';
  }
}

// 演示模式：加载内置数据并模拟校验
function loadDemoData() {
  filePath.value = '📋 演示数据 (员工信息表)';
  
  // 模拟校验报告
  report.value = {
    taskId: 'demo-001',
    fileName: '员工信息表.csv',
    fileType: 'csv',
    totalRows: 10,
    totalErrors: 4,
    totalWarnings: 2,
    duration: 1250,
    completedAt: new Date().toISOString(),
    ruleResults: [
      { ruleType: 'required', ruleName: '必填校验', errorCount: 2, warningCount: 0 },
      { ruleType: 'format', ruleName: '格式校验', errorCount: 2, warningCount: 0 },
      { ruleType: 'range', ruleName: '范围校验', errorCount: 0, warningCount: 2 },
    ],
    errors: [
      { rowNumber: 3, fieldName: '年龄', errorType: '范围超限', description: '年龄 150 超出合理范围 [0, 120]', suggestion: '请输入有效年龄', severity: 'warning', value: '150' },
      { rowNumber: 3, fieldName: '邮箱', errorType: '格式错误', description: '邮箱格式不正确', suggestion: '请输入正确邮箱格式', severity: 'error', value: 'lisi@company' },
      { rowNumber: 4, fieldName: '姓名', errorType: '必填为空', description: '姓名为必填字段，不能为空', suggestion: '请填写姓名', severity: 'error', value: '' },
      { rowNumber: 5, fieldName: '手机', errorType: '格式错误', description: '手机号位数不正确', suggestion: '请输入11位手机号', severity: 'error', value: '138001380022' },
      { rowNumber: 7, fieldName: '姓名', errorType: '必填为空', description: '姓名为必填字段，不能为空', suggestion: '请填写姓名', severity: 'error', value: '' },
      { rowNumber: 8, fieldName: '状态', errorType: '枚举超限', description: '状态"未知"不在允许范围内', suggestion: '可选值：在职、离职', severity: 'warning', value: '未知' },
    ],
  };
  ElNotification({ title: '演示数据已加载', message: '包含 10 行员工信息，发现 4 个错误 + 2 个警告', type: 'success' });
}
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

/* ── 步骤卡片 ── */
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
  margin-bottom: 16px;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.result-badge {
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

/* ── 预设选项 ── */
.preset-option {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.preset-name {
  font-weight: 600;
  font-size: 14px;
}

.preset-desc {
  font-size: 12px;
  color: #909399;
}

/* ── 操作按钮 ── */
.action-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

/* ── 进度条 ── */
.progress-section {
  margin-top: 8px;
}

.progress-text {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── 结果 ── */
.result-card {
  margin-bottom: 24px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-card.stat-error {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-card.stat-error .stat-value {
  color: #f56c6c;
}

.stat-card.stat-warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.stat-card.stat-warning .stat-value {
  color: #e6a23c;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* ── 导出 ── */
.export-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 8px;
}

.export-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* ── 表格 ── */
.cell-value {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  color: #606266;
  word-break: break-all;
}
</style>

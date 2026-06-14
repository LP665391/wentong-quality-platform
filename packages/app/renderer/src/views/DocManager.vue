<template>
  <div class="module-page">
    <div class="page-header">
      <h2>📋 文档管理</h2>
      <p class="page-desc">从 Excel 表格自动提取指定字段，生成结构化数据</p>
    </div>

    <!-- ── 步骤一：选择文件 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">1</span>
        <span>选择文件</span>
      </div>
      <el-form label-width="80px" label-position="left">
        <el-form-item label="Excel 文件">
          <div class="input-with-btn">
            <el-input
              v-model="filePath"
              placeholder="请选择要解析的 Excel 文件"
              readonly
              clearable
              @clear="filePath = ''; result = null"
            />
            <el-button type="primary" @click="selectFile" :disabled="parsing">
              浏览
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- ── 步骤二：选择字段 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">2</span>
        <span>选择字段（{{ selectedCount }}/24）</span>
        <el-button size="small" text @click="selectAll">全选</el-button>
        <el-button size="small" text @click="deselectAll">取消全选</el-button>
      </div>
      <el-checkbox-group v-model="selectedFields" :disabled="parsing" class="fields-grid">
        <el-checkbox
          v-for="field in predefinedFields"
          :key="field.id"
          :value="field.id"
          :label="field.id"
          class="field-checkbox"
        >
          {{ field.name }}
        </el-checkbox>
      </el-checkbox-group>
    </div>

    <!-- ── 步骤三：执行解析 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">3</span>
        <span>执行解析</span>
      </div>
      <div class="action-row">
        <el-button
          type="success"
          size="large"
          :disabled="!filePath || selectedFields.length === 0 || parsing"
          :loading="parsing"
          @click="startParse"
        >
          {{ parsing ? '解析中...' : '开始处理' }}
        </el-button>
      </div>

      <!-- 进度 -->
      <div v-if="parsing || progressMessage" class="progress-section">
        <el-alert
          :type="progressType"
          :title="progressMessage"
          :closable="false"
          show-icon
        />
      </div>
    </div>

    <!-- ── 解析结果 ── -->
    <div v-if="result" class="wt-card result-card">
      <div class="step-title">
        <span class="step-badge result-badge">✓</span>
        <span>匹配结果</span>
      </div>

      <!-- 统计 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-value">{{ result.totalFields }}</div>
            <div class="stat-label">目标字段</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card stat-success">
            <div class="stat-value">{{ result.matchedFields }}</div>
            <div class="stat-label">匹配成功</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card stat-error">
            <div class="stat-value">{{ result.totalFields - result.matchedFields }}</div>
            <div class="stat-label">未匹配</div>
          </div>
        </el-col>
      </el-row>

      <!-- 导出按钮 -->
      <div class="export-row">
        <span class="export-label">导出结果：</span>
        <el-button type="primary" size="small" @click="exportJson"> JSON </el-button>
        <el-button size="small" @click="exportCsv"> CSV </el-button>
      </div>

      <!-- 字段匹配结果表格 -->
      <el-table
        :data="result.fields"
        stripe
        border
        max-height="480"
        style="width: 100%; margin-top: 16px"
        empty-text="无匹配结果"
      >
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column prop="name" label="字段名" width="120" />
        <el-table-column prop="value" label="提取值" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.value">{{ row.value }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="匹配状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.matched ? 'success' : 'danger'"
              size="small"
              effect="dark"
            >
              {{ row.matched ? '已匹配' : '未匹配' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useAppStore } from '@/stores/app';
import { generateDocParseResults } from '@/utils/demo-scenarios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocField {
  id: number;
  name: string;
  value: string;
  matched: boolean;
}

interface DocResult {
  fileName: string;
  fields: DocField[];
  totalFields: number;
  matchedFields: number;
}

interface PredefinedField {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// 24 个预定义字段
// ---------------------------------------------------------------------------

const predefinedFields: PredefinedField[] = [
  { id: 1,  name: '系统信息' },
  { id: 2,  name: '产品编号' },
  { id: 3,  name: '批次号' },
  { id: 4,  name: '生产日期' },
  { id: 5,  name: '有效期' },
  { id: 6,  name: '规格型号' },
  { id: 7,  name: '数量' },
  { id: 8,  name: '单位' },
  { id: 9,  name: '供应商' },
  { id: 10, name: '检验员' },
  { id: 11, name: '检验日期' },
  { id: 12, name: '检验结果' },
  { id: 13, name: '不合格项' },
  { id: 14, name: '处置方式' },
  { id: 15, name: '备注' },
  { id: 16, name: '文件编号' },
  { id: 17, name: '版本号' },
  { id: 18, name: '密级' },
  { id: 19, name: '归档日期' },
  { id: 20, name: '保管期限' },
  { id: 21, name: '存储位置' },
  { id: 22, name: '关联文档' },
  { id: 23, name: '审批人' },
  { id: 24, name: '审批状态' },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const filePath = ref('');
const parsing = ref(false);
const selectedFields = ref<number[]>(predefinedFields.map((f) => f.id));

const result = ref<DocResult | null>(null);
const progressMessage = ref('');
const progressType = ref<'info' | 'success' | 'warning' | 'error'>('info');
const appStore = useAppStore();

onMounted(() => {
  // 桌面版不自动加载演示数据
});

function loadDemoData() {
  filePath.value = '📋 2026年6月_供应商来料检验报告.xlsx';
  const demoResult = generateDocParseResults();
  // 将匹配结果转换为 DocField 格式
  const fields: DocField[] = predefinedFields.map((f) => {
    const match = demoResult.matches.find((m) => m.fieldId === f.id);
    return {
      id: f.id,
      name: f.name,
      value: match ? `行 ${match.fieldId} - ${match.headerName}` : '',
      matched: !!match,
    };
  });
  result.value = {
    fileName: '2026年6月_供应商来料检验报告.xlsx',
    fields,
    totalFields: demoResult.totalFields,
    matchedFields: demoResult.matchedFields,
  };
  ElNotification({
    title: '文档管理 · 演示数据已加载',
    message: `24 个预定义字段，成功匹配 ${demoResult.matchedFields} 个`,
    type: 'success',
  });
}

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const selectedCount = computed(() => selectedFields.value.length);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function selectAll(): void {
  selectedFields.value = predefinedFields.map((f) => f.id);
}

function deselectAll(): void {
  selectedFields.value = [];
}

async function selectFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) {
    ElMessage.warning('文件选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectFile({
      filters: [
        { name: 'Excel 文件', extensions: ['xlsx', 'xls'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (files && files.length > 0) {
      filePath.value = files[0];
      result.value = null;
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function startParse(): Promise<void> {
  if (!filePath.value || selectedFields.value.length === 0) return;

  const api = getApi();

  try {
    parsing.value = true;
    progressMessage.value = '正在解析 Excel 文件...';
    progressType.value = 'info';
    result.value = null;

    let res;
    if (api?.parseDocument) {
      res = await api.parseDocument({
        filePath: filePath.value,
        selectedFields: selectedFields.value,
      });
    } else {
      // 回退：直接 IPC invoke
      res = await (window as any).ipcRenderer?.invoke('doc:parse', {
        filePath: filePath.value,
        selectedFields: selectedFields.value,
      });
    }

    if (res?.success) {
      result.value = res.result;
      progressMessage.value = `解析完成：${res.result.matchedFields}/${res.result.totalFields} 字段匹配成功`;
      progressType.value = 'success';

      ElNotification({
        title: '解析完成',
        message: `${res.result.matchedFields}/${res.result.totalFields} 个字段匹配成功`,
        type: res.result.matchedFields === res.result.totalFields ? 'success' : 'warning',
        duration: 5000,
      });
    } else {
      progressMessage.value = res?.error ?? '解析失败';
      progressType.value = 'error';

      ElNotification({
        title: '解析失败',
        message: res?.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    progressMessage.value = err.message ?? String(err);
    progressType.value = 'error';

    ElNotification({
      title: '解析异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    parsing.value = false;
  }
}

// ---------------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------------

function exportJson(): void {
  if (!result.value) return;

  const json = JSON.stringify(result.value, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.value.fileName}.fields.json`;
  a.click();
  URL.revokeObjectURL(url);

  ElMessage.success('JSON 文件已下载');
}

function exportCsv(): void {
  if (!result.value) return;

  const rows: string[] = ['ID,字段名,提取值,匹配状态'];
  for (const field of result.value.fields) {
    const escapedValue = field.value.includes(',')
      ? `"${field.value.replace(/"/g, '""')}"`
      : field.value;
    rows.push(`${field.id},${field.name},${escapedValue},${field.matched ? '已匹配' : '未匹配'}`);
  }

  const csv = '\uFEFF' + rows.join('\n'); // BOM for Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.value.fileName}.fields.csv`;
  a.click();
  URL.revokeObjectURL(url);

  ElMessage.success('CSV 文件已下载');
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

.step-card {
  margin-bottom: 16px;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.result-badge {
  background: #52c41a;
}

.input-with-btn {
  display: flex;
  gap: 8px;
  width: 100%;
}

.input-with-btn .el-input {
  flex: 1;
}

.fields-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
}

.field-checkbox {
  width: 160px;
  margin-right: 0;
}

.action-row {
  display: flex;
  gap: 12px;
}

.progress-section {
  margin-top: 16px;
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  background: #f0f5ff;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-card.stat-success {
  background: #f6ffed;
}

.stat-card.stat-error {
  background: #fff1f0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 4px;
}

.export-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-label {
  font-size: 14px;
  color: #595959;
}
</style>

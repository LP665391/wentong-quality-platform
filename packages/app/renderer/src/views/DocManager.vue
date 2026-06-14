<template>
  <div class="module-page">
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>📋 文档管理</h2>
        <p class="page-desc">从 Excel 档案登记表提取著录信息，校验数据完整性，生成归档清单</p>
      </div>
      <el-button size="small" @click="showGuide = true">📖 使用说明</el-button>
    </div>

    <!-- 使用说明对话框 -->
    <el-dialog v-model="showGuide" title="📖 使用说明 — 文档管理" width="650px">
      <div style="line-height: 1.8; font-size: 14px; color: #303133; padding: 0 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">一、功能概述</h3>
        <p style="margin: 0 0 16px 0; color: #595959;">从 Excel 档案登记表提取著录信息，校验数据完整性，生成标准化归档清单。</p>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">二、操作步骤</h3>
        <ol style="margin: 0 0 16px 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;"><strong>选择文件：</strong>点击"浏览"选择 Excel 档案登记表（.xlsx/.xls）。</li>
          <li style="margin-bottom: 6px;"><strong>选择字段：</strong>勾选需要提取的 22 个档案著录字段，红色标记为必填项。</li>
          <li style="margin-bottom: 6px;"><strong>执行解析：</strong>点击"开始处理"，系统自动从 Excel 中匹配并提取字段值。</li>
          <li style="margin-bottom: 6px;"><strong>查看结果：</strong>检查匹配结果，确认必填字段完整后导出。</li>
          <li style="margin-bottom: 6px;"><strong>导出：</strong>支持导出 JSON / CSV / Excel 格式的档案登记表。</li>
        </ol>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">三、常见问题</h3>
        <ul style="margin: 0 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">支持格式：<strong>.xlsx、.xls</strong></li>
          <li style="margin-bottom: 4px;">必填字段（红色标记）建议全部匹配以确保著录完整</li>
          <li style="margin-bottom: 4px;">可导出 JSON / CSV / Excel 三种格式</li>
          <li style="margin-bottom: 4px;">包含 22 个标准档案著录字段，覆盖档号、全宗号、案卷号等</li>
        </ul>
      </div>
    </el-dialog>

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
        <span>选择字段（{{ selectedCount }}/{{ predefinedFields.length }}）</span>
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
          <el-tag v-if="requiredFieldIds.has(field.id)" size="small" type="danger" style="margin-left: 2px;">必填</el-tag>
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
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ result.totalFields }}</div>
            <div class="stat-label">目标字段</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-success">
            <div class="stat-value">{{ result.matchedFields }}</div>
            <div class="stat-label">匹配成功</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-error">
            <div class="stat-value">{{ result.totalFields - result.matchedFields }}</div>
            <div class="stat-label">未匹配</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card" :class="allRequiredMatched ? 'stat-success' : 'stat-error'">
            <div class="stat-value">{{ matchedRequiredCount }}/{{ totalRequiredCount }}</div>
            <div class="stat-label">必填字段匹配</div>
          </div>
        </el-col>
      </el-row>

      <!-- 校验结论 -->
      <el-alert
        v-if="result"
        :title="allRequiredMatched ? '✅ 必填字段全部匹配，著录信息完整' : '⚠️ 部分必填字段未匹配，请检查源文件'"
        :type="allRequiredMatched ? 'success' : 'warning'"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 导出按钮 -->
      <div class="export-row">
        <span class="export-label">导出结果：</span>
        <el-button type="primary" size="small" @click="exportJson"> JSON </el-button>
        <el-button size="small" @click="exportCsv"> CSV </el-button>
        <el-button type="success" size="small" @click="exportExcel"> 📊 Excel 档案登记表 </el-button>
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
import { useTaskStore } from '@/stores/task';
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
// 22 个档案著录标准字段
// ---------------------------------------------------------------------------

const predefinedFields: PredefinedField[] = [
  { id: 1,  name: '档号' },
  { id: 2,  name: '全宗号' },
  { id: 3,  name: '目录号' },
  { id: 4,  name: '案卷号' },
  { id: 5,  name: '件号' },
  { id: 6,  name: '责任者' },
  { id: 7,  name: '题名' },
  { id: 8,  name: '日期' },
  { id: 9,  name: '保管期限' },
  { id: 10, name: '密级' },
  { id: 11, name: '页数' },
  { id: 12, name: '载体类型' },
  { id: 13, name: '分类号' },
  { id: 14, name: '归档年度' },
  { id: 15, name: '归档日期' },
  { id: 16, name: '存放位置' },
  { id: 17, name: '文件格式' },
  { id: 18, name: '文件大小' },
  { id: 19, name: '扫描人' },
  { id: 20, name: '扫描日期' },
  { id: 21, name: '数字化状态' },
  { id: 22, name: '备注' },
];

// 必填字段ID（档号/全宗号/案卷号/件号/责任者/题名/日期/保管期限/页数）
const requiredFieldIds = new Set([1, 2, 4, 5, 6, 7, 8, 9, 11]);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const filePath = ref('');
const parsing = ref(false);
const selectedFields = ref<number[]>(predefinedFields.map((f) => f.id));
const showGuide = ref(false);

const result = ref<DocResult | null>(null);
const progressMessage = ref('');
const progressType = ref<'info' | 'success' | 'warning' | 'error'>('info');
const appStore = useAppStore();
const taskStore = useTaskStore();

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
    message: `${predefinedFields.length} 个档案著录字段，成功匹配 ${demoResult.matchedFields} 个`,
    type: 'success',
  });
}

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const selectedCount = computed(() => selectedFields.value.length);

const totalRequiredCount = computed(() =>
  predefinedFields.filter(f => requiredFieldIds.has(f.id)).length
);

const matchedRequiredCount = computed(() => {
  if (!result.value) return 0;
  return result.value.fields.filter(f => requiredFieldIds.has(f.id) && f.matched).length;
});

const allRequiredMatched = computed(() =>
  matchedRequiredCount.value === totalRequiredCount.value
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

function getFileName(filePath: string): string {
  return filePath.split(/[/\\\\]/).pop() ?? filePath;
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
        selectedFields: [...selectedFields.value],
      });
    } else {
      // 回退：直接 IPC invoke
      res = await (window as any).ipcRenderer?.invoke('doc:parse', {
        filePath: filePath.value,
        selectedFields: [...selectedFields.value],
      });
    }

    if (res?.success) {
      result.value = res.result;
      progressMessage.value = `解析完成：${res.result.matchedFields}/${res.result.totalFields} 字段匹配成功`;
      progressType.value = 'success';

      taskStore.addTask({ name: `文档解析 - ${getFileName(filePath.value)}`, module: '文档管理', status: 'completed' });
      ElNotification({
        title: '解析完成',
        message: `${res.result.matchedFields}/${res.result.totalFields} 个字段匹配成功`,
        type: res.result.matchedFields === res.result.totalFields ? 'success' : 'warning',
        duration: 5000,
      });
    } else {
      progressMessage.value = res?.error ?? '解析失败';
      progressType.value = 'error';

      taskStore.addTask({ name: `文档解析 - ${getFileName(filePath.value)}`, module: '文档管理', status: 'failed', error: res?.error ?? '未知错误' });
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

async function exportExcel(): Promise<void> {
  if (!result.value) return;

  try {
    // 动态加载 SheetJS
    const XLSX = await loadXlsx();
    const rows: any[][] = [['序号', '字段名', '提取值', '是否必填', '匹配状态']];
    result.value.fields.forEach((f, i) => {
      rows.push([i + 1, f.name, f.value, requiredFieldIds.has(f.id) ? '是' : '否', f.matched ? '已匹配' : '未匹配']);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '档案著录');
    XLSX.writeFile(wb, `${result.value.fileName}.archive-fields.xlsx`);

    ElMessage.success('Excel 档案登记表已导出');
  } catch {
    ElMessage.error('导出 Excel 失败，请确认网络连接后重试');
  }
}

async function loadXlsx(): Promise<any> {
  // 尝试从 CDN 加载
  const scripts = ['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'];
  for (const src of scripts) {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject();
        document.head.appendChild(s);
      });
      return (window as any).XLSX;
    } catch { continue; }
  }
  throw new Error('无法加载 SheetJS 库');
}
</script>

<style scoped>
.module-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 20px;
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

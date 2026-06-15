<template>
  <div class="module-page">
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>📊 数据校验</h2>
        <p class="page-desc">对 Excel/CSV 文件进行格式、内容、逻辑校验，快速发现数据问题</p>
      </div>
      <el-button size="small" @click="showGuide = true">📖 使用说明</el-button>
    </div>

    <!-- ── 步骤一：选择文件 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">1</span>
        <span>选择文件</span>
        <el-switch
          v-model="batchMode"
          active-text="批量模式"
          inactive-text="单文件"
          :disabled="validating"
          style="margin-left: auto;"
        />
      </div>
      
      <!-- 单文件模式 -->
      <el-form v-if="!batchMode" label-width="80px" label-position="left">
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
               加载演示数据
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
      
      <!-- 批量模式 -->
      <el-form v-else label-width="80px" label-position="left">
        <el-form-item label="校验文件">
          <div class="batch-file-list">
            <div v-if="batchFiles.length === 0" class="batch-empty">
              尚未选择文件
            </div>
            <div v-else class="batch-files">
              <div v-for="(file, index) in batchFiles" :key="index" class="batch-file-item">
                <el-icon><Document /></el-icon>
                <span class="file-name">{{ getFileName(file) }}</span>
                <el-button type="danger" link size="small" @click="removeBatchFile(index)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
          <div class="batch-actions">
            <el-button type="primary" @click="selectBatchFiles" :disabled="validating">
              选择文件
            </el-button>
            <el-button @click="clearBatchFiles" :disabled="validating || batchFiles.length === 0">
              清空
            </el-button>
            <span v-if="batchFiles.length > 0" class="batch-count">
              已选择 {{ batchFiles.length }} 个文件
            </span>
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
      
      <!-- 档案模板选择 -->
      <div class="template-section">
        <div class="template-label">档案模板</div>
        <div class="template-buttons">
          <el-button
            v-for="(template, key) in archiveTemplates"
            :key="key"
            :type="selectedTemplate === key ? 'primary' : 'default'"
            :plain="selectedTemplate !== key"
            @click="selectTemplate(key as ArchiveTemplate)"
            :disabled="validating"
            class="template-btn"
          >
            <span class="template-icon">{{ template.icon }}</span>
            <span class="template-name">{{ template.name }}</span>
          </el-button>
        </div>
        <div v-if="selectedTemplate !== 'custom'" class="template-desc">
          {{ archiveTemplates[selectedTemplate].description }}
        </div>
      </div>

      <!-- 校验模式选择 -->
      <div class="preset-section">
        <div class="preset-label">校验模式</div>
        <div class="preset-buttons">
          <el-button
            :type="preset === 'loose' ? 'primary' : 'default'"
            :plain="preset !== 'loose'"
            @click="preset = 'loose'"
            :disabled="validating"
          >
            <span class="preset-btn-name">宽松模式</span>
            <span class="preset-btn-desc">收上来就行</span>
          </el-button>
          <el-button
            :type="preset === 'standard' ? 'primary' : 'default'"
            :plain="preset !== 'standard'"
            @click="preset = 'standard'"
            :disabled="validating"
          >
            <span class="preset-btn-name">标准模式</span>
            <span class="preset-btn-desc">符合国标</span>
          </el-button>
          <el-button
            :type="preset === 'strict' ? 'primary' : 'default'"
            :plain="preset !== 'strict'"
            @click="preset = 'strict'"
            :disabled="validating"
          >
            <span class="preset-btn-name">严格模式</span>
            <span class="preset-btn-desc">进馆审查</span>
          </el-button>
        </div>
      </div>

      <!-- 智能推荐提示 -->
      <div v-if="recommendedPreset && recommendedPreset !== preset" class="recommend-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>根据文件特征，推荐使用 <strong>{{ getPresetLabel(recommendedPreset) }}</strong></span>
        <el-button type="primary" link size="small" @click="preset = recommendedPreset">
          切换
        </el-button>
      </div>
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

    <!-- ── 批量校验结果汇总 ── -->
    <div v-if="batchMode && batchReports.size > 0" class="wt-card result-card">
      <div class="step-title">
        <span class="step-badge result-badge">📊</span>
        <span>批量校验汇总</span>
      </div>

      <!-- 汇总统计 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ batchReports.size }}</div>
            <div class="stat-label">校验文件数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-success">
            <div class="stat-value">{{ batchPassCount }}</div>
            <div class="stat-label">可入库</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-warning">
            <div class="stat-value">{{ batchWarningCount }}</div>
            <div class="stat-label">需整改</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-error">
            <div class="stat-value">{{ batchFailCount }}</div>
            <div class="stat-label">需返工</div>
          </div>
        </el-col>
      </el-row>

      <!-- 文件列表 -->
      <div class="batch-result-list">
        <div v-for="[filePath, report] in Array.from(batchReports)" :key="filePath" class="batch-result-item">
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ getFileName(filePath) }}</span>
          <el-tag
            :type="report.grade === 'pass' ? 'success' : report.grade === 'warning' ? 'warning' : 'danger'"
            size="small"
            effect="dark"
          >
            {{ report.gradeLabel }}
          </el-tag>
          <span class="file-stats">
            {{ report.totalErrors }} 错误 / {{ report.totalWarnings }} 警告
          </span>
        </div>
      </div>
    </div>

    <!-- ── 校验结果 ── -->
    <div v-if="report && !batchMode" class="wt-card result-card">
      <div class="step-title">
        <span class="step-badge result-badge">✓</span>
        <span>校验结果</span>
        <!-- 报告等级标签 -->
        <el-tag
          :type="gradeTagType"
          size="large"
          effect="dark"
          class="grade-tag"
        >
          {{ report.gradeLabel }}
        </el-tag>
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
        :data="paginatedErrors"
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
              {{ getErrorTypeLabel(row.errorType) }}
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

      <!-- 分页控件 -->
      <div v-if="report && report.errors.length > 10" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="report.errors.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 报告预览弹窗（演示模式） -->
    <div v-if="showReportPreview && report" class="report-preview-overlay" @click.self="showReportPreview = false">
      <div class="report-preview-card">
        <h3>📋 质检报告预览</h3>
        <div class="preview-stats">
          <div class="preview-stat">
            <div class="preview-stat__value">{{ report.totalRows }}</div>
            <div class="preview-stat__label">数据行数</div>
          </div>
          <div class="preview-stat">
            <div class="preview-stat__value preview-stat__value--error">{{ report.totalErrors }}</div>
            <div class="preview-stat__label">错误</div>
          </div>
          <div class="preview-stat">
            <div class="preview-stat__value preview-stat__value--warning">{{ report.totalWarnings }}</div>
            <div class="preview-stat__label">警告</div>
          </div>
          <div class="preview-stat">
            <div class="preview-stat__value">{{ formatDuration(report.duration) }}</div>
            <div class="preview-stat__label">耗时</div>
          </div>
        </div>
        <div class="preview-sample">
          <div class="preview-sample__header">错误明细（前 4 条）</div>
          <table class="preview-sample__table">
            <thead>
              <tr><th>行号</th><th>字段</th><th>问题描述</th><th>建议</th><th>严重程度</th></tr>
            </thead>
            <tbody>
              <tr v-for="(err, i) in report.errors.slice(0, 4)" :key="i"
                  :class="err.severity === 'error' ? 'row-error' : 'row-warning'">
                <td>{{ err.rowNumber }}</td>
                <td>{{ err.fieldName }}</td>
                <td>{{ err.description }}</td>
                <td>{{ err.suggestion || '—' }}</td>
                <td>{{ err.severity === 'error' ? '🔴 错误' : '🟡 警告' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="preview-footer">
          Ai 质检系统生成 · {{ new Date().toLocaleDateString('zh-CN') }} · 页脚含防伪水印
        </div>
        <div style="text-align: center; margin-top: 16px">
          <el-button type="primary" @click="showReportPreview = false">关闭预览</el-button>
        </div>
      </div>
    </div>
    <!-- 使用说明对话框 -->
    <el-dialog v-model="showGuide" title="📖 使用说明 — 数据校验" width="650px">
      <div style="line-height: 1.8; font-size: 14px; color: #303133; padding: 0 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">一、功能概述</h3>
        <p style="margin: 0 0 16px 0; color: #595959;">对 Excel/CSV 文件进行格式、内容、逻辑校验，确保数据符合规范，快速发现数据问题。</p>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">二、操作步骤</h3>
        <ol style="margin: 0 0 16px 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;"><strong>步骤1：</strong>选择文件 — 点击"浏览"选择待校验的 Excel/CSV 文件，支持单文件和批量模式。</li>
          <li style="margin-bottom: 6px;"><strong>步骤2：</strong>选择模板/配置规则 — 根据文件类型选择档案模板和校验模式（宽松/标准/严格）。</li>
          <li style="margin-bottom: 6px;"><strong>步骤3：</strong>开始校验 — 点击"开始校验"，系统自动解析文件并逐行逐列校验。</li>
          <li style="margin-bottom: 6px;"><strong>步骤4：</strong>查看结果 — 查看通过/失败统计，错误明细表格列出每一条问题的行号、字段、描述和建议。</li>
          <li style="margin-bottom: 6px;"><strong>步骤5：</strong>导出报告 — 点击 Excel/JSON/CSV 按钮导出校验报告，方便存档或反馈。</li>
        </ol>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">三、常见问题</h3>
        <ul style="margin: 0 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">支持格式：<strong>.xlsx、.xls、.csv</strong></li>
          <li style="margin-bottom: 4px;">单次最大支持 <strong>10 万行</strong> 数据</li>
          <li style="margin-bottom: 4px;">校验报告可导出为 Excel / JSON / CSV 三种格式</li>
          <li style="margin-bottom: 4px;">批量模式下可一次校验多个文件，汇总查看整体通过率</li>
          <li style="margin-bottom: 4px;">如遇大文件，建议先选宽松模式快速筛查，再用标准模式详细校验</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Download, Monitor, User, InfoFilled, Document, Close } from '@element-plus/icons-vue';
import { useAppStore } from '@/stores/app';
import { useTaskStore } from '@/stores/task';
import { type ComparisonData, generateSupplierQCReport } from '@/utils/demo-scenarios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// 档案模板类型
type ArchiveTemplate = 'document' | 'accounting' | 'photo' | 'custom';

interface ArchiveTemplateConfig {
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  icon: string;
}

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
  grade?: 'pass' | 'warning' | 'fail';
  gradeLabel?: string;
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

// 批量校验相关
const batchMode = ref(false);
const batchFiles = ref<string[]>([]);
const batchReports = ref<Map<string, ValidationReport>>(new Map());
const batchProgress = ref<{ current: number; total: number; fileName: string }>({
  current: 0,
  total: 0,
  fileName: '',
});

const progressPercent = ref(0);
const progressStatus = ref<ValidationProgress['status']>('idle');
const progressMessage = ref('');

const taskId = ref('');
const report = ref<ValidationReport | null>(null);
const showReportPreview = ref(false);
const showGuide = ref(false);
const appStore = useAppStore();
const taskStore = useTaskStore();

// 分页相关
const currentPage = ref(1);
const pageSize = ref(10);

// 档案模板相关
const selectedTemplate = ref<ArchiveTemplate>('document');

// 档案模板配置
const archiveTemplates: Record<ArchiveTemplate, ArchiveTemplateConfig> = {
  document: {
    name: '文书档案',
    description: '适用于党政机关文书档案，符合 DA/T 22-2022 标准',
    requiredFields: ['档号', '题名', '责任者', '成文日期', '保管期限'],
    optionalFields: ['密级', '页数', '载体类型', '附注', '主题词'],
    icon: '📄',
  },
  accounting: {
    name: '会计档案',
    description: '适用于会计凭证、账簿、报表等会计档案',
    requiredFields: ['凭证号', '日期', '金额', '摘要', '会计科目'],
    optionalFields: ['附件数', '制单人', '审核人', '记账人'],
    icon: '💰',
  },
  photo: {
    name: '照片档案',
    description: '适用于数码照片、胶片照片等影像档案',
    requiredFields: ['照片号', '拍摄时间', '摄影者', '题名'],
    optionalFields: ['地点', '说明', '尺寸', '载体类型', '保管期限'],
    icon: '📷',
  },
  custom: {
    name: '自定义',
    description: '根据文件表头自动识别字段',
    requiredFields: [],
    optionalFields: [],
    icon: '⚙️',
  },
};

// 选择模板
function selectTemplate(template: ArchiveTemplate) {
  selectedTemplate.value = template;
  // 根据模板自动推荐校验模式
  if (template === 'document') {
    preset.value = 'standard';
  } else if (template === 'accounting') {
    preset.value = 'strict';
  } else if (template === 'photo') {
    preset.value = 'standard';
  }
}

// 错误类型中文标签映射
const errorTypeLabels: Record<string, string> = {
  // 通用错误
  not_a_number: '非数字',
  number_out_of_range: '数值超范围',
  enum_out_of_range: '枚举值超范围',
  length_out_of_range: '长度超范围',
  column_not_found: '列未找到',
  required: '必填缺失',
  unknown_format: '未知格式',
  format_mismatch: '格式不匹配',
  // 档案业务错误
  date_future: '日期超范围',
  date_too_old: '日期过早',
  archive_code_invalid: '档号格式错误',
  responsible_person_invalid: '责任者格式错误',
  pages_out_of_range: '页数超范围',
  duplicate_archive_code: '档号重复',
};

function getErrorTypeLabel(type: string): string {
  return errorTypeLabels[type] ?? type;
}

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const canStart = computed(() => {
  if (batchMode.value) {
    return batchFiles.value.length > 0 && preset.value.length > 0;
  }
  return filePath.value.trim().length > 0 && preset.value.length > 0;
});

// 批量校验统计
const batchPassCount = computed(() => {
  let count = 0;
  batchReports.value.forEach(report => {
    if (report.grade === 'pass') count++;
  });
  return count;
});

const batchWarningCount = computed(() => {
  let count = 0;
  batchReports.value.forEach(report => {
    if (report.grade === 'warning') count++;
  });
  return count;
});

const batchFailCount = computed(() => {
  let count = 0;
  batchReports.value.forEach(report => {
    if (report.grade === 'fail') count++;
  });
  return count;
});

// 智能推荐模式
const recommendedPreset = computed(() => {
  const fileName = filePath.value.toLowerCase();
  
  // 文件名包含"进馆"或"终审"关键词 → 严格模式
  if (fileName.includes('进馆') || fileName.includes('终审') || fileName.includes('final')) {
    return 'strict';
  }
  
  // 文件名包含"移交"或"初步"关键词 → 宽松模式
  if (fileName.includes('移交') || fileName.includes('初步') || fileName.includes('draft')) {
    return 'loose';
  }
  
  // 包含档号字段的文件 → 标准模式
  if (fileName.includes('档号') || fileName.includes('档案')) {
    return 'standard';
  }
  
  // 默认推荐标准模式
  return 'standard';
});

// 获取模式标签
function getPresetLabel(preset: string): string {
  const labels: Record<string, string> = {
    loose: '宽松模式',
    standard: '标准模式',
    strict: '严格模式',
  };
  return labels[preset] ?? preset;
}

// 分页后的错误数据
const paginatedErrors = computed(() => {
  if (!report.value) return [];
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return report.value.errors.slice(start, end);
});

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

// 报告等级标签类型
const gradeTagType = computed(() => {
  if (!report.value) return 'info';
  switch (report.value.grade) {
    case 'pass':
      return 'success';
    case 'warning':
      return 'warning';
    case 'fail':
      return 'danger';
    default:
      return 'info';
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

// 分页事件处理
function handleSizeChange(val: number) {
  pageSize.value = val;
  currentPage.value = 1; // 切换每页条数时重置到第一页
}

function handleCurrentChange(val: number) {
  currentPage.value = val;
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

// 批量校验相关方法
async function selectBatchFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectMultipleFiles) {
    ElMessage.warning('批量选择文件功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectMultipleFiles({
      filters: [
        { name: 'Excel/CSV 文件', extensions: ['xlsx', 'xls', 'csv'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (files && files.length > 0) {
      // 追加到已有列表，去重
      const newFiles = files.filter(f => !batchFiles.value.includes(f));
      batchFiles.value = [...batchFiles.value, ...newFiles];
      ElMessage.success(`已添加 ${newFiles.length} 个文件`);
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeBatchFile(index: number): void {
  batchFiles.value.splice(index, 1);
}

function clearBatchFiles(): void {
  batchFiles.value = [];
  batchReports.value.clear();
}

function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

async function startBatchValidation(): Promise<void> {
  if (batchFiles.value.length === 0) {
    ElMessage.warning('请先选择要校验的文件');
    return;
  }

  const api = getApi();
  if (!api?.createValidatorTask || !api?.runValidator) {
    ElMessage.warning('数据校验功能仅在桌面应用中可用');
    return;
  }

  validating.value = true;
  batchReports.value.clear();
  batchProgress.value = { current: 0, total: batchFiles.value.length, fileName: '' };

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batchFiles.value.length; i++) {
    const file = batchFiles.value[i];
    batchProgress.value.current = i + 1;
    batchProgress.value.fileName = getFileName(file);
    progressMessage.value = `正在校验 (${i + 1}/${batchFiles.value.length}): ${getFileName(file)}`;

    try {
      // 创建任务
      const createRes = await api.createValidatorTask({
        filePath: file,
        options: { preset: preset.value },
      });
      const currentTaskId = createRes.taskId;

      // 执行校验
      const runRes = await api.runValidator({
        taskId: currentTaskId,
        filePath: file,
        preset: preset.value,
      });

      if (runRes.success && runRes.report) {
        batchReports.value.set(file, runRes.report as ValidationReport);
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err: any) {
      console.error(`校验文件失败: ${file}`, err);
      errorCount++;
    }
  }

  validating.value = false;
  progressMessage.value = '';

  // 显示汇总结果
  taskStore.addTask({ name: `数据校验 - ${batchFiles.value.length}个文件`, module: '数据校验', status: errorCount > 0 ? 'failed' : 'completed', error: errorCount > 0 ? `${errorCount}个文件校验失败` : undefined });
  ElNotification({
    title: '批量校验完成',
    message: `共 ${batchFiles.value.length} 个文件，成功 ${successCount} 个，失败 ${errorCount} 个`,
    type: errorCount > 0 ? 'warning' : 'success',
    duration: 5000,
  });

  // 如果有成功的报告，显示第一个
  if (batchReports.value.size > 0) {
    const firstReport = batchReports.value.values().next().value;
    if (firstReport) {
      report.value = firstReport;
    }
  }
}

async function startValidation(): Promise<void> {
  // 如果是批量模式，调用批量校验
  if (batchMode.value) {
    return startBatchValidation();
  }

  if (!canStart.value) return;

  const api = getApi();
  
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
      // 立即结束校验状态，避免按钮卡在"校验中..."
      validating.value = false;
      await nextTick(); // 确保 DOM 更新完成
      taskStore.addTask({ name: `数据校验 - ${getFileName(filePath.value)}`, module: '数据校验', status: 'completed' });
      ElNotification({
        title: '校验完成',
        message: `发现 ${report.value!.totalErrors} 个错误，${report.value!.totalWarnings} 个警告`,
        type: report.value!.totalErrors > 0 ? 'warning' : 'success',
        duration: 5000,
      });
    } else {
      validating.value = false;
      await nextTick();
      taskStore.addTask({ name: `数据校验 - ${getFileName(filePath.value)}`, module: '数据校验', status: 'failed', error: runRes.error ?? '未知错误' });
      ElNotification({
        title: '校验失败',
        message: runRes.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    validating.value = false;
    await nextTick();
    ElNotification({
      title: '校验异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
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

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

onMounted(() => {
  // 桌面版不自动加载演示数据
});

// ---------------------------------------------------------------------------
// 演示模式：加载内置数据并模拟校验
// ---------------------------------------------------------------------------

function loadDemoData() {
  filePath.value = '📋 2026年 6 月_供应商来料检验报告.xlsx';
  preset.value = 'standard';
  report.value = generateSupplierQCReport() as ValidationReport;
  ElNotification({
    title: '供应商来料质检 · 演示数据已加载',
    message: `50 行数据，发现 ${report.value.totalErrors} 个错误 + ${report.value.totalWarnings} 个警告`,
    type: 'success',
  });
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

.grade-tag {
  margin-left: auto;
  font-size: 14px;
  padding: 6px 16px;
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

/* ── 预设模式按钮 ─ */
.preset-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preset-buttons .el-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px 20px;
  height: auto;
  min-width: 160px;
}

.preset-btn-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.preset-btn-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 2px;
}

/* ── 档案模板选择 ── */
.template-section {
  margin-bottom: 20px;
}

.template-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 10px;
}

.template-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.template-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-width: 120px;
}

.template-icon {
  font-size: 18px;
}

.template-name {
  font-size: 14px;
}

.template-desc {
  margin-top: 10px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #909399;
}

/* ── 批量文件选择 ── */
.batch-file-list {
  margin-bottom: 12px;
}

.batch-empty {
  padding: 20px;
  text-align: center;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
}

.batch-files {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.batch-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.batch-file-item:last-child {
  border-bottom: none;
}

.batch-file-item .file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-count {
  font-size: 13px;
  color: #909399;
}

/* ── 批量校验结果 ── */
.batch-result-list {
  margin-top: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.batch-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.batch-result-item:last-child {
  border-bottom: none;
}

.batch-result-item .file-name {
  flex: 1;
  font-size: 14px;
  color: #303133;
}

.batch-result-item .file-stats {
  font-size: 12px;
  color: #909399;
}

.stat-success .stat-value {
  color: #67c23a;
}

/* ── 校验模式选择 ── */
.preset-section {
  margin-bottom: 16px;
}

.preset-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 10px;
}

.recommend-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 16px;
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  font-size: 13px;
  color: #409eff;
}

.recommend-tip .el-icon {
  font-size: 16px;
}

.recommend-tip strong {
  color: #409eff;
  font-weight: 600;
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

/* ── 对比面板 ── */
.comparison-section {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.comparison-header {
  background: #f5f7fa;
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  user-select: none;
}

.comparison-header:hover {
  background: #ebeef5;
}

.comparison-toggle {
  color: #909399;
  font-size: 12px;
}

.comparison-body {
  padding: 12px 16px;
}

.comparison-row {
  display: flex;
  border-bottom: 1px solid #f2f3f5;
  padding: 8px 0;
}

.comparison-row:last-child {
  border-bottom: none;
}

.comparison-row--header {
  font-weight: 600;
  color: #303133;
  border-bottom: 2px solid #dcdfe6;
  padding-bottom: 10px;
}

.comparison-cell {
  flex: 1;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
}

.comparison-cell--label {
  font-weight: 500;
  color: #303133;
  max-width: 120px;
}

.comparison-cell--manual {
  color: #909399;
}

.comparison-cell--ai {
  color: #303133;
}

.comparison-cell--better {
  color: #67c23a;
  font-weight: 500;
}

.comparison-check {
  color: #67c23a;
  margin-left: 4px;
}

/* ── 报告预览弹窗 ── */
.report-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-preview-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.report-preview-card h3 {
  font-size: 20px;
  color: #1d2129;
  margin-bottom: 20px;
  text-align: center;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.preview-stat {
  text-align: center;
  padding: 16px 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.preview-stat__value {
  font-size: 24px;
  font-weight: 700;
  color: #1d2129;
}

.preview-stat__value--error {
  color: #f56c6c;
}

.preview-stat__value--warning {
  color: #e6a23c;
}

.preview-stat__label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.preview-sample {
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.preview-sample__header {
  background: #1677ff;
  color: #fff;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
}

.preview-sample__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.preview-sample__table th {
  background: #f0f2f5;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: #303133;
  border-bottom: 2px solid #dcdfe6;
}

.preview-sample__table td {
  padding: 6px 12px;
  border-bottom: 1px solid #f2f3f5;
  color: #606266;
}

.preview-sample__table tr.row-error td {
  background: #fef0f0;
}

.preview-sample__table tr.row-warning td {
  background: #fdf6ec;
}

.preview-footer {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

/* ── 分页控件 ── */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding: 12px 0;
}
</style>

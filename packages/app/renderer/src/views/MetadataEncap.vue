<template>
  <div class="module-page">
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>🏷️ 元数据封装</h2>
        <p class="page-desc">提取文件元数据，通过模板批量注入自定义属性，支持档案管理场景</p>
      </div>
      <el-button size="small" @click="showGuide = true">📖 使用说明</el-button>
    </div>

    <!-- ════ 使用说明对话框 ════ -->
    <el-dialog v-model="showGuide" title="📖 使用说明 — 元数据封装" width="650px">
      <div style="line-height: 1.8; font-size: 14px; color: #303133; padding: 0 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">一、功能概述</h3>
        <p style="margin: 0 0 16px 0; color: #595959;">提取文件元数据，通过模板批量注入自定义属性（侧边栏 sidecar .json 或 PDF 文档属性），支持档案管理场景。</p>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">二、操作步骤</h3>
        <ol style="margin: 0 0 16px 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;"><strong>提取元数据：</strong>选择文件，点击"提取元数据"查看基础属性（文件名、大小、类型、时间等）。</li>
          <li style="margin-bottom: 6px;"><strong>选择模板：</strong>从模板下拉框中选择通用/图片/文档/档案模板，系统自动加载对应属性字段。</li>
          <li style="margin-bottom: 6px;"><strong>填写属性：</strong>在属性编辑区填写档号、保管期限、密级等自定义属性值。</li>
          <li style="margin-bottom: 6px;"><strong>执行注入：</strong>选择写入方式（Sidecar .json 或 PDF 文档属性），点击"执行注入"。</li>
          <li style="margin-bottom: 6px;"><strong>导出结果：</strong>导出 JSON 或 Excel 档案登记表，也可复制到剪贴板。</li>
        </ol>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">三、常见问题</h3>
        <ul style="margin: 0 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">支持档案模板，包含档号、全宗号、案卷号、保管期限、密级等标准化字段</li>
          <li style="margin-bottom: 4px;">PDF 文件可选择将元数据直接写入文档属性（Title/Author/Subject/Keywords）</li>
          <li style="margin-bottom: 4px;">导出的 Excel 档案登记表可直接用于档案管理系统导入</li>
          <li style="margin-bottom: 4px;">单文件与批量模式互不影响，可独立使用</li>
        </ul>
      </div>
    </el-dialog>

    <!-- ════ Tab 标签页 ════ -->
    <el-tabs v-model="activeTab" type="card" class="metadata-tabs">

      <!-- ── Tab 1: 📄 单文件 ── -->
      <el-tab-pane label="📄 单文件" name="single">
        <!-- 步骤 1：选择文件并提取元数据 -->
        <div class="wt-card step-card">
          <div class="step-title">
            <span class="step-badge">1</span>
            <span>提取元数据</span>
          </div>
          <el-form label-width="80px" label-position="left">
            <el-form-item label="目标文件">
              <div class="input-with-btn">
                <el-input
                  v-model="filePath"
                  placeholder="请选择要提取元数据的文件"
                  readonly
                  clearable
                  @clear="filePath = ''; metadata = null"
                />
                <el-button type="primary" @click="selectFile" :disabled="extracting">
                  浏览
                </el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="success"
                :disabled="!filePath || extracting"
                :loading="extracting"
                @click="extractAction"
              >
                {{ extracting ? '提取中...' : '提取元数据' }}
              </el-button>
            </el-form-item>
          </el-form>
          <div v-if="metadata" class="result-section">
            <el-table :data="metadataRows" stripe border style="width: 100%" max-height="400">
              <el-table-column prop="name" label="属性名" width="200" />
              <el-table-column prop="value" label="属性值" />
            </el-table>
          </div>
        </div>

        <!-- 步骤 2：选择模板并注入 -->
        <div class="wt-card step-card">
          <div class="step-title">
            <span class="step-badge">2</span>
            <span>注入元数据</span>
          </div>
          <el-alert
            v-if="metadata"
            title="单文件模式"
            description="将对当前提取的文件注入元数据"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 12px"
          />
          <el-form label-width="80px" label-position="left">
            <el-form-item label="选择模板">
              <el-select
                v-model="selectedTemplateId"
                placeholder="选择元数据模板"
                :disabled="injecting"
                style="width: 240px"
                @change="onTemplateChange"
              >
                <el-option
                  v-for="tmpl in templates"
                  :key="tmpl.id"
                  :label="tmpl.name"
                  :value="tmpl.id"
                />
              </el-select>
              <span v-if="selectedTemplateId" style="margin-left: 10px; font-size: 12px; color: #8c8c8c">
                {{ templates.find(t => t.id === selectedTemplateId)?.description }}
              </span>
            </el-form-item>
            <el-form-item v-if="editProperties.length > 0" label="属性编辑">
              <div class="properties-editor">
                <div
                  v-for="(prop, index) in editProperties"
                  :key="prop.key"
                  class="property-row"
                >
                  <span class="property-key">{{ getPropLabel(prop.key) }}</span>
                  <el-input
                    v-model="prop.value"
                    :placeholder="getPropPlaceholder(prop.key)"
                    :disabled="injecting"
                    size="small"
                    style="flex: 1"
                  />
                  <el-select
                    v-if="prop.key === 'retentionPeriod'"
                    v-model="prop.value"
                    :disabled="injecting"
                    size="small"
                    style="width: 120px"
                  >
                    <el-option label="永久" value="永久" />
                    <el-option label="30年" value="30年" />
                    <el-option label="10年" value="10年" />
                  </el-select>
                  <el-select
                    v-if="prop.key === 'securityLevel'"
                    v-model="prop.value"
                    :disabled="injecting"
                    size="small"
                    style="width: 120px"
                  >
                    <el-option label="内部" value="内部" />
                    <el-option label="秘密" value="秘密" />
                    <el-option label="机密" value="机密" />
                    <el-option label="绝密" value="绝密" />
                  </el-select>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="写入方式">
              <el-radio-group v-model="injectMode" :disabled="injecting">
                <el-radio label="sidecar">Sidecar (.json)</el-radio>
                <el-radio label="pdf-props">PDF 文档属性</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input
                  v-model="outputPath"
                  placeholder="sidecar 输出路径（可选，默认与源文件同目录）"
                  readonly
                  clearable
                  @clear="outputPath = ''"
                />
                <el-button @click="selectOutput" :disabled="injecting">浏览</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :disabled="!selectedTemplateId || !filePath || injecting"
                :loading="injecting"
                @click="injectSingleAction"
              >
                {{ injecting ? '注入中...' : '执行注入' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤 3：导出 -->
        <div class="wt-card step-card">
          <div class="step-title">
            <span class="step-badge">3</span>
            <span>导出结果</span>
          </div>
          <div class="action-row">
            <el-button
              type="primary"
              :disabled="!metadata"
              @click="exportJson"
            >
              导出 JSON
            </el-button>
            <el-button
              type="success"
              :disabled="!metadata"
              @click="exportExcel"
            >
              📊 导出 Excel 档案登记表
            </el-button>
            <el-button
              :disabled="!metadata"
              @click="copyToClipboard"
            >
              复制到剪贴板
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── Tab 2: 📁 批量提取 ── -->
      <el-tab-pane label="📁 批量提取" name="batch-extract">
        <div class="wt-card step-card">
          <div class="step-title">
            <span class="step-badge">📁</span>
            <span>批量提取文件元数据</span>
          </div>
          <div class="batch-toolbar">
            <el-button type="primary" @click="selectBatchDirectory" :disabled="batchExtracting">
              📂 选择目录
            </el-button>
            <el-button @click="selectBatchFiles" :disabled="batchExtracting">
              📎 选择多个文件
            </el-button>
            <el-select
              v-model="batchTypeFilter"
              placeholder="文件类型过滤"
              style="width: 140px; margin-left: 8px"
              clearable
              @change="applyBatchFilter"
            >
              <el-option label="全部" value="" />
              <el-option label="PDF" value="pdf" />
              <el-option label="图片" value="image" />
              <el-option label="文档" value="doc" />
            </el-select>
            <el-button
              v-if="batchFiles.length > 0"
              type="success"
              :loading="batchExtracting"
              :disabled="batchExtracting"
              @click="batchExtractAction"
            >
              {{ batchExtracting ? '提取中...' : `批量提取 (${filteredBatchFiles.length} 个文件)` }}
            </el-button>
            <el-button
              v-if="batchFiles.length > 0"
              @click="clearBatchFiles"
            >
              清空列表
            </el-button>
          </div>
          <div v-if="filteredBatchFiles.length > 0" class="result-section">
            <el-table
              :data="filteredBatchFiles"
              stripe
              border
              style="width: 100%"
              max-height="400"
              @selection-change="onBatchSelectionChange"
            >
              <el-table-column type="selection" width="45" />
              <el-table-column prop="name" label="文件名" min-width="220" show-overflow-tooltip />
              <el-table-column label="大小" width="100">
                <template #default="{ row }">
                  {{ formatFileSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column label="类型" width="80">
                <template #default="{ row }">
                  <el-tag size="small" :type="getFileTypeColor(row.extension)">
                    {{ row.extension.toUpperCase() }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="修改时间" width="170">
                <template #default="{ row }">
                  {{ formatDate(row.modified) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-if="batchMetadataResults.length > 0" class="result-section">
            <div class="sub-section-title" style="margin-bottom: 8px">
              📊 提取结果（{{ batchMetadataResults.length }} 个文件）
            </div>
            <el-table :data="batchMetadataResults" stripe border style="width: 100%" max-height="350">
              <el-table-column type="index" label="序号" width="55" />
              <el-table-column prop="fileName" label="文件名" min-width="200" show-overflow-tooltip />
              <el-table-column label="大小" width="100">
                <template #default="{ row }">
                  {{ formatFileSize(row.fileSize) }}
                </template>
              </el-table-column>
              <el-table-column label="扩展名" width="80">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.extension }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="修改时间" width="170">
                <template #default="{ row }">
                  {{ formatDate(row.modified) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-if="batchMetadataResults.length > 0" class="action-row" style="margin-top: 12px">
            <el-button
              type="success"
              @click="exportExcel"
            >
              📊 导出 Excel 档案登记表
            </el-button>
            <el-button
              type="primary"
              @click="exportJson"
            >
              导出 JSON
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── Tab 3: 💉 批量注入 ── -->
      <el-tab-pane label="💉 批量注入" name="batch-inject">
        <div class="wt-card step-card">
          <div class="step-title">
            <span class="step-badge">💉</span>
            <span>批量注入元数据</span>
          </div>

          <!-- 已提取提示 -->
          <el-alert
            v-if="batchMetadataResults.length > 0"
            title="已提取元数据"
            :description="`检测到 ${batchMetadataResults.length} 个文件已在「批量提取」中提取，将对其批量注入`"
            type="success"
            show-icon
            :closable="false"
            style="margin-bottom: 12px"
          />
          <el-alert
            v-else-if="batchFiles.length > 0"
            title="已选择文件"
            :description="`将对 ${batchFiles.length} 个文件批量注入元数据`"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 12px"
          />

          <!-- 选择文件 -->
          <div class="batch-toolbar" style="margin-bottom: 12px">
            <el-button type="primary" @click="selectBatchDirectory" :disabled="batchInjecting">
              📂 选择目录
            </el-button>
            <el-button @click="selectBatchFiles" :disabled="batchInjecting">
              📎 选择多个文件
            </el-button>
            <el-button
              v-if="batchFiles.length > 0"
              @click="clearBatchFiles"
              :disabled="batchInjecting"
            >
              清空列表
            </el-button>
          </div>

          <!-- 文件列表预览（可选） -->
          <div v-if="batchFiles.length > 0" class="result-section" style="margin-bottom: 12px">
            <el-table :data="batchFiles.slice(0, 10)" stripe border style="width: 100%" max-height="250">
              <el-table-column type="index" label="#" width="45" />
              <el-table-column prop="name" label="文件名" min-width="220" show-overflow-tooltip />
              <el-table-column label="大小" width="100">
                <template #default="{ row }">
                  {{ formatFileSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column label="类型" width="80">
                <template #default="{ row }">
                  <el-tag size="small" :type="getFileTypeColor(row.extension)">
                    {{ row.extension.toUpperCase() }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="batchFiles.length > 10" style="text-align: center; margin-top: 6px; color: #8c8c8c; font-size: 12px;">
              ... 共 {{ batchFiles.length }} 个文件，仅显示前 10 个
            </div>
          </div>

          <el-form label-width="80px" label-position="left">
            <el-form-item label="选择模板">
              <el-select
                v-model="selectedTemplateId"
                placeholder="选择元数据模板"
                :disabled="batchInjecting"
                style="width: 240px"
                @change="onTemplateChange"
              >
                <el-option
                  v-for="tmpl in templates"
                  :key="tmpl.id"
                  :label="tmpl.name"
                  :value="tmpl.id"
                />
              </el-select>
              <span v-if="selectedTemplateId" style="margin-left: 10px; font-size: 12px; color: #8c8c8c">
                {{ templates.find(t => t.id === selectedTemplateId)?.description }}
              </span>
            </el-form-item>
            <el-form-item v-if="editProperties.length > 0" label="属性编辑">
              <div class="properties-editor">
                <div
                  v-for="(prop, index) in editProperties"
                  :key="prop.key"
                  class="property-row"
                >
                  <span class="property-key">{{ getPropLabel(prop.key) }}</span>
                  <el-input
                    v-model="prop.value"
                    :placeholder="getPropPlaceholder(prop.key)"
                    :disabled="batchInjecting"
                    size="small"
                    style="flex: 1"
                  />
                  <el-select
                    v-if="prop.key === 'retentionPeriod'"
                    v-model="prop.value"
                    :disabled="batchInjecting"
                    size="small"
                    style="width: 120px"
                  >
                    <el-option label="永久" value="永久" />
                    <el-option label="30年" value="30年" />
                    <el-option label="10年" value="10年" />
                  </el-select>
                  <el-select
                    v-if="prop.key === 'securityLevel'"
                    v-model="prop.value"
                    :disabled="batchInjecting"
                    size="small"
                    style="width: 120px"
                  >
                    <el-option label="内部" value="内部" />
                    <el-option label="秘密" value="秘密" />
                    <el-option label="机密" value="机密" />
                    <el-option label="绝密" value="绝密" />
                  </el-select>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="写入方式">
              <el-radio-group v-model="injectMode" :disabled="batchInjecting">
                <el-radio label="sidecar">Sidecar (.json)</el-radio>
                <el-radio label="pdf-props">PDF 文档属性</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input
                  v-model="outputPath"
                  placeholder="sidecar 输出路径（可选，默认与源文件同目录）"
                  readonly
                  clearable
                  @clear="outputPath = ''"
                />
                <el-button @click="selectOutput" :disabled="batchInjecting">浏览</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :disabled="!selectedTemplateId || batchFiles.length === 0 || batchInjecting"
                :loading="batchInjecting"
                @click="batchInjectAction"
              >
                {{ batchInjecting ? '注入中...' : `批量注入 (${batchFiles.length} 个文件)` }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useTaskStore } from '@/stores/task';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetadataEntry {
  name: string;
  value: string;
}

interface FileMetadataResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  extension: string;
  created: string;
  modified: string;
  imageWidth?: number;
  imageHeight?: number;
  customProperties: Record<string, string>;
}

interface BatchFileEntry {
  name: string;
  path: string;
  size: number;
  extension: string;
  modified: string;
  metadata?: FileMetadataResult | null;
}

interface MetadataTemplate {
  id: string;
  name: string;
  description: string;
  properties: Record<string, string>;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

// Tab 控制
const activeTab = ref('single');

// 使用说明
const showGuide = ref(false);
const taskStore = useTaskStore();

// 单文件模式
const filePath = ref('');
const extracting = ref(false);
const metadata = ref<FileMetadataResult | null>(null);

// 批量模式
const batchDir = ref('');
const batchFiles = ref<BatchFileEntry[]>([]);
const batchSelectedFiles = ref<BatchFileEntry[]>([]);
const batchExtracting = ref(false);
const batchTypeFilter = ref('');
const batchMetadataResults = ref<FileMetadataResult[]>([]);

// 注入（单文件）
const outputPath = ref('');
const injecting = ref(false);

// 注入（批量）
const batchInjecting = ref(false);

const selectedTemplateId = ref('');
const editProperties = ref<Array<{ key: string; value: string }>>([]);
const injectMode = ref<'sidecar' | 'pdf-props'>('sidecar');

// 内置模板（前端镜像，避免额外 IPC 调用）
const templates: MetadataTemplate[] = [
  {
    id: 'general',
    name: '通用',
    description: '适用于所有文件的基础元数据',
    properties: {
      author: '',
      title: '',
      description: '',
      keywords: '',
      category: '',
      version: '1.0',
    },
  },
  {
    id: 'image',
    name: '图片',
    description: '适用于图片文件的元数据',
    properties: {
      author: '',
      title: '',
      description: '',
      keywords: '',
      category: '图片',
      version: '1.0',
      captureDate: '',
      location: '',
      camera: '',
      copyright: '',
      license: 'CC BY-NC 4.0',
    },
  },
  {
    id: 'document',
    name: '文档',
    description: '适用于文档的元数据',
    properties: {
      author: '',
      title: '',
      description: '',
      keywords: '',
      category: '文档',
      version: '1.0',
      documentId: '',
      securityLevel: '内部',
      approvalStatus: '待审批',
      archiveDate: '',
      storageLocation: '',
    },
  },
  {
    id: 'archive',
    name: '档案',
    description: '适用于档案文件的标准化元数据（档号/全宗号/案卷号/件号等）',
    properties: {
      archiveCode: '',       // 档号
      fondsNumber: '',       // 全宗号
      catalogNumber: '',     // 目录号
      caseNumber: '',        // 案卷号
      itemNumber: '',        // 件号
      retentionPeriod: '永久',  // 保管期限
      securityLevel: '内部',   // 密级
      archiveYear: '',       // 归档年度
      filingDate: '',        // 归档日期
      office: '',            // 责任者/部门
      pageCount: '',         // 页数
      format: '',            // 载体形态
      remark: '',            // 备注
    },
  },
];

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const metadataRows = computed<MetadataEntry[]>(() => {
  if (!metadata.value) return [];
  const m = metadata.value;
  const rows: MetadataEntry[] = [
    { name: '文件名', value: m.fileName },
    { name: '文件路径', value: m.filePath },
    { name: '文件大小', value: formatFileSize(m.fileSize) },
    { name: '扩展名', value: m.extension },
    { name: '创建时间', value: new Date(m.created).toLocaleString() },
    { name: '修改时间', value: new Date(m.modified).toLocaleString() },
  ];
  if (m.imageWidth !== undefined) {
    rows.push({ name: '图片宽度', value: `${m.imageWidth}px` });
  }
  if (m.imageHeight !== undefined) {
    rows.push({ name: '图片高度', value: `${m.imageHeight}px` });
  }
  // 自定义属性
  if (m.customProperties) {
    for (const [key, val] of Object.entries(m.customProperties)) {
      rows.push({ name: `自定义:${key}`, value: val });
    }
  }
  return rows;
});

const filteredBatchFiles = computed<BatchFileEntry[]>(() => {
  if (!batchTypeFilter.value) return batchFiles.value;
  const filter = batchTypeFilter.value;
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'];
  const docExts = ['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'txt', 'csv'];

  return batchFiles.value.filter((f) => {
    const ext = f.extension.toLowerCase();
    if (filter === 'image') return imageExts.includes(ext);
    if (filter === 'doc') return docExts.includes(ext);
    if (filter === 'pdf') return ext === 'pdf';
    return true;
  });
});

const hasExportableData = computed(() => {
  return !!metadata.value || batchMetadataResults.value.length > 0;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function getFileTypeColor(ext: string): string {
  const extLower = ext.toLowerCase();
  if (['pdf'].includes(extLower)) return 'danger';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extLower)) return 'primary';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(extLower)) return 'success';
  if (['txt', 'csv', 'json', 'xml'].includes(extLower)) return 'warning';
  return 'info';
}

function getPropPlaceholder(key: string): string {
  const placeholders: Record<string, string> = {
    archiveCode: '如：J001-2024-001-00001',
    fondsNumber: '如：J001',
    catalogNumber: '如：2024',
    caseNumber: '如：001',
    itemNumber: '如：00001',
    archiveYear: '如：2024',
    filingDate: '如：2024-12-31',
    office: '如：办公室',
    pageCount: '如：10',
    format: '如：A4/纸质/电子',
    remark: '附加说明',
  };
  return placeholders[key] || `输入${getPropLabel(key)}`;
}

function getPropLabel(key: string): string {
  const labels: Record<string, string> = {
    // 通用模板
    author: '作者',
    title: '标题',
    description: '描述',
    keywords: '关键词',
    category: '分类',
    version: '版本',
    // 图片模板
    captureDate: '拍摄日期',
    location: '拍摄地点',
    camera: '设备型号',
    copyright: '版权信息',
    license: '许可协议',
    // 文档模板
    documentId: '文档编号',
    securityLevel: '密级',
    approvalStatus: '审批状态',
    archiveDate: '归档日期',
    storageLocation: '存放位置',
    // 档案模板
    archiveCode: '档号',
    fondsNumber: '全宗号',
    catalogNumber: '目录号',
    caseNumber: '案卷号',
    itemNumber: '件号',
    retentionPeriod: '保管期限',
    archiveYear: '归档年度',
    filingDate: '归档日期',
    office: '责任者/部门',
    pageCount: '页数',
    format: '载体形态',
    remark: '备注',
  };
  return labels[key] || key;
}

function getInjectButtonText(): string {
  if (batchFiles.value.length > 0 && batchMetadataResults.value.length > 0) {
    const count = batchSelectedFiles.value.length > 0
      ? batchSelectedFiles.value.length
      : batchMetadataResults.value.length;
    return `批量注入 (${count} 个文件)`;
  }
  return '执行注入';
}

function getExtFromPath(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

async function extractSingleFileMetadata(filePath: string): Promise<FileMetadataResult | null> {
  const api = getApi();

  try {
    let res;
    if (api?.extractMetadata) {
      res = await api.extractMetadata({ filePath });
    } else {
      res = await (window as any).ipcRenderer?.invoke('metadata:extract', { filePath });
    }

    if (res?.success) {
      return res.metadata;
    } else {
      console.error(`提取失败 [${filePath}]:`, res?.error);
      return null;
    }
  } catch (err: any) {
    console.error(`提取异常 [${filePath}]:`, err.message ?? err);
    return null;
  }
}

/**
 * 从编辑属性中收集已填写的键值对
 */
function collectProperties(): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const prop of editProperties.value) {
    if (prop.value) {
      properties[prop.key] = prop.value;
    }
  }
  return properties;
}

// ---------------------------------------------------------------------------
// Actions — 单文件
// ---------------------------------------------------------------------------

function onTemplateChange(templateId: string): void {
  const tmpl = templates.find((t) => t.id === templateId);
  if (tmpl) {
    editProperties.value = Object.entries(tmpl.properties).map(([key, value]) => ({
      key,
      value,
    }));
  }
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
        { name: '所有文件', extensions: ['*'] },
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'] },
        { name: '文档文件', extensions: ['pdf', 'docx', 'xlsx', 'pptx'] },
      ],
    });
    if (files && files.length > 0) {
      filePath.value = files[0];
      metadata.value = null;
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function extractAction(): Promise<void> {
  if (!filePath.value) return;

  extracting.value = true;
  const result = await extractSingleFileMetadata(filePath.value);

  if (result) {
    metadata.value = result;
    ElNotification({ title: '提取完成', message: `成功提取 ${result.fileName} 的元数据`, type: 'success' });
    taskStore.addTask({ name: `元数据提取 - ${result.fileName}`, module: '元数据封装', status: 'completed' });
  } else {
    ElNotification({ title: '提取失败', message: '无法提取文件元数据，请检查文件是否可读', type: 'error' });
    taskStore.addTask({ name: `元数据提取 - ${filePath.value}`, module: '元数据封装', status: 'failed', error: '无法提取文件元数据' });
  }
  extracting.value = false;
}

// ---------------------------------------------------------------------------
// Actions — 批量
// ---------------------------------------------------------------------------

async function selectBatchDirectory(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    ElMessage.warning('目录选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (!dir) return;

    batchDir.value = dir;

    // 通过 IPC 获取目录文件列表
    // 使用 fs:listDirectory 如果存在，否则回退到用户手动选择文件
    if (api?.listDirectory) {
      try {
        const result = await api.listDirectory({ dirPath: dir });
        if (result?.files) {
          batchFiles.value = [...result.files].map((f: any) => ({ ...f }));
          batchMetadataResults.value = [];
          ElMessage.success(`已加载 ${batchFiles.value.length} 个文件`);
          return;
        }
      } catch {
        // 回退到多文件选择
      }
    }

    // 回退：通过 window.api 调用 dialog:openMultipleFiles
    ElMessage.info('请在弹出的对话框中选择文件（支持全选 Ctrl+A）');
    await selectBatchFiles();
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function selectBatchFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectMultipleFiles) {
    ElMessage.warning('文件选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectMultipleFiles({
      filters: [
        { name: '所有文件', extensions: ['*'] },
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'] },
        { name: '文档文件', extensions: ['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'txt'] },
      ],
    });
    if (files && files.length > 0) {
      // 构建文件列表（通过快速信息获取大小等）
      batchFiles.value = files.map((fp) => {
        const name = fp.split(/[/\\]/).pop() ?? fp;
        const ext = getExtFromPath(fp);
        return {
          name,
          path: fp,
          size: 0, // 将在提取时更新
          extension: ext,
          modified: new Date().toISOString(),
        };
      });
      batchMetadataResults.value = [];
      ElMessage.success(`已选择 ${batchFiles.value.length} 个文件`);
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function applyBatchFilter(): void {
  // filteredBatchFiles 是 computed，自动响应 batchTypeFilter 变化
}

function onBatchSelectionChange(selection: BatchFileEntry[]): void {
  batchSelectedFiles.value = [...selection]; // Proxy 数组克隆
}

function clearBatchFiles(): void {
  batchFiles.value = [];
  batchSelectedFiles.value = [];
  batchMetadataResults.value = [];
  batchDir.value = '';
  batchTypeFilter.value = '';
}

async function batchExtractAction(): Promise<void> {
  const filesToExtract = filteredBatchFiles.value;
  if (filesToExtract.length === 0) {
    ElMessage.warning('没有可提取的文件');
    return;
  }

  batchExtracting.value = true;
  batchMetadataResults.value = [];

  const results: FileMetadataResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < filesToExtract.length; i++) {
    const file = filesToExtract[i];
    const result = await extractSingleFileMetadata(file.path);

    if (result) {
      results.push(result);
      successCount++;
    } else {
      failCount++;
    }

    // 更新进度提示（每10个文件更新一次）
    if ((i + 1) % 10 === 0 || i === filesToExtract.length - 1) {
      ElMessage.info(`提取进度：${i + 1}/${filesToExtract.length}`);
    }
  }

  batchMetadataResults.value = results;

  if (successCount > 0) {
    ElNotification({
      title: '批量提取完成',
      message: `成功 ${successCount} 个，失败 ${failCount} 个`,
      type: successCount === filesToExtract.length ? 'success' : 'warning',
    });
    taskStore.addTask({ name: `批量元数据提取 - ${filesToExtract.length}个文件`, module: '元数据封装', status: 'completed' });
  } else {
    ElNotification({ title: '批量提取失败', message: '所有文件提取均失败', type: 'error' });
    taskStore.addTask({ name: `批量元数据提取 - ${filesToExtract.length}个文件`, module: '元数据封装', status: 'failed', error: '所有文件提取均失败' });
  }

  batchExtracting.value = false;
}

// ---------------------------------------------------------------------------
// Actions — 注入（单文件）
// ---------------------------------------------------------------------------

async function selectOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    ElMessage.warning('目录选择功能仅在桌面应用中可用');
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

/**
 * Tab 1 单文件注入
 */
async function injectSingleAction(): Promise<void> {
  if (!selectedTemplateId.value || !filePath.value) return;

  const properties = collectProperties();
  if (Object.keys(properties).length === 0) {
    ElMessage.warning('请至少填写一个属性值');
    return;
  }

  injecting.value = true;

  try {
    await injectToFile(filePath.value, properties, injectMode.value);
    const modeLabel = injectMode.value === 'pdf-props' ? 'PDF 文档属性' : 'sidecar 文件';
    ElNotification({
      title: '注入完成',
      message: `元数据已成功写入（${modeLabel}）`,
      type: 'success',
    });
    taskStore.addTask({ name: `元数据注入 - ${filePath.value.split(/[/\\\\]/).pop() ?? filePath.value}`, module: '元数据封装', status: 'completed' });
  } catch (err: any) {
    ElNotification({
      title: '注入失败',
      message: err.message ?? '注入失败',
      type: 'error',
    });
    taskStore.addTask({ name: `元数据注入 - ${filePath.value.split(/[/\\\\]/).pop() ?? filePath.value}`, module: '元数据封装', status: 'failed', error: err.message ?? '注入失败' });
  }

  injecting.value = false;
}

/**
 * Tab 3 批量注入
 */
async function batchInjectAction(): Promise<void> {
  if (!selectedTemplateId.value || batchFiles.value.length === 0) return;

  const properties = collectProperties();
  if (Object.keys(properties).length === 0) {
    ElMessage.warning('请至少填写一个属性值');
    return;
  }

  batchInjecting.value = true;

  // 确定目标文件列表：优先使用已提取的元数据结果，否则使用 batchFiles
  let targetPaths: string[];
  if (batchMetadataResults.value.length > 0) {
    const selectedPaths = new Set(batchSelectedFiles.value.map((f) => f.path));
    if (selectedPaths.size > 0) {
      targetPaths = batchMetadataResults.value
        .filter((m) => selectedPaths.has(m.filePath))
        .map((m) => m.filePath);
    } else {
      targetPaths = batchMetadataResults.value.map((m) => m.filePath);
    }
  } else {
    targetPaths = batchFiles.value.map((f) => f.path);
  }

  if (targetPaths.length === 0) {
    ElMessage.warning('没有可注入的目标文件');
    batchInjecting.value = false;
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const mode = injectMode.value;

  for (let i = 0; i < targetPaths.length; i++) {
    const fp = targetPaths[i];
    try {
      await injectToFile(fp, properties, mode);
      successCount++;

      // 进度提示
      if ((i + 1) % 5 === 0 || i === targetPaths.length - 1) {
        ElMessage.info(`注入进度：${i + 1}/${targetPaths.length}`);
      }
    } catch (err: any) {
      failCount++;
      console.error(`注入失败 [${fp}]:`, err.message ?? err);
    }
  }

  if (successCount > 0) {
    const modeLabel = mode === 'pdf-props' ? 'PDF 文档属性' : 'sidecar 文件';
    ElNotification({
      title: '批量注入完成',
      message: `成功 ${successCount} 个，失败 ${failCount} 个（写入${modeLabel}）`,
      type: successCount === targetPaths.length ? 'success' : 'warning',
    });
    taskStore.addTask({ name: `批量元数据注入 - ${targetPaths.length}个文件`, module: '元数据封装', status: 'completed' });
  } else {
    ElNotification({ title: '注入失败', message: '所有文件注入均失败', type: 'error' });
    taskStore.addTask({ name: `批量元数据注入 - ${targetPaths.length}个文件`, module: '元数据封装', status: 'failed', error: '所有文件注入均失败' });
  }

  batchInjecting.value = false;
}

async function injectToFile(
  filePath: string,
  properties: Record<string, string>,
  mode: 'sidecar' | 'pdf-props',
): Promise<void> {
  const api = getApi();

  if (mode === 'pdf-props') {
    // PDF 文档属性写入模式：通过 metadata:inject 传递 mode 参数
    const params = {
      filePath,
      properties,
      outputPath: outputPath.value || undefined,
      mode: 'pdf-props',
    };

    let res;
    if (api?.injectMetadata) {
      res = await api.injectMetadata(params);
    } else {
      res = await (window as any).ipcRenderer?.invoke('metadata:inject', params);
    }

    if (!res?.success) {
      throw new Error(res?.error ?? '注入失败');
    }
  } else {
    // sidecar 模式（默认）
    const params = {
      filePath,
      properties,
      outputPath: outputPath.value || undefined,
    };

    let res;
    if (api?.injectMetadata) {
      res = await api.injectMetadata(params);
    } else {
      res = await (window as any).ipcRenderer?.invoke('metadata:inject', params);
    }

    if (!res?.success) {
      throw new Error(res?.error ?? '注入失败');
    }
  }
}

// ---------------------------------------------------------------------------
// Actions — 导出
// ---------------------------------------------------------------------------

async function exportJson(): Promise<void> {
  const api = (window as any).electronAPI;

  // 构建导出数据：单文件或批量
  let exportData: any;
  let defaultName: string;

  if (batchMetadataResults.value.length > 0) {
    exportData = [...batchMetadataResults.value].map((m) => ({ ...m }));
    defaultName = 'metadata-batch.json';
  } else if (metadata.value) {
    exportData = { ...metadata.value };
    defaultName = `${metadata.value.fileName || 'metadata'}.metadata.json`;
  } else {
    ElMessage.warning('没有可导出的数据');
    return;
  }

  const json = JSON.stringify(exportData, null, 2);

  // Electron 环境：使用保存对话框
  if (api?.saveFile && api?.writeFile) {
    try {
      const filePath = await api.saveFile({
        defaultPath: defaultName,
        filters: [
          { name: 'JSON 文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (!filePath) return; // 用户取消

      await api.writeFile({ filePath, content: json });
      ElMessage.success('JSON 文件已保存');
    } catch (err: any) {
      ElMessage.error(`保存失败：${err.message ?? err}`);
    }
  } else {
    // 浏览器环境：使用 Blob 下载
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      ElMessage.success('JSON 文件已下载');
    } catch (err: any) {
      ElMessage.error(`下载失败：${err.message ?? err}`);
    }
  }
}

async function copyToClipboard(): Promise<void> {
  if (!metadata.value) return;

  try {
    const json = JSON.stringify(metadata.value, null, 2);
    await navigator.clipboard.writeText(json);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败，请手动选择文本');
  }
}

async function exportExcel(): Promise<void> {
  // 构建待导出的数据行
  const rows = getExcelExportRows();
  if (rows.length === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }

  // 动态加载 SheetJS 库
  const XLSX = await loadXlsxLibrary();
  if (!XLSX) {
    ElMessage.error('加载 Excel 库失败，请检查网络连接');
    return;
  }

  try {
    // 构建工作表
    const headers = ['序号', '文件名', '档号', '全宗号', '案卷号', '件号', '保管期限', '密级', '文件大小', '修改时间', '归档年度', '归档日期', '责任者', '页数', '载体形态', '备注'];
    const sheetData = [headers];

    rows.forEach((row, index) => {
      sheetData.push([
        index + 1,
        row.fileName || '',
        row.archiveCode || '',
        row.fondsNumber || '',
        row.caseNumber || '',
        row.itemNumber || '',
        row.retentionPeriod || '',
        row.securityLevel || '',
        row.fileSize || '',
        row.modified || '',
        row.archiveYear || '',
        row.filingDate || '',
        row.office || '',
        row.pageCount || '',
        row.format || '',
        row.remark || '',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 30 },  // 文件名
      { wch: 24 },  // 档号
      { wch: 12 },  // 全宗号
      { wch: 12 },  // 案卷号
      { wch: 12 },  // 件号
      { wch: 10 },  // 保管期限
      { wch: 8 },   // 密级
      { wch: 12 },  // 文件大小
      { wch: 20 },  // 修改时间
      { wch: 12 },  // 归档年度
      { wch: 14 },  // 归档日期
      { wch: 16 },  // 责任者
      { wch: 8 },   // 页数
      { wch: 12 },  // 载体形态
      { wch: 20 },  // 备注
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '档案登记表');

    const api = (window as any).electronAPI;

    // Electron 环境：使用保存对话框 + writeFile
    if (api?.saveFile && api?.writeFile) {
      const filePath = await api.saveFile({
        defaultPath: '档案登记表.xlsx',
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (!filePath) return; // 用户取消

      // 生成二进制数据
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      // 转换为 Base64 写入
      const uint8 = new Uint8Array(wbout);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      await api.writeFile({ filePath, content: base64, encoding: 'base64' });
      ElMessage.success('Excel 档案登记表已保存');
    } else {
      // 浏览器环境：直接下载
      XLSX.writeFile(wb, '档案登记表.xlsx');
      ElMessage.success('Excel 档案登记表已下载');
    }
  } catch (err: any) {
    ElMessage.error(`导出 Excel 失败：${err.message ?? err}`);
  }
}

interface ExcelExportRow {
  fileName: string;
  archiveCode: string;
  fondsNumber: string;
  caseNumber: string;
  itemNumber: string;
  retentionPeriod: string;
  securityLevel: string;
  fileSize: string;
  modified: string;
  archiveYear: string;
  filingDate: string;
  office: string;
  pageCount: string;
  format: string;
  remark: string;
}

function getExcelExportRows(): ExcelExportRow[] {
  const rows: ExcelExportRow[] = [];

  const sources = batchMetadataResults.value.length > 0
    ? [...batchMetadataResults.value].map((m) => ({ ...m }))
    : metadata.value ? [{ ...metadata.value }] : [];

  for (const m of sources) {
    rows.push({
      fileName: m.fileName || '',
      archiveCode: m.customProperties?.archiveCode || '',
      fondsNumber: m.customProperties?.fondsNumber || '',
      caseNumber: m.customProperties?.caseNumber || '',
      itemNumber: m.customProperties?.itemNumber || '',
      retentionPeriod: m.customProperties?.retentionPeriod || '',
      securityLevel: m.customProperties?.securityLevel || '',
      fileSize: formatFileSize(m.fileSize),
      modified: formatDate(m.modified),
      archiveYear: m.customProperties?.archiveYear || '',
      filingDate: m.customProperties?.filingDate || '',
      office: m.customProperties?.office || '',
      pageCount: m.customProperties?.pageCount || '',
      format: m.customProperties?.format || '',
      remark: m.customProperties?.remark || '',
    });
  }

  return rows;
}

async function loadXlsxLibrary(): Promise<any> {
  // 如果已加载，直接返回
  if ((window as any).XLSX) return (window as any).XLSX;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = () => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
      } else {
        reject(new Error('XLSX 库加载后不可用'));
      }
    };
    script.onerror = () => reject(new Error('CDN 加载失败'));
    document.head.appendChild(script);
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

/* Tab 标签页 */
.metadata-tabs {
  margin-top: 4px;
}

.metadata-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.metadata-tabs :deep(.el-tabs__nav) {
  border: none;
}

.metadata-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
  padding: 0 20px;
  height: 40px;
  line-height: 40px;
}

.sub-section {
  margin-bottom: 4px;
}

.sub-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #434343;
  margin-bottom: 12px;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
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

.input-with-btn {
  display: flex;
  gap: 8px;
  width: 100%;
}

.input-with-btn .el-input {
  flex: 1;
}

.result-section {
  margin-top: 16px;
}

.properties-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.property-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.property-key {
  width: 120px;
  font-size: 13px;
  color: #595959;
  flex-shrink: 0;
  text-align: right;
}

.action-row {
  display: flex;
  gap: 12px;
}
</style>

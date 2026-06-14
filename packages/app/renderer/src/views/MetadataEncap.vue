<template>
  <div class="module-page">
    <div class="page-header">
      <h2>🏷️ 元数据封装</h2>
      <p class="page-desc">提取文件元数据，通过模板批量注入自定义属性</p>
    </div>

    <!-- ── 步骤一：选择文件并提取元数据 ── -->
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

      <!-- 提取结果表格 -->
      <div v-if="metadata" class="result-section">
        <el-table :data="metadataRows" stripe border style="width: 100%" max-height="400">
          <el-table-column prop="name" label="属性名" width="200" />
          <el-table-column prop="value" label="属性值" />
        </el-table>
      </div>
    </div>

    <!-- ── 步骤二：选择模板并注入 ── -->
    <div class="wt-card step-card">
      <div class="step-title">
        <span class="step-badge">2</span>
        <span>批量注入</span>
      </div>
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
        </el-form-item>

        <!-- 模板属性编辑 -->
        <el-form-item v-if="editProperties.length > 0" label="属性编辑">
          <div class="properties-editor">
            <div
              v-for="(prop, index) in editProperties"
              :key="prop.key"
              class="property-row"
            >
              <span class="property-key">{{ prop.key }}</span>
              <el-input
                v-model="prop.value"
                placeholder="输入属性值"
                :disabled="injecting"
                size="small"
                style="flex: 1"
              />
            </div>
          </div>
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
            :disabled="!selectedTemplateId || injecting"
            :loading="injecting"
            @click="injectAction"
          >
            {{ injecting ? '注入中...' : '执行注入' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ── 步骤三：导出 ── -->
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
          :disabled="!metadata"
          @click="copyToClipboard"
        >
          复制到剪贴板
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';

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

interface MetadataTemplate {
  id: string;
  name: string;
  description: string;
  properties: Record<string, string>;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const filePath = ref('');
const outputPath = ref('');
const extracting = ref(false);
const injecting = ref(false);

const metadata = ref<FileMetadataResult | null>(null);
const selectedTemplateId = ref('');
const editProperties = ref<Array<{ key: string; value: string }>>([]);

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

// ---------------------------------------------------------------------------
// Actions
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

async function extractAction(): Promise<void> {
  if (!filePath.value) return;

  const api = getApi();
  if (!api?.extractMetadata) {
    // 回退：直接通过 IPC invoke
    try {
      extracting.value = true;
      const res = await (window as any).ipcRenderer?.invoke('metadata:extract', {
        filePath: filePath.value,
      });
      if (res?.success) {
        metadata.value = res.metadata;
        ElNotification({ title: '提取完成', message: `成功提取 ${res.metadata.fileName} 的元数据`, type: 'success' });
      } else {
        ElNotification({ title: '提取失败', message: res?.error ?? '未知错误', type: 'error' });
      }
    } catch (err: any) {
      ElMessage.warning('元数据提取功能仅在桌面应用中可用');
    } finally {
      extracting.value = false;
    }
    return;
  }

  try {
    extracting.value = true;
    const res = await api.extractMetadata({ filePath: filePath.value });
    if (res.success) {
      metadata.value = res.metadata;
      ElNotification({ title: '提取完成', message: `成功提取 ${res.metadata.fileName} 的元数据`, type: 'success' });
    } else {
      ElNotification({ title: '提取失败', message: res.error ?? '未知错误', type: 'error' });
    }
  } catch (err: any) {
    ElNotification({ title: '提取异常', message: err.message ?? String(err), type: 'error' });
  } finally {
    extracting.value = false;
  }
}

async function injectAction(): Promise<void> {
  if (!selectedTemplateId.value) return;

  // 收集编辑后的属性
  const properties: Record<string, string> = {};
  for (const prop of editProperties.value) {
    if (prop.value) {
      properties[prop.key] = prop.value;
    }
  }

  if (Object.keys(properties).length === 0) {
    ElMessage.warning('请至少填写一个属性值');
    return;
  }

  const api = getApi();
  const params = {
    filePath: filePath.value,
    properties,
    outputPath: outputPath.value || undefined,
  };

  try {
    injecting.value = true;

    let res;
    if (api?.injectMetadata) {
      res = await api.injectMetadata(params);
    } else {
      res = await (window as any).ipcRenderer?.invoke('metadata:inject', params);
    }

    if (res?.success) {
      ElNotification({ title: '注入完成', message: `元数据已写入 sidecar 文件`, type: 'success' });
    } else {
      ElNotification({ title: '注入失败', message: res?.error ?? '未知错误', type: 'error' });
    }
  } catch (err: any) {
    ElNotification({ title: '注入异常', message: err.message ?? String(err), type: 'error' });
  } finally {
    injecting.value = false;
  }
}

async function exportJson(): Promise<void> {
  if (!metadata.value) return;

  const api = (window as any).electronAPI;
  
  // Electron 环境：使用保存对话框
  if (api?.saveFile && api?.writeFile) {
    try {
      const json = JSON.stringify(metadata.value, null, 2);
      const filePath = await api.saveFile({
        defaultPath: `${metadata.value.fileName || 'metadata'}.metadata.json`,
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
      const json = JSON.stringify(metadata.value, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metadata.value.fileName || 'metadata'}.metadata.json`;
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

<template>
  <div class="module-page">
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>🔒 MD5校验</h2>
        <p class="page-desc">生成文件哈希值，验证文件完整性，防止文件篡改</p>
      </div>
      <el-button size="small" @click="showGuide = true">📖 使用说明</el-button>
    </div>

    <div class="wt-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- ============================================================ -->
        <!-- 单文件 Tab                                                     -->
        <!-- ============================================================ -->
        <el-tab-pane label="📄 单文件" name="single">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="singleFilePath"
                  placeholder="请选择要计算哈希的文件"
                  readonly
                />
                <el-button type="primary" @click="selectSingleFile" :disabled="computing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="哈希算法">
              <el-select
                v-model="singleAlgorithm"
                :disabled="computing"
                style="width: 200px"
              >
                <el-option label="MD5" value="md5" />
                <el-option label="SHA-1" value="sha1" />
                <el-option label="SHA-256" value="sha256" />
                <el-option label="SHA-512" value="sha512" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!singleFilePath || computing"
                :loading="computing"
                @click="computeSingleHash"
              >
                {{ computing ? '计算中...' : '计算哈希' }}
              </el-button>
            </el-form-item>

            <!-- 结果显示 -->
            <el-form-item v-if="singleResult" label="文件信息">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="文件名">
                  {{ singleResult.fileName }}
                </el-descriptions-item>
                <el-descriptions-item label="文件大小">
                  {{ formatFileSize(singleResult.fileSize) }}
                </el-descriptions-item>
                <el-descriptions-item label="算法">
                  {{ singleResult.algorithm.toUpperCase() }}
                </el-descriptions-item>
                <el-descriptions-item label="耗时">
                  {{ formatDuration(singleResult.duration) }}
                </el-descriptions-item>
              </el-descriptions>
            </el-form-item>

            <el-form-item v-if="singleResult" label="哈希值">
              <div class="hash-display">
                <el-input
                  :model-value="singleResult.hash"
                  readonly
                  class="hash-input"
                />
                <el-button
                  type="primary"
                  :icon="CopyDocument"
                  @click="copyToClipboard(singleResult.hash)"
                >
                  复制
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 批量 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="📁 批量" name="batch">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择目录">
              <div class="input-with-btn">
                <el-input
                  v-model="batchDirPath"
                  placeholder="请选择要批量计算的目录"
                  readonly
                />
                <el-button type="primary" @click="selectBatchDir" :disabled="batchComputing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="哈希算法">
              <el-select
                v-model="batchAlgorithm"
                :disabled="batchComputing"
                style="width: 200px"
              >
                <el-option label="MD5" value="md5" />
                <el-option label="SHA-1" value="sha1" />
                <el-option label="SHA-256" value="sha256" />
                <el-option label="SHA-512" value="sha512" />
              </el-select>
            </el-form-item>

            <el-form-item label="并发数">
              <el-input-number
                v-model="batchConcurrency"
                :min="1"
                :max="16"
                :disabled="batchComputing"
              />
            </el-form-item>

            <el-form-item label="文件类型">
              <el-checkbox-group v-model="batchFileExtensions">
                <el-checkbox value=".pdf" label="PDF" />
                <el-checkbox value=".jpg" label="JPG" />
                <el-checkbox value=".png" label="PNG" />
                <el-checkbox value=".doc" label="DOC" />
                <el-checkbox value=".xlsx" label="Excel" />
                <el-checkbox value=".txt" label="TXT" />
              </el-checkbox-group>
              <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                不选则计算所有文件
              </div>
            </el-form-item>

            <!-- 文件计数 -->
            <el-form-item v-if="batchFileCount !== null" label="扫描结果">
              <el-tag type="info">共 {{ batchFileCount }} 个文件</el-tag>
              <span style="margin-left: 8px; font-size: 12px; color: #909399;">匹配所选文件类型</span>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!batchDirPath || batchComputing"
                :loading="batchComputing"
                @click="computeBatchHash"
              >
                {{ batchComputing ? '批量计算中...' : '开始批量计算' }}
              </el-button>
            </el-form-item>

            <!-- 进度 -->
            <el-form-item v-if="batchProgress.show">
              <el-progress
                :percentage="batchProgress.percent"
                :stroke-width="16"
                :text-inside="true"
              />
              <p class="progress-text" style="margin-top: 8px">
                已处理 {{ batchProgress.completed }} / {{ batchProgress.total }} 个文件
              </p>
            </el-form-item>

            <!-- 结果表格 -->
            <el-form-item v-if="batchResults.length > 0" label="计算结果">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 14px; color: #606266;">
                  共 {{ batchResults.length }} 个文件
                </span>
                <div>
                  <el-button size="small" :icon="Download" @click="exportBatchCSV">导出 CSV</el-button>
                  <el-button size="small" :icon="Document" @click="exportMd5Manifest">导出 MD5 清单</el-button>
                  <el-button size="small" type="primary" :icon="EditPen" @click="showReportDialog = true">生成归档报告</el-button>
                </div>
              </div>
              <el-table
                :data="batchResults"
                stripe
                border
                max-height="480"
                style="width: 100%"
              >
                <el-table-column
                  prop="fileName"
                  label="文件名"
                  min-width="200"
                  show-overflow-tooltip
                />
                <el-table-column label="哈希值" min-width="280" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span class="hash-cell">{{ row.hash }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="大小" width="100" align="right">
                  <template #default="{ row }">
                    {{ formatFileSize(row.fileSize) }}
                  </template>
                </el-table-column>
                <el-table-column label="耗时" width="90" align="center">
                  <template #default="{ row }">
                    {{ formatDuration(row.duration) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center" fixed="right">
                  <template #default="{ row }">
                    <el-button
                      type="primary"
                      :icon="CopyDocument"
                      size="small"
                      text
                      @click="copyToClipboard(row.hash)"
                    >
                      复制
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 比对 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="🔍 比对" name="verify">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="verifyFilePath"
                  placeholder="请选择要校验的文件"
                  readonly
                />
                <el-button type="primary" @click="selectVerifyFile" :disabled="verifying">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="哈希算法">
              <el-select
                v-model="verifyAlgorithm"
                :disabled="verifying"
                style="width: 200px"
              >
                <el-option label="MD5" value="md5" />
                <el-option label="SHA-1" value="sha1" />
                <el-option label="SHA-256" value="sha256" />
                <el-option label="SHA-512" value="sha512" />
              </el-select>
            </el-form-item>

            <el-form-item label="期望哈希">
              <el-input
                v-model="verifyExpectedHash"
                placeholder="输入期望的十六进制哈希值"
                :disabled="verifying"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canVerify || verifying"
                :loading="verifying"
                @click="doVerify"
              >
                {{ verifying ? '比对中...' : '开始比对' }}
              </el-button>
            </el-form-item>

            <!-- 比对结果 -->
            <el-form-item v-if="verifyResult !== null" label="比对结果">
              <div class="verify-result">
                <div v-if="verifyResult" class="verify-pass">
                  <el-tag type="success" size="large" effect="dark">✅ 哈希匹配</el-tag>
                  <p class="verify-detail">
                    文件 {{ verifyFileName }} 的哈希值与期望值一致，文件完整
                  </p>
                </div>
                <div v-else class="verify-fail">
                  <el-tag type="danger" size="large" effect="dark">❌ 哈希不匹配</el-tag>
                  <p class="verify-detail">
                    文件 {{ verifyFileName }} 的哈希值与期望值不一致，文件可能已被篡改
                  </p>
                  <el-descriptions :column="1" border size="small" style="margin-top: 12px">
                    <el-descriptions-item label="期望值">
                      <span class="hash-expected">{{ verifyExpectedHash }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="实际值">
                      <span class="hash-actual">{{ verifyActualHash }}</span>
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 清单比对 Tab                                                   -->
        <!-- ============================================================ -->
        <el-tab-pane label="📋 清单比对" name="manifest-compare">
          <el-form label-width="120px" label-position="left">
            <el-form-item label="选择清单文件">
              <div class="input-with-btn">
                <el-input v-model="manifestFilePath" placeholder="选择之前导出的 .md5 清单文件" readonly />
                <el-button type="primary" @click="selectManifestFile" :disabled="manifestComparing">浏览</el-button>
              </div>
            </el-form-item>
            <el-form-item label="扫描目录">
              <div class="input-with-btn">
                <el-input v-model="manifestDirPath" placeholder="选择要比对的目录" readonly />
                <el-button @click="selectManifestDir" :disabled="manifestComparing">浏览</el-button>
              </div>
            </el-form-item>
            <el-form-item label="哈希算法">
              <el-select v-model="manifestAlgorithm" :disabled="manifestComparing" style="width: 200px">
                <el-option label="MD5" value="md5" />
                <el-option label="SHA-256" value="sha256" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="success" size="large" :disabled="!manifestFilePath || !manifestDirPath || manifestComparing" :loading="manifestComparing" @click="doManifestCompare">
                {{ manifestComparing ? '比对中...' : '开始比对' }}
              </el-button>
            </el-form-item>
            <!-- 比对结果 -->
            <el-form-item v-if="manifestResult" label="比对结果">
              <el-alert :title="manifestSummary" :type="manifestResult.matched.length === manifestResult.matched.length + manifestResult.modified.length + manifestResult.missing.length ? 'success' : 'warning'" show-icon style="margin-bottom: 16px" />
            </el-form-item>
            <el-form-item v-if="manifestResult && manifestResult.matched.length > 0" label="✅ 一致">
              <div v-for="item in manifestResult.matched" :key="item.fileName" style="font-size: 13px; color: #67c23a;">{{ item.fileName }}</div>
            </el-form-item>
            <el-form-item v-if="manifestResult && manifestResult.modified.length > 0" label="⚠️ 已修改">
              <div v-for="item in manifestResult.modified" :key="item.fileName" style="font-size: 13px; color: #e6a23c;">
                {{ item.fileName }}（期望: {{ item.expectedHash.substring(0, 12) }}... → 实际: {{ item.actualHash.substring(0, 12) }}...）
              </div>
            </el-form-item>
            <el-form-item v-if="manifestResult && manifestResult.missing.length > 0" label="❌ 缺失">
              <div v-for="item in manifestResult.missing" :key="item.fileName" style="font-size: 13px; color: #f56c6c;">{{ item.fileName }}</div>
            </el-form-item>
            <el-form-item v-if="manifestResult && manifestResult.added.length > 0" label="🆕 新增">
              <div v-for="item in manifestResult.added" :key="item.fileName" style="font-size: 13px; color: #409eff;">{{ item.fileName }}</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 使用说明对话框 -->
    <el-dialog v-model="showGuide" title="📖 使用说明 — MD5校验" width="650px">
      <div style="line-height: 1.8; font-size: 14px; color: #303133; padding: 0 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">一、功能概述</h3>
        <p style="margin: 0 0 16px 0; color: #595959;">计算文件哈希值，验证文件完整性，防止文件篡改，支持单文件/批量计算、哈希比对和清单比对。</p>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">二、操作步骤</h3>
        <ol style="margin: 0 0 16px 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;"><strong>单文件计算：</strong>选择文件 → 选择算法（MD5/SHA-1/SHA-256/SHA-512）→ 点击"计算哈希" → 查看并复制哈希值。</li>
          <li style="margin-bottom: 6px;"><strong>批量计算：</strong>选择目录 → 选择算法 → 设置并发数和文件类型过滤 → 点击"开始批量计算" → 查看结果表 → 导出 CSV / MD5 清单。</li>
          <li style="margin-bottom: 6px;"><strong>哈希比对：</strong>选择文件 → 选择算法 → 输入期望哈希值 → 点击"开始比对" → 查看匹配结果。</li>
          <li style="margin-bottom: 6px;"><strong>清单比对：</strong>选择之前导出的 .md5 清单文件 → 选择要比对的目录 → 开始比对 → 查看一致/已修改/缺失/新增文件。</li>
          <li style="margin-bottom: 6px;"><strong>生成归档报告：</strong>在批量结果中点击"生成归档报告"，填写机构名称、操作人等信息后生成正式校验报告。</li>
        </ol>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">三、常见问题</h3>
        <ul style="margin: 0 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">支持算法：MD5、SHA-1、SHA-256、SHA-512</li>
          <li style="margin-bottom: 4px;">批量模式支持并发加速（1-16 线程），可设置文件类型过滤</li>
          <li style="margin-bottom: 4px;">可导出 MD5 清单文件（.md5），用于后续清单比对</li>
          <li style="margin-bottom: 4px;">清单比对可快速识别新增、缺失和被修改的文件</li>
        </ul>
      </div>
    </el-dialog>

    <!-- 归档报告对话框 -->
    <el-dialog v-model="showReportDialog" title="生成归档报告" width="500px">
      <el-form label-width="100px">
        <el-form-item label="机构名称">
          <el-input v-model="reportOptions.organization" placeholder="如：连云港文安档案科技有限公司" />
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="reportOptions.operator" placeholder="输入您的姓名" />
        </el-form-item>
        <el-form-item label="任务名称">
          <el-input v-model="reportOptions.taskName" placeholder="如：2026年档案数字化校验" />
        </el-form-item>
        <el-form-item label="保存路径">
          <div class="input-with-btn">
            <el-input v-model="reportOutputPath" placeholder="报告保存路径" readonly />
            <el-button @click="selectReportOutput">浏览</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReportDialog = false">取消</el-button>
        <el-button type="primary" :loading="generatingReport" @click="doGenerateReport">生成报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useTaskStore } from '@/stores/task';
import { CopyDocument, Download, Document, EditPen } from '@element-plus/icons-vue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HashResult {
  filePath: string;
  fileName: string;
  algorithm: string;
  hash: string;
  fileSize: number;
  duration: number;
}

interface BatchProgress {
  show: boolean;
  completed: number;
  total: number;
  percent: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const activeTab = ref('single');

// -- 使用说明 --
const showGuide = ref(false);
const taskStore = useTaskStore();

// -- 单文件 --
const computing = ref(false);
const singleFilePath = ref('');
const singleAlgorithm = ref<string>('md5');
const singleResult = ref<HashResult | null>(null);

// -- 批量 --
const batchComputing = ref(false);
const batchDirPath = ref('');
const batchAlgorithm = ref<string>('md5');
const batchConcurrency = ref(4);
const batchFileExtensions = ref<string[]>([]);
const batchFileCount = ref<number | null>(null);

// 监听文件类型变化，重新统计
watch(batchFileExtensions, () => {
  if (batchDirPath.value) updateFileCount();
});
const batchResults = ref<HashResult[]>([]);
const batchProgress = ref<BatchProgress>({
  show: false,
  completed: 0,
  total: 0,
  percent: 0,
});

// -- 比对 --
const verifying = ref(false);
const verifyFilePath = ref('');
const verifyAlgorithm = ref<string>('md5');
const verifyExpectedHash = ref('');
const verifyResult = ref<boolean | null>(null);
const verifyActualHash = ref('');
const verifyFileName = ref('');

const canVerify = computed(
  () =>
    verifyFilePath.value.length > 0 &&
    verifyExpectedHash.value.trim().length > 0,
);

// -- 清单比对 --
const manifestComparing = ref(false);
const manifestFilePath = ref('');
const manifestDirPath = ref('');
const manifestAlgorithm = ref<string>('md5');
const manifestResult = ref<ManifestCompareResult | null>(null);

interface ManifestItem {
  fileName: string;
  expectedHash: string;
  actualHash: string;
}

interface ManifestCompareResult {
  matched: ManifestItem[];
  modified: ManifestItem[];
  missing: ManifestItem[];
  added: ManifestItem[];
}

const manifestSummary = computed(() => {
  if (!manifestResult.value) return '';
  const r = manifestResult.value;
  const total = r.matched.length + r.modified.length + r.missing.length + r.added.length;
  const matched = r.matched.length;
  const modified = r.modified.length;
  const missing = r.missing.length;
  const added = r.added.length;
  if (modified === 0 && missing === 0 && added === 0) {
    return `✅ 全部一致，共 ${matched} 个文件`;
  }
  return `⚠️ 一致: ${matched} | 已修改: ${modified} | 缺失: ${missing} | 新增: ${added}（共 ${total} 个文件）`;
});

// -- 归档报告 --
const showReportDialog = ref(false);
const generatingReport = ref(false);
const reportOptions = ref({
  organization: '',
  operator: '',
  taskName: '',
});
const reportOutputPath = ref('');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

function getFileName(filePath: string): string {
  return filePath.split(/[/\\\\]/).pop() ?? filePath;
}

function getManifestDirName(): string {
  return manifestDirPath.value.split(/[/\\\\]/).pop() ?? manifestDirPath.value;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
}

// ---------------------------------------------------------------------------
// Single File Actions
// ---------------------------------------------------------------------------

async function selectSingleFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) {
    ElMessage.warning('文件选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: '所有文件', extensions: ['*'] }],
    });
    if (files && files.length > 0) {
      singleFilePath.value = files[0];
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function computeSingleHash(): Promise<void> {
  if (!singleFilePath.value) return;
  const api = getApi();
  if (!api?.hashFile) {
    ElMessage.warning('MD5 校验功能仅在桌面应用中可用');
    return;
  }

  computing.value = true;
  singleResult.value = null;

  try {
    const res = await api.hashFile({
      filePath: singleFilePath.value,
      algorithm: singleAlgorithm.value,
    });

    if (res.success) {
      singleResult.value = res.result as HashResult;
      ElNotification({
        title: '计算完成',
        message: `${res.result.algorithm.toUpperCase()}: ${res.result.hash.substring(0, 16)}...`,
        type: 'success',
        duration: 3000,
      });
      taskStore.addTask({ name: `${singleAlgorithm.value.toUpperCase()}哈希 - ${singleResult.value.fileName}`, module: 'MD5校验', status: 'completed' });
    } else {
      ElNotification({
        title: '计算失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 5000,
      });
      taskStore.addTask({ name: `哈希计算 - ${getFileName(singleFilePath.value)}`, module: 'MD5校验', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '计算异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 5000,
    });
  } finally {
    computing.value = false;
  }
}

// ---------------------------------------------------------------------------
// Batch Actions
// ---------------------------------------------------------------------------

async function selectBatchDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    ElMessage.warning('目录选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (dir) {
      batchDirPath.value = dir;
      batchFileCount.value = null;
      await updateFileCount();
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function updateFileCount(): Promise<void> {
  const api = getApi();
  if (!api?.countMd5Files || !batchDirPath.value) return;
  try {
    const res = await api.countMd5Files({
      dirPath: batchDirPath.value,
      fileExtensions: batchFileExtensions.value.length > 0 ? [...batchFileExtensions.value] : undefined,
    });
    if (res.success) {
      batchFileCount.value = res.count;
    }
  } catch {
    // 静默失败
  }
}

async function computeBatchHash(): Promise<void> {
  if (!batchDirPath.value) return;
  const api = getApi();
  if (!api?.hashDirectory) {
    ElMessage.warning('MD5 校验功能仅在桌面应用中可用');
    return;
  }

  batchComputing.value = true;
  batchResults.value = [];
  batchProgress.value = { show: true, completed: 0, total: 0, percent: 0 };

  try {
    // 监听进度
    let cleanup: (() => void) | null = null;
    if (api.onMd5Progress) {
      cleanup = api.onMd5Progress(
        (data: { completed: number; total: number; percent: number }) => {
          batchProgress.value.completed = data.completed;
          batchProgress.value.total = data.total;
          batchProgress.value.percent = data.percent;
        },
      );
    }

    const res = await api.hashDirectory({
      dirPath: batchDirPath.value,
      algorithm: batchAlgorithm.value,
      concurrency: batchConcurrency.value,
      fileExtensions: batchFileExtensions.value.length > 0 ? [...batchFileExtensions.value] : undefined,
    });

    if (cleanup) cleanup();

    if (res.success) {
      batchResults.value = (res.results as HashResult[]) ?? [];
      ElNotification({
        title: '批量计算完成',
        message: `共处理 ${batchResults.value.length} 个文件`,
        type: 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `批量${batchAlgorithm.value.toUpperCase()} - ${batchResults.value.length}个文件`, module: 'MD5校验', status: 'completed' });
    } else {
      ElNotification({
        title: '批量计算失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `批量${batchAlgorithm.value.toUpperCase()} - ${batchDirPath.value}`, module: 'MD5校验', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '批量计算异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    batchComputing.value = false;
    batchProgress.value.show = false;
  }
}

// ---------------------------------------------------------------------------
// Verify Actions
// ---------------------------------------------------------------------------

async function selectVerifyFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) {
    ElMessage.warning('文件选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: '所有文件', extensions: ['*'] }],
    });
    if (files && files.length > 0) {
      verifyFilePath.value = files[0];
      verifyFileName.value = files[0].split(/[/\\]/).pop() ?? files[0];
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function doVerify(): Promise<void> {
  if (!canVerify.value) return;
  const api = getApi();
  if (!api?.verifyHash) {
    ElMessage.warning('MD5 校验功能仅在桌面应用中可用');
    return;
  }

  verifying.value = true;
  verifyResult.value = null;

  try {
    const res = await api.verifyHash({
      filePath: verifyFilePath.value,
      expectedHash: verifyExpectedHash.value.trim(),
      algorithm: verifyAlgorithm.value,
    });

    if (res.success !== undefined) {
      verifyResult.value = res.matched;
      verifyActualHash.value = res.actualHash ?? '';
      verifyFileName.value = verifyFilePath.value.split(/[/\\]/).pop() ?? verifyFilePath.value;

      if (res.matched) {
        ElNotification({
          title: '哈希匹配 ✅',
          message: '文件哈希值与期望值一致，文件完整',
          type: 'success',
          duration: 5000,
        });
        taskStore.addTask({ name: `哈希比对 - ${verifyFileName.value}`, module: 'MD5校验', status: 'completed' });
      } else {
        ElNotification({
          title: '哈希不匹配 ❌',
          message: '文件哈希值与期望值不一致，文件可能已被篡改',
          type: 'warning',
          duration: 8000,
        });
        taskStore.addTask({ name: `哈希比对 - ${verifyFileName.value}`, module: 'MD5校验', status: 'failed', error: '哈希值不匹配' });
      }
    } else {
      ElNotification({
        title: '比对失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 5000,
      });
      taskStore.addTask({ name: `哈希比对 - ${verifyFileName.value}`, module: 'MD5校验', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '比对异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 5000,
    });
  } finally {
    verifying.value = false;
  }
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function exportBatchCSV() {
  const header = '文件名,哈希值,算法,文件大小,耗时\n';
  const rows = batchResults.value.map(r =>
    `"${r.fileName}","${r.hash}","${r.algorithm}",${r.fileSize},${r.duration}`
  ).join('\n');
  const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `hash-results-${Date.now()}.csv`);
}

function exportBatchJSON() {
  const blob = new Blob([JSON.stringify(batchResults.value, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `hash-results-${Date.now()}.json`);
}

// ---------------------------------------------------------------------------
// MD5 清单导出
// ---------------------------------------------------------------------------

function exportMd5Manifest() {
  const algorithm = batchAlgorithm.value.toUpperCase();
  const header = [
    `# MD5 Manifest`,
    `# Algorithm: ${algorithm}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Format: fileName<TAB>hash`,
    `#`,
  ].join('\n');
  const rows = batchResults.value.map(r => `${r.fileName}\t${r.hash}`);
  const content = header + '\n' + rows.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, `md5-manifest-${Date.now()}.md5`);
  ElMessage.success('MD5 清单已导出');
  taskStore.addTask({ name: `导出MD5清单 - ${batchResults.value.length}个文件`, module: 'MD5校验', status: 'completed' });
}

// ---------------------------------------------------------------------------
// 归档报告
// ---------------------------------------------------------------------------

async function selectReportOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    ElMessage.warning('目录选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (dir) {
      const timestamp = new Date().toISOString().slice(0, 10);
      reportOutputPath.value = `${dir}/归档报告-${timestamp}.txt`;
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doGenerateReport(): Promise<void> {
  const api = getApi();
  if (!api?.generateMd5Report) {
    ElMessage.warning('报告生成功能仅在桌面应用中可用');
    return;
  }

  generatingReport.value = true;

  try {
    const res = await api.generateMd5Report({
      results: batchResults.value.map(r => ({ ...r })),
      options: {
        organization: reportOptions.value.organization,
        operator: reportOptions.value.operator,
        taskName: reportOptions.value.taskName,
      },
      outputPath: reportOutputPath.value,
    });

    if (res.success) {
      ElNotification({
        title: '报告生成成功',
        message: res.filePath ?? '报告已保存',
        type: 'success',
        duration: 5000,
      });
      showReportDialog.value = false;
      taskStore.addTask({ name: `生成归档报告 - ${reportOptions.value.taskName || '校验报告'}`, module: 'MD5校验', status: 'completed' });
    } else {
      ElNotification({
        title: '报告生成失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 5000,
      });
      taskStore.addTask({ name: `生成归档报告 - ${reportOptions.value.taskName || '校验报告'}`, module: 'MD5校验', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '报告生成异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 5000,
    });
  } finally {
    generatingReport.value = false;
  }
}

// ---------------------------------------------------------------------------
// 清单比对
// ---------------------------------------------------------------------------

async function selectManifestFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) {
    ElMessage.warning('文件选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'MD5 清单', extensions: ['md5', 'txt', 'manifest'] }],
    });
    if (files && files.length > 0) {
      manifestFilePath.value = files[0];
    }
  } catch (err: any) {
    ElMessage.error(`选择清单文件失败：${err.message ?? err}`);
  }
}

async function selectManifestDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    ElMessage.warning('目录选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (dir) {
      manifestDirPath.value = dir;
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doManifestCompare(): Promise<void> {
  if (!manifestFilePath.value || !manifestDirPath.value) return;
  const api = getApi();
  if (!api?.manifestCompare) {
    ElMessage.warning('清单比对功能仅在桌面应用中可用');
    return;
  }

  manifestComparing.value = true;
  manifestResult.value = null;

  try {
    const res = await api.manifestCompare({
      manifestPath: manifestFilePath.value,
      dirPath: manifestDirPath.value,
      algorithm: manifestAlgorithm.value,
    });

    if (res.success) {
      manifestResult.value = res.result as ManifestCompareResult;
      ElNotification({
        title: '清单比对完成',
        message: manifestSummary.value,
        type: res.result.modified.length === 0 && res.result.missing.length === 0 && res.result.added.length === 0 ? 'success' : 'warning',
        duration: 5000,
      });
      taskStore.addTask({ name: `清单比对 - ${getManifestDirName()}`, module: 'MD5校验', status: 'completed' });
    } else {
      ElNotification({
        title: '清单比对失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 5000,
      });
      taskStore.addTask({ name: `清单比对 - ${getManifestDirName()}`, module: 'MD5校验', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '清单比对异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 5000,
    });
  } finally {
    manifestComparing.value = false;
  }
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

.wt-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.input-with-btn {
  display: flex;
  gap: 8px;
  width: 100%;
}

.input-with-btn .el-input {
  flex: 1;
}

.hash-display {
  display: flex;
  gap: 8px;
  width: 100%;
}

.hash-display .hash-input {
  flex: 1;
}

.hash-input :deep(.el-input__inner) {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  color: #303133;
}

.hash-cell {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #606266;
}

.progress-text {
  font-size: 13px;
  color: #909399;
}

.verify-result {
  width: 100%;
}

.verify-pass,
.verify-fail {
  padding: 16px;
  border-radius: 8px;
}

.verify-pass {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}

.verify-fail {
  background: #fef0f0;
  border: 1px solid #fde2e2;
}

.verify-detail {
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
}

.hash-expected {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  color: #909399;
  word-break: break-all;
}

.hash-actual {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  color: #f56c6c;
  word-break: break-all;
}
</style>

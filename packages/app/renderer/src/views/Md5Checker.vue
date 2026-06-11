<template>
  <div class="module-page">
    <div class="page-header">
      <h2>🔒 MD5校验</h2>
      <p class="page-desc">生成文件哈希值，验证文件完整性，防止文件篡改</p>
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
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { CopyDocument } from '@element-plus/icons-vue';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
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
    } else {
      ElNotification({
        title: '计算失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 5000,
      });
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
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
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
    } else {
      ElNotification({
        title: '批量计算失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
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
      } else {
        ElNotification({
          title: '哈希不匹配 ❌',
          message: '文件哈希值与期望值不一致，文件可能已被篡改',
          type: 'warning',
          duration: 8000,
        });
      }
    } else {
      ElNotification({
        title: '比对失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 5000,
      });
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

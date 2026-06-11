<template>
  <div class="module-page">
    <div class="page-header">
      <h2>
        <template v-if="appStore.demoMode">🔐 质检文档加密归档</template>
        <template v-else>📄 PDF处理</template>
      </h2>
      <p class="page-desc" v-if="appStore.demoMode">
        质检完成后需要生成报告、加水印、加密归档。传统方式需切换多个工具，Ai质检平台一键完成。
      </p>
      <p class="page-desc" v-else>合并、拆分、加密、水印，一站式 PDF 文档处理</p>
    </div>

    <div class="wt-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- ============================================================ -->
        <!-- 合并 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="📑 合并" name="merge">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="mergeFileListText"
                  placeholder="请选择要合并的 PDF 文件（可多选）"
                  readonly
                />
                <el-button type="primary" @click="selectMergeFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <!-- 文件排序列表 -->
            <el-form-item v-if="mergeFiles.length > 0" label="文件顺序">
              <div class="file-order-list">
                <div
                  v-for="(file, idx) in mergeFiles"
                  :key="idx"
                  class="file-order-item"
                >
                  <span class="file-index">{{ idx + 1 }}</span>
                  <span class="file-name">{{ file }}</span>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="removeMergeFile(idx)"
                  />
                  <el-button
                    v-if="idx > 0"
                    :icon="Top"
                    circle
                    size="small"
                    @click="moveMergeFile(idx, idx - 1)"
                  />
                  <el-button
                    v-if="idx < mergeFiles.length - 1"
                    :icon="Bottom"
                    circle
                    size="small"
                    @click="moveMergeFile(idx, idx + 1)"
                  />
                </div>
              </div>
            </el-form-item>

            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input v-model="mergeOutput" placeholder="合并后的 PDF 输出路径" />
                <el-button @click="selectMergeOutput" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canMerge || processing"
                :loading="processing && activeAction === 'merge'"
                @click="doMerge"
              >
                {{ processing && activeAction === 'merge' ? '合并中...' : '开始合并' }}
              </el-button>
            </el-form-item>

            <!-- 进度 -->
            <el-form-item v-if="showProgress && activeAction === 'merge'">
              <el-progress
                :percentage="progressPercent"
                :stroke-width="16"
                :text-inside="true"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 拆分 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="✂️ 拆分" name="split">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input v-model="splitFilePath" placeholder="请选择要拆分的 PDF 文件" readonly />
                <el-button type="primary" @click="selectSplitFile" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="拆分模式">
              <el-radio-group v-model="splitMode" :disabled="processing">
                <el-radio value="pages">每 N 页拆分为一个文件</el-radio>
                <el-radio value="range">按页码范围拆分</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="splitMode === 'pages'" label="每份页数">
              <el-input-number
                v-model="splitPagesPerPart"
                :min="1"
                :max="999"
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item v-if="splitMode === 'range'" label="页码范围">
              <div class="range-list">
                <div
                  v-for="(range, idx) in splitRanges"
                  :key="idx"
                  class="range-item"
                >
                  <span>第</span>
                  <el-input-number
                    v-model="range.start"
                    :min="1"
                    size="small"
                    style="width: 100px"
                    :disabled="processing"
                  />
                  <span>页 — 第</span>
                  <el-input-number
                    v-model="range.end"
                    :min="1"
                    size="small"
                    style="width: 100px"
                    :disabled="processing"
                  />
                  <span>页</span>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="splitRanges.splice(idx, 1)"
                    :disabled="processing"
                  />
                </div>
                <el-button
                  type="primary"
                  :icon="Plus"
                  size="small"
                  @click="splitRanges.push({ start: 1, end: 1 })"
                  :disabled="processing"
                >
                  添加范围
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="输出目录">
              <div class="input-with-btn">
                <el-input v-model="splitOutputDir" placeholder="拆分文件输出目录" readonly />
                <el-button @click="selectSplitOutputDir" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canSplit || processing"
                :loading="processing && activeAction === 'split'"
                @click="doSplit"
              >
                {{ processing && activeAction === 'split' ? '拆分中...' : '开始拆分' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 加密 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="🔒 加密" name="encrypt">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="encryptFilePath"
                  placeholder="请选择要加密的 PDF 文件"
                  readonly
                />
                <el-button type="primary" @click="selectEncryptFile" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="用户密码">
              <el-input
                v-model="encryptPassword"
                type="password"
                placeholder="打开文档所需的密码"
                show-password
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="所有者密码">
              <el-input
                v-model="encryptOwnerPassword"
                type="password"
                placeholder="修改权限所需密码（留空则同用户密码）"
                show-password
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="权限设置">
              <el-checkbox-group v-model="encryptPermissions" :disabled="processing">
                <el-checkbox value="print" label="允许打印" />
                <el-checkbox value="modify" label="允许修改" />
                <el-checkbox value="copy" label="允许复制" />
              </el-checkbox-group>
            </el-form-item>

            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input v-model="encryptOutput" placeholder="加密后的 PDF 输出路径" />
                <el-button @click="selectEncryptOutput" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canEncrypt || processing"
                :loading="processing && activeAction === 'encrypt'"
                @click="doEncrypt"
              >
                {{ processing && activeAction === 'encrypt' ? '加密中...' : '加密' }}
              </el-button>
            </el-form-item>

            <!-- 解密区域 -->
            <el-divider content-position="left">解密</el-divider>

            <el-form-item label="加密文件">
              <div class="input-with-btn">
                <el-input
                  v-model="decryptFilePath"
                  placeholder="请选择要解密的 PDF 文件"
                  readonly
                />
                <el-button type="primary" @click="selectDecryptFile" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="密码">
              <el-input
                v-model="decryptPassword"
                type="password"
                placeholder="输入解密密码"
                show-password
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input v-model="decryptOutput" placeholder="解密后的 PDF 输出路径" />
                <el-button @click="selectDecryptOutput" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canDecrypt || processing"
                :loading="processing && activeAction === 'decrypt'"
                @click="doDecrypt"
              >
                {{ processing && activeAction === 'decrypt' ? '解密中...' : '解密' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 水印 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="💧 水印" name="watermark">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="watermarkFilePath"
                  placeholder="请选择要添加水印的 PDF 文件"
                  readonly
                />
                <el-button type="primary" @click="selectWatermarkFile" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="水印文字">
              <el-input
                v-model="watermarkText"
                placeholder="请输入水印文字内容"
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="位置">
              <el-select v-model="watermarkPosition" :disabled="processing" style="width: 180px">
                <el-option label="居中" value="center" />
                <el-option label="左上角" value="top-left" />
                <el-option label="右上角" value="top-right" />
                <el-option label="左下角" value="bottom-left" />
                <el-option label="右下角" value="bottom-right" />
              </el-select>
            </el-form-item>

            <el-form-item label="透明度">
              <el-slider
                v-model="watermarkOpacity"
                :min="0.05"
                :max="1"
                :step="0.05"
                :disabled="processing"
                :format-tooltip="(v: number) => `${Math.round(v * 100)}%`"
                style="width: 300px"
              />
            </el-form-item>

            <el-form-item label="旋转角度">
              <el-input-number
                v-model="watermarkRotation"
                :min="0"
                :max="360"
                :disabled="processing"
              />
              <span style="margin-left: 8px; color: #999">度</span>
            </el-form-item>

            <el-form-item label="字体大小">
              <el-input-number
                v-model="watermarkFontSize"
                :min="8"
                :max="200"
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input
                  v-model="watermarkOutput"
                  placeholder="带水印的 PDF 输出路径"
                />
                <el-button @click="selectWatermarkOutput" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canWatermark || processing"
                :loading="processing && activeAction === 'watermark'"
                @click="doWatermark"
              >
                {{ processing && activeAction === 'watermark' ? '添加中...' : '添加水印' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useAppStore } from '@/stores/app';
import { Delete, Top, Bottom, Plus } from '@element-plus/icons-vue';
import { COMPARISON_DATA, type ComparisonData } from '@/utils/demo-scenarios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SplitRange {
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// Common State
// ---------------------------------------------------------------------------

const activeTab = ref('merge');
const processing = ref(false);
const activeAction = ref('');
const showProgress = ref(false);
const appStore = useAppStore();

onMounted(() => {
  const scenario = sessionStorage.getItem('demoScenario');
  if (scenario === 'doc-archive') {
    sessionStorage.removeItem('demoScenario');
    // 演示模式下预填示例值
    activeTab.value = 'watermark';
  }
});
const progressPercent = ref(0);

// ---------------------------------------------------------------------------
// Merge State
// ---------------------------------------------------------------------------

const mergeFiles = ref<string[]>([]);
const mergeFileListText = ref('');
const mergeOutput = ref('');

const canMerge = computed(
  () => mergeFiles.value.length >= 2 && mergeOutput.value.trim().length > 0,
);

// ---------------------------------------------------------------------------
// Split State
// ---------------------------------------------------------------------------

const splitFilePath = ref('');
const splitMode = ref<'pages' | 'range'>('pages');
const splitPagesPerPart = ref(1);
const splitRanges = ref<SplitRange[]>([{ start: 1, end: 1 }]);
const splitOutputDir = ref('');

const canSplit = computed(() => {
  if (!splitFilePath.value || !splitOutputDir.value) return false;
  if (splitMode.value === 'pages') return splitPagesPerPart.value >= 1;
  return splitRanges.value.length > 0;
});

// ---------------------------------------------------------------------------
// Encrypt State
// ---------------------------------------------------------------------------

const encryptFilePath = ref('');
const encryptPassword = ref('');
const encryptOwnerPassword = ref('');
const encryptPermissions = ref<string[]>([]);
const encryptOutput = ref('');

const canEncrypt = computed(
  () =>
    encryptFilePath.value.length > 0 &&
    encryptPassword.value.length > 0 &&
    encryptOutput.value.length > 0,
);

// Decrypt
const decryptFilePath = ref('');
const decryptPassword = ref('');
const decryptOutput = ref('');

const canDecrypt = computed(
  () =>
    decryptFilePath.value.length > 0 &&
    decryptPassword.value.length > 0 &&
    decryptOutput.value.length > 0,
);

// ---------------------------------------------------------------------------
// Watermark State
// ---------------------------------------------------------------------------

const watermarkFilePath = ref('');
const watermarkText = ref('');
const watermarkPosition = ref<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center');
const watermarkOpacity = ref(0.3);
const watermarkRotation = ref(45);
const watermarkFontSize = ref(48);
const watermarkOutput = ref('');

const canWatermark = computed(
  () =>
    watermarkFilePath.value.length > 0 &&
    watermarkText.value.length > 0 &&
    watermarkOutput.value.length > 0,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

// ---------------------------------------------------------------------------
// Merge Actions
// ---------------------------------------------------------------------------

async function selectMergeFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) {
    ElMessage.warning('文件选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectFile({
      filters: [
        { name: 'PDF 文件', extensions: ['pdf'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      mergeFiles.value = [...mergeFiles.value, ...files];
      mergeFileListText.value = mergeFiles.value.join('; ');
      // 自动设置输出路径
      if (!mergeOutput.value) {
        const first = files[0];
        const dir = first.substring(0, first.lastIndexOf('/') !== -1 ? first.lastIndexOf('/') : first.lastIndexOf('\\'));
        mergeOutput.value = `${dir}/merged.pdf`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeMergeFile(idx: number): void {
  mergeFiles.value.splice(idx, 1);
  mergeFileListText.value = mergeFiles.value.join('; ');
}

function moveMergeFile(from: number, to: number): void {
  const item = mergeFiles.value.splice(from, 1)[0];
  if (item) {
    mergeFiles.value.splice(to, 0, item);
    mergeFileListText.value = mergeFiles.value.join('; ');
  }
}

async function selectMergeOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    ElMessage.warning('目录选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (dir) {
      mergeOutput.value = `${dir}/merged.pdf`;
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doMerge(): Promise<void> {
  if (!canMerge.value) return;
  const api = getApi();
  if (!api?.mergePdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'merge';
  showProgress.value = true;
  progressPercent.value = 0;

  try {
    // 监听进度
    let cleanup: (() => void) | null = null;
    if (api.onPdfProgress) {
      cleanup = api.onPdfProgress((data: { percent: number }) => {
        progressPercent.value = data.percent;
      });
    }

    const res = await api.mergePdf({
      filePaths: mergeFiles.value,
      outputPath: mergeOutput.value,
    });

    if (cleanup) cleanup();

    if (res.success) {
      ElNotification({
        title: '合并完成',
        message: `已生成 ${res.result.totalPages} 页 PDF → ${getFileName(mergeOutput.value)}`,
        type: 'success',
        duration: 5000,
      });
    } else {
      ElNotification({
        title: '合并失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    ElNotification({
      title: '合并异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}

// ---------------------------------------------------------------------------
// Split Actions
// ---------------------------------------------------------------------------

async function selectSplitFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });
    if (files && files.length > 0) {
      splitFilePath.value = files[0];
      if (!splitOutputDir.value) {
        const dir = files[0].substring(0, files[0].lastIndexOf('/') !== -1 ? files[0].lastIndexOf('/') : files[0].lastIndexOf('\\'));
        splitOutputDir.value = `${dir}/split-output`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function selectSplitOutputDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) splitOutputDir.value = dir;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doSplit(): Promise<void> {
  if (!canSplit.value) return;
  const api = getApi();
  if (!api?.splitPdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'split';

  const options =
    splitMode.value === 'pages'
      ? { mode: 'pages' as const, pagesPerPart: splitPagesPerPart.value }
      : { mode: 'range' as const, ranges: splitRanges.value };

  try {
    const res = await api.splitPdf({
      filePath: splitFilePath.value,
      outputDir: splitOutputDir.value,
      options,
    });

    if (res.success) {
      ElNotification({
        title: '拆分完成',
        message: `已生成 ${res.outputPaths.length} 个文件`,
        type: 'success',
        duration: 5000,
      });
    } else {
      ElNotification({
        title: '拆分失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    ElNotification({
      title: '拆分异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
  }
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt Actions
// ---------------------------------------------------------------------------

async function selectEncryptFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });
    if (files && files.length > 0) {
      encryptFilePath.value = files[0];
      if (!encryptOutput.value) {
        encryptOutput.value = files[0].replace(/\.pdf$/i, '-encrypted.pdf');
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function selectEncryptOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) encryptOutput.value = `${dir}/encrypted.pdf`;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doEncrypt(): Promise<void> {
  if (!canEncrypt.value) return;
  const api = getApi();
  if (!api?.encryptPdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'encrypt';

  try {
    const res = await api.encryptPdf({
      filePath: encryptFilePath.value,
      outputPath: encryptOutput.value,
      options: {
        userPassword: encryptPassword.value,
        ownerPassword: encryptOwnerPassword.value || undefined,
        canPrint: encryptPermissions.value.includes('print'),
        canModify: encryptPermissions.value.includes('modify'),
        canCopy: encryptPermissions.value.includes('copy'),
      },
    });

    if (res.success) {
      ElNotification({
        title: '加密完成',
        message: `已生成加密文件 → ${getFileName(encryptOutput.value)}`,
        type: 'success',
        duration: 5000,
      });
    } else {
      ElNotification({
        title: '加密失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    ElNotification({
      title: '加密异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
  }
}

async function selectDecryptFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });
    if (files && files.length > 0) {
      decryptFilePath.value = files[0];
      if (!decryptOutput.value) {
        decryptOutput.value = files[0].replace(/\.pdf$/i, '-decrypted.pdf');
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function selectDecryptOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) decryptOutput.value = `${dir}/decrypted.pdf`;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doDecrypt(): Promise<void> {
  if (!canDecrypt.value) return;
  const api = getApi();
  if (!api?.decryptPdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'decrypt';

  try {
    const res = await api.decryptPdf({
      filePath: decryptFilePath.value,
      password: decryptPassword.value,
      outputPath: decryptOutput.value,
    });

    if (res.success) {
      ElNotification({
        title: '解密完成',
        message: `已生成解密文件 → ${getFileName(decryptOutput.value)}`,
        type: 'success',
        duration: 5000,
      });
    } else {
      ElNotification({
        title: '解密失败',
        message: res.error ?? '未知错误（密码可能不正确）',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    ElNotification({
      title: '解密异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
  }
}

// ---------------------------------------------------------------------------
// Watermark Actions
// ---------------------------------------------------------------------------

async function selectWatermarkFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });
    if (files && files.length > 0) {
      watermarkFilePath.value = files[0];
      if (!watermarkOutput.value) {
        watermarkOutput.value = files[0].replace(/\.pdf$/i, '-watermarked.pdf');
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function selectWatermarkOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) watermarkOutput.value = `${dir}/watermarked.pdf`;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doWatermark(): Promise<void> {
  if (!canWatermark.value) return;
  const api = getApi();
  if (!api?.watermarkPdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'watermark';

  try {
    const res = await api.watermarkPdf({
      filePath: watermarkFilePath.value,
      outputPath: watermarkOutput.value,
      options: {
        text: watermarkText.value,
        position: watermarkPosition.value,
        opacity: watermarkOpacity.value,
        rotation: watermarkRotation.value,
        fontSize: watermarkFontSize.value,
      },
    });

    if (res.success) {
      ElNotification({
        title: '水印添加完成',
        message: `已生成带水印文件 → ${getFileName(watermarkOutput.value)}`,
        type: 'success',
        duration: 5000,
      });
    } else {
      ElNotification({
        title: '水印添加失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
    }
  } catch (err: any) {
    ElNotification({
      title: '水印异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
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

.file-order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.file-order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
}

.file-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}

.range-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}
</style>

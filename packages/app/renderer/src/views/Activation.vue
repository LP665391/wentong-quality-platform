<template>
  <div class="activation-page">
    <div class="activation-header">
      <h1>Ai质检平台 — 软件授权激活</h1>
      <p class="subtitle">请选择激活方式以开始使用</p>
    </div>

    <!-- 激活步骤 -->
    <el-steps :active="currentStep" align-center class="activation-steps">
      <el-step title="选择方式" />
      <el-step title="执行激活" />
      <el-step title="完成" />
    </el-steps>

    <!-- 步骤 1：选择激活方式 -->
    <div v-if="currentStep === 0" class="step-content">
      <div class="activation-cards">
        <!-- 联网激活 -->
        <el-card
          class="activation-card"
          :class="{ selected: selectedMethod === 'online' }"
          shadow="hover"
          @click="selectedMethod = 'online'"
        >
          <template #header>
            <div class="card-header">
              <el-icon :size="28"><Connection /></el-icon>
              <span>联网激活</span>
            </div>
          </template>
          <p>通过授权码联网激活，自动绑定当前机器。需要网络连接。</p>
        </el-card>

        <!-- 离线激活 -->
        <el-card
          class="activation-card"
          :class="{ selected: selectedMethod === 'offline' }"
          shadow="hover"
          @click="selectedMethod = 'offline'"
        >
          <template #header>
            <div class="card-header">
              <el-icon :size="28"><Document /></el-icon>
              <span>离线激活</span>
            </div>
          </template>
          <p>导入许可证文件，可离线完成激活。需要先获取许可证文件。</p>
        </el-card>

        <!-- 试用 -->
        <el-card
          class="activation-card"
          :class="{ selected: selectedMethod === 'trial' }"
          shadow="hover"
          @click="selectedMethod = 'trial'"
        >
          <template #header>
            <div class="card-header">
              <el-icon :size="28"><Clock /></el-icon>
              <span>免费试用</span>
            </div>
          </template>
          <p>开始 30 天全功能免费试用，无需任何授权码。到期后可购买正式授权。</p>
        </el-card>
      </div>

      <div class="step-actions">
        <el-button
          type="primary"
          size="large"
          :disabled="!selectedMethod"
          @click="goToStep(1)"
        >
          下一步
        </el-button>
      </div>
    </div>

    <!-- 步骤 2：执行激活 -->
    <div v-if="currentStep === 1" class="step-content">
      <!-- 联网激活 -->
      <div v-if="selectedMethod === 'online'">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon :size="20"><Connection /></el-icon>
              <span>联网激活</span>
            </div>
          </template>
          <el-form label-width="100px" :model="onlineForm" @submit.prevent>
            <el-form-item label="授权码" required>
              <el-input
                v-model="onlineForm.licenseKey"
                placeholder="请输入授权码 (格式: WT-XXXXXX-XXXXXXXX)"
                clearable
              />
            </el-form-item>
            <el-form-item label="客户名称">
              <el-input v-model="onlineForm.customerName" placeholder="可选" clearable />
            </el-form-item>
            <el-form-item label="公司名称">
              <el-input v-model="onlineForm.company" placeholder="可选" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="activatingOnline" @click="handleActivateOnline">
                激活
              </el-button>
              <el-button @click="goToStep(0)">返回</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <!-- 离线激活 -->
      <div v-else-if="selectedMethod === 'offline'">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon :size="20"><Document /></el-icon>
              <span>离线激活</span>
            </div>
          </template>
          <div class="offline-section">
            <h4>1. 复制机器码</h4>
            <p>将此机器码发送给管理员以获取许可证文件。</p>
            <div class="machine-id-box">
              <code>{{ machineId }}</code>
              <el-button
                type="primary"
                size="small"
                :icon="CopyDocument"
                @click="copyMachineId"
              >
                复制机器码
              </el-button>
            </div>
          </div>

          <el-divider />

          <div class="offline-section">
            <h4>2. 导入许可证文件</h4>
            <p>选择从管理员处获取的 .dat 许可证文件。</p>
            <div class="file-upload-area">
              <el-upload
                drag
                :auto-upload="false"
                :on-change="handleFileChange"
                :limit="1"
                accept=".dat"
              >
                <el-icon :size="40"><UploadFilled /></el-icon>
                <div class="el-upload__text">
                  将许可证文件拖到此处，或<em>点击浏览</em>
                </div>
              </el-upload>
            </div>
          </div>

          <div class="step-actions" style="margin-top: 16px">
            <el-button
              type="primary"
              :loading="activatingOffline"
              :disabled="!selectedFile"
              @click="handleActivateOffline"
            >
              导入并激活
            </el-button>
            <el-button @click="goToStep(0)">返回</el-button>
          </div>
        </el-card>
      </div>

      <!-- 试用 -->
      <div v-else-if="selectedMethod === 'trial'">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon :size="20"><Clock /></el-icon>
              <span>免费试用</span>
            </div>
          </template>
          <div class="trial-info">
            <el-icon :size="48" color="#67c23a"><CircleCheckFilled /></el-icon>
            <h3>30 天全功能免费试用</h3>
            <ul>
              <li>所有功能均可使用</li>
              <li>无使用次数限制</li>
              <li>到期后可购买正式授权继续使用</li>
              <li>购买授权后试用数据可无缝迁移</li>
            </ul>
          </div>
          <div class="step-actions" style="margin-top: 16px">
            <el-button
              type="success"
              size="large"
              :loading="startingTrial"
              @click="handleStartTrial"
            >
              开始 30 天免费试用
            </el-button>
            <el-button @click="goToStep(0)">返回</el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 步骤 3：激活结果 -->
    <div v-if="currentStep === 2" class="step-content">
      <el-result
        v-if="activationResult === 'success'"
        icon="success"
        title="激活成功"
        :sub-title="activationMessage"
      >
        <template #extra>
          <el-button type="primary" @click="enterApp">进入应用</el-button>
        </template>
      </el-result>

      <el-result
        v-else-if="activationResult === 'trial'"
        icon="success"
        title="试用已开始"
        :sub-title="activationMessage"
      >
        <template #extra>
          <el-button type="primary" @click="enterApp">进入应用</el-button>
        </template>
      </el-result>

      <el-result
        v-else-if="activationResult === 'error'"
        icon="error"
        title="激活失败"
        :sub-title="activationMessage"
      >
        <template #extra>
          <el-button type="primary" @click="retryActivation">重新尝试</el-button>
          <el-button @click="goToStep(0)">选择其他方式</el-button>
        </template>
      </el-result>
    </div>

    <!-- 已激活状态 -->
    <div v-if="isAlreadyActivated" class="step-content">
      <el-result icon="success" title="已激活">
        <template #sub-title>
          <div class="activated-info">
            <el-descriptions :column="2" border size="large">
              <el-descriptions-item label="客户名称">
                {{ licenseInfo?.customerName }}
              </el-descriptions-item>
              <el-descriptions-item label="公司">
                {{ licenseInfo?.company || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="许可证类型">
                <el-tag :type="licenseInfo?.type === 'permanent' ? 'success' : 'warning'">
                  {{ licenseInfo?.type === 'permanent' ? '永久授权' : '试用授权' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="有效期">
                {{ licenseInfo?.expireDate ?? '永久有效' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
        <template #extra>
          <el-button type="primary" @click="enterApp">进入应用</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Connection,
  Document,
  Clock,
  CopyDocument,
  UploadFilled,
  CircleCheckFilled,
} from '@element-plus/icons-vue';

const router = useRouter();

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------

const currentStep = ref(0);
const selectedMethod = ref<'online' | 'offline' | 'trial' | null>(null);
const activatingOnline = ref(false);
const activatingOffline = ref(false);
const startingTrial = ref(false);
const activationResult = ref<'success' | 'trial' | 'error' | null>(null);
const activationMessage = ref('');
const machineId = ref('');
const licenseInfo = ref<any>(null);
const isAlreadyActivated = ref(false);
const selectedFile = ref<File | null>(null);

const onlineForm = ref({
  licenseKey: '',
  customerName: '',
  company: '',
});

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

onMounted(async () => {
  // 获取机器 ID
  machineId.value = (await window.api?.invoke?.('auth:getMachineId') as unknown as string) ?? '无法获取';

  // 检查激活状态
  try {
    const status: any = await window.api?.invoke?.('auth:getStatus');
    if (status?.activated) {
      isAlreadyActivated.value = true;
      licenseInfo.value = status.licenseInfo;
    }
  } catch {
    // IPC 不可用时忽略
  }
});

// ---------------------------------------------------------------------------
// 方法
// ---------------------------------------------------------------------------

function goToStep(step: number) {
  currentStep.value = step;
}

function copyMachineId() {
  navigator.clipboard.writeText(machineId.value).then(() => {
    ElMessage.success('机器码已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制');
  });
}

function handleFileChange(file: any) {
  selectedFile.value = file.raw;
}

async function handleActivateOnline() {
  if (!onlineForm.value.licenseKey.trim()) {
    ElMessage.warning('请输入授权码');
    return;
  }

  activatingOnline.value = true;
  try {
    // 调用主进程 IPC
    const result: any = await window.api?.invoke?.('auth:activate', {
      method: 'online',
      licenseKey: onlineForm.value.licenseKey,
    });

    if (result?.success) {
      licenseInfo.value = result.licenseInfo;
      activationResult.value = 'success';
      activationMessage.value = `欢迎 ${result.licenseInfo.customerName}！许可证已激活。`;
      currentStep.value = 2;
    } else {
      throw new Error(result?.error ?? '激活失败');
    }
  } catch (err: any) {
    activationResult.value = 'error';
    activationMessage.value = err.message ?? '联网激活失败，请检查授权码和网络连接。';
    currentStep.value = 2;
  } finally {
    activatingOnline.value = false;
  }
}

async function handleActivateOffline() {
  if (!selectedFile.value) {
    ElMessage.warning('请选择许可证文件');
    return;
  }

  activatingOffline.value = true;
  try {
    // 读取文件内容并通过 IPC 发送
    const fileContent = await selectedFile.value.text();

    const result: any = await window.api?.invoke?.('auth:activate', {
      method: 'offline',
      fileContent,
    });

    if (result?.success) {
      licenseInfo.value = result.licenseInfo;
      activationResult.value = 'success';
      activationMessage.value = `欢迎 ${result.licenseInfo.customerName}！离线激活成功。`;
      currentStep.value = 2;
    } else {
      throw new Error(result?.error ?? '激活失败');
    }
  } catch (err: any) {
    activationResult.value = 'error';
    activationMessage.value = err.message ?? '离线激活失败，请检查许可证文件。';
    currentStep.value = 2;
  } finally {
    activatingOffline.value = false;
  }
}

async function handleStartTrial() {
  startingTrial.value = true;
  try {
    const result: any = await window.api?.invoke?.('auth:startTrial');

    if (result?.success) {
      activationResult.value = 'trial';
      activationMessage.value = `试用已开始！剩余 ${result.trialInfo.remainingDays} 天。`;
      currentStep.value = 2;
    } else {
      throw new Error(result?.error ?? '开始试用失败');
    }
  } catch (err: any) {
    activationResult.value = 'error';
    activationMessage.value = err.message ?? '开始试用失败。';
    currentStep.value = 2;
  } finally {
    startingTrial.value = false;
  }
}

function enterApp() {
  router.push('/');
}

function retryActivation() {
  activationResult.value = null;
  currentStep.value = 0;
  selectedFile.value = null;
}
</script>

<style scoped>
.activation-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.activation-header {
  text-align: center;
  margin-bottom: 32px;
}

.activation-header h1 {
  font-size: 24px;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.activation-steps {
  margin-bottom: 40px;
}

.step-content {
  margin-top: 24px;
}

/* 选择激活方式卡片 */
.activation-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.activation-card {
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.activation-card:hover {
  transform: translateY(-2px);
}

.activation-card.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

/* 机器码 */
.machine-id-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}

.machine-id-box code {
  font-size: 14px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  flex: 1;
  user-select: all;
}

/* 文件上传 */
.file-upload-area {
  margin-top: 12px;
}

/* 试用信息 */
.trial-info {
  text-align: center;
  padding: 16px 0;
}

.trial-info h3 {
  margin: 12px 0;
  font-size: 18px;
}

.trial-info ul {
  list-style: none;
  padding: 0;
}

.trial-info li {
  padding: 4px 0;
  color: var(--el-text-color-regular);
}

.trial-info li::before {
  content: '✓ ';
  color: var(--el-color-success);
  font-weight: bold;
}

/* 操作按钮 */
.step-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

/* 已激活信息 */
.activated-info {
  margin-top: 16px;
  max-width: 600px;
}

.offline-section {
  margin-bottom: 8px;
}

.offline-section h4 {
  margin-bottom: 4px;
}

@media (max-width: 640px) {
  .activation-cards {
    grid-template-columns: 1fr;
  }
}
</style>

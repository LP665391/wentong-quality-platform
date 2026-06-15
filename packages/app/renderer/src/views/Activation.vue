<template>
  <div class="activation-page">
    <div class="activation-header">
      <h1>Ai 质检系统 — 软件授权激活</h1>
      <p class="subtitle">连云港文安档案科技有限公司</p>
      <p class="subtitle" style="font-size:13px;color:#8c8c8c;margin-top:4px;">请选择激活方式以开始使用</p>
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
          <p>开始 7 天全功能免费试用，无需任何授权码。到期后可购买正式授权。</p>
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
            <h4>2. 导入许可证</h4>
            <p style="margin-bottom: 12px;">选择 .dat 文件，或直接粘贴许可证内容。</p>

            <!-- 粘贴方式 -->
            <div class="paste-section">
              <el-input
                v-model="pasteContent"
                type="textarea"
                :rows="4"
                placeholder="将管理员发给您的许可证内容（JSON文本）直接粘贴到这里..."
                clearable
                @input="onPasteInput"
              />
              <p class="paste-hint" v-if="pasteContent">
                <span class="paste-status">✓ 已读取许可证内容</span>
              </p>
            </div>

            <el-divider style="margin: 8px 0;">
              <span style="font-size: 12px; color: #94a3b8;">或</span>
            </el-divider>

            <!-- 文件上传方式 -->
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
                  将 .dat 许可证文件拖到此处，或<em>点击浏览</em>
                </div>
              </el-upload>
            </div>
          </div>

          <div class="step-actions" style="margin-top: 16px">
            <el-button
              type="primary"
              :loading="activatingOffline"
              :disabled="!selectedFile && !pasteContent"
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
            <h3>7 天全功能免费试用</h3>
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
              开始 7 天免费试用
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
              <el-descriptions-item v-if="isTrialLicense" label="剩余天数" :span="2">
                <div class="trial-countdown">
                  <el-progress 
                    :percentage="trialPercentage" 
                    :color="trialProgressColor"
                    :stroke-width="20"
                    :text-inside="true"
                    :format="() => `${trialRemainingDays} 天`"
                  />
                  <p class="trial-expire-tip" v-if="trialRemainingDays <= 7">
                    ⚠️ 试用即将到期，请及时购买正式授权
                  </p>
                </div>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
        <template #extra>
          <el-button type="primary" @click="enterApp">进入应用</el-button>
          <el-button v-if="isTrialLicense && trialRemainingDays <= 7" type="warning" @click="showPurchaseDialog">
            购买正式授权
          </el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
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
const pasteContent = ref('');
const trialRemainingDays = ref(7);
const trialTotalDays = 7;
let trialTimer: ReturnType<typeof setInterval> | null = null;

const onlineForm = ref({
  licenseKey: '',
  customerName: '',
  company: '',
});

// ---------------------------------------------------------------------------
// 计算属性
// ---------------------------------------------------------------------------

const isTrialLicense = computed(() => licenseInfo.value?.type === 'trial');

const trialPercentage = computed(() => {
  return Math.round((trialRemainingDays.value / trialTotalDays) * 100);
});

const trialProgressColor = computed(() => {
  if (trialRemainingDays.value <= 3) return '#f56c6c'; // 红色
  if (trialRemainingDays.value <= 7) return '#e6a23c'; // 橙色
  return '#67c23a'; // 绿色
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
      
      // 如果是试用授权，获取剩余天数
      if (status.licenseInfo?.type === 'trial') {
        const trialInfo: any = await window.api?.invoke?.('auth:getTrialInfo');
        if (trialInfo) {
          trialRemainingDays.value = trialInfo.remainingDays ?? 30;
        }
        // 启动定时器，每分钟更新一次
        trialTimer = setInterval(async () => {
          const info: any = await window.api?.invoke?.('auth:getTrialInfo');
          if (info) {
            trialRemainingDays.value = info.remainingDays ?? 30;
          }
        }, 60000);
      }
    }
  } catch {
    // IPC 不可用时忽略
  }
});

onUnmounted(() => {
  if (trialTimer) {
    clearInterval(trialTimer);
    trialTimer = null;
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
  pasteContent.value = '';
}

function onPasteInput() {
  if (pasteContent.value) {
    selectedFile.value = null;
  }
}

async function handleActivateOnline() {
  if (!onlineForm.value.licenseKey.trim()) {
    ElMessage.warning('请输入授权码');
    return;
  }

  activatingOnline.value = true;
  try {
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
  let fileContent: string | null = null;
  if (pasteContent.value.trim()) {
    fileContent = pasteContent.value.trim();
  } else if (selectedFile.value) {
    fileContent = await selectedFile.value.text();
  }
  if (!fileContent) {
    ElMessage.warning('请粘贴许可证内容或选择许可证文件');
    return;
  }

  activatingOffline.value = true;
  try {
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

function showPurchaseDialog() {
  ElMessageBox.alert(
    '试用期即将到期，请联系销售获取正式授权：<br/><br/>📞 183 5281 1015<br/>📧 连云港文安档案科技有限公司',
    '购买正式授权',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '我知道了',
      type: 'warning',
    }
  );
}
</script>

<style scoped>
.activation-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.activation-header {
  text-align: center;
  margin-bottom: 32px;
}

.activation-header h1 {
  font-size: 24px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 300;
}

.activation-steps {
  margin-bottom: 40px;
}

.step-content {
  margin-top: 24px;
}

/* 选择激活方式卡片 — Stripe 风格 */
.activation-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.activation-card {
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.activation-card :deep(.el-card__body) {
  padding: 20px;
}

.activation-card:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(83, 58, 253, 0.2);
}

.activation-card.selected {
  border-color: var(--color-primary);
  background-color: rgba(83, 58, 253, 0.04);
  box-shadow: 0 0 0 2px rgba(83, 58, 253, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 400;
  font-size: 16px;
  color: var(--text-primary);
  border-bottom: none;
  padding-bottom: 0;
}

.card-header :deep(.el-icon) {
  color: var(--color-primary);
  font-size: 24px;
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

/* 粘贴输入区域 */
.paste-section {
  margin-bottom: 4px;
}

.paste-section :deep(.el-textarea__inner) {
  font-family: 'SF Mono', 'Fira Code', 'Source Sans 3', monospace;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 6px;
  border-color: var(--border-color);
  transition: border-color var(--transition-fast);
}

.paste-section :deep(.el-textarea__inner:focus) {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(83, 58, 253, 0.1);
}

.paste-hint {
  margin-top: 6px;
  font-size: 13px;
}

.paste-status {
  color: var(--color-success);
  font-weight: 400;
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

/* 试用期倒计时 */
.trial-countdown {
  width: 100%;
  padding: 8px 0;
}

.trial-countdown .el-progress {
  width: 100%;
}

.trial-expire-tip {
  margin-top: 12px;
  color: #e6a23c;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
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

<template>
  <div class="module-page">
    <div class="page-header">
      <h2>⚙️ 系统设置</h2>
      <p class="page-desc">配置应用基础参数，个性化你的使用体验</p>
    </div>

    <div class="wt-card">
      <el-form label-width="140px" label-position="left" class="settings-form">
        <!-- 语言 -->
        <el-form-item label="界面语言">
          <el-select v-model="language" style="width: 240px">
            <el-option label="简体中文" value="zh-CN" />
            <el-option label="English" value="en-US" />
          </el-select>
        </el-form-item>

        <!-- 主题 -->
        <el-form-item label="主题模式">
          <el-radio-group v-model="theme">
            <el-radio value="light">浅色模式</el-radio>
            <el-radio value="dark">深色模式</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 默认输出目录 -->
        <el-form-item label="默认输出目录">
          <el-input
            v-model="outputDir"
            placeholder="请选择默认输出目录"
            style="width: 360px"
            readonly
          >
            <template #append>
              <el-button @click="browseDirectory">浏览</el-button>
            </template>
          </el-input>
        </el-form-item>

        <!-- 最大并发任务数 -->
        <el-form-item label="最大并发任务数">
          <el-input-number
            v-model="maxConcurrency"
            :min="1"
            :max="10"
            :step="1"
          />
        </el-form-item>

        <!-- 保存按钮 -->
        <el-form-item>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
          <el-button @click="restoreDefaults">恢复默认</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

// ---------------------------------------------------------------------------
// 默认值
// ---------------------------------------------------------------------------

// 与 AppConfig 接口保持一致
const DEFAULTS = {
  language: 'zh-CN',
  theme: 'light' as 'light' | 'dark',
  defaultOutputDir: '',
  maxConcurrentTasks: 4,
};

// ---------------------------------------------------------------------------
// 响应式状态
// ---------------------------------------------------------------------------

const language = ref(DEFAULTS.language);
const theme = ref<'light' | 'dark'>(DEFAULTS.theme);
const outputDir = ref(DEFAULTS.defaultOutputDir);
const maxConcurrency = ref(DEFAULTS.maxConcurrentTasks);
const saving = ref(false);

// ---------------------------------------------------------------------------
// 获取 API（兼容 electronAPI 和 api 两种命名）
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI ?? (window as any).api;
}

// ---------------------------------------------------------------------------
// 生命周期：加载已保存的配置
// ---------------------------------------------------------------------------

onMounted(async () => {
  const api = getApi();
  if (!api) return;

  try {
    const [lang, thm, dir, conc] = await Promise.all([
      api.getConfig?.('language').catch(() => null),
      api.getConfig?.('theme').catch(() => null),
      api.getConfig?.('defaultOutputDir').catch(() => null),
      api.getConfig?.('maxConcurrentTasks').catch(() => null),
    ]);

    if (lang) language.value = lang as string;
    if (thm) theme.value = thm as 'light' | 'dark';
    if (dir) outputDir.value = dir as string;
    if (conc !== null && conc !== undefined) maxConcurrency.value = conc as number;
  } catch {
    // 配置读取失败，使用默认值
  }
});

// ---------------------------------------------------------------------------
// 方法
// ---------------------------------------------------------------------------

async function browseDirectory() {
  const api = getApi();
  if (!api) return;

  try {
    const dir = await api.selectDirectory?.();
    if (dir) {
      outputDir.value = dir as string;
    }
  } catch {
    ElMessage.warning('选择目录失败');
  }
}

async function saveSettings() {
  const api = getApi();
  if (!api) {
    ElMessage.warning('无法连接主进程');
    return;
  }

  saving.value = true;
  try {
    await Promise.all([
      api.setConfig?.('language', language.value),
      api.setConfig?.('theme', theme.value),
      api.setConfig?.('defaultOutputDir', outputDir.value),
      api.setConfig?.('maxConcurrentTasks', maxConcurrency.value),
    ]);
    ElMessage.success('设置已保存');
  } catch {
    ElMessage.error('保存设置失败');
  } finally {
    saving.value = false;
  }
}

function restoreDefaults() {
  language.value = DEFAULTS.language;
  theme.value = DEFAULTS.theme;
  outputDir.value = DEFAULTS.defaultOutputDir;
  maxConcurrency.value = DEFAULTS.maxConcurrentTasks;
  ElMessage.info('已恢复默认设置（点击"保存设置"生效）');
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

.settings-form {
  max-width: 600px;
  padding-top: 8px;
}
</style>

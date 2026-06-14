import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 模块标识类型
 */
export type ModuleKey =
  | 'home'
  | 'validator'
  | 'image-detector'
  | 'pdf-processor'
  | 'md5-checker'
  | 'metadata'
  | 'doc-manager'
  | 'settings';

/**
 * 全局应用状态
 *
 * 管理应用基础信息、侧边栏折叠状态、当前模块、加载状态等。
 */
export const useAppStore = defineStore('app', () => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** 应用版本号 */
  const version = ref('5.6.9');

  /** 当前平台标识 (darwin | win32 | linux | browser) */
  const platform = ref('browser');

  /** 全局加载状态 */
  const loading = ref(false);

  /** 侧边栏是否折叠 */
  const sidebarCollapsed = ref(false);

  /** 全局演示模式开关（桌面版禁用） */
  const demoMode = ref(false);

  /** 当前活跃模块 */
  const currentModule = ref<ModuleKey>('home');

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  /** 是否为 macOS 平台 */
  const isMac = computed(() => platform.value === 'darwin');

  /** 是否为 Windows 平台 */
  const isWindows = computed(() => platform.value === 'win32');

  /** 应用信息对象（版本 + 平台） */
  const appInfo = computed(() => ({
    version: version.value,
    platform: platform.value,
  }));

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * 初始化应用状态
   *
   * 在 Electron 环境中通过 preload 暴露的 electronAPI 获取平台和版本信息。
   * 在浏览器环境中回退使用 navigator 检测平台。
   */
  async function initApp(): Promise<void> {
    loading.value = true;
    try {
      // 优先使用 Electron preload API
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const info = await (window as any).electronAPI.getAppInfo();
        if (info) {
          version.value = info.version ?? version.value;
          platform.value = info.platform ?? platform.value;
        }
      } else {
        // 浏览器回退：通过 userAgent 推断平台
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('mac os') || ua.includes('macintosh')) {
          platform.value = 'darwin';
        } else if (ua.includes('windows') || ua.includes('win32')) {
          platform.value = 'win32';
        } else if (ua.includes('linux')) {
          platform.value = 'linux';
        }
      }
    } catch {
      // 非 Electron 环境或 API 不可用，保持默认值
    } finally {
      loading.value = false;
    }
  }

  /** 切换侧边栏折叠状态 */
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  /** 设置当前活跃模块 */
  function setCurrentModule(module: ModuleKey): void {
    currentModule.value = module;
  }

  /** 切换演示模式 */
  function toggleDemoMode(): void {
    demoMode.value = !demoMode.value;
  }

  return {
    // state
    version,
    platform,
    loading,
    sidebarCollapsed,
    demoMode,
    currentModule,
    // getters
    isMac,
    isWindows,
    appInfo,
    // actions
    initApp,
    toggleSidebar,
    toggleDemoMode,
    setCurrentModule,
  };
});

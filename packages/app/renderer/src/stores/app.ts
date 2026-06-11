import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 全局应用状态
 *
 * 管理应用基础信息、侧边栏折叠状态、加载状态等。
 */
export const useAppStore = defineStore('app', () => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** 应用版本号 */
  const version = ref('1.0.0');

  /** 当前平台标识 */
  const platform = ref('browser');

  /** 全局加载状态 */
  const loading = ref(false);

  /** 侧边栏是否折叠 */
  const sidebarCollapsed = ref(false);

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  /** 是否为 macOS 平台 */
  const isMac = computed(() => platform.value === 'darwin');

  /** 应用信息对象 */
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
   * 从 Electron preload 暴露的 electronAPI 获取平台和版本信息。
   * 在浏览器环境中使用默认值。
   */
  async function initApp(): Promise<void> {
    loading.value = true;
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const info = await (window as any).electronAPI.getAppInfo();
        if (info) {
          version.value = info.version ?? version.value;
          platform.value = info.platform ?? platform.value;
        }
      }
    } catch {
      // 非 Electron 环境，使用默认值
    } finally {
      loading.value = false;
    }
  }

  /** 切换侧边栏折叠状态 */
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  return {
    // state
    version,
    platform,
    loading,
    sidebarCollapsed,
    // getters
    isMac,
    appInfo,
    // actions
    initApp,
    toggleSidebar,
  };
});

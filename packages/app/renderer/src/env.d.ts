/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const zhCn: any;
  export default zhCn;
}

// Electron API 类型声明
interface Window {
  api?: {
    invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>;
    on?: (channel: string, callback: (...args: unknown[]) => void) => void;
  };
  electronAPI?: Record<string, unknown>;
}

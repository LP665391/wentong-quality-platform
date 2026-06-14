/**
 * 窗口管理模块
 *
 * 负责 Electron BrowserWindow 的创建、配置和生命周期管理。
 */

import path from 'node:path';
import { BrowserWindow, shell, app } from 'electron';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 窗口默认宽度 */
const DEFAULT_WIDTH = 1280;

/** 窗口默认高度 */
const DEFAULT_HEIGHT = 800;

/** 窗口最小宽度 */
const MIN_WIDTH = 1024;

/** 窗口最小高度 */
const MIN_HEIGHT = 680;

/** 窗口标题 */
const WINDOW_TITLE = 'Ai质检平台';

/** Vite 开发服务器地址 */
const DEV_SERVER_URL = 'http://localhost:5173';

// ---------------------------------------------------------------------------
// 单例
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;

// ---------------------------------------------------------------------------
// 窗口创建
// ---------------------------------------------------------------------------

/**
 * 判断当前是否为开发环境
 */
function isDev(): boolean {
  return !app.isPackaged;
}

/**
 * 获取 preload 脚本的绝对路径
 */
function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js');
}

/**
 * 创建主窗口
 *
 * - 窗口尺寸：1280x800，最小 1024x680
 * - macOS：titleBarStyle='hiddenInset', trafficLightPosition={x:12, y:12}
 * - Windows：标准标题栏
 * - webPreferences：preload, nodeIntegration=false, contextIsolation=true, sandbox=false
 * - 开发环境：loadURL('http://localhost:5173') + openDevTools
 * - 生产环境：loadFile('../../renderer/dist/index.html')
 * - ready-to-show 后显示窗口
 * - 外部链接在系统浏览器打开
 */
export function createMainWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: WINDOW_TITLE,
    show: false, // 等待 ready-to-show 后再显示，避免白屏闪烁

    // macOS 无边框样式，保留红绿灯按钮
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 12, y: 12 },
        }
      : {}),

    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // 启用 Chromium OS 级沙箱
      webSecurity: false, // 允许 file:// 协议访问本地文件
    },
  });

  // 加载内容
  if (isDev()) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    // 生产环境加载 renderer 构建产物
    const rendererPath = path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html');
    mainWindow.loadFile(rendererPath);
  }

  // ready-to-show 后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 外部链接在系统默认浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * 获取当前主窗口实例
 *
 * @returns BrowserWindow 实例或 null
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

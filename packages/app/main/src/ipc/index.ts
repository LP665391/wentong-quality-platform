/**
 * IPC 通信处理器
 *
 * 注册所有主进程 ipcMain.handle 处理器，为渲染进程提供：
 * - 应用信息查询
 * - 配置读写
 * - 文件/目录选择对话框
 * - 任务 CRUD 操作
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getPlatformInfo, getAppVersion, configManager } from '@wentong/utils';
import { getRepository } from '@wentong/database';
import type { CreateTaskInput, TaskModule, TaskStatus } from '@wentong/database';
import { setupDataValidatorIpc } from './data-validator.js';

// ---------------------------------------------------------------------------
// Handler 注册
// ---------------------------------------------------------------------------

/**
 * 注册所有 IPC 处理器
 *
 * 应在 app.whenReady 之后、创建窗口之前调用。
 */
export function setupIpcHandlers(): void {
  // -----------------------------------------------------------------------
  // 应用信息
  // -----------------------------------------------------------------------

  /**
   * 获取应用版本和平台信息
   */
  ipcMain.handle('app:getInfo', () => {
    const platformInfo = getPlatformInfo();
    return {
      version: getAppVersion(),
      platform: platformInfo.platform,
      arch: platformInfo.arch,
      isWindows: platformInfo.isWindows,
      isMac: platformInfo.isMac,
      isLinux: platformInfo.isLinux,
      homeDir: platformInfo.homeDir,
      dataDir: platformInfo.dataDir,
    };
  });

  // -----------------------------------------------------------------------
  // 配置
  // -----------------------------------------------------------------------

  /**
   * 获取单个配置项
   *
   * @param _event - IPC 事件对象
   * @param key     - 配置键名
   */
  ipcMain.handle('config:get', (_event, key: string) => {
    return configManager.get(key as keyof ReturnType<typeof configManager.getAll>);
  });

  /**
   * 设置单个配置项
   *
   * @param _event - IPC 事件对象
   * @param key    - 配置键名
   * @param value  - 配置值
   */
  ipcMain.handle('config:set', (_event, key: string, value: unknown) => {
    configManager.set(key as keyof ReturnType<typeof configManager.getAll>, value as never);
    return true;
  });

  // -----------------------------------------------------------------------
  // 对话框
  // -----------------------------------------------------------------------

  /**
   * 打开文件选择对话框
   *
   * @param _event  - IPC 事件对象
   * @param options - 对话框选项（filters 等）
   * @returns 选中的文件路径数组，取消则返回空数组
   */
  ipcMain.handle('dialog:openFile', async (_event, options?: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      ...options,
    });
    return result.canceled ? [] : result.filePaths;
  });

  /**
   * 打开目录选择对话框
   *
   * @param _event  - IPC 事件对象
   * @param options - 对话框选项
   * @returns 选中的目录路径，取消则返回空字符串
   */
  ipcMain.handle('dialog:openDirectory', async (_event, options?: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      ...options,
    });
    return result.canceled ? '' : result.filePaths[0] ?? '';
  });

  // -----------------------------------------------------------------------
  // 任务操作
  // -----------------------------------------------------------------------

  /**
   * 创建新任务
   *
   * @param _event - IPC 事件对象
   * @param input  - 任务创建参数
   * @returns 创建的任务记录
   */
  ipcMain.handle('task:create', (_event, input: CreateTaskInput) => {
    const repo = getRepository();
    return repo.createTask(input);
  });

  /**
   * 根据 task_id 获取任务详情
   *
   * @param _event - IPC 事件对象
   * @param taskId - 任务 UUID
   * @returns 任务记录，未找到返回 null
   */
  ipcMain.handle('task:get', (_event, taskId: string) => {
    const repo = getRepository();
    return repo.getTask(taskId);
  });

  /**
   * 列出任务
   *
   * @param _event - IPC 事件对象
   * @param module - 按模块过滤（可选）
   * @param limit  - 最大返回数量，默认 50
   * @returns 任务列表（按创建时间倒序）
   */
  ipcMain.handle('task:list', (_event, module?: TaskModule, limit?: number) => {
    const repo = getRepository();
    return repo.listTasks(module, limit);
  });

  /**
   * 更新任务状态
   *
   * @param _event       - IPC 事件对象
   * @param taskId       - 任务 UUID
   * @param status       - 新状态
   * @param errorMessage - 错误信息（failed 时使用）
   * @returns 更新后的任务记录
   */
  ipcMain.handle(
    'task:updateStatus',
    (_event, taskId: string, status: TaskStatus, errorMessage?: string) => {
      const repo = getRepository();
      return repo.updateTaskStatus(taskId, status, errorMessage);
    },
  );

  // -----------------------------------------------------------------------
  // 数据校验模块 IPC
  // -----------------------------------------------------------------------

  setupDataValidatorIpc();
}

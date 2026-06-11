/**
 * MD5 校验 IPC 通信层
 *
 * 注册 md5:* 系列的 ipcMain.handle 处理器，协调：
 * - hashFile / hashDirectory / verifyHash（@wentong/md5-checker）
 * - TaskRepository（@wentong/database）进行任务持久化
 * - 通过 event.sender.send 向渲染进程推送批量进度
 */

import { ipcMain } from 'electron';
import { hashFile, hashDirectory, verifyHash } from '@wentong/md5-checker';
import type { HashAlgorithm, HashResult } from '@wentong/md5-checker';
import { getRepository } from '@wentong/database';

// ---------------------------------------------------------------------------
// 导出注册函数
// ---------------------------------------------------------------------------

/**
 * 注册 MD5 校验相关的所有 IPC 处理器
 */
export function setupMd5CheckerIpc(): void {
  // -----------------------------------------------------------------------
  // md5:hash — 计算单文件哈希
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'md5:hash',
    async (
      _event,
      params: {
        filePath: string;
        algorithm?: HashAlgorithm;
      },
    ) => {
      const { filePath, algorithm = 'md5' } = params;

      try {
        const result: HashResult = await hashFile(filePath, algorithm);

        // 可选：保存到任务历史
        const repo = getRepository();
        repo.createTask({
          module: 'md5',
          task_name: `MD5计算 - ${result.fileName}`,
          input_path: filePath,
          config_json: JSON.stringify({ algorithm }),
        });

        return { success: true, result };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // md5:hashDir — 批量计算目录文件哈希（带进度推送）
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'md5:hashDir',
    async (
      event,
      params: {
        dirPath: string;
        algorithm?: HashAlgorithm;
        concurrency?: number;
      },
    ) => {
      const { dirPath, algorithm = 'md5', concurrency = 4 } = params;

      try {
        const repo = getRepository();
        const task = repo.createTask({
          module: 'md5',
          task_name: `批量MD5 - ${dirPath.split(/[/\\]/).pop() ?? 'unknown'}`,
          input_path: dirPath,
          config_json: JSON.stringify({ algorithm, concurrency }),
        });

        repo.updateTaskStatus(task.task_id, 'running');

        // 进度回调：推送到渲染进程
        const onProgress = (completed: number, total: number): void => {
          event.sender.send('md5:progress', {
            taskId: task.task_id,
            completed,
            total,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
          });
        };

        const results: HashResult[] = await hashDirectory(
          dirPath,
          algorithm,
          onProgress,
          concurrency,
        );

        repo.updateTaskStatus(task.task_id, 'completed');

        // 保存结果摘要
        try {
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify({ total: results.length, results }), task.task_id);
        } catch { /* 非关键 */ }

        return { success: true, results };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        // 推送错误进度
        event.sender.send('md5:progress', {
          taskId: '',
          completed: 0,
          total: 0,
          percent: 0,
          error: message,
        });

        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // md5:verify — 哈希比对校验
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'md5:verify',
    async (
      _event,
      params: {
        filePath: string;
        expectedHash: string;
        algorithm?: HashAlgorithm;
      },
    ) => {
      const { filePath, expectedHash, algorithm = 'md5' } = params;

      try {
        const matched = await verifyHash(filePath, expectedHash, algorithm);
        const actualHash = (await hashFile(filePath, algorithm)).hash;

        return {
          success: true,
          matched,
          actualHash,
          expectedHash,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );
}

/**
 * 图像检测 IPC 通信层
 *
 * 注册 image-detector:* 系列的 ipcMain.handle 处理器，协调：
 * - ImageDetector + BatchProcessor（@wentong/image-detector）进行图像检测
 * - TaskRepository（@wentong/database）进行任务/结果持久化
 * - 通过 event.sender.send 向渲染进程推送检测进度
 */

import { ipcMain } from 'electron';
import { ImageDetector, BatchProcessor } from '@wentong/image-detector';
import type { DetectionResult } from '@wentong/image-detector';
import { getRepository } from '@wentong/database';

// ---------------------------------------------------------------------------
// 活跃处理器注册表
// ---------------------------------------------------------------------------

/** 所有正在运行的批量处理器，以 taskId 为键 */
const processors = new Map<string, BatchProcessor>();

/** 取消标志，以 taskId 为键 */
const cancelFlags = new Map<string, boolean>();

// 预设模式名称映射
const presetNames: Record<string, string> = {
  archive: '保存级',
  access: '利用级',
  quick: '快速筛查',
};

// ---------------------------------------------------------------------------
// 导出注册函数
// ---------------------------------------------------------------------------

/**
 * 注册图像检测相关的所有 IPC 处理器
 */
export function setupImageDetectorIpc(): void {
  // -----------------------------------------------------------------------
  // image-detector:create — 创建检测任务
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'image-detector:create',
    (
      _event,
      params: {
        dirPath: string;
        presetId: string;
        options?: {
          recursive?: boolean;
          concurrency?: number;
        };
      },
    ) => {
      const { dirPath, presetId, options } = params;
      const { recursive = false, concurrency = 4 } = options ?? {};
      const presetName = presetNames[presetId] || presetId;

      // 1) 创建数据库任务记录
      const repo = getRepository();
      const task = repo.createTask({
        module: 'image',
        task_name: `档案图像检测 - ${dirPath.split(/[/\\]/).pop() ?? 'unknown'} (${presetName})`,
        input_path: dirPath,
        config_json: JSON.stringify({ presetId, recursive, concurrency }),
      });

      // 2) 创建检测器 + 批量处理器
      const detector = new ImageDetector();
      const processor = new BatchProcessor(detector, concurrency);
      processors.set(task.task_id, processor);

      return { taskId: task.task_id, task };
    },
  );

  // -----------------------------------------------------------------------
  // image-detector:run — 执行检测
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'image-detector:run',
    async (
      event,
      params: {
        taskId: string;
        dirPath: string;
        presetId: string;
        options?: {
          recursive?: boolean;
          concurrency?: number;
        };
      },
    ) => {
      const { taskId, dirPath, presetId, options } = params;
      const { recursive = false, concurrency = 4 } = options ?? {};
      const repo = getRepository();

      // 1) 获取或创建处理器
      let processor = processors.get(taskId);
      if (!processor) {
        const detector = new ImageDetector();
        processor = new BatchProcessor(detector, concurrency);
        processors.set(taskId, processor);
      }

      // 2) 重置取消标志
      cancelFlags.set(taskId, false);

      // 3) 更新任务状态为 running
      repo.updateTaskStatus(taskId, 'running');

      // 4) 进度回调：推送到渲染进程
      const onProgress = (current: number, total: number, fileName: string): void => {
        // 检查取消标志
        if (cancelFlags.get(taskId)) {
          throw new Error('CANCELLED');
        }

        event.sender.send('image-detector:progress', {
          taskId,
          current,
          total,
          fileName,
          percent: total > 0 ? Math.round((current / total) * 100) : 0,
        });
      };

      try {
        // 5) 执行批量检测（使用预设模式）
        const results: DetectionResult[] = await processor.processDirectoryWithPreset(
          dirPath,
          presetId,
          { recursive, onProgress },
        );

        // 6) 保存检测结果到数据库
        for (const r of results) {
          repo.addImageResult({
            task_id: taskId,
            file_path: r.filePath,
            file_name: r.fileName,
            is_qualified: r.isQualified,
            score: r.score,
            model_used: r.modelUsed,
            details_json: JSON.stringify(r.details),
          });
        }

        // 7) 更新任务为 completed，保存结果摘要到 result_json
        repo.updateTaskStatus(taskId, 'completed');

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(
              JSON.stringify({
                total: results.length,
                qualified: results.filter((r) => r.isQualified).length,
                unqualified: results.filter((r) => !r.isQualified).length,
                preset: presetId,
              }),
              taskId,
            );
        } catch {
          // 非关键路径，忽略
        }

        return { success: true, results };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        // 用户取消不视为失败
        if (message === 'CANCELLED') {
          repo.updateTaskStatus(taskId, 'cancelled');
          return { success: false, cancelled: true };
        }

        repo.updateTaskStatus(taskId, 'failed', message);

        // 推送错误进度
        event.sender.send('image-detector:progress', {
          taskId,
          current: 0,
          total: 0,
          fileName: '',
          percent: 0,
          error: message,
        });

        return { success: false, error: message };
      } finally {
        cancelFlags.delete(taskId);
      }
    },
  );

  // -----------------------------------------------------------------------
  // image-detector:cancel — 取消检测
  // -----------------------------------------------------------------------

  ipcMain.handle('image-detector:cancel', (_event, params: { taskId: string }) => {
    const { taskId } = params;
    const repo = getRepository();

    // 1) 设置取消标志
    cancelFlags.set(taskId, true);

    // 2) 从 processors map 移除
    processors.delete(taskId);

    // 3) 更新任务状态为 cancelled
    repo.updateTaskStatus(taskId, 'cancelled');

    return { success: true };
  });

  // -----------------------------------------------------------------------
  // image-detector:getResults — 获取检测结果
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'image-detector:getResults',
    (_event, params: { taskId: string }) => {
      const { taskId } = params;
      const repo = getRepository();
      const results = repo.getImageResults(taskId);
      return { success: true, results };
    },
  );
}

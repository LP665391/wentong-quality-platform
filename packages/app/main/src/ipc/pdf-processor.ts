/**
 * PDF 处理器 IPC 通信层
 *
 * 注册 pdf:* 系列的 ipcMain.handle 处理器，协调：
 * - PdfMerger / PdfSplitter / PdfEncryptor / PdfWatermark（@wentong/pdf-processor）
 * - TaskRepository（@wentong/database）进行任务持久化
 * - 通过 event.sender.send 向渲染进程推送操作进度
 */

import { ipcMain } from 'electron';
import {
  PdfMerger,
  PdfSplitter,
  PdfEncryptor,
  PdfWatermark,
} from '@wentong/pdf-processor';
import type { EncryptOptions, WatermarkOptions, SplitOptions } from '@wentong/pdf-processor';
import { getRepository } from '@wentong/database';

// ---------------------------------------------------------------------------
// 导出注册函数
// ---------------------------------------------------------------------------

/**
 * 注册 PDF 处理相关的所有 IPC 处理器
 */
export function setupPdfProcessorIpc(): void {
  // -----------------------------------------------------------------------
  // pdf:merge — 合并 PDF
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:merge',
    async (
      event,
      params: {
        filePaths: string[];
        outputPath: string;
      },
    ) => {
      const { filePaths, outputPath } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `PDF合并 - ${filePaths.length} 个文件`,
          input_path: filePaths.join('; '),
          config_json: JSON.stringify({ action: 'merge', outputPath }),
        });

        const onProgress = (current: number, total: number): void => {
          event.sender.send('pdf:progress', {
            taskId: task!.task_id,
            current,
            total,
            percent: total > 0 ? Math.round((current / total) * 100) : 0,
          });
        };

        repo.updateTaskStatus(task!.task_id, 'running');

        const merger = new PdfMerger();
        const result = await merger.merge(filePaths, outputPath, onProgress);

        repo.updateTaskStatus(task!.task_id, 'completed');

        try {
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify(result), task!.task_id);
        } catch { /* 非关键 */ }

        return { success: true, result };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (task?.task_id) {
          try { repo.updateTaskStatus(task.task_id, 'failed', message); } catch { /* 非关键 */ }
        }
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // pdf:split — 拆分 PDF
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:split',
    async (
      event,
      params: {
        filePath: string;
        outputDir: string;
        options: SplitOptions;
      },
    ) => {
      const { filePath, outputDir, options } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `PDF拆分 - ${filePath.split(/[/\\]/).pop() ?? 'unknown'}`,
          input_path: filePath,
          config_json: JSON.stringify({ action: 'split', outputDir, options }),
        });

        const onProgress = (current: number, total: number): void => {
          event.sender.send('pdf:progress', {
            taskId: task!.task_id,
            current,
            total,
            percent: total > 0 ? Math.round((current / total) * 100) : 0,
          });
        };

        repo.updateTaskStatus(task!.task_id, 'running');

        const splitter = new PdfSplitter();
        const outputPaths = await splitter.split(filePath, outputDir, options, onProgress);

        repo.updateTaskStatus(task!.task_id, 'completed');

        try {
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify({ outputPaths, count: outputPaths.length }), task!.task_id);
        } catch { /* 非关键 */ }

        return { success: true, outputPaths };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (task?.task_id) {
          try { repo.updateTaskStatus(task.task_id, 'failed', message); } catch { /* 非关键 */ }
        }
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // pdf:encrypt — 加密 PDF
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:encrypt',
    async (
      _event,
      params: {
        filePath: string;
        outputPath: string;
        options: EncryptOptions;
      },
    ) => {
      const { filePath, outputPath, options } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `PDF加密 - ${filePath.split(/[/\\]/).pop() ?? 'unknown'}`,
          input_path: filePath,
          config_json: JSON.stringify({ action: 'encrypt', outputPath }),
        });

        repo.updateTaskStatus(task!.task_id, 'running');

        const encryptor = new PdfEncryptor();
        await encryptor.encrypt(filePath, outputPath, options);

        repo.updateTaskStatus(task!.task_id, 'completed');

        try {
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify({ outputPath }), task!.task_id);
        } catch { /* 非关键 */ }

        return { success: true, outputPath };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (task?.task_id) {
          try { repo.updateTaskStatus(task.task_id, 'failed', message); } catch { /* 非关键 */ }
        }
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // pdf:decrypt — 解密 PDF
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:decrypt',
    async (
      _event,
      params: {
        filePath: string;
        password: string;
        outputPath: string;
      },
    ) => {
      const { filePath, password, outputPath } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `PDF解密 - ${filePath.split(/[/\\]/).pop() ?? 'unknown'}`,
          input_path: filePath,
          config_json: JSON.stringify({ action: 'decrypt', outputPath }),
        });

        repo.updateTaskStatus(task!.task_id, 'running');

        const encryptor = new PdfEncryptor();
        await encryptor.decrypt(filePath, password, outputPath);

        repo.updateTaskStatus(task!.task_id, 'completed');

        try {
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify({ outputPath }), task!.task_id);
        } catch { /* 非关键 */ }

        return { success: true, outputPath };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (task?.task_id) {
          try { repo.updateTaskStatus(task.task_id, 'failed', message); } catch { /* 非关键 */ }
        }
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // pdf:watermark — 添加水印
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:watermark',
    async (
      _event,
      params: {
        filePath: string;
        outputPath: string;
        options: WatermarkOptions;
      },
    ) => {
      const { filePath, outputPath, options } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `PDF水印 - ${filePath.split(/[/\\]/).pop() ?? 'unknown'}`,
          input_path: filePath,
          config_json: JSON.stringify({ action: 'watermark', outputPath, options }),
        });

        repo.updateTaskStatus(task!.task_id, 'running');

        const watermark = new PdfWatermark();
        await watermark.addTextWatermark(filePath, outputPath, options);

        repo.updateTaskStatus(task!.task_id, 'completed');

        try {
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify({ outputPath }), task!.task_id);
        } catch { /* 非关键 */ }

        return { success: true, outputPath };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (task?.task_id) {
          try { repo.updateTaskStatus(task.task_id, 'failed', message); } catch { /* 非关键 */ }
        }
        return { success: false, error: message };
      }
    },
  );
}

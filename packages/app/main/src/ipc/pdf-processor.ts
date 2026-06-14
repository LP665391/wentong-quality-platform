/**
 * PDF 处理器 IPC 通信层
 *
 * 注册 pdf:* 系列的 ipcMain.handle 处理器，协调：
 * - PdfMerger / PdfSplitter / PdfEncryptor / PdfWatermark（@wentong/pdf-processor）
 * - TaskRepository（@wentong/database）进行任务持久化
 * - 通过 event.sender.send 向渲染进程推送操作进度
 */

import { ipcMain } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  PdfMerger,
  PdfSplitter,
  PdfEncryptor,
  PdfWatermark,
  PdfQualityChecker,
  PdfPageNumber,
  ImageToPdf,
} from '@wentong/pdf-processor';
import type { EncryptOptions, WatermarkOptions, SplitOptions, PageNumberOptions, ImageToPdfOptions } from '@wentong/pdf-processor';
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

  // -----------------------------------------------------------------------
  // pdf:quality-check — PDF 质检
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:quality-check',
    async (
      _event,
      params: {
        filePath: string;
      },
    ) => {
      const { filePath } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `PDF质检 - ${filePath.split(/[/\\]/).pop() ?? 'unknown'}`,
          input_path: filePath,
          config_json: JSON.stringify({ action: 'quality-check' }),
        });

        repo.updateTaskStatus(task!.task_id, 'running');

        const checker = new PdfQualityChecker();
        const result = await checker.check(filePath);

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
  // pdf:page-number — 页码编排
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:page-number',
    async (
      event,
      params: {
        filePath: string;
        outputPath: string;
        options: PageNumberOptions;
      },
    ) => {
      const { filePath, outputPath, options } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `PDF页码 - ${filePath.split(/[/\\]/).pop() ?? 'unknown'}`,
          input_path: filePath,
          config_json: JSON.stringify({ action: 'page-number', outputPath, options }),
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

        const pageNumber = new PdfPageNumber();
        await pageNumber.addPageNumbers(filePath, outputPath, options, onProgress);

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
  // pdf:image-to-pdf — 图片转 PDF
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'pdf:image-to-pdf',
    async (
      event,
      params: {
        imagePaths: string[];
        outputPath: string;
        options: ImageToPdfOptions;
      },
    ) => {
      const { imagePaths, outputPath, options } = params;
      const repo = getRepository();
      let task: ReturnType<typeof repo.createTask> | null = null;

      try {
        task = repo.createTask({
          module: 'pdf',
          task_name: `图片转PDF - ${imagePaths.length} 张图片`,
          input_path: imagePaths.join('; '),
          config_json: JSON.stringify({ action: 'image-to-pdf', outputPath, options }),
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

        const converter = new ImageToPdf();
        await converter.convert(imagePaths, outputPath, options, onProgress);

        repo.updateTaskStatus(task!.task_id, 'completed');

        try {
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify({ outputPath, imageCount: imagePaths.length }), task!.task_id);
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

// ---------------------------------------------------------------------------
// 批量处理器工具函数
// ---------------------------------------------------------------------------

/**
 * 批量处理多个文件，每个文件独立处理并报告进度
 */
async function batchProcess<T>(
  event: Electron.IpcMainInvokeEvent,
  repo: ReturnType<typeof getRepository>,
  module: string,
  action: string,
  filePaths: string[],
  outputDir: string,
  suffix: string,
  processFn: (filePath: string, outputPath: string) => Promise<{ success: boolean; result?: T; error?: string }>,
): Promise<{ success: boolean; results: Array<{ file: string; success: boolean; result?: T; error?: string }>; successCount: number; failCount: number }> {
  const task = repo.createTask({
    module: module as any,
    task_name: `${action}批量 - ${filePaths.length} 个文件`,
    input_path: filePaths.join('; '),
    config_json: JSON.stringify({ action: `${action}-batch`, fileCount: filePaths.length }),
  });

  repo.updateTaskStatus(task.task_id, 'running');
  const results: Array<{ file: string; success: boolean; result?: T; error?: string }> = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]!;
    const fileName = filePath.split(/[/\\]/).pop() ?? `file-${i + 1}`;
    const ext = filePath.replace(/\.pdf$/i, '');
    const outputPath = `${outputDir}/${fileName.replace(/\.pdf$/i, '')}-${suffix}.pdf`;

    // 发送文件级进度
    event.sender.send('pdf:batch-progress', {
      taskId: task.task_id,
      currentFile: i + 1,
      totalFiles: filePaths.length,
      fileName,
      percent: filePaths.length > 0 ? Math.round(((i) / filePaths.length) * 100) : 0,
      status: 'processing',
    });

    // 确保输出目录存在
    const outputDirForFile = path.dirname(outputPath);
    if (!fs.existsSync(outputDirForFile)) {
      fs.mkdirSync(outputDirForFile, { recursive: true });
    }

    try {
      const res = await processFn(filePath, outputPath);
      if (res.success) {
        results.push({ file: filePath, success: true, result: res.result });
        successCount++;
      } else {
        results.push({ file: filePath, success: false, error: res.error });
        failCount++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ file: filePath, success: false, error: message });
      failCount++;
    }
  }

  // 最终进度
  event.sender.send('pdf:batch-progress', {
    taskId: task.task_id,
    currentFile: filePaths.length,
    totalFiles: filePaths.length,
    percent: 100,
    status: 'completed',
    successCount,
    failCount,
  });

  repo.updateTaskStatus(task.task_id, successCount > 0 ? 'completed' : 'failed');
  try {
    (repo as any).db
      .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
      .run(JSON.stringify({ results, successCount, failCount }), task.task_id);
  } catch { /* 非关键 */ }

  return { success: failCount === 0 || successCount > 0, results, successCount, failCount };
}

// -----------------------------------------------------------------------
// pdf:watermark-batch — 批量添加水印
// -----------------------------------------------------------------------

ipcMain.handle(
  'pdf:watermark-batch',
  async (
    event,
    params: {
      filePaths: string[];
      outputDir: string;
      options: import('@wentong/pdf-processor').WatermarkOptions;
    },
  ) => {
    const { filePaths, outputDir, options } = params;
    const repo = getRepository();

    return batchProcess(
      event,
      repo,
      'pdf',
      '水印',
      filePaths,
      outputDir,
      'watermarked',
      async (filePath, outputPath) => {
        const watermark = new PdfWatermark();
        await watermark.addTextWatermark(filePath, outputPath, options);
        return { success: true as const, result: { outputPath } };
      },
    );
  },
);

// -----------------------------------------------------------------------
// pdf:page-number-batch — 批量添加页码
// -----------------------------------------------------------------------

ipcMain.handle(
  'pdf:page-number-batch',
  async (
    event,
    params: {
      filePaths: string[];
      outputDir: string;
      options: import('@wentong/pdf-processor').PageNumberOptions;
    },
  ) => {
    const { filePaths, outputDir, options } = params;
    const repo = getRepository();

    return batchProcess(
      event,
      repo,
      'pdf',
      '页码',
      filePaths,
      outputDir,
      'numbered',
      async (filePath, outputPath) => {
        const pageNumber = new PdfPageNumber();
        await pageNumber.addPageNumbers(filePath, outputPath, options);
        return { success: true as const, result: { outputPath } };
      },
    );
  },
);

// -----------------------------------------------------------------------
// pdf:quality-check-batch — 批量质检
// -----------------------------------------------------------------------

ipcMain.handle(
  'pdf:quality-check-batch',
  async (
    event,
    params: {
      filePaths: string[];
    },
  ) => {
    const { filePaths } = params;
    const repo = getRepository();
    const results: Array<{ file: string; success: boolean; result?: any; error?: string }> = [];
    let successCount = 0;
    let failCount = 0;

    const task = repo.createTask({
      module: 'pdf',
      task_name: `质检批量 - ${filePaths.length} 个文件`,
      input_path: filePaths.join('; '),
      config_json: JSON.stringify({ action: 'quality-check-batch', fileCount: filePaths.length }),
    });

    repo.updateTaskStatus(task.task_id, 'running');

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]!;
      const fileName = filePath.split(/[/\\]/).pop() ?? `file-${i + 1}`;

      event.sender.send('pdf:batch-progress', {
        taskId: task.task_id,
        currentFile: i + 1,
        totalFiles: filePaths.length,
        fileName,
        percent: filePaths.length > 0 ? Math.round((i / filePaths.length) * 100) : 0,
        status: 'processing',
      });

      try {
        const checker = new PdfQualityChecker();
        const result = await checker.check(filePath);
        results.push({ file: filePath, success: true, result });
        successCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ file: filePath, success: false, error: message });
        failCount++;
      }
    }

    event.sender.send('pdf:batch-progress', {
      taskId: task.task_id,
      currentFile: filePaths.length,
      totalFiles: filePaths.length,
      percent: 100,
      status: 'completed',
      successCount,
      failCount,
    });

    repo.updateTaskStatus(task.task_id, successCount > 0 ? 'completed' : 'failed');
    try {
      (repo as any).db
        .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
        .run(JSON.stringify({ results, successCount, failCount }), task.task_id);
    } catch { /* 非关键 */ }

    return { success: true, results, successCount, failCount };
  },
);

// -----------------------------------------------------------------------
// pdf:encrypt-batch — 批量加密
// -----------------------------------------------------------------------

ipcMain.handle(
  'pdf:encrypt-batch',
  async (
    event,
    params: {
      filePaths: string[];
      outputDir: string;
      options: import('@wentong/pdf-processor').EncryptOptions;
    },
  ) => {
    const { filePaths, outputDir, options } = params;
    const repo = getRepository();

    return batchProcess(
      event,
      repo,
      'pdf',
      '加密',
      filePaths,
      outputDir,
      'encrypted',
      async (filePath, outputPath) => {
        const encryptor = new PdfEncryptor();
        await encryptor.encrypt(filePath, outputPath, options);
        return { success: true as const, result: { outputPath } };
      },
    );
  },
);

// -----------------------------------------------------------------------
// pdf:decrypt-batch — 批量解密
// -----------------------------------------------------------------------

ipcMain.handle(
  'pdf:decrypt-batch',
  async (
    event,
    params: {
      filePaths: string[];
      outputDir: string;
      password: string;
    },
  ) => {
    const { filePaths, outputDir, password } = params;
    const repo = getRepository();

    return batchProcess(
      event,
      repo,
      'pdf',
      '解密',
      filePaths,
      outputDir,
      'decrypted',
      async (filePath, outputPath) => {
        const encryptor = new PdfEncryptor();
        await encryptor.decrypt(filePath, password, outputPath);
        return { success: true as const, result: { outputPath } };
      },
    );
  },
);

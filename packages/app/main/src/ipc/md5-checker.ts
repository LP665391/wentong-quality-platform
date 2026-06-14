/**
 * MD5 校验 IPC 通信层
 *
 * 注册 md5:* 系列的 ipcMain.handle 处理器，协调：
 * - hashFile / hashDirectory / verifyHash（@wentong/md5-checker）
 * - TaskRepository（@wentong/database）进行任务持久化
 * - 通过 event.sender.send 向渲染进程推送批量进度
 */

import { ipcMain } from 'electron';
import { hashFile, hashDirectory, verifyHash, exportManifest, compareManifest, generateArchiveReport } from '@wentong/md5-checker';
import type { HashAlgorithm, HashResult, ManifestCompareResult, ArchiveReportOptions } from '@wentong/md5-checker';
import { getRepository } from '@wentong/database';
import * as fs from 'node:fs';
import * as path from 'node:path';

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

  // -----------------------------------------------------------------------
  // md5:count-files — 统计目录中匹配文件数量
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'md5:count-files',
    async (
      _event,
      params: {
        dirPath: string;
        fileExtensions?: string[];
      },
    ) => {
      const { dirPath, fileExtensions } = params;
      try {
        const fs = require('node:fs');
        const path = require('node:path');
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        let count = 0;
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          if (fileExtensions && fileExtensions.length > 0) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!fileExtensions.includes(ext)) continue;
          }
          count++;
        }
        return { success: true, count };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message, count: 0 };
      }
    },
  );

  // -----------------------------------------------------------------------
  // md5:export-manifest — 生成标准 .md5 清单文件
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'md5:export-manifest',
    async (
      _event,
      params: {
        results: HashResult[];
        outputPath: string;
      },
    ) => {
      const { results, outputPath } = params;
      try {
        const outDir = path.dirname(outputPath);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        exportManifest(results, outputPath);
        return { success: true, outputPath };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // md5:compare-manifest — 清单比对
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'md5:compare-manifest',
    async (
      _event,
      params: {
        manifestPath: string;
        dirPath: string;
        algorithm?: HashAlgorithm;
      },
    ) => {
      const { manifestPath, dirPath, algorithm } = params;
      try {
        const result: ManifestCompareResult = await compareManifest(manifestPath, dirPath, algorithm);
        return { success: true, result };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // md5:generate-report — 生成归档报告
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'md5:generate-report',
    async (
      _event,
      params: {
        results: HashResult[];
        outputPath: string;
        options: ArchiveReportOptions;
      },
    ) => {
      const { results, outputPath, options } = params;
      try {
        const outDir = path.dirname(outputPath);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        await generateArchiveReport(results, outputPath, options);
        return { success: true, outputPath };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );
}

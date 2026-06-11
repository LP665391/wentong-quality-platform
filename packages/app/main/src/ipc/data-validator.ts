/**
 * 数据校验 IPC 通信层
 *
 * 注册 validator:* 系列的 ipcMain.handle 处理器，协调：
 * - ValidationEngine（@wentong/data-validator）进行文件校验
 * - TaskRepository（@wentong/database）进行任务/结果持久化
 * - 通过 event.sender.send 向渲染进程推送校验进度
 */

import { ipcMain } from 'electron';
import {
  ValidationEngine,
  Reporter,
  parseFile,
} from '@wentong/data-validator';
import type {
  ValidationProgress,
  ValidationReport,
} from '@wentong/data-validator';
import { getRepository } from '@wentong/database';

// ---------------------------------------------------------------------------
// 活跃引擎注册表
// ---------------------------------------------------------------------------

/** 所有正在运行的校验引擎，以 taskId 为键 */
const engines = new Map<string, ValidationEngine>();

// ---------------------------------------------------------------------------
// 导出注册函数
// ---------------------------------------------------------------------------

/**
 * 注册数据校验相关的所有 IPC 处理器
 */
export function setupDataValidatorIpc(): void {
  // -----------------------------------------------------------------------
  // validator:create — 创建校验任务
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'validator:create',
    (
      _event,
      params: {
        filePath: string;
        options: {
          preset?: 'standard' | 'strict' | 'loose';
          rules?: Array<{ type: string; config: Record<string, unknown> }>;
        };
      },
    ) => {
      const { filePath, options } = params;

      // 1) 创建数据库任务记录
      const repo = getRepository();
      const task = repo.createTask({
        module: 'validator',
        task_name: `数据校验 - ${filePath.split(/[/\\]/).pop() ?? 'unknown'}`,
        input_path: filePath,
        config_json: JSON.stringify(options),
      });

      // 2) 创建校验引擎
      const engine = new ValidationEngine();
      engines.set(task.task_id, engine);

      return { taskId: task.task_id, task };
    },
  );

  // -----------------------------------------------------------------------
  // validator:run — 执行校验
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'validator:run',
    async (
      event,
      params: {
        taskId: string;
        filePath: string;
        preset?: 'standard' | 'strict' | 'loose';
      },
    ) => {
      const { taskId, filePath, preset } = params;
      const repo = getRepository();

      // 1) 获取引擎
      let engine = engines.get(taskId);
      if (!engine) {
        engine = new ValidationEngine();
        engines.set(taskId, engine);
      }

      // 2) 如果使用 preset 且引擎尚无规则，先解析文件获取字段列表
      if (preset && engine.getActiveRules().size === 0) {
        const parseResult = await parseFile(filePath);
        engine.loadPreset(preset, parseResult.headers);
      }

      // 3) 更新任务状态为 running
      repo.updateTaskStatus(taskId, 'running');

      // 4) 进度回调：推送到渲染进程
      const onProgress = (progress: ValidationProgress): void => {
        event.sender.send('validator:progress', { taskId, progress });
      };

      try {
        // 5) 执行校验
        const report: ValidationReport = await engine.validate(
          filePath,
          taskId,
          onProgress,
        );

        // 6) 保存校验结果到数据库
        for (const err of report.errors) {
          repo.addValidationResult({
            task_id: taskId,
            row_number: err.rowNumber,
            error_type: err.errorType,
            field_name: err.fieldName,
            description: err.description,
            suggestion: err.suggestion,
            severity: err.severity,
          });
        }

        // 7) 更新任务为 completed
        repo.updateTaskStatus(taskId, 'completed');

        // 8) 保存报告到 result_json（通过底层 db 更新）
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify(report), taskId);
        } catch {
          // 非关键路径，忽略
        }

        return { success: true, report };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        repo.updateTaskStatus(taskId, 'failed', message);

        // 推送错误进度
        event.sender.send('validator:progress', {
          taskId,
          progress: {
            current: 0,
            total: 100,
            percent: 0,
            status: 'error' as const,
            message,
          },
        });

        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // validator:cancel — 取消校验
  // -----------------------------------------------------------------------

  ipcMain.handle('validator:cancel', (_event, params: { taskId: string }) => {
    const { taskId } = params;
    const repo = getRepository();

    // 1) 从 engines map 移除
    engines.delete(taskId);

    // 2) 更新任务状态为 cancelled
    repo.updateTaskStatus(taskId, 'cancelled');

    return { success: true };
  });

  // -----------------------------------------------------------------------
  // validator:export — 导出报告
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'validator:export',
    async (
      _event,
      params: {
        taskId: string;
        format: 'excel' | 'json' | 'csv';
        outputPath: string;
      },
    ) => {
      const { taskId, format, outputPath } = params;
      const repo = getRepository();

      // 1) 获取任务记录中的报告 JSON
      const task = repo.getTask(taskId);
      if (!task || !task.result_json) {
        return { success: false, error: '未找到校验报告' };
      }

      let report: ValidationReport;
      try {
        report = JSON.parse(task.result_json) as ValidationReport;
      } catch {
        return { success: false, error: '报告数据解析失败' };
      }

      // 2) 使用 Reporter 导出
      await Reporter.exportFile(report, format, outputPath);

      return { success: true, outputPath };
    },
  );
}

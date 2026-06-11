/**
 * 文档管理 IPC 通信层
 *
 * 注册 doc:* 系列的 ipcMain.handle 处理器，协调：
 * - parseDocument（@wentong/doc-manager）进行 Excel 解析
 * - TaskRepository（@wentong/database）进行任务持久化
 * - 通过 event.sender.send 向渲染进程推送解析进度
 */

import { ipcMain } from 'electron';
import { parseDocument } from '@wentong/doc-manager';
import type { DocResult } from '@wentong/doc-manager';
import { getRepository } from '@wentong/database';

// ---------------------------------------------------------------------------
// 导出注册函数
// ---------------------------------------------------------------------------

/**
 * 注册文档管理相关的所有 IPC 处理器
 */
export function setupDocManagerIpc(): void {
  // -----------------------------------------------------------------------
  // doc:parse — 解析 Excel 文档
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'doc:parse',
    async (
      event,
      params: {
        filePath: string;
        selectedFields?: number[];
      },
    ) => {
      const { filePath, selectedFields = [] } = params;

      try {
        const repo = getRepository();
        const fileName = filePath.split(/[/\\\\]/).pop() ?? 'unknown';
        const task = repo.createTask({
          module: 'doc',
          task_name: `文档解析 - ${fileName}`,
          input_path: filePath,
          config_json: JSON.stringify({ selectedFields }),
        });

        repo.updateTaskStatus(task.task_id, 'running');

        // 推送进度
        event.sender.send('doc:progress', {
          taskId: task.task_id,
          stage: 'parsing',
          message: '正在解析 Excel 文件...',
        });

        const result: DocResult = await parseDocument(filePath, selectedFields);

        repo.updateTaskStatus(task.task_id, 'completed');

        // 保存结果
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (repo as any).db
            .prepare('UPDATE tasks SET result_json = ? WHERE task_id = ?')
            .run(JSON.stringify(result), task.task_id);
        } catch {
          // 非关键路径
        }

        // 推送完成进度
        event.sender.send('doc:progress', {
          taskId: task.task_id,
          stage: 'done',
          message: `解析完成：${result.matchedFields}/${result.totalFields} 字段匹配成功`,
        });

        return { success: true, result };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        event.sender.send('doc:progress', {
          taskId: '',
          stage: 'error',
          message,
        });

        return { success: false, error: message };
      }
    },
  );
}

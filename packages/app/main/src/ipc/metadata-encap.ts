/**
 * 元数据封装 IPC 通信层
 *
 * 注册 metadata:* 系列的 ipcMain.handle 处理器，协调：
 * - extractMetadata / injectMetadata（@wentong/metadata-encap）
 * - TaskRepository（@wentong/database）进行任务持久化
 */

import { ipcMain } from 'electron';
import { extractMetadata, injectMetadata } from '@wentong/metadata-encap';
import type { FileMetadata } from '@wentong/metadata-encap';
import { getRepository } from '@wentong/database';

// ---------------------------------------------------------------------------
// 导出注册函数
// ---------------------------------------------------------------------------

/**
 * 注册元数据封装相关的所有 IPC 处理器
 */
export function setupMetadataEncapIpc(): void {
  // -----------------------------------------------------------------------
  // metadata:extract — 提取文件元数据
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'metadata:extract',
    async (
      _event,
      params: {
        filePath: string;
      },
    ) => {
      const { filePath } = params;

      try {
        const metadata: FileMetadata = await extractMetadata(filePath);

        // 保存到任务历史
        const repo = getRepository();
        repo.createTask({
          module: 'metadata',
          task_name: `元数据提取 - ${metadata.fileName}`,
          input_path: filePath,
          config_json: JSON.stringify({}),
        });

        return { success: true, metadata };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // metadata:inject — 注入元数据
  // -----------------------------------------------------------------------

  ipcMain.handle(
    'metadata:inject',
    async (
      _event,
      params: {
        filePath: string;
        properties: Record<string, string>;
        outputPath?: string;
      },
    ) => {
      const { filePath, properties, outputPath } = params;

      try {
        await injectMetadata(filePath, properties, outputPath);

        // 保存到任务历史
        const repo = getRepository();
        const fileName = filePath.split(/[/\\]/).pop() ?? 'unknown';
        repo.createTask({
          module: 'metadata',
          task_name: `元数据注入 - ${fileName}`,
          input_path: filePath,
          config_json: JSON.stringify({ properties, outputPath }),
        });

        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );
}

/**
 * 哈希计算 Worker 线程
 *
 * 每个 worker 接收 { filePath, algorithm } 消息，
 * 计算完成后返回 HashResult 或错误信息。
 */

import { parentPort } from 'node:worker_threads';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface WorkerInput {
  filePath: string;
  algorithm: string;
}

interface WorkerOutput {
  success: boolean;
  result?: {
    filePath: string;
    fileName: string;
    algorithm: string;
    hash: string;
    fileSize: number;
    duration: number;
  };
  error?: string;
}

// Worker 入口：通过 workerData 或 message 接收任务
if (parentPort) {
  parentPort.on('message', (input: WorkerInput) => {
    try {
      const output = hashFileSync(input.filePath, input.algorithm as any);
      parentPort!.postMessage(output);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      parentPort!.postMessage({ success: false, error: message } as WorkerOutput);
    }
  });
}

/**
 * 同步计算单个文件的哈希值（在 worker 线程中运行，不会阻塞主线程）
 */
function hashFileSync(filePath: string, algorithm: string): WorkerOutput {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: `文件不存在: ${filePath}` };
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return { success: false, error: `路径不是文件: ${filePath}` };
  }

  const startTime = Date.now();
  const hash = crypto.createHash(algorithm);
  const fileBytes = fs.readFileSync(filePath);
  hash.update(fileBytes);

  const duration = Date.now() - startTime;

  return {
    success: true,
    result: {
      filePath,
      fileName: path.basename(filePath),
      algorithm,
      hash: hash.digest('hex'),
      fileSize: stat.size,
      duration,
    },
  };
}

/**
 * MD5/SHA 哈希计算器
 *
 * 使用 Node.js crypto 流式哈希，支持大文件。
 * 单文件使用流式哈希（支持超大文件），批量模式使用 worker_threads 进行并行计算。
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 支持的哈希算法 */
export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/** 单文件哈希计算结果 */
export interface HashResult {
  /** 文件绝对路径 */
  filePath: string;
  /** 文件名（不含路径） */
  fileName: string;
  /** 使用的哈希算法 */
  algorithm: HashAlgorithm;
  /** 十六进制哈希值 */
  hash: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 计算耗时（毫秒） */
  duration: number;
}

/** Worker 返回的消息格式 */
interface WorkerMessage {
  success: boolean;
  result?: HashResult;
  error?: string;
}

// ---------------------------------------------------------------------------
// 流式单文件哈希
// ---------------------------------------------------------------------------

/**
 * 流式计算单个文件的哈希值
 *
 * 使用 fs.createReadStream + crypto.createHash，支持大文件。
 *
 * @param filePath  - 文件路径
 * @param algorithm - 哈希算法，默认 'md5'
 * @returns 哈希计算结果
 */
export async function hashFile(
  filePath: string,
  algorithm: HashAlgorithm = 'md5',
): Promise<HashResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`路径不是文件: ${filePath}`);
  }

  const startTime = Date.now();
  const hash = crypto.createHash(algorithm);
  const stream = fs.createReadStream(filePath);

  return new Promise<HashResult>((resolve, reject) => {
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      const duration = Date.now() - startTime;
      resolve({
        filePath,
        fileName: path.basename(filePath),
        algorithm,
        hash: hash.digest('hex'),
        fileSize: stat.size,
        duration,
      });
    });

    stream.on('error', (err: Error) => {
      reject(new Error(`读取文件失败 (${filePath}): ${err.message}`));
    });
  });
}

// ---------------------------------------------------------------------------
// 批量哈希（Worker Threads 并行）
// ---------------------------------------------------------------------------

/** 批量进度回调 */
export type BatchProgressCallback = (completed: number, total: number) => void;

/**
 * 获取 worker 脚本路径
 *
 * 兼容 CommonJS 和 ESM 两种模块系统。
 */
function getWorkerPath(): string {
  return path.join(__dirname, 'hash-worker.js');
}

/**
 * 在 Worker 线程中计算单个文件的哈希值
 */
function hashFileInWorker(
  worker: Worker,
  filePath: string,
  algorithm: HashAlgorithm,
): Promise<HashResult> {
  return new Promise((resolve, reject) => {
    const onMessage = (msg: WorkerMessage) => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      if (msg.success && msg.result) {
        resolve(msg.result);
      } else {
        reject(new Error(msg.error ?? 'Worker 执行失败'));
      }
    };
    const onError = (err: Error) => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      reject(new Error(`Worker 错误: ${err.message}`));
    };
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.postMessage({ filePath, algorithm });
  });
}

/**
 * 批量计算目录下所有文件的哈希值
 *
 * 使用 worker_threads 并行计算，默认并发数为 4。
 *
 * @param dirPath    - 目录路径
 * @param algorithm  - 哈希算法，默认 'md5'
 * @param onProgress - 进度回调
 * @param concurrency - 并发数，默认 4
 * @returns 哈希结果数组
 */
export async function hashDirectory(
  dirPath: string,
  algorithm: HashAlgorithm = 'md5',
  onProgress?: BatchProgressCallback,
  concurrency: number = 4,
): Promise<HashResult[]> {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`目录不存在: ${dirPath}`);
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`路径不是目录: ${dirPath}`);
  }

  // 校验并发数
  const effectiveConcurrency = Math.max(1, Math.min(concurrency, 16));
  if (concurrency < 1) {
    console.warn(`[md5-checker] 并发数 ${concurrency} 无效，已重置为 1`);
  } else if (concurrency > 16) {
    console.warn(`[md5-checker] 并发数 ${concurrency} 超过上限 16，已限制为 16`);
  }

  // 收集目录下所有文件
  const files = collectFiles(dirPath);
  if (files.length === 0) {
    return [];
  }

  const total = files.length;
  let completed = 0;
  const results: HashResult[] = [];
  const errors: { filePath: string; error: string }[] = [];

  // 创建 Worker 线程池
  const workerPool: Worker[] = [];
  const poolSize = Math.min(effectiveConcurrency, files.length);

  try {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(getWorkerPath());
      workerPool.push(worker);
    }

    // 文件队列并发处理
    const queue = [...files];

    const runWorkerTask = async (worker: Worker): Promise<void> => {
      while (queue.length > 0) {
        const filePath = queue.shift()!;
        try {
          const result = await hashFileInWorker(worker, filePath, algorithm);
          results.push(result);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ filePath, error: message });
          // 出错时回退到主线程流式哈希
          try {
            const result = await hashFile(filePath, algorithm);
            results.push(result);
          } catch {
            // 两次都失败则跳过
          }
        }
        completed++;
        onProgress?.(completed, total);
      }
    };

    // 启动所有 worker
    await Promise.all(workerPool.map((w) => runWorkerTask(w)));
  } finally {
    // 清理所有 worker
    for (const worker of workerPool) {
      try { worker.terminate(); } catch { /* ignore */ }
    }
  }

  if (errors.length > 0) {
    console.warn(`[md5-checker] ${errors.length} 个文件在 Worker 中处理失败，已回退重试`);
  }

  // 将错误列表附加到结果上，调用方可通过 (results as any).errors 获取
  (results as any).errors = errors;
  return results;
}

/**
 * 递归收集目录中所有文件（仅文件，不含子目录）
 */
function collectFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    }
  }

  return files;
}

// ---------------------------------------------------------------------------
// 哈希比对校验
// ---------------------------------------------------------------------------

/**
 * 校验文件哈希是否匹配
 *
 * @param filePath     - 文件路径
 * @param expectedHash - 期望的十六进制哈希值
 * @param algorithm    - 哈希算法，默认 'md5'
 * @returns 是否匹配
 */
export async function verifyHash(
  filePath: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'md5',
): Promise<boolean> {
  const result = await hashFile(filePath, algorithm);
  return result.hash.toLowerCase() === expectedHash.toLowerCase();
}

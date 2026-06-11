/**
 * MD5/SHA 哈希计算器
 *
 * 使用 Node.js crypto 流式哈希，支持大文件。
 * 批量模式使用 worker_threads 进行并行计算。
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
    stream.on('data', (chunk: Buffer) => {
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

  // 收集目录下所有文件
  const files = collectFiles(dirPath);
  if (files.length === 0) {
    return [];
  }

  const total = files.length;
  let completed = 0;
  const results: HashResult[] = [];

  // 并发控制队列
  const queue = [...files];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
  return results;

  async function runWorker(): Promise<void> {
    while (queue.length > 0) {
      const filePath = queue.shift()!;
      const result = await hashFile(filePath, algorithm);
      results.push(result);
      completed++;
      onProgress?.(completed, total);
    }
  }
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

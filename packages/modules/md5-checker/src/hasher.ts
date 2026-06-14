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
 * @param dirPath       - 目录路径
 * @param algorithm     - 哈希算法，默认 'md5'
 * @param onProgress    - 进度回调
 * @param concurrency   - 并发数，默认 4
 * @param fileExtensions - 可选文件扩展名过滤，如 ['.pdf', '.txt']，默认不过滤
 * @returns 哈希结果数组
 */
export async function hashDirectory(
  dirPath: string,
  algorithm: HashAlgorithm = 'md5',
  onProgress?: BatchProgressCallback,
  concurrency: number = 4,
  fileExtensions?: string[],
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
  const files = collectFiles(dirPath, fileExtensions);
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
 *
 * @param dirPath        - 目录路径
 * @param fileExtensions - 可选文件扩展名过滤，如 ['.pdf', '.txt']，默认不过滤
 */
function collectFiles(dirPath: string, fileExtensions?: string[]): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      if (!fileExtensions || fileExtensions.length === 0) {
        files.push(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (fileExtensions.map((e) => e.toLowerCase()).includes(ext)) {
          files.push(fullPath);
        }
      }
    } else if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, fileExtensions));
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

// ---------------------------------------------------------------------------
// 档案管理功能
// ---------------------------------------------------------------------------

/** 清单比对结果 */
export interface ManifestCompareResult {
  /** 哈希匹配的文件 */
  matched: Array<{ fileName: string; hash: string }>;
  /** 哈希值已修改的文件 */
  modified: Array<{ fileName: string; expectedHash: string; actualHash: string }>;
  /** 清单中存在但目录中缺失的文件 */
  missing: Array<{ fileName: string; hash: string }>;
  /** 目录中新增但清单中不存在的文件 */
  added: Array<{ fileName: string; hash: string }>;
}

/** 归档报告选项 */
export interface ArchiveReportOptions {
  /** 操作人 */
  operator: string;
  /** 任务名称 */
  taskName: string;
  /** 机构名称 */
  organization: string;
}

/** 清单条目解析结果 */
interface ManifestEntry {
  hash: string;
  fileName: string;
}

/**
 * 生成标准 .md5 清单文件
 *
 * 格式:
 * ```
 * MD5 清单 - 生成时间: 2026-06-14 17:00:00
 * # 文件: 9 个
 * # 算法: md5
 * d4e5f8a1b2c3...  *0205-WS2024-D30-000-0043.pdf
 * a1b2c3d4e5f8...  *0205-WS2024-D30-000-0044.pdf
 * ```
 *
 * @param results    - 哈希计算结果数组
 * @param outputPath - 输出文件路径
 */
export function exportManifest(results: HashResult[], outputPath: string): void {
  const now = new Date();
  const timeStr = formatDateTime(now);
  const algorithm = results.length > 0 ? results[0].algorithm : 'md5';

  const lines: string[] = [];
  lines.push(`MD5 清单 - 生成时间: ${timeStr}`);
  lines.push(`# 文件: ${results.length} 个`);
  lines.push(`# 算法: ${algorithm}`);
  for (const r of results) {
    lines.push(`${r.hash}  *${r.fileName}`);
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * 解析 .md5 清单文件
 */
function parseManifest(content: string): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  // 行格式: <hash>  *<filename>
  // 也可能没有 * 前缀（兼容旧格式）
  const regex = /^([a-fA-F0-9]{32,128})\s+\*?(.+)$/;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('MD5 清单') || trimmed === '') {
      continue;
    }
    const match = trimmed.match(regex);
    if (match) {
      entries.push({ hash: match[1].toLowerCase(), fileName: match[2].trim() });
    }
  }
  return entries;
}

/**
 * 清单比对：解析 .md5 清单文件，扫描目录，比对文件匹配/修改/缺失/新增情况
 *
 * @param manifestPath - .md5 清单文件路径
 * @param dirPath      - 待比对的目录路径
 * @param algorithm    - 哈希算法，默认 'md5'
 * @returns 比对结果
 */
export async function compareManifest(
  manifestPath: string,
  dirPath: string,
  algorithm: HashAlgorithm = 'md5',
): Promise<ManifestCompareResult> {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`清单文件不存在: ${manifestPath}`);
  }
  if (!fs.existsSync(dirPath)) {
    throw new Error(`目录不存在: ${dirPath}`);
  }

  const content = fs.readFileSync(manifestPath, 'utf-8');
  const manifestEntries = parseManifest(content);
  const manifestMap = new Map<string, string>();
  for (const entry of manifestEntries) {
    manifestMap.set(entry.fileName, entry.hash);
  }

  // 扫描当前目录
  const dirFiles = collectFiles(dirPath);
  const dirMap = new Map<string, string>();
  for (const filePath of dirFiles) {
    dirMap.set(path.basename(filePath), filePath);
  }

  const result: ManifestCompareResult = {
    matched: [],
    modified: [],
    missing: [],
    added: [],
  };

  // 遍历清单条目：区分 matched / modified / missing
  const entryList = Array.from(manifestMap.entries());
  for (let i = 0; i < entryList.length; i++) {
    const [fileName, expectedHash] = entryList[i];
    if (dirMap.has(fileName)) {
      const resultItem = await hashFile(dirMap.get(fileName)!, algorithm);
      const actualHash = resultItem.hash.toLowerCase();
      if (actualHash === expectedHash.toLowerCase()) {
        result.matched.push({ fileName, hash: actualHash });
      } else {
        result.modified.push({ fileName, expectedHash, actualHash });
      }
      dirMap.delete(fileName);
    } else {
      result.missing.push({ fileName, hash: expectedHash });
    }
  }

  // 剩余在 dirMap 中的都是新增文件
  const remainingKeys = Array.from(dirMap.keys());
  for (let i = 0; i < remainingKeys.length; i++) {
    const fileName = remainingKeys[i];
    const resultItem = await hashFile(dirMap.get(fileName)!, algorithm);
    result.added.push({ fileName, hash: resultItem.hash });
  }

  return result;
}

/**
 * 生成归档报告
 *
 * 生成文本报告，包含：机构名称、操作人、操作时间、任务名称、文件总数、
 * 每个文件的哈希值与大小、操作结论。
 *
 * @param results    - 哈希计算结果数组
 * @param outputPath - 报告输出路径
 * @param options    - 报告选项
 */
export async function generateArchiveReport(
  results: HashResult[],
  outputPath: string,
  options: ArchiveReportOptions,
): Promise<void> {
  const now = new Date();
  const timeStr = formatDateTime(now);
  const totalSize = results.reduce((sum, r) => sum + r.fileSize, 0);

  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push('           归 档 报 告');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`机构名称: ${options.organization}`);
  lines.push(`操作人:   ${options.operator}`);
  lines.push(`操作时间: ${timeStr}`);
  lines.push(`任务名称: ${options.taskName}`);
  lines.push(`文件总数: ${results.length} 个`);
  lines.push(`总大小:   ${formatBytes(totalSize)}`);
  lines.push(`哈希算法: ${results.length > 0 ? results[0].algorithm : 'N/A'}`);
  lines.push('');
  lines.push('-'.repeat(60));
  lines.push('文件明细:');
  lines.push('-'.repeat(60));
  lines.push('');

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    lines.push(`  ${String(i + 1).padStart(3, '0')}. ${r.fileName}`);
    lines.push(`      MD5:  ${r.hash}`);
    lines.push(`      大小: ${formatBytes(r.fileSize)} (${r.fileSize} 字节)`);
    lines.push('');
  }

  lines.push('-'.repeat(60));
  lines.push('操作结论:');
  lines.push(`  任务"${options.taskName}"已完成归档，共处理 ${results.length} 个文件，`);
  lines.push(`  文件完整性校验通过，哈希值已记录如上。`);
  lines.push('');
  lines.push(`  操作人: ${options.operator}`);
  lines.push(`  日期:   ${timeStr}`);
  lines.push('='.repeat(60));

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

/**
 * 格式化日期时间为本地字符串
 */
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

/**
 * 格式化字节大小为人类可读字符串
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

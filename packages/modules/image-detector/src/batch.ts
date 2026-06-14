import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ImageDetector, DetectionResult } from './detector.js';

/**
 * 批量处理器
 * 扫描目录中的图像文件并并发执行检测
 */
export class BatchProcessor {
  // 支持的文件扩展名（包含档案常用格式）
  private readonly supportedExtensions = new Set([
    '.jpg', '.jpeg', '.png', '.bmp', '.webp',
    '.tiff', '.tif',  // 档案保存级格式
    '.pdf',           // 档案利用级格式
  ]);

  constructor(
    private detector: ImageDetector,
    private concurrency: number = 4
  ) {}

  /**
   * 扫描并处理目录中的所有图像文件（单模型）
   */
  async processDirectory(
    dirPath: string,
    modelId: string,
    options?: {
      recursive?: boolean;
      onProgress?: (current: number, total: number, fileName: string) => void;
    }
  ): Promise<DetectionResult[]> {
    const { recursive = false, onProgress } = options ?? {};

    // 扫描文件
    const files = this.scanFiles(dirPath, recursive);
    const imageFiles = files.filter((f) =>
      this.supportedExtensions.has(path.extname(f).toLowerCase())
    );

    if (imageFiles.length === 0) {
      return [];
    }

    const results: DetectionResult[] = [];
    let completed = 0;
    const total = imageFiles.length;

    // 并发控制
    const queue = [...imageFiles];

    const worker = async () => {
      while (queue.length > 0) {
        const filePath = queue.shift();
        if (!filePath) break;

        const result = await this.detector.detect(filePath, modelId);
        results.push(result);
        completed++;
        onProgress?.(completed, total, path.basename(filePath));
      }
    };

    // 启动并发 workers
    const workers = Array.from(
      { length: Math.min(this.concurrency, imageFiles.length) },
      () => worker()
    );

    await Promise.all(workers);

    return results;
  }

  /**
   * 扫描并处理目录中的所有图像文件（预设模式）
   * 对每个文件执行预设中的所有检测模型
   */
  async processDirectoryWithPreset(
    dirPath: string,
    presetId: string,
    options?: {
      recursive?: boolean;
      onProgress?: (current: number, total: number, fileName: string) => void;
    }
  ): Promise<DetectionResult[]> {
    const { recursive = false, onProgress } = options ?? {};

    // 扫描文件
    const files = this.scanFiles(dirPath, recursive);
    const imageFiles = files.filter((f) =>
      this.supportedExtensions.has(path.extname(f).toLowerCase())
    );

    if (imageFiles.length === 0) {
      return [];
    }

    const results: DetectionResult[] = [];
    let completed = 0;
    const total = imageFiles.length;

    // 串行处理（因为每个文件需要多个检测模型）
    for (const filePath of imageFiles) {
      const result = await this.detector.detectBatch(
        [filePath],
        presetId
      );
      // detectBatch 返回 BatchDetectionResult，取第一个结果
      if (result.results.length > 0) {
        results.push(result.results[0]);
      }
      completed++;
      onProgress?.(completed, total, path.basename(filePath));
    }

    return results;
  }

  /**
   * 扫描文件列表
   */
  private scanFiles(dirPath: string, recursive: boolean): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        files.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        files.push(...this.scanFiles(fullPath, recursive));
      }
    }

    return files;
  }
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ImageDetector, DetectionResult } from './detector.js';

/**
 * 批量处理器
 * 扫描目录中的图像文件并并发执行检测
 */
export class BatchProcessor {
  private readonly supportedExtensions = new Set([
    '.jpg', '.jpeg', '.png', '.bmp', '.webp',
  ]);

  constructor(
    private detector: ImageDetector,
    private concurrency: number = 4
  ) {}

  /**
   * 扫描并处理目录中的所有图像文件
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

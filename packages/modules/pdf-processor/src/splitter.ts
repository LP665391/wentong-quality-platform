import { PDFDocument } from 'pdf-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SplitOptions {
  /** 拆分模式：pages=按每N页拆分, range=按页码范围拆分 */
  mode: 'pages' | 'range';
  /** mode=pages 时使用：每个拆分文件包含的页数 */
  pagesPerPart?: number;
  /** mode=range 时使用：页码范围数组（start/end 为 1-indexed，闭区间） */
  ranges?: Array<{ start: number; end: number }>;
}

/**
 * PDF 拆分器
 * 将 PDF 文件按页或页码范围拆分为多个文件
 */
export class PdfSplitter {
  /**
   * 拆分 PDF 文件
   * @param filePath - 源 PDF 文件路径
   * @param outputDir - 输出目录
   * @param options - 拆分选项
   * @param onProgress - 进度回调 (当前页索引, 总页数)
   * @returns 生成的 PDF 文件路径数组
   */
  async split(
    filePath: string,
    outputDir: string,
    options: SplitOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<string[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 确保输出目录存在
    fs.mkdirSync(outputDir, { recursive: true });

    const fileBytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength
    ));

    const totalPages = doc.getPageCount();
    if (totalPages === 0) {
      return [];
    }

    const baseName = path.basename(filePath, path.extname(filePath));
    const outputPaths: string[] = [];

    if (options.mode === 'pages') {
      const pagesPerPart = options.pagesPerPart ?? 1;
      if (pagesPerPart < 1) {
        throw new Error('pagesPerPart 必须 >= 1');
      }

      const partCount = Math.ceil(totalPages / pagesPerPart);
      for (let i = 0; i < partCount; i++) {
        const start = i * pagesPerPart;
        const end = Math.min(start + pagesPerPart, totalPages);

        const newDoc = await PDFDocument.create();
        const pageIndices = Array.from(
          { length: end - start },
          (_, j) => start + j
        );
        const pages = await newDoc.copyPages(doc, pageIndices);
        for (const page of pages) {
          newDoc.addPage(page);
        }

        const partBytes = await newDoc.save();
        const partPath = path.join(
          outputDir,
          `${baseName}-part${i + 1}.pdf`
        );
        fs.writeFileSync(partPath, Buffer.from(partBytes));
        outputPaths.push(partPath);

        onProgress?.(i + 1, partCount);
      }
    } else if (options.mode === 'range') {
      const ranges = options.ranges ?? [];
      if (ranges.length === 0) {
        throw new Error('range 模式下 ranges 不能为空');
      }

      for (let i = 0; i < ranges.length; i++) {
        const { start, end } = ranges[i]!;
        if (start < 1 || end > totalPages || start > end) {
          throw new Error(
            `页码范围无效: ${start}-${end}（总共 ${totalPages} 页）`
          );
        }

        // 转换为 0-indexed
        const pageIndices = Array.from(
          { length: end - start + 1 },
          (_, j) => start - 1 + j
        );

        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(doc, pageIndices);
        for (const page of pages) {
          newDoc.addPage(page);
        }

        const rangeBytes = await newDoc.save();
        const rangePath = path.join(
          outputDir,
          `${baseName}-range${i + 1}-p${start}-${end}.pdf`
        );
        fs.writeFileSync(rangePath, Buffer.from(rangeBytes));
        outputPaths.push(rangePath);

        onProgress?.(i + 1, ranges.length);
      }
    }

    return outputPaths;
  }
}

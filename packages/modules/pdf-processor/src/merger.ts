import { PDFDocument } from 'pdf-lib';
import * as fs from 'node:fs';

export interface MergeResult {
  totalPages: number;
  outputPath: string;
}

/**
 * PDF 合并器
 * 将多个 PDF 文件合并为一个
 */
export class PdfMerger {
  /**
   * 合并多个 PDF 文件
   * @param filePaths - PDF 文件路径数组
   * @param outputPath - 输出文件路径
   * @param onProgress - 进度回调 (当前加载文件索引, 总文件数)
   * @returns 合并结果（总页数和输出路径）
   */
  async merge(
    filePaths: string[],
    outputPath: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<MergeResult> {
    if (filePaths.length === 0) {
      throw new Error('合并文件列表不能为空');
    }

    // 验证所有文件存在
    for (let i = 0; i < filePaths.length; i++) {
      if (!fs.existsSync(filePaths[i]!)) {
        throw new Error(`文件不存在: ${filePaths[i]}`);
      }
    }

    const mergedDoc = await PDFDocument.create();
    let totalPages = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]!;
      const fileBytes = fs.readFileSync(filePath);
      const doc = await PDFDocument.load(fileBytes.buffer.slice(
        fileBytes.byteOffset,
        fileBytes.byteOffset + fileBytes.byteLength
      ));

      const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      for (const page of pages) {
        mergedDoc.addPage(page);
        totalPages++;
      }

      onProgress?.(i + 1, filePaths.length);
    }

    const mergedBytes = await mergedDoc.save();
    fs.writeFileSync(outputPath, Buffer.from(mergedBytes));

    return { totalPages, outputPath };
  }
}

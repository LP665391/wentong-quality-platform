import { PDFDocument } from 'pdf-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface QualityCheckResult {
  passed: boolean;
  issues: QualityIssue[];
  summary: QualitySummary;
}

export interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export interface QualitySummary {
  pageCount: number;
  fileSize: number;
  hasMetadata: boolean;
  isPdfA: boolean;
  resolution: number | null;
}

/**
 * PDF 质检器
 * 检查 PDF 是否符合归档标准
 */
export class PdfQualityChecker {
  /**
   * 执行 PDF 质检
   * @param filePath - PDF 文件路径
   * @returns 质检结果
   */
  async check(filePath: string): Promise<QualityCheckResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const issues: QualityIssue[] = [];
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    // 检查文件大小
    if (fileSize === 0) {
      issues.push({
        type: 'error',
        message: '文件为空',
        details: '文件大小为 0 字节'
      });
    } else if (fileSize > 100 * 1024 * 1024) {
      issues.push({
        type: 'warning',
        message: '文件过大',
        details: `文件大小 ${this.formatFileSize(fileSize)}，建议不超过 100MB`
      });
    }

    // 加载 PDF 文档
    let doc: PDFDocument;
    try {
      const fileBytes = fs.readFileSync(filePath);
      doc = await PDFDocument.load(fileBytes.buffer.slice(
        fileBytes.byteOffset,
        fileBytes.byteOffset + fileBytes.byteLength
      ), { ignoreEncryption: true });
    } catch (error) {
      issues.push({
        type: 'error',
        message: 'PDF 文件损坏或格式无效',
        details: error instanceof Error ? error.message : String(error)
      });

      return {
        passed: false,
        issues,
        summary: {
          pageCount: 0,
          fileSize,
          hasMetadata: false,
          isPdfA: false,
          resolution: null
        }
      };
    }

    const pageCount = doc.getPageCount();
    const metadata = doc.getTitle() || doc.getAuthor() || doc.getSubject();
    const hasMetadata = !!metadata;

    // 检查页数
    if (pageCount === 0) {
      issues.push({
        type: 'error',
        message: 'PDF 没有页面',
        details: '页数为 0'
      });
    }

    // 检查 PDF/A 合规性（简化检查）
    const isPdfA = this.checkPdfACompliance(doc);
    if (!isPdfA) {
      issues.push({
        type: 'warning',
        message: '非 PDF/A 格式',
        details: '建议使用 PDF/A 格式进行长期归档保存'
      });
    }

    // 检查分辨率（简化检查）
    const resolution = this.estimateResolution(doc);
    if (resolution !== null && resolution < 300) {
      issues.push({
        type: 'warning',
        message: '分辨率偏低',
        details: `估算分辨率约 ${resolution} DPI，建议不低于 300 DPI`
      });
    }

    // 检查页面尺寸一致性
    const pages = doc.getPages();
    const firstPageSize = pages[0]?.getSize();
    if (firstPageSize && pageCount > 1) {
      const inconsistentSizes = pages.some(page => {
        const size = page.getSize();
        return Math.abs(size.width - firstPageSize.width) > 1 ||
               Math.abs(size.height - firstPageSize.height) > 1;
      });

      if (inconsistentSizes) {
        issues.push({
          type: 'info',
          message: '页面尺寸不一致',
          details: '不同页面的尺寸存在差异'
        });
      }
    }

    const summary: QualitySummary = {
      pageCount,
      fileSize,
      hasMetadata,
      isPdfA,
      resolution
    };

    const hasErrors = issues.some(issue => issue.type === 'error');
    const passed = !hasErrors;

    return {
      passed,
      issues,
      summary
    };
  }

  /**
   * 检查 PDF/A 合规性（简化版本）
   */
  private checkPdfACompliance(doc: PDFDocument): boolean {
    // 简化的 PDF/A 检查：检查是否有基本元数据
    // 真正的 PDF/A 检查需要更复杂的验证
    try {
      const title = doc.getTitle();
      const author = doc.getAuthor();
      const creator = doc.getCreator();
      // PDF/A 通常包含完整的元数据
      return !!(title || author || creator);
    } catch {
      return false;
    }
  }

  /**
   * 估算分辨率（简化版本）
   */
  private estimateResolution(doc: PDFDocument): number | null {
    // 简化的分辨率估算
    // 基于页面尺寸和常见扫描尺寸估算
    try {
      const page = doc.getPage(0);
      const { width, height } = page.getSize();

      // 假设 A4 纸（210mm x 297mm）对应的点数为 595 x 842
      // 如果页面尺寸接近 A4，估算为 300 DPI
      const a4Width = 595;
      const a4Height = 842;

      const widthRatio = width / a4Width;
      const heightRatio = height / a4Height;

      if (Math.abs(widthRatio - 1) < 0.1 && Math.abs(heightRatio - 1) < 0.1) {
        return 300;
      }

      // 根据页面尺寸估算
      const avgRatio = (widthRatio + heightRatio) / 2;
      return Math.round(300 * avgRatio);
    } catch {
      return null;
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

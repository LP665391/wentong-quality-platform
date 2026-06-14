import { PDFDocument, PageSizes } from 'pdf-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ImageToPdfOptions {
  /** 页面尺寸，默认 A4 */
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'auto';
  /** 图片在页面中的边距（点），默认 36（0.5英寸） */
  margin?: number;
  /** 图片方向，auto 表示根据图片宽高自动选择 */
  orientation?: 'portrait' | 'landscape' | 'auto';
  /** 是否保持图片原始比例，默认 true */
  maintainAspectRatio?: boolean;
}

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * 图片转 PDF 转换器
 * 将扫描的图片合成 PDF 文件
 */
export class ImageToPdf {
  /**
   * 将多张图片转换为一个 PDF 文件
   * @param imagePaths - 图片文件路径数组
   * @param outputPath - 输出 PDF 文件路径
   * @param options - 转换选项
   * @param onProgress - 进度回调 (当前图片索引, 总图片数)
   */
  async convert(
    imagePaths: string[],
    outputPath: string,
    options: ImageToPdfOptions = {},
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    if (imagePaths.length === 0) {
      throw new Error('图片列表不能为空');
    }

    // 验证所有文件存在且格式支持
    for (const imagePath of imagePaths) {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`文件不存在: ${imagePath}`);
      }
      const ext = path.extname(imagePath).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new Error(`不支持的图片格式: ${ext}（支持 ${SUPPORTED_EXTENSIONS.join(', ')}）`);
      }
    }

    const doc = await PDFDocument.create();
    const margin = options.margin ?? 36;
    const maintainAspectRatio = options.maintainAspectRatio ?? true;

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const fileBytes = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();

      // 根据格式嵌入图片
      let embeddedImage;
      if (ext === '.png') {
        embeddedImage = await doc.embedPng(fileBytes);
      } else {
        embeddedImage = await doc.embedJpg(fileBytes);
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      // 确定页面尺寸
      let pageSize: [number, number];
      const orientation = options.orientation ?? 'auto';

      if (options.pageSize === 'auto') {
        // 根据图片尺寸自动决定
        pageSize = [imgWidth + margin * 2, imgHeight + margin * 2];
      } else {
        const basePageSize = this.getPageSize(options.pageSize ?? 'A4');
        const isLandscape = orientation === 'landscape' ||
          (orientation === 'auto' && imgWidth > imgHeight);

        if (isLandscape) {
          pageSize = [basePageSize[1], basePageSize[0]];
        } else {
          pageSize = basePageSize;
        }
      }

      // 添加页面
      const page = doc.addPage(pageSize);
      const pageWidth = pageSize[0];
      const pageHeight = pageSize[1];

      // 计算图片在页面中的位置和尺寸
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      let drawWidth = imgWidth;
      let drawHeight = imgHeight;

      if (maintainAspectRatio) {
        const scaleX = availableWidth / imgWidth;
        const scaleY = availableHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY, 1); // 不放大超过原始尺寸

        drawWidth = imgWidth * scale;
        drawHeight = imgHeight * scale;
      } else {
        drawWidth = Math.min(imgWidth, availableWidth);
        drawHeight = Math.min(imgHeight, availableHeight);
      }

      // 居中放置
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });

      onProgress?.(i + 1, imagePaths.length);
    }

    // 确保输出目录存在
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const pdfBytes = await doc.save();
    fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  }

  /**
   * 获取页面尺寸（点）
   */
  private getPageSize(size: 'A4' | 'Letter' | 'Legal'): [number, number] {
    switch (size) {
      case 'A4':
        return PageSizes.A4;
      case 'Letter':
        return PageSizes.Letter;
      case 'Legal':
        return PageSizes.Legal;
      default:
        return PageSizes.A4;
    }
  }
}

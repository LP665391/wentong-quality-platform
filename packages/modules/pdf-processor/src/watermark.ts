import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as fs from 'node:fs';

export interface WatermarkOptions {
  /** 水印文字内容 */
  text: string;
  /** 字体大小，默认 48 */
  fontSize?: number;
  /** 不透明度 0-1，默认 0.3 */
  opacity?: number;
  /** 旋转角度（度数），默认 45 */
  rotation?: number;
  /** 文字颜色 RGB，默认灰色 { r: 0.5, g: 0.5, b: 0.5 } */
  color?: { r: number; g: number; b: number };
  /** 水印位置，默认 center */
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * PDF 水印处理器
 */
export class PdfWatermark {
  /**
   * 为 PDF 添加文字水印
   * @param filePath - 源 PDF 文件路径
   * @param outputPath - 输出路径
   * @param options - 水印选项
   */
  async addTextWatermark(
    filePath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    if (!options.text || options.text.length === 0) {
      throw new Error('水印文字不能为空');
    }

    const fileBytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength
    ));

    const font = await doc.embedFont(StandardFonts.Helvetica);

    const fontSize = options.fontSize ?? 48;
    const opacity = Math.max(0, Math.min(1, options.opacity ?? 0.3));
    const rotationDeg = options.rotation ?? 45;
    const color = options.color ?? { r: 0.5, g: 0.5, b: 0.5 };
    const position = options.position ?? 'center';

    const pages = doc.getPages();
    const textWidth = font.widthOfTextAtSize(options.text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    for (const page of pages) {
      const { width, height } = page.getSize();

      // 计算位置坐标
      const { x, y } = this.calcPosition(
        position,
        width,
        height,
        textWidth,
        textHeight
      );

      page.drawText(options.text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(rotationDeg),
      });
    }

    const outputBytes = await doc.save();
    fs.writeFileSync(outputPath, Buffer.from(outputBytes));
  }

  /**
   * 计算水印文字在页面上的位置
   */
  private calcPosition(
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    pageWidth: number,
    pageHeight: number,
    textWidth: number,
    textHeight: number
  ): { x: number; y: number } {
    const margin = 50;

    switch (position) {
      case 'center':
        return {
          x: (pageWidth - textWidth) / 2,
          y: (pageHeight - textHeight) / 2,
        };
      case 'top-left':
        return { x: margin, y: pageHeight - textHeight - margin };
      case 'top-right':
        return {
          x: pageWidth - textWidth - margin,
          y: pageHeight - textHeight - margin,
        };
      case 'bottom-left':
        return { x: margin, y: margin };
      case 'bottom-right':
        return { x: pageWidth - textWidth - margin, y: margin };
      default:
        return {
          x: (pageWidth - textWidth) / 2,
          y: (pageHeight - textHeight) / 2,
        };
    }
  }
}

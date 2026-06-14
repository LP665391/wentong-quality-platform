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
 * 支持中文水印文字（自动嵌入系统字体）
 */
export class PdfWatermark {
  /** 系统 CJK 字体候选路径 */
  private static readonly CJK_FONT_PATHS = [
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/Library/Fonts/Arial Unicode.ttf',
  ];

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

    const hasNonAscii = this.hasNonAscii(options.text);

    // 选择字体：中文使用 Arial Unicode，英文用 Helvetica
    let font;
    if (hasNonAscii) {
      font = await this.embedCjkFont(doc);
    } else {
      font = await doc.embedFont(StandardFonts.Helvetica);
    }

    const fontSize = options.fontSize ?? 48;
    const opacity = Math.max(0, Math.min(1, options.opacity ?? 0.5));
    const rotationDeg = options.rotation ?? 45;
    const color = options.color ?? { r: 0.2, g: 0.2, b: 0.2 };
    const position = options.position ?? 'center';

    const pages = doc.getPages();
    const textWidth = font.widthOfTextAtSize(options.text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    for (const page of pages) {
      const { width, height } = page.getSize();

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
    const outDir = filePath.substring(0, filePath.lastIndexOf('/') !== -1 ? filePath.lastIndexOf('/') : 0);
    if (outDir && !fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(outputBytes));
  }

  /**
   * 嵌入 CJK 字体，支持中文水印
   */
  private async embedCjkFont(doc: PDFDocument) {
    // 注册 fontkit
    try {
      const fontkit = require('fontkit');
      (doc as any).registerFontkit(fontkit);
    } catch {
      // fontkit 不可用，回退到标准字体
    }

    // 尝试系统 CJK 字体
    for (const fontPath of PdfWatermark.CJK_FONT_PATHS) {
      try {
        if (fs.existsSync(fontPath)) {
          const fontBytes = fs.readFileSync(fontPath);
          return await doc.embedFont(fontBytes);
        }
      } catch {
        continue;
      }
    }

    // 回退到 Helvetica（仅支持 ASCII，中文会报错）
    return doc.embedFont(StandardFonts.Helvetica);
  }

  /**
   * 检查是否包含非 ASCII 字符（中文等）
   */
  private hasNonAscii(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 127) return true;
    }
    return false;
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

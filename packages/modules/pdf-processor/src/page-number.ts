import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PageNumberOptions {
  /** 起始页码，默认 1 */
  startPage?: number;
  /** 页码格式：'arabic'(1,2,3) | 'roman'(i,ii,iii) | 'dash'(-1-,-2-,-3-) */
  format?: 'arabic' | 'roman' | 'dash';
  /** 页码位置 */
  position?: 'bottom-center' | 'bottom-left' | 'bottom-right';
  /** 字体大小，默认 12 */
  fontSize?: number;
  /** 文字颜色 RGB，默认黑色 */
  color?: { r: number; g: number; b: number };
  /** 跳过前 N 页（如封面），默认 0 */
  skipPages?: number;
  /** 页码前缀文字，如 "第 " */
  prefix?: string;
  /** 页码后缀文字，如 " 页" */
  suffix?: string;
  /** 自定义字体文件路径（TTF/OTF，用于支持中文字符） */
  fontPath?: string;
}

/**
 * PDF 页码编排器
 * 给档案 PDF 自动添加页码
 */
export class PdfPageNumber {
  /**
   * 为 PDF 添加页码
   * @param filePath - 源 PDF 文件路径
   * @param outputPath - 输出文件路径
   * @param options - 页码选项
   * @param onProgress - 进度回调 (当前页索引, 总页数)
   */
  async addPageNumbers(
    filePath: string,
    outputPath: string,
    options: PageNumberOptions = {},
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const fileBytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength
    ));

    const prefix = options.prefix ?? '';
    const suffix = options.suffix ?? '';
    const hasNonAscii = this.hasNonAscii(prefix + suffix);

    // 选择字体
    let font;
    if (options.fontPath) {
      // 用户指定了字体路径
      if (!fs.existsSync(options.fontPath)) {
        throw new Error(`字体文件不存在: ${options.fontPath}`);
      }
      const fontBytes = fs.readFileSync(options.fontPath);
      try {
        font = await doc.embedFont(fontBytes);
      } catch {
        throw new Error(`无法嵌入字体文件，请确保是 TTF/OTF 格式: ${options.fontPath}`);
      }
    } else if (hasNonAscii) {
      // 包含非 ASCII 字符时尝试使用系统中文字体
      font = await this.tryEmbedCjkFont(doc);
    } else {
      font = await doc.embedFont(StandardFonts.Helvetica);
    }

    const pages = doc.getPages();
    const totalPages = pages.length;

    const startPage = options.startPage ?? 1;
    const format = options.format ?? 'arabic';
    const position = options.position ?? 'bottom-center';
    const fontSize = options.fontSize ?? 12;
    const color = options.color ?? { r: 0, g: 0, b: 0 };
    const skipPages = options.skipPages ?? 0;

    for (let i = 0; i < totalPages; i++) {
      if (i < skipPages) {
        onProgress?.(i + 1, totalPages);
        continue;
      }

      const page = pages[i];
      const { width, height } = page.getSize();

      const pageNum = startPage + (i - skipPages);
      const pageNumText = this.formatPageNumber(pageNum, format);
      const displayText = `${prefix}${pageNumText}${suffix}`;

      const textWidth = font.widthOfTextAtSize(displayText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      const margin = 30;
      let x: number;
      let y: number;

      switch (position) {
        case 'bottom-center':
          x = (width - textWidth) / 2;
          y = margin;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'bottom-right':
          x = width - textWidth - margin;
          y = margin;
          break;
        default:
          x = (width - textWidth) / 2;
          y = margin;
      }

      page.drawText(displayText, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });

      onProgress?.(i + 1, totalPages);
    }

    const outputBytes = await doc.save();
    fs.writeFileSync(outputPath, Buffer.from(outputBytes));
  }

  /**
   * 尝试嵌入系统中文字体
   */
  private async tryEmbedCjkFont(doc: PDFDocument) {
    // 注册 fontkit，支持自定义字体嵌入
    try {
      const fontkit = require('fontkit');
      (doc as any).registerFontkit(fontkit);
    } catch (e) {
      console.error('[PdfPageNumber] fontkit registration failed:', e);
      // fontkit 不可用
    }

    // 尝试系统中的 TTF 中文字体
    const ttfCandidates = [
      '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      '/Library/Fonts/Arial Unicode.ttf',
    ];

    for (const fontPath of ttfCandidates) {
      try {
        if (fs.existsSync(fontPath)) {
          console.error('[PdfPageNumber] Found font:', fontPath);
          const fontBytes = fs.readFileSync(fontPath);
          const font = await doc.embedFont(fontBytes);
          console.error('[PdfPageNumber] Font embedded OK');
          return font;
        } else {
          console.error('[PdfPageNumber] Font NOT found:', fontPath);
        }
      } catch (e: any) {
        console.error('[PdfPageNumber] Font embed failed:', fontPath, '-', e?.message || e);
        continue;
      }
    }

    // 无可用中文字体，回退到 Helvetica（仅支持 ASCII，非 ASCII 会报错）
    return doc.embedFont(StandardFonts.Helvetica);
  }

  /**
   * 检查字符串是否包含非 ASCII 字符（如中文）
   */
  private hasNonAscii(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 127) return true;
    }
    return false;
  }

  private formatPageNumber(num: number, format: 'arabic' | 'roman' | 'dash'): string {
    switch (format) {
      case 'arabic':
        return String(num);
      case 'roman':
        return this.toRoman(num);
      case 'dash':
        return `-${num}-`;
      default:
        return String(num);
    }
  }

  private toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
      [1000, 'M'],
      [900, 'CM'],
      [500, 'D'],
      [400, 'CD'],
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];

    let result = '';
    let remaining = num;

    for (const [value, symbol] of romanNumerals) {
      while (remaining >= value) {
        result += symbol;
        remaining -= value;
      }
    }

    return result.toLowerCase();
  }
}

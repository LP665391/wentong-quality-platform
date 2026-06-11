import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { PdfMerger } from '../src/merger.js';
import { PdfSplitter } from '../src/splitter.js';
import { PdfEncryptor } from '../src/encryptor.js';
import { PdfWatermark } from '../src/watermark.js';

const TEST_DIR = path.join(os.tmpdir(), 'pdf-processor-test-' + Date.now());

/**
 * 创建一个指定页数的测试 PDF
 */
async function createTestPDF(
  filePath: string,
  pageCount: number,
  textPrefix: string = 'Page'
): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595, 842]); // A4
    page.drawText(`${textPrefix} ${i + 1}`, {
      x: 50,
      y: 800,
      size: 24,
      font,
    });
  }

  const bytes = await doc.save();
  fs.writeFileSync(filePath, Buffer.from(bytes));
}

describe('PdfMerger', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(TEST_DIR, 'merger');
    fs.mkdirSync(testDir, { recursive: true });

    await createTestPDF(path.join(testDir, 'doc1.pdf'), 2, 'Doc1');
    await createTestPDF(path.join(testDir, 'doc2.pdf'), 3, 'Doc2');
    await createTestPDF(path.join(testDir, 'doc3.pdf'), 1, 'Doc3');
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('应该合并3个PDF文件', async () => {
    const merger = new PdfMerger();
    const outputPath = path.join(testDir, 'merged.pdf');

    const result = await merger.merge(
      [
        path.join(testDir, 'doc1.pdf'),
        path.join(testDir, 'doc2.pdf'),
        path.join(testDir, 'doc3.pdf'),
      ],
      outputPath
    );

    expect(result.totalPages).toBe(6); // 2 + 3 + 1
    expect(result.outputPath).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);

    // 验证合并结果
    const bytes = fs.readFileSync(outputPath);
    const doc = await PDFDocument.load(bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ));
    expect(doc.getPageCount()).toBe(6);
  });

  it('应该触发进度回调', async () => {
    const merger = new PdfMerger();
    const outputPath = path.join(testDir, 'merged-progress.pdf');
    const progressCalls: [number, number][] = [];

    await merger.merge(
      [
        path.join(testDir, 'doc1.pdf'),
        path.join(testDir, 'doc2.pdf'),
      ],
      outputPath,
      (current, total) => {
        progressCalls.push([current, total]);
      }
    );

    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0]).toEqual([1, 2]);
    expect(progressCalls[1]).toEqual([2, 2]);
  });

  it('文件不存在时应抛出错误', async () => {
    const merger = new PdfMerger();
    const outputPath = path.join(testDir, 'nonexistent.pdf');

    await expect(
      merger.merge([path.join(testDir, 'not-exist.pdf')], outputPath)
    ).rejects.toThrow('文件不存在');
  });

  it('空文件列表时应抛出错误', async () => {
    const merger = new PdfMerger();
    const outputPath = path.join(testDir, 'empty.pdf');

    await expect(merger.merge([], outputPath)).rejects.toThrow(
      '合并文件列表不能为空'
    );
  });
});

describe('PdfSplitter', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(TEST_DIR, 'splitter');
    fs.mkdirSync(testDir, { recursive: true });

    await createTestPDF(path.join(testDir, 'source.pdf'), 5, 'Page');
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('按每2页拆分', async () => {
    const splitter = new PdfSplitter();
    const outputDir = path.join(testDir, 'by-pages');
    const sourcePath = path.join(testDir, 'source.pdf');

    const result = await splitter.split(sourcePath, outputDir, {
      mode: 'pages',
      pagesPerPart: 2,
    });

    // 5页，每2页 -> 3个文件（2+2+1）
    expect(result).toHaveLength(3);
    expect(fs.existsSync(result[0]!)).toBe(true);
    expect(fs.existsSync(result[1]!)).toBe(true);
    expect(fs.existsSync(result[2]!)).toBe(true);

    // 验证页面数
    const doc1 = await PDFDocument.load(
      fs.readFileSync(result[0]!)
    );
    const doc2 = await PDFDocument.load(
      fs.readFileSync(result[1]!)
    );
    const doc3 = await PDFDocument.load(
      fs.readFileSync(result[2]!)
    );
    expect(doc1.getPageCount()).toBe(2);
    expect(doc2.getPageCount()).toBe(2);
    expect(doc3.getPageCount()).toBe(1);
  });

  it('按页码范围拆分', async () => {
    const splitter = new PdfSplitter();
    const outputDir = path.join(testDir, 'by-range');
    const sourcePath = path.join(testDir, 'source.pdf');

    const result = await splitter.split(sourcePath, outputDir, {
      mode: 'range',
      ranges: [
        { start: 1, end: 2 },
        { start: 3, end: 5 },
      ],
    });

    expect(result).toHaveLength(2);
    expect(fs.existsSync(result[0]!)).toBe(true);
    expect(fs.existsSync(result[1]!)).toBe(true);

    const doc1 = await PDFDocument.load(
      fs.readFileSync(result[0]!)
    );
    const doc2 = await PDFDocument.load(
      fs.readFileSync(result[1]!)
    );
    expect(doc1.getPageCount()).toBe(2);
    expect(doc2.getPageCount()).toBe(3);
  });

  it('默认 pagesPerPart=1', async () => {
    const splitter = new PdfSplitter();
    const outputDir = path.join(testDir, 'by-single');
    const sourcePath = path.join(testDir, 'source.pdf');

    const result = await splitter.split(sourcePath, outputDir, {
      mode: 'pages',
    });

    expect(result).toHaveLength(5);
  });

  it('应该触发进度回调', async () => {
    const splitter = new PdfSplitter();
    const outputDir = path.join(testDir, 'progress');
    const sourcePath = path.join(testDir, 'source.pdf');
    const progressCalls: [number, number][] = [];

    await splitter.split(
      sourcePath,
      outputDir,
      { mode: 'pages', pagesPerPart: 1 },
      (current, total) => {
        progressCalls.push([current, total]);
      }
    );

    expect(progressCalls).toHaveLength(5);
    expect(progressCalls[4]![0]).toBe(5);
    expect(progressCalls[4]![1]).toBe(5);
  });
});

describe('PdfEncryptor', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(TEST_DIR, 'encryptor');
    fs.mkdirSync(testDir, { recursive: true });

    await createTestPDF(path.join(testDir, 'source.pdf'), 2, 'SecretPage');
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('应该加密 PDF', async () => {
    const encryptor = new PdfEncryptor();
    const sourcePath = path.join(testDir, 'source.pdf');
    const encryptedPath = path.join(testDir, 'encrypted.pdf');

    await encryptor.encrypt(sourcePath, encryptedPath, {
      userPassword: 'user123',
      ownerPassword: 'owner456',
      canPrint: true,
      canModify: false,
      canCopy: false,
    });

    expect(fs.existsSync(encryptedPath)).toBe(true);

    // 加密后的文件应该不同
    const sourceBytes = fs.readFileSync(sourcePath);
    const encryptedBytes = fs.readFileSync(encryptedPath);
    expect(sourceBytes.equals(encryptedBytes)).toBe(false);
  });

  it('应该解密 PDF', async () => {
    const encryptor = new PdfEncryptor();
    const sourcePath = path.join(testDir, 'source.pdf');
    const encryptedPath = path.join(testDir, 'encrypted-decrypt.pdf');
    const decryptedPath = path.join(testDir, 'decrypted.pdf');

    // 先加密
    await encryptor.encrypt(sourcePath, encryptedPath, {
      userPassword: 'test123',
    });

    // 再解密
    await encryptor.decrypt(encryptedPath, 'test123', decryptedPath);

    expect(fs.existsSync(decryptedPath)).toBe(true);

    // 解密后的文件应该是有效的 PDF，且页数与源文件一致
    const bytes = fs.readFileSync(decryptedPath);
    const doc = await PDFDocument.load(bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ));
    expect(doc.getPageCount()).toBe(2);
  });

  it('空密码应报错', async () => {
    const encryptor = new PdfEncryptor();
    const sourcePath = path.join(testDir, 'source.pdf');
    const outputPath = path.join(testDir, 'empty-password.pdf');

    await expect(
      encryptor.encrypt(sourcePath, outputPath, {
        userPassword: '',
      })
    ).rejects.toThrow('用户密码不能为空');
  });
});

describe('PdfWatermark', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(TEST_DIR, 'watermark');
    fs.mkdirSync(testDir, { recursive: true });

    await createTestPDF(path.join(testDir, 'source.pdf'), 3, 'Original');
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('应该添加文字水印', async () => {
    const watermark = new PdfWatermark();
    const sourcePath = path.join(testDir, 'source.pdf');
    const outputPath = path.join(testDir, 'watermarked.pdf');

    await watermark.addTextWatermark(sourcePath, outputPath, {
      text: 'CONFIDENTIAL',
      fontSize: 48,
      opacity: 0.3,
      rotation: 45,
      color: { r: 1, g: 0, b: 0 },
      position: 'center',
    });

    expect(fs.existsSync(outputPath)).toBe(true);

    // 验证输出是有效的 PDF，页数不变
    const bytes = fs.readFileSync(outputPath);
    const doc = await PDFDocument.load(bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ));
    expect(doc.getPageCount()).toBe(3);
  });

  it('默认参数应该正常工作', async () => {
    const watermark = new PdfWatermark();
    const sourcePath = path.join(testDir, 'source.pdf');
    const outputPath = path.join(testDir, 'watermarked-default.pdf');

    await watermark.addTextWatermark(sourcePath, outputPath, {
      text: 'DRAFT',
    });

    expect(fs.existsSync(outputPath)).toBe(true);

    const bytes = fs.readFileSync(outputPath);
    const doc = await PDFDocument.load(bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ));
    expect(doc.getPageCount()).toBe(3);
  });

  it('空文字应报错', async () => {
    const watermark = new PdfWatermark();
    const sourcePath = path.join(testDir, 'source.pdf');
    const outputPath = path.join(testDir, 'empty-text.pdf');

    await expect(
      watermark.addTextWatermark(sourcePath, outputPath, {
        text: '',
      })
    ).rejects.toThrow('水印文字不能为空');
  });

  it('文件不存在应报错', async () => {
    const watermark = new PdfWatermark();
    const outputPath = path.join(testDir, 'nonexist.pdf');

    await expect(
      watermark.addTextWatermark(
        path.join(testDir, 'not-exist.pdf'),
        outputPath,
        { text: 'X' }
      )
    ).rejects.toThrow('文件不存在');
  });
});

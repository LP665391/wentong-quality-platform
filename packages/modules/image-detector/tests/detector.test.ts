import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ImageDetector } from '../src/detector.js';
import { getBuiltInModels } from '../src/models.js';
import { BatchProcessor } from '../src/batch.js';
import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const TEST_DIR = path.join(os.tmpdir(), 'image-detector-test-' + Date.now());

async function createTestImageFile(
  dir: string,
  name: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
  format: 'png' | 'jpeg' = 'png'
): Promise<string> {
  const channels = 4;
  const buf = Buffer.alloc(width * height * channels);

  for (let i = 0; i < width * height; i++) {
    const off = i * channels;
    buf[off] = color.r;
    buf[off + 1] = color.g;
    buf[off + 2] = color.b;
    buf[off + 3] = 255;
  }

  const filePath = path.join(dir, name);
  let pipeline = sharp(buf, { raw: { width, height, channels } });

  if (format === 'png') pipeline = pipeline.png();
  else pipeline = pipeline.jpeg();

  await pipeline.toFile(filePath);
  return filePath;
}

describe('ImageDetector', () => {
  let detector: ImageDetector;
  let testDir: string;

  beforeAll(() => {
    detector = new ImageDetector();
    fs.mkdirSync(TEST_DIR, { recursive: true });
    testDir = TEST_DIR;
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('getBuiltInModels', () => {
    it('应该返回3个内置模型', () => {
      const models = getBuiltInModels();
      expect(models).toHaveLength(3);
      expect(models.map((m) => m.id)).toEqual(['clarity', 'size', 'brightness']);
    });

    it('每个模型应该有必要的字段', () => {
      for (const model of getBuiltInModels()) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.type).toBeTruthy();
        expect(model.description).toBeTruthy();
        expect(model.threshold).toBeGreaterThanOrEqual(0);
        expect(model.threshold).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('清晰度检测 (clarity)', () => {
    it('应该检测高清晰度图像（通过）', async () => {
      await createTestImageFile(testDir, 'clarity-pass.png', 1920, 1080, { r: 255, g: 0, b: 0 });
      const result = await detector.detect(path.join(testDir, 'clarity-pass.png'), 'clarity');

      expect(result.isQualified).toBe(true);
      expect(result.score).toBe(100);
      expect(result.modelUsed).toBe('clarity');
      expect(result.details.width).toBe(1920);
      expect(result.details.height).toBe(1080);
    });

    it('应该检测低分辨率图像（不通过）', async () => {
      await createTestImageFile(testDir, 'clarity-fail.png', 100, 80, { r: 255, g: 0, b: 0 });
      const result = await detector.detect(path.join(testDir, 'clarity-fail.png'), 'clarity');

      expect(result.isQualified).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.modelUsed).toBe('clarity');
    });

    it('应该检测未知模型ID返回错误', async () => {
      await createTestImageFile(testDir, 'unknown-model.png', 100, 100, { r: 255, g: 0, b: 0 });
      const result = await detector.detect(path.join(testDir, 'unknown-model.png'), 'unknown-model');

      expect(result.isQualified).toBe(false);
      expect(result.error).toContain('未知的检测模型');
    });
  });

  describe('尺寸检测 (size)', () => {
    it('应该通过正常尺寸的图像', async () => {
      await createTestImageFile(testDir, 'size-pass.png', 800, 600, { r: 0, g: 255, b: 0 });
      const result = await detector.detect(path.join(testDir, 'size-pass.png'), 'size');

      expect(result.isQualified).toBe(true);
      expect(result.score).toBe(100);
      expect(result.modelUsed).toBe('size');
    });

    it('应该拒绝过小的图像', async () => {
      await createTestImageFile(testDir, 'size-too-small.png', 50, 50, { r: 0, g: 255, b: 0 });
      const result = await detector.detect(path.join(testDir, 'size-too-small.png'), 'size');

      expect(result.isQualified).toBe(false);
      expect(result.score).toBe(0);
      expect(result.details.widthOutOfRange).toBe(true);
    });

    it('应该拒绝过大的图像', async () => {
      await createTestImageFile(testDir, 'size-too-big.png', 5000, 200, { r: 0, g: 255, b: 0 });
      const result = await detector.detect(path.join(testDir, 'size-too-big.png'), 'size');

      expect(result.isQualified).toBe(false);
      expect(result.score).toBe(0);
      expect(result.details.widthOutOfRange).toBe(true);
    });

    it('边界测试 - 恰好 200x200', async () => {
      await createTestImageFile(testDir, 'size-boundary.png', 200, 200, { r: 0, g: 255, b: 0 });
      const result = await detector.detect(path.join(testDir, 'size-boundary.png'), 'size');

      expect(result.isQualified).toBe(true);
      expect(result.score).toBe(100);
    });
  });

  describe('亮度检测 (brightness)', () => {
    it('应该检测正常亮度的图像（通过）', async () => {
      await createTestImageFile(testDir, 'brightness-normal.png', 100, 100, { r: 128, g: 128, b: 128 });
      const result = await detector.detect(path.join(testDir, 'brightness-normal.png'), 'brightness');

      expect(result.isQualified).toBe(true);
      expect(result.modelUsed).toBe('brightness');
      expect(result.details.issue).toBe('normal');
    });

    it('应该检测过暗的图像', async () => {
      await createTestImageFile(testDir, 'brightness-dark.png', 100, 100, { r: 10, g: 10, b: 10 });
      const result = await detector.detect(path.join(testDir, 'brightness-dark.png'), 'brightness');

      expect(result.isQualified).toBe(false);
      expect(result.details.issue).toBe('too_dark');
      expect((result.details.avgBrightness as number)).toBeLessThan(30);
    });

    it('应该检测过亮的图像', async () => {
      await createTestImageFile(testDir, 'brightness-bright.png', 100, 100, { r: 250, g: 250, b: 250 });
      const result = await detector.detect(path.join(testDir, 'brightness-bright.png'), 'brightness');

      expect(result.isQualified).toBe(false);
      expect(result.details.issue).toBe('too_bright');
      expect((result.details.avgBrightness as number)).toBeGreaterThan(240);
    });
  });
});

describe('BatchProcessor', () => {
  let batchDir: string;
  let detector: ImageDetector;

  beforeAll(async () => {
    detector = new ImageDetector();
    batchDir = path.join(os.tmpdir(), 'batch-test-' + Date.now());
    fs.mkdirSync(batchDir, { recursive: true });
    fs.mkdirSync(path.join(batchDir, 'subdir'), { recursive: true });

    await createTestImageFile(batchDir, 'img1.png', 1920, 1080, { r: 255, g: 0, b: 0 });
    await createTestImageFile(batchDir, 'img2.png', 50, 50, { r: 0, g: 255, b: 0 });
    await createTestImageFile(path.join(batchDir, 'subdir'), 'img3.png', 100, 100, { r: 128, g: 128, b: 128 });
    fs.writeFileSync(path.join(batchDir, 'readme.txt'), 'hello');
  });

  afterAll(() => {
    fs.rmSync(batchDir, { recursive: true, force: true });
  });

  it('应该只处理图像文件', async () => {
    const processor = new BatchProcessor(detector, 2);
    const results = await processor.processDirectory(batchDir, 'clarity');

    expect(results).toHaveLength(2);
    const names = results.map((r) => r.fileName);
    expect(names).toContain('img1.png');
    expect(names).toContain('img2.png');
    expect(names).not.toContain('readme.txt');
  });

  it('递归模式应该包含子目录', async () => {
    const processor = new BatchProcessor(detector, 2);
    const results = await processor.processDirectory(batchDir, 'clarity', {
      recursive: true,
    });

    expect(results).toHaveLength(3);
    const names = results.map((r) => r.fileName);
    expect(names).toContain('img3.png');
  });

  it('应该报告进度', async () => {
    const processor = new BatchProcessor(detector, 2);
    const progressCalls: [number, number, string][] = [];

    await processor.processDirectory(batchDir, 'clarity', {
      onProgress: (current, total, fileName) => {
        progressCalls.push([current, total, fileName]);
      },
    });

    expect(progressCalls.length).toBe(2);
    const lastCall = progressCalls[progressCalls.length - 1];
    expect(lastCall![0]).toBe(2);
    expect(lastCall![1]).toBe(2);
  });

  it('空目录应该返回空数组', async () => {
    const emptyDir = path.join(os.tmpdir(), 'empty-test-' + Date.now());
    fs.mkdirSync(emptyDir, { recursive: true });

    const processor = new BatchProcessor(detector);
    const results = await processor.processDirectory(emptyDir, 'clarity');

    expect(results).toHaveLength(0);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});

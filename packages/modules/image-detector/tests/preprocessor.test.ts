import { describe, it, expect } from 'vitest';
import { preprocessImage } from '../src/preprocessor.js';
import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

async function createTestImage(format: 'png' | 'jpeg', width = 100, height = 100): Promise<string> {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `test-img-${Date.now()}-${Math.random().toString(36).slice(2)}.${format}`);

  const channels = 4;
  const buf = Buffer.alloc(width * height * channels);
  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    buf[offset] = 255;     // R
    buf[offset + 1] = 0;   // G
    buf[offset + 2] = 0;   // B
    buf[offset + 3] = 255; // A
  }

  let pipeline = sharp(buf, { raw: { width, height, channels } });
  if (format === 'png') pipeline = pipeline.png();
  else pipeline = pipeline.jpeg();

  await pipeline.toFile(filePath);
  return filePath;
}

describe('preprocessImage', () => {
  it('应该处理图像并返回 ProcessedImage', async () => {
    const testFile = await createTestImage('png', 100, 100);
    const result = await preprocessImage(testFile);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.format).toBe('png');
    expect(result.size).toBeGreaterThan(0);

    fs.unlinkSync(testFile);
  });

  it('应该将大图像缩放到 maxWidth x maxHeight 内', async () => {
    const testFile = await createTestImage('png', 2048, 1536);
    const result = await preprocessImage(testFile, {
      maxWidth: 512,
      maxHeight: 512,
    });

    expect(result.width).toBeLessThanOrEqual(512);
    expect(result.height).toBeLessThanOrEqual(512);
    expect(result.width).toBe(512);
    expect(result.height).toBe(384);

    fs.unlinkSync(testFile);
  });

  it('不应该放大小于 maxWidth/maxHeight 的图像', async () => {
    const testFile = await createTestImage('png', 50, 50);
    const result = await preprocessImage(testFile, {
      maxWidth: 1024,
      maxHeight: 1024,
    });

    expect(result.width).toBe(50);
    expect(result.height).toBe(50);

    fs.unlinkSync(testFile);
  });

  it('应该将 PNG 转换为 JPEG 格式', async () => {
    const testFile = await createTestImage('png', 100, 100);
    const result = await preprocessImage(testFile, {
      format: 'jpeg',
      quality: 80,
    });

    expect(result.format).toBe('jpeg');
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');

    fs.unlinkSync(testFile);
  });

  it('应该处理 1x1 像素图像', async () => {
    const testFile = await createTestImage('png', 1, 1);
    const result = await preprocessImage(testFile);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);

    fs.unlinkSync(testFile);
  });

  it('应保持正方形图像在缩小时的宽高比', async () => {
    const testFile = await createTestImage('png', 800, 800);
    const result = await preprocessImage(testFile, {
      maxWidth: 400,
      maxHeight: 400,
    });

    expect(result.width).toBe(400);
    expect(result.height).toBe(400);

    fs.unlinkSync(testFile);
  });
});

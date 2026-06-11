import sharp from 'sharp';

export interface PreprocessOptions {
  maxWidth?: number;    // 最大宽度，默认 1024
  maxHeight?: number;   // 最大高度，默认 1024
  quality?: number;     // JPEG质量，默认 85
  format?: 'jpeg' | 'png'; // 输出格式
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;         // 字节数
}

/**
 * 图像预处理器
 * 使用 sharp 实现缩放、格式转换、质量控制
 * 保持宽高比，不超过 maxWidth x maxHeight
 */
export async function preprocessImage(
  filePath: string,
  options: PreprocessOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 85,
    format: outputFormat,
  } = options;

  let pipeline = sharp(filePath);

  // 获取原始元数据
  const metadata = await pipeline.metadata();
  const origWidth = metadata.width ?? 0;
  const origHeight = metadata.height ?? 0;
  const origFormat = metadata.format ?? 'unknown';

  // 缩放：保持宽高比，fit inside maxWidth x maxHeight
  if (origWidth > maxWidth || origHeight > maxHeight) {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // 格式转换
  if (outputFormat) {
    if (outputFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (outputFormat === 'png') {
      pipeline = pipeline.png({ quality });
    }
  }

  const buffer = await pipeline.toBuffer();

  // 获取输出图像元数据
  const outMetadata = await sharp(buffer).metadata();

  return {
    buffer,
    width: outMetadata.width ?? 0,
    height: outMetadata.height ?? 0,
    format: outputFormat ?? origFormat,
    size: buffer.length,
  };
}

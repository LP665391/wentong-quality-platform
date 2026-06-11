import sharp from 'sharp';
import * as fs from 'node:fs';
import { getBuiltInModels } from './models.js';
import type { DetectionModel } from './models.js';

export interface DetectionResult {
  fileName: string;
  filePath: string;
  isQualified: boolean;
  score: number;        // 0-100
  modelUsed: string;
  details: Record<string, unknown>;
  error?: string;
}

/**
 * 图像检测器
 * 基于纯规则引擎进行清晰度、尺寸、亮度检测
 */
export class ImageDetector {
  private models: Map<string, DetectionModel>;

  constructor() {
    this.models = new Map();
    for (const model of getBuiltInModels()) {
      this.models.set(model.id, model);
    }
  }

  /**
   * 对指定图像执行检测
   */
  async detect(filePath: string, modelId: string): Promise<DetectionResult> {
    const fileName = filePath.split(/[/\\]/).pop() ?? filePath;

    const model = this.models.get(modelId);
    if (!model) {
      return {
        fileName,
        filePath,
        isQualified: false,
        score: 0,
        modelUsed: modelId,
        details: {},
        error: `未知的检测模型: ${modelId}`,
      };
    }

    try {
      switch (model.type) {
        case 'clarity':
          return await this.detectClarity(filePath, fileName, model);
        case 'size':
          return await this.detectSize(filePath, fileName, model);
        case 'brightness':
          return await this.detectBrightness(filePath, fileName, model);
        default:
          return {
            fileName,
            filePath,
            isQualified: false,
            score: 0,
            modelUsed: modelId,
            details: {},
            error: `不支持的检测类型: ${(model as DetectionModel).type}`,
          };
      }
    } catch (err) {
      return {
        fileName,
        filePath,
        isQualified: false,
        score: 0,
        modelUsed: modelId,
        details: {},
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 清晰度检测
   * - 分辨率 < 480p (854x480) 判定为不清晰
   * - 文件 < 10KB 判定为不清晰
   */
  private async detectClarity(
    filePath: string,
    fileName: string,
    model: DetectionModel
  ): Promise<DetectionResult> {
    const pipeline = sharp(filePath);
    let metadata;
    try {
      metadata = await pipeline.metadata();
    } finally {
      pipeline.destroy();
    }
    const stats = fs.statSync(filePath);
    const fileSizeKB = stats.size / 1024;

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const totalPixels = width * height;
    const minPixels = 854 * 480; // 480p

    // 评分逻辑
    let score = 100;

    // 分辨率过低扣分
    if (totalPixels < minPixels) {
      const ratio = totalPixels / minPixels;
      score = Math.min(score, Math.round(ratio * 100));
    }

    // 文件过小扣分
    if (fileSizeKB < 10) {
      const ratio = fileSizeKB / 10;
      score = Math.min(score, Math.round(ratio * 100));
    }

    const isQualified = score >= 50;

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        width,
        height,
        totalPixels,
        fileSizeKB: Math.round(fileSizeKB * 100) / 100,
        minPixelsThreshold: minPixels,
        format: metadata.format,
      },
    };
  }

  /**
   * 尺寸检测
   * - 检查宽高是否在 [200, 4096] 范围内
   */
  private async detectSize(
    filePath: string,
    fileName: string,
    model: DetectionModel
  ): Promise<DetectionResult> {
    const pipeline = sharp(filePath);
    let metadata;
    try {
      metadata = await pipeline.metadata();
    } finally {
      pipeline.destroy();
    }
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    const MIN_SIZE = 200;
    const MAX_SIZE = 4096;

    let widthIssues = false;
    let heightIssues = false;

    // 检查最小尺寸
    if (width < MIN_SIZE) widthIssues = true;
    if (height < MIN_SIZE) heightIssues = true;

    // 检查最大尺寸
    if (width > MAX_SIZE) widthIssues = true;
    if (height > MAX_SIZE) heightIssues = true;

    const isQualified = !widthIssues && !heightIssues;
    const score = isQualified ? 100 : 0;

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        width,
        height,
        minSize: MIN_SIZE,
        maxSize: MAX_SIZE,
        widthOutOfRange: width < MIN_SIZE || width > MAX_SIZE,
        heightOutOfRange: height < MIN_SIZE || height > MAX_SIZE,
        format: metadata.format,
      },
    };
  }

  /**
   * 亮度检测
   * - 使用 sharp raw() 获取 RGB 像素数据，计算平均亮度
   * - 平均亮度 < 30 判定为过暗
   * - 平均亮度 > 240 判定为过亮
   */
  private async detectBrightness(
    filePath: string,
    fileName: string,
    model: DetectionModel
  ): Promise<DetectionResult> {
    // 先获取元数据确认格式
    const metaPipeline = sharp(filePath);
    let metadata;
    try {
      metadata = await metaPipeline.metadata();
    } finally {
      metaPipeline.destroy();
    }

    // 先缩放到合理大小以加速处理
    const resizePipeline = sharp(filePath)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .raw();
    let raw;
    try {
      raw = await resizePipeline.toBuffer({ resolveWithObject: true });
    } finally {
      resizePipeline.destroy();
    }

    const { data, info } = raw;
    const { width, height, channels } = info;

    let totalBrightness = 0;
    let pixelCount = 0;

    // 计算平均亮度 (使用感知亮度公式: 0.299*R + 0.587*G + 0.114*B)
    // 灰度图（channels < 3）直接取单通道值
    const isGrayscale = channels < 3;

    for (let i = 0; i < data.length; i += channels) {
      let brightness: number;
      if (isGrayscale) {
        // 灰度图：单通道值即为亮度
        brightness = data[i];
      } else {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      }
      totalBrightness += brightness;
      pixelCount++;
    }

    const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
    const roundedBrightness = Math.round(avgBrightness * 100) / 100;

    const TOO_DARK = 30;
    const TOO_BRIGHT = 240;

    let score = 100;
    let issue = 'normal';

    if (avgBrightness < TOO_DARK) {
      issue = 'too_dark';
      score = Math.round((avgBrightness / TOO_DARK) * 50);
    } else if (avgBrightness > TOO_BRIGHT) {
      issue = 'too_bright';
      const excess = avgBrightness - TOO_BRIGHT;
      const maxExcess = 255 - TOO_BRIGHT;
      score = Math.max(0, Math.round((1 - excess / maxExcess) * 50));
    }

    const isQualified = score >= 50;

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        avgBrightness: roundedBrightness,
        sampledWidth: width,
        sampledHeight: height,
        channels,
        isGrayscale: channels < 3,
        darkThreshold: TOO_DARK,
        brightThreshold: TOO_BRIGHT,
        issue,
        originalFormat: metadata.format,
      },
    };
  }
}

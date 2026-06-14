import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getBuiltInModels, getPresets, type DetectionModel, type DetectionPreset } from './models.js';

export interface DetectionResult {
  fileName: string;
  filePath: string;
  isQualified: boolean;
  score: number;        // 0-100
  modelUsed: string;
  details: Record<string, unknown>;
  error?: string;
}

export interface BatchDetectionResult {
  taskId: string;
  total: number;
  qualified: number;
  unqualified: number;
  results: DetectionResult[];
  preset: string;
}

/**
 * 档案数字化质量检测器
 * 依据 DA/T 31-2017《纸质档案数字化技术规范》
 */
export class ImageDetector {
  private models: Map<string, DetectionModel>;
  private presets: Map<string, DetectionPreset>;

  constructor() {
    this.models = new Map();
    for (const model of getBuiltInModels()) {
      this.models.set(model.id, model);
    }
    this.presets = new Map();
    for (const preset of getPresets()) {
      this.presets.set(preset.id, preset);
    }
  }

  /**
   * 获取预设模式列表
   */
  getPresets(): DetectionPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * 对指定图像执行检测（内部使用，不生成缩略图）
   */
  private async detectInternal(filePath: string, modelId: string, presetParams?: Record<string, unknown>): Promise<DetectionResult> {
    const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
    const model = this.models.get(modelId);
    if (!model) {
      return {
        fileName, filePath, isQualified: false, score: 0,
        modelUsed: modelId, details: {},
        error: `未知的检测模型: ${modelId}`,
      };
    }
    try {
      switch (model.type) {
        case 'archive_format':  return await this.detectFormat(filePath, fileName, model, presetParams);
        case 'archive_dpi':     return await this.detectDpi(filePath, fileName, model, presetParams);
        case 'archive_color':   return await this.detectColor(filePath, fileName, model, presetParams);
        case 'archive_blur':    return await this.detectBlur(filePath, fileName, model, presetParams);
        case 'archive_skew':    return await this.detectSkew(filePath, fileName, model, presetParams);
        case 'archive_border':  return await this.detectBorder(filePath, fileName, model, presetParams);
        default: return {
          fileName, filePath, isQualified: false, score: 0,
          modelUsed: modelId, details: {},
          error: `不支持的检测类型: ${model.type}`,
        };
      }
    } catch (err) {
      return {
        fileName, filePath, isQualified: false, score: 0,
        modelUsed: modelId, details: {},
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 对指定图像执行检测，同时生成缩略图
   */
  async detect(filePath: string, modelId: string, presetParams?: Record<string, unknown>): Promise<DetectionResult> {
    const result = await this.detectInternal(filePath, modelId, presetParams);
    // 生成缩略图
    try {
      const thumbnail = await sharp(filePath)
        .resize(200, 200, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      result.details.thumbnail = `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
    } catch {
      // 缩略图生成失败不影响检测结果
    }
    return result;
  }

  /**
   * 批量检测（按预设模式）
   */
  async detectBatch(
    filePaths: string[],
    presetId: string,
    onProgress?: (current: number, total: number, fileName: string) => void
  ): Promise<BatchDetectionResult> {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`未知的预设模式: ${presetId}`);
    }

    const results: DetectionResult[] = [];
    const total = filePaths.length;

    for (let i = 0; i < total; i++) {
      const filePath = filePaths[i];
      const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
      
      if (onProgress) {
        onProgress(i + 1, total, fileName);
      }

      // 对该文件执行预设中的所有检测（不生成缩略图）
      const fileResults: DetectionResult[] = [];
      for (const modelId of preset.models) {
        const result = await this.detectInternal(filePath, modelId, preset.params);
        fileResults.push(result);
      }

      // 合并多个检测结果
      const mergedResult = this.mergeResults(filePath, fileName, fileResults, presetId);

      // 缩略图只生成一次
      try {
        const thumbnail = await sharp(filePath)
          .resize(200, 200, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer();
        mergedResult.details.thumbnail = `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
      } catch {
        // 缩略图生成失败不影响检测结果
      }

      results.push(mergedResult);
    }

    const qualified = results.filter(r => r.isQualified).length;
    return {
      taskId: `batch_${Date.now()}`,
      total,
      qualified,
      unqualified: total - qualified,
      results,
      preset: presetId,
    };
  }

  /**
   * 合并多个检测结果
   */
  private mergeResults(
    filePath: string,
    fileName: string,
    results: DetectionResult[],
    presetId: string
  ): DetectionResult {
    const hasError = results.some(r => !r.isQualified || r.error);
    const allDetails: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const r of results) {
      allDetails[r.modelUsed] = {
        qualified: r.isQualified,
        score: r.score,
        details: r.details,
        error: r.error,
      };
      if (r.error) errors.push(r.error);
    }

    // 综合评分：取平均分
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // 把缩略图提升到顶层 details，前端直接读取
    const thumbnail = results[0]?.details?.thumbnail;

    return {
      fileName,
      filePath,
      isQualified: !hasError,
      score: Math.round(avgScore),
      modelUsed: presetId,
      details: {
        ...allDetails,
        thumbnail,
        checkCount: results.length,
        passedCount: results.filter(r => r.isQualified).length,
        failedCount: results.filter(r => !r.isQualified).length,
      },
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  // ============================================================================
  // 检测实现
  // ============================================================================

  /**
   * 格式合规检测
   * 检查文件扩展名和 magic number
   */
  private async detectFormat(
    filePath: string,
    fileName: string,
    model: DetectionModel,
    presetParams?: Record<string, unknown>
  ): Promise<DetectionResult> {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const allowedFormats = (presetParams?.format as string[]) || ['tiff', 'tif', 'jpeg', 'jpg', 'pdf', 'png'];
    
    // 检查扩展名
    const extValid = allowedFormats.includes(ext);

    // 读取文件头验证 magic number
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    let format = 'unknown';
    let magicValid = false;

    // TIFF: 49 49 2A 00 或 4D 4D 00 2A
    if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
        (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)) {
      format = 'tiff';
      magicValid = allowedFormats.includes('tiff') || allowedFormats.includes('tif');
    }
    // JPEG: FF D8 FF
    else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      format = 'jpeg';
      magicValid = allowedFormats.includes('jpeg') || allowedFormats.includes('jpg');
    }
    // PDF: 25 50 44 46 (%PDF)
    else if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      format = 'pdf';
      magicValid = allowedFormats.includes('pdf');
    }
    // PNG: 89 50 4E 47
    else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      format = 'png';
      magicValid = allowedFormats.includes('png');
    }

    const isQualified = extValid && magicValid;
    const score = isQualified ? 100 : 0;

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        extension: ext,
        extensionValid: extValid,
        actualFormat: format,
        magicValid,
        allowedFormats,
      },
      error: !isQualified ? `格式不合规：扩展名 .${ext}，实际格式 ${format}` : undefined,
    };
  }

  /**
   * 分辨率检测
   * 从 EXIF 读取 DPI
   */
  private async detectDpi(
    filePath: string,
    fileName: string,
    model: DetectionModel,
    presetParams?: Record<string, unknown>
  ): Promise<DetectionResult> {
    const minDpi = (presetParams?.minDpi as number) || 300;

    const pipeline = sharp(filePath);
    let metadata;
    try {
      metadata = await pipeline.metadata();
    } finally {
      pipeline.destroy();
    }

    // sharp 的 density 属性是 DPI（默认 72）
    // xResolution/yResolution 在某些版本中可能不存在
    const density = (metadata as any).density ?? 72;
    const resolutionUnit = (metadata as any).resolutionUnit ?? 'inch';

    let dpi = Math.round(density);

    // 如果是 pixels/cm，转换为 DPI
    if (resolutionUnit === 'cm') {
      dpi = Math.round(density * 2.54);
    }

    const isQualified = dpi >= minDpi;
    const score = isQualified ? 100 : Math.round((dpi / minDpi) * 100);

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        dpi,
        density,
        minDpi,
        resolutionUnit,
        width: metadata.width,
        height: metadata.height,
      },
      error: !isQualified ? `分辨率不足：${dpi} DPI < ${minDpi} DPI` : undefined,
    };
  }

  /**
   * 色彩模式检测
   * 检测彩色(24位)/灰度(8位)/黑白(1位)
   */
  private async detectColor(
    filePath: string,
    fileName: string,
    model: DetectionModel,
    presetParams?: Record<string, unknown>
  ): Promise<DetectionResult> {
    const pipeline = sharp(filePath);
    let metadata;
    try {
      metadata = await pipeline.metadata();
    } finally {
      pipeline.destroy();
    }

    const channels = metadata.channels ?? 0;
    const space = metadata.space ?? 'unknown';
    const hasAlpha = metadata.hasAlpha ?? false;

    // 判断色彩模式
    let colorMode = 'unknown';
    let bitsPerPixel = 0;

    // 使用类型安全的方式判断
    const spaceStr = String(space);
    const channelsNum = Number(channels);

    if (spaceStr === 'grey' || spaceStr === 'gray' || channelsNum === 1) {
      colorMode = 'grayscale';
      bitsPerPixel = 8;
    } else if (spaceStr === 'b-w' || spaceStr === 'bw') {
      colorMode = 'monochrome';
      bitsPerPixel = 1;
    } else if (channelsNum >= 3) {
      colorMode = 'color';
      bitsPerPixel = hasAlpha ? 32 : 24;
    }

    // 档案标准：彩色(24位) 或 灰度(8位) 都合格
    const isQualified = colorMode === 'color' || colorMode === 'grayscale';
    const score = isQualified ? 100 : 50;

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        colorMode,
        bitsPerPixel,
        channels: channelsNum,
        space: spaceStr,
        hasAlpha,
        format: metadata.format,
      },
      error: !isQualified ? `色彩模式异常：${colorMode} (${bitsPerPixel}位)` : undefined,
    };
  }

  /**
   * 模糊检测
   * 使用拉普拉斯方差算法
   */
  private async detectBlur(
    filePath: string,
    fileName: string,
    model: DetectionModel,
    presetParams?: Record<string, unknown>
  ): Promise<DetectionResult> {
    const blurThreshold = (presetParams?.blurThreshold as number) || 100;

    // 读取灰度图并缩放到 256x256 加速计算
    const pipeline = sharp(filePath)
      .greyscale()
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .raw();

    let raw;
    try {
      raw = await pipeline.toBuffer({ resolveWithObject: true });
    } finally {
      pipeline.destroy();
    }

    const { data, info } = raw;
    const width = info.width;
    const height = info.height;

    // 计算拉普拉斯方差（简化版）
    // 拉普拉斯算子: [0,1,0; 1,-4,1; 0,1,0]
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const center = data[idx];
        const top = data[(y - 1) * width + x];
        const bottom = data[(y + 1) * width + x];
        const left = data[y * width + (x - 1)];
        const right = data[y * width + (x + 1)];

        // 拉普拉斯值
        const laplacian = top + bottom + left + right - 4 * center;
        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }

    // 方差 = E(X²) - E(X)²
    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);

    const isQualified = variance >= blurThreshold;
    const score = isQualified ? 100 : Math.round((variance / blurThreshold) * 100);

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        laplacianVariance: Math.round(variance * 100) / 100,
        blurThreshold,
        sampledWidth: width,
        sampledHeight: height,
      },
      error: !isQualified ? `图像模糊：拉普拉斯方差 ${Math.round(variance)} < ${blurThreshold}` : undefined,
    };
  }

  /**
   * 歪斜检测
   * 基于边缘梯度分析检测倾斜角
   */
  private async detectSkew(
    filePath: string,
    fileName: string,
    model: DetectionModel,
    presetParams?: Record<string, unknown>
  ): Promise<DetectionResult> {
    const maxSkewAngle = (presetParams?.maxSkewAngle as number) || 1;

    // 读取灰度图并缩小以加速
    const pipeline = sharp(filePath)
      .greyscale()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .raw();

    let raw;
    try {
      raw = await pipeline.toBuffer({ resolveWithObject: true });
    } finally {
      pipeline.destroy();
    }

    const { data, info } = raw;
    const width = info.width;
    const height = info.height;

    // 简化版歪斜检测：计算水平/垂直边缘的梯度方向
    // 统计接近水平（0°/180°）和垂直（90°/270°）的梯度数量
    let horizontalCount = 0;
    let verticalCount = 0;
    let diagonalCount = 0;
    let totalEdges = 0;

    const edgeThreshold = 30; // 边缘强度阈值

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Sobel 算子
        const gx = -data[(y-1)*width+(x-1)] + data[(y-1)*width+(x+1)]
                 - 2*data[y*width+(x-1)] + 2*data[y*width+(x+1)]
                 - data[(y+1)*width+(x-1)] + data[(y+1)*width+(x+1)];
        
        const gy = -data[(y-1)*width+(x-1)] - 2*data[(y-1)*width+x] - data[(y-1)*width+(x+1)]
                 + data[(y+1)*width+(x-1)] + 2*data[(y+1)*width+x] + data[(y+1)*width+(x+1)];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        
        if (magnitude > edgeThreshold) {
          totalEdges++;
          const angle = Math.atan2(gy, gx) * 180 / Math.PI;
          const absAngle = Math.abs(angle);
          
          // 分类梯度方向
          if (absAngle < 15 || absAngle > 165) {
            verticalCount++;  // 接近垂直
          } else if (absAngle > 75 && absAngle < 105) {
            horizontalCount++;  // 接近水平
          } else {
            diagonalCount++;  // 对角线
          }
        }
      }
    }

    // 估算倾斜角：如果垂直边缘明显多于水平边缘，说明图像可能歪斜
    // 简化算法：倾斜角 ≈ arctan(垂直/总边缘) 的偏差
    let estimatedSkew = 0;
    if (totalEdges > 0) {
      const verticalRatio = verticalCount / totalEdges;
      const horizontalRatio = horizontalCount / totalEdges;
      
      // 理想情况下，文档应该水平和垂直边缘比例接近
      // 如果差异大，说明有歪斜
      const ratio = Math.abs(verticalRatio - horizontalRatio);
      estimatedSkew = ratio * 10;  // 粗略估算
    }

    const isQualified = estimatedSkew <= maxSkewAngle;
    const score = isQualified ? 100 : Math.max(0, Math.round(100 - (estimatedSkew - maxSkewAngle) * 20));

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        estimatedSkewAngle: Math.round(estimatedSkew * 100) / 100,
        maxSkewAngle,
        totalEdges,
        horizontalEdges: horizontalCount,
        verticalEdges: verticalCount,
        diagonalEdges: diagonalCount,
      },
      error: !isQualified ? `图像歪斜：估算倾斜角 ${estimatedSkew.toFixed(2)}° > ${maxSkewAngle}°` : undefined,
    };
  }

  /**
   * 黑边检测
   * 扫描图像四周边缘的黑色区域
   */
  private async detectBorder(
    filePath: string,
    fileName: string,
    model: DetectionModel,
    presetParams?: Record<string, unknown>
  ): Promise<DetectionResult> {
    const borderThreshold = (presetParams?.borderThreshold as number) || 5;

    // 读取灰度图
    const pipeline = sharp(filePath)
      .greyscale()
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .raw();

    let raw;
    try {
      raw = await pipeline.toBuffer({ resolveWithObject: true });
    } finally {
      pipeline.destroy();
    }

    const { data, info } = raw;
    const width = info.width;
    const height = info.height;

    const blackThreshold = 30; // 像素值 < 30 视为黑色

    // 检测四边的黑色像素
    let topBorder = 0;
    let bottomBorder = 0;
    let leftBorder = 0;
    let rightBorder = 0;

    // 顶部
    for (let y = 0; y < height / 4; y++) {
      let blackCount = 0;
      for (let x = 0; x < width; x++) {
        if (data[y * width + x] < blackThreshold) blackCount++;
      }
      if (blackCount / width > 0.8) topBorder = y + 1;
      else break;
    }

    // 底部
    for (let y = height - 1; y > height * 3 / 4; y--) {
      let blackCount = 0;
      for (let x = 0; x < width; x++) {
        if (data[y * width + x] < blackThreshold) blackCount++;
      }
      if (blackCount / width > 0.8) bottomBorder = height - y;
      else break;
    }

    // 左侧
    for (let x = 0; x < width / 4; x++) {
      let blackCount = 0;
      for (let y = 0; y < height; y++) {
        if (data[y * width + x] < blackThreshold) blackCount++;
      }
      if (blackCount / height > 0.8) leftBorder = x + 1;
      else break;
    }

    // 右侧
    for (let x = width - 1; x > width * 3 / 4; x--) {
      let blackCount = 0;
      for (let y = 0; y < height; y++) {
        if (data[y * width + x] < blackThreshold) blackCount++;
      }
      if (blackCount / height > 0.8) rightBorder = width - x;
      else break;
    }

    // 计算黑边占比
    const borderArea = (topBorder + bottomBorder) * width + (leftBorder + rightBorder) * height;
    const totalArea = width * height;
    const borderPercent = (borderArea / totalArea) * 100;

    const isQualified = borderPercent <= borderThreshold;
    const score = isQualified ? 100 : Math.max(0, Math.round(100 - (borderPercent - borderThreshold) * 5));

    return {
      fileName,
      filePath,
      isQualified,
      score,
      modelUsed: model.id,
      details: {
        borderPercent: Math.round(borderPercent * 100) / 100,
        borderThreshold,
        topBorder,
        bottomBorder,
        leftBorder,
        rightBorder,
        sampledWidth: width,
        sampledHeight: height,
      },
      error: !isQualified ? `存在黑边：占比 ${borderPercent.toFixed(1)}% > ${borderThreshold}%` : undefined,
    };
  }
}

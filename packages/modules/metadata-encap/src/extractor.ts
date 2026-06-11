/**
 * 文件元数据提取器
 *
 * 使用 fs.stat 获取文件基本属性，sharp 获取图片尺寸信息。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 文件元数据 */
export interface FileMetadata {
  /** 文件绝对路径 */
  filePath: string;
  /** 文件名（不含路径） */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 文件扩展名（含点，小写） */
  extension: string;
  /** 创建时间 */
  created: Date;
  /** 最后修改时间 */
  modified: Date;
  /** 图片宽度（像素，仅图片文件） */
  imageWidth?: number;
  /** 图片高度（像素，仅图片文件） */
  imageHeight?: number;
  /** 自定义属性 */
  customProperties: Record<string, string>;
}

// ---------------------------------------------------------------------------
// 图片扩展名集合
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg',
]);

// ---------------------------------------------------------------------------
// extractMetadata
// ---------------------------------------------------------------------------

/**
 * 提取文件的元数据
 *
 * @param filePath - 文件路径
 * @returns 文件元数据对象
 */
export async function extractMetadata(filePath: string): Promise<FileMetadata> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`路径不是文件: ${filePath}`);
  }

  const fileName = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();

  const metadata: FileMetadata = {
    filePath,
    fileName,
    fileSize: stat.size,
    extension,
    created: stat.birthtime,
    modified: stat.mtime,
    customProperties: {},
  };

  // 如果是图片，尝试获取图片尺寸
  if (IMAGE_EXTENSIONS.has(extension)) {
    try {
      // 动态导入 sharp（可选依赖）
      const sharp = await importSharp();
      const pipeline = sharp(filePath);
      try {
        const imageInfo = await pipeline.metadata();
        if (imageInfo.width) metadata.imageWidth = imageInfo.width;
        if (imageInfo.height) metadata.imageHeight = imageInfo.height;
      } finally {
        pipeline.destroy();
      }
    } catch {
      // sharp 不可用或图片格式不支持，跳过尺寸提取
    }
  }

  return metadata;
}

// ---------------------------------------------------------------------------
// Sharp 动态导入
// ---------------------------------------------------------------------------

async function importSharp(): Promise<any> {
  try {
    const mod = await import('sharp');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (mod as any).default ?? mod;
  } catch {
    throw new Error('sharp 模块未安装，无法读取图片尺寸');
  }
}

/**
 * 档案数字化质量检测模型定义
 * 依据 DA/T 31-2017《纸质档案数字化技术规范》
 */

export type DetectionType = 
  | 'archive_format'   // 格式合规
  | 'archive_dpi'      // 分辨率检测
  | 'archive_color'    // 色彩模式
  | 'archive_blur'     // 模糊检测
  | 'archive_skew'     // 歪斜检测
  | 'archive_border';  // 黑边检测

export interface DetectionModel {
  id: string;
  name: string;
  type: DetectionType;
  description: string;
  // 检测参数
  params?: Record<string, unknown>;
}

/**
 * 检测预设模式
 */
export interface DetectionPreset {
  id: string;
  name: string;
  description: string;
  models: string[];  // 启用的检测模型 ID
  params?: Record<string, unknown>;  // 模式级参数覆盖
}

/**
 * 6 个档案检测模型
 */
export function getBuiltInModels(): DetectionModel[] {
  return [
    {
      id: 'archive_format',
      name: '格式合规',
      type: 'archive_format',
      description: '检查文件格式是否符合档案标准（TIFF/JPEG/PDF）',
    },
    {
      id: 'archive_dpi',
      name: '分辨率检测',
      type: 'archive_dpi',
      description: '从 EXIF 读取 DPI，判断是否达到档案标准',
      params: {
        minDpi: 300,  // 保存级默认 300dpi
      },
    },
    {
      id: 'archive_color',
      name: '色彩模式',
      type: 'archive_color',
      description: '检测色彩模式（24位彩色/8位灰度/黑白）',
    },
    {
      id: 'archive_blur',
      name: '模糊检测',
      type: 'archive_blur',
      description: '拉普拉斯方差检测图像是否模糊',
      params: {
        blurThreshold: 100,  // 方差 < 100 判定模糊
      },
    },
    {
      id: 'archive_skew',
      name: '歪斜检测',
      type: 'archive_skew',
      description: '检测图像是否歪斜（倾斜角 > 1° 判定歪斜）',
      params: {
        maxSkewAngle: 1,  // 最大允许倾斜角度
      },
    },
    {
      id: 'archive_border',
      name: '黑边检测',
      type: 'archive_border',
      description: '检测图像边缘是否有黑色区域',
      params: {
        borderThreshold: 5,  // 黑边占比 > 5% 判定有问题
      },
    },
  ];
}

/**
 * 3 个预设模式
 */
export function getPresets(): DetectionPreset[] {
  return [
    {
      id: 'archive',
      name: '保存级',
      description: '归档入库标准：TIFF + 300dpi + 全项检测',
      models: ['archive_format', 'archive_dpi', 'archive_color', 'archive_blur', 'archive_skew', 'archive_border'],
      params: {
        format: ['tiff', 'tif'],
        minDpi: 300,
      },
    },
    {
      id: 'access',
      name: '利用级',
      description: '查阅利用标准：JPEG/PDF + 150dpi + 基础检测',
      models: ['archive_format', 'archive_dpi', 'archive_color', 'archive_blur'],
      params: {
        format: ['jpeg', 'jpg', 'pdf'],
        minDpi: 150,
      },
    },
    {
      id: 'quick',
      name: '快速筛查',
      description: '快速验收：仅检查格式和分辨率',
      models: ['archive_format', 'archive_dpi'],
      params: {
        format: ['tiff', 'tif', 'jpeg', 'jpg', 'pdf', 'png'],
        minDpi: 150,
      },
    },
  ];
}

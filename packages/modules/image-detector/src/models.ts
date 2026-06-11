export interface DetectionModel {
  id: string;
  name: string;
  type: 'clarity' | 'size' | 'brightness';
  description: string;
  threshold: number;  // 0-1000
}

/**
 * 获取内置检测模型
 */
export function getBuiltInModels(): DetectionModel[] {
  return [
    {
      id: 'clarity',
      name: '清晰度检测',
      type: 'clarity',
      description: '基于图像分辨率和文件大小的启发式清晰度判断',
      threshold: 500,
    },
    {
      id: 'size',
      name: '尺寸检测',
      type: 'size',
      description: '检查图像尺寸是否在合理范围内 (200x200 ~ 4096x4096)',
      threshold: 500,
    },
    {
      id: 'brightness',
      name: '亮度检测',
      type: 'brightness',
      description: '基于 RGB 均值判断图像是否过暗或过亮',
      threshold: 500,
    },
  ];
}

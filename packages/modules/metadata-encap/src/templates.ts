/**
 * 元数据模板
 *
 * 提供内置的元数据属性模板，用于快速批量注入。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 元数据模板 */
export interface MetadataTemplate {
  /** 模板唯一标识 */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 预定义属性键值对 */
  properties: Record<string, string>;
}

// ---------------------------------------------------------------------------
// 内置模板
// ---------------------------------------------------------------------------

const BUILT_IN_TEMPLATES: MetadataTemplate[] = [
  {
    id: 'general',
    name: '通用',
    description: '适用于所有文件的基础元数据：作者、标题、描述、关键词、分类、版本',
    properties: {
      author: '',
      title: '',
      description: '',
      keywords: '',
      category: '',
      version: '1.0',
    },
  },
  {
    id: 'image',
    name: '图片',
    description: '适用于图片文件的元数据：拍摄时间、地点、相机型号、版权信息',
    properties: {
      author: '',
      title: '',
      description: '',
      keywords: '',
      category: '图片',
      version: '1.0',
      captureDate: '',
      location: '',
      camera: '',
      copyright: '',
      license: 'CC BY-NC 4.0',
    },
  },
  {
    id: 'document',
    name: '文档',
    description: '适用于文档的元数据：文件编号、密级、审批状态、归档日期',
    properties: {
      author: '',
      title: '',
      description: '',
      keywords: '',
      category: '文档',
      version: '1.0',
      documentId: '',
      securityLevel: '内部',
      approvalStatus: '待审批',
      archiveDate: '',
      storageLocation: '',
    },
  },
];

// ---------------------------------------------------------------------------
// getBuiltInTemplates
// ---------------------------------------------------------------------------

/**
 * 获取所有内置模板
 *
 * @returns 内置模板数组
 */
export function getBuiltInTemplates(): MetadataTemplate[] {
  return BUILT_IN_TEMPLATES.map((t) => ({ ...t, properties: { ...t.properties } }));
}

/**
 * 根据 ID 获取指定的内置模板
 *
 * @param id - 模板 ID
 * @returns 模板对象，未找到返回 undefined
 */
export function getTemplateById(id: string): MetadataTemplate | undefined {
  const template = BUILT_IN_TEMPLATES.find((t) => t.id === id);
  if (!template) return undefined;
  return { ...template, properties: { ...template.properties } };
}

// 元数据封装
export { extractMetadata } from './extractor.js';
export type { FileMetadata } from './extractor.js';

export { injectMetadata, readSidecar } from './injector.js';

export { getBuiltInTemplates, getTemplateById } from './templates.js';
export type { MetadataTemplate } from './templates.js';

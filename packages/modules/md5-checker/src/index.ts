// 哈希计算
export { hashFile, hashDirectory, verifyHash } from './hasher.js';
export type {
  HashAlgorithm,
  HashResult,
  BatchProgressCallback,
} from './hasher.js';

// 档案管理
export {
  exportManifest,
  compareManifest,
  generateArchiveReport,
} from './hasher.js';
export type {
  ManifestCompareResult,
  ArchiveReportOptions,
} from './hasher.js';

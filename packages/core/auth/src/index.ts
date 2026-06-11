/**
 * @wentong/auth — 软件授权模块
 *
 * 功能：
 * - 机器指纹生成
 * - HMAC-SHA256 签名与验证
 * - 联网/离线双模式激活
 * - 30 天试用管理
 * - 许可证本地持久化
 */

// 机器指纹
export { generateMachineId } from './machine-id.js';

// 签名与验证
export {
  sign,
  verifySignature,
  generateLicenseContent,
} from './crypto.js';
export type { CustomerInfo, LicenseContent } from './crypto.js';

// 许可证管理
export { LicenseManager, licenseManager } from './license.js';
export type { LicenseInfo } from './license.js';

// 试用管理
export { getTrialInfo, startTrial } from './trial.js';
export type { TrialInfo } from './trial.js';

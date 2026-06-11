/**
 * 签名与验证模块
 *
 * 使用 HMAC-SHA256 作为签名方案替代 RSA 签名，客户端和管理后台
 * 共享同一个 SECRET_KEY。
 *
 * --- 安全说明 ---
 * 在实际生产环境中应使用 RSA 非对称加密：
 * - 私钥仅由管理后台持有，用于签名
 * - 公钥内置于客户端，用于验证
 * 本项目为演示目的使用 HMAC 对称签名方案，生产环境请替换为 RSA。
 */

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// 共享密钥
//
// 客户端和管理后台使用相同的密钥进行签名和验证。
// 生产环境应替换为 RSA 公钥（客户端）和 RSA 私钥（管理后台）。
// ---------------------------------------------------------------------------

const SECRET_KEY_BASE64 = 'V2VuVG9uZ1F1YWxpdHlQbGF0Zm9ybVNlY3JldEtleTIwMjU=';

/** 解码后的密钥 Buffer */
const SECRET_KEY = Buffer.from(SECRET_KEY_BASE64, 'base64');

// ---------------------------------------------------------------------------
// 签名与验证
// ---------------------------------------------------------------------------

/**
 * 使用 HMAC-SHA256 对内容进行签名
 *
 * @param content - 待签名的内容字符串
 * @returns Base64 编码的签名
 */
export function sign(content: string): string {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(content, 'utf-8');
  return hmac.digest('base64');
}

/**
 * 验证 HMAC-SHA256 签名是否匹配
 *
 * @param content   - 原始内容字符串
 * @param signature - Base64 编码的签名
 * @returns 签名是否有效
 */
export function verifySignature(content: string, signature: string): boolean {
  const expected = sign(content);
  // 使用 timingSafeEqual 防止时序攻击
  const bufExpected = Buffer.from(expected);
  const bufActual = Buffer.from(signature);
  if (bufExpected.length !== bufActual.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufExpected, bufActual);
}

// ---------------------------------------------------------------------------
// 许可证内容生成（管理后台使用）
// ---------------------------------------------------------------------------

/**
 * 客户信息
 */
export interface CustomerInfo {
  customerName: string;
  company: string;
  type: 'permanent' | 'trial';
}

/**
 * 许可证内容
 */
export interface LicenseContent {
  licenseId: string;
  customerName: string;
  company: string;
  type: 'permanent' | 'trial';
  machineId: string;
  issueDate: string;
  expireDate?: string;
}

/**
 * 生成许可证内容及签名
 *
 * 管理后台调用此函数根据客户信息和机器指纹生成许可证。
 *
 * @param customer  - 客户信息
 * @param machineId - 机器指纹
 * @param expireDate - 过期日期（可选，trial 类型必填）
 * @returns 许可证内容和签名
 */
export function generateLicenseContent(
  customer: CustomerInfo,
  machineId: string,
  expireDate?: string,
): { content: LicenseContent; signature: string } {
  const content: LicenseContent = {
    licenseId: generateLicenseId(),
    customerName: customer.customerName,
    company: customer.company,
    type: customer.type,
    machineId,
    issueDate: new Date().toISOString().split('T')[0],
    ...(expireDate ? { expireDate } : {}),
  };

  const signature = sign(JSON.stringify(content));
  return { content, signature };
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/**
 * 生成唯一许可证 ID
 *
 * 格式：WT-{时间戳}-{随机字符串}
 */
function generateLicenseId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `WT-${timestamp}-${random}`;
}

/**
 * 离线许可证生成工具
 *
 * 管理员使用此工具为客户端生成 .dat 许可证文件。
 * 使用方式：
 *   node generate-license.js <机器码> <客户名> [公司名] [过期日期]
 *
 * 示例：
 *   node generate-license.js "MACHINE-ABC-123" "刘婷" "文安档案" "2027-12-31"
 */

const crypto = require('node:crypto');
const fs = require('node:fs');

// ⚠️ 必须与客户端 crypto.ts 中的 SECRET_KEY 一致！
// 生产环境建议通过环境变量传入
const SECRET_KEY = Buffer.from('V2VuVG9uZ1F1YWxpdHlQbGF0Zm9ybVNlY3JldEtleTIwMjU=', 'base64');

// ============================================================
// 解析命令行参数
// ============================================================

const [machineId, customerName, company = '', expireDate] = process.argv.slice(2);

if (!machineId || !customerName) {
  console.error('用法: node generate-license.js <机器码> <客户名> [公司名] [过期日期]');
  console.error('示例: node generate-license.js "MACHINE-ABC-123" "刘婷" "文安档案" "2027-12-31"');
  process.exit(1);
}

// ============================================================
// 生成许可证
// ============================================================

const licenseId = `WT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const content = {
  licenseId,
  customerName,
  company,
  type: expireDate ? 'trial' : 'permanent',
  machineId,
  issueDate: new Date().toISOString().split('T')[0],
  ...(expireDate ? { expireDate } : {}),
};

// HMAC-SHA256 签名
const hmac = crypto.createHmac('sha256', SECRET_KEY);
hmac.update(JSON.stringify(content), 'utf-8');
const signature = hmac.digest('base64');

// 写入 .dat 文件
const fileName = `license-${customerName}-${machineId.slice(0, 8)}.dat`;
fs.writeFileSync(fileName, JSON.stringify({ content, signature }, null, 2), 'utf-8');

console.log('✅ 许可证已生成:', fileName);
console.log('📋 客户:', customerName);
console.log('🔑 授权码:', licenseId);
console.log('🖥️ 机器码:', machineId);
console.log('📅 类型:', expireDate ? `临时（${expireDate}到期）` : '永久');

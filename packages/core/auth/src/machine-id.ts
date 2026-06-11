/**
 * 机器指纹模块
 *
 * 基于硬件信息生成唯一机器标识，用于许可证的机器绑定。
 * 指纹由以下信息联合生成：
 * - 主机名
 * - CPU 型号
 * - 主网络接口 MAC 地址
 * - 用户名
 *
 * 使用 SHA-256 哈希后取前 32 位十六进制字符，格式化为
 * XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 */

import os from 'node:os';
import crypto from 'node:crypto';

/**
 * 获取主网络接口的 MAC 地址
 *
 * 遍历所有网络接口，寻找第一个非内部、有 MAC 地址的接口。
 * 如果没有找到，返回固定字符串 "00:00:00:00:00:00"。
 */
function getPrimaryMacAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const [, ifaceList] of Object.entries(interfaces)) {
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      // 跳过内部回环接口
      if (iface.internal) continue;
      // 跳过没有 MAC 地址的接口
      if (!iface.mac || iface.mac === '00:00:00:00:00:00') continue;
      return iface.mac;
    }
  }
  return '00:00:00:00:00:00';
}

/**
 * 生成机器指纹
 *
 * @returns 格式为 XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX 的 32 位十六进制指纹
 */
export function generateMachineId(): string {
  const hostname = os.hostname();
  const cpuModel = os.cpus()[0]?.model ?? 'Unknown CPU';
  const macAddress = getPrimaryMacAddress();
  const username = os.userInfo().username;

  // 拼接原始标识字符串
  const raw = `${hostname}|${cpuModel}|${macAddress}|${username}`;

  // SHA-256 哈希 → 取前 32 个十六进制字符
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const shortHash = hash.substring(0, 32).toUpperCase();

  // 格式化为 XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return (
    shortHash.substring(0, 4) +
    '-' +
    shortHash.substring(4, 8) +
    '-' +
    shortHash.substring(8, 12) +
    '-' +
    shortHash.substring(12, 16) +
    '-' +
    shortHash.substring(16, 20) +
    '-' +
    shortHash.substring(20, 24) +
    '-' +
    shortHash.substring(24, 28) +
    '-' +
    shortHash.substring(28, 32)
  );
}

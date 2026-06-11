/**
 * 许可证管理模块
 *
 * 功能：
 * - 联网激活：验证授权码格式 → 生成本地许可证文件
 * - 离线激活：读取许可证文件 → 验证签名 → 验证机器绑定
 * - 许可证状态检查
 *
 * 许可证存储路径：~/.wentong-quality/license.dat
 * 许可证文件格式：{ content: LicenseContent, signature: string }
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateMachineId } from './machine-id.js';
import {
  verifySignature,
  generateLicenseContent,
  type LicenseContent,
  type CustomerInfo,
} from './crypto.js';

// ---------------------------------------------------------------------------
// 接口
// ---------------------------------------------------------------------------

/**
 * 许可证信息（对外暴露的简化接口）
 */
export interface LicenseInfo {
  licenseId: string;
  customerName: string;
  company: string;
  type: 'permanent' | 'trial';
  machineId: string;
  issueDate: string;
  expireDate?: string;
  activated: boolean;
}

// ---------------------------------------------------------------------------
// 许可证文件
// ---------------------------------------------------------------------------

interface LicenseFile {
  content: LicenseContent;
  signature: string;
}

/**
 * 获取许可证文件路径
 */
function getLicensePath(): string {
  const dataDir = path.join(os.homedir(), '.wentong-quality');
  return path.join(dataDir, 'license.dat');
}

/**
 * 确保数据目录存在
 */
function ensureDataDir(): void {
  const dir = path.join(os.homedir(), '.wentong-quality');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// LicenseManager 类
// ---------------------------------------------------------------------------

export class LicenseManager {
  private storageDir: string;

  /**
   * @param storageDir - 可选的自定义存储目录（默认 ~/.wentong-quality）
   */
  constructor(storageDir?: string) {
    this.storageDir = storageDir ?? path.join(os.homedir(), '.wentong-quality');
  }

  // -----------------------------------------------------------------------
  // 许可证文件读写
  // -----------------------------------------------------------------------

  /**
   * 读取本地许可证文件
   */
  private readLicenseFile(): LicenseFile | null {
    try {
      const filePath = path.join(this.storageDir, 'license.dat');
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as LicenseFile;
    } catch {
      return null;
    }
  }

  /**
   * 写入本地许可证文件
   */
  private writeLicenseFile(license: LicenseFile): void {
    const filePath = path.join(this.storageDir, 'license.dat');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(license, null, 2), 'utf-8');
  }

  /**
   * 删除本地许可证文件
   */
  private deleteLicenseFile(): void {
    const filePath = path.join(this.storageDir, 'license.dat');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // -----------------------------------------------------------------------
  // 激活
  // -----------------------------------------------------------------------

  /**
   * 联网激活
   *
   * 模拟远程 API 调用验证授权码。
   * 实际生产环境应替换为真实的 HTTP 请求。
   *
   * 授权码格式：WT-{timestamp}-{random}
   *
   * @param licenseKey - 授权码
   * @returns 激活后的许可证信息
   * @throws 如果授权码格式无效
   */
  async activateOnline(licenseKey: string): Promise<LicenseInfo> {
    // 验证授权码格式
    const keyPattern = /^WT-[A-Z0-9]+-[A-Z0-9]+$/;
    if (!keyPattern.test(licenseKey)) {
      throw new Error('无效的授权码格式，请检查输入。');
    }

    // 模拟远程验证（生产环境替换为 HTTP 请求）
    await this.simulateRemoteValidation(licenseKey);

    // 获取当前机器指纹
    const machineId = generateMachineId();

    // 从授权码中提取信息（演示用）
    // 实际生产环境中，远程 API 会返回客户信息和许可证类型
    const customer: CustomerInfo = {
      customerName: '联网激活用户',
      company: '',
      type: 'permanent',
    };

    const { content, signature } = generateLicenseContent(customer, machineId);

    // 保存许可证文件
    ensureDataDir();
    this.writeLicenseFile({ content, signature });

    return this.toLicenseInfo(content);
  }

  /**
   * 离线激活
   *
   * 从许可证文件导入并验证。
   *
   * @param licenseFilePath - 许可证 .dat 文件路径
   * @returns 激活后的许可证信息
   * @throws 如果签名验证失败、机器不匹配等
   */
  async activateOffline(licenseFilePath: string): Promise<LicenseInfo> {
    // 读取许可证文件
    let raw: string;
    try {
      raw = fs.readFileSync(licenseFilePath, 'utf-8');
    } catch {
      throw new Error('无法读取许可证文件，请检查文件路径。');
    }

    // 解析 JSON
    let licenseFile: LicenseFile;
    try {
      licenseFile = JSON.parse(raw) as LicenseFile;
    } catch {
      throw new Error('许可证文件格式无效。');
    }

    if (!licenseFile.content || !licenseFile.signature) {
      throw new Error('许可证文件缺少必要字段（content 或 signature）。');
    }

    // 验证签名
    const contentJson = JSON.stringify(licenseFile.content);
    if (!verifySignature(contentJson, licenseFile.signature)) {
      throw new Error('许可证签名验证失败，文件可能被篡改。');
    }

    // 验证机器绑定
    const currentMachineId = generateMachineId();
    if (licenseFile.content.machineId !== currentMachineId) {
      throw new Error(
        `机器指纹不匹配。\n当前机器：${currentMachineId}\n许可证绑定：${licenseFile.content.machineId}`,
      );
    }

    // 验证是否过期
    if (licenseFile.content.expireDate) {
      const expireDate = new Date(licenseFile.content.expireDate);
      if (expireDate < new Date()) {
        throw new Error('许可证已过期。');
      }
    }

    // 保存本地许可证
    ensureDataDir();
    this.writeLicenseFile(licenseFile);

    return this.toLicenseInfo(licenseFile.content);
  }

  // -----------------------------------------------------------------------
  // 状态检查
  // -----------------------------------------------------------------------

  /**
   * 检查激活状态
   *
   * @returns 许可证信息，未激活返回 null
   */
  checkActivation(): LicenseInfo | null {
    const licenseFile = this.readLicenseFile();
    if (!licenseFile) return null;

    // 验证签名
    const contentJson = JSON.stringify(licenseFile.content);
    if (!verifySignature(contentJson, licenseFile.signature)) {
      // 签名无效，删除损坏的许可证文件
      this.deleteLicenseFile();
      return null;
    }

    // 验证机器绑定
    const currentMachineId = generateMachineId();
    if (licenseFile.content.machineId !== currentMachineId) {
      return null;
    }

    // 验证是否过期
    if (licenseFile.content.expireDate) {
      if (new Date(licenseFile.content.expireDate) < new Date()) {
        return null;
      }
    }

    return this.toLicenseInfo(licenseFile.content);
  }

  /**
   * 获取许可证信息
   *
   * @returns 许可证信息，未激活返回 null
   */
  getLicenseInfo(): LicenseInfo | null {
    return this.checkActivation();
  }

  /**
   * 是否为试用模式
   *
   * 注意：trial 类型的许可证不等于"试用模式"。
   * 试用模式由 trial.ts 管理，这里仅判断许可证类型。
   *
   * @returns 许可证是否为 trial 类型
   */
  isTrial(): boolean {
    const info = this.checkActivation();
    return info?.type === 'trial';
  }

  /**
   * 试用剩余天数
   *
   * @returns 试用剩余天数，未激活返回 -1
   */
  getTrialRemainingDays(): number {
    const info = this.checkActivation();
    if (!info || !info.expireDate) return -1;

    const now = new Date();
    const expireDate = new Date(info.expireDate);
    const remainingMs = expireDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  }

  // -----------------------------------------------------------------------
  // 私有辅助
  // -----------------------------------------------------------------------

  /**
   * 将 LicenseContent 转换为 LicenseInfo（对外接口）
   */
  private toLicenseInfo(content: LicenseContent): LicenseInfo {
    const currentMachineId = generateMachineId();
    return {
      licenseId: content.licenseId,
      customerName: content.customerName,
      company: content.company,
      type: content.type,
      machineId: currentMachineId,
      issueDate: content.issueDate,
      expireDate: content.expireDate,
      activated: true,
    };
  }

  /**
   * 模拟远程验证（演示用，实际生产环境应替换为 HTTP 请求）
   */
  private async simulateRemoteValidation(_licenseKey: string): Promise<void> {
    // 模拟网络延迟
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ---------------------------------------------------------------------------
// 默认单例
// ---------------------------------------------------------------------------

/** 默认的 LicenseManager 实例 */
export const licenseManager = new LicenseManager();

import os from 'node:os';
import path from 'node:path';

/**
 * 支持的平台类型
 */
export type PlatformType = 'win32' | 'darwin' | 'linux';

/**
 * 平台信息接口
 */
export interface PlatformInfo {
  /** 平台类型 */
  platform: PlatformType;
  /** CPU 架构 */
  arch: string;
  /** 是否为 Windows */
  isWindows: boolean;
  /** 是否为 macOS */
  isMac: boolean;
  /** 是否为 Linux */
  isLinux: boolean;
  /** 用户主目录 */
  homeDir: string;
  /** 应用数据目录 (~/.wentong-quality/) */
  dataDir: string;
}

/**
 * 获取当前平台信息
 */
export function getPlatformInfo(): PlatformInfo {
  const platform = os.platform() as PlatformType;
  const arch = os.arch();
  const homeDir = os.homedir();
  const dataDir = path.join(homeDir, '.wentong-quality');

  return {
    platform,
    arch,
    isWindows: platform === 'win32',
    isMac: platform === 'darwin',
    isLinux: platform === 'linux',
    homeDir,
    dataDir,
  };
}

/**
 * 获取应用名称
 */
export function getAppName(): string {
  return 'Ai 质检系统';
}

/**
 * 获取应用版本
 */
export function getAppVersion(): string {
  return '1.0.0';
}

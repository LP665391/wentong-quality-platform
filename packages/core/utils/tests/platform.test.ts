import { describe, it, expect } from 'vitest';
import { getPlatformInfo, getAppName, getAppVersion } from '../src/platform.js';

describe('platform 模块', () => {
  describe('getPlatformInfo()', () => {
    it('应该返回有效的平台信息', () => {
      const info = getPlatformInfo();

      // platform 应该是有效值
      expect(['win32', 'darwin', 'linux']).toContain(info.platform);

      // arch 应该是非空字符串
      expect(typeof info.arch).toBe('string');
      expect(info.arch.length).toBeGreaterThan(0);

      // 布尔标志应该互斥（恰好一个为 true）
      const trueCount = [info.isWindows, info.isMac, info.isLinux].filter(Boolean).length;
      expect(trueCount).toBe(1);

      // platform 与布尔标志应该一致
      if (info.platform === 'win32') {
        expect(info.isWindows).toBe(true);
        expect(info.isMac).toBe(false);
        expect(info.isLinux).toBe(false);
      } else if (info.platform === 'darwin') {
        expect(info.isMac).toBe(true);
        expect(info.isWindows).toBe(false);
        expect(info.isLinux).toBe(false);
      } else {
        expect(info.isLinux).toBe(true);
        expect(info.isWindows).toBe(false);
        expect(info.isMac).toBe(false);
      }

      // homeDir 应该是非空字符串
      expect(typeof info.homeDir).toBe('string');
      expect(info.homeDir.length).toBeGreaterThan(0);

      // dataDir 应该以 .wentong-quality 结尾
      expect(info.dataDir).toContain('.wentong-quality');
    });
  });

  describe('getAppName()', () => {
    it('应该返回应用名称 "Ai 质检系统"', () => {
      expect(getAppName()).toBe('Ai 质检系统');
    });
  });

  describe('getAppVersion()', () => {
    it('应该返回语义化版本格式 (x.y.z)', () => {
      const version = getAppVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('应该返回 "1.0.0"', () => {
      expect(getAppVersion()).toBe('1.0.0');
    });
  });
});
